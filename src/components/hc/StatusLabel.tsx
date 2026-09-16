// Label status HC Panel (docs/DESIGN.md §Komponen).
// Pil tinggi 22, padding 0 8, 12px 600, border garis.
// Status ditunjukkan lewat TEKS; warna sukses/peringatan hanya penegas.
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

type Nada = "netral" | "sukses" | "peringatan";

// Hanya status data yang boleh berwarna (§Batas gaya).
const NADA_STATUS: Record<Status, Nada> = {
  "Diterima":       "netral",
  "Sedang Ditinjau": "peringatan",
  "Tindak Lanjut":  "peringatan",
  "Selesai":        "sukses",
  "Ditutup":        "netral",
};

const KELAS_NADA: Record<Nada, string> = {
  netral:     "text-redup",
  sukses:     "text-sukses",
  peringatan: "text-peringatan",
};

export function StatusLabel({
  children,
  nada = "netral",
  className,
}: {
  children: React.ReactNode;
  nada?: Nada;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center rounded-full border border-garis px-2",
        "text-[12px] leading-none font-semibold whitespace-nowrap",
        KELAS_NADA[nada],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Label untuk status laporan — nadanya sudah dipetakan dari domain. */
export function StatusLabelLaporan({ status, className }: { status: Status; className?: string }) {
  return (
    <StatusLabel nada={NADA_STATUS[status]} className={className}>
      {status}
    </StatusLabel>
  );
}
