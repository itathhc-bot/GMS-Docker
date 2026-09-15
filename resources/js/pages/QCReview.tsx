import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Clock, Camera, PenTool, AlertTriangle, Upload, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { getJobCards, updateJobCard } from "@/api/jobCards";
import { getQcReviews, getQcReview, createQcReview, updateChecklist, finalize } from "@/api/qcReviews";

// --- Types ---
interface ChecklistItem {
  id: string;
  db_id?: string;
  name: string;
  category: string;
  result: "Pass" | "Fail" | "N/A" | null;
  notes: string;
  photoUrl: string | null;
}

interface QCJob {
  id: string;
  job_card_id: string;
  qc_review_id: string | null;
  jobNumber: string;
  vehicle: string;
  vehicleDetail: string;
  priority: string;
  status: string;
  bay: string;
}

const defaultChecklist: Omit<ChecklistItem, "id">[] = [
  { name: "Engine oil level and condition", category: "Engine", result: null, notes: "", photoUrl: null },
  { name: "Coolant level and hose integrity", category: "Engine", result: null, notes: "", photoUrl: null },
  { name: "Belt tension and condition", category: "Engine", result: null, notes: "", photoUrl: null },
  { name: "Front brake pad thickness", category: "Brakes", result: null, notes: "", photoUrl: null },
  { name: "Rear brake pad thickness", category: "Brakes", result: null, notes: "", photoUrl: null },
  { name: "Brake fluid level", category: "Brakes", result: null, notes: "", photoUrl: null },
  { name: "Brake line pressure test", category: "Brakes", result: null, notes: "", photoUrl: null },
  { name: "Tire tread depth (all four)", category: "Tires & Suspension", result: null, notes: "", photoUrl: null },
  { name: "Suspension shock absorbers", category: "Tires & Suspension", result: null, notes: "", photoUrl: null },
  { name: "Headlights and indicators", category: "Electrical", result: null, notes: "", photoUrl: null },
  { name: "Battery voltage and terminals", category: "Electrical", result: null, notes: "", photoUrl: null },
  { name: "All electrical connections", category: "Electrical", result: null, notes: "", photoUrl: null },
  { name: "Transmission fluid level", category: "Transmission", result: null, notes: "", photoUrl: null },
  { name: "Clutch operation (manual)", category: "Transmission", result: null, notes: "", photoUrl: null },
];

const resultColor: Record<string, string> = {
  Pass: "bg-success/15 text-success border-success/30",
  Fail: "bg-destructive/15 text-destructive border-destructive/30",
  "N/A": "bg-muted text-muted-foreground border-border",
};

// --- Signature Canvas ---
function SignatureCanvas({ onSave, onCancel }: { onSave: (data: string) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setDrawing(true); setHasDrawn(true);
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };
  const stopDraw = () => setDrawing(false);
  const clear = () => { canvasRef.current!.getContext("2d")!.clearRect(0, 0, 440, 160); setHasDrawn(false); };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("qcExtra.signOff")}</p>
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/30">
        <canvas ref={canvasRef} width={440} height={160} className="w-full cursor-crosshair touch-none"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
      </div>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={clear}>{t("qcExtra.clear")}</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button size="sm" disabled={!hasDrawn} onClick={() => hasDrawn && onSave(canvasRef.current!.toDataURL())} className="gap-1.5">
            <PenTool className="w-3.5 h-3.5" /> {t("qcExtra.signSubmit")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function QCReview() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const canReview = hasRole("qc_inspector") || hasRole("supervisor") || hasRole("admin");

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<QCJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<QCJob | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    defaultChecklist.map((item, i) => ({ ...item, id: `item-${i}` }))
  );
  const [remarks, setRemarks] = useState("");
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signAction, setSignAction] = useState<"pass" | "fail">("pass");
  const [photoItemId, setPhotoItemId] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const jobData = await getJobCards({ status: "QC Review" });
      if (!jobData) { setLoading(false); return; }

      const rawJobs = Array.isArray(jobData) ? jobData : (jobData?.data ?? []);
      const reviews = await getQcReviews();
      const reviewList = Array.isArray(reviews) ? reviews : (reviews?.data ?? []);
      const reviewMap = new Map((reviewList || []).map((r: any) => [r.job_card_id, r]));

      const mapped: QCJob[] = rawJobs.map((j: any) => ({
        id: j.id,
        job_card_id: j.id,
        qc_review_id: reviewMap.get(j.id)?.id || null,
        jobNumber: j.job_number || j.id.substring(0,8),
        vehicle: (j.vehicle || j.vehicles)?.plate_number || j.vehicle_plate || "—",
        vehicleDetail: [(j.vehicle || j.vehicles)?.make || j.vehicle_make, (j.vehicle || j.vehicles)?.model || j.vehicle_model, (j.vehicle || j.vehicles)?.department].filter(Boolean).join(" • "),
        priority: j.priority,
        status: reviewMap.get(j.id) ? "In Review" : "Awaiting Review",
        bay: j.bay_number || "—",
      }));

      setJobs(mapped);
      if (mapped.length > 0 && !selectedJob) {
        setSelectedJob(mapped[0]);
        await loadChecklist(mapped[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklist = async (job: QCJob) => {
    if (job.qc_review_id) {
      try {
        const review: any = await getQcReview(job.qc_review_id);
        const data = review.checklist_items || review.checklistItems || [];
        if (data && data.length > 0) {
          const chkArray = Array.isArray(data) ? data : (data?.data ?? []);
          setChecklist(chkArray.map((item: any) => ({
            id: `item-${item.id}`,
            db_id: item.id,
            name: item.item_name || item.name,
            category: item.category || "General",
            result: item.result as ChecklistItem["result"],
            notes: item.notes || "",
            photoUrl: item.photo_url || item.photoUrl || null,
          })));
          setRemarks(review.remarks || review.notes || "");
          return;
        }
      } catch(e) {
        console.error(e);
      }
    }
    // Default checklist for new review
    setChecklist(defaultChecklist.map((item, i) => ({ ...item, id: `item-${i}` })));
    setRemarks("");
  };

  useEffect(() => { fetchJobs(); }, []);

  const categories = [...new Set(checklist.map((i) => i.category))];
  const passCount = checklist.filter((i) => i.result === "Pass").length;
  const failCount = checklist.filter((i) => i.result === "Fail").length;
  const pendingCount = checklist.filter((i) => i.result === null).length;
  const allReviewed = pendingCount === 0;

  const setItemResult = (id: string, result: "Pass" | "Fail" | "N/A") => {
    setChecklist(checklist.map((item) => item.id === id ? { ...item, result } : item));
  };

  const setItemNotes = (id: string, notes: string) => {
    setChecklist(checklist.map((item) => item.id === id ? { ...item, notes } : item));
  };

  const handlePhotoUpload = (id: string) => {
    setChecklist(checklist.map((item) => item.id === id ? { ...item, photoUrl: `https://placehold.co/400x300/1a1a2e/ffffff?text=QC+Photo` } : item));
    setPhotoItemId(null);
    toast.success(t("qcExtra.photoAttached"));
  };

  const ensureQCReview = async (job: QCJob): Promise<string> => {
    if (job.qc_review_id) return job.qc_review_id;
    try {
      const data = await createQcReview({ job_card_id: job.job_card_id, status: "pending" });
      job.qc_review_id = data.id;
      setJobs(jobs.map(j => j.id === job.id ? { ...j, qc_review_id: data.id } : j));
      return data.id;
    } catch (error) {
      throw error;
    }
  };

  const handleSignOff = async (signatureData: string) => {
    if (!selectedJob || !user) return;
    setShowSignDialog(false);

    try {
      const reviewId = await ensureQCReview(selectedJob);
      const finalStatus = signAction === "pass" ? "Passed" : "Failed";

      // Save checklist items
      const items: any[] = checklist.map(item => ({
        qc_review_id: reviewId,
        item_name: item.name,
        category: item.category,
        result: item.result,
        notes: item.notes || null,
        photo_url: item.photoUrl,
        checked_at: item.result ? new Date().toISOString() : null,
      }));

      await updateChecklist(reviewId, items);

      // Update review
      await finalize(reviewId, {
        status: finalStatus,
        remarks,
        signature_data: signatureData,
        signature: signatureData,
        reviewed_at: new Date().toISOString(),
      });

      // Update job card status
      const newJobStatus = signAction === "pass" ? "completed" : "in_progress";
      await updateJobCard(selectedJob.job_card_id, { status: newJobStatus as any });

      toast.success(
        signAction === "pass"
          ? t("qcExtra.passed", { job: selectedJob.jobNumber })
          : t("qcExtra.failed", { job: selectedJob.jobNumber })
      );

      // Refresh
      setSelectedJob(null);
      fetchJobs();
    } catch (err: any) {
      toast.error(t("qcExtra.saveFailed"));
    }
  };

  const openSignDialog = (action: "pass" | "fail") => {
    if (!allReviewed && action === "pass") {
      toast.error(t("qcExtra.reviewAllFirst"));
      return;
    }
    if (failCount > 0 && action === "pass") {
      toast.error(t("qcExtra.cannotApprove"));
      return;
    }
    setSignAction(action);
    setShowSignDialog(true);
  };

  const handleSaveRemarks = async () => {
    if (!selectedJob) return;
    try {
      const reviewId = await ensureQCReview(selectedJob);
      await finalize(reviewId, { remarks, status: "pending" }); // Only update remarks if we can
      toast.success(t("qcExtra.remarksSaved"));
    } catch (err: any) {
      toast.error(t("qcExtra.remarksFailed"));
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("qcExtra.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("qcExtra.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-warning/15 text-warning border border-warning/30 text-xs">{t("qcExtra.pendingReview", { count: jobs.length })}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("qcExtra.stats.passed"), value: passCount, icon: CheckCircle, color: "text-success" },
          { label: t("qcExtra.stats.failed"), value: failCount, icon: XCircle, color: "text-destructive" },
          { label: t("qcExtra.stats.pending"), value: pendingCount, icon: Clock, color: "text-warning" },
          { label: t("qcExtra.stats.completion"), value: `${Math.round(((checklist.length - pendingCount) / checklist.length) * 100)}%`, icon: CheckCircle, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <h3 className="text-lg font-semibold">{t("qcExtra.allClear")}</h3>
          <p className="text-sm text-muted-foreground">{t("qcExtra.noJobs")}</p>
        </Card>
      ) : selectedJob ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main checklist */}
          <Card className="col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{selectedJob.jobNumber}</h2>
                  <StatusBadge status={selectedJob.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{selectedJob.vehicle} — {selectedJob.vehicleDetail}</p>
              </div>
              <PriorityBadge priority={selectedJob.priority} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: t("qcExtra.bay"), value: selectedJob.bay },
                { label: t("qcExtra.priority"), value: selectedJob.priority },
              ].map((d) => (
                <div key={d.label} className="bg-muted rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground uppercase">{d.label}</p>
                  <p className="text-sm font-semibold mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold mb-4">{t("qcExtra.checklist")}</h3>

            {categories.map((cat) => (
              <div key={cat} className="mb-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                <div className="space-y-2">
                  {checklist.filter((i) => i.category === cat).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-sm flex-1">{item.name}</span>

                      {item.photoUrl && (
                        <img src={item.photoUrl} alt="QC" className="w-8 h-8 rounded object-cover border" />
                      )}

                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPhotoItemId(item.id)} title={t("qcExtra.attachPhoto")}>
                        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>

                      {canReview ? (
                        <div className="flex gap-1">
                          {(["Pass", "Fail", "N/A"] as const).map((r) => (
                            <Button
                              key={r}
                              size="sm"
                              variant="outline"
                              className={`h-7 text-[10px] px-2 ${item.result === r ? resultColor[r] : ""}`}
                              onClick={() => setItemResult(item.id, r)}
                            >
                              {t(`qcExtra.results.${r === "N/A" ? "NA" : r}`)}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Badge className={`text-[10px] ${item.result ? resultColor[item.result] : "bg-muted text-muted-foreground"}`}>
                          {item.result ? t(`qcExtra.results.${item.result === "N/A" ? "NA" : item.result}`) : t("qcExtra.results.Pending")}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Notes per failed item */}
            {checklist.filter((i) => i.result === "Fail").length > 0 && (
              <div className="mt-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5" /> {t("qcExtra.failedItemsAddNotes")}
                </p>
                {checklist.filter((i) => i.result === "Fail").map((item) => (
                  <div key={item.id} className="mb-3 last:mb-0">
                    <p className="text-xs font-medium mb-1">{item.name}</p>
                    <Textarea
                      rows={2}
                      placeholder={t("qcExtra.failPlaceholder")}
                      value={item.notes}
                      onChange={(e) => setItemNotes(item.id, e.target.value)}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Actions panel */}
          <div className="space-y-4">
            {canReview && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-3">{t("qcExtra.decision")}</h3>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => openSignDialog("pass")}
                    disabled={!allReviewed || failCount > 0}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> {t("qcExtra.approvePass")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => openSignDialog("fail")}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> {t("qcExtra.rejectRework")}
                  </Button>
                </div>
                {!allReviewed && (
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    {t("qcExtra.reviewRemaining", { count: pendingCount })}
                  </p>
                )}
              </Card>
            )}

            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">{t("qcExtra.remarks")}</h3>
              <Textarea
                placeholder={t("qcExtra.remarksPlaceholder")}
                className="min-h-[100px]"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={handleSaveRemarks}>
                {t("qcExtra.saveRemarks")}
              </Button>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">{t("qcExtra.queue", { count: jobs.length })}</h3>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedJob.id === job.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                    }`}
                    onClick={async () => {
                      setSelectedJob(job);
                      await loadChecklist(job);
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium">{job.jobNumber}</p>
                      <p className="text-xs text-muted-foreground">{job.vehicle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={job.priority} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 italic">{t("qcExtra.allCompleted")}</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Photo upload dialog */}
      <Dialog open={!!photoItemId} onOpenChange={(open) => !open && setPhotoItemId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5 text-primary" /> {t("qcExtra.attachInspectionPhoto")}</DialogTitle>
            <DialogDescription>{t("qcExtra.uploadDesc")}</DialogDescription>
          </DialogHeader>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("qcExtra.dragDrop")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("qcExtra.fileLimit")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoItemId(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => photoItemId && handlePhotoUpload(photoItemId)} className="gap-1.5">
              <Camera className="w-4 h-4" /> {t("qcExtra.simulateUpload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign-off dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {signAction === "pass" ? (
                <><CheckCircle className="w-5 h-5 text-success" /> {t("qcExtra.signPass")}</>
              ) : (
                <><XCircle className="w-5 h-5 text-destructive" /> {t("qcExtra.signFail")}</>
              )}
            </DialogTitle>
            <DialogDescription>
              {signAction === "pass"
                ? t("qcExtra.signPassDesc", { job: selectedJob?.jobNumber })
                : t("qcExtra.signFailDesc", { job: selectedJob?.jobNumber })}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">{t("qcExtra.job")}</span> <span className="font-medium">{selectedJob?.jobNumber}</span></p>
            <p><span className="text-muted-foreground">{t("qcExtra.vehicle")}</span> <span className="font-medium">{selectedJob?.vehicle}</span></p>
            <p><span className="text-muted-foreground">{t("qcExtra.result")}</span>{" "}
              <span className={`font-bold ${signAction === "pass" ? "text-success" : "text-destructive"}`}>
                {passCount} {t("qcExtra.results.Pass")} / {failCount} {t("qcExtra.results.Fail")} / {checklist.filter(i => i.result === "N/A").length} {t("qcExtra.results.NA")}
              </span>
            </p>
          </div>

          <SignatureCanvas onSave={handleSignOff} onCancel={() => setShowSignDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
