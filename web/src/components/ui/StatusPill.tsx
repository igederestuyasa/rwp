import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

// Label status sistem UI "HC Panel" (docs/DESIGN.md §Komponen):
// pil tinggi 22, padding 0 8, 12px 600, border garis.
// Hanya status data yang berwarna, sisanya netral (§Batas gaya).
const NADA_STATUS: Record<Status, string> = {
  Diterima: "text-redup",
  "Sedang Ditinjau": "text-peringatan",
  "Tindak Lanjut": "text-peringatan",
  Selesai: "text-sukses",
  Ditutup: "text-redup",
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
        "inline-flex h-[22px] items-center whitespace-nowrap rounded-full",
        "border border-garis bg-kartu px-2 text-mikro font-semibold",
        NADA_STATUS[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
