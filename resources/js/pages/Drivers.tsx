import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDrivers, createDriver, updateDriver, deleteDriver } from "@/api/drivers";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Driver {
  id: string;
  full_name: string;
  license_number: string | null;
  license_expiry: string | null;
  phone: string | null;
  email: string | null;
  department: string | null;
  notes: string | null;
  is_active: boolean;
}

const EMPTY = {
  full_name: "", license_number: "", license_expiry: "",
  phone: "", email: "", department: "", notes: "", is_active: true,
};

export default function Drivers() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("supervisor");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [del, setDel] = useState<Driver | null>(null);
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editId ? updateDriver(editId, data) : createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(editId ? t("drivers.updated") : t("drivers.created"));
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save driver");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(t("drivers.deleted", { name: del?.full_name }));
      setDel(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete driver");
    }
  });

  const openAdd = () => { setEditId(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (d: Driver) => {
    setEditId(d.id);
    setForm({
      full_name: d.full_name,
      license_number: d.license_number ?? "",
      license_expiry: d.license_expiry ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      department: d.department ?? "",
      notes: d.notes ?? "",
      is_active: d.is_active,
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error(t("drivers.nameRequired")); return; }
    
    saveMutation.mutate({
      full_name: form.full_name.trim(),
      license_number: form.license_number || null,
      license_expiry: form.license_expiry || null,
      phone: form.phone || null,
      email: form.email || null,
      department: form.department || null,
      notes: form.notes || null,
      is_active: form.is_active,
    });
  };

  const confirmDelete = () => {
    if (!del) return;
    deleteMutation.mutate(del.id);
  };

  const filtered = rows.filter((d) => {
    const q = search.toLowerCase();
    return !q
      || d.full_name.toLowerCase().includes(q)
      || d.license_number?.toLowerCase().includes(q)
      || d.phone?.toLowerCase().includes(q)
      || d.department?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("drivers.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("drivers.count", { count: rows.length })}
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5 me-1" /> {t("drivers.addDriver")}
          </Button>
        )}
      </div>

      <Card className="p-5">
        <div className="relative mb-4">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("drivers.searchPlaceholder")}
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">{t("drivers.table.name")}</TableHead>
                <TableHead className="text-[11px]">{t("drivers.table.license")}</TableHead>
                <TableHead className="text-[11px]">{t("drivers.table.expiry")}</TableHead>
                <TableHead className="text-[11px]">{t("drivers.table.phone")}</TableHead>
                <TableHead className="text-[11px]">{t("drivers.table.department")}</TableHead>
                <TableHead className="text-[11px]">{t("drivers.table.status")}</TableHead>
                {canManage && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.full_name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{d.license_number || "—"}</TableCell>
                  <TableCell className="text-sm">{d.license_expiry || "—"}</TableCell>
                  <TableCell className="text-sm">{d.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{d.department || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={d.is_active ? "bg-green-500/10 text-green-600 border-none text-[11px]" : "bg-muted text-muted-foreground border-none text-[11px]"}>
                      {d.is_active ? t("common.active") : t("drivers.inactive")}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)} aria-label={t("common.edit")}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDel(d)} aria-label={t("common.delete")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">{t("drivers.empty")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? t("drivers.editDriver") : t("drivers.addDriver")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("drivers.form.name")} *</label>
              <Input className="mt-1" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("drivers.form.license")}</label>
              <Input className="mt-1" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("drivers.form.expiry")}</label>
              <Input className="mt-1" type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("drivers.form.phone")}</label>
              <Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("drivers.form.email")}</label>
              <Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("drivers.form.department")}</label>
              <Input className="mt-1" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("drivers.form.notes")}</label>
              <Input className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              {t("drivers.form.active")}
            </label>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit">{editId ? t("common.save") : t("drivers.addDriver")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("drivers.deleteTitle", { name: del?.full_name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("drivers.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
