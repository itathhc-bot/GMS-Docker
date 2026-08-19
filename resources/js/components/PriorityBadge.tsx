import { Badge } from "@/components/ui/badge";

const priorityStyles: Record<string, string> = {
  HIGH: "priority-high",
  MEDIUM: "priority-medium",
  LOW: "priority-low",
  EMERGENCY: "bg-emergency/10 text-emergency font-bold",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={`${priorityStyles[priority] || ""} border-none text-[10px] px-2`}>
      {priority}
    </Badge>
  );
}
