"use client";

// ============================================================
// ReportDownload — tombol download laporan bulanan (PDF + Excel)
// Hanya untuk admin_superior. Di-load di Dashboard.
// Library (jspdf, xlsx) di-import secara lazy agar tidak
// masuk bundle utama.
// ============================================================

import { useState } from "react";
import { CalendarBlank, CircleNotch, FileArrowDown, FilePdf, FileXls } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { APP_NAME, STATUSES } from "@/lib/constants";
import type { Report, Status } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, GlassSelect } from "@/components/ui/Field";

// ── Helpers ───────────────────────────────────────────────────

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function monthYearToDate(month: number, year: number, end = false): Date {
  if (!end) return new Date(year, month - 1, 1, 0, 0, 0, 0);
  return new Date(year, month, 0, 23, 59, 59, 999); // last day of month
}

function formatPeriode(sM: number, sY: number, eM: number, eY: number) {
  if (sM === eM && sY === eY) return `${MONTHS[sM - 1]} ${sY}`;
  return `${MONTHS[sM - 1]} ${sY} – ${MONTHS[eM - 1]} ${eY}`;
}

function avgResolutionDays(reports: Report[]): number | null {
  const resolved = reports.filter((r) => r.resolvedAt);
  if (!resolved.length) return null;
  const total = resolved.reduce((sum, r) => {
    const ms = new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime();
    return sum + ms / (1000 * 60 * 60 * 24);
  }, 0);
  return total / resolved.length;
}

// Hitung semua metrik dari array laporan yang sudah difilter
function buildMetrics(reports: Report[]) {
  const total = reports.length;
  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, reports.filter((r) => r.status === s).length]),
  ) as Record<Status, number>;

  const rwp = reports;
  const rwpAnon = rwp.filter((r) => r.isAnonymous).length;

  // Tren per bulan (YYYY-MM)
  const trendMap = new Map<string, number>();
  reports.forEach((r) => {
    const key = r.createdAt.slice(0, 7);
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  });
  const trend = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, count]) => {
      const [y, m] = ym.split("-");
      return { bulan: `${MONTHS[Number(m) - 1]} ${y}`, count };
    });

  // Breakdown kategori (hanya RWP)
  const kategoriMap = new Map<string, number>();
  rwp.forEach((r) => {
    if (r.kategori) kategoriMap.set(r.kategori, (kategoriMap.get(r.kategori) ?? 0) + 1);
  });
  const byKategori = Array.from(kategoriMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([kategori, count]) => ({ kategori, count }));

  const selesai = (byStatus["Selesai"] ?? 0) + (byStatus["Ditutup"] ?? 0);
  const pctSelesai = total > 0 ? Math.round((selesai / total) * 100) : 0;
  const avgDays = avgResolutionDays(reports);

  return {
    total, byStatus, rwp, rwpAnon, trend, byKategori,
    selesai, pctSelesai, avgDays,
  };
}

// ── PDF ───────────────────────────────────────────────────────

// jspdf-autotable menyuntik `lastAutoTable` ke instance jsPDF tiap kali dipanggil,
// tapi augmentasi tipenya tidak selalu terbaca lewat import fungsional. Akses
// lewat helper bertipe (via unknown) agar tetap bebas `any`.
function lastTableY(doc: object): number {
  return (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
}

async function downloadPDF(
  reports: Report[],
  sM: number, sY: number, eM: number, eY: number,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const m = buildMetrics(reports);
  const periode = formatPeriode(sM, sY, eM, eY);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${APP_NAME} — Laporan Penanganan RWP`, W / 2, 11, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode: ${periode}`, W / 2, 18, { align: "center" });
  doc.text(`PT Hutama Karya (Persero) · Divisi Human Capital`, W / 2, 23, { align: "center" });
  doc.setTextColor(30, 41, 59);
  y = 36;

  // Keterangan generate
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Digenerate: ${new Date().toLocaleString("id-ID")}  ·  Total data: ${m.total} tiket`, 14, y);
  y += 8;

  const sectionTitle = (title: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, y);
    y += 2;
  };

  // 1. Ringkasan
  sectionTitle("1. Ringkasan");
  autoTable(doc, {
    startY: y,
    head: [["Metrik", "Nilai"]],
    body: [
      ["Total Laporan Masuk", m.total.toString()],
      ["Total Terselesaikan (Selesai + Ditutup)", m.selesai.toString()],
      ["Tingkat Penyelesaian", `${m.pctSelesai}%`],
      ["Rata-rata Waktu Penyelesaian", m.avgDays != null ? `${m.avgDays.toFixed(1)} hari` : "—"],
      ["Laporan Anonim", m.rwpAnon.toString()],
      ["Laporan Teridentifikasi", (m.rwp.length - m.rwpAnon).toString()],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 40, halign: "center" } },
    margin: { left: 14, right: 14 },
  });
  y = lastTableY(doc) + 8;

  // 2. Tiket per Status
  sectionTitle("2. Laporan per Status");
  autoTable(doc, {
    startY: y,
    head: [["Status", "Jumlah", "Persentase"]],
    body: STATUSES.map((s) => [
      s,
      m.byStatus[s].toString(),
      m.total > 0 ? `${Math.round((m.byStatus[s] / m.total) * 100)}%` : "0%",
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
    margin: { left: 14, right: 14 },
  });
  y = lastTableY(doc) + 8;

  // New page jika perlu
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 60) { doc.addPage(); y = 20; }

  if (y > pageH - 60) { doc.addPage(); y = 20; }

  // 3. Laporan RWP
  sectionTitle("3. Laporan RWP — Detail");
  autoTable(doc, {
    startY: y,
    head: [["Metrik RWP", "Nilai"]],
    body: [
      ["Total Laporan RWP", m.rwp.length.toString()],
      ["Anonim", m.rwpAnon.toString()],
      ["Teridentifikasi", (m.rwp.length - m.rwpAnon).toString()],
      ["% Anonim", m.rwp.length > 0 ? `${Math.round((m.rwpAnon / m.rwp.length) * 100)}%` : "—"],
      ...m.byKategori.map((k) => [`Kategori: ${k.kategori}`, k.count.toString()]),
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [225, 29, 72], textColor: 255 },
    alternateRowStyles: { fillColor: [255, 241, 242] },
    columnStyles: { 0: { cellWidth: 110 }, 1: { halign: "center" } },
    margin: { left: 14, right: 14 },
  });
  y = lastTableY(doc) + 8;

  // 4. Tren Bulanan (jika ada lebih dari 1 bulan)
  if (m.trend.length > 1) {
    if (y > pageH - 60) { doc.addPage(); y = 20; }
    sectionTitle("4. Tren Laporan Masuk per Bulan");
    autoTable(doc, {
      startY: y,
      head: [["Bulan", "Jumlah Tiket Masuk"]],
      body: m.trend.map((t) => [t.bulan, t.count.toString()]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: "center" } },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${i} / ${totalPages}  ·  Dibuat otomatis oleh ${APP_NAME}  ·  RAHASIA`,
      W / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  const filename = `laporan-rwp-${periode.replace(/\s+/g, "-").replace(/–/g, "sd")}.pdf`;
  doc.save(filename);
}

// ── Excel ─────────────────────────────────────────────────────

async function downloadExcel(
  reports: Report[],
  sM: number, sY: number, eM: number, eY: number,
) {
  const XLSX = await import("xlsx");
  const m = buildMetrics(reports);
  const periode = formatPeriode(sM, sY, eM, eY);
  const wb = XLSX.utils.book_new();

  // Sheet helper
  const addSheet = (name: string, rows: (string | number)[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  // 1. Ringkasan
  addSheet("Ringkasan", [
    [`${APP_NAME} — Laporan Penanganan RWP`],
    [`Periode: ${periode}`],
    [`PT Hutama Karya (Persero) · Divisi Human Capital`],
    [`Digenerate: ${new Date().toLocaleString("id-ID")}`],
    [],
    ["Metrik", "Nilai"],
    ["Total Tiket Masuk", m.total],
    ["Total Terselesaikan", m.selesai],
    ["Tingkat Penyelesaian (%)", m.pctSelesai],
    ["Rata-rata Waktu Penyelesaian (hari)", m.avgDays != null ? Number(m.avgDays.toFixed(1)) : "-"],
    ["Total Laporan RWP", m.rwp.length],
    ["RWP Anonim", m.rwpAnon],
    ["RWP Teridentifikasi", m.rwp.length - m.rwpAnon],
  ]);

  // 2. Per Status
  addSheet("Per Status", [
    ["Status", "Jumlah", "Persentase (%)"],
    ...STATUSES.map((s) => [
      s,
      m.byStatus[s],
      m.total > 0 ? Math.round((m.byStatus[s] / m.total) * 100) : 0,
    ]),
  ]);

  // 3. RWP Detail
  addSheet("RWP Detail", [
    ["Metrik RWP", "Nilai"],
    ["Total Laporan RWP", m.rwp.length],
    ["Anonim", m.rwpAnon],
    ["Teridentifikasi", m.rwp.length - m.rwpAnon],
    ["% Anonim", m.rwp.length > 0 ? Math.round((m.rwpAnon / m.rwp.length) * 100) : 0],
    [],
    ["Kategori", "Jumlah"],
    ...m.byKategori.map((k) => [k.kategori, k.count]),
  ]);

  // 4. Tren Bulanan
  addSheet("Tren Bulanan", [
    ["Bulan", "Jumlah Laporan Masuk"],
    ...m.trend.map((t) => [t.bulan, t.count]),
  ]);

  const filename = `laporan-rwp-${periode.replace(/\s+/g, "-").replace(/–/g, "sd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── Komponen utama ────────────────────────────────────────────

// Opsi dropdown HC Panel — GlassSelect memakai nilai string, jadi angka bulan
// dan tahun dikonversi bolak-balik. Data yang dipakai tetap angka.
const OPSI_BULAN = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
const OPSI_TAHUN = YEARS.map((y) => ({ value: String(y), label: String(y) }));

export function ReportDownload() {
  const { reports } = useStore();

  const now = new Date();
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [startYear, setStartYear]   = useState(now.getFullYear());
  const [endMonth, setEndMonth]     = useState(now.getMonth() + 1);
  const [endYear, setEndYear]       = useState(now.getFullYear());
  const [loading, setLoading]       = useState<"pdf" | "excel" | null>(null);

  // Filter reports berdasarkan custom date range
  const filtered = reports.filter((r) => {
    const d = new Date(r.createdAt);
    return (
      d >= monthYearToDate(startMonth, startYear) &&
      d <= monthYearToDate(endMonth, endYear, true)
    );
  });

  // Validasi: end tidak boleh sebelum start
  const isRangeValid = (() => {
    const s = startYear * 12 + startMonth;
    const e = endYear * 12 + endMonth;
    return e >= s;
  })();

  async function handleDownload(type: "pdf" | "excel") {
    if (!isRangeValid || loading) return;
    setLoading(type);
    try {
      if (type === "pdf") {
        await downloadPDF(filtered, startMonth, startYear, endMonth, endYear);
      } else {
        await downloadExcel(filtered, startMonth, startYear, endMonth, endYear);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-[var(--radius-panel)] border border-garis bg-kartu p-5 sm:p-6">
      {/* Kepala panel */}
      <div className="flex items-start gap-3">
        <FileArrowDown size={20} aria-hidden="true" className="mt-1 shrink-0 text-redup" />
        <div>
          <h2 className="text-subjudul font-bold tracking-[-0.02em] text-tinta">
            Unduh laporan periodik
          </h2>
          <p className="mt-1 text-bantu text-redup">
            Ekspor ringkasan penanganan laporan dalam rentang bulan tertentu.
          </p>
        </div>
      </div>

      {/* Rentang bulan */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Dari bulan">
          <div className="flex gap-2">
            <GlassSelect
              value={String(startMonth)}
              onChange={(v) => setStartMonth(Number(v))}
              options={OPSI_BULAN}
              className="flex-1"
            />
            <GlassSelect
              value={String(startYear)}
              onChange={(v) => setStartYear(Number(v))}
              options={OPSI_TAHUN}
              className="w-28 shrink-0"
            />
          </div>
        </Field>

        <Field label="Sampai bulan">
          <div className="flex gap-2">
            <GlassSelect
              value={String(endMonth)}
              onChange={(v) => setEndMonth(Number(v))}
              options={OPSI_BULAN}
              className="flex-1"
            />
            <GlassSelect
              value={String(endYear)}
              onChange={(v) => setEndYear(Number(v))}
              options={OPSI_TAHUN}
              className="w-28 shrink-0"
            />
          </div>
        </Field>
      </div>

      {/* Jumlah laporan dalam rentang — dihitung real-time */}
      <div
        className="mt-4 flex items-center gap-2 rounded-[var(--radius-kartu)] border border-garis bg-latar px-4 py-3 text-bantu"
        role="status"
      >
        <CalendarBlank size={18} aria-hidden="true" className="shrink-0 text-redup" />
        {isRangeValid ? (
          <span className="text-redup">
            <span className="font-semibold tabular-nums text-tinta">{filtered.length}</span>{" "}
            laporan dalam periode ini
          </span>
        ) : (
          <span className="text-merah">
            Rentang tidak valid — bulan akhir harus setelah bulan awal.
          </span>
        )}
      </div>

      {/* Tombol unduh */}
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button
          type="button"
          onClick={() => handleDownload("pdf")}
          disabled={!isRangeValid || loading !== null || filtered.length === 0}
        >
          {loading === "pdf" ? (
            <CircleNotch size={18} aria-hidden="true" className="animate-spin" />
          ) : (
            <FilePdf size={18} aria-hidden="true" />
          )}
          {loading === "pdf" ? "Membuat PDF…" : "Unduh PDF"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => handleDownload("excel")}
          disabled={!isRangeValid || loading !== null || filtered.length === 0}
        >
          {loading === "excel" ? (
            <CircleNotch size={18} aria-hidden="true" className="animate-spin" />
          ) : (
            <FileXls size={18} aria-hidden="true" />
          )}
          {loading === "excel" ? "Membuat Excel…" : "Unduh Excel"}
        </Button>
      </div>

      {filtered.length === 0 && isRangeValid && (
        <p className="mt-3 text-bantu text-redup">
          Tidak ada laporan dalam periode ini — coba rentang bulan yang berbeda.
        </p>
      )}
    </section>
  );
}
