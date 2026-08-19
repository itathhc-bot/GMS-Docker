import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";
import { createVehicle } from "@/api/vehicles";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialPlate?: string;
  onCreated?: (vehicle: { id: string; plate_number: string }) => void;
}

export default function QuickRegisterVehicleDialog({ open, onOpenChange, initialPlate, onCreated }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plate_number: "",
    make: "",
    model: "",
    year: "",
    department: "",
    asset_id: "",
    vin: "",
  });

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, plate_number: (initialPlate || "").toUpperCase() }));
    }
  }, [open, initialPlate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate_number.trim()) return;
    setSaving(true);
    try {
      const data: any = await createVehicle({
        plate_number: form.plate_number.trim().toUpperCase(),
        make: form.make.trim() || undefined,
        model: form.model.trim() || undefined,
        year: form.year ? parseInt(form.year) : undefined,
        department: form.department.trim() || undefined,
        asset_id: form.asset_id.trim() || undefined,
        vin: form.vin.trim() || undefined,
        status: "Available" as any,
      });
      setSaving(false);
      toast.success(t("vehicles.added"));
      onCreated?.(data);
      onOpenChange(false);
    } catch (error) {
      setSaving(false);
      toast.error(getFriendlyErrorMessage(error, t("scan.quickRegister.action")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("scan.quickRegister.title")}</DialogTitle>
          <DialogDescription>{t("scan.quickRegister.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qr-plate">{t("vehicles.form.plate")}</Label>
            <Input
              id="qr-plate"
              required
              value={form.plate_number}
              onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })}
              className="font-mono tracking-wider"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qr-make">{t("vehicles.form.make")}</Label>
              <Input id="qr-make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-model">{t("vehicles.form.model")}</Label>
              <Input id="qr-model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-year">{t("vehicles.form.year")}</Label>
              <Input id="qr-year" inputMode="numeric" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-dept">{t("vehicles.form.department")}</Label>
              <Input id="qr-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-asset">{t("vehicles.form.assetId")}</Label>
              <Input id="qr-asset" value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-vin">{t("vehicles.form.vin")}</Label>
              <Input id="qr-vin" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={saving || !form.plate_number.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("scan.quickRegister.action")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
