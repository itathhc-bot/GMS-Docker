import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, Wifi, Clock, ArrowLeftRight, Maximize, Minimize, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getJobCards } from "@/api/jobCards";
import { getPartsRequests } from "@/api/partsRequests";
import { getQcReviews } from "@/api/qcReviews";
import { useEcho } from "@/hooks/useEcho";

import { toast } from "@/hooks/use-toast";

interface BayInfo {
  bay: string;
  vehicle: string;
  job: string;
  assignee: string;
  status: string;
  sla: string;
  slaPercent: number;
  priority: string;
}

const BAY_LABELS = ["BAY 01", "BAY 02", "BAY 03", "BAY 04", "BAY 05", "BAY 06", "BAY 07", "BAY 08"];

const statusColor: Record<string, string> = {
  "In Progress": "bg-chart-2 text-primary-foreground",
  "Pending Parts": "bg-warning text-warning-foreground",
  "QC Review": "bg-primary text-primary-foreground",
  "Delayed": "bg-destructive text-destructive-foreground",
  "Vacant": "bg-muted text-muted-foreground",
  "Open": "bg-primary text-primary-foreground",
};

// Translation key map for status strings (DB-stored English values)
const statusKeyMap: Record<string, string> = {
  "In Progress": "central.bayStatus.InProgress",
  "Pending Parts": "central.bayStatus.PendingParts",
  "QC Review": "central.bayStatus.QCReview",
  "Delayed": "central.bayStatus.Delayed",
  "Vacant": "central.bayStatus.Vacant",
  "Open": "central.bayStatus.Open",
};

const priorityColor: Record<string, string> = {
  HIGH: "bg-warning/20 text-warning border border-warning/40",
  MEDIUM: "bg-primary/20 text-primary border border-primary/40",
  LOW: "bg-muted text-muted-foreground border border-border",
  EMERGENCY: "bg-destructive/20 text-destructive border border-destructive/40",
  NONE: "bg-muted text-muted-foreground",
};

function formatSla(slaHours: number | null, startedAt: string | null): { sla: string; slaPercent: number } {
  if (!slaHours || !startedAt) return { sla: "—", slaPercent: 50 };
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 3600000;
  const remaining = Math.max(slaHours - elapsed, 0);
  const hrs = Math.floor(remaining);
  const mins = Math.floor((remaining - hrs) * 60);
  const percent = Math.max(0, Math.min(100, (remaining / slaHours) * 100));
  return { sla: `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`, slaPercent: Math.round(percent) };
}

export default function CentralMonitor() {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [refreshCountdown, setRefreshCountdown] = useState(45);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bays, setBays] = useState<BayInfo[]>([]);
  const [stats, setStats] = useState({ activeJobs: 0, avgSla: "00:00", partsPending: 0, baysActive: "0/8", qcQueue: 0 });
  const prevBaysRef = useRef<BayInfo[]>([]);

  async function loadData() {
    try {
      const [jobsData, partsData, qcData] = await Promise.all([
        getJobCards(),
        getPartsRequests({ status: "Pending" }),
        getQcReviews({ status: "Pending" }),
      ]);

      const jobs = (jobsData as any[]).filter(j => j.status !== 'Completed' && j.status !== 'Closed') ?? [];
      const pendingParts = partsData?.length ?? 0;
      const qcQueue = qcData?.length ?? 0;

    const normalizeBay = (b: string) => {
      const num = parseInt(b.replace(/[^0-9]/g, ""), 10);
      return isNaN(num) ? b : `BAY ${String(num).padStart(2, "0")}`;
    };
    const bayMap: BayInfo[] = BAY_LABELS.map((label) => {
      const job = jobs.find((j: any) => j.bay_number && normalizeBay(j.bay_number) === label);
      if (!job) return { bay: label, vehicle: "—", job: "—", assignee: "—", status: "Vacant", sla: "—", slaPercent: 0, priority: "NONE" };
      const { sla, slaPercent } = formatSla(job.sla_hours, job.started_at);
      return {
        bay: label,
        vehicle: job.vehicles?.plate_number ?? "Unknown",
        job: job.job_number,
        assignee: job.assigned_to ? "Assigned" : "Unassigned",
        status: job.status,
        sla,
        slaPercent,
        priority: (job.priority || "MEDIUM").toUpperCase(),
      };
    });

    const activeBays = bayMap.filter((b) => b.status !== "Vacant").length;
    const totalSla = jobs.reduce((s: number, j: any) => s + (j.sla_hours ?? 0), 0);
    const avgH = jobs.length ? totalSla / jobs.length : 0;
    const avgSla = `${String(Math.floor(avgH)).padStart(2, "0")}:${String(Math.floor((avgH % 1) * 60)).padStart(2, "0")}`;

    checkAlerts(bayMap);
    setBays(bayMap);
    setStats({ activeJobs: jobs.length, avgSla, partsPending: pendingParts, baysActive: `${activeBays}/8`, qcQueue });
    } catch(e) { console.error(e); }
  }

  const checkAlerts = useCallback((newBays: BayInfo[]) => {
    const prev = prevBaysRef.current;
    if (prev.length === 0) { prevBaysRef.current = newBays; return; }
    newBays.forEach((bay) => {
      const old = prev.find((b) => b.bay === bay.bay);
      if ((bay.status === "Delayed" || bay.priority === "EMERGENCY") && old?.status !== bay.status) {
        const msg = bay.priority === "EMERGENCY"
          ? t("central.alertEmergency", { bay: bay.bay, vehicle: bay.vehicle })
          : t("central.alertDelayed", { bay: bay.bay, vehicle: bay.vehicle });
        toast({ title: t("central.alertTitle"), description: msg, variant: "destructive" });
        try { const ctx = new AudioContext(); const o = ctx.createOscillator(); o.frequency.value = bay.priority === "EMERGENCY" ? 880 : 660; o.type = "square"; const g = ctx.createGain(); g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 300); } catch { /* noop */ }
      }
    });
    prevBaysRef.current = newBays;
  }, [t]);

  useEffect(() => { loadData(); }, []);

  useEcho('job-cards', 'JobCardStatusChanged', () => { loadData(); setRefreshCountdown(45); });
  useEcho('parts-requests', 'PartsRequestUpdated', () => { loadData(); setRefreshCountdown(45); });
  useEcho('qc-reviews', 'QcReviewUpdated', () => { loadData(); setRefreshCountdown(45); });

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setRefreshCountdown((p) => {
        if (p <= 1) { loadData(); return 45; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formattedTime = time.toLocaleTimeString(i18n.language === "ar" ? "ar-AE" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const statsBar = [
    { label: t("central.stats.activeJobs"), value: String(stats.activeJobs).padStart(2, "0"), color: "text-primary" },
    { label: t("central.stats.avgSla"), value: stats.avgSla, color: "text-warning" },
    { label: t("central.stats.partsPending"), value: String(stats.partsPending).padStart(2, "0"), color: "text-destructive" },
    { label: t("central.stats.baysActive"), value: stats.baysActive, color: "text-success" },
    { label: t("central.stats.qcQueue"), value: String(stats.qcQueue).padStart(2, "0"), color: "text-primary" },
  ];

  const translateStatus = (s: string) => {
    const key = statusKeyMap[s];
    return key ? t(key) : s;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm tracking-wider uppercase">{t("central.appName")}</span>
            <span className="text-muted-foreground text-sm">|</span>
            <span className="text-sm text-muted-foreground tracking-wide uppercase">{t("central.title")}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="text-xs font-medium text-success uppercase tracking-wider">{t("central.liveFeed")}</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-mono font-semibold tabular-nums">{formattedTime}</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            {isFullscreen ? t("central.exit") : t("central.fullscreen")}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeftRight className="w-4 h-4" />
            {t("central.switchView")}
          </Button>
        </div>
      </header>

      <div className="border-b border-border bg-card/50 px-6 py-3 flex items-center gap-6">
        {statsBar.map((s) => (
          <div key={s.label} className="flex items-center gap-3 pr-6 border-r border-border last:border-r-0">
            <div>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">{s.label}</p>
              <p className={`text-2xl font-bold font-mono tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Wifi className="w-3.5 h-3.5" />
          <span className="font-mono">
            {t("central.refreshing")} <span className="text-foreground font-semibold">{String(refreshCountdown).padStart(2, "0")}S</span>
          </span>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {bays.map((bay) => {
            const isVacant = bay.status === "Vacant";
            return (
              <div
                key={bay.bay}
                className={`rounded-xl border p-4 transition-all ${
                  isVacant
                    ? "bg-muted/30 border-border opacity-50"
                    : bay.priority === "EMERGENCY"
                    ? "bg-destructive/5 border-destructive/30 animate-pulse"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-wider text-muted-foreground">{bay.bay}</span>
                  <Badge className={`text-[10px] px-2 py-0.5 ${statusColor[bay.status] || "bg-muted"}`}>
                    {translateStatus(bay.status)}
                  </Badge>
                </div>

                {!isVacant && (
                  <>
                    <div className="mb-2">
                      <p className="font-bold text-lg font-mono tracking-wider">{bay.vehicle}</p>
                      <p className="text-xs text-muted-foreground">{bay.job} • {bay.assignee === "Assigned" ? t("central.bayStatus.Assigned") : t("central.bayStatus.Unassigned")}</p>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`text-[9px] px-1.5 py-0 ${priorityColor[bay.priority]}`}>
                        {bay.priority}
                      </Badge>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase">{t("central.slaRemaining")}</p>
                        <p className={`text-sm font-mono font-bold ${bay.slaPercent < 25 ? "text-destructive" : bay.slaPercent < 50 ? "text-warning" : "text-success"}`}>
                          {bay.sla}
                        </p>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          bay.slaPercent < 25 ? "bg-destructive" : bay.slaPercent < 50 ? "bg-warning" : "bg-success"
                        }`}
                        style={{ width: `${bay.slaPercent}%` }}
                      />
                    </div>
                  </>
                )}

                {isVacant && (
                  <div className="flex items-center justify-center py-6">
                    <span className="text-sm text-muted-foreground italic">{t("central.noVehicle")}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="h-10 border-t border-border bg-card flex items-center px-6 text-[11px] text-muted-foreground flex-shrink-0 overflow-hidden">
        <span className="flex-shrink-0 flex items-center gap-2 mr-4">
          <span className="w-2 h-2 rounded-full bg-success" />
          {t("central.dbSync")}
        </span>
        <span className="text-muted-foreground mr-4">|</span>
        <div className="overflow-hidden flex-1">
          <p className="animate-marquee whitespace-nowrap">
            {t("central.ticker")}
          </p>
        </div>
        <span className="text-muted-foreground ml-4">|</span>
        <span className="flex-shrink-0 ml-4 font-mono">{t("central.version")}</span>
      </footer>
    </div>
  );
}
