import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { getJobCard, updateJobCard } from "@/api/jobCards";
import { getUsers } from "@/api/users";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

const BAYS = ["", "Bay 01", "Bay 02", "Bay 03", "Bay 04", "Bay 05", "Bay 06", "Bay 07", "Bay 08"];
const STATUSES = ["Open", "In Progress", "Pending Parts", "QC Review", "Completed", "Delayed"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

interface MechanicOption { user_id: string; full_name: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobCardId: string | null;
  onSaved: () => void;
}

const TITLE_RX = /^(?:Title|العنوان|Job Title|عنوان الوظيفة):\s*(.+?)(?:\n|$)/i;

function splitDescription(desc: string | null): { title: string; body: string } {
  if (!desc) return { title: "", body: "" };
  const match = desc.match(TITLE_RX);
  if (match) {
    const lines = desc.split("\n");
    return { title: match[1].trim(), body: lines.slice(1).join("\n").trim() };
  }
  return { title: "", body: desc };
}

function joinDescription(title: string, body: string): string | null {
  const t = title.trim();
  const b = body.trim();
  if (!t && !b) return null;
  if (!t) return b;
  return `Title: ${t}\n${b}`.trim();
}

export default function JobCardEditDialog({ open, onOpenChange, jobCardId, onSaved }: Props) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { can, canReviewQc } = usePermissions();
  const canComplete = hasRole("admin") || hasRole("qc_inspector") || can("qc.review") || canReviewQc;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialStatus, setInitialStatus] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [bay, setBay] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);

  useEffect(() => {
    if (!open || !jobCardId) return;
    setLoading(true);
    (async () => {
      try {
        const [jc, activeMechanics] = await Promise.all([
          getJobCard(jobCardId),
          getUsers({ role: "mechanic", is_active: true }),
        ]);
        if (jc) {
          setStatus(jc.status);
          setInitialStatus(jc.status);
          setPriority(jc.priority);
          setBay(jc.bay_number || "");
          setAssignedTo(jc.assigned_to || "");
          const split = splitDescription(jc.description ?? null);
          setTitle(split.title);
          setBody(split.body);
        }
        
        setMechanics(activeMechanics.map((u: any) => ({
          user_id: u.id,
          full_name: `${u.profile?.first_name || ""} ${u.profile?.last_name || ""}`.trim() || u.email
        })));
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, jobCardId]);

  const save = async () => {
    if (!jobCardId) return;

    if (status === "Completed" && !canComplete && initialStatus !== "Completed") {
      toast.error(
        t(
          "jobCards.edit.qcRequiredError",
          "Only users with QC review permission or administrators can mark a job card as Completed. Please submit for QC Review."
        )
      );
      return;
    }

    setSaving(true);
    const updates: {
      status: string;
      priority: string;
      bay_number: string | null;
      assigned_to: string | null;
      description: string | null;
      started_at?: string;
      completed_at?: string;
    } = {
      status,
      priority,
      bay_number: bay || null,
      assigned_to: assignedTo || null,
      description: joinDescription(title, body),
    };
    if (status === "In Progress") updates.started_at = new Date().toISOString();
    if (status === "Completed") updates.completed_at = new Date().toISOString();

    try {
      await updateJobCard(jobCardId, updates);
      toast.success(t("jobCards.edit.saved"));
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "save changes"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("jobCards.edit.title")}</DialogTitle>
          <DialogDescription>{t("jobCards.edit.subtitle")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary of the issue"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description of the issue</label>
              <Textarea
                className="mt-1.5 min-h-[140px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the symptoms, what was reported, and any context the mechanic needs."
              />
              <p className="text-[11px] text-muted-foreground mt-1">{body.length} characters</p>
            </div>

            <div>
              <label className="text-sm font-medium">{t("common.status")}</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => {
                    const isCompleted = s === "Completed";
                    const disabled = isCompleted && !canComplete && initialStatus !== "Completed";
                    return (
                      <SelectItem key={s} value={s} disabled={disabled}>
                        {s} {disabled ? `(${t("jobCards.edit.qcRequired", "QC Review Required")})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t("common.priority")}</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{t(`jobCards.priority.${p}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t("jobCards.table.bay")}</label>
              <Select value={bay || "__none__"} onValueChange={(v) => setBay(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {BAYS.filter(Boolean).map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t("jobCards.wizard.assignMechanic")}</label>
              <Select value={assignedTo || "__none__"} onValueChange={(v) => setAssignedTo(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("jobCards.wizard.unassigned")}</SelectItem>
                  {mechanics.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
