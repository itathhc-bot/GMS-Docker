import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Shield, Trash2, Pencil, Lock, Save, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "@/api/client";
import { getRoles, createRole, updateRole, deleteRole as deleteRoleApi, syncPermissions } from "@/api/roles";

interface PermissionRow {
  key: string;
  label: string;
  category: string;
  description: string | null;
}
interface RoleRow {
  id: string;
  name: string;
  label: string;
  description: string | null;
  is_system: boolean;
  system_role: string | null;
}
interface AssignedCount {
  role_id: string;
  count: number;
}

export default function RolesPermissions() {
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const isAdmin = hasRole("admin");

  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [grants, setGrants] = useState<Map<string, Set<string>>>(new Map()); // roleId -> set(perm key)
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [pendingPerms, setPendingPerms] = useState<Set<string> | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleRow | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleRow | null>(null);
  const [form, setForm] = useState({ label: "", description: "" });
  const [busy, setBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const rolesData = await getRoles();
      // getRoles returns [{id, name, label, description, is_system, system_role, permissions: string[], user_count: number}]
      const allPerms: PermissionRow[] = [];
      const seenPerms = new Set<string>();
      const newRoles: RoleRow[] = [];
      const newGrants = new Map<string, Set<string>>();
      const newCounts = new Map<string, number>();

      for (const r of rolesData) {
        newRoles.push({ id: r.id, name: r.name, label: r.label ?? r.name, description: r.description ?? null, is_system: r.is_system ?? false, system_role: r.system_role ?? null });
        newGrants.set(r.id, new Set<string>(r.permissions ?? []));
        newCounts.set(r.id, r.user_count ?? 0);
        // Collect permissions from all roles to build a full permission list
        for (const pKey of (r.permissions ?? [])) {
          if (!seenPerms.has(pKey)) {
            seenPerms.add(pKey);
            const [category] = pKey.split('.');
            allPerms.push({ key: pKey, label: pKey, category: category ?? 'general', description: null });
          }
        }
      }

      // Also fetch the canonical permissions list
      try {
        const { data: permsData } = await api.get('/permissions');
        const canonical: PermissionRow[] = Array.isArray(permsData?.data) ? permsData.data : permsData ?? [];
        if (canonical.length > 0) {
          setPermissions(canonical);
        } else {
          setPermissions(allPerms);
        }
      } catch {
        setPermissions(allPerms);
      }

      setRoles(newRoles);
      setGrants(newGrants);
      setCounts(newCounts);
    } catch (e: any) {
      toast.error(t("rolesPage.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group permissions by category
  const permsByCategory = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const p of permissions) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries());
  }, [permissions]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const currentPerms = pendingPerms ?? grants.get(selectedRoleId ?? "") ?? new Set<string>();

  const togglePerm = (key: string) => {
    const base = pendingPerms ?? new Set(grants.get(selectedRoleId ?? "") ?? []);
    const next = new Set(base);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setPendingPerms(next);
  };

  const cancelPermEdits = () => setPendingPerms(null);

  const savePerms = async () => {
    if (!selectedRoleId || !pendingPerms) return;
    setSavingPerms(true);
    try {
      await syncPermissions(selectedRoleId, Array.from(pendingPerms));
      toast.success(t("rolesPage.permsUpdated"));
      setPendingPerms(null);
      fetchAll();
    } catch (e: any) {
      toast.error(t("rolesPage.permsUpdateFailed"));
    } finally {
      setSavingPerms(false);
    }
  };

  const openCreate = () => {
    setForm({ label: "", description: "" });
    setEditRole(null);
    setCreateOpen(true);
  };
  const openEdit = (r: RoleRow) => {
    setForm({ label: r.label, description: r.description ?? "" });
    setEditRole(r);
    setCreateOpen(true);
  };

  const submitRole = async () => {
    if (!form.label.trim()) { toast.error(t("rolesPage.labelRequired")); return; }
    setBusy(true);
    try {
      if (editRole) {
        await updateRole(editRole.id, { label: form.label.trim(), description: form.description.trim() || null });
        toast.success(t("rolesPage.roleUpdated"));
      } else {
        const slug = form.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        if (!slug) { setBusy(false); toast.error(t("rolesPage.invalidLabel")); return; }
        await createRole({ name: slug, label: form.label.trim(), description: form.description.trim() || null });
        toast.success(t("rolesPage.roleCreated"));
      }
      setCreateOpen(false);
      fetchAll();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message;
      toast.error(msg?.includes("duplicate") ? t("rolesPage.duplicateRole") : msg);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRole) return;
    setBusy(true);
    try {
      await deleteRoleApi(deleteRole.id);
      toast.success(t("rolesPage.roleDeleted"));
      if (selectedRoleId === deleteRole.id) setSelectedRoleId(null);
      setDeleteRole(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="p-10 text-center">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">{t("rolesPage.adminsOnly")}</h2>
        <p className="text-sm text-muted-foreground">{t("rolesPage.adminsOnlyDesc")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("rolesPage.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("rolesPage.subtitle")}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> {t("rolesPage.newRole")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Roles list */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">{t("rolesPage.roles")}</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="space-y-1.5">
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId;
                const count = counts.get(r.id) ?? 0;
                const permCount = (grants.get(r.id) ?? new Set()).size;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRoleId(r.id); setPendingPerms(null); }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{r.label}</span>
                          {r.is_system && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">{t("rolesPage.system")}</Badge>
                          )}
                        </div>
                        {r.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                        )}
                        <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span>{permCount} {t("rolesPage.perms")}</span>
                          <span>{count} {t("rolesPage.users")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 text-[10px] px-2"
                        onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                      >
                        <Pencil className="w-2.5 h-2.5 mr-1" /> {t("rolesPage.edit")}
                      </Button>
                      {!r.is_system && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteRole(r); }}
                        >
                          <Trash2 className="w-2.5 h-2.5 mr-1" /> {t("rolesPage.delete")}
                        </Button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Permission matrix */}
        <Card className="p-5">
          {!selectedRole ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {t("rolesPage.selectPrompt")}
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedRole.label}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedRole.is_system ? t("rolesPage.systemRoleNote") : t("rolesPage.customRole")}
                  </p>
                </div>
                {pendingPerms && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={cancelPermEdits} disabled={savingPerms}>
                      <X className="w-3.5 h-3.5 mr-1" /> {t("rolesPage.cancel")}
                    </Button>
                    <Button size="sm" onClick={savePerms} disabled={savingPerms}>
                      <Save className="w-3.5 h-3.5 mr-1" /> {savingPerms ? t("rolesPage.saving") : t("rolesPage.saveChanges")}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {permsByCategory.map(([cat, perms]) => (
                  <div key={cat}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {cat}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const checked = currentPerms.has(p.key);
                        return (
                          <label
                            key={p.key}
                            className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => togglePerm(p.key)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{p.label}</div>
                              {p.description && (
                                <div className="text-[11px] text-muted-foreground">{p.description}</div>
                              )}
                              <code className="text-[10px] text-muted-foreground/70">{p.key}</code>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create / edit role dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editRole ? t("rolesPage.editTitle") : t("rolesPage.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rolesPage.label")}</label>
              <Input
                className="mt-1"
                placeholder={t("rolesPage.labelPlaceholder")}
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("rolesPage.description")}</label>
              <Textarea
                className="mt-1"
                placeholder={t("rolesPage.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>{t("rolesPage.cancel")}</Button>
            <Button onClick={submitRole} disabled={busy}>{editRole ? t("rolesPage.save") : t("rolesPage.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rolesPage.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rolesPage.deleteDesc", { label: deleteRole?.label ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("rolesPage.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={busy}
            >
              {t("rolesPage.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
