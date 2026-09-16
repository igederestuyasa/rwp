"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { SUB_ROLE_LABEL } from "@/lib/constants";
import { StatusLabel } from "@/components/hc/StatusLabel";
import { Panel, MetaField } from "@/components/ui/Panel";

export default function ProfilPage() {
  const { user } = useAuth();
  const { reports } = useStore();

  if (!user) return null;

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
    { label: "Nama lengkap", value: user.nama },
    { label: "NIK", value: user.nik },
    { label: "Email", value: user.email },
    { label: "Peran", value: roleLabel },
  ];

  return (
    <div>
      {/* ── Pembuka layar ── */}
      <h1
        className="pembuka-masuk text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
        style={{ animationDelay: "0ms" }}
      >
        {user.nama}
      </h1>
      <p
        className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
        style={{ animationDelay: "60ms" }}
      >
        {user.email}
      </p>
      <div
        className="pembuka-masuk mt-5 flex flex-wrap gap-2"
        style={{ animationDelay: "110ms" }}
      >
        <StatusLabel>{roleLabel}</StatusLabel>
        {user.canEscalate && <StatusLabel nada="peringatan">Eskalasi</StatusLabel>}
      </div>

      {/* ── Ringkasan tiket (karyawan) ── */}
      {isKaryawan && (
        <div className="mt-8 grid grid-cols-3 gap-3">
          <StatChip label="Total" value={totalTickets} />
          <StatChip label="Aktif" value={activeTickets} />
          <StatChip label="Selesai" value={resolvedTickets} />
        </div>
      )}

      {/* ── Informasi akun ── */}
      <section className="mt-8">
        <Panel title="Informasi akun">
          <dl className="space-y-3">
            {infoRows.map((row) => (
              <MetaField key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </Panel>
      </section>

      {/* ── Catatan ── */}
      <p className="mt-4 max-w-[60ch] text-bantu leading-[1.5] text-redup">
        Perubahan data akun (nama, NIK, email) dilakukan melalui sistem HR perusahaan.
        Untuk ganti kata sandi, buka{" "}
        <Link
          href="/pengaturan"
          className="font-medium text-tinta underline underline-offset-2"
        >
          Pengaturan → Keamanan
        </Link>
        .
      </p>
    </div>
  );
}

/* ── Sub-komponen ── */

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-kartu)] border border-garis bg-kartu px-4 py-3">
      <p className="text-panel font-bold leading-none tabular tracking-[-0.025em] text-tinta">
        {value}
      </p>
      <p className="mt-2 text-bantu text-redup">{label}</p>
    </div>
  );
}
