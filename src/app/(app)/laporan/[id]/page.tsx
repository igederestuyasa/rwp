"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Star, WarningCircle } from "@phosphor-icons/react";
import { EvidenceList } from "@/components/EvidenceList";
import { useStore } from "@/lib/store";
import { STATUS_FINAL } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Panel, MetaField, SlaBox } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input, InputBintang } from "@/components/ui/Field";
import { StatusLabelLaporan } from "@/components/hc/StatusLabel";
import { KosongHC } from "@/components/hc/KosongHC";
import { MemuatHC } from "@/components/hc/MemuatHC";
import { Timeline } from "@/components/Timeline";
import { ChatThread } from "@/components/ChatThread";

// Tombol kembali — bentuk pil sekunder, target sentuh 44px (§Aksesibilitas).
const KELAS_KEMBALI =
  "inline-flex h-11 items-center gap-2 rounded-full border border-garis-kuat bg-kartu px-4 " +
  "text-bantu font-semibold text-tinta transition-colors duration-150 hover:bg-latar";

export default function LaporanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { reports, loading } = useStore();
  const report = reports.find((r) => r.id === id);

  // Data belum tiba: jangan tampilkan "tidak ditemukan" sebelum tahu.
  if (!report && loading) return <MemuatHC teks="Memuat laporan…" />;

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

          {/* Penilaian penanganan — hanya setelah status final */}
          {STATUS_FINAL.includes(report.status) && <PanelPenilaian reportId={report.id} />}
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

// ─── Penilaian penanganan — hanya setelah status final ─────────────────────
// Pelapor menilai 1–5 bintang, sekali per laporan. Syarat kepemilikan dan
// status final ditegakkan RLS (boleh_nilai_laporan); di sini hanya tampilan.
// Admin membacanya sebagai agregat di /dashboard, tanpa komentar per laporan.
function PanelPenilaian({ reportId }: { reportId: string }) {
  const { feedback, rateReport } = useStore();
  const penilaian = feedback.find((f) => f.reportId === reportId);

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function kirim() {
    if (stars === 0 || mengirim) return;
    setMengirim(true);
    setGalat(null);
    try {
      await rateReport(reportId, stars, comment);
    } catch (e) {
      // Detail galat (RLS/PostgREST) hanya ke konsol; pengguna dapat kalimat awam.
      console.error("Gagal menyimpan penilaian:", e);
      setGalat("Penilaian belum tersimpan. Coba lagi beberapa saat.");
    } finally {
      setMengirim(false);
    }
  }

  if (penilaian) {
    return (
      <Panel title="Penilaian penanganan">
        <p className="text-bantu text-redup">
          Terima kasih, penilaianmu tersimpan {formatDate(penilaian.createdAt)}.
        </p>
        <div
          className="mt-3 flex items-center gap-1"
          role="img"
          aria-label={`${penilaian.stars} dari 5 bintang`}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={22}
              aria-hidden="true"
              weight={n <= penilaian.stars ? "fill" : "regular"}
              className={n <= penilaian.stars ? "text-tinta" : "text-garis-kuat"}
            />
          ))}
        </div>
        {penilaian.comment && (
          <p className="mt-3 break-words text-isi leading-relaxed text-redup">
            “{penilaian.comment}”
          </p>
        )}
      </Panel>
    );
  }

  return (
    <Panel title="Penilaian penanganan">
      <p className="text-bantu text-redup">
        Penanganan laporan ini sudah selesai. Seberapa puas kamu dengan cara tim HC
        menanganinya? Tim HC hanya melihat angka gabungan, bukan penilaian per laporan.
      </p>
      <InputBintang
        value={stars}
        onChange={setStars}
        label="Kepuasan penanganan"
        className="mt-3"
      />
      {stars > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="komentar-penilaian" className="sr-only">
            Komentar penilaian
          </label>
          <Input
            id="komentar-penilaian"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            placeholder="Komentar (opsional)…"
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={kirim}
            disabled={mengirim}
            className="h-11 shrink-0"
          >
            {mengirim ? "Menyimpan…" : "Kirim penilaian"}
          </Button>
        </div>
      )}
      {galat && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-bantu text-merah">
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {galat}
        </p>
      )}
    </Panel>
  );
}
