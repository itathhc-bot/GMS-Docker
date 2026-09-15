import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/api/client';
import {
  getPartsRequests,
  createPartsRequest,
  approve,
  reject,
  issue,
  deletePartsRequest
} from '@/api/partsRequests';
import { useEcho } from '@/hooks/useEcho';
import { useAuth } from "@/hooks/useAuth";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Plus, CheckCircle, XCircle, Truck, Clock,
  PenTool, Search, Filter, AlertTriangle, ClipboardList,
  ClipboardCheck, FileText, Box, MoreVertical, Trash2, Save, Edit3,
  Eye, RefreshCw, Download, MapPin,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { isValidSignatureDataUrl } from "@/lib/signatureValidation";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import PartsRequestHistoryDialog from "@/components/parts/PartsRequestHistoryDialog";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { buildPartsExportRows, DEFAULT_EXPORT_COLUMNS, type ExportColumns } from "@/lib/partsExport";
import { validateLocation } from "@/lib/locationValidation";
import { logAudit, subscribeAudit, clearAuditLog, type PartsAuditEntry } from "@/lib/partsAuditLog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { History as HistoryIcon, Settings2 } from "lucide-react";

// --- Types ---
interface PartLine {
  part_name: string;
  part_number: string;
  quantity: number;
  unit: string;
}

interface PartRequest {
  id: string;
  request_number: string;
  base_request_number: string; // PR-123 (without -1, -2 suffix)
  job_card_id: string | null;
  job_number: string;
  vehicle: string;
  vehicle_make: string;
  mechanic: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  urgency: string;
  status: string;
  reason: string | null;
  supervisor_remarks: string | null;
  created_at: string;
  rejection_note: string | null;
  issued_by: string | null;
  signature_data: string | null;
  bay_number?: string | null;
  collected_by_name?: string | null;
  in_stock?: number;
  unit_price?: number;
  location?: string | null;
}

interface GroupedRequest {
  base_request_number: string;
  job_number: string;
  vehicle: string;
  vehicle_make: string;
  mechanic: string;
  urgency: string;
  created_at: string;
  lines: PartRequest[];
  totalLines: number;
  issuedLines: number;
  status: string; // aggregated
}

const urgencyColor: Record<string, string> = {
  Normal: "bg-muted text-muted-foreground",
  Urgent: "bg-warning/15 text-warning border border-warning/30",
  Emergency: "bg-destructive/15 text-destructive border border-destructive/30",
};

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  Draft: { color: "bg-muted text-muted-foreground border", icon: Edit3 },
  Pending: { color: "bg-warning/15 text-warning", icon: Clock },
  Approved: { color: "bg-primary/15 text-primary", icon: CheckCircle },
  Rejected: { color: "bg-destructive/15 text-destructive", icon: XCircle },
  Issued: { color: "bg-success/15 text-success", icon: Truck },
  "Partially Issued": { color: "bg-warning/15 text-warning", icon: Box },
};

// --- Signature Pad (used inside IssuanceForm) ---
function SignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (data: string) => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setDrawing(true);
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
    onChange(canvasRef.current!.toDataURL());
  };
  const stopDraw = () => setDrawing(false);
  const clear = () => {
    canvasRef.current!.getContext("2d")!.clearRect(0, 0, 520, 140);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("partsExtra.collectorSignature")} *</p>
        <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px]" onClick={clear}>{t("common.clear", "Clear")}</Button>
      </div>
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/30">
        <canvas
          ref={canvasRef}
          width={520}
          height={140}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
      </div>
      {!value && <p className="text-[11px] text-muted-foreground">Sign above to confirm receipt of the parts.</p>}
    </div>
  );
}

// --- Issuance Form (Store handover form) ---
interface IssuanceFormProps {
  line: PartRequest;
  bayDefault: string;
  mechanicDefault: string;
  onSubmit: (payload: {
    signatureData: string;
    collectedByName: string;
    bayNumber: string;
    issuanceNotes: string;
  }) => void;
  onCancel: () => void;
}

function IssuanceForm({ line, bayDefault, mechanicDefault, onSubmit, onCancel }: IssuanceFormProps) {
  const { t } = useTranslation();
  const [collectedByName, setCollectedByName] = useState(mechanicDefault || "");
  const [bayNumber, setBayNumber] = useState(bayDefault || "");
  const [issuanceNotes, setIssuanceNotes] = useState("");
  const [signatureData, setSignatureData] = useState("");

  const canSubmit = collectedByName.trim() && signatureData;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{t("partsExtra.partDetails")}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">{t("partsExtra.partName")}</p><p className="font-medium">{line.part_name}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("partsExtra.skuPart")}</p><p className="font-mono text-primary">{line.part_number || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("partsExtra.quantity")}</p><p className="font-semibold">{line.quantity}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("partsExtra.requestNum")}</p><p className="font-mono">{line.request_number}</p></div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">{t("partsExtra.storeLocation")}</p>
            <p className="font-mono text-sm">
              {line.location || <span className="text-muted-foreground italic">{t("partsExtra.locationUnknown")}</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{t("partsExtra.jobDetails")}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">{t("partsExtra.jobCardNum")}</p><p className="font-mono text-primary">{line.job_number}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("partsExtra.vehicle")}</p><p className="font-medium">{line.vehicle_make} ({line.vehicle})</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block">
            {t("partsExtra.collector")} <span className="text-destructive">*</span>
          </label>
          <Input value={collectedByName} onChange={(e) => setCollectedByName(e.target.value)} placeholder={t("partsExtra.collectorPlaceholder")} maxLength={100} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block">{t("partsExtra.bayNumber")}</label>
          <Input value={bayNumber} onChange={(e) => setBayNumber(e.target.value)} placeholder={t("partsExtra.bayPlaceholder")} maxLength={20} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1.5 block">{t("partsExtra.issuanceNotes")}</label>
        <Textarea rows={2} value={issuanceNotes} onChange={(e) => setIssuanceNotes(e.target.value)} placeholder={t("partsExtra.issuanceNotesPlaceholder")} maxLength={500} />
      </div>

      <SignaturePad value={signatureData} onChange={setSignatureData} />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button
          disabled={!canSubmit}
          onClick={() => onSubmit({ signatureData, collectedByName: collectedByName.trim(), bayNumber: bayNumber.trim(), issuanceNotes: issuanceNotes.trim() })}
          className="gap-1.5"
        >
          <PenTool className="w-3.5 h-3.5" /> {t("partsExtra.confirmIssue")}
        </Button>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function PartsRequest() {
  const { t, i18n } = useTranslation();
  const { hasRole, user, profile, updatePartsExportColumns } = useAuth();
  const canApprove = hasRole("supervisor") || hasRole("admin");
  const canIssue = hasRole("store_clerk") || hasRole("admin");
  const canCreate = hasRole("mechanic") || hasRole("admin") || hasRole("supervisor");
  const [searchQuery, setSearchQuery] = useState("");
  const locationFilterStorageKey = useMemo(
    () => `partsRequest.locationFilter.${user?.id ?? "anon"}`,
    [user?.id]
  );
  const [locationFilter, setLocationFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "__all__";
    try {
      return window.localStorage.getItem(`partsRequest.locationFilter.${"anon"}`) || "__all__";
    } catch {
      return "__all__";
    }
  });
  const [exportColumns, setExportColumns] = useState<ExportColumns>(() => {
    if (typeof window === "undefined") return { ...DEFAULT_EXPORT_COLUMNS };
    try {
      const raw = window.localStorage.getItem("partsRequest.exportColumns");
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_EXPORT_COLUMNS, ...parsed };
      }
      const legacy = window.localStorage.getItem("partsRequest.exportIncludeLocation");
      if (legacy !== null) {
        return { ...DEFAULT_EXPORT_COLUMNS, location: legacy === "1" };
      }
    } catch {
    }
    return { ...DEFAULT_EXPORT_COLUMNS };
  });
  const [auditEntries, setAuditEntries] = useState<PartsAuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [serverPreview, setServerPreview] = useState<Array<Record<string, string | number>> | null>(null);
  const [serverPreviewLoading, setServerPreviewLoading] = useState(false);
  const [serverPreviewError, setServerPreviewError] = useState<string | null>(null);
  const [serverPreviewFromCache, setServerPreviewFromCache] = useState(false);
  const [serverPreviewRetryCount, setServerPreviewRetryCount] = useState(0);
  const [cacheStats, setCacheStats] = useState<{ hits: number; misses: number; total: number; hit_rate: number } | null>(null);
  const [cacheStatsLoading, setCacheStatsLoading] = useState(false);
  const [cacheStatsError, setCacheStatsError] = useState<null | { status?: number; kind: "network" | "http" | "invalid" | "timeout" }>(null);
  const [cacheStatsRetryCount, setCacheStatsRetryCount] = useState(0);

  const CACHE_STATS_TIMEOUT_MS = 5000;

  const refreshCacheStats = async () => {
    setCacheStats(null);
    setCacheStatsError({ kind: "invalid" });
  };

  const retryCacheStats = async () => { refreshCacheStats(); };

  const loadServerPreview = async (force = false) => {
    setServerPreviewLoading(true);
    try {
      const data = await getPartsRequests({ location: locationFilter, export: true });
      const rows = buildPartsExportRows(data, exportColumns).slice(0, 5);
      setServerPreview(rows);
      setServerPreviewError(null);
    } catch (error) {
      setServerPreviewError("Failed to load preview");
    } finally {
      setServerPreviewLoading(false);
    }
  };

  const retryServerPreview = async () => {
    setServerPreviewRetryCount((c) => c + 1);
    await loadServerPreview(true);
  };
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(locationFilterStorageKey);
      if (saved) setLocationFilter(saved);
    } catch {
    }
  }, [locationFilterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(locationFilterStorageKey, locationFilter);
    } catch {
    }
  }, [locationFilter, locationFilterStorageKey]);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "partsRequest.exportColumns",
        JSON.stringify(exportColumns)
      );
    } catch {
    }
    if (user) {
      void updatePartsExportColumns(exportColumns as unknown as Record<string, boolean>);
    }
  }, [exportColumns, user, updatePartsExportColumns]);

  const hydratedFromProfileRef = useRef(false);
  useEffect(() => {
    if (hydratedFromProfileRef.current) return;
    const cols = profile?.parts_export_columns;
    if (cols && typeof cols === "object") {
      hydratedFromProfileRef.current = true;
      setExportColumns((prev) => ({ ...prev, ...(cols as Partial<ExportColumns>) }));
    }
  }, [profile?.parts_export_columns]);
  
  useEffect(() => subscribeAudit(setAuditEntries), []);

  const handleLocationFilterChange = (next: string) => {
    if (next === locationFilter) return;
    setLocationFilter(next);
    const label =
      next === "__all__"
        ? t("parts.store.allLocations")
        : next === "__none__"
        ? t("parts.store.noLocation")
        : next;
    logAudit({
      userId: user?.id ?? null,
      action: "parts.store.audit.locationFilterChanged",
      details: { value: next, label },
    });
    toast.message(t("parts.store.audit.locationFilterChanged", { value: label }));
  };

  const handleExportColumnToggle = (col: keyof ExportColumns, value: boolean) => {
    setExportColumns((prev) => ({ ...prev, [col]: value }));
    const colLabel =
      col === "location"
        ? t("parts.store.columnLocation")
        : col === "status"
        ? t("parts.store.columnStatus")
        : t("parts.store.columnSku");
    logAudit({
      userId: user?.id ?? null,
      action: "parts.store.audit.exportToggleChanged",
      details: { column: col, value },
    });
    toast.message(
      t("parts.store.audit.exportToggleChanged", {
        column: colLabel,
        value: value ? "ON" : "OFF",
      })
    );
  };
  const [cancelEditOpen, setCancelEditOpen] = useState(false);
  const [deleteDraftBase, setDeleteDraftBase] = useState<string | null>(null);
  const [historyBase, setHistoryBase] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    jobCardId: "",
    mechanicId: "",
    urgency: "Normal",
    reason: "",
  });
  const [partLines, setPartLines] = useState<PartLine[]>([
    { part_name: "", part_number: "", quantity: 1, unit: "PCS" },
  ]);
  const [editingDraftIds, setEditingDraftIds] = useState<string[]>([]);
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("my_requests");
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [supervisorRemarks, setSupervisorRemarks] = useState("");
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [issueDialog, setIssueDialog] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getPartsRequests({});
      const reqsArray = Array.isArray(data) ? data : (data?.data ?? []);
      setRequests(reqsArray.map((r: any) => {
        return {
          id: r.id,
          request_number: r.request_number,
          base_request_number: r.request_number.split('-').slice(0, 2).join('-'),
          job_card_id: r.job_card_id,
          job_number: (r.job_card as any)?.job_number || r.job_number || "—",
          vehicle: (r.job_card as any)?.vehicle?.plate_number || r.vehicle_plate || r.vehicle || "—",
          vehicle_make: (r.job_card as any)?.vehicle?.make || r.vehicle_make || "—",
          mechanic: (r.requested_by_user as any)?.profile?.full_name || (r.requested_by_user as any)?.name || r.mechanic || "—",
          part_name: r.part_name,
          part_number: r.part_number,
          quantity: r.quantity,
          urgency: r.urgency,
          status: r.status,
          reason: r.reason,
          supervisor_remarks: r.supervisor_remarks ?? null,
          created_at: r.created_at,
          rejection_note: r.rejection_note,
          issued_by: r.issued_by,
          signature_data: r.signature_data,
          bay_number: r.bay_number ?? (r.job_card as any)?.bay_number ?? null,
          collected_by_name: r.collected_by_name ?? null,
          in_stock: 0,
          unit_price: 0,
          location: null,
        };
      }));
    } catch (e) {
      console.error("Failed to fetch parts requests", e);
    }
    setLoading(false);
  };

  const fetchJobCards = async () => {
    try {
      const res = await api.get('/job-cards?per_page=100&status_not_in=Completed,Closed');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setJobCards(list);
    } catch (e) {
      console.error("Failed to fetch job cards", e);
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await api.get('/users?role=mechanic&per_page=100');
      let list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      if (!list || list.length === 0) {
        const allUsersRes = await api.get('/users?per_page=100&is_active=true');
        list = Array.isArray(allUsersRes.data) ? allUsersRes.data : (allUsersRes.data?.data ?? []);
      }
      setMechanics((list || []).map((m: any) => ({
        ...m,
        user_id: m.id,
        id: m.id,
        full_name: m.profile?.full_name || m.name || m.email,
        name: m.profile?.full_name || m.name || m.email,
      })));
    } catch (e) {
      console.error("Failed to fetch mechanics", e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory?per_page=500');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setInventoryItems(list);
    } catch (e) {
      console.error("Failed to fetch inventory for suggestions", e);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchJobCards();
    fetchMechanics();
    fetchInventory();
  }, []);

  const myRecent = useMemo(
    () => requests.filter((r) => r.status !== "Rejected" || true).slice(0, 6),
    [requests]
  );

  const myDrafts = useMemo(
    () => requests.filter((r) => r.status === "Draft"),
    [requests]
  );

  const pendingApprovals = useMemo(
    () => requests.filter((r) => r.status === "Pending"),
    [requests]
  );

  const approvedReady = useMemo(
    () => requests.filter((r) => r.status === "Approved" || r.status === "Partially Issued"),
    [requests]
  );

  // Group lines by base_request_number
  const groupRequests = (rows: PartRequest[]): GroupedRequest[] => {
    const map = new Map<string, GroupedRequest>();
    rows.forEach((r) => {
      const key = r.base_request_number;
      const existing = map.get(key);
      if (existing) {
        existing.lines.push(r);
        existing.totalLines += 1;
        if (r.status === "Issued") existing.issuedLines += 1;
      } else {
        map.set(key, {
          base_request_number: key,
          job_number: r.job_number,
          vehicle: r.vehicle,
          vehicle_make: r.vehicle_make,
          mechanic: r.mechanic,
          urgency: r.urgency,
          created_at: r.created_at,
          lines: [r],
          totalLines: 1,
          issuedLines: r.status === "Issued" ? 1 : 0,
          status: r.status,
        });
      }
    });
    // Compute aggregated status per group
    return Array.from(map.values()).map((g) => {
      if (g.issuedLines === g.totalLines) g.status = "Issued";
      else if (g.issuedLines > 0) g.status = "Partially Issued";
      else g.status = g.lines[0].status;
      return g;
    });
  };

  const groupedApproved = useMemo(() => groupRequests(approvedReady), [approvedReady]);
  const groupedHistory = useMemo(() => groupRequests(requests), [requests]);

  // Available locations across the approved set, used by the location filter dropdown.
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    groupedApproved.forEach((g) =>
      g.lines.forEach((l) => {
        if (l.location && l.location.trim()) set.add(l.location.trim());
      })
    );
    return Array.from(set).sort();
  }, [groupedApproved]);

  const filteredApprovedGroups = useMemo(() => {
    let groups = groupedApproved;
    if (locationFilter && locationFilter !== "__all__") {
      groups = groups
        .map((g) => {
          const matchedLines =
            locationFilter === "__none__"
              ? g.lines.filter((l) => !l.location || !l.location.trim())
              : g.lines.filter((l) => (l.location || "").trim() === locationFilter);
          return matchedLines.length > 0 ? { ...g, lines: matchedLines } : null;
        })
        .filter(Boolean) as GroupedRequest[];
    }
    if (!searchQuery) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter((g) =>
      [
        g.base_request_number,
        g.job_number,
        g.vehicle,
        ...g.lines.map((l) => l.part_name),
        ...g.lines.map((l) => l.location || ""),
      ].some((f) => f.toLowerCase().includes(q))
    );
  }, [groupedApproved, searchQuery, locationFilter]);

  // Stats for Store Issuance tab
  const storeStats = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const issuedThisWeek = requests.filter(
      (r) => r.status === "Issued" && new Date(r.created_at).getTime() >= oneWeekAgo
    );
    const valueIssued = issuedThisWeek.reduce((sum, r) => sum + (r.unit_price || 0) * r.quantity, 0);
    const backOrdered = requests.filter(
      (r) => (r.status === "Approved" || r.status === "Partially Issued") && (r.in_stock ?? 0) < r.quantity
    ).length;
    return {
      readyToIssue: groupedApproved.length,
      issuedThisWeek: issuedThisWeek.length,
      backOrdered,
      valueIssued,
    };
  }, [requests, groupedApproved]);

  // --- Export helpers (columns are user-selectable) ---
  const buildExportRows = () =>
    buildPartsExportRows(filteredApprovedGroups as any, t as any, {
      columns: exportColumns,
    });

  const handleExportXlsx = () => {
    const rows = buildExportRows();
    if (rows.length === 0) {
      toast.error(t("parts.store.exportEmpty"));
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-fit column widths from content so nothing truncates.
    const headers = Object.keys(rows[0]);
    (ws as any)["!cols"] = headers.map((h) => {
      const max = Math.max(
        h.length,
        ...rows.map((r) => String(r[h] ?? "").length)
      );
      return { wch: Math.min(Math.max(max + 2, 10), 48) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parts");
    XLSX.writeFile(wb, `parts-requests-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t("parts.store.exportXlsx"));
  };

  const handleExportPdf = () => {
    const rows = buildExportRows();
    if (rows.length === 0) {
      toast.error(t("parts.store.exportEmpty"));
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(t("parts.store.exportTitle"), 14, 14);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleString(), 14, 20);

    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => String(r[h] ?? "")));
    autoTable(doc, {
      head: [headers],
      body,
      startY: 24,
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 10, right: 10 },
      tableWidth: "auto",
      didParseCell: (data) => {
        // Right-align quantity column for consistency.
        if (data.column.raw === t("partsExtra.quantity")) {
          data.cell.styles.halign = "right";
        }
        if (data.column.raw === t("parts.store.tableHead.status")) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    doc.save(`parts-requests-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(t("parts.store.exportPdf"));
  };

  // Selected request for approval panel
  const selectedReq = useMemo(
    () => pendingApprovals.find((r) => r.id === selectedApproval) || pendingApprovals[0] || null,
    [pendingApprovals, selectedApproval]
  );

  // --- Handlers ---
  const addPartLine = () =>
    setPartLines([...partLines, { part_name: "", part_number: "", quantity: 1, unit: "PCS" }]);

  const removePartLine = (idx: number) =>
    setPartLines(partLines.filter((_, i) => i !== idx));

  const updatePartLine = (idx: number, field: keyof PartLine, value: string | number) => {
    const next = [...partLines];
    (next[idx] as any)[field] = value;

    if (field === "part_name" && typeof value === "string") {
      const match = inventoryItems.find(
        (it) => it.part_name?.toLowerCase() === value.toLowerCase().trim()
      );
      if (match && match.sku && !next[idx].part_number) {
        next[idx].part_number = match.sku;
      }
    } else if (field === "part_number" && typeof value === "string") {
      const match = inventoryItems.find(
        (it) => it.sku?.toLowerCase() === value.toLowerCase().trim()
      );
      if (match && match.part_name && !next[idx].part_name) {
        next[idx].part_name = match.part_name;
      }
    }

    setPartLines(next);
  };

  const buildLines = (status: "Draft" | "Pending") => {
    const validLines = partLines.filter((l) => l.part_name.trim());
    const baseNum = Date.now().toString().slice(-6);
    return validLines.map((line, idx) => ({
      request_number: validLines.length > 1 ? `PR-${baseNum}-${idx + 1}` : `PR-${baseNum}`,
      job_card_id: createForm.jobCardId || null,
      part_name: line.part_name,
      part_number: line.part_number || null,
      quantity: Number(line.quantity) || 1,
      urgency: createForm.urgency,
      reason: createForm.reason || null,
      requested_by: user!.id,
      status,
    }));
  };

  const resetCreateForm = () => {
    setCreateForm({ jobCardId: "", mechanicId: "", urgency: "Normal", reason: "" });
    setPartLines([{ part_name: "", part_number: "", quantity: 1, unit: "PCS" }]);
    setEditingDraftIds([]);
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    const validLines = partLines.filter((l) => l.part_name.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one part to save a draft.");
      return;
    }
    if (editingDraftIds.length > 0) {
      await Promise.all(editingDraftIds.map(id => deletePartsRequest(id)));
    }
    const inserts = buildLines("Draft");
    try {
      await Promise.all(inserts.map(insert => createPartsRequest(insert)));
    } catch (e) {
      toast.error("Failed to save draft"); return;
    }
    toast.success(`Draft saved (${inserts.length} line${inserts.length > 1 ? "s" : ""}).`);
    resetCreateForm();
    fetchRequests();
  };

  const handleSubmitRequest = async () => {
    if (!createForm.jobCardId) {
      toast.error("Please select a job card.");
      return;
    }
    if (!user) return;
    const validLines = partLines.filter((l) => l.part_name.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one part.");
      return;
    }

    // Promoting an existing draft: delete drafts and insert as Pending with same data
    if (editingDraftIds.length > 0) {
      await Promise.all(editingDraftIds.map(id => deletePartsRequest(id)));
    }

    const inserts = buildLines("Pending");
    try {
      await Promise.all(inserts.map(insert => createPartsRequest(insert)));
    } catch (error) {
      toast.error("Failed to submit request");
      return;
    }
    toast.success(`${inserts.length} part request(s) submitted for approval.`);
    resetCreateForm();
    fetchRequests();
  };

  const resumeDraft = (baseRequestNumber: string) => {
    const draftLines = requests.filter(
      (r) => r.status === "Draft" && r.base_request_number === baseRequestNumber
    );
    if (draftLines.length === 0) return;
    const first = draftLines[0];
    setCreateForm({
      jobCardId: first.job_card_id || "",
      mechanicId: "",
      urgency: first.urgency,
      reason: first.reason || "",
    });
    setPartLines(
      draftLines.map((l) => ({
        part_name: l.part_name,
        part_number: l.part_number || "",
        quantity: l.quantity,
        unit: "PCS",
      }))
    );
    setEditingDraftIds(draftLines.map((l) => l.id));
    setActiveTab("create");
    toast.info(`Resumed draft ${baseRequestNumber}`);
  };

  const handleApprove = async (id: string) => {
    await approve(id, {
        supervisor_remarks: supervisorRemarks.trim() || null,
    });
    toast.success("Request approved — forwarded to store.");
    setSupervisorRemarks("");
    setSelectedApproval(null);
    fetchRequests();
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    await reject(rejectDialog, rejectNote || "Rejected by supervisor");
    toast.error("Request rejected.");
    setRejectDialog(null);
    setRejectNote("");
    fetchRequests();
  };

  const handleIssue = async (payload: {
    signatureData: string;
    collectedByName: string;
    bayNumber: string;
    issuanceNotes: string;
  }) => {
    if (!issueDialog) return;
    await issue(issueDialog, {
      signature_data: payload.signatureData,
      collected_by_name: payload.collectedByName,
      bay_number: payload.bayNumber || null,
      issuance_notes: payload.issuanceNotes || null
    });
    toast.success("Part issued — handover form signed and saved.");
    setIssueDialog(null);
    fetchRequests();
  };

  // Build printable Issue Slip HTML for all issued lines in a group
  const buildIssueSlipHTML = (baseNumber: string) => {
    const lines = requests.filter(
      (r) => r.base_request_number === baseNumber && r.status === "Issued"
    );
    if (lines.length === 0) return null;
    const first = lines[0];
    const sig = first.signature_data;
    const rows = lines
      .map(
        (l) => `
        <tr>
          <td>${l.part_name}</td>
          <td style="font-family:monospace">${l.part_number || "—"}</td>
          <td style="text-align:center">${l.quantity}</td>
          <td>${l.location || "—"}</td>
        </tr>`
      )
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Issue Slip ${baseNumber}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111}
        h1{margin:0 0 4px 0;font-size:20px}
        .muted{color:#666;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f5f5f5}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;font-size:13px}
        .box{border:1px solid #ddd;padding:10px;border-radius:6px}
        .sig{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
        .sig .line{border-top:1px solid #333;margin-top:70px;padding-top:6px;font-size:12px;color:#333}
        .sig img{max-height:80px;max-width:260px}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1>Parts Issue Slip</h1>
          <div class="muted">Al Bataeh Municipality Garage</div>
        </div>
        <div style="text-align:right">
          <div><strong>${baseNumber}</strong></div>
          <div class="muted">${new Date().toLocaleString()}</div>
        </div>
      </div>
      <div class="grid">
        <div class="box"><div class="muted">Job Card</div><div><strong>${first.job_number}</strong></div></div>
        <div class="box"><div class="muted">Vehicle</div><div><strong>${first.vehicle_make} (${first.vehicle})</strong></div></div>
        <div class="box"><div class="muted">Mechanic</div><div>${first.mechanic || "—"}</div></div>
        <div class="box"><div class="muted">Collected By</div><div>${first.collected_by_name || "—"}${first.bay_number ? ` · Bay ${first.bay_number}` : ""}</div></div>
      </div>
      <table>
        <thead><tr><th>Part</th><th>SKU</th><th style="text-align:center">Qty</th><th>Location</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="sig">
        <div>
          ${sig ? `<img src="${sig}" alt="signature"/>` : ""}
          <div class="line">Collector / Mechanic Signature</div>
        </div>
        <div>
          <div class="line">Store Keeper Signature</div>
        </div>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),150)}</script>
      </body></html>`;
  };

  const printIssueSlip = (baseNumber: string) => {
    const lines = requests.filter(
      (r) => r.base_request_number === baseNumber && r.status === "Issued"
    );
    if (lines.length === 0) { toast.error(t("parts.issueSlip.noneIssued", "No issued items to print")); return; }
    if (!isValidSignatureDataUrl(lines[0].signature_data)) {
      toast.error(t("parts.issueSlip.signatureRequired", "A collector / mechanic signature is required before printing this slip."));
      return;
    }
    const html = buildIssueSlipHTML(baseNumber);
    if (!html) { toast.error(t("parts.issueSlip.noneIssued", "No issued items to print")); return; }
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { toast.error(t("parts.issueSlip.popupBlocked", "Pop-up blocked. Allow pop-ups to print.")); return; }
    w.document.write(html);
    w.document.close();
  };

  const exportIssueSlipPDF = (baseNumber: string) => {
    const lines = requests.filter(
      (r) => r.base_request_number === baseNumber && r.status === "Issued"
    );
    if (lines.length === 0) { toast.error(t("parts.issueSlip.noneIssued", "No issued items to print")); return; }
    if (!isValidSignatureDataUrl(lines[0].signature_data)) {
      toast.error(t("parts.issueSlip.signatureRequired", "A collector / mechanic signature is required before exporting this slip."));
      return;
    }
    const first = lines[0];
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Parts Issue Slip", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Al Bataeh Municipality Garage", 14, 24);
    doc.setTextColor(0);
    doc.text(`Ref: ${baseNumber}`, 150, 18);
    doc.text(new Date().toLocaleString(), 150, 24);
    doc.setFontSize(11);
    doc.text(`Job Card: ${first.job_number}`, 14, 36);
    doc.text(`Vehicle: ${first.vehicle_make} (${first.vehicle})`, 14, 42);
    doc.text(`Mechanic: ${first.mechanic || "—"}`, 14, 48);
    doc.text(
      `Collected By: ${first.collected_by_name || "—"}${first.bay_number ? ` · Bay ${first.bay_number}` : ""}`,
      14, 54
    );
    autoTable(doc, {
      startY: 62,
      head: [["Part", "SKU", "Qty", "Location"]],
      body: lines.map((l) => [l.part_name, l.part_number || "—", String(l.quantity), l.location || "—"]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    if (first.signature_data) {
      try { doc.addImage(first.signature_data, "PNG", 14, finalY + 12, 60, 24); } catch { /* ignore */ }
    }
    doc.setDrawColor(50);
    doc.line(14, finalY + 42, 84, finalY + 42);
    doc.line(120, finalY + 42, 190, finalY + 42);
    doc.setFontSize(9);
    doc.text("Collector / Mechanic Signature", 14, finalY + 47);
    doc.text("Store Keeper Signature", 120, finalY + 47);
    doc.save(`issue-slip-${baseNumber}.pdf`);
  };

  const handleDeleteDraft = async () => {
    if (!deleteDraftBase) return;
    const ids = requests
      .filter((r) => r.status === "Draft" && r.base_request_number === deleteDraftBase)
      .map((r) => r.id);
    if (ids.length === 0) { setDeleteDraftBase(null); return; }
    await Promise.all(ids.map(id => deletePartsRequest(id)));
    toast.success(`Draft ${deleteDraftBase} deleted.`);
    setDeleteDraftBase(null);
    // If currently editing this draft, clear the form
    if (editingDraftIds.some((id) => ids.includes(id))) {
      resetCreateForm();
    }
    fetchRequests();
  };

  const hasUnsavedFormData = () => {
    if (createForm.jobCardId || createForm.reason.trim()) return true;
    return partLines.some((l) => l.part_name.trim() || l.part_number.trim() || l.quantity !== 1);
  };

  const requestCancelEdit = () => {
    if (hasUnsavedFormData()) {
      setCancelEditOpen(true);
    } else {
      resetCreateForm();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("parts.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("parts.subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="create" className="gap-2">
            <FileText className="w-4 h-4" /> {t("parts.tabs.create")}
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-2">
            <ClipboardCheck className="w-4 h-4" /> {t("parts.tabs.approval")}
            {pendingApprovals.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {pendingApprovals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2">
            <Truck className="w-4 h-4" /> {t("parts.tabs.store")}
            {storeStats.readyToIssue > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-success text-success-foreground text-[10px] font-bold">
                {storeStats.readyToIssue}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== CREATE REQUEST TAB ===== */}
        <TabsContent value="create" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Link to Job Card */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("parts.linkJob")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("parts.jobCard")}</label>
                    <Select value={createForm.jobCardId} onValueChange={(v) => {
                      const jc = jobCards.find(c => c.id === v);
                      const mechId = jc?.assigned_to || jc?.assigned_mechanic_id;
                      setCreateForm(prev => ({ 
                        ...prev, 
                        jobCardId: v, 
                        mechanicId: mechId || prev.mechanicId 
                      }));
                    }}>
                      <SelectTrigger><SelectValue placeholder={t("parts.selectJobCard")} /></SelectTrigger>
                      <SelectContent>
                        {jobCards.map((jc) => (
                          <SelectItem key={jc.id} value={jc.id}>
                            {jc.job_number} — {jc.vehicle_plate || jc.vehicle?.plate_number || 'Vehicle'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("parts.requestingMechanic")}</label>
                    <Select value={createForm.mechanicId} onValueChange={(v) => setCreateForm({ ...createForm, mechanicId: v })}>
                      <SelectTrigger><SelectValue placeholder={t("parts.selectMechanic")} /></SelectTrigger>
                      <SelectContent>
                        {mechanics.map((m) => (
                          <SelectItem key={m.user_id || m.id} value={m.user_id || m.id}>
                            {m.full_name || m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="text-xs text-muted-foreground mb-1.5 block">{t("parts.priority")}</label>
                  <Select value={createForm.urgency} onValueChange={(v) => setCreateForm({ ...createForm, urgency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">{t("partsExtra.urgency.Normal", "Normal")}</SelectItem>
                      <SelectItem value="Urgent">{t("partsExtra.urgency.Urgent", "Urgent")}</SelectItem>
                      <SelectItem value="Emergency">{t("partsExtra.urgency.Emergency", "Emergency")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Requested Parts */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("parts.requestedParts")}</h3>
                  <Button size="sm" variant="outline" onClick={addPartLine} className="gap-1.5 h-8">
                    <Plus className="w-3.5 h-3.5" /> {t("parts.addLine")}
                  </Button>
                </div>

                {/* Inventory Autocomplete Datalists */}
                <datalist id="inventory-part-names">
                  {inventoryItems.map((it) => (
                    <option key={it.id} value={it.part_name}>
                      {it.sku ? `${it.sku} (Stock: ${it.stock_quantity ?? 0})` : `Stock: ${it.stock_quantity ?? 0}`}
                    </option>
                  ))}
                </datalist>
                <datalist id="inventory-skus">
                  {inventoryItems.map((it) => (
                    <option key={it.id} value={it.sku || it.part_name}>
                      {it.part_name} (Stock: ${it.stock_quantity ?? 0})
                    </option>
                  ))}
                </datalist>

                <div className="space-y-3">
                  {partLines.map((line, idx) => (
                    <div key={idx} className="rounded-lg border bg-muted/30 p-3">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1 block">{t("parts.partName")}</label>
                          <Input
                            list="inventory-part-names"
                            value={line.part_name}
                            onChange={(e) => updatePartLine(idx, "part_name", e.target.value)}
                            placeholder={t("parts.partNamePlaceholder")}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1 block">{t("parts.sku")}</label>
                          <Input
                            list="inventory-skus"
                            value={line.part_number}
                            onChange={(e) => updatePartLine(idx, "part_number", e.target.value)}
                            placeholder={t("parts.skuPlaceholder")}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1 block">{t("parts.qty")}</label>
                          <Input type="number" min="1" value={line.quantity} onChange={(e) => updatePartLine(idx, "quantity", parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1 block">{t("parts.unit")}</label>
                          <Select value={line.unit} onValueChange={(v) => updatePartLine(idx, "unit", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PCS">PCS</SelectItem>
                              <SelectItem value="SET">SET</SelectItem>
                              <SelectItem value="LTR">LTR</SelectItem>
                              <SelectItem value="KG">KG</SelectItem>
                              <SelectItem value="BOX">BOX</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-12 md:col-span-1 flex justify-end">
                          {partLines.length > 1 && (
                            <Button size="icon" variant="ghost" onClick={() => removePartLine(idx)} className="h-9 w-9 text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl border bg-card p-6 space-y-3">
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Notes / Justification</h3>
                <Textarea
                  rows={4}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="Why are these parts needed? Any urgency details..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                {editingDraftIds.length > 0 && (
                  <Button variant="ghost" onClick={requestCancelEdit} className="text-muted-foreground">
                    Cancel Edit
                  </Button>
                )}
                <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
                  <Save className="w-4 h-4" /> {editingDraftIds.length > 0 ? "Update Draft" : "Save as Draft"}
                </Button>
                <Button onClick={handleSubmitRequest} disabled={!canCreate} className="gap-2">
                  <FileText className="w-4 h-4" /> Submit for Approval
                </Button>
              </div>
              {editingDraftIds.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  Editing draft — submitting will replace the draft with a pending request.
                </p>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* My Recent Requests */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("parts.myRecent")}</h3>
                <div className="space-y-2">
                  {loading && <Skeleton className="h-20" />}
                  {!loading && groupRequests(myRecent).length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">{t("parts.noRequests")}</p>
                  )}
                  {groupRequests(myRecent).slice(0, 5).map((g) => {
                    const cfg = statusConfig[g.status] || statusConfig.Pending;
                    const Icon = cfg.icon;
                    const isDraft = g.status === "Draft";
                    return (
                      <div key={g.base_request_number} className="rounded-lg border p-3 flex items-start justify-between gap-2 hover:bg-muted/40 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-semibold text-sm">{g.base_request_number}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {g.vehicle_make} • {t("parts.items", { count: g.totalLines })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge className={`text-[10px] gap-1 ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {t(`partsExtra.status.${g.status}`, g.status)}
                          </Badge>
                          {isDraft && (
                            <div className="flex items-center gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteDraftBase(g.base_request_number)}
                                title={t("partsExtra.deleteDraft", "Delete draft")}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-primary"
                                onClick={() => resumeDraft(g.base_request_number)}
                              >
                                {t("parts.resume")}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Request Flow */}
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("parts.flow")}</h3>
                <div className="space-y-3">
                  {[
                    { num: 1, label: t("parts.flowSteps.create"), active: true },
                    { num: 2, label: t("parts.flowSteps.approve"), active: false },
                    { num: 3, label: t("parts.flowSteps.issue"), active: false },
                  ].map((step) => (
                    <div key={step.num} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"
                      }`}>
                        {step.num}
                      </div>
                      <p className={`text-sm ${step.active ? "font-medium" : "text-muted-foreground"}`}>{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== APPROVAL TAB ===== */}
        <TabsContent value="approval">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Queue */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-wider uppercase">{t("parts.approval.queue")}</h3>
                  <Badge variant="secondary" className="text-xs">{pendingApprovals.length}</Badge>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>

              <div className="space-y-2">
                {loading && <Skeleton className="h-20" />}
                {!loading && pendingApprovals.length === 0 && (
                  <p className="text-xs text-muted-foreground py-8 text-center">{t("parts.approval.noPending")}</p>
                )}
                {pendingApprovals.map((r) => {
                  const isSelected = selectedReq?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedApproval(r.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-mono font-semibold text-sm">{r.request_number}</p>
                        <Badge className={`text-[10px] ${urgencyColor[r.urgency]}`}>{r.urgency}</Badge>
                      </div>
                      <p className="text-xs font-medium">{r.vehicle_make} ({r.vehicle})</p>
                      <p className="text-xs text-muted-foreground">{r.mechanic} • 1 part</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail */}
            <div className="lg:col-span-2">
              {selectedReq ? (
                <div className="rounded-xl border bg-card p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedReq.request_number}</h2>
                      <p className="text-sm text-muted-foreground">
                        {t("parts.jobCard")}: <span className="text-primary font-mono">{selectedReq.job_number}</span> • {new Date(selectedReq.created_at).toLocaleDateString("en-CA")}
                      </p>
                    </div>
                    <Badge className={`${urgencyColor[selectedReq.urgency]}`}>{t(`partsExtra.urgency.${selectedReq.urgency}`, selectedReq.urgency)}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1">{t("parts.approval.mechanic")}</p>
                      <p className="text-sm font-medium">{selectedReq.mechanic}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1">{t("parts.approval.vehicle")}</p>
                      <p className="text-sm font-medium">{selectedReq.vehicle_make} ({selectedReq.vehicle})</p>
                    </div>
                  </div>

                  {/* Parts table */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2.5">{t("parts.approval.tableHead.part")}</th>
                          <th className="text-left px-3 py-2.5">{t("parts.approval.tableHead.sku")}</th>
                          <th className="text-left px-3 py-2.5">{t("parts.approval.tableHead.qty")}</th>
                          <th className="text-left px-3 py-2.5">{t("parts.approval.tableHead.inStock")}</th>
                          <th className="text-left px-3 py-2.5">{t("parts.approval.tableHead.location")}</th>
                          <th className="text-left px-3 py-2.5">{t("parts.approval.tableHead.status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-3 font-medium">{selectedReq.part_name}</td>
                          <td className="px-3 py-3 font-mono text-primary">{selectedReq.part_number || "—"}</td>
                          <td className="px-3 py-3">{selectedReq.quantity}</td>
                          <td className="px-3 py-3">{selectedReq.in_stock ?? 0}</td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {selectedReq.location || <span className="text-muted-foreground italic">{t("partsExtra.locationUnknown")}</span>}
                          </td>
                          <td className="px-3 py-3">
                            {(selectedReq.in_stock ?? 0) >= selectedReq.quantity ? (
                              <Badge className="bg-success/15 text-success text-[10px]">{t("parts.approval.available")}</Badge>
                            ) : (
                              <Badge className="bg-destructive/15 text-destructive text-[10px]">{t("parts.approval.lowStock")}</Badge>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {selectedReq.reason && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1">{t("parts.approval.mechanicNotes")}</p>
                      <p className="text-sm">{selectedReq.reason}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">{t("parts.approval.supervisorRemarks")}</label>
                    <Textarea
                      rows={3}
                      value={supervisorRemarks}
                      onChange={(e) => setSupervisorRemarks(e.target.value)}
                      placeholder={t("parts.approval.remarksPlaceholder")}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setRejectDialog(selectedReq.id)}
                      disabled={!canApprove}
                    >
                      <XCircle className="w-4 h-4" /> {t("parts.approval.rejectBtn")}
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => handleApprove(selectedReq.id)}
                      disabled={!canApprove}
                    >
                      <CheckCircle className="w-4 h-4" /> {t("parts.approval.approveBtn")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{t("parts.approval.noSelected")}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== STORE ISSUANCE TAB ===== */}
        <TabsContent value="store" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t("parts.store.ready"), value: storeStats.readyToIssue, icon: ClipboardList, tone: "bg-primary/10 text-primary" },
              { label: t("parts.store.issuedWeek"), value: storeStats.issuedThisWeek, icon: CheckCircle, tone: "bg-success/10 text-success" },
              { label: t("parts.store.backOrdered"), value: storeStats.backOrdered, icon: AlertTriangle, tone: "bg-warning/10 text-warning" },
              { label: t("parts.store.valueWeek"), value: formatCurrency(storeStats.valueIssued, { compact: true }), icon: Box, tone: "bg-muted text-foreground" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${s.tone}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + Filter + Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("parts.store.searchPlaceholder")}
                className="pl-9 h-10 bg-muted/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={locationFilter} onValueChange={handleLocationFilterChange}>
              <SelectTrigger className="h-10 w-[200px] gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder={t("parts.store.filterLocation")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("parts.store.allLocations")}</SelectItem>
                <SelectItem value="__none__">{t("parts.store.noLocation")}</SelectItem>
                {availableLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export columns popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2">
                  <Settings2 className="w-4 h-4" />
                  {t("parts.store.exportColumns")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <p className="text-xs font-semibold mb-1">{t("parts.store.exportColumns")}</p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {t("parts.store.exportColumnsDesc")}
                </p>
                <div className="space-y-2">
                  {(["location", "status", "sku"] as const).map((col) => {
                    const labelKey =
                      col === "location"
                        ? "parts.store.columnLocation"
                        : col === "status"
                        ? "parts.store.columnStatus"
                        : "parts.store.columnSku";
                    return (
                      <label key={col} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={exportColumns[col]}
                          onCheckedChange={(v) =>
                            handleExportColumnToggle(col, v === true)
                          }
                        />
                        <span>{t(labelKey)}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Audit log popover */}
            <Popover open={auditOpen} onOpenChange={setAuditOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={t("parts.store.auditTrail")}>
                  <HistoryIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-80 overflow-y-auto" align="end">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold">{t("parts.store.auditTrail")}</p>
                  {auditEntries.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => clearAuditLog()}
                    >
                      {t("parts.store.auditClear")}
                    </Button>
                  )}
                </div>
                {auditEntries.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{t("parts.store.auditEmpty")}</p>
                ) : (
                  <ul className="space-y-2">
                    {auditEntries.slice(0, 25).map((e) => {
                      const text =
                        e.action === "parts.store.audit.locationFilterChanged"
                          ? t("parts.store.audit.locationFilterChanged", {
                              value: (e.details.label as string) || (e.details.value as string),
                            })
                          : e.action === "parts.store.audit.historyLocationFilterChanged"
                          ? t("parts.store.audit.historyLocationFilterChanged", {
                              value: (e.details.label as string) || (e.details.value as string),
                            })
                          : e.action === "parts.store.audit.exportToggleChanged"
                          ? t("parts.store.audit.exportToggleChanged", {
                              column: e.details.column,
                              value: e.details.value ? "ON" : "OFF",
                            })
                          : e.action;
                      return (
                        <li key={e.id} className="text-[11px] border-b pb-1.5 last:border-0">
                          <p className="text-foreground/80">{text}</p>
                          <p className="text-muted-foreground">
                            {new Date(e.at).toLocaleString()}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </PopoverContent>
            </Popover>

            {/* Export preview popover (local + server-side preview) */}
            <Popover
              onOpenChange={(open) => {
                if (open) { void loadServerPreview(); void refreshCacheStats(); }
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2" aria-label={t("parts.store.exportPreview")}>
                  <Eye className="w-4 h-4" />
                  {t("parts.store.exportPreview")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] max-h-[460px] overflow-auto" align="end">
                <p className="text-xs font-semibold mb-1">{t("parts.store.exportPreviewTitle")}</p>
                {(() => {
                  const allRows = buildExportRows();
                  const noColumns =
                    !exportColumns.location && !exportColumns.status && !exportColumns.sku;
                  if (noColumns) {
                    return (
                      <p className="text-[11px] text-destructive">
                        {t("parts.store.exportPreviewSelectCols")}
                      </p>
                    );
                  }
                  if (allRows.length === 0 && !serverPreview) {
                    return (
                      <p className="text-[11px] text-muted-foreground">
                        {t("parts.store.exportPreviewEmpty")}
                      </p>
                    );
                  }
                  const sample = allRows.slice(0, 5);
                  const headers = sample.length ? Object.keys(sample[0]) : [];
                  return (
                    <>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        {t("parts.store.exportPreviewDesc", { count: sample.length })}
                      </p>
                      {sample.length > 0 && (
                        <div className="rounded border overflow-x-auto" data-testid="export-preview-table">
                          <table className="w-full text-[11px]">
                            <thead className="bg-muted/40">
                              <tr>
                                {headers.map((h) => (
                                  <th key={h} className="text-start px-2 py-1.5 font-semibold whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {sample.map((row, i) => (
                                <tr key={i}>
                                  {headers.map((h) => (
                                    <td key={h} className="px-2 py-1 whitespace-nowrap">
                                      {String(row[h] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Server-side preview */}
                      <div className="mt-3 pt-2 border-t">
                        <p className="text-[11px] font-semibold mb-1 flex items-center gap-2">
                          {t("parts.store.exportPreviewServer")}
                          {serverPreviewFromCache && !serverPreviewLoading && !serverPreviewError && (
                            <span
                              className="text-[10px] font-normal text-muted-foreground"
                              data-testid="server-preview-cache-badge"
                              aria-label={t("settings.cache.cachedBadgeAria")}
                              role="status"
                            >
                              {t("parts.store.exportPreviewCached")}
                            </span>
                          )}
                        </p>
                        <div
                          aria-live="polite"
                          aria-atomic="true"
                          data-testid="server-preview-cache-health-region"
                        >
                          {cacheStatsLoading ? (
                            <div
                              className="mb-1"
                              data-testid="server-preview-cache-health-loading"
                              role="status"
                            >
                              <Skeleton className="h-3 w-48" />
                              <span className="sr-only">{t("settings.cache.healthLoading")}</span>
                            </div>
                          ) : cacheStatsError ? (
                            <div
                              className="mb-1 flex flex-col gap-1"
                              data-testid="server-preview-cache-health-error"
                              role="alert"
                            >
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-destructive">
                                  {cacheStatsError.kind === "invalid"
                                    ? t("settings.cache.healthInvalid")
                                    : cacheStatsError.kind === "timeout"
                                      ? t("settings.cache.healthErrorTimeout")
                                      : cacheStatsError.status === 401
                                        ? t("settings.cache.healthError401")
                                        : cacheStatsError.status && cacheStatsError.status >= 500
                                          ? t("settings.cache.healthError500")
                                          : t("settings.cache.healthError")}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => void retryCacheStats()}
                                  aria-label={t("settings.cache.healthRetry")}
                                  data-testid="server-preview-cache-health-retry"
                                >
                                  {t("settings.cache.healthRetry")}
                                </Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {t("settings.cache.healthRetryHint")}
                              </p>
                            </div>
                          ) : cacheStats ? (
                            <p
                              className="text-[10px] text-muted-foreground mb-1"
                              data-testid="server-preview-cache-health"
                            >
                              {t("settings.cache.health")} — {t("settings.cache.hits")}:{" "}
                              <span className="font-mono">{cacheStats.hits}</span> · {t("settings.cache.misses")}:{" "}
                              <span className="font-mono">{cacheStats.misses}</span> · {t("settings.cache.hitRate")}:{" "}
                              <span className="font-mono">{(cacheStats.hit_rate * 100).toFixed(1)}%</span>
                            </p>
                          ) : null}
                        </div>
                        {serverPreviewLoading ? (
                          <p className="text-[11px] text-muted-foreground" role="status" aria-live="polite">
                            {t("parts.store.exportPreviewServerLoading")}
                          </p>
                        ) : serverPreviewError ? (
                          <div className="space-y-1.5" role="alert">
                            <p className="text-[11px] text-destructive">
                              {t("parts.store.exportPreviewServerErrorRecovery")}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => void retryServerPreview()}
                                aria-label={t("parts.store.exportPreviewRetry")}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" aria-hidden />
                                {t("parts.store.exportPreviewRetry")}
                              </Button>
                              <span className="text-[11px] text-muted-foreground self-center">
                                {t("parts.store.exportPreviewLocalAvailable")}
                              </span>
                            </div>
                          </div>
                        ) : serverPreview && serverPreview.length > 0 ? (
                          <div className="rounded border overflow-x-auto" data-testid="server-preview-table">
                            <table className="w-full text-[11px]">
                              <thead className="bg-muted/40">
                                <tr>
                                  {Object.keys(serverPreview[0]).map((h) => (
                                    <th key={h} className="text-start px-2 py-1.5 font-semibold whitespace-nowrap">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {serverPreview.map((row, i) => (
                                  <tr key={i}>
                                    {Object.keys(serverPreview[0]).map((h) => (
                                      <td key={h} className="px-2 py-1 whitespace-nowrap">
                                        {String(row[h] ?? "")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            {t("parts.store.exportPreviewEmpty")}
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </PopoverContent>
            </Popover>

            <Button variant="outline" className="h-10 gap-2" onClick={handleExportXlsx}>
              <Download className="w-4 h-4" /> {t("parts.store.exportXlsx")}
            </Button>
            <Button variant="outline" className="h-10 gap-2" onClick={handleExportPdf}>
              <Download className="w-4 h-4" /> {t("parts.store.exportPdf")}
            </Button>
          </div>

          {/* Approved (ready to issue) table — grouped */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">{t("parts.store.tableHead.request")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.tableHead.jobCard")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.tableHead.vehicle")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.tableHead.parts")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.tableHead.fulfillment")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.tableHead.status")}</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApprovedGroups.map((g) => {
                    const fulfillment = Math.round((g.issuedLines / g.totalLines) * 100);
                    const cfg = statusConfig[g.status] || statusConfig.Approved;
                    const Icon = cfg.icon;
                    const pendingLine = g.lines.find((l) => l.status !== "Issued");
                    const partsSummary = g.lines.map((l) => l.part_name).slice(0, 2).join(", ") +
                      (g.lines.length > 2 ? `, +${g.lines.length - 2} more` : "");
                    return (
                      <tr key={g.base_request_number} className="hover:bg-muted/30">
                        <td className="px-4 py-4 font-mono font-semibold text-primary">
                          {g.lines[0]?.supervisor_remarks ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dotted decoration-primary/40 underline-offset-2">
                                  {g.base_request_number}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{t("parts.store.supervisorRemarks")}</p>
                                <p className="text-xs">{g.lines[0].supervisor_remarks}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : g.base_request_number}
                        </td>
                        <td className="px-4 py-4 font-mono">{g.job_number}</td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{g.vehicle_make}</p>
                          <p className="text-xs text-muted-foreground">{g.vehicle}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{t("parts.store.summary", { lines: g.totalLines, qty: g.lines.reduce((s, l) => s + l.quantity, 0), count: g.totalLines })}</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5 mt-1 max-w-[280px]">
                            {g.lines.slice(0, 3).map((l) => (
                              <li key={l.id} className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {l.part_name}
                                  {l.location && (
                                    <span className="ml-1 font-mono text-[10px] text-primary/80">[{l.location}]</span>
                                  )}
                                </span>
                                <span className={`font-mono shrink-0 ${l.status === "Issued" ? "text-success line-through" : "text-foreground"}`}>×{l.quantity}</span>
                              </li>
                            ))}
                            {g.lines.length > 3 && <li className="italic">{t("parts.store.moreItems", { count: g.lines.length - 3 })}</li>}
                          </ul>
                        </td>
                        <td className="px-4 py-4 min-w-[140px]">
                          <Progress value={fulfillment} className="h-1.5 mb-1" />
                          <p className="text-xs text-muted-foreground">{t("parts.store.issuedProgress", { issued: g.issuedLines, total: g.totalLines, percent: fulfillment })}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`text-[10px] gap-1 ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {t(`partsExtra.status.${g.status}`, g.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {pendingLine && (
                            <Button size="sm" onClick={() => setIssueDialog(pendingLine.id)} disabled={!canIssue}>
                              {g.issuedLines > 0 ? t("parts.store.issueNext") : t("parts.store.issueParts")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredApprovedGroups.length === 0 && !loading && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">{t("parts.store.noApproved")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Requests History — grouped */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="text-xs font-bold tracking-wider uppercase">{t("parts.store.history")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">{t("parts.store.historyHead.id")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.historyHead.vehicle")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.historyHead.items")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.historyHead.date")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.historyHead.priority")}</th>
                    <th className="text-left px-4 py-3">{t("parts.store.historyHead.status")}</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupedHistory.map((g) => {
                    const cfg = statusConfig[g.status] || statusConfig.Pending;
                    const Icon = cfg.icon;
                    return (
                      <tr key={g.base_request_number} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-semibold text-primary">
                          {g.lines[0]?.supervisor_remarks ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dotted decoration-primary/40 underline-offset-2">
                                  {g.base_request_number}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{t("parts.store.supervisorRemarks")}</p>
                                <p className="text-xs">{g.lines[0].supervisor_remarks}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : g.base_request_number}
                        </td>
                        <td className="px-4 py-3">{g.vehicle_make} ({g.vehicle})</td>
                        <td className="px-4 py-3 text-muted-foreground">{t("parts.items", { count: g.totalLines })}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(g.created_at).toLocaleDateString("en-CA")}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] ${urgencyColor[g.urgency]}`}>{t(`partsExtra.urgency.${g.urgency}`, g.urgency)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] gap-1 ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {t(`partsExtra.status.${g.status}`, g.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setHistoryBase(g.base_request_number)}>
                                <Eye className="w-4 h-4 me-2" /> {t("partsExtra.viewDetails", "View details")}
                              </DropdownMenuItem>
                              {g.issuedLines > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => printIssueSlip(g.base_request_number)}>
                                    <FileText className="w-4 h-4 me-2" /> {t("parts.issueSlip.print", "Print issue slip")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => exportIssueSlipPDF(g.base_request_number)}>
                                    <Download className="w-4 h-4 me-2" /> {t("parts.issueSlip.pdf", "Export issue slip PDF")}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {g.status === "Rejected" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setHistoryBase(g.base_request_number)}>
                                    <RefreshCw className="w-4 h-4 me-2" /> {t("partsExtra.reRequest", "Re-request with comments")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {groupedHistory.length === 0 && !loading && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">{t("parts.store.noHistory")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> {t("parts.rejectDialog.title")}</DialogTitle>
            <DialogDescription>{t("parts.rejectDialog.desc")}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} placeholder={t("parts.rejectDialog.placeholder")} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleReject} className="gap-1.5"><XCircle className="w-4 h-4" /> {t("parts.approval.rejectBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue – Handover Form with Signature */}
      <Dialog open={!!issueDialog} onOpenChange={(open) => !open && setIssueDialog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> {t("parts.issuance.title")}</DialogTitle>
            <DialogDescription>{t("parts.issuance.desc")}</DialogDescription>
          </DialogHeader>
          {(() => {
            const line = requests.find((r) => r.id === issueDialog);
            if (!line) return null;
            const mechanicDefault = mechanics.find((m) => m.user_id === (createForm.mechanicId))?.full_name || "";
            return (
              <IssuanceForm
                line={line}
                bayDefault={line.bay_number || ""}
                mechanicDefault={mechanicDefault}
                onSubmit={handleIssue}
                onCancel={() => setIssueDialog(null)}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Cancel Edit confirm */}
      <AlertDialog open={cancelEditOpen} onOpenChange={setCancelEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("parts.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("parts.discardDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("parts.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setCancelEditOpen(false); resetCreateForm(); }}
            >
              {t("parts.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Draft confirm */}
      <AlertDialog open={!!deleteDraftBase} onOpenChange={(open) => !open && setDeleteDraftBase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("parts.deleteDraftTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span dangerouslySetInnerHTML={{ __html: t("parts.deleteDraftDesc", { base: deleteDraftBase ?? "" }) }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteDraft}
            >
              {t("parts.deleteDraftBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request history / details / re-request */}
      <PartsRequestHistoryDialog
        open={!!historyBase}
        onOpenChange={(o) => !o && setHistoryBase(null)}
        baseRequestNumber={historyBase}
        lines={requests}
        onChanged={fetchRequests}
      />
    </div>
    </TooltipProvider>
  );
}
