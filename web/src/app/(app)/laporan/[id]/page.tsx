"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { EvidenceList } from "@/components/EvidenceList";
import { useStore } from "@/lib/store";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Panel, MetaField, SlaBox } from "@/components/ui/Panel";
import { StatusLabelLaporan } from "@/components/hc/StatusLabel";
import { KosongHC } from "@/components/hc/KosongHC";
import { Timeline } from "@/components/Timeline";
import { ChatThread } from "@/components/ChatThread";

// Tombol kembali — bentuk pil sekunder, target sentuh 44px (§Aksesibilitas).
const KELAS_KEMBALI =
  "inline-flex h-11 items-center gap-2 rounded-full border border-garis-kuat bg-kartu px-4 " +
  "text-bantu font-semibold text-tinta transition-colors duration-150 hover:bg-latar";

export default function LaporanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { reports } = useStore();
  const report = reports.find((r) => r.id === id);

  if (!report) {
    return (
      <div>
        <Link href="/laporan" className={KELAS_KEMBALI}>
          <ArrowLeft size={16} aria-hidden />
          Kembali ke lacak tiket
        </Link>
        <div className="mt-8">
          <KosongHC
            judul="Tiket tidak ditemukan"
            ajakan="Tautannya mungkin keliru atau tiket sudah tidak tersedia. Buka daftar tiket untuk memilih tiket lain."
            aksiLabel="Buka lacak tiket"
            href="/laporan"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Pembuka halaman: tombol kembali, judul, lalu teks pendukung ── */}
      <header>
        <Link href="/laporan" className={`pembuka-masuk ${KELAS_KEMBALI}`}>
          <ArrowLeft size={16} aria-hidden />
          Kembali ke lacak tiket
        </Link>

        <h1
          className="pembuka-masuk mt-6 line-clamp-2 break-words text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
          style={{ animationDelay: "60ms" }}
        >
          {report.judul}
        </h1>

        <div
          className="pembuka-masuk mt-3 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "110ms" }}
        >
          <span className="tabular text-bantu font-medium text-redup">{report.ticketNo}</span>
          <StatusLabelLaporan status={report.status} />
        </div>
      </header>

      {/* ── Isi: detail di kiri, riwayat & percakapan di kanan ── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <Panel title="Detail laporan">
            {/* Baris metadata — hanya baris yang ada datanya. */}
            <dl className="grid gap-y-3">
              {report.evidenceCount > 0 && (
                <MetaField label="Lampiran" value={`${report.evidenceCount} berkas`} />
              )}
              {report.kategori && <MetaField label="Kategori" value={report.kategori} />}
              {report.tanggalKejadian && (
                <MetaField
                  label="Tanggal kejadian"
                  value={formatDate(report.tanggalKejadian)}
                />
              )}
              {report.lokasi && <MetaField label="Lokasi" value={report.lokasi} />}
              {report.terlapor && <MetaField label="Terlapor" value={report.terlapor} />}
              <MetaField
                label="Pelaporan"
                value={report.isAnonymous ? "Anonim" : "Teridentifikasi"}
              />
            </dl>

            {/* SLA */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <SlaBox label="Waktu masuk" value={formatDateTime(report.createdAt)} />
              <SlaBox
                label="Waktu selesai"
                value={
                  report.resolvedAt ? formatDateTime(report.resolvedAt) : "Belum selesai"
                }
                muted={!report.resolvedAt}
              />
            </div>

            {/* Deskripsi / Kronologi */}
            <div className="mt-6 border-t border-garis pt-5">
              <p className="mb-2 text-bantu font-semibold text-tinta">Kronologi</p>
              <p className="break-words text-isi leading-relaxed text-redup">
                {report.kronologi}
              </p>
            </div>

            {/* Bukti */}
            {report.evidence && report.evidence.length > 0 && (
              <div className="mt-5 border-t border-garis pt-5">
                <p className="mb-3 text-bantu font-semibold text-tinta">
                  Bukti yang dilampirkan ({report.evidence.length} berkas)
                </p>
                <EvidenceList files={report.evidence} />
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Riwayat status — entri eskalasi sengaja terlihat oleh pelapor
              (keputusan transparansi, CLAUDE.md §2). */}
          <Panel title="Riwayat status">
            <Timeline report={report} hideEscalation={false} />
          </Panel>

          <Panel title="Komunikasi dengan Admin HC">
            <ChatThread reportId={report.id} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
