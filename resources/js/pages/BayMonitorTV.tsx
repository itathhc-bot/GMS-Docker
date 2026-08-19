import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, Clock, Wrench, Car, User, Hash, MessageSquare, ListOrdered, AlertCircle, Maximize2 } from "lucide-react";
import { getJobCards } from "@/api/jobCards";
import { getUsers } from "@/api/users";
import { getBayComments } from "@/api/bayComments";
import { useEcho } from "@/hooks/useEcho";


const normalizeBay = (b: string | null) => {
  if (!b) return null;
  const num = parseInt(b.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? b : `BAY ${String(num).padStart(2, "0")}`;
};

interface BayJob {
  id: string;
  job_number: string;
  description: string | null;
  status: string;
  priority: string;
  sla_hours: number | null;
  started_at: string | null;
  created_at: string;
  bay_number: string | null;
  assigned_to: string | null;
  vehicles?: { plate_number: string; make: string | null; model: string | null } | null;
}

interface BayComment {
  id: string;
  bay_number: string;
  author_name: string | null;
  comment: string;
  created_at: string;
}

function formatRemaining(slaHours: number | null, startedAt: string | null) {
  if (!slaHours || !startedAt) return { text: "—", percent: 0, breached: false };
  const elapsedH = (Date.now() - new Date(startedAt).getTime()) / 3600000;
  const remainingH = slaHours - elapsedH;
  const percent = Math.max(0, Math.min(100, (remainingH / slaHours) * 100));
  const breached = remainingH <= 0;
  const abs = Math.abs(remainingH);
  const hrs = Math.floor(abs);
  const mins = Math.floor((abs - hrs) * 60);
  const secs = Math.floor(((abs - hrs) * 60 - mins) * 60);
  const text = `${breached ? "-" : ""}${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return { text, percent, breached };
}

export default function BayMonitorTV() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ bayNumber: string }>();
  const bay = normalizeBay(decodeURIComponent(params.bayNumber || "BAY 01")) || "BAY 01";

  const [jobs, setJobs] = useState<BayJob[]>([]);
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<BayComment[]>([]);
  const [now, setNow] = useState(Date.now());
  const [clockNow, setClockNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Tick every second for SLA + clock
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setClockNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const all = await getJobCards() as any[];
      const activeJobs = all.filter((j) => j.status !== 'Completed' && j.status !== 'Closed');
      const bayJobs = activeJobs.filter((j) => normalizeBay(j.bay_number) === bay);
      setJobs(bayJobs);
      const ids = Array.from(new Set(bayJobs.map((j) => j.assigned_to).filter(Boolean)));
      if (ids.length) {
        const profs = await getUsers() as any[];
        const map: Record<string, string> = {};
        profs.forEach((p: any) => { map[p.id] = p.full_name || p.name; });
        setAssigneeNames(map);
      }
    } catch(e) { console.error(e); }
  }, [bay]);

  const loadComments = useCallback(async () => {
    try {
      const data = await getBayComments(bay);
      setComments(((data as any[]) ?? []).reverse());
    } catch(e) { console.error(e); }
  }, [bay]);

  useEffect(() => { loadJobs(); loadComments(); }, [loadJobs, loadComments]);

  // Realtime updates
  useEcho(`bay.${bay}`, 'BayCommentPosted', () => loadComments());
  useEcho('job-cards', 'JobCardStatusChanged', () => loadJobs());

  // Periodic safety refresh every 60s
  useEffect(() => {
    const id = setInterval(() => { loadJobs(); loadComments(); }, 60000);
    return () => clearInterval(id);
  }, [loadJobs, loadComments]);

  const currentJob = useMemo(() => {
    return (
      jobs.find((j) => j.status === "In Progress" || j.status === "Delayed") ??
      jobs.find((j) => j.started_at) ??
      jobs[0] ??
      null
    );
  }, [jobs]);

  const upcoming = useMemo(() => jobs.filter((j) => j !== currentJob).slice(0, 5), [jobs, currentJob]);

  const sla = useMemo(() => {
    if (!currentJob) return { text: "—", percent: 0, breached: false };
    void now;
    return formatRemaining(currentJob.sla_hours, currentJob.started_at);
  }, [currentJob, now]);

  const slaBg = sla.breached || sla.percent < 25 ? "bg-destructive" : sla.percent < 50 ? "bg-warning" : "bg-success";
  const slaText = sla.breached || sla.percent < 25 ? "text-destructive" : sla.percent < 50 ? "text-warning" : "text-success";

  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const locale = i18n.language === "ar" ? "ar-AE" : "en-AE";

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* TV Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b-2 border-border bg-card">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold">
              {t("common.appName")} · {t("bayMonitor.title")}
            </p>
            <h1 className="text-5xl font-black tracking-tight font-mono">{bay}</h1>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-end">
            <p className="text-5xl font-bold font-mono tabular-nums leading-none">
              {clockNow.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wider">
              {clockNow.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-success">{t("bayMonitor.live")}</span>
          </div>
          <button
            onClick={enterFullscreen}
            className="p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main grid */}
      <main className="flex-1 grid grid-cols-3 gap-6 p-8 overflow-hidden">
        {/* Current job — 2 cols */}
        <section className="col-span-2 flex flex-col gap-6 min-h-0">
          {!currentJob ? (
            <div className="flex-1 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center">
              <AlertCircle className="w-24 h-24 text-muted-foreground mb-6" />
              <p className="text-3xl text-muted-foreground font-semibold">{t("bayMonitor.noActiveJob")}</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-card border-2 border-border p-8 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground mb-2 font-semibold">
                      <Hash className="w-4 h-4 inline me-2" />{t("bayMonitor.jobNumber")}
                    </p>
                    <p className="text-6xl font-black font-mono">{currentJob.job_number}</p>
                  </div>
                  <span className={`px-5 py-2 rounded-full text-base font-bold uppercase tracking-wider border-2 ${
                    currentJob.priority === "HIGH" || currentJob.priority === "URGENT"
                      ? "bg-destructive/10 text-destructive border-destructive/40"
                      : currentJob.priority === "MEDIUM"
                      ? "bg-warning/10 text-warning border-warning/40"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {currentJob.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="rounded-xl bg-muted/40 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2 font-semibold">
                      <Car className="w-4 h-4 inline me-2" />{t("bayMonitor.vehicle")}
                    </p>
                    <p className="text-3xl font-bold font-mono">{currentJob.vehicles?.plate_number ?? "—"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {[currentJob.vehicles?.make, currentJob.vehicles?.model].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2 font-semibold">
                      <User className="w-4 h-4 inline me-2" />{t("bayMonitor.mechanic")}
                    </p>
                    <p className="text-2xl font-bold">
                      {currentJob.assigned_to ? assigneeNames[currentJob.assigned_to] ?? "—" : t("bayMonitor.unassigned")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wider">{currentJob.status}</p>
                  </div>
                </div>

                {currentJob.description && (
                  <div className="rounded-xl bg-muted/30 p-5 mb-6 flex-1 min-h-0">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2 font-semibold">
                      {t("bayMonitor.description")}
                    </p>
                    <p className="text-lg leading-relaxed line-clamp-4">{currentJob.description}</p>
                  </div>
                )}

                {/* SLA Section — Big */}
                <div className={`rounded-xl border-2 p-6 ${sla.breached || sla.percent < 25 ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}>
                  <div className="flex items-end justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Clock className={`w-7 h-7 ${slaText}`} />
                      <span className="text-base font-bold uppercase tracking-[0.25em] text-muted-foreground">
                        {t("bayMonitor.slaRemaining")}
                      </span>
                    </div>
                    <p className={`text-7xl font-black font-mono tabular-nums leading-none ${slaText}`}>
                      {sla.text}
                    </p>
                  </div>
                  <div className="w-full h-4 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${slaBg}`}
                      style={{ width: `${sla.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-muted-foreground uppercase tracking-wider">
                    <span>
                      {currentJob.started_at
                        ? `${t("bayMonitor.started")}: ${new Date(currentJob.started_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
                        : t("bayMonitor.notStarted")}
                    </span>
                    <span>{t("bayMonitor.slaTotal")}: {currentJob.sla_hours ?? "—"}h</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Right column: comments + upcoming */}
        <aside className="flex flex-col gap-6 min-h-0">
          {/* Comments */}
          <div className="rounded-2xl bg-card border-2 border-border p-6 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {t("bayMonitor.supervisorComments")}
              </h2>
            </div>
            <div className="flex-1 overflow-hidden space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-base text-muted-foreground py-8">{t("bayMonitor.noComments")}</p>
              ) : (
                comments.slice(-5).map((c) => (
                  <div key={c.id} className="rounded-xl bg-muted/40 p-4 border border-border">
                    <p className="text-base leading-snug">{c.comment}</p>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold">{c.author_name ?? "—"}</span>
                      <span className="font-mono">
                        {new Date(c.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="rounded-2xl bg-card border-2 border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <ListOrdered className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {t("bayMonitor.upcoming")}
              </h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">{t("bayMonitor.noUpcoming")}</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((j, idx) => (
                  <li key={j.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-base">{j.job_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{j.vehicles?.plate_number ?? "—"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="px-10 py-3 border-t-2 border-border bg-card flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted-foreground">
        <span><Activity className="w-3 h-3 inline me-2" />{t("bayMonitor.live")} · {t("bayMonitor.commentsHint")}</span>
        <span className="font-mono">{bay} · {jobs.length} active</span>
      </footer>
    </div>
  );
}
