import type { WeekStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const labels: Record<WeekStatus, string> = {
  open: "Aberta",
  reconciled: "Conciliada",
  closed: "Fechada",
};

const colors: Record<WeekStatus, string> = {
  open: "bg-sky-100 text-sky-800 border-sky-200",
  reconciled: "bg-amber-100 text-amber-800 border-amber-200",
  closed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function WeekStatusBadge({ status }: { status: WeekStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        colors[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
