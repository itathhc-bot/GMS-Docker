import { Badge } from "@/components/ui/badge";

type Status = "In Progress" | "Pending Parts" | "Quality Control" | "Completed" | "Delayed" | "Awaiting Review";

const statusStyles: Record<string, string> = {
  "In Progress": "status-badge-progress",
  "Pending Parts": "status-badge-pending",
  "Quality Control": "status-badge-progress",
  "Completed": "status-badge-completed",
  "Delayed": "status-badge-delayed",
  "Awaiting Review": "status-badge-pending",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`${statusStyles[status] || "status-badge-progress"} border-none text-[11px] font-medium`}>
      {status}
    </Badge>
  );
}
