import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, Download, Calendar, ClipboardList, Car, Package, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import StatCard from "@/components/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getJobCardReport, getVehicleReport, getPartsReport } from "@/api/reports";


const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PIE_COLORS = ["hsl(220, 70%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(142, 72%, 40%)", "hsl(280, 60%, 50%)"];

export default function Reports() {
  const { t } = useTranslation();
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({ queryKey: ['report-jobs'], queryFn: () => getJobCardReport() });
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery({ queryKey: ['report-vehicles'], queryFn: () => getVehicleReport() });
  const { data: parts = [], isLoading: isLoadingParts } = useQuery({ queryKey: ['report-parts'], queryFn: () => getPartsReport() });
  
  const loading = isLoadingJobs || isLoadingVehicles || isLoadingParts;

  // Compute stats on the fly
  const completedJobs = jobs.filter((j: any) => j.status === "Completed" || j.status === "Closed").length;
  const stats = {
    totalJobs: jobs.length,
    completedJobs,
    totalVehicles: vehicles.length,
    totalParts: parts.length,
  };

  const now = new Date();
  const monthlyMap: Record<string, { completed: number; active: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap[`${MONTH_NAMES[d.getMonth()]}`] = { completed: 0, active: 0 };
  }
  jobs.forEach((j: any) => {
    if (!j.created_at) return;
    const d = new Date(j.created_at);
    const key = MONTH_NAMES[d.getMonth()];
    if (key in monthlyMap) {
      if (j.status === "Completed" || j.status === "Closed") {
        monthlyMap[key].completed++;
      } else {
        monthlyMap[key].active++;
      }
    }
  });
  const monthlyData = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

  const statusMap: Record<string, number> = {};
  jobs.forEach((j: any) => { if (j.status) statusMap[j.status] = (statusMap[j.status] || 0) + 1; });
  const statusDist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const prioMap: Record<string, number> = {};
  jobs.forEach((j: any) => { if (j.priority) prioMap[j.priority] = (prioMap[j.priority] || 0) + 1; });
  const priorityDist = Object.entries(prioMap).map(([name, value]) => ({ name, value }));

  const partsMonthMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    partsMonthMap[MONTH_NAMES[d.getMonth()]] = 0;
  }
  parts.forEach((p: any) => {
    if (!p.created_at) return;
    const key = MONTH_NAMES[new Date(p.created_at).getMonth()];
    if (key in partsMonthMap) partsMonthMap[key]++;
  });
  const partsStats = Object.entries(partsMonthMap).map(([month, requests]) => ({ month, requests }));

  const completionRate = stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Calendar className="w-3.5 h-3.5 mr-1" /> {t("reports.dateRange")}</Button>
          <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1" /> {t("reports.exportPdf")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : (
          <>
            <StatCard title={t("reports.totalJobs")} value={stats.totalJobs} subtitle={t("reports.allTime")} icon={ClipboardList} />
            <StatCard title={t("reports.completionRate")} value={`${completionRate}%`} subtitle={t("reports.completedCount", { count: stats.completedJobs })} icon={CheckCircle} variant="success" />
            <StatCard title={t("reports.fleetSize")} value={stats.totalVehicles} subtitle={t("reports.registeredVehicles")} icon={Car} />
            <StatCard title={t("reports.partsRequests")} value={stats.totalParts} subtitle={t("reports.allTime")} icon={Package} variant="warning" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">{t("reports.monthlyCompletion")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("reports.monthlyCompletionSub")}</p>
          {loading ? <Skeleton className="h-[220px]" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completed" name={t("reports.completed")} fill="hsl(142, 72%, 40%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="active" name={t("reports.active")} fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">{t("reports.partsTrend")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("reports.partsTrendSub")}</p>
          {loading ? <Skeleton className="h-[220px]" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={partsStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="requests" name={t("reports.requests")} stroke="hsl(220, 70%, 50%)" fill="hsl(220, 70%, 50%)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">{t("reports.statusDist")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("reports.statusDistSub")}</p>
          {loading ? <Skeleton className="h-[220px]" /> : statusDist.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusDist.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">{t("reports.noData")}</div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">{t("reports.priorityDist")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("reports.priorityDistSub")}</p>
          {loading ? <Skeleton className="h-[220px]" /> : priorityDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" name={t("reports.jobs")} fill="hsl(220, 70%, 50%)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">{t("reports.noData")}</div>
          )}
        </Card>
      </div>
    </div>
  );
}
