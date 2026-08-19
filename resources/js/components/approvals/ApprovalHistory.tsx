import { useEffect, useState } from "react";
import { Check, X, Clock, ShoppingCart, Truck, PackageCheck, Ban } from "lucide-react";
import {
  fetchApprovalAudit,
  type ApprovalEntity,
  type AuditRow,
} from "@/lib/approvals";

const actionIcon: Record<string, JSX.Element> = {
  approved: <Check className="w-3.5 h-3.5 text-success" />,
  rejected: <X className="w-3.5 h-3.5 text-destructive" />,
  submitted: <Clock className="w-3.5 h-3.5 text-primary" />,
  issued: <PackageCheck className="w-3.5 h-3.5 text-success" />,
  ordered: <ShoppingCart className="w-3.5 h-3.5 text-primary" />,
  received: <Truck className="w-3.5 h-3.5 text-success" />,
  cancelled: <Ban className="w-3.5 h-3.5 text-muted-foreground" />,
};

interface Props {
  entityType: ApprovalEntity;
  entityId: string | null;
  /** Refresh trigger — bump this value after a mutation to reload. */
  refreshKey?: number;
}

export default function ApprovalHistory({ entityType, entityId, refreshKey }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityId) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    fetchApprovalAudit(entityType, entityId).then((r) => {
      if (!cancelled) { setRows(r); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [entityType, entityId, refreshKey]);

  if (!entityId) return null;
  return (
    <div className="rounded-lg border p-3 bg-muted/20" data-testid="approval-history">
      <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2">
        Approval history
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No approval activity recorded yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5">{actionIcon[r.action] ?? <Clock className="w-3.5 h-3.5" />}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium capitalize">
                  {r.stage} {r.action}
                  <span className="text-muted-foreground font-normal">
                    {" "}· {r.actor_name || "System"}
                  </span>
                </p>
                {r.reason && (
                  <p className="text-muted-foreground whitespace-pre-wrap break-words">
                    {r.reason}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
