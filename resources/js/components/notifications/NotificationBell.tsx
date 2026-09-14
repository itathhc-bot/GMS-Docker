import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Wrench, ShoppingCart, Check, History as HistoryIcon, Clock, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useAuth } from "@/hooks/useAuth";
import api from "@/api/client";
import { getPartsRequests } from "@/api/partsRequests";
import { getPurchaseOrders } from "@/api/purchaseOrders";
import { useEcho } from "@/hooks/useEcho";
type Kind = "parts" | "po_manager" | "po_finance" | "po_recent" | "history";

interface Notif {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
  tab: "pending" | "history" | "po";
}

const SEEN_KEY = "notif-seen-at";
const READ_KEY = "notif-read-ids";

const loadReadIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
};

const persistReadIds = (ids: Set<string>) => {
  try { window.localStorage.setItem(READ_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
};

export default function NotificationBell() {
  const { user, hasRole } = useAuth();
  const isSupervisor = hasRole("admin") || hasRole("supervisor");
  const isFinance = hasRole("admin");
  const [items, setItems] = useState<Notif[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);
  const [seenAt, setSeenAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem(SEEN_KEY) || 0);
  });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"pending" | "history" | "po">("pending");

  const load = async () => {
    if (!user) { setItems([]); return; }
    const collected: Notif[] = [];

    // ── PENDING ────────────────────────────────────────────────
    if (isSupervisor) {
      try {
        const data: any = await getPartsRequests({ status: "Pending", limit: 15 });
        (data as any[] | null)?.forEach((r) => collected.push({
          id: `parts-${r.id}`,
          kind: "parts",
          title: `Parts request · ${r.base_request_number || r.id.slice(0,8)}`,
          subtitle: `${r.part_name} × ${r.quantity} (${r.urgency})`,
          href: `/approvals/parts/${r.id}`,
          createdAt: r.created_at,
          tab: "pending",
        }));
      } catch (e) {}

      try {
        const pm: any = await getPurchaseOrders({ status: "pending_manager", limit: 15 });
        (pm as any[] | null)?.forEach((r) => collected.push({
          id: `pom-${r.id}`,
          kind: "po_manager",
          title: `PO manager approval · ${r.po_number}`,
          subtitle: `Total ${Number(r.total).toFixed(2)} ${r.currency || ""}`,
          href: `/approvals/po/${r.id}/manager`,
          createdAt: r.created_at,
          tab: "pending",
        }));
      } catch (e) {}
    }

    if (isFinance) {
      try {
        const data: any = await getPurchaseOrders({ status: "pending_finance", limit: 15 });
        (data as any[] | null)?.forEach((r) => collected.push({
          id: `pof-${r.id}`,
          kind: "po_finance",
          title: `PO finance approval · ${r.po_number}`,
          subtitle: `Total ${Number(r.total).toFixed(2)} ${r.currency || ""}`,
          href: `/approvals/po/${r.id}/finance`,
          createdAt: r.created_at,
          tab: "pending",
        }));
      } catch(e) {}
    }

    // ── HISTORY (recent approvals / rejections) ────────────────
    try {
      const { data: audit } = await api.get('/audit-logs', { params: { limit: 15, action: 'approval' } });
      const auditArray = Array.isArray(audit) ? audit : (Array.isArray((audit as any)?.data) ? (audit as any).data : []);
      auditArray.forEach((r: any) => {
        const href = r.entity_type === "purchase_order"
          ? `/approvals/po/${r.entity_id}/${r.stage === "finance" ? "finance" : "manager"}`
          : r.entity_type === "parts_request"
            ? `/approvals/parts/${r.entity_id}`
            : "#";
        collected.push({
          id: `hist-${r.id}`,
          kind: "history",
          title: `${r.action === "approved" ? "Approved" : r.action === "rejected" ? "Rejected" : r.action} · ${r.entity_ref || r.entity_id.slice(0,8)}`,
          subtitle: `${r.stage}${r.actor_name ? ` · ${r.actor_name}` : ""}`,
          href,
          createdAt: r.created_at,
          tab: "history",
        });
      });
    } catch(e) {}

    // ── ALL RECENT POs ────────────────────────────────────────
    try {
      const pos: any = await getPurchaseOrders({ limit: 15 });
      (pos as any[] | null)?.forEach((r) => collected.push({
        id: `po-${r.id}`,
        kind: "po_recent",
        title: `PO · ${r.po_number}`,
        subtitle: `${r.status} · ${Number(r.total).toFixed(2)} ${r.currency || ""}`,
        href: `/purchase-orders?open=${r.id}`,
        createdAt: r.created_at,
        tab: "po",
      }));
    } catch (e) {}

    collected.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setItems(collected);
  };

  useEcho(user ? 'notifications' : null, 'NotificationUpdated', () => void load());

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isSupervisor, isFinance]);

  const pendingItems = useMemo(() => items.filter((n) => n.tab === "pending"), [items]);
  const historyItems = useMemo(() => items.filter((n) => n.tab === "history"), [items]);
  const poItems = useMemo(() => items.filter((n) => n.tab === "po"), [items]);

  const unread = useMemo(
    () => pendingItems.filter((n) => !readIds.has(n.id) && new Date(n.createdAt).getTime() > seenAt).length,
    [pendingItems, seenAt, readIds],
  );

  const markSeen = () => {
    const now = Date.now();
    setSeenAt(now);
    try { window.localStorage.setItem(SEEN_KEY, String(now)); } catch { /* ignore */ }
  };

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    persistReadIds(next);
  };

  const markAllRead = (list: Notif[]) => {
    const next = new Set(readIds);
    list.forEach((n) => next.add(n.id));
    setReadIds(next);
    persistReadIds(next);
    markSeen();
  };

  const renderList = (list: Notif[], emptyMsg: string) => (
    <div className="max-h-[420px] overflow-y-auto divide-y">
      {list.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyMsg}</p>
      ) : list.map((n) => {
        const isRead = readIds.has(n.id);
        return (
          <div
            key={n.id}
            className={`flex items-start gap-2 px-3 py-2.5 hover:bg-muted transition-colors ${isRead ? "opacity-60" : ""}`}
          >
            <Link
              to={n.href}
              onClick={() => { markRead(n.id); setOpen(false); }}
              className="flex items-start gap-2 flex-1 min-w-0"
            >
              <span className="mt-0.5">
                {n.kind === "parts" ? <Wrench className="w-4 h-4 text-primary" />
                  : n.kind === "history" ? <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                  : <ShoppingCart className="w-4 h-4 text-primary" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${isRead ? "font-normal" : "font-medium"}`}>{n.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{n.subtitle}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </Link>
            {!isRead && (
              <button
                onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                aria-label="Mark as read"
                title="Mark as read"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const activeList = tab === "pending" ? pendingItems : tab === "history" ? historyItems : poItems;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markSeen(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={`Notifications${unread ? ` (${unread} new)` : ""}`}
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-0.5 end-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          <Badge variant="outline" className="text-[10px]">{pendingItems.length} pending</Badge>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full rounded-none h-9 bg-muted/30">
            <TabsTrigger value="pending" className="flex-1 text-xs gap-1">
              <Clock className="w-3 h-3" /> Pending
              {pendingItems.filter((n) => !readIds.has(n.id)).length > 0 && (
                <span className="ms-1 text-[9px] rounded-full bg-destructive text-destructive-foreground px-1.5">
                  {pendingItems.filter((n) => !readIds.has(n.id)).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs gap-1">
              <HistoryIcon className="w-3 h-3" /> History
            </TabsTrigger>
            <TabsTrigger value="po" className="flex-1 text-xs gap-1">
              <ShoppingCart className="w-3 h-3" /> POs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-0">
            {renderList(pendingItems, "You're all caught up.")}
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            {renderList(historyItems, "No recent approval activity.")}
          </TabsContent>
          <TabsContent value="po" className="mt-0">
            {renderList(poItems, "No purchase orders yet.")}
          </TabsContent>
        </Tabs>
        <div className="px-3 py-2 border-t flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">
            {activeList.filter((n) => !readIds.has(n.id)).length} unread
          </span>
          <Button variant="ghost" size="sm" onClick={() => markAllRead(activeList)} className="text-xs gap-1">
            <Check className="w-3 h-3" /> Mark all read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
