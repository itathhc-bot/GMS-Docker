import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardList, AlertTriangle, Package, Activity, Users, Timer, Clock,
  BarChart3, CheckCircle2, AlertCircle, Wrench, UserCheck, PackagePlus,
  ExternalLink, ArrowRight, RefreshCw, Pause, Play, Download,
} from "lucide-react";
import { getJobCards } from "@/api/jobCards";
import { getPartsRequests } from "@/api/partsRequests";
import { getInventory } from "@/api/inventory";
import { getAuditLogs } from "@/api/auditLogs";
import { useEcho } from "@/hooks/useEcho";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

import SupervisorNoteCard from "@/components/operations/SupervisorNoteCard";

/* ---------- helpers ---------- */
const trendUp = (n: number) => (
  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
    ↗ {n}%
  </span>
);
const trendDown = (n: number) => (
  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
    ↘ {n}%
  </span>
);
const trendCount = (n: number, positive = true) => (
  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"}`}>
    {positive ? "↗" : "↘"} {n}
  </span>
);

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function monthLabel(bucket: string) {
  const [y, m] = bucket.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
}

/* ---------- KPI tile ---------- */
type Tone = "primary" | "danger" | "warning" | "success" | "info" | "muted";
const toneStyles: Record<Tone, { card: string; icon: string; title: string; value: string; subtitle: string }> = {
  primary: { card: "bg-[hsl(220,55%,28%)] text-white border-transparent", icon: "bg-white/10 text-white", title: "text-white/70", value: "text-white", subtitle: "text-white/70" },
  danger:  { card: "bg-destructive/5 border-destructive/20", icon: "bg-destructive/10 text-destructive", title: "text-destructive", value: "text-foreground", subtitle: "text-destructive" },
  warning: { card: "bg-warning/5 border-warning/20", icon: "bg-warning/10 text-warning", title: "text-warning", value: "text-foreground", subtitle: "text-warning" },
  success: { card: "bg-success/5 border-success/20", icon: "bg-success/10 text-success", title: "text-success", value: "text-foreground", subtitle: "text-success" },
  info:    { card: "bg-card border-border", icon: "bg-muted text-muted-foreground", title: "text-muted-foreground", value: "text-foreground", subtitle: "text-muted-foreground" },
  muted:   { card: "bg-card border-border", icon: "bg-muted text-muted-foreground", title: "text-muted-foreground", value: "text-foreground", subtitle: "text-muted-foreground" },
};

function KpiTile({
  tone = "info", icon: Icon, title, value, subtitle, footer, trend, big = false,
}: {
  tone?: Tone; icon: any; title: string; value: string | number; subtitle?: string;
  footer?: string; trend?: React.ReactNode; big?: boolean;
}) {
  const s = toneStyles[tone];
  return (
    <Card className={`p-5 border ${s.card} ${big ? "row-span-2" : ""} flex flex-col`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend}
      </div>
      <div className="mt-4">
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${s.title}`}>{title}</p>
        <p className={`mt-1 font-bold ${big ? "text-6xl" : "text-4xl"} ${s.value}`}>{value}</p>
        {subtitle && <p className={`text-sm mt-1 ${s.subtitle}`}>{subtitle}</p>}
      </div>
      {footer && (
        <>
          <div className={`my-3 border-t ${tone === "primary" ? "border-white/15" : "border-border"}`} />
          <p className={`text-xs ${tone === "primary" ? "text-white/60" : "text-muted-foreground"}`}>{footer}</p>
        </>
      )}
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Diagnostics: "hsl(255, 60%, 65%)",
  "In Repair": "hsl(220, 55%, 35%)",
  "Pending Parts": "hsl(38, 92%, 50%)",
  "QC Review": "hsl(265, 60%, 55%)",
  Delayed: "hsl(0, 72%, 51%)",
  Assigned: "hsl(180, 50%, 45%)",
  "In Progress": "hsl(220, 70%, 50%)",
  Open: "hsl(220, 60%, 55%)",
  Completed: "hsl(142, 72%, 40%)",
  Closed: "hsl(142, 50%, 30%)",
  "Waiting Approval": "hsl(38, 92%, 45%)",
  "Work Finished": "hsl(160, 60%, 45%)",
};

const RANGE_OPTIONS = [
  { value: "7", labelKey: "ops.ranges.7" },
  { value: "30", labelKey: "ops.ranges.30" },
  { value: "90", labelKey: "ops.ranges.90" },
  { value: "180", labelKey: "ops.ranges.180" },
  { value: "365", labelKey: "ops.ranges.365" },
];

const AUTO_REFRESH_MS = 45_000;

type ActivityEvent = {
  id: string;
  kind: "qc" | "sla" | "assign" | "parts" | "audit" | "login";
  title: string;
  subtitle: string;
  at: string;
};

const LS_RANGE_KEY = "ops-dashboard:rangeDays";
const LS_AUTO_KEY = "ops-dashboard:autoRefresh";

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch { return fallback; }
}

/* ---------- Main page ---------- */
export default function OperationsDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => readLS(LS_AUTO_KEY, true));
  const [rangeDays, setRangeDays] = useState<string>(() => readLS(LS_RANGE_KEY, "30"));
  const [feedPaused, setFeedPaused] = useState(false);
  const feedPausedRef = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [stats, setStats] = useState({
    activeJobs: 0, slaBreaches: 0, criticalInventory: 0, outOfStock: 0,
    bayUtil: 78, bayActive: 18, bayTotal: 22, bayAvailable: 4,
    mechanicAvail: 88, mechanicsOn: 19, mechanicsTotal: 22, mechanicsOff: 3,
    partsPending: 0, partsUrgent: 0,
    avgRepair: 0, slaCompliance: 0,
    newJobs24h: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<{ name: string; value: number }[]>([]);
  const [criticalStock, setCriticalStock] = useState<any[]>([]);
  const [repairVolume, setRepairVolume] = useState<{ month: string; total: number }[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const rangeFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(rangeDays));
    return d.toISOString();
  }, [rangeDays]);
  const rangeTo = useMemo(() => new Date().toISOString(), [rangeDays, lastUpdated]);

  // Persist toolbar prefs
  useEffect(() => {
    try { localStorage.setItem(LS_RANGE_KEY, JSON.stringify(rangeDays)); } catch {}
  }, [rangeDays]);
  useEffect(() => {
    try { localStorage.setItem(LS_AUTO_KEY, JSON.stringify(autoRefresh)); } catch {}
  }, [autoRefresh]);
  useEffect(() => { feedPausedRef.current = feedPaused; }, [feedPaused]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    const fromIso = rangeFrom;
    const toIso = new Date().toISOString();

    try {
      const [jobsRaw, recentRaw, partsRaw, invRaw, auditsRaw] = await Promise.all([
        getJobCards(),
        getJobCards({ limit: 8 }),
        getPartsRequests(),
        getInventory(),
        getAuditLogs({ limit: 8 }),
      ]);

      const jobs = (jobsRaw as any[]).filter(j => new Date(j.created_at) >= new Date(fromIso) && new Date(j.created_at) <= new Date(toIso));
      const recent = (recentRaw as any[]) ?? [];
      const parts = (partsRaw as any[]).filter(p => new Date(p.created_at) >= new Date(fromIso) && new Date(p.created_at) <= new Date(toIso));
      const inv = (invRaw as any[]) ?? [];
      const audits = (auditsRaw as any[]) ?? [];

    const isClosed = (s: string) => s === "Completed" || s === "Closed";

    const activeJobs = jobs.filter((j) => !isClosed(j.status)).length;
    const dayAgo = Date.now() - 86400000;
    const newJobs24h = jobs.filter((j) => new Date(j.created_at).getTime() > dayAgo).length;
    const now = Date.now();
    const slaBreaches = jobs.filter((j) => {
      if (!j.started_at || isClosed(j.status)) return false;
      const elapsedH = (now - new Date(j.started_at).getTime()) / 3600000;
      return j.sla_hours && elapsedH > j.sla_hours;
    }).length;

    const critical = inv.filter((i) => i.stock_quantity < i.min_threshold);
    const outOfStock = inv.filter((i) => i.stock_quantity <= 0).length;
    const partsPending = parts.filter((p) => p.status === "Pending").length;
    const partsUrgent = parts.filter((p) => p.urgency === "Urgent" || p.urgency === "Emergency").length;

    const completed = jobs.filter((j) => isClosed(j.status) && j.completed_at && j.started_at);
    const onTime = completed.filter((j) => {
      const h = (new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime()) / 3600000;
      return j.sla_hours ? h <= j.sla_hours : true;
    }).length;
    const slaCompliance = completed.length > 0 ? (onTime / completed.length) * 100 : 0;
    const avgRepair = completed.length > 0
      ? completed.reduce((acc, j) => acc + (new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime()) / 3600000, 0) / completed.length
      : 0;

    const statusMap: Record<string, number> = {};
    jobs.filter((j) => !isClosed(j.status)).forEach((j) => {
      statusMap[j.status] = (statusMap[j.status] || 0) + 1;
    });
    const dist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Repair volume bucketed by month
    const buckets: Record<string, number> = {};
    jobs.forEach((j) => {
      const d = new Date(j.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    const volume = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, total]) => ({ month: monthLabel(bucket), total }));

    setStats((s) => ({
      ...s,
      activeJobs, slaBreaches, newJobs24h,
      criticalInventory: critical.length, outOfStock,
      partsPending, partsUrgent,
      slaCompliance: Number(slaCompliance.toFixed(1)),
      avgRepair: Number(avgRepair.toFixed(1)),
    }));
    setRecentJobs(recent);
    setStatusDist(dist);
    setCriticalStock(critical.slice(0, 6));
    setRepairVolume(volume);

    // Initial activity feed seed (mix audit + job events)
    const events: ActivityEvent[] = [
      ...recent.slice(0, 4).map((j: any) => ({
        id: `job-${j.id}-${j.updated_at || j.created_at}`,
        kind: (isClosed(j.status) ? "qc" : (j.priority === "Emergency" ? "sla" : "assign")) as ActivityEvent["kind"],
        title: isClosed(j.status)
          ? `QC Passed — ${j.job_number}`
          : j.priority === "Emergency"
          ? `SLA Watch — ${j.job_number}`
          : `Job Assigned — ${j.job_number}`,
        subtitle: `${(j.vehicles as any)?.make ?? ""} ${(j.vehicles as any)?.model ?? ""} · Bay ${j.bay_number ?? "—"}`.trim(),
        at: j.updated_at || j.created_at,
      })),
      ...audits.slice(0, 4).map((a: any) => ({
        id: `audit-${a.id}`,
        kind: "audit" as const,
        title: `${a.action.replace(/_/g, " ")}`,
        subtitle: a.target_name ? `${a.actor_name ?? "Admin"} → ${a.target_name}` : (a.actor_name ?? "Admin action"),
        at: a.created_at,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
    setActivity(events);

    setLoading(false);
    setRefreshing(false);
    setLastUpdated(new Date());
    } catch(e) { console.error(e); }
  }, [rangeFrom]);

  // Initial + range-change load
  useEffect(() => { load(false); }, [load]);

  // Auto-refresh interval (toggleable)
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoRefresh) {
      intervalRef.current = window.setInterval(() => load(true), AUTO_REFRESH_MS);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [autoRefresh, load]);

  useEcho('job-cards', 'JobCardStatusChanged', (payload: any) => {
    const j = payload.jobCard;
    if (!j || feedPausedRef.current) return;
    const isClosed = j.status === "Completed" || j.status === "Closed";
    const kind = isClosed ? "qc" : (j.priority === "Emergency" ? "sla" : "assign");
    setActivity((prev) => {
      const existing = prev.find((p) => p.id === `job-${j.id}`);
      if (existing) return prev;
      const at = j.updated_at || new Date().toISOString();
      const ev: ActivityEvent = {
        id: `job-${j.id}`,
        kind,
        title: isClosed ? `Job Completed — ${j.job_number}` : `Job Updated — ${j.job_number} · ${j.status}`,
        subtitle: `Bay ${j.bay_number ?? "—"} · ${j.priority}`,
        at,
      };
      return [ev, ...prev].slice(0, 12);
    });
  });

  useEcho('parts-requests', 'PartsRequestUpdated', (payload: any) => {
    const p = payload.request;
    if (!p || feedPausedRef.current) return;
    setActivity((prev) => {
      const existing = prev.find((x) => x.id === `parts-${p.id}`);
      if (existing) return prev;
      const at = p.updated_at || new Date().toISOString();
      const ev: ActivityEvent = {
        id: `parts-${p.id}`,
        kind: "parts",
        title: `Parts ${p.status} — ${p.request_number}`,
        subtitle: `${p.part_name} · ${p.urgency}`,
        at,
      };
      return [ev, ...prev].slice(0, 12);
    });
  });

  useEcho('admin-audit', 'AuditLogCreated', (payload: any) => {
    const a = payload.audit;
    if (!a || feedPausedRef.current) return;
    setActivity((prev) => {
      const ev: ActivityEvent = {
        id: `audit-${a.id}`,
        kind: "audit",
        title: String(a.action).replace(/_/g, " "),
        subtitle: a.target_name ? `${a.actor_name ?? "Admin"} → ${a.target_name}` : (a.actor_name ?? "Admin action"),
        at: a.created_at,
      };
      return [ev, ...prev].slice(0, 12);
    });
  });

  const totalActive = useMemo(() => statusDist.reduce((s, d) => s + d.value, 0), [statusDist]);
  const slaComplianceTarget = 90;
  const slaDelta = (stats.slaCompliance - slaComplianceTarget).toFixed(1);

  /* ---------- Export helpers ---------- */
  const exportRangeLabel = useMemo(() => {
    const opt = RANGE_OPTIONS.find((o) => o.value === rangeDays);
    return opt ? t(opt.labelKey) : `Last ${rangeDays} days`;
  }, [rangeDays, t]);

  const buildKpiRows = useCallback((): [string, string | number][] => [
    ["Active Job Cards", stats.activeJobs],
    ["New jobs (24h)", stats.newJobs24h],
    ["SLA Breaches", stats.slaBreaches],
    ["SLA Compliance %", stats.slaCompliance],
    ["Avg Repair Time (h)", stats.avgRepair],
    ["Critical Inventory SKUs", stats.criticalInventory],
    ["Out of Stock SKUs", stats.outOfStock],
    ["Parts Pending Approval", stats.partsPending],
    ["Parts Urgent", stats.partsUrgent],
  ], [stats]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const stamp = new Date().toLocaleString();
    doc.setFontSize(16);
    doc.text("Operations Dashboard Report", 40, 50);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Range: ${exportRangeLabel}  ·  Generated: ${stamp}`, 40, 68);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 88,
      head: [["KPI", "Value"]],
      body: buildKpiRows().map(([k, v]) => [k, String(v)]),
      headStyles: { fillColor: [40, 70, 120] },
      styles: { fontSize: 10 },
    });

    if (statusDist.length) {
      autoTable(doc, {
        head: [["Active job status", "Count"]],
        body: statusDist.map((s) => [s.name, String(s.value)]),
        headStyles: { fillColor: [40, 70, 120] },
        styles: { fontSize: 10 },
      });
    }
    if (repairVolume.length) {
      autoTable(doc, {
        head: [["Month", "Jobs created"]],
        body: repairVolume.map((r) => [r.month, String(r.total)]),
        headStyles: { fillColor: [40, 70, 120] },
        styles: { fontSize: 10 },
      });
    }
    if (criticalStock.length) {
      autoTable(doc, {
        head: [["Part", "SKU", "Stock", "Min"]],
        body: criticalStock.map((i: any) => [i.part_name, i.sku, String(i.stock_quantity), String(i.min_threshold)]),
        headStyles: { fillColor: [40, 70, 120] },
        styles: { fontSize: 10 },
      });
    }

    doc.save(`operations-dashboard-${rangeDays}d-${Date.now()}.pdf`);
  }, [buildKpiRows, statusDist, repairVolume, criticalStock, exportRangeLabel, rangeDays]);

  const exportXLSX = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const meta = [["Range", exportRangeLabel], ["Generated", new Date().toLocaleString()]];
    const kpiSheet = XLSX.utils.aoa_to_sheet([
      ...meta,
      [],
      ["KPI", "Value"],
      ...buildKpiRows(),
    ]);
    XLSX.utils.book_append_sheet(wb, kpiSheet, "KPIs");

    if (statusDist.length) {
      const s = XLSX.utils.aoa_to_sheet([["Status", "Count"], ...statusDist.map((d) => [d.name, d.value])]);
      XLSX.utils.book_append_sheet(wb, s, "Status");
    }
    if (repairVolume.length) {
      const s = XLSX.utils.aoa_to_sheet([["Month", "Jobs created"], ...repairVolume.map((r) => [r.month, r.total])]);
      XLSX.utils.book_append_sheet(wb, s, "Repair volume");
    }
    if (criticalStock.length) {
      const s = XLSX.utils.aoa_to_sheet([
        ["Part", "SKU", "Stock", "Min threshold"],
        ...criticalStock.map((i: any) => [i.part_name, i.sku, i.stock_quantity, i.min_threshold]),
      ]);
      XLSX.utils.book_append_sheet(wb, s, "Critical stock");
    }

    XLSX.writeFile(wb, `operations-dashboard-${rangeDays}d-${Date.now()}.xlsx`);
  }, [buildKpiRows, statusDist, repairVolume, criticalStock, exportRangeLabel, rangeDays]);

  return (
    <div className="space-y-5">
      {/* Toolbar: range + auto-refresh + manual refresh */}
      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="range" className="text-xs text-muted-foreground">{t("ops.dateRange")}</Label>
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger id="range" className="h-8 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 ms-auto">
          <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          <Label htmlFor="auto" className="text-xs text-muted-foreground cursor-pointer">
            {t("ops.autoRefresh")}
          </Label>
          <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-success animate-pulse" : "bg-muted-foreground/30"}`} />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className="h-8 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("ops.refresh")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={loading}>
              <Download className="w-3.5 h-3.5" />
              {t("ops.export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportPDF}>{t("ops.downloadPdf")}</DropdownMenuItem>
            <DropdownMenuItem onClick={exportXLSX}>{t("ops.downloadExcel")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {lastUpdated && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {t("ops.updated", { time: timeAgo(lastUpdated.toISOString()) })}
          </span>
        )}
      </Card>

      {/* Supervisor note banner — real, editable by supervisors/admins */}
      <SupervisorNoteCard />

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          <KpiTile
            big tone="primary" icon={ClipboardList}
            title={t("ops.kpi.activeJobCards")} value={stats.activeJobs}
            subtitle={t("ops.kpi.newIn24h", { count: stats.newJobs24h })} footer={t("ops.kpi.acrossBays")}
            trend={trendUp(12)}
          />
          <KpiTile
            tone="danger" icon={AlertTriangle}
            title={t("ops.kpi.slaBreaches")} value={String(stats.slaBreaches).padStart(2, "0")}
            subtitle={t("ops.kpi.requiresAction")}
            footer={t("ops.kpi.jobsOverSla", { count: stats.slaBreaches })}
            trend={trendDown(2)}
          />
          <KpiTile
            tone="warning" icon={Package}
            title={t("ops.kpi.criticalInventory")} value={stats.criticalInventory}
            subtitle={t("ops.kpi.skusBelow")}
            footer={t("ops.kpi.outOfStock", { count: stats.outOfStock })}
            trend={trendCount(stats.outOfStock, false)}
          />
          <KpiTile
            tone="info" icon={Activity}
            title={t("ops.kpi.bayUtilization")} value={`${stats.bayUtil}%`}
            subtitle={t("ops.kpi.baysActive", { active: stats.bayActive, total: stats.bayTotal })}
            footer={t("ops.kpi.baysAvailable", { count: stats.bayAvailable })}
            trend={trendUp(5)}
          />
          <KpiTile
            tone="info" icon={Users}
            title={t("ops.kpi.mechanicAvail")} value={`${stats.mechanicAvail}%`}
            subtitle={t("ops.kpi.mechanicsOn", { on: stats.mechanicsOn, total: stats.mechanicsTotal })}
            footer={t("ops.kpi.mechanicsOff", { count: stats.mechanicsOff })}
            trend={trendDown(3)}
          />
          <KpiTile
            tone="warning" icon={Timer}
            title={t("ops.kpi.partsPending")} value={stats.partsPending}
            subtitle={t("ops.kpi.urgentMarked", { count: stats.partsUrgent })}
            footer={t("ops.kpi.avgWait")}
            trend={trendCount(stats.partsUrgent, false)}
          />
          <KpiTile
            tone="success" icon={Clock}
            title={t("ops.kpi.avgRepair")} value={`${stats.avgRepair || 0}h`}
            subtitle={t("ops.kpi.rangeLast", { days: rangeDays })}
            footer={t("ops.kpi.target")}
            trend={<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">↘ 0.5h</span>}
          />
        </div>
      )}

      {/* SLA Compliance bar */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          {loading ? (
            <>
              <div className="flex items-baseline gap-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex-1 min-w-[200px] ms-auto">
                <Skeleton className="h-2 w-full" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{t("ops.sla.rate")}</p>
                <p className="text-2xl font-bold">{stats.slaCompliance}%</p>
                <p className={`text-xs ${Number(slaDelta) >= 0 ? "text-success" : "text-destructive"}`}>
                  {Number(slaDelta) >= 0 ? "↑" : "↓"} {Math.abs(Number(slaDelta))}pp{" "}
                  {Number(slaDelta) >= 0 ? t("ops.sla.above", { target: slaComplianceTarget }) : t("ops.sla.below", { target: slaComplianceTarget })}
                </p>
              </div>
              <div className="flex-1 min-w-[200px] ms-auto">
                <Progress value={stats.slaCompliance} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="text-primary font-medium">{t("ops.sla.targetLine", { target: slaComplianceTarget })}</span>
                  <span>100%</span>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Repair volume + Jobs by status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-start gap-2">
              <BarChart3 className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold">{t("ops.repairVolume")}</h3>
                <p className="text-xs text-muted-foreground">{t("ops.repairVolumeSub", { days: rangeDays })}</p>
              </div>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : repairVolume.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              {t("ops.noJobsRange")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={repairVolume} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 92%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="total" name="Jobs" fill="hsl(220, 55%, 35%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">{t("ops.jobsByStatus")}</h3>
            <p className="text-xs text-muted-foreground">{t("ops.totalActiveJobs", { count: totalActive || stats.activeJobs })}</p>
          </div>
          {loading ? (
            <>
              <Skeleton className="h-[200px] w-full rounded-full" />
              <div className="space-y-2 mt-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            </>
          ) : statusDist.length > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3}>
                      {statusDist.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] ?? `hsl(${(i * 47) % 360}, 60%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-bold">{totalActive}</p>
                  <p className="text-xs text-muted-foreground">{t("ops.active")}</p>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {statusDist.map((s, i) => {
                  const pct = totalActive > 0 ? Math.round((s.value / totalActive) * 100) : 0;
                  return (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.name] ?? `hsl(${(i * 47) % 360}, 60%, 50%)` }} />
                      <span className="text-muted-foreground flex-1">{s.name}</span>
                      <span className="font-semibold">{s.value}</span>
                      <span className="text-muted-foreground w-10 text-end">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">{t("ops.noActiveJobs")}</div>
          )}
        </Card>
      </div>

      {/* Recent Job Cards */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("ops.recentJobs")}</h3>
            <Badge variant="secondary" className="text-[11px]">{recentJobs.length}</Badge>
          </div>
          <button onClick={() => navigate("/job-cards")} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            {t("ops.viewAll")} <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                <th className="text-start py-2 font-medium">{t("ops.table.jobCard")}</th>
                <th className="text-start py-2 font-medium">{t("ops.table.vehiclePlate")}</th>
                <th className="text-start py-2 font-medium">{t("ops.table.mechanic")}</th>
                <th className="text-start py-2 font-medium">{t("ops.table.bay")}</th>
                <th className="text-start py-2 font-medium">{t("ops.table.status")}</th>
                <th className="text-start py-2 font-medium">{t("ops.table.priority")}</th>
                <th className="text-start py-2 font-medium">{t("ops.table.slaHealth")}</th>
                <th className="text-start py-2 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><Skeleton className="h-32 my-2" /></td></tr>
              ) : recentJobs.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">{t("ops.noRecentJobs")}</td></tr>
              ) : recentJobs.map((j) => {
                const elapsedH = j.started_at ? (Date.now() - new Date(j.started_at).getTime()) / 3600000 : 0;
                const sla = j.sla_hours || 24;
                const health = Math.max(0, Math.min(100, Math.round(((sla - elapsedH) / sla) * 100)));
                const healthTone = health > 70 ? "success" : health > 40 ? "warning" : "destructive";
                const isEmergency = j.priority === "Emergency";
                return (
                  <tr key={j.id} className={`border-b last:border-0 hover:bg-muted/40 ${isEmergency ? "bg-destructive/5" : ""}`}>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 text-primary font-medium">
                        {isEmergency && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                        {j.job_number}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{(j.vehicles as any)?.plate_number ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{[(j.vehicles as any)?.make, (j.vehicles as any)?.model].filter(Boolean).join(" ") || "—"}</div>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{j.assigned_to ?? t("ops.unassigned")}</td>
                    <td className="py-3 text-sm">Bay #{j.bay_number ?? "—"}</td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-[11px] font-medium" style={{ color: STATUS_COLORS[j.status], borderColor: `${STATUS_COLORS[j.status] ?? "hsl(220,10%,80%)"}66` }}>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className={`text-[11px] font-bold uppercase ${
                        j.priority === "Emergency" ? "text-destructive border-destructive/40 bg-destructive/5" :
                        j.priority === "High" ? "text-warning border-warning/40 bg-warning/5" :
                        j.priority === "Medium" ? "text-warning border-warning/30 bg-warning/5" :
                        "text-muted-foreground border-border"
                      }`}>{j.priority}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${healthTone === "success" ? "bg-success" : healthTone === "warning" ? "bg-warning" : "bg-destructive"}`}
                            style={{ width: `${health}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10">{health}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground"><Clock className="w-3.5 h-3.5" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">{t("ops.showingActive", { shown: recentJobs.length, total: stats.activeJobs })}</p>
          <button onClick={() => navigate("/job-cards")} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            {t("ops.manageAll")} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </Card>

      {/* Critical Stock Alerts */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">{t("ops.criticalStock")}</h3>
            <Badge variant="outline" className="text-[11px] text-destructive border-destructive/40 bg-destructive/5">
              {stats.criticalInventory}
            </Badge>
          </div>
          <button onClick={() => navigate("/inventory")} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            {t("ops.viewInventory")} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? <Skeleton className="h-40" /> : criticalStock.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("ops.noCriticalStock")}</p>
        ) : (
          <div className="divide-y">
            {criticalStock.map((item) => {
              const ratio = item.min_threshold > 0 ? Math.min(100, (item.stock_quantity / item.min_threshold) * 100) : 0;
              const isCritical = ratio < 30;
              return (
                <div key={item.id} className={`py-3 ${isCritical ? "bg-destructive/5 -mx-5 px-5" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${isCritical ? "text-destructive" : "text-warning"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.part_name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{item.sku}</p>
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className={`text-sm font-bold ${isCritical ? "text-destructive" : "text-warning"}`}>
                        {item.stock_quantity}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t("ops.min", { count: item.min_threshold })}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${isCritical ? "bg-destructive" : "bg-warning"}`} style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {stats.criticalInventory > 0 && (
          <div className="mt-4 p-3 rounded-md bg-warning/10 border border-warning/30 text-xs text-warning flex items-center justify-between">
            <span>{t("ops.skusBelowAlert", { count: stats.criticalInventory })}</span>
            <button onClick={() => navigate("/parts-request")} className="font-semibold underline">{t("ops.raisePO")}</button>
          </div>
        )}
      </Card>

      {/* Live Activity */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("ops.liveActivity")}</h3>
            <Badge variant={feedPaused ? "outline" : "secondary"} className="text-[11px]">
              {feedPaused ? t("ops.paused") : t("ops.realtime")}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setFeedPaused((v) => !v)}
            >
              {feedPaused ? <><Play className="w-3 h-3" /> {t("ops.resume")}</> : <><Pause className="w-3 h-3" /> {t("ops.pause")}</>}
            </Button>
            <span className={`w-2 h-2 rounded-full ${feedPaused ? "bg-muted-foreground/40" : "bg-success animate-pulse"}`} />
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("ops.noRecentActivity")}</p>
        ) : (
          <div className="divide-y">
            {activity.map((e) => {
              const cfg = {
                qc:     { Icon: CheckCircle2, bg: "bg-success/10", color: "text-success" },
                sla:    { Icon: AlertTriangle, bg: "bg-destructive/10", color: "text-destructive" },
                assign: { Icon: Wrench, bg: "bg-primary/10", color: "text-primary" },
                parts:  { Icon: PackagePlus, bg: "bg-warning/10", color: "text-warning" },
                login:  { Icon: UserCheck, bg: "bg-muted", color: "text-muted-foreground" },
                audit:  { Icon: UserCheck, bg: "bg-muted", color: "text-muted-foreground" },
              }[e.kind] ?? { Icon: Activity, bg: "bg-muted", color: "text-muted-foreground" };
              const Icon = cfg.Icon;
              return (
                <div key={e.id} className="flex items-start gap-3 py-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.subtitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
