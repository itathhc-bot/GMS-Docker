import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Pencil, Trash2, History } from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getFriendlyErrorMessage } from "@/lib/errors";
import VehicleHistoryDialog from "@/components/vehicles/VehicleHistoryDialog";
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from "@/api/vehicles";
import { getDrivers } from "@/api/drivers";

interface Vehicle {
  id: string;
  plate_number: string;
  asset_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  department: string | null;
  status: string;
  mileage: number | null;
  vin: string | null;
  driver_id: string | null;
}

interface DriverOption { id: string; full_name: string }

const EMPTY_FORM = { plate_number: "", make: "", model: "", year: "", department: "", status: "Available", vin: "", asset_id: "", driver_id: "" };

const statusColor: Record<string, string> = {
  Available: "status-badge-completed",
  "In Service": "status-badge-progress",
  "Awaiting Parts": "status-badge-delayed",
  Decommissioned: "bg-muted text-muted-foreground",
};

export default function Vehicles() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("supervisor");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();
  const { data: rawVehicles = [], isLoading: loading } = useQuery({ 
    queryKey: ['vehicles'], 
    queryFn: () => getVehicles({ sort_by: 'created_at', sort_dir: 'desc', per_page: 500 }) 
  });
  const vehicles: Vehicle[] = Array.isArray(rawVehicles) ? rawVehicles : ((rawVehicles as any)?.data ?? []);
  const { data: drivers = [] } = useQuery({ 
    queryKey: ['drivers', { is_active: true }], 
    queryFn: () => getDrivers({ is_active: true, sort_by: 'full_name' }) 
  });

  const createMut = useMutation({ mutationFn: createVehicle, onSuccess: () => queryClient.invalidateQueries({queryKey:['vehicles']}) });
  const updateMut = useMutation({ mutationFn: ({id, data}: {id: string, data: any}) => updateVehicle(id, data), onSuccess: () => queryClient.invalidateQueries({queryKey:['vehicles']}) });
  const deleteMut = useMutation({ mutationFn: deleteVehicle, onSuccess: () => queryClient.invalidateQueries({queryKey:['vehicles']}) });

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({
      plate_number: v.plate_number,
      make: v.make ?? "",
      model: v.model ?? "",
      year: v.year ? String(v.year) : "",
      department: v.department ?? "",
      status: v.status,
      vin: v.vin ?? "",
      asset_id: v.asset_id ?? "",
      driver_id: v.driver_id ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      plate_number: form.plate_number.toUpperCase().trim(),
      make: form.make?.trim() || null,
      model: form.model?.trim() || null,
      year: form.year ? parseInt(form.year) : null,
      department: form.department?.trim() || null,
      status: form.status,
      vin: form.vin?.trim() || null,
      asset_id: form.asset_id?.trim() || null,
      driver_id: form.driver_id?.trim() || null,
    };
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: payload });
        toast.success("Vehicle updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Vehicle added");
      }
      setDialogOpen(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error as Error, editId ? "update this vehicle" : "add this vehicle"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteVehicle) return;
    try {
      await deleteMut.mutateAsync(deleteVehicle.id);
      toast.success(`Vehicle ${deleteVehicle.plate_number} deleted`);
      setDeleteVehicle(null);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error as Error, "delete this vehicle"));
    }
  };

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return !q || v.plate_number.toLowerCase().includes(q) || v.department?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q) || v.vin?.toLowerCase().includes(q) || v.asset_id?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("vehicles.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("vehicles.fleetCount", { count: vehicles.length })}</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5 me-1" /> {t("vehicles.addVehicle")}</Button>
        )}
      </div>

      <Card className="p-5">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("vehicles.searchPlaceholder")} className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">{t("vehicles.loading")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">{t("vehicles.table.assetId")}</TableHead>
                <TableHead className="text-[11px]">{t("vehicles.table.plate")}</TableHead>
                <TableHead className="text-[11px]">{t("vehicles.table.makeModel")}</TableHead>
                <TableHead className="text-[11px]">{t("vehicles.table.year")}</TableHead>
                <TableHead className="text-[11px]">{t("vehicles.table.department")}</TableHead>
                <TableHead className="text-[11px]">{t("vehicles.table.mileage")}</TableHead>
                <TableHead className="text-[11px]">{t("vehicles.table.status")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{v.asset_id || "—"}</TableCell>
                  <TableCell className="font-semibold text-sm">{v.plate_number}</TableCell>
                  <TableCell className="text-sm">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.year || "—"}</TableCell>
                  <TableCell className="text-sm">{v.department || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.mileage?.toLocaleString() || "—"} km</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColor[v.status] || ""} border-none text-[11px]`}>{v.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setHistoryVehicle(v)}>
                          <History className="w-4 h-4 me-2" /> View history
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(v)} disabled={!canManage}>
                          <Pencil className="w-4 h-4 me-2" /> Edit vehicle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteVehicle(v)}
                          disabled={!canManage}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 me-2" /> Delete vehicle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t("vehicles.noVehicles")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Plate Number *</label>
              <Input className="mt-1" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} required />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Make</label>
              <Input className="mt-1" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Model</label>
              <Input className="mt-1" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Year</label>
              <Input className="mt-1" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Department</label>
              <Input className="mt-1" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Asset ID</label>
              <Input className="mt-1" value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="In Service">In Service</SelectItem>
                  <SelectItem value="Awaiting Parts">Awaiting Parts</SelectItem>
                  <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("vehicles.form.driver", "Assigned Driver")}</label>
              <Select value={form.driver_id || "__none__"} onValueChange={(v) => setForm({ ...form, driver_id: v === "__none__" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t("vehicles.form.selectDriver", "Select a driver")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("vehicles.form.noDriver", "Unassigned")}</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">VIN</label>
              <Input className="mt-1" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editId ? "Save Changes" : "Add Vehicle"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <VehicleHistoryDialog
        open={!!historyVehicle}
        onOpenChange={(v) => !v && setHistoryVehicle(null)}
        vehicleId={historyVehicle?.id ?? null}
        plateNumber={historyVehicle?.plate_number}
      />

      <AlertDialog open={!!deleteVehicle} onOpenChange={(o) => !o && setDeleteVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle {deleteVehicle?.plate_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the vehicle from the registry. Job cards already linked to it will keep their reference but the vehicle record will be gone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
