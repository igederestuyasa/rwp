// Indikator memuat (docs/DESIGN.md §Komponen — keadaan halaman).
// Dipakai daftar dan detail saat data store belum tiba, supaya keadaan
// "sedang memuat" tidak tampil sebagai "tidak ditemukan".

import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function MemuatHC({ teks = "Memuat…", className }: { teks?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-2 py-16 text-bantu text-redup", className)}
    >
      <CircleNotch size={20} aria-hidden="true" className="animate-spin" />
      {teks}
    </div>
  );
}
