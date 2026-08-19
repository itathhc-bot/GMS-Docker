import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";

import { toast } from "sonner";
import JobCardDetailDialog from "@/components/jobcards/JobCardDetailDialog";
import { getJobCards } from "@/api/jobCards";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleId: string | null;
  plateNumber?: string;
}

interface JobRow {
  id: string;
  job_number: string;
  status: string;
  priority: string;
  bay_number: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function VehicleHistoryDialog({ open, onOpenChange, vehicleId, plateNumber }: Props) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !vehicleId) return;
    setLoading(true);
    getJobCards({ vehicle_id: vehicleId, sort: '-created_at' })
      .then((data) => {
        setJobs(data as any);
        setLoading(false);
      })
      .catch(() => {
        toast.error(t("scan.history.loadFailed"));
        setLoading(false);
      });
  }, [open, vehicleId, t]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("scan.history.title")}</DialogTitle>
            <DialogDescription>
              {plateNumber
                ? t("scan.history.subtitleFor", { plate: plateNumber })
                : t("scan.history.subtitle")}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : jobs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("scan.history.empty")}</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("jobCards.table.jobId")}</TableHead>
                    <TableHead>{t("jobCards.table.priority")}</TableHead>
                    <TableHead>{t("jobCards.table.status")}</TableHead>
                    <TableHead>{t("jobCards.table.bay")}</TableHead>
                    <TableHead>{t("jobCards.table.created")}</TableHead>
                    <TableHead>{t("scan.history.completed")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow
                      key={j.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailId(j.id)}
                    >
                      <TableCell className="font-semibold text-primary">{j.job_number}</TableCell>
                      <TableCell><PriorityBadge priority={j.priority} /></TableCell>
                      <TableCell><StatusBadge status={j.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{j.bay_number || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {j.completed_at ? new Date(j.completed_at).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <JobCardDetailDialog
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        jobCardId={detailId}
      />
    </>
  );
}
