import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { recordApproval } from "@/lib/approvals";
import ApprovalHistory from "@/components/approvals/ApprovalHistory";

interface Row {
  id: string;
  request_number: string;
  base_request_number: string | null;
  part_name: string;
  part_number: string | null;
  quantity: number;
  urgency: string;
  status: string;
  reason: string | null;
  rejection_note: string | null;
  supervisor_remarks: string | null;
  created_at: string;
  job_card_id: string | null;
  requested_by: string | null;
}

/**
 * Deep-link approval page for a single parts (or reorder) request.
 * Reused for `/approvals/parts/:id` and `/approvals/reorder/:id`. A reorder
 * request in this system is a parts request; the header just changes.
 */
export default function PartsApprovalPage({ variant = "parts" }: { variant?: "parts" | "reorder" }) {
  const { id = "" } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { can } = usePermissions();
  const canApprove = hasRole("admin") || hasRole("supervisor") || can("parts.approve");

  const [row, setRow] = useState<Row | null>(null);
  const [siblings, setSiblings] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Derive the "base" request number (PR-123 without trailing -N split suffix).
  const deriveBase = (rn: string) => {
    const m = rn.match(/^(PR-\d+)(?:-\d+)?$/);
    return m ? m[1] : rn;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("parts_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      const raw = data as any;
      if (raw) {
        const base = deriveBase(raw.request_number);
        const r: Row = { ...raw, base_request_number: base };
        setRow(r);
        const { data: sib } = await supabase
          .from("parts_requests")
          .select("*")
          .or(`request_number.eq.${base},request_number.like.${base}-%`);
        if (!cancelled) {
          setSiblings(((sib as any[]) || []).map((s) => ({
            ...s,
            base_request_number: deriveBase(s.request_number),
          })));
        }
      } else {
        setRow(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  const entityType = variant === "reorder" ? "reorder_request" : "parts_request";
  const title = variant === "reorder" ? "Reorder Request Approval" : "Parts Request Approval";

  const back = () => {
    const to = search.get("from") || "/parts-request";
    navigate(to);
  };

  const approve = async () => {
    if (!row || !user) return;
    setSubmitting(true);
    const base = row.base_request_number;
    const { error } = await supabase
      .from("parts_requests")
      .update({
        status: "Approved",
        approved_by: user.id,
        supervisor_remarks: note.trim() || null,
      } as any)
      .or(`request_number.eq.${base},request_number.like.${base}-%`);
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    await recordApproval({
      entityType,
      entityId: row.id,
      entityRef: row.base_request_number,
      stage: "supervisor",
      action: "approved",
      reason: note.trim() || null,
    });
    toast.success("Request approved.");
    setNote("");
    setSubmitting(false);
    setRefreshKey((k) => k + 1);
  };

  const reject = async () => {
    if (!row || !user) return;
    if (!note.trim()) { toast.error("Please provide a rejection reason."); return; }
    setSubmitting(true);
    const base = row.base_request_number;
    const { error } = await supabase
      .from("parts_requests")
      .update({
        status: "Rejected",
        rejection_note: note.trim(),
      } as any)
      .or(`request_number.eq.${base},request_number.like.${base}-%`);
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    await recordApproval({
      entityType,
      entityId: row.id,
      entityRef: row.base_request_number,
      stage: "supervisor",
      action: "rejected",
      reason: note.trim(),
    });
    toast.error("Request rejected.");
    setNote("");
    setSubmitting(false);
    setRefreshKey((k) => k + 1);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
  if (!row) {
    return (
      <Card className="p-8 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
        <p className="font-semibold">Request not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted or you don't have permission to view it.
        </p>
        <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 me-1" /> Back</Button>
      </Card>
    );
  }

  const lines = siblings.length ? siblings : [row];
  const pending = row.status === "Pending";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={back} className="gap-1.5">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {row.base_request_number || row.request_number}
            </p>
          </div>
          <Badge variant="outline">{row.status}</Badge>
        </div>

        {row.reason && (
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Requester notes</p>
            <p className="text-sm whitespace-pre-wrap">{row.reason}</p>
          </div>
        )}

        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
              <tr>
                <th className="text-start px-3 py-2">Part</th>
                <th className="text-start px-3 py-2">SKU</th>
                <th className="text-start px-3 py-2">Qty</th>
                <th className="text-start px-3 py-2">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">{l.part_name}</td>
                  <td className="px-3 py-2 font-mono text-primary">{l.part_number || "—"}</td>
                  <td className="px-3 py-2">{l.quantity}</td>
                  <td className="px-3 py-2">{l.urgency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {row.rejection_note && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-[10px] font-bold uppercase text-destructive mb-1">Previous rejection</p>
            <p className="text-sm whitespace-pre-wrap">{row.rejection_note}</p>
          </div>
        )}

        {canApprove && pending ? (
          <>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Remarks (required to reject, optional to approve)"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reject} disabled={submitting} className="gap-1.5">
                <X className="w-4 h-4" /> Reject
              </Button>
              <Button onClick={approve} disabled={submitting} className="gap-1.5">
                <Check className="w-4 h-4" /> Approve
              </Button>
            </div>
          </>
        ) : !canApprove ? (
          <p className="text-sm text-muted-foreground italic">
            You don't have permission to act on this request.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            This request is no longer pending ({row.status}). No action required.
          </p>
        )}

        <ApprovalHistory entityType={entityType} entityId={row.id} refreshKey={refreshKey} />
      </Card>
    </div>
  );
}
