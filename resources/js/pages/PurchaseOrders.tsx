import { useEffect, useState } from "react";
import { Plus, Printer, Check, X as XIcon, Trash2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, approveManager, approveFinance, rejectPO, updatePurchaseOrder } from "@/api/purchaseOrders";
import api from "@/api/client";

interface Supplier { id: string; name: string; email: string | null; }
interface POItem { id?: string; part_name: string; part_number: string | null; quantity: number; unit_price: number; total: number; }
interface PO {
  id: string; po_number: string; status: string; currency: string;
  subtotal: number; tax: number; total: number; notes: string | null;
  supplier_id: string | null; requested_by_name: string | null;
  manager_approved_at: string | null; finance_approved_at: string | null;
  rejected_reason: string | null; created_at: string;
  suppliers?: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground",
  Draft: "bg-muted text-foreground",
  pending_manager: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  "Pending Manager Approval": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  pending_finance: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "Pending Finance Approval": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  Approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-destructive/15 text-destructive",
  Rejected: "bg-destructive/15 text-destructive",
  ordered: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  Ordered: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground",
};

export default function PurchaseOrders() {
  const { user, profile, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = hasRole("admin") || hasRole("supervisor");
  const canApproveManager = hasRole("admin") || hasRole("supervisor");
  const canApproveFinance = hasRole("admin");

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: posData, isLoading: loading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => getPurchaseOrders({ sort: "-created_at", per_page: 100 }),
  });
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/suppliers?per_page=200").then(r => r.data?.data ?? r.data ?? []),
  });

  const pos: PO[] = posData?.data ?? posData ?? [];
  const suppliers: Supplier[] = suppliersData ?? [];

  const fetchAll = () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Create, approve, and print purchase orders for parts reorders.</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => setSupplierOpen(true)}>Manage suppliers</Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> New Purchase Order
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow key={po.id} className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-primary">{po.po_number}</TableCell>
                  <TableCell>{po.suppliers?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[po.status] || ""} variant="outline">
                      {po.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{po.currency} {Number(po.total).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{po.requested_by_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(po.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDetailId(po.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pos.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No purchase orders yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreatePODialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        suppliers={suppliers}
        onCreated={fetchAll}
        userId={user?.id}
        userName={profile?.full_name || null}
      />
      <SuppliersDialog open={supplierOpen} onOpenChange={setSupplierOpen} onChanged={fetchAll} />
      <PODetailDialog
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        poId={detailId}
        onChanged={fetchAll}
        canApproveManager={canApproveManager}
        canApproveFinance={canApproveFinance}
        userId={user?.id}
      />
    </div>
  );
}

// ------------------- Create PO -------------------
function CreatePODialog({ open, onOpenChange, suppliers, onCreated, userId, userName }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  suppliers: Supplier[]; onCreated: () => void;
  userId?: string; userName: string | null;
}) {
  const [supplierId, setSupplierId] = useState<string>("");
  const [currency, setCurrency] = useState("AED");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([
    { part_name: "", part_number: "", quantity: 1, unit_price: 0, total: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSupplierId(""); setCurrency("AED"); setNotes("");
      setItems([{ part_name: "", part_number: "", quantity: 1, unit_price: 0, total: 0 }]);
    }
  }, [open]);

  const updateItem = (i: number, patch: Partial<POItem>) => {
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      next.total = Number(next.quantity) * Number(next.unit_price);
      return next;
    }));
  };

  const subtotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const tax = 0;
  const total = subtotal + tax;

  const save = async () => {
    if (!supplierId) { toast.error("Select a supplier"); return; }
    const cleanItems = items.filter((it) => it.part_name.trim());
    if (cleanItems.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      const po = await createPurchaseOrder({
        supplier_id: supplierId,
        currency,
        subtotal, tax, total,
        notes: notes || null,
        items: cleanItems.map(it => ({
          part_name: it.part_name,
          part_number: it.part_number || null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.total,
        })),
      });
      toast.success(`Created ${po.po_number}`);
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to create PO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={4} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, { part_name: "", part_number: "", quantity: 1, unit_price: 0, total: 0 }])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label className="text-[11px]">Part Name</Label>
                    <Input value={it.part_name} onChange={(e) => updateItem(i, { part_name: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px]">SKU</Label>
                    <Input value={it.part_number || ""} onChange={(e) => updateItem(i, { part_number: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px]">Qty</Label>
                    <Input type="number" min="0" step="0.01" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px]">Unit Price</Label>
                    <Input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-1 text-sm text-right pb-2">{it.total.toFixed(2)}</div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end border-t pt-3 text-sm">
            <div className="w-56 space-y-1">
              <div className="flex justify-between"><span>Subtotal:</span><span>{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax:</span><span>{tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total:</span><span>{currency} {total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Submit for Manager Approval"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------- Detail / Approval / Print -------------------
function PODetailDialog({ open, onOpenChange, poId, onChanged, canApproveManager, canApproveFinance, userId }: {
  open: boolean; onOpenChange: (v: boolean) => void; poId: string | null; onChanged: () => void;
  canApproveManager: boolean; canApproveFinance: boolean; userId?: string;
}) {
  const { data: po } = useQuery({
    queryKey: ["purchase-order", poId],
    queryFn: () => getPurchaseOrder(poId!),
    enabled: !!poId,
  });
  const items: POItem[] = po?.items ?? [];

  const act = async (action: "manager_approve" | "manager_reject" | "finance_approve" | "finance_reject" | "mark_ordered" | "mark_received") => {
    if (!po) return;
    try {
      if (action === "manager_approve") await approveManager(po.id, { notes: note || undefined });
      else if (action === "manager_reject") await rejectPO(po.id, { reason: note || "Rejected by manager" });
      else if (action === "finance_approve") await approveFinance(po.id, { notes: note || undefined });
      else if (action === "finance_reject") await rejectPO(po.id, { reason: note || "Rejected by finance" });
      else if (action === "mark_ordered") await updatePurchaseOrder(po.id, { status: "ordered" });
      else if (action === "mark_received") await updatePurchaseOrder(po.id, { status: "received" });
      toast.success("Updated");
      setNote("");
      onChanged();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Action failed");
    }
  };

  const handlePrint = () => window.print();

  if (!po) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="py-10 text-center text-muted-foreground">Loading…</div></DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Purchase Order — {po.po_number}</span>
            <Button variant="outline" size="sm" onClick={handlePrint} className="no-print">
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 print-section">
          {/* Header for print */}
          <div className="hidden print:block text-center mb-4">
            <h1 className="text-2xl font-bold">Purchase Order</h1>
            <div className="text-sm">{po.po_number}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Supplier</div>
              <div className="font-semibold">{po.suppliers?.name || "—"}</div>
              <div className="text-xs">{po.suppliers?.email}</div>
              <div className="text-xs">{po.suppliers?.phone}</div>
              <div className="text-xs whitespace-pre-wrap">{po.suppliers?.address}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Details</div>
              <div className="text-sm">Status: <Badge className={STATUS_COLORS[po.status]} variant="outline">{po.status.replace(/_/g, " ")}</Badge></div>
              <div className="text-xs">Requested by: {po.requested_by_name || "—"}</div>
              <div className="text-xs">Created: {new Date(po.created_at).toLocaleString()}</div>
              {po.manager_approved_at && <div className="text-xs">Manager approved: {new Date(po.manager_approved_at).toLocaleString()}</div>}
              {po.finance_approved_at && <div className="text-xs">Finance approved: {new Date(po.finance_approved_at).toLocaleString()}</div>}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>{it.part_name}</TableCell>
                  <TableCell>{it.part_number || "—"}</TableCell>
                  <TableCell className="text-right">{Number(it.quantity)}</TableCell>
                  <TableCell className="text-right">{Number(it.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(it.total).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end text-sm">
            <div className="w-56 space-y-1">
              <div className="flex justify-between"><span>Subtotal:</span><span>{Number(po.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax:</span><span>{Number(po.tax).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold"><span>Total:</span><span>{po.currency} {Number(po.total).toFixed(2)}</span></div>
            </div>
          </div>

          {(po.notes || po.manager_notes || po.finance_notes || po.rejected_reason) && (
            <div className="text-sm space-y-1 border-t pt-3">
              {po.notes && <div><b>Notes:</b> {po.notes}</div>}
              {po.manager_notes && <div><b>Manager notes:</b> {po.manager_notes}</div>}
              {po.finance_notes && <div><b>Finance notes:</b> {po.finance_notes}</div>}
              {po.rejected_reason && <div className="text-destructive"><b>Rejected:</b> {po.rejected_reason}</div>}
            </div>
          )}

          {/* Signature lines for print */}
          <div className="hidden print:grid grid-cols-3 gap-6 mt-10 pt-6 text-xs">
            <div className="text-center"><div className="border-b border-black h-12" /><div className="mt-1">Requested By</div></div>
            <div className="text-center"><div className="border-b border-black h-12" /><div className="mt-1">Manager Approval</div></div>
            <div className="text-center"><div className="border-b border-black h-12" /><div className="mt-1">Finance Approval</div></div>
          </div>

          {/* Actions */}
          <div className="no-print border-t pt-3 space-y-2">
            {(po.status === "pending_manager" || po.status === "Pending Manager Approval") && canApproveManager && (
              <>
                <Textarea placeholder="Manager notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => act("manager_reject")}><XIcon className="h-4 w-4 mr-1" /> Reject</Button>
                  <Button onClick={() => act("manager_approve")}><Check className="h-4 w-4 mr-1" /> Approve → Finance</Button>
                </div>
              </>
            )}
            {(po.status === "pending_finance" || po.status === "Pending Finance Approval") && canApproveFinance && (
              <>
                <Textarea placeholder="Finance notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => act("finance_reject")}><XIcon className="h-4 w-4 mr-1" /> Reject</Button>
                  <Button onClick={() => act("finance_approve")}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                </div>
              </>
            )}
            {(po.status === "approved" || po.status === "Approved") && canApproveManager && (
              <div className="flex justify-end"><Button onClick={() => act("mark_ordered")}>Mark as Ordered</Button></div>
            )}
            {(po.status === "ordered" || po.status === "Ordered") && canApproveManager && (
              <div className="flex justify-end"><Button onClick={() => act("mark_received")}>Mark as Received</Button></div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------- Suppliers -------------------
function SuppliersDialog({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (v: boolean) => void; onChanged: () => void; }) {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", contact_name: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/suppliers?per_page=500");
    setList(data?.data ?? data ?? []);
  };
  useEffect(() => { if (open) load(); }, [open]);

  const add = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await api.post("/suppliers", { ...form, is_active: true });
      setForm({ name: "", contact_name: "", email: "", phone: "", address: "" });
      load(); onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, is_active: boolean) => {
    await api.patch(`/suppliers/${id}`, { is_active: !is_active });
    load(); onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Suppliers</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Contact name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Textarea placeholder="Address" className="col-span-2" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Button className="col-span-2" onClick={add} disabled={saving}>{saving ? "Saving…" : "Add supplier"}</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-sm">{s.contact_name || "—"}</TableCell>
                <TableCell className="text-xs">{s.email || "—"}</TableCell>
                <TableCell>
                  <Button size="sm" variant={s.is_active ? "outline" : "ghost"} onClick={() => toggle(s.id, s.is_active)}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No suppliers yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
