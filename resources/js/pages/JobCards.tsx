import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Filter, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import JobCardWizard from "@/components/jobcards/JobCardWizard";
import JobCardDetailDialog from "@/components/jobcards/JobCardDetailDialog";
import JobCardEditDialog from "@/components/jobcards/JobCardEditDialog";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface JobCard {
  id: string;
  job_number: string;
  vehicle_id: string | null;
  bay_number: string | null;
  status: string;
  priority: string;
  description: string | null;
  created_at: string;
  vehicles?: { plate_number: string; make: string | null; model: string | null; year: number | null } | null;
}

function extractTitle(description: string | null): string {
  if (!description) return "—";
  const match = description.match(/^(?:Title|العنوان):\s*(.+?)(?:\n|$)/);
  if (match) return match[1].trim();
  // fallback: first line truncated
  const first = description.split("\n")[0].trim();
  return first.length > 60 ? first.slice(0, 60) + "…" : first || "—";
}

export default function JobCards() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canCreate = hasRole("admin") || hasRole("supervisor");
  const canEdit = hasRole("admin") || hasRole("supervisor");
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [prefillPlate, setPrefillPlate] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_cards")
      .select("*, vehicles(plate_number, make, model, year)")
      .order("created_at", { ascending: false });
    if (error) toast.error(t("jobCards.form.loadFailed"));
    else setJobs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  // Auto-open wizard with prefilled vehicle when navigated from Vehicle Scan
  useEffect(() => {
    const state = location.state as { openWizard?: boolean; prefillPlate?: string } | null;
    if (!state?.openWizard || !canCreate) return;

    const plate = state.prefillPlate?.trim();
    // Always clear state immediately so refresh doesn't re-open the wizard
    navigate(location.pathname, { replace: true });

    if (!plate) {
      setPrefillPlate(undefined);
      setWizardOpen(true);
      return;
    }

    // Verify the plate exists before opening the wizard
    (async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number")
        .ilike("plate_number", plate)
        .maybeSingle();
      if (error) {
        toast.error(t("jobCards.form.loadFailed"));
        return;
      }
      if (!data) {
        toast.error(t("jobCards.plateNotFound", { plate }));
        return;
      }
      setPrefillPlate(data.plate_number);
      setWizardOpen(true);
    })();
  }, [location.state, canCreate, navigate, location.pathname, t]);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      j.job_number.toLowerCase().includes(q) ||
      j.vehicles?.plate_number?.toLowerCase().includes(q) ||
      extractTitle(j.description).toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("jobCards.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("jobCards.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
            {t("jobCards.createJobCard")}
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("jobCards.searchPlaceholder2")}
            className="pl-9 rtl:pl-3 rtl:pr-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-11">
            <Filter className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("jobCards.statusFilter.all")}</SelectItem>
            <SelectItem value="Open">{t("common.open", "Open")}</SelectItem>
            <SelectItem value="In Progress">{t("jobCards.statusFilter.inProgress")}</SelectItem>
            <SelectItem value="Completed">{t("common.completed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("jobCards.loading")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] tracking-wide">{t("jobCards.table.jobId")}</TableHead>
                <TableHead className="text-[11px] tracking-wide">{t("jobCards.table.vehicle")}</TableHead>
                <TableHead className="text-[11px] tracking-wide">{t("jobCards.table.title2")}</TableHead>
                <TableHead className="text-[11px] tracking-wide">{t("jobCards.table.priority")}</TableHead>
                <TableHead className="text-[11px] tracking-wide">{t("jobCards.table.status")}</TableHead>
                <TableHead className="text-[11px] tracking-wide">{t("jobCards.table.bay")}</TableHead>
                <TableHead className="text-[11px] tracking-wide">{t("jobCards.table.created")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow key={job.id} className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-sm text-primary">{job.job_number}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-sm">{job.vehicles?.plate_number || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[job.vehicles?.make, job.vehicles?.model].filter(Boolean).join(" ")}
                      {job.vehicles?.year ? ` (${job.vehicles.year})` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm max-w-[220px] truncate">{extractTitle(job.description)}</TableCell>
                  <TableCell><PriorityBadge priority={job.priority} /></TableCell>
                  <TableCell><StatusBadge status={job.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.bay_number || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailId(job.id)}>
                          {t("jobCards.actions.viewDetails")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditId(job.id)} disabled={!canEdit}>
                          {t("jobCards.actions.editJob")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{t("jobCards.noJobs")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
        <div className="px-5 py-3 text-xs text-muted-foreground border-t border-border">
          {t("jobCards.showingCount", { shown: filtered.length, total: jobs.length })}
        </div>
      </Card>

      <JobCardWizard
        open={wizardOpen}
        onOpenChange={(v) => { setWizardOpen(v); if (!v) setPrefillPlate(undefined); }}
        onCreated={fetchJobs}
        prefillPlate={prefillPlate}
      />
      <JobCardDetailDialog
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        jobCardId={detailId}
      />
      <JobCardEditDialog
        open={!!editId}
        onOpenChange={(v) => !v && setEditId(null)}
        jobCardId={editId}
        onSaved={fetchJobs}
      />
    </div>
  );
}
