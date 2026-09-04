"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, ListChecks, Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { STATUSES } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";
import { StatusPill } from "@/components/ui/StatusPill";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE = 20;

export default function TiketPage() {
  const { user } = useAuth();
  const { reports } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fStatus, setFStatus] = useState(searchParams.get("status") ?? "");
  const [fDate, setFDate] = useState("");
  const [page, setPage] = useState(0);

  // Sinkronkan filter status dari URL (mis. diklik dari dashboard) ke state lokal
  // saat parameter berubah (adjust state during render).
  const statusParam = searchParams.get("status") ?? "";
  const [prevStatusParam, setPrevStatusParam] = useState(statusParam);
  if (statusParam !== prevStatusParam) {
    setPrevStatusParam(statusParam);
    setFStatus(statusParam);
  }

  // Reset ke halaman pertama saat filter berubah (perubahan URL pun ikut, karena
  // mengubah fStatus → mengubah filterKey).
  const filterKey = `${fStatus}|${fDate}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  if (user?.role !== "admin") {
    return <div className="text-sm text-slate-500">Halaman ini hanya untuk admin HC.</div>;
  }

  const filtered = reports
    .filter((r) => {
      const inStatus = !fStatus || r.status === fStatus;
      const inDate = !fDate || r.createdAt.slice(0, 10) === fDate;
      return inStatus && inDate;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Count per status (dari seluruh laporan yang terlihat admin ini)
  const countByStatus = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = reports.filter((r) => r.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, #C95BC5 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-[60px] left-1/4 h-[180px] w-[180px] rounded-full"
          style={{ background: "radial-gradient(circle, #5B5BD6 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #8A5BD6, #C95BC5)", WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)", maskImage: "radial-gradient(circle, black 1px, transparent 1px)", WebkitMaskSize: "22px 22px", maskSize: "22px 22px", opacity: 0.2, animation: "hero-dots 8s linear infinite" }} />

        <div className="relative px-8 py-7">
          {/* Judul */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #5B5BD6, #C95BC5)" }}>
              <ListChecks className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #C95BC5)" }}>
                Daftar Laporan
              </h1>
              <p className="mt-0.5 text-sm text-ink-secondary">
                {`Laporan RWP — ${reports.length} laporan masuk`}
              </p>
            </div>
          </div>

          {/* Status quick-filter chips */}
          {reports.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFStatus(fStatus === s ? "" : s)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-150",
                    fStatus === s
                      ? "bg-accent text-white ring-accent/30 shadow-sm"
                      : "bg-surface-raised text-ink-secondary ring-line hover:bg-slate-100 dark:hover:bg-slate-700",
                  )}
                >
                  {s}
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-bold",
                    fStatus === s ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                  )}>
                    {countByStatus[s] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Konten */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Laporan</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} laporan
              {fStatus ? ` · ${fStatus}` : ""}
              {fDate ? ` · ${fDate}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-44">
              <Field label="Tanggal masuk">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </Field>
            </div>
            {(fStatus || fDate) && (
              <button
                onClick={() => { setFStatus(""); setFDate(""); }}
                className="h-10 rounded-lg px-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/60 dark:hover:text-slate-300"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700 md:hidden">
          {pageItems.length === 0 && <PageEmpty hasFilter={!!(fStatus || fDate)} />}
          {pageItems.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/tiket/${r.id}`)}
              className="group w-full px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{r.ticketNo}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {r.judul}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{r.kategori}</p>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    Masuk: {formatDateTime(r.createdAt)}
                    {r.resolvedAt && <> · Selesai: {formatDateTime(r.resolvedAt)}</>}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          {pageItems.length === 0
            ? <PageEmpty hasFilter={!!(fStatus || fDate)} />
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:bg-slate-700/30 dark:text-slate-500">
                    <th className="px-5 py-3">Tiket</th>
                    <th className="px-5 py-3">Judul</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3">Masuk</th>
                    <th className="px-5 py-3">Selesai</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {pageItems.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/tiket/${r.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.ticketNo}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {r.judul}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{r.kategori}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">{formatDateTime(r.createdAt)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {r.resolvedAt ? formatDateTime(r.resolvedAt) : "—"}
                      </td>
                      <td className="px-5 py-3.5"><StatusPill status={r.status} /></td>
                      <td className="pr-4">
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length} tiket
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
              </button>
              <span className="px-2 text-xs text-slate-400">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/40"
              >
                Berikutnya <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PageEmpty({ hasFilter }: { hasFilter: boolean }) {
  return (
    <EmptyState
      title={hasFilter ? "Tidak ada tiket pada filter ini" : "Belum ada tiket"}
      subtitle={
        hasFilter
          ? "Coba ubah filter grup, status, atau tanggal."
          : "Tiket akan muncul di sini saat karyawan mengajukan."
      }
    />
  );
}
