import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Car, ClipboardCheck, Wrench, User, Check, Search, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getVehicles } from "@/api/vehicles";
import { getUsers } from "@/api/users";
import { createJobCard, upsertInspection } from "@/api/jobCards";
import { createPartsRequest } from "@/api/partsRequests";

interface VehicleOption {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  department: string | null;
  mileage: number | null;
}

interface MechanicOption {
  user_id: string;
  full_name: string;
}

type InspectionResult = "PASS" | "FAIL" | "NA";
interface InspectionItem { key: string; category: string; }

const INSPECTION_ITEMS: InspectionItem[] = [
  { key: "engine", category: "mechanical" },
  { key: "brakes", category: "mechanical" },
  { key: "steering", category: "mechanical" },
  { key: "cooling", category: "mechanical" },
  { key: "exhaust", category: "mechanical" },
  { key: "battery", category: "electrical" },
  { key: "lights", category: "electrical" },
  { key: "ac", category: "electrical" },
  { key: "wipers", category: "electrical" },
  { key: "tires", category: "body" },
  { key: "bodyPaint", category: "body" },
  { key: "glass", category: "body" },
  { key: "fluids", category: "fluids" },
  { key: "oil", category: "fluids" },
];

const BAYS = [
  { num: "01", labelKey: "lightVehicles" },
  { num: "02", labelKey: "general" },
  { num: "03", labelKey: "electrical" },
  { num: "04", labelKey: "heavyDuty" },
  { num: "05", labelKey: "paintBody" },
  { num: "06", labelKey: "diagnostics" },
  { num: "07", labelKey: "heavyEquipment" },
  { num: "08", labelKey: "general" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  prefillPlate?: string;
}

export default function JobCardWizard({ open, onOpenChange, onCreated, prefillPlate }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: vehicle
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);

  // Step 2: inspection
  const [inspection, setInspection] = useState<Record<string, InspectionResult>>({});

  // Step 3: issue
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [estHours, setEstHours] = useState("4");

  // Step 4: assignment
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [bayNumber, setBayNumber] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setVehicleSearch("");
    setSelectedVehicle(null);
    setInspection({});
    setTitle("");
    setDescription("");
    setPriority("");
    setEstHours("4");
    setAssignedTo("");
    setBayNumber("");
    loadVehicles();
    loadMechanics();
  }, [open]);

  const loadVehicles = async () => {
    try {
      const data = await getVehicles();
      setVehicles(data as any);
      if (prefillPlate) {
        const match = data.find(
          (v: any) => v.plate_number.toLowerCase() === prefillPlate.toLowerCase()
        );
        if (match) {
          setSelectedVehicle(match as any);
          setVehicleSearch(match.plate_number);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMechanics = async () => {
    try {
      const users: any = await getUsers({ role: "mechanic", is_active: true });
      const rawUsers = Array.isArray(users?.data) ? users.data : (Array.isArray(users) ? users : []);
      setMechanics(rawUsers.map((u: any) => ({
        user_id: u.id,
        full_name: u.full_name || u.name || u.profile?.full_name || `${u.profile?.first_name || ""} ${u.profile?.last_name || ""}`.trim() || u.email
      })));
    } catch (e) {
      setMechanics([]);
    }
  };

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicles.slice(0, 8);
    return vehicles.filter((v) =>
      v.plate_number.toLowerCase().includes(q) ||
      (v.make || "").toLowerCase().includes(q) ||
      (v.model || "").toLowerCase().includes(q)
    ).slice(0, 12);
  }, [vehicles, vehicleSearch]);

  const inspectionCount = Object.values(inspection).filter((v) => v).length;
  const failedItems = INSPECTION_ITEMS.filter((i) => inspection[i.key] === "FAIL");

  const canNext = () => {
    if (step === 1) return !!selectedVehicle;
    if (step === 2) return inspectionCount >= 5;
    if (step === 3) return title.trim().length > 0 && description.trim().length > 0 && !!priority;
    return true;
  };

  const generateJobNumber = () => `JC-${Math.floor(10000 + Math.random() * 90000)}`;
  const generateRequestNumber = () => `PR-${Math.floor(10000 + Math.random() * 90000)}`;

  const handleSubmit = async () => {
    if (!selectedVehicle || !user) return;
    setSubmitting(true);

    // Description now contains ONLY the title + free-text description.
    // Inspection failures are persisted separately in job_card_inspections.
    const fullDescription = [
      `${t("jobCards.wizard.titleLabel")}: ${title}`,
      "",
      description,
    ].join("\n").trim();

    try {
      // 1) Insert the job card and grab its id
      const jcData: any = await createJobCard({
        job_number: generateJobNumber(),
        vehicle_id: selectedVehicle.id,
        reported_issue: fullDescription,
        priority: priority as any,
        bay_number: bayNumber || undefined,
        assigned_mechanic_id: assignedTo || undefined,
        sla_hours: estHours ? parseFloat(estHours) : undefined,
        status: "open",
      } as any);

      const jobCardId = jcData?.id ?? jcData?.data?.id;
      if (!jobCardId) {
        throw new Error("Job card was created but no ID was returned.");
      }

      // 2) Persist every inspected item into job_card_inspections
      const inspectionRows = INSPECTION_ITEMS
        .filter((i) => inspection[i.key])
        .map((i) => ({
          job_card_id: jobCardId,
          item_name: i.key,
          status: (inspection[i.key] || "na").toLowerCase(),
        } as any));

      if (inspectionRows.length > 0) {
        await upsertInspection(jobCardId, inspectionRows);
      }

      // 3) Auto-create one parts_requests draft per failed inspection item
      if (failedItems.length > 0) {
        const partRows = failedItems.map((i) => ({
          request_number: generateRequestNumber(),
          job_card_id: jobCardId,
          requested_by: assignedTo || user.id,
          part_name: t(`jobCards.inspection.items.${i.key}`, { lng: "en" }),
          quantity: 1,
          urgency: priority === "EMERGENCY" || priority === "HIGH" ? "Urgent" : "Normal",
          bay_number: bayNumber || null,
          status: "Pending",
          reason: t("jobCards.inspection.autoDraftReason", { lng: "en" }),
        }));
        
        for (const row of partRows) {
          await createPartsRequest(row as any);
        }
        toast.success(t("jobCards.wizard.partsDraftCreated", { count: partRows.length }));
      }
    } catch (e: any) {
      setSubmitting(false);
      toast.error(e.message || "Failed to create job card");
      return;
    }

    setSubmitting(false);
    toast.success(t("jobCards.form.created"));
    onOpenChange(false);
    onCreated();
  };

  const steps = [
    { id: 1, key: "vehicle", icon: Car },
    { id: 2, key: "inspection", icon: ClipboardCheck },
    { id: 3, key: "issue", icon: Wrench },
    { id: 4, key: "assignment", icon: User },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <div className="p-6 pb-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onOpenChange(false)} type="button">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <div>
                <DialogTitle className="text-xl">{t("jobCards.wizard.title")}</DialogTitle>
                <DialogDescription>{t("jobCards.wizard.subtitle")}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isDone && setStep(s.id)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold transition",
                      isActive && "bg-primary text-primary-foreground",
                      isDone && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/15",
                      !isActive && !isDone && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    {t(`jobCards.wizard.steps.${s.key}`)}
                  </button>
                  {idx < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 pb-2">
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-base font-semibold mb-4">{t("jobCards.wizard.vehicleId")}</h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 rtl:pl-3 rtl:pr-9"
                    placeholder={t("jobCards.wizard.vehicleSearchPlaceholder")}
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredVehicles.map((v) => {
                    const isSel = selectedVehicle?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVehicle(v)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border-2 transition flex items-center gap-3",
                          isSel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Car className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{v.plate_number}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[v.make, v.model].filter(Boolean).join(" ")} {v.year ? `(${v.year})` : ""}
                          </div>
                        </div>
                        {isSel && (
                          <Badge className="bg-primary text-primary-foreground">{t("jobCards.wizard.selected")}</Badge>
                        )}
                      </button>
                    );
                  })}
                  {filteredVehicles.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">{t("jobCards.wizard.noVehicles")}</div>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-base font-semibold mb-4">{t("jobCards.wizard.vehicleDetails")}</h3>
                {selectedVehicle ? (
                  <dl className="space-y-3">
                    {[
                      ["plate", selectedVehicle.plate_number],
                      ["vehicle", [selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(" ") || "—"],
                      ["year", selectedVehicle.year?.toString() || "—"],
                      ["vin", selectedVehicle.vin || "—"],
                      ["department", selectedVehicle.department || "—"],
                      ["odometer", `${selectedVehicle.mileage ?? 0} km`],
                    ].map(([k, val]) => (
                      <div key={k as string} className="flex justify-between items-center pb-2 border-b border-border last:border-0">
                        <dt className="text-sm text-muted-foreground">{t(`jobCards.wizard.details.${k}`)}</dt>
                        <dd className="text-sm font-semibold">{val}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="text-center py-12 text-sm text-muted-foreground">{t("jobCards.wizard.selectVehiclePrompt")}</div>
                )}
              </Card>
            </div>
          )}

          {step === 2 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h3 className="text-base font-semibold">{t("jobCards.inspection.title")}</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" />{t("jobCards.inspection.pass")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />{t("jobCards.inspection.fail")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground" />{t("jobCards.inspection.na")}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                {["mechanical", "electrical", "body", "fluids"].map((cat) => (
                  <div key={cat}>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                      {t(`jobCards.inspection.categories.${cat}`)}
                    </h4>
                    <div className="space-y-2">
                      {INSPECTION_ITEMS.filter((i) => i.category === cat).map((item) => {
                        const val = inspection[item.key];
                        return (
                          <div key={item.key} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                            <span className="text-sm">{t(`jobCards.inspection.items.${item.key}`)}</span>
                            <div className="flex gap-1">
                              {(["PASS", "FAIL", "NA"] as InspectionResult[]).map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setInspection({ ...inspection, [item.key]: r })}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[10px] font-bold tracking-wide transition",
                                    val === r
                                      ? r === "PASS" ? "bg-success text-success-foreground"
                                      : r === "FAIL" ? "bg-destructive text-destructive-foreground"
                                      : "bg-muted-foreground text-background"
                                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                                  )}
                                >
                                  {t(`jobCards.inspection.${r.toLowerCase()}`)}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-3 rounded-md bg-info/10 border border-info/30 text-sm text-info-foreground flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-info shrink-0" />
                <span className="text-foreground/80">
                  {t("jobCards.inspection.helper", { count: inspectionCount })}
                </span>
              </div>
            </Card>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-base font-semibold mb-4">{t("jobCards.wizard.issueDescription")}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t("jobCards.wizard.titleLabel")} *</label>
                    <Input
                      className="mt-1.5"
                      placeholder={t("jobCards.wizard.titlePlaceholder")}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("jobCards.wizard.descriptionLabel")} *</label>
                    <Textarea
                      className="mt-1.5 min-h-[160px]"
                      placeholder={t("jobCards.wizard.descriptionPlaceholder")}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("jobCards.wizard.charCount", { count: description.length })}
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="text-base font-semibold mb-4">{t("jobCards.wizard.classification")}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t("jobCards.wizard.priorityLabel")} *</label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("jobCards.wizard.selectPriority")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">{t("jobCards.priority.LOW")}</SelectItem>
                        <SelectItem value="MEDIUM">{t("jobCards.priority.MEDIUM")}</SelectItem>
                        <SelectItem value="HIGH">{t("jobCards.priority.HIGH")}</SelectItem>
                        <SelectItem value="EMERGENCY">{t("jobCards.priority.EMERGENCY")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t("jobCards.wizard.estDuration")}</label>
                    <Input
                      className="mt-1.5"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g. 4"
                      value={estHours}
                      onChange={(e) => setEstHours(e.target.value)}
                    />
                  </div>
                  {failedItems.length > 0 && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
                      <div className="text-sm font-semibold text-destructive mb-2">
                        {t("jobCards.inspection.failedItems")}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {failedItems.map((i) => (
                          <span key={i.key} className="px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                            {t(`jobCards.inspection.items.${i.key}`)}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-destructive/80 mt-2">
                        {t("jobCards.wizard.partsDraftHint", { count: failedItems.length })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-base font-semibold mb-4">{t("jobCards.wizard.assignMechanic")}</h3>
                {mechanics.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {t("jobCards.wizard.noMechanics")}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setAssignedTo("")}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border-2 transition",
                        assignedTo === "" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="text-sm font-medium">{t("jobCards.wizard.unassigned")}</div>
                    </button>
                    {mechanics.map((m) => {
                      const isSel = assignedTo === m.user_id;
                      return (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() => setAssignedTo(m.user_id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border-2 transition flex items-center gap-3",
                            isSel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          )}
                        >
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold">
                            {m.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm font-medium">{m.full_name}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="text-base font-semibold mb-4">{t("jobCards.wizard.assignBay")}</h3>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {BAYS.map((b) => {
                    const val = `Bay ${b.num}`;
                    const isSel = bayNumber === val;
                    return (
                      <button
                        key={b.num}
                        type="button"
                        onClick={() => setBayNumber(isSel ? "" : val)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border-2 transition",
                          isSel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="text-sm font-semibold">
                          {t("jobCards.wizard.bay", { num: b.num })} - {t(`jobCards.wizard.bayLabels.${b.labelKey}`)}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  <div className="text-sm font-bold mb-2">{t("jobCards.wizard.summary")}</div>
                  {[
                    ["vehicle", `${selectedVehicle?.plate_number || "—"} — ${selectedVehicle?.make || ""} ${selectedVehicle?.model || ""}`.trim()],
                    ["title", title || "—"],
                    ["priority", priority ? t(`jobCards.priority.${priority}`) : "—"],
                    ["bay", bayNumber || t("jobCards.wizard.notAssigned")],
                    ["estDuration", `${estHours || 0} ${t("jobCards.wizard.hours")}`],
                    ["failedItems", String(failedItems.length)],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t(`jobCards.wizard.summaryFields.${k}`)}</span>
                      <span className="font-semibold text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-between items-center sticky bottom-0 bg-background">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} type="button">
              <ArrowLeft className="h-4 w-4 mr-1.5 rtl:mr-0 rtl:ml-1.5 rtl:rotate-180" />
              {t("common.back")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              {t("common.cancel")}
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} type="button">
              {t("jobCards.wizard.continue")}
              <ArrowRight className="h-4 w-4 ml-1.5 rtl:ml-0 rtl:mr-1.5 rtl:rotate-180" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} type="button">
              <Check className="h-4 w-4 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
              {submitting ? t("common.creating") : t("jobCards.form.create")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
