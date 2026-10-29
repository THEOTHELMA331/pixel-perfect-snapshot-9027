import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/lib/types";

export function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        p === "high" && "bg-destructive/10 text-destructive",
        p === "medium" && "bg-warning-soft text-foreground",
        p === "low" && "bg-secondary text-muted-foreground",
      )}
    >
      {p}
    </span>
  );
}

export function StatusBadge({ s }: { s: TaskStatus }) {
  const label = { todo: "To do", in_progress: "In progress", done: "Done" }[s];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        s === "done" && "bg-success-soft text-success",
        s === "in_progress" && "bg-accent text-accent-foreground",
        s === "todo" && "bg-secondary text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
