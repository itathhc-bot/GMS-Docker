import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Filter, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from "@/api/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import InventoryDashboard from "@/components/inventory/InventoryDashboard";

import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { validateLocation } from "@/lib/locationValidation";

interface InventoryItem {
  id: string;
  sku: string;
  part_name: string;
  category: string;
  stock_quantity: number;
  min_threshold: number;
  unit_price: number;
  status: string;
  location?: string | null;
}

const stockColor: Record<string, string> = {
  OK: "status-badge-completed",
  Low: "status-badge-pending",
  Critical: "status-badge-delayed",
};

const CATEGORIES = ["Brakes", "Engine", "Filters", "Fluids", "Hydraulics", "Suspension", "Body", "Electrical", "General"];

const emptyForm = {
  sku: "",
  part_name: "",
  category: "General",
  stock_quantity: 0,
  min_threshold: 10,
  unit_price: 0,
  status: "OK",
  location: "",
};

export default function Inventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  async function loadItems() {
    const { data } = await api.get('/inventory?per_page=500');
    setItems((data.data || data) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      sku: item.sku,
      part_name: item.part_name,
      category: item.category,
      stock_quantity: item.stock_quantity,
      min_threshold: item.min_threshold,
      unit_price: item.unit_price,
      status: item.status,
      location: item.location ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.sku.trim()) e.sku = t("inventory.errors.skuRequired");
    else if (form.sku.trim().length > 20) e.sku = t("inventory.errors.skuTooLong");
    if (!form.part_name.trim()) e.part_name = t("inventory.errors.nameRequired");
    else if (form.part_name.trim().length > 100) e.part_name = t("inventory.errors.nameTooLong");
    if (form.stock_quantity < 0) e.stock_quantity = t("inventory.errors.negative");
    if (form.min_threshold < 0) e.min_threshold = t("inventory.errors.negative");
    if (form.unit_price < 0) e.unit_price = t("inventory.errors.negative");
    if (form.location && form.location.trim()) {
      const v = validateLocation(form.location);
      if (v.ok === false) e.location = v.reason;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function computeStatus(stock: number, min: number): string {
    if (stock === 0) return "Critical";
    if (stock < min) return stock < min * 0.5 ? "Critical" : "Low";
    return "OK";
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const status = computeStatus(form.stock_quantity, form.min_threshold);
    const payload = {
      sku: form.sku.trim(),
      part_name: form.part_name.trim(),
      category: form.category,
      stock_quantity: form.stock_quantity,
      min_threshold: form.min_threshold,
      unit_price: form.unit_price,
      status,
      location: (() => {
        const v = validateLocation(form.location);
        return v.ok ? v.value : null;
      })(),
    };

    if (editing) {
      let error = null;
      try { await api.patch(`/inventory/${editing.id}`, payload); } catch (e: any) { error = e.response?.data?.message || e.message; }
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
      } else {
        toast({ title: t("inventory.actions.updated") });
        setDialogOpen(false);
        loadItems();
      }
    } else {
      let error = null;
      try { await api.post(`/inventory`, payload); } catch (e: any) { error = e.response?.data?.message || e.message; }
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
      } else {
        toast({ title: t("inventory.actions.added") });
        setDialogOpen(false);
        loadItems();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    let error = null;
    try { await api.delete(`/inventory/${deleteTarget.id}`); } catch (e: any) { error = e.response?.data?.message || e.message; }
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: t("inventory.actions.deleted") });
      loadItems();
    }
    setDeleteTarget(null);
  }

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || p.part_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("inventory.subtitle")}</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5 mr-1" /> {t("inventory.addPart")}</Button>
      </div>

      <InventoryDashboard items={items} loading={loading} />

      <Card className="p-5">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("inventory.searchPlaceholder")}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("inventory.filters.allCategories")}</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`inventory.categories.${c}`)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("inventory.filters.allStatus")}</SelectItem>
              <SelectItem value="OK">{t("inventory.stockStatus.OK")}</SelectItem>
              <SelectItem value="Low">{t("inventory.stockStatus.Low")}</SelectItem>
              <SelectItem value="Critical">{t("inventory.stockStatus.Critical")}</SelectItem>
            </SelectContent>
          </Select>
          {(categoryFilter !== "all" || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); }}>
              {t("common.clearFilters")}
            </Button>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-48" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">{t("inventory.table.sku")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.partName")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.category")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.stock")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.minThreshold")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.unitPrice")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.location")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.status")}</TableHead>
                <TableHead className="text-[11px]">{t("inventory.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                  <TableCell className="font-medium text-sm">{p.part_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t(`inventory.categories.${p.category}`, p.category)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{p.stock_quantity}</span>
                      <Progress value={Math.min((p.stock_quantity / p.min_threshold) * 100, 100)} className="h-1.5 w-12" />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.min_threshold}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(p.unit_price)}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{p.location || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${stockColor[p.status] || ""} border-none text-[11px]`}>{t(`inventory.stockStatus.${p.status}`, p.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {(p.status === "Critical" || p.stock_quantity === 0) && (
                        <Button variant="outline" size="sm" className="text-xs h-7">{t("inventory.actions.reorder")}</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">{t("inventory.noItems")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("inventory.editPart") : t("inventory.addNewPart")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("inventory.form.sku")}</Label>
                <Input
                  placeholder={t("inventory.form.skuPlaceholder")}
                  maxLength={20}
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
                {errors.sku && <p className="text-xs text-destructive">{errors.sku}</p>}
              </div>
              <div className="space-y-1">
                <Label>{t("inventory.form.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`inventory.categories.${c}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("inventory.form.partName")}</Label>
              <Input
                placeholder={t("inventory.form.namePlaceholder")}
                maxLength={100}
                value={form.part_name}
                onChange={(e) => setForm({ ...form, part_name: e.target.value })}
              />
              {errors.part_name && <p className="text-xs text-destructive">{errors.part_name}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("inventory.form.location")}</Label>
              <Input
                placeholder={t("inventory.form.locationPlaceholder")}
                maxLength={32}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>{t("inventory.form.stockQty")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) || 0 })}
                />
                {errors.stock_quantity && <p className="text-xs text-destructive">{errors.stock_quantity}</p>}
              </div>
              <div className="space-y-1">
                <Label>{t("inventory.form.minThreshold")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_threshold}
                  onChange={(e) => setForm({ ...form, min_threshold: Number(e.target.value) || 0 })}
                />
                {errors.min_threshold && <p className="text-xs text-destructive">{errors.min_threshold}</p>}
              </div>
              <div className="space-y-1">
                <Label>{t("inventory.form.unitPrice")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) || 0 })}
                />
                {errors.unit_price && <p className="text-xs text-destructive">{errors.unit_price}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : editing ? t("inventory.updatePart") : t("inventory.addPart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.deletePart")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory.deleteConfirmPrefix", "Are you sure you want to delete")}{" "}
              <strong>{deleteTarget?.part_name}</strong> ({deleteTarget?.sku})?{" "}
              {t("inventory.deleteConfirmSuffix", "This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
