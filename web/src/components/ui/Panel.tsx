import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Bagian-bagian halaman detail tiket/laporan yang dipakai bersama oleh
// /tiket/[id] (admin) dan /laporan/[id] (karyawan).

/** Kartu ber-judul: header + body berpadding konsisten. */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700/60">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </div>
  );
}

/** Chip kecil di hero gradient (ikon + label, frosted). */
export function HeroChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/20 backdrop-blur-sm">
      {icon}
      {label}
    </span>
  );
}

/** Pasangan label–nilai untuk grid metadata tiket (dipakai dalam <dl>). */
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
    <div>
      <dt className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
        {icon}
        {value}
      </dd>
    </div>
  );
}

/** Kotak waktu masuk/selesai untuk tracking SLA. */
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
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          muted
            ? "text-slate-400 dark:text-slate-500"
            : "text-slate-700 dark:text-slate-200",
        )}
      >
        {value}
      </p>
    </div>
  );
}
