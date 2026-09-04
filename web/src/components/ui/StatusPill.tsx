import { STATUS_STYLES } from "@/lib/constants";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

// Dark mode equivalents untuk tiap status
const STATUS_DARK_STYLES: Record<Status, string> = {
  Diterima:          "dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-700",
  "Sedang Ditinjau": "dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-700",
  "Tindak Lanjut":   "dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-700",
  Selesai:           "dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700",
  Ditutup:           "dark:bg-slate-700/50 dark:text-slate-400 dark:ring-slate-600",
};

export function StatusPill({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5",
        "text-xs font-semibold ring-1 ring-inset",
        STATUS_STYLES[status],
        STATUS_DARK_STYLES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
