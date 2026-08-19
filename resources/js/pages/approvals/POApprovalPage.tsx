import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logApprovalAction } from "@/lib/approvals";
import ApprovalHistory from "@/components/approvals/ApprovalHistory";
import { getPurchaseOrder, approveManager, approveFinance, rejectPO } from "@/api/purchaseOrders";

interface Props { stage: "manager" | "finance" }

/** Deep-link approval page for a Purchase Order, either Manager or Finance stage. */
export default function POApprovalPage({ stage }: Props) {
  const { id = "" } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const canAct = stage === "manager"
    ? (hasRole("admin") || hasRole("supervisor"))
    : hasRole("admin");

  const [note, setNote] = useState("");

  const { data: po, isLoading: loading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrder(id),
    enabled: !!id,
  });

  const items: any[] = po?.items ?? [];

  const back = () => navigate(search.get("from") || "/purchase-orders");

  const expectedStatus = stage === "manager" ? "Pending Manager Approval" : "Pending Finance Approval";
  const pending = po?.status === expectedStatus;

  const approveMut = useMutation({
    mutationFn: () => stage === "manager"
      ? approveManager(id, { notes: note.trim() || undefined })
      : approveFinance(id, { notes: note.trim() || undefined }),
    onSuccess: async () => {
      await logApprovalAction({ action: "approved", entityType: "purchase_order", entityId: id, entityRef: po?.po_number, stage });
      toast.success("Approved.");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Approval failed"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectPO(id, { reason: note.trim() }),
    onSuccess: async () => {
      await logApprovalAction({ action: "rejected", entityType: "purchase_order", entityId: id, entityRef: po?.po_number, stage, reason: note.trim() });
      toast.success("Rejected.");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Rejection failed"),
  });

  const submit = (kind: "approve" | "reject") => {
    if (!po || !user) return;
    if (kind === "reject" && !note.trim()) { toast.error("Please provide a rejection reason."); return; }
    if (kind === "approve") approveMut.mutate();
    else rejectMut.mutate();
  };

  const submitting = approveMut.isPending || rejectMut.isPending;

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
  if (!po) {
    return (
      <Card className="p-8 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
        <p className="font-semibold">Purchase order not found</p>
        <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 me-1" /> Back</Button>
      </Card>
    );
  }

  const title = stage === "manager" ? "PO Manager Approval" : "PO Finance Approval";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={back} className="gap-1.5">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground font-mono">{po.po_number}</p>
            <p className="text-xs text-muted-foreground">
              Supplier: <span className="font-medium">{po.supplier?.name || "—"}</span>
            </p>
          </div>
          <Badge variant="outline">{po.status}</Badge>
        </div>

        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
              <tr>
                <th className="text-start px-3 py-2">Part</th>
                <th className="text-start px-3 py-2">SKU</th>
                <th className="text-end px-3 py-2">Qty</th>
                <th className="text-end px-3 py-2">Unit</th>
                <th className="text-end px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">{it.part_name}</td>
                  <td className="px-3 py-2 font-mono text-primary">{it.part_number || "—"}</td>
                  <td className="px-3 py-2 text-end">{it.quantity}</td>
                  <td className="px-3 py-2 text-end">{Number(it.unit_price).toFixed(2)}</td>
                  <td className="px-3 py-2 text-end">{Number(it.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30">
                <td colSpan={4} className="px-3 py-2 text-end text-xs font-semibold">Total ({po.currency})</td>
                <td className="px-3 py-2 text-end font-semibold">{Number(po.total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {po.rejected_reason && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-[10px] font-bold uppercase text-destructive mb-1">Rejection reason</p>
            <p className="text-sm whitespace-pre-wrap">{po.rejected_reason}</p>
          </div>
        )}

        {canAct && pending ? (
          <>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={stage === "manager" ? "Manager notes (required to reject)" : "Finance notes (required to reject)"}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => submit("reject")} disabled={submitting} className="gap-1.5">
                <X className="w-4 h-4" /> Reject
              </Button>
              <Button onClick={() => submit("approve")} disabled={submitting} className="gap-1.5">
                <Check className="w-4 h-4" /> Approve
              </Button>
            </div>
          </>
        ) : !canAct ? (
          <p className="text-sm text-muted-foreground italic">
            You don't have permission to act on this PO at the {stage} stage.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            This PO is not awaiting {stage} approval (current status: {po.status}).
          </p>
        )}

        <ApprovalHistory entityType="purchase_order" entityId={po.id} refreshKey={0} />
      </Card>
    </div>
  );
}
