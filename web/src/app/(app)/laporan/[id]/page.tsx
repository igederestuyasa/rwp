"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Paperclip,
  Lock,
  MessageSquare,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  MapPin,
  User,
  Tag,
} from "lucide-react";
import { EvidenceList } from "@/components/EvidenceList";
import { useStore } from "@/lib/store";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Panel, MetaField, SlaBox } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { Timeline } from "@/components/Timeline";
import { ChatThread } from "@/components/ChatThread";

export default function LaporanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { reports } = useStore();
  const report = reports.find((r) => r.id === id);

  if (!report) {
    return (
      <div>
        <Link
          href="/laporan"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Lacak Tiket
        </Link>
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">Tiket tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const Icon = ShieldAlert;

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-[20px] border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, #C95BC5 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-[60px] left-1/4 h-[180px] w-[180px] rounded-full"
          style={{ background: "radial-gradient(circle, #5B5BD6 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #8A5BD6, #C95BC5)", WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)", maskImage: "radial-gradient(circle, black 1px, transparent 1px)", WebkitMaskSize: "22px 22px", maskSize: "22px 22px", opacity: 0.2, animation: "hero-dots 8s linear infinite" }} />

        <div className="relative">
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Lacak Tiket
          </Link>

          <div className="mt-4 flex items-start justify-between gap-3">
            {/* Kiri: ikon + info */}
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md"
                style={{ background: "linear-gradient(135deg, #5B5BD6, #C95BC5)" }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                    {report.ticketNo}
                  </span>
                  {report.resolvedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      Selesai
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-lg font-bold leading-snug text-ink sm:text-xl">
                  {report.judul}
                </h1>
              </div>
            </div>

            {/* Kanan: status */}
            <StatusPill status={report.status} className="mt-1 shrink-0" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {/* ── Detail tiket ── */}
        <Panel title="Detail Tiket">
          {/* Grid meta */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <MetaField
              label="Lampiran"
              value={`${report.evidenceCount} berkas`}
              icon={<Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            />
            <MetaField
              label="Kategori"
              value={report.kategori ?? "-"}
              icon={<Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            />
            <MetaField
              label="Tanggal kejadian"
              value={
                report.tanggalKejadian ? formatDate(report.tanggalKejadian) : "-"
              }
              icon={<Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            />
            <MetaField
              label="Lokasi"
              value={report.lokasi ?? "-"}
              icon={<MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            />
            <MetaField
              label="Terlapor"
              value={report.terlapor ?? "-"}
              icon={<User className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            />
            <MetaField
              label="Pelaporan"
              value={report.isAnonymous ? "Anonim" : "Teridentifikasi"}
              icon={<Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            />
          </dl>

          {/* SLA */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
            <SlaBox label="Waktu masuk" value={formatDateTime(report.createdAt)} />
            <SlaBox
              label="Waktu selesai"
              value={
                report.resolvedAt
                  ? formatDateTime(report.resolvedAt)
                  : "Belum selesai"
              }
              muted={!report.resolvedAt}
            />
          </div>

          {/* Deskripsi / Kronologi */}
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700/60">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Kronologi
            </p>
            <p className="text-sm leading-relaxed text-slate-600 break-words dark:text-slate-300">
              {report.kronologi}
            </p>
          </div>

          {/* Bukti */}
          {report.evidence && report.evidence.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-700/60">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Bukti yang dilampirkan ({report.evidence.length} berkas)
              </p>
              <EvidenceList files={report.evidence} />
            </div>
          )}
        </Panel>

        {/* ── Riwayat status ── */}
        <Panel title="Riwayat Status">
          <Timeline report={report} hideEscalation={false} />
        </Panel>

        {/* ── Chat ── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B5BD6] to-[#9B5BD6] text-white shadow-sm">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Komunikasi dengan Admin HC
            </h2>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <ChatThread reportId={report.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

