import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Bagian-bagian halaman detail tiket/laporan yang dipakai bersama oleh
// /tiket/[id] (admin) dan /laporan/[id] (karyawan).
// Mengikuti sistem UI "HC Panel" (docs/DESIGN.md §Pola daftar-detail).

/** Panel berjudul: radius 24, padding 24, border garis, latar kartu, tanpa bayangan. */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-garis bg-kartu p-4 sm:p-6">
      <h2 className="text-bantu font-[650] text-tinta">{title}</h2>
      {/* Garis pemisah antara kepala panel dan isinya. */}
      <div className="mt-4 border-t border-garis pt-4">{children}</div>
    </div>
  );
}

/** Chip kecil di kepala halaman (ikon + label), berbentuk pil. */
export function HeroChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-garis bg-latar px-2.5 py-1 text-mikro font-semibold text-redup">
      {icon}
      {label}
    </span>
  );
}

/** Baris <dl> dua kolom: label redup di kiri, nilai di kanan. */
export function MetaField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-bantu text-redup">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-right text-bantu font-medium text-tinta">
        {icon}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

/** Kotak waktu masuk/selesai untuk pelacakan SLA. */
export function SlaBox({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-input)] border border-garis bg-latar px-4 py-3">
      <p className="text-mikro font-semibold text-redup">{label}</p>
      <p
        className={cn(
          "mt-1 text-bantu font-medium",
          muted ? "text-redup" : "text-tinta",
        )}
      >
        {value}
      </p>
    </div>
  );
}
