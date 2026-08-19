import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Car, ClipboardCheck, MessageSquare, Clock, X, Printer, PenLine } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import SignaturePad from "@/components/SignaturePad";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getJobCard, getInspections, signMechanic, signSupervisor } from "@/api/jobCards";
import { getBayComments } from "@/api/bayComments";


interface JobCardRow {
  id: string;
  job_number: string;
  vehicle_id: string | null;
  bay_number: string | null;
  status: string;
  priority: string;
  description: string | null;
  sla_hours: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  mechanic_signature: string | null;
  mechanic_signed_at: string | null;
  mechanic_signed_name: string | null;
  supervisor_signature: string | null;
  supervisor_signed_at: string | null;
  supervisor_signed_name: string | null;
  vehicles?: {
    plate_number: string;
    make: string | null;
    model: string | null;
    year: number | null;
    vin: string | null;
    department: string | null;
    mileage: number | null;
  } | null;
}


interface InspectionRow {
  id: string;
  item_key: string;
  item_label: string;
  category: string;
  result: string;
  notes: string | null;
}

interface CommentRow {
  id: string;
  comment: string;
  author_name: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobCardId: string | null;
}

function extractTitle(description: string | null): string {
  if (!description) return "—";
  const match = description.match(/^(?:Title|العنوان|Job Title|عنوان الوظيفة):\s*(.+?)(?:\n|$)/i);
  if (match) return match[1].trim();
  const first = description.split("\n")[0].trim();
  return first || "—";
}

function extractBody(description: string | null): string {
  if (!description) return "";
  const lines = description.split("\n");
  // drop the first line if it's a "Title:" prefix
  if (lines[0]?.match(/^(?:Title|العنوان|Job Title|عنوان الوظيفة):/i)) {
    return lines.slice(1).join("\n").trim();
  }
  return description;
}

export default function JobCardDetailDialog({ open, onOpenChange, jobCardId }: Props) {
  const { t } = useTranslation();
  const { user, profile, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<JobCardRow | null>(null);
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [signingRole, setSigningRole] = useState<"mechanic" | "supervisor" | null>(null);
  const [pendingSig, setPendingSig] = useState<string | null>(null);
  const [savingSig, setSavingSig] = useState(false);

  const canSignMechanic = hasRole("mechanic") || hasRole("admin");
  const canSignSupervisor = hasRole("supervisor") || hasRole("admin");

  const load = async () => {
    if (!jobCardId) return;
    setLoading(true);
    try {
      const [jc, ins, cm] = await Promise.all([
        getJobCard(jobCardId),
        getInspections(jobCardId),
        getBayComments(jobCardId),
      ]);
      setJob(jc as any);
      setInspections(ins as any);
      setComments(cm as any);
    } catch (error) {
      toast.error("Failed to load job card details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !jobCardId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobCardId]);

  const saveSignature = async () => {
    if (!job || !signingRole || !pendingSig || !user) return;
    setSavingSig(true);
    try {
      if (signingRole === "mechanic") {
        await signMechanic(job.id, pendingSig);
      } else {
        await signSupervisor(job.id, pendingSig);
      }
      toast.success("Signature saved");
      setSigningRole(null);
      setPendingSig(null);
      await load();
    } catch (error) {
      toast.error("Failed to save signature");
    } finally {
      setSavingSig(false);
    }
  };

  const handlePrint = () => window.print();

  const timeline = job
    ? [
        { key: "created", at: job.created_at },
        job.started_at ? { key: "started", at: job.started_at } : null,
        job.completed_at ? { key: "completed", at: job.completed_at } : null,
        { key: "updated", at: job.updated_at },
      ].filter(Boolean) as { key: string; at: string }[]
    : [];

  const failedCount = inspections.filter((i) => i.result === "fail").length;
  const passedCount = inspections.filter((i) => i.result === "pass").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-0">
        <div className="p-6 pb-4 no-print">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <span className="text-primary">{job?.job_number || "—"}</span>
                  {job && <StatusBadge status={job.status} />}
                  {job && <PriorityBadge priority={job.priority} />}
                </DialogTitle>
                <DialogDescription>{extractTitle(job?.description ?? null)}</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} disabled={!job}>
                  <Printer className="h-4 w-4 mr-1.5" /> Print Job Card
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Print-only header */}
        {job && (
          <div className="print-only px-6 pt-6 pb-2">
            <div className="flex items-start justify-between border-b border-black pb-3">
              <div>
                <h1 className="text-2xl font-bold">Job Card</h1>
                <div className="text-sm">#{job.job_number}</div>
              </div>
              <div className="text-right text-xs">
                <div>Status: {job.status}</div>
                <div>Priority: {job.priority}</div>
                <div>Printed: {new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}


        <div className="px-6 pb-6 space-y-4">
          {loading && (
            <div className="text-center py-12 text-sm text-muted-foreground">{t("common.loading")}</div>
          )}

          {!loading && job && (
            <>
              {/* Vehicle */}
              <Card className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" /> {t("jobCards.wizard.vehicleDetails")}
                </h3>
                {job.vehicles ? (
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    {[
                      ["plate", job.vehicles.plate_number],
                      ["vehicle", [job.vehicles.make, job.vehicles.model].filter(Boolean).join(" ") || "—"],
                      ["year", job.vehicles.year?.toString() || "—"],
                      ["vin", job.vehicles.vin || "—"],
                      ["department", job.vehicles.department || "—"],
                      ["odometer", `${job.vehicles.mileage ?? 0} km`],
                    ].map(([k, val]) => (
                      <div key={k as string}>
                        <dt className="text-xs text-muted-foreground">{t(`jobCards.wizard.details.${k}`)}</dt>
                        <dd className="text-sm font-semibold">{val}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="text-sm text-muted-foreground">{t("jobCards.detail.noVehicle")}</div>
                )}
              </Card>

              {/* Description */}
              {extractBody(job.description) && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
                    {t("jobCards.wizard.descriptionLabel")}
                  </h3>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{extractBody(job.description)}</p>
                </Card>
              )}

              {/* Inspection results */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" /> {t("jobCards.detail.inspectionResults")}
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <Badge className="bg-success text-success-foreground">{t("jobCards.inspection.pass")}: {passedCount}</Badge>
                    <Badge className="bg-destructive text-destructive-foreground">{t("jobCards.inspection.fail")}: {failedCount}</Badge>
                  </div>
                </div>
                {inspections.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">{t("jobCards.detail.noInspections")}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {inspections.map((i) => (
                      <div
                        key={i.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-md border",
                          i.result === "fail" ? "border-destructive/40 bg-destructive/5" :
                          i.result === "pass" ? "border-success/40 bg-success/5" :
                          "border-border bg-muted/30"
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium">{t(`jobCards.inspection.items.${i.item_key}`, { defaultValue: i.item_label })}</div>
                          <div className="text-[11px] text-muted-foreground">{t(`jobCards.inspection.categories.${i.category}`, { defaultValue: i.category })}</div>
                        </div>
                        <span className={cn(
                          "px-2.5 py-1 rounded text-[10px] font-bold tracking-wide",
                          i.result === "pass" && "bg-success text-success-foreground",
                          i.result === "fail" && "bg-destructive text-destructive-foreground",
                          i.result === "na" && "bg-muted-foreground text-background",
                        )}>
                          {t(`jobCards.inspection.${i.result}`, { defaultValue: i.result.toUpperCase() })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Timeline */}
              <Card className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {t("jobCards.detail.timeline")}
                </h3>
                <ol className="relative border-l-2 border-border pl-4 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-4 space-y-3">
                  {timeline.map((tl) => (
                    <li key={tl.key} className="relative">
                      <span className="absolute -left-[21px] rtl:-right-[21px] rtl:left-auto top-1.5 w-3 h-3 rounded-full bg-primary" />
                      <div className="text-sm font-semibold">{t(`jobCards.detail.timelineEvents.${tl.key}`)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(tl.at).toLocaleString()}</div>
                    </li>
                  ))}
                </ol>
              </Card>

              {/* Comments */}
              <Card className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> {t("jobCards.detail.comments")} ({comments.length})
                </h3>
                {comments.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">{t("jobCards.detail.noComments")}</div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-md bg-muted/40 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold">{c.author_name || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Signatures */}
              <Card className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                  <PenLine className="h-4 w-4" /> Signatures
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(["mechanic", "supervisor"] as const).map((role) => {
                    const sig = role === "mechanic" ? job.mechanic_signature : job.supervisor_signature;
                    const at = role === "mechanic" ? job.mechanic_signed_at : job.supervisor_signed_at;
                    const name = role === "mechanic" ? job.mechanic_signed_name : job.supervisor_signed_name;
                    const canSign = role === "mechanic" ? canSignMechanic : canSignSupervisor;
                    const isSigningThis = signingRole === role;
                    return (
                      <div key={role} className="border border-border rounded-md p-3 bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold uppercase tracking-wide">{role}</div>
                          {sig && <Badge variant="outline" className="text-[10px]">Signed</Badge>}
                        </div>
                        {sig ? (
                          <div>
                            <img src={sig} alt={`${role} signature`} className="h-24 w-full object-contain bg-white border rounded" />
                            <div className="text-[11px] text-muted-foreground mt-2">
                              {name || "—"} · {at ? new Date(at).toLocaleString() : ""}
                            </div>
                            {canSign && (
                              <Button variant="ghost" size="sm" className="mt-2 no-print" onClick={() => { setSigningRole(role); setPendingSig(null); }}>
                                Re-sign
                              </Button>
                            )}
                          </div>
                        ) : isSigningThis ? (
                          <div className="space-y-2 no-print">
                            <SignaturePad onChange={setPendingSig} height={140} />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setSigningRole(null); setPendingSig(null); }}>Cancel</Button>
                              <Button size="sm" onClick={saveSignature} disabled={!pendingSig || savingSig}>
                                {savingSig ? "Saving..." : "Save signature"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded">
                            {canSign ? (
                              <Button variant="outline" size="sm" className="no-print" onClick={() => { setSigningRole(role); setPendingSig(null); }}>
                                <PenLine className="h-3.5 w-3.5 mr-1.5" /> Sign as {role}
                              </Button>
                            ) : (
                              <>Not signed yet</>
                            )}
                            <div className="print-only h-16 border-b border-black mx-4 mt-4" />
                            <div className="print-only text-xs mt-1">{role} signature</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
