"use client";

import { User, Mail, CreditCard, Briefcase, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { SUB_ROLE_LABEL } from "@/lib/constants";
import { DotGrid } from "@/components/ui/DotGrid";

export default function ProfilPage() {
  const { user } = useAuth();
  const { reports } = useStore();

  if (!user) return null;

  const initials = user.nama
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  const isKaryawan = user.role === "karyawan";
  const roleLabel =
    user.role === "admin"
      ? user.subRole
        ? SUB_ROLE_LABEL[user.subRole]
        : "Admin"
      : "Karyawan";

  // Stats hanya untuk karyawan
  const totalTickets = reports.length;
  const activeTickets = reports.filter(
    (r) => !["Selesai", "Ditutup"].includes(r.status),
  ).length;
  const resolvedTickets = reports.filter((r) =>
    ["Selesai", "Ditutup"].includes(r.status),
  ).length;

  const infoRows = [
    { icon: <User className="h-4 w-4" />, label: "Nama lengkap", value: user.nama },
    { icon: <CreditCard className="h-4 w-4" />, label: "NIK", value: user.nik },
    { icon: <Mail className="h-4 w-4" />, label: "Email", value: user.email },
    { icon: <Briefcase className="h-4 w-4" />, label: "Peran", value: roleLabel },
  ];

  return (
    <div className="space-y-5">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-[20px] border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, #C95BC5 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-[60px] left-1/4 h-[180px] w-[180px] rounded-full"
          style={{ background: "radial-gradient(circle, #5B5BD6 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #8A5BD6, #C95BC5)", WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)", maskImage: "radial-gradient(circle, black 1px, transparent 1px)", WebkitMaskSize: "22px 22px", maskSize: "22px 22px", opacity: 0.2, animation: "hero-dots 8s linear infinite" }} />

        <div className="relative">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg" style={{ background: "linear-gradient(135deg, #5B5BD6, #C95BC5)" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold leading-tight text-ink sm:text-2xl">{user.nama}</h1>
              <p className="mt-0.5 truncate text-sm text-ink-secondary">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/20">
                  <Briefcase className="h-3 w-3" />
                  {roleLabel}
                </span>
                {user.canEscalate && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800">
                    <Shield className="h-3 w-3" />
                    Eskalasi
                  </span>
                )}
              </div>
            </div>
          </div>

          {isKaryawan && (
            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
              <StatChip label="Total Tiket" value={totalTickets} />
              <StatChip label="Aktif" value={activeTickets} accent />
              <StatChip label="Selesai" value={resolvedTickets} />
            </div>
          )}
        </div>
      </div>

      {/* ── Informasi Akun ── */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
        <div className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-700/60">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Informasi Akun
          </h2>
        </div>
        <dl className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {infoRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-4 px-5 py-3.5"
            >
              <span className="shrink-0 text-slate-400 dark:text-slate-500">
                {row.icon}
              </span>
              <dt className="w-32 shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500">
                {row.label}
              </dt>
              <dd className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Catatan ── */}
      <p className="px-1 text-xs text-slate-400 dark:text-slate-500">
        Perubahan data akun (nama, NIK, email) dilakukan melalui sistem HR
        perusahaan. Untuk ganti kata sandi, buka{" "}
        <a
          href="/pengaturan"
          className="font-medium text-blue-500 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Pengaturan → Keamanan
        </a>
        .
      </p>
    </div>
  );
}

/* ── Sub-komponen ── */

function StatChip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface-raised px-4 py-2.5 ring-1 ring-line">
      <p className={`text-xl font-bold ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
      <p className="text-xs text-ink-secondary">{label}</p>
    </div>
  );
}
