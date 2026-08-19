import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity, ArrowLeft, Clock, MessageSquare, Send, Wrench, Car,
  CheckCircle, AlertCircle, ListOrdered, User, Hash, Tv,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getJobCards } from "@/api/jobCards";
import { getUsers } from "@/api/users";
import { getBayComments, createBayComment } from "@/api/bayComments";
import { useEcho } from "@/hooks/useEcho";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "sonner";

const BAY_LABELS = ["BAY 01", "BAY 02", "BAY 03", "BAY 04", "BAY 05", "BAY 06", "BAY 07", "BAY 08"];

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
  job_card_id: string | null;
  bay_number: string;
  author_user_id: string;
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
  const text = `${breached ? "-" : ""}${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  return { text, percent, breached };
}

export default function BayMonitor() {
  const { t, i18n } = useTranslation();
  const { user, profile, hasRole } = useAuth();
  const canComment = hasRole("supervisor") || hasRole("admin");

  const [selectedBay, setSelectedBay] = useState<string>("BAY 01");
  const [allJobs, setAllJobs] = useState<BayJob[]>([]);
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<BayComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Tick every second for SLA countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const jobs = await getJobCards() as any[];
      const activeJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Closed');
      setAllJobs(activeJobs);

      // Load assignee names
      const ids = Array.from(new Set(activeJobs.map((j) => j.assigned_to).filter(Boolean)));
      if (ids.length) {
        const users = await getUsers() as any[];
        const map: Record<string, string> = {};
        users.forEach((p: any) => { map[p.id] = p.full_name || p.name; });
        setAssigneeNames(map);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadComments = useCallback(async (bay: string) => {
    try {
      const data = await getBayComments(bay);
      setComments((data as any[]) ?? []);
    } catch(e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { loadComments(selectedBay); }, [selectedBay, loadComments]);

  // Realtime: jobs + comments
  useEcho(`bay.${selectedBay}`, 'BayCommentPosted', (payload: any) => {
    setComments((prev) => [...prev, payload.comment]);
  });
  useEcho('job-cards', 'JobCardStatusChanged', () => {
    loadJobs();
  });

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const bayJobs = useMemo(() => {
    return allJobs.filter((j) => normalizeBay(j.bay_number) === selectedBay);
  }, [allJobs, selectedBay]);

  // Current job: in-progress / started, else first non-vacant
  const currentJob = useMemo(() => {
    return (
      bayJobs.find((j) => j.status === "In Progress" || j.status === "Delayed") ??
      bayJobs.find((j) => j.started_at) ??
      bayJobs[0] ??
      null
    );
  }, [bayJobs]);

  const upcomingJobs = useMemo(() => {
    return bayJobs.filter((j) => j !== currentJob).slice(0, 6);
  }, [bayJobs, currentJob]);

  // Recompute SLA each tick using current `now`
  const sla = useMemo(() => {
    if (!currentJob) return { text: "—", percent: 0, breached: false };
    void now; // tick
    return formatRemaining(currentJob.sla_hours, currentJob.started_at);
  }, [currentJob, now]);

  const handlePost = async () => {
    const text = newComment.trim();
    if (!text || !user) return;
    setPosting(true);
    try {
      await createBayComment({
        bay_number: selectedBay,
        job_card_id: currentJob?.id ?? null,
        comment: text,
      } as any);
      setNewComment("");
      toast.success(t("bayMonitor.commentPosted"));
      loadComments(selectedBay);
    } catch(e) {
      toast.error(t("bayMonitor.commentFailed"));
    } finally {
      setPosting(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language === "ar" ? "ar-AE" : "en-AE", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const slaBarColor = sla.breached ? "bg-destructive" : sla.percent < 25 ? "bg-destructive" : sla.percent < 50 ? "bg-warning" : "bg-success";
  const slaTextColor = sla.breached || sla.percent < 25 ? "text-destructive" : sla.percent < 50 ? "text-warning" : "text-success";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm tracking-wider uppercase">{t("bayMonitor.title")}</span>
            <span className="text-muted-foreground text-sm">|</span>
            <span className="text-sm text-muted-foreground">{t("bayMonitor.subtitle")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-xs font-medium text-success uppercase">{t("bayMonitor.live")}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Bay selector */}
      <div className="border-b bg-card/50 px-6 py-3 flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("bayMonitor.selectBay")}
        </span>
        <Select value={selectedBay} onValueChange={setSelectedBay}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BAY_LABELS.map((b) => {
              const has = allJobs.some((j) => normalizeBay(j.bay_number) === b);
              return (
                <SelectItem key={b} value={b}>
                  <span className="flex items-center gap-2">
                    {b}
                    {has && <span className="w-2 h-2 rounded-full bg-success" />}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/bay-tv/${encodeURIComponent(selectedBay)}`, "_blank", "noopener")}
          className="h-9"
        >
          <Tv className="w-4 h-4 me-2" />
          {t("bayExtra.openOnTv")}
        </Button>
        <div className="ms-auto text-xs text-muted-foreground font-mono">
          {t("bayExtra.jobs", { count: bayJobs.length })}
        </div>
      </div>

      {/* Content grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 overflow-auto">
        {/* Current job (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                {t("bayMonitor.currentJob")}
              </h2>
              {currentJob && <StatusBadge status={currentJob.status} />}
            </div>

            {loading ? (
              <Skeleton className="h-40" />
            ) : !currentJob ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("bayMonitor.noActiveJob")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      <Hash className="w-3 h-3 inline me-1" />{t("bayMonitor.jobNumber")}
                    </p>
                    <p className="text-lg font-bold font-mono">{currentJob.job_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      <Car className="w-3 h-3 inline me-1" />{t("bayMonitor.vehicle")}
                    </p>
                    <p className="text-lg font-bold font-mono">{currentJob.vehicles?.plate_number ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[currentJob.vehicles?.make, currentJob.vehicles?.model].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      <User className="w-3 h-3 inline me-1" />{t("bayMonitor.mechanic")}
                    </p>
                    <p className="text-sm font-semibold">
                      {currentJob.assigned_to ? assigneeNames[currentJob.assigned_to] ?? "—" : t("bayMonitor.unassigned")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("common.priority")}</p>
                    <PriorityBadge priority={currentJob.priority} />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("bayMonitor.description")}</p>
                  <p className="text-sm">{currentJob.description || <span className="text-muted-foreground italic">{t("bayMonitor.noDescription")}</span>}</p>
                </div>

                {/* SLA */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider">{t("bayMonitor.slaRemaining")}</span>
                    </div>
                    <p className={`text-2xl font-bold font-mono tabular-nums ${slaTextColor}`}>{sla.text}</p>
                  </div>
                  <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${slaBarColor}`}
                      style={{ width: `${sla.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>
                      {currentJob.started_at
                        ? `${t("bayMonitor.started")}: ${new Date(currentJob.started_at).toLocaleString(i18n.language === "ar" ? "ar-AE" : "en-AE")}`
                        : t("bayMonitor.notStarted")}
                    </span>
                    <span>
                      {t("bayMonitor.slaTotal")}: {currentJob.sla_hours ?? "—"}h
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Upcoming jobs */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ListOrdered className="w-4 h-4" />
                {t("bayMonitor.upcoming")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("bayMonitor.upcomingHint")}</p>
            </div>

            {loading ? (
              <Skeleton className="h-32" />
            ) : upcomingJobs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("bayMonitor.noUpcoming")}</p>
            ) : (
              <ul className="space-y-2">
                {upcomingJobs.map((j, idx) => (
                  <li key={j.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold text-sm">{j.job_number}</p>
                        <PriorityBadge priority={j.priority} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {j.vehicles?.plate_number ?? "—"} · {j.description || t("bayMonitor.noDescription")}
                      </p>
                    </div>
                    <StatusBadge status={j.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Comments column */}
        <Card className="flex flex-col h-[calc(100vh-14rem)] lg:h-auto lg:max-h-[calc(100vh-10rem)]">
          <div className="p-5 border-b">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t("bayMonitor.supervisorComments")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("bayMonitor.commentsHint")}</p>
          </div>

          <ScrollArea className="flex-1 p-4">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("bayMonitor.noComments")}</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => {
                  const mine = c.author_user_id === user?.id;
                  return (
                    <li key={c.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{c.comment}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">
                        {c.author_name ?? t("bayExtra.supervisor")} · {formatTime(c.created_at)}
                      </p>
                    </li>
                  );
                })}
                <div ref={commentsEndRef} />
              </ul>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-card">
            {canComment ? (
              <div className="flex gap-2">
                <Textarea
                  placeholder={t("bayMonitor.addComment")}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
                  }}
                  rows={2}
                  className="resize-none text-sm"
                />
                <Button
                  size="icon"
                  onClick={handlePost}
                  disabled={!newComment.trim() || posting}
                  title={t("bayMonitor.post")}
                >
                  <Send className="w-4 h-4 rtl:-scale-x-100" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center italic">
                {t("bayExtra.onlySupervisorsCanPost")}
              </p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
