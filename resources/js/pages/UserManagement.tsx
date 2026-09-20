import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, Shield, UserPlus, MoreVertical, KeyRound, UserX, UserCheck, Eye, Lock, ShieldAlert } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { PasswordChecklist } from "@/components/users/PasswordChecklist";
import { SetPasswordErrorAlert, isWeakPasswordError } from "@/components/users/SetPasswordErrorAlert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import AuditLogPanel from "@/components/users/AuditLogPanel";
import api from "@/api/client";
import * as usersApi from "@/api/users";
import { getRoles } from "@/api/roles";

type AppRole = "admin" | "mechanic" | "supervisor" | "store_clerk" | "qc_inspector";

interface CustomRoleAssignment {
  role_id: string;
  label: string;
}

interface UserWithRoles {
  user_id: string;
  full_name: string;
  employee_id: string | null;
  department: string | null;
  is_deactivated: boolean;
  roles: AppRole[];
  custom_roles: CustomRoleAssignment[];
}

interface RoleDefinition {
  id: string;
  name: string;
  label: string;
  is_system: boolean;
  system_role: AppRole | null;
}

const ALL_ROLES: AppRole[] = ["admin", "mechanic", "supervisor", "store_clerk", "qc_inspector"];

const extractFunctionErrorMessage = async (error: unknown): Promise<string> => {
  if (!error) return "";
  const maybeContext = (error as { context?: Response | { json?: () => Promise<unknown>; text?: () => Promise<string> } }).context;
  if (maybeContext?.json) {
    try {
      const body = await maybeContext.json();
      const message = (body as { error?: string; message?: string })?.error || (body as { message?: string })?.message;
      if (message) return message;
    } catch {
      // Fall through to text/message parsing.
    }
  }
  if (maybeContext?.text) {
    try {
      const text = await maybeContext.text();
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return parsed.error || parsed.message || text;
    } catch {
      // Fall through to the generic error message.
    }
  }

  const message = (error as { message?: string })?.message || String(error);
  const jsonMatch = message.match(/\{.*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { error?: string; message?: string };
      return parsed.error || parsed.message || message;
    } catch {
      return message;
    }
  }
  return message;
};

const roleColor: Record<AppRole, string> = {
  admin: "bg-primary/10 text-primary",
  mechanic: "bg-green-500/10 text-green-600",
  supervisor: "bg-orange-500/10 text-orange-600",
  store_clerk: "bg-muted text-muted-foreground",
  qc_inspector: "bg-blue-500/10 text-blue-600",
};

interface PendingConfirm {
  type: "deactivate" | "reactivate";
  user: UserWithRoles;
}

export default function UserManagement() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const { can } = usePermissions();
  const isAdmin = hasRole("admin");
  const canView = isAdmin || can("users.view");
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");
  const [newCustomRoleId, setNewCustomRoleId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [auditRefresh, setAuditRefresh] = useState(0);
  const [detailsUser, setDetailsUser] = useState<UserWithRoles | null>(null);
  const [detailsData, setDetailsData] = useState<{ email: string | null; last_sign_in_at: string | null; created_at_auth: string | null; email_confirmed_at: string | null } | null>(null);
  const [setPwOpen, setSetPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<{ weak: boolean; message: string } | null>(null);
  const [customRoles, setCustomRoles] = useState<RoleDefinition[]>([]);
  const [newUser, setNewUser] = useState<{
    email: string;
    password: string;
    full_name: string;
    role: AppRole;
    employee_id: string;
    department: string;
    extra_system_roles: AppRole[];
    custom_role_ids: string[];
  }>({
    email: "", password: "", full_name: "",
    role: "mechanic", employee_id: "", department: "",
    extra_system_roles: [], custom_role_ids: [],
  });

  const roleLabel = (r: AppRole) => t(`users.roles.${r}`);

  const fetchUsers = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        usersApi.getUsers({ per_page: 500 }),
        getRoles(),
      ]);

      const userList = Array.isArray(usersData) ? usersData : (Array.isArray((usersData as any)?.data) ? (usersData as any).data : []);
      const rolesArray = Array.isArray(rolesData) ? rolesData : (Array.isArray((rolesData as any)?.data) ? (rolesData as any).data : []);
      const defsList: RoleDefinition[] = rolesArray.map((r: any) => ({
        id: r.id, name: r.name, label: r.label ?? r.name,
        is_system: r.is_system ?? false, system_role: r.system_role ?? null,
      }));
      setCustomRoles(defsList.filter((d) => !d.is_system));

      const combined: UserWithRoles[] = userList.map((u: any) => ({
        user_id: u.id,
        full_name: u.full_name ?? u.name ?? u.profile?.full_name ?? "",
        employee_id: u.employee_id ?? u.profile?.employee_id ?? null,
        department: u.department ?? u.profile?.department ?? null,
        is_deactivated: u.is_deactivated ?? u.profile?.is_deactivated ?? (u.is_active !== undefined ? !u.is_active : false),
        roles: (Array.isArray(u.roles) ? u.roles.map((r: any) => typeof r === 'object' ? r.name : r) : []) as AppRole[],
        custom_roles: (Array.isArray(u.custom_roles) ? u.custom_roles : []) as CustomRoleAssignment[],
      }));
      setUsers(combined);
    } catch (err) {
      console.error("fetchUsers failed:", err);
      toast.error(t("users.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, canView]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const refreshAll = () => {
    fetchUsers();
    setAuditRefresh((v) => v + 1);
  };

  const createUser = async () => {
    if (!isAdmin) {
      toast.error(t("users.messages.adminOnly", "Only administrators can create users."));
      return;
    }
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error(t("users.messages.credentialsRequired"));
      return;
    }
    if (newUser.password.length < 6) {
      toast.error(t("users.messages.passwordShort"));
      return;
    }
    setCreating(true);
    try {
      await usersApi.createUser(newUser);
      toast.success(t("users.messages.created", { name: newUser.full_name }));
      setCreateOpen(false);
      setNewUser({ email: "", password: "", full_name: "", role: "mechanic", employee_id: "", department: "", extra_system_roles: [], custom_role_ids: [] });
      refreshAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? t("users.messages.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const callAdminAction = async (
    action: "send_password_reset" | "deactivate" | "reactivate" | "remove_role" | "assign_role",
    target: UserWithRoles,
    role?: AppRole,
  ): Promise<boolean> => {
    if (!isAdmin) {
      toast.error(t("users.messages.adminOnly", "Only administrators can perform user actions."));
      return false;
    }
    setActionBusy(target.user_id);
    try {
      if (action === "send_password_reset") await usersApi.sendPasswordReset(target.user_id);
      else if (action === "deactivate") await usersApi.deactivate(target.user_id);
      else if (action === "reactivate") await usersApi.reactivate(target.user_id);
      else if (action === "assign_role" && role) await usersApi.assignRole(target.user_id, role);
      else if (action === "remove_role" && role) await usersApi.removeRole(target.user_id, role);
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? t("users.messages.actionFailed"));
      return false;
    } finally {
      setActionBusy(null);
    }
  };

  const sendPasswordReset = async (u: UserWithRoles) => {
    const ok = await callAdminAction("send_password_reset", u);
    if (ok) {
      toast.success(t("users.messages.resetSent", { name: u.full_name }));
      setAuditRefresh((v) => v + 1);
    }
  };

  const openDetails = async (u: UserWithRoles) => {
    setDetailsUser(u);
    setDetailsData(null);
    try {
      const data = await usersApi.getUserDetails(u.user_id);
      setDetailsData({
        email: data.email ?? null,
        last_sign_in_at: data.last_sign_in_at ?? null,
        created_at_auth: data.created_at ?? null,
        email_confirmed_at: data.email_confirmed_at ?? null,
      });
    } catch { /* silently ignore — details panel is optional */ }
  };

  const submitSetPassword = async () => {
    if (!isAdmin) {
      toast.error(t("users.messages.adminOnly", "Only administrators can set passwords."));
      return;
    }
    if (!detailsUser) return;
    setPwError(null);
    setPwBusy(true);
    try {
      await usersApi.setPassword(detailsUser.user_id, newPw);
      toast.success(t("users.messages.passwordSet", { name: detailsUser.full_name }));
      setNewPw("");
      setSetPwOpen(false);
      setAuditRefresh((v) => v + 1);
    } catch (e: any) {
      const errMsg = e?.response?.data?.message ?? e?.message ?? t("users.messages.actionFailed");
      const isWeak = isWeakPasswordError(errMsg);
      setPwError({ weak: isWeak, message: errMsg });
      if (!isWeak) toast.error(errMsg);
    } finally {
      setPwBusy(false);
    }
  };

  const toggleDeactivate = async (target: UserWithRoles) => {
    const action = target.is_deactivated ? "reactivate" : "deactivate";
    const ok = await callAdminAction(action, target);
    if (ok) {
      toast.success(target.is_deactivated
        ? t("users.messages.reactivated", { name: target.full_name })
        : t("users.messages.deactivated", { name: target.full_name }));
      refreshAll();
    }
    setConfirm(null);
  };

  const addRole = async () => {
    if (!isAdmin) return;
    if (!selectedUser || !newRole) return;
    const ok = await callAdminAction("assign_role", selectedUser, newRole as AppRole);
    if (ok) {
      toast.success(t("users.messages.roleAdded", { role: roleLabel(newRole as AppRole), name: selectedUser.full_name }));
      setNewRole("");
      refreshAll();
    }
  };

  const addCustomRole = async () => {
    if (!isAdmin) return;
    if (!selectedUser || !newCustomRoleId) return;
    const role = customRoles.find((r) => r.id === newCustomRoleId);
    setActionBusy(selectedUser.user_id);
    try {
      await usersApi.assignRole(selectedUser.user_id, newCustomRoleId);
      toast.success(t("usersExtra.assignedToUser", { role: role?.label ?? "role", name: selectedUser.full_name }));
      setNewCustomRoleId("");
      refreshAll();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message;
      toast.error(msg?.includes("duplicate") ? t("usersExtra.userAlreadyHasRole") : msg);
    } finally {
      setActionBusy(null);
    }
  };

  const removeCustomRole = async (u: UserWithRoles, roleId: string, label: string) => {
    if (!isAdmin) return;
    setActionBusy(u.user_id);
    try {
      await usersApi.removeRole(u.user_id, roleId);
      toast.success(t("usersExtra.removedFromUser", { role: label, name: u.full_name }));
      refreshAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message);
    } finally {
      setActionBusy(null);
    }
  };

  const removeRole = async (u: UserWithRoles, role: AppRole) => {
    if (!isAdmin) return;
    if (role === "admin" && u.user_id === user?.id) {
      toast.error(t("users.messages.selfAdmin"));
      return;
    }
    const ok = await callAdminAction("remove_role", u, role);
    if (ok) {
      toast.success(t("users.messages.roleRemoved", { role: roleLabel(role), name: u.full_name }));
      refreshAll();
    }
  };

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
      u.roles.some((r) => roleLabel(r).toLowerCase().includes(search.toLowerCase()))
  );

  if (!canView) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-12">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">{t("users.accessDenied", "Access Denied")}</h2>
        <p className="text-sm text-muted-foreground">{t("users.accessDeniedDesc", "You do not have permission to view User Management.")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("users.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("users.registered", { count: users.length })}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" /> {t("users.createUser")}
          </Button>
        )}
      </div>

      <Card className="p-5">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("users.searchPlaceholder")}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">{t("users.loading")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">{t("users.table.name")}</TableHead>
                <TableHead className="text-[11px]">{t("users.table.employeeId")}</TableHead>
                <TableHead className="text-[11px]">{t("users.table.department")}</TableHead>
                <TableHead className="text-[11px]">{t("users.table.roles")}</TableHead>
                <TableHead className="text-[11px]">{t("users.table.status")}</TableHead>
                {isAdmin && <TableHead className="text-[11px] text-right">{t("users.table.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id} className={`${u.is_deactivated ? "opacity-60" : ""} cursor-pointer hover:bg-muted/40`} onClick={() => openDetails(u)}>
                  <TableCell className="font-medium text-sm">{u.full_name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {u.employee_id || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{u.department || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={`${roleColor[role]} border-none text-[11px]`}
                        >
                          {roleLabel(role)}
                          {isAdmin && u.roles.length > 1 && (
                            <button
                              onClick={() => removeRole(u, role)}
                              className="ml-1 hover:text-destructive"
                              title={t("users.removeRole")}
                            >×</button>
                          )}
                        </Badge>
                      ))}
                      {u.custom_roles.map((cr) => (
                        <Badge
                          key={cr.role_id}
                          variant="outline"
                          className="bg-accent/30 text-accent-foreground border-none text-[11px]"
                        >
                          {cr.label}
                          {isAdmin && (
                            <button
                              onClick={() => removeCustomRole(u, cr.role_id, cr.label)}
                              className="ml-1 hover:text-destructive"
                              title={t("usersExtra.removeCustomRole")}
                            >×</button>
                          )}
                        </Badge>
                      ))}
                      {u.roles.length === 0 && u.custom_roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">{t("users.noRoles")}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.is_deactivated ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-none text-[11px]">
                        {t("users.deactivated")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-none text-[11px]">
                        {t("users.active")}
                      </Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openDetails(u)}>
                          <Eye className="w-3 h-3 mr-1" /> {t("users.viewDetails", "Details")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={actionBusy === u.user_id}
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole("");
                            setRoleDialogOpen(true);
                          }}
                        >
                          <Shield className="w-3 h-3 mr-1" /> {t("users.role")}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={actionBusy === u.user_id}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => sendPasswordReset(u)}>
                              <KeyRound className="w-3.5 h-3.5 mr-2" />
                              {t("users.sendReset")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDetailsUser(u); setSetPwOpen(true); }}>
                              <Lock className="w-3.5 h-3.5 mr-2" />
                              {t("users.setPassword", "Set new password")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.is_deactivated ? (
                              <DropdownMenuItem onClick={() => setConfirm({ type: "reactivate", user: u })}>
                                <UserCheck className="w-3.5 h-3.5 mr-2" />
                                {t("users.reactivate")}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={u.user_id === user?.id}
                                onClick={() => setConfirm({ type: "deactivate", user: u })}
                              >
                                <UserX className="w-3.5 h-3.5 mr-2" />
                                {t("users.deactivate")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    {t("users.noUsers")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {isAdmin && <AuditLogPanel refreshKey={auditRefresh} />}

      <Dialog open={roleDialogOpen} onOpenChange={(o) => { setRoleDialogOpen(o); if (!o) { setNewRole(""); setNewCustomRoleId(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.assign.title", { name: selectedUser?.full_name ?? "" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="text-sm text-muted-foreground">
              {t("users.assign.current", {
                roles: (selectedUser?.roles.length || selectedUser?.custom_roles.length)
                  ? [
                      ...(selectedUser?.roles.map(roleLabel) ?? []),
                      ...(selectedUser?.custom_roles.map((c) => c.label) ?? []),
                    ].join(", ")
                  : t("users.assign.none"),
              })}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("usersExtra.systemRole")}</label>
              <div className="flex gap-2">
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("users.assign.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES
                      .filter((r) => !selectedUser?.roles.includes(r))
                      .map((r) => (
                        <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addRole} disabled={!newRole}>{t("usersExtra.add")}</Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("usersExtra.customRole")}</label>
              {customRoles.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("usersExtra.noCustomRoles")}</p>
              ) : (
                <div className="flex gap-2">
                  <Select value={newCustomRoleId} onValueChange={setNewCustomRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("usersExtra.selectCustomRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customRoles
                        .filter((cr) => !selectedUser?.custom_roles.some((c) => c.role_id === cr.id))
                        .map((cr) => (
                          <SelectItem key={cr.id} value={cr.id}>{cr.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addCustomRole} disabled={!newCustomRoleId}>{t("usersExtra.add")}</Button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>{t("usersExtra.close")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("users.createNewUser")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("users.form.fullName")}</label>
              <Input className="mt-1" placeholder={t("users.form.fullNamePlaceholder")} value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("users.form.email")}</label>
              <Input className="mt-1" type="email" placeholder={t("users.form.emailPlaceholder")} value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("users.form.password")}</label>
              <Input className="mt-1" type="text" placeholder={t("users.form.passwordPlaceholder")} value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <p className="text-[10px] text-muted-foreground mt-1">{t("users.form.passwordHint")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("users.form.employeeId")}</label>
                <Input className="mt-1" placeholder={t("usersExtra.empPlaceholder")} value={newUser.employee_id}
                  onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("users.form.department")}</label>
                <Input className="mt-1" placeholder={t("usersExtra.deptPlaceholder")} value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("users.form.role")}</label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole, extra_system_roles: newUser.extra_system_roles.filter((r) => r !== v) })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">{t("usersExtra.primaryRoleHint")}</p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("usersExtra.additionalSystemRoles")}</label>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {ALL_ROLES.filter((r) => r !== newUser.role).map((r) => {
                  const checked = newUser.extra_system_roles.includes(r);
                  return (
                    <label key={r} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v
                            ? [...newUser.extra_system_roles, r]
                            : newUser.extra_system_roles.filter((x) => x !== r);
                          setNewUser({ ...newUser, extra_system_roles: next });
                        }}
                      />
                      <span className="text-xs">{roleLabel(r)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {customRoles.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("usersExtra.customRoles")}</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {customRoles.map((cr) => {
                    const checked = newUser.custom_role_ids.includes(cr.id);
                    return (
                      <label key={cr.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = v
                              ? [...newUser.custom_role_ids, cr.id]
                              : newUser.custom_role_ids.filter((x) => x !== cr.id);
                            setNewUser({ ...newUser, custom_role_ids: next });
                          }}
                        />
                        <span className="text-xs truncate">{cr.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>{t("common.cancel")}</Button>
              <Button onClick={createUser} disabled={creating}>
                {creating ? t("common.creating") : t("users.createUser")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "deactivate"
                ? t("users.confirm.deactivateTitle", { name: confirm?.user.full_name ?? "" })
                : t("users.confirm.reactivateTitle", { name: confirm?.user.full_name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "deactivate"
                ? t("users.confirm.deactivateDesc")
                : t("users.confirm.reactivateDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={confirm?.type === "deactivate" ? "bg-destructive hover:bg-destructive/90" : undefined}
              onClick={() => confirm && toggleDeactivate(confirm.user)}
            >
              {confirm?.type === "deactivate" ? t("users.deactivate") : t("users.reactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User details */}
      <Dialog open={!!detailsUser && !setPwOpen} onOpenChange={(o) => { if (!o) { setDetailsUser(null); setDetailsData(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{detailsUser?.full_name}</DialogTitle></DialogHeader>
          {!detailsUser ? null : (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">{t("users.form.email")}:</span> {detailsData?.email ?? "…"}</div>
              <div><span className="text-muted-foreground">{t("users.form.employeeId")}:</span> {detailsUser.employee_id || "—"}</div>
              <div><span className="text-muted-foreground">{t("users.form.department")}:</span> {detailsUser.department || "—"}</div>
              <div><span className="text-muted-foreground">{t("users.table.roles")}:</span> {detailsUser.roles.map(roleLabel).join(", ") || t("users.noRoles")}</div>
              <div><span className="text-muted-foreground">{t("users.table.status")}:</span> {detailsUser.is_deactivated ? t("users.deactivated") : t("users.active")}</div>
              <div><span className="text-muted-foreground">{t("users.lastSignIn", "Last sign-in")}:</span> {detailsData?.last_sign_in_at ? new Date(detailsData.last_sign_in_at).toLocaleString() : "—"}</div>
              <div><span className="text-muted-foreground">{t("users.emailConfirmed", "Email confirmed")}:</span> {detailsData?.email_confirmed_at ? "✓" : "—"}</div>
              <p className="text-[11px] text-muted-foreground pt-2 border-t">{t("users.passwordHashedNote", "Passwords are securely hashed and cannot be displayed. Use Send password reset or Set new password.")}</p>
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => detailsUser && sendPasswordReset(detailsUser)}>
                    <KeyRound className="w-3.5 h-3.5 mr-1" /> {t("users.sendReset")}
                  </Button>
                  <Button size="sm" onClick={() => setSetPwOpen(true)}>
                    <Lock className="w-3.5 h-3.5 mr-1" /> {t("users.setPassword", "Set new password")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Set password */}
      <Dialog open={setPwOpen} onOpenChange={(o) => { setSetPwOpen(o); if (!o) { setPwError(null); setNewPw(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("users.resetPassword", "Reset Password")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder=""
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); if (pwError) setPwError(null); }}
              aria-invalid={!!pwError}
              aria-describedby={pwError ? "set-pw-error" : undefined}
            />
            <PasswordChecklist
              password={newPw}
              forbiddenTerms={[detailsUser?.full_name ?? "", detailsData?.email ?? ""].filter(Boolean) as string[]}
            />
            {pwError && (
              <SetPasswordErrorAlert
                message={pwError.message}
                weak={pwError.weak}
                labels={{
                  weakTitle: t("users.messages.passwordWeakTitle", "This password was found in a data breach"),
                  rejectedTitle: t("users.messages.passwordRejectedTitle", "Couldn't set password"),
                  weakDesc: t(
                    "users.messages.passwordWeakDesc",
                    "Our leaked-password protection (HIBP) blocked this password because it appears in known breach lists. Pick a different one to keep this account safe."
                  ),
                  tipLength: t("users.messages.passwordTipLength", "Use 12+ characters"),
                  tipMix: t("users.messages.passwordTipMix", "Mix upper/lowercase, numbers, and symbols"),
                  tipUnique: t("users.messages.passwordTipUnique", "Avoid names, dictionary words, or reused passwords"),
                  tipPhrase: t("users.messages.passwordTipPhrase", "Try a passphrase, e.g. Munic!Fleet-2026#Spring"),
                }}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSetPwOpen(false)} disabled={pwBusy}>{t("common.cancel")}</Button>
              <Button onClick={submitSetPassword} disabled={pwBusy || !newPw}>{t("common.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
