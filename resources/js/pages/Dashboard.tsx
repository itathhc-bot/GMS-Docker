import { ClipboardList, AlertTriangle, Package, Users, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/api/reports";
import { getJobCards } from "@/api/jobCards";

function formatAgeing(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: dashData, isLoading: loading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 30000,
  });

  const { data: jobsData } = useQuery({
    queryKey: ["job-cards", "dashboard-recent"],
    queryFn: () => getJobCards({ per_page: 10, sort: "-created_at" }),
  });

  const jobs: any[] = jobsData?.data ?? [];
  const stats = {
    activeJobs:    dashData?.active_jobs     ?? 0,
    slaBreaches:   dashData?.sla_breaches    ?? 0,
    pendingParts:  dashData?.pending_parts   ?? 0,
    vehicleCount:  dashData?.vehicle_count   ?? 0,
  };

  const colors = ["hsl(220,70%,50%)","hsl(38,92%,50%)","hsl(0,72%,51%)","hsl(142,72%,40%)","hsl(280,60%,50%)"];
  const workload: { name: string; value: number; color: string }[] = dashData?.workload
    ? Object.entries(dashData.workload as Record<string,number>).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }))
    : [];

  const repairTrends: { month: string; jobs: number }[] = dashData?.repair_trends ?? [];
  const recentJobs: any[] = jobs.slice(0, 8);



  const totalActive = workload.reduce((s, w) => s + w.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />) : (
          <>
            <StatCard title={t("dashboard.activeJobs")} value={stats.activeJobs} subtitle={t("dashboard.currentlyOpen")} icon={ClipboardList} />
            <StatCard title={t("dashboard.slaBreaches")} value={String(stats.slaBreaches).padStart(2, "0")} subtitle={t("dashboard.requiresAction")} icon={AlertTriangle} variant="destructive" />
            <StatCard title={t("dashboard.pendingParts")} value={stats.pendingParts} subtitle={t("dashboard.awaitingApproval")} icon={Package} variant="warning" />
            <StatCard title={t("dashboard.totalVehicles")} value={stats.vehicleCount} subtitle={t("dashboard.registeredFleet")} icon={Users} variant="success" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">{t("dashboard.repairTrends")}</h3>
              <p className="text-xs text-muted-foreground">{t("dashboard.repairTrendsSub")}</p>
            </div>
            <span className="text-xs text-muted-foreground">{t("dashboard.last6Months")}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={repairTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="jobs" name={t("dashboard.activeJobs")} fill="hsl(220, 70%, 50%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">{t("dashboard.workload")}</h3>
            <p className="text-xs text-muted-foreground">{t("dashboard.workloadSub")}</p>
          </div>
          {loading ? <Skeleton className="h-[180px]" /> : workload.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={workload} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {workload.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">{t("dashboard.noActiveJobs")}</div>
          )}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("dashboard.totalActive")}</p>
            <p className="text-2xl font-bold">{totalActive}</p>
          </div>
        </Card>
      </div>

      {/* Recent Jobs table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">{t("dashboard.recentJobs")}</h3>
            <p className="text-xs text-muted-foreground">{t("dashboard.recentJobsSub")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/job-cards")}>{t("dashboard.viewAllJobs")}</Button>
            <Button size="sm" className="text-xs" onClick={() => navigate("/job-cards")}><Plus className="w-3 h-3 me-1" /> {t("dashboard.newJobCard")}</Button>
          </div>
        </div>
        {loading ? <Skeleton className="h-48" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">{t("dashboard.table.jobId")}</TableHead>
                <TableHead className="text-[11px]">{t("dashboard.table.vehicle")}</TableHead>
                <TableHead className="text-[11px]">{t("dashboard.table.status")}</TableHead>
                <TableHead className="text-[11px]">{t("dashboard.table.priority")}</TableHead>
                <TableHead className="text-[11px]">{t("dashboard.table.ageing")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-semibold text-sm">{job.job_number}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-sm">{(job.vehicles as any)?.plate_number ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{[(job.vehicles as any)?.make, (job.vehicles as any)?.model].filter(Boolean).join(" ") || "—"}</div>
                  </TableCell>
                  <TableCell><StatusBadge status={job.status} /></TableCell>
                  <TableCell><PriorityBadge priority={job.priority} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatAgeing(job.created_at)}</TableCell>
                </TableRow>
              ))}
              {recentJobs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("dashboard.noJobs")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
        <p className="text-xs text-muted-foreground mt-3">{t("dashboard.showing", { shown: recentJobs.length, total: stats.activeJobs })}</p>
      </Card>
    </div>
  );
}
