"use client";

// ============================================================
// ReportDownload — unduh laporan periodik (PDF + Excel)
// Hanya untuk admin_superior. Di-load di Dashboard.
//
// PDF: dokumen A4 bergaya HC Panel (docs/DESIGN.md) — masthead berlogo,
// ringkasan eksekutif, dan tiap bagian membawa GRAFIK VEKTOR yang digambar
// langsung dengan primitif jsPDF (bukan tangkapan layar), jadi tajam saat
// dicetak dan tidak bergantung pada dashboard yang sedang tampil.
// Excel: tabel per lembar dengan lebar kolom; SheetJS edisi komunitas
// tidak bisa menulis grafik, jadi visual hanya ada di PDF.
//
// Isinya AGREGAT SAJA: tidak ada identitas pelapor, nomor tiket, maupun
// rincian per laporan (§9.1 — kombinasi metadata bisa mende-anonimkan).
// Library (jspdf, jspdf-autotable, xlsx) di-import lazy agar tidak masuk
// bundle utama.
// ============================================================

import { useState } from "react";
import type { jsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";
import { CalendarBlank, CircleNotch, FileArrowDown, FilePdf, FileXls } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { APP_NAME, ORG_NAME, STATUSES } from "@/lib/constants";
import type { Report, Status, StatusLog } from "@/lib/types";
import { formatDateTime, formatDurasi } from "@/lib/utils";
import { hitungDurasiPenanganan, type DurasiPenanganan } from "@/components/RwpDashboard";
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

const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Persentase bulat; 0 bila pembaginya nol. */
const persen = (bagian: number, total: number) =>
  total > 0 ? Math.round((bagian / total) * 100) : 0;

// Hitung semua metrik dari laporan yang sudah difilter (kohort bulan masuk).
function buildMetrics(reports: Report[], logs: StatusLog[]) {
  const total = reports.length;
  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, reports.filter((r) => r.status === s).length]),
  ) as Record<Status, number>;

  const anon = reports.filter((r) => r.isAnonymous).length;

  // Tren per bulan (YYYY-MM), urut waktu
  const trendMap = new Map<string, number>();
  reports.forEach((r) => {
    const key = r.createdAt.slice(0, 7);
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  });
  const trend = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, count]) => {
      const [y, m] = ym.split("-");
      return {
        ym,
        bulan: `${MONTHS[Number(m) - 1]} ${y}`,
        singkat: `${BULAN_SINGKAT[Number(m) - 1]} ${y.slice(2)}`,
        count,
      };
    });

  // Breakdown kategori, terbanyak di atas
  const kategoriMap = new Map<string, number>();
  reports.forEach((r) => {
    if (r.kategori) kategoriMap.set(r.kategori, (kategoriMap.get(r.kategori) ?? 0) + 1);
  });
  const byKategori = Array.from(kategoriMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([kategori, count]) => ({ kategori, count }));

  const selesai = byStatus["Selesai"] + byStatus["Ditutup"];
  const aktif = total - selesai;

  // Durasi per fase & penyelesaian total — definisi yang sama dengan panel
  // "Durasi penanganan" di dashboard, jadi angkanya tidak bercerita beda.
  const durasi = hitungDurasiPenanganan(reports, logs);

  return {
    total, byStatus, anon, pctAnon: persen(anon, total), trend, byKategori,
    selesai, pctSelesai: persen(selesai, total), aktif, durasi,
  };
}
type Metrik = ReturnType<typeof buildMetrics>;

/** Paragraf pembuka ringkasan eksekutif — kalimat faktual dari angka. */
function narasi(m: Metrik, periode: string): string {
  const kalimat = [`Sepanjang periode ${periode}, ${m.total} laporan RWP masuk melalui aplikasi.`];
  if (m.selesai > 0) {
    const t = m.durasi.total;
    kalimat.push(
      `Sebanyak ${m.selesai} laporan (${m.pctSelesai}%) telah selesai ditangani atau ditutup` +
        (t
          ? `, dengan median waktu penyelesaian ${formatDurasi(t.median)} dan rata-rata ${formatDurasi(t.rataRata)}.`
          : "."),
    );
  } else {
    kalimat.push("Belum ada laporan pada periode ini yang selesai ditangani atau ditutup.");
  }
  if (m.aktif > 0) kalimat.push(`Sebanyak ${m.aktif} laporan masih dalam penanganan.`);
  kalimat.push(`Sebanyak ${m.pctAnon}% pelapor memilih untuk tetap anonim.`);
  return kalimat.join(" ");
}

// ── PDF: warna & primitif gambar ──────────────────────────────

// PDF selalu mode terang, jadi nilai token diambil dari kolom "Terang"
// docs/DESIGN.md — jsPDF tidak bisa membaca CSS variable. Kalau token di
// globals.css berubah, sesuaikan di sini.
const WARNA = {
  tinta: "#121418",
  redup: "#5D636E",
  garis: "#E0E3E8",
  garisKuat: "#C6CBD3",
  latar: "#F3F4F6",
  kartu: "#FDFDFD",
  merah: "#C41115",
  merahIkon: "#DD2A30",
  /** data-2 — satu rona untuk semua grafik besaran (dataviz: sequential). */
  data: "#6B8EE8",
} as const;

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

const MARGIN = 16;       // tepi kiri/kanan/atas (mm)
const TEPI_BAWAH = 22;   // ruang kaki halaman (mm)

/** Kursor gambar: dokumen + posisi y berjalan. Semua helper menggeser y. */
interface Kanvas {
  doc: jsPDF;
  W: number;
  H: number;
  y: number;
}
const lebarIsi = (k: Kanvas) => k.W - MARGIN * 2;

function teks(
  k: Kanvas, str: string, x: number, y: number,
  o: { ukuran: number; tebal?: boolean; warna?: string; rata?: "left" | "center" | "right"; lebarMaks?: number } ,
) {
  k.doc.setFont("helvetica", o.tebal ? "bold" : "normal");
  k.doc.setFontSize(o.ukuran);
  k.doc.setTextColor(...rgb(o.warna ?? WARNA.tinta));
  k.doc.text(str, x, y, { align: o.rata ?? "left", maxWidth: o.lebarMaks });
}

/** Potong teks dengan elipsis supaya muat di lebar tertentu. */
function potong(k: Kanvas, str: string, lebar: number, ukuran: number): string {
  k.doc.setFontSize(ukuran);
  if (k.doc.getTextWidth(str) <= lebar) return str;
  let s = str;
  while (s.length > 1 && k.doc.getTextWidth(s + "…") > lebar) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}

/** Pindah halaman bila sisa ruang tidak cukup. */
function pastikanRuang(k: Kanvas, tinggi: number) {
  if (k.y + tinggi > k.H - TEPI_BAWAH) {
    k.doc.addPage();
    k.y = MARGIN;
  }
}

/** Batang dengan ujung data membulat dan pangkal rata (dataviz: rounded
 *  data-end, baseline flat). Arah "kanan" = batang mendatar, "atas" = kolom. */
function batang(k: Kanvas, x: number, y: number, w: number, h: number, arah: "kanan" | "atas") {
  const r = 1;
  k.doc.setFillColor(...rgb(WARNA.data));
  if (arah === "kanan") {
    k.doc.roundedRect(x, y, Math.max(w, r * 2), h, r, r, "F");
    k.doc.rect(x, y, Math.min(r, w), h, "F");
  } else {
    k.doc.roundedRect(x, y, w, Math.max(h, r * 2), r, r, "F");
    k.doc.rect(x, y + Math.max(h, r * 2) - Math.min(r, h), w, Math.min(r, h), "F");
  }
}

/** Logo HC Panel (geometri dari docs/DESIGN.md §Logo), digambar vektor. */
function gambarLogo(k: Kanvas, x: number, y: number, ukuran: number) {
  const s = ukuran / 48;
  const c = 0.5523; // konstanta bezier untuk busur seperempat lingkaran
  const doc = k.doc;
  doc.setFillColor(...rgb(WARNA.tinta));
  doc.roundedRect(x, y, ukuran, ukuran, 12 * s, 12 * s, "F");
  doc.setFillColor(...rgb(WARNA.latar));
  // M9 9 H24 A15 15 0 0 1 9 24 Z
  doc.path([
    { op: "m", c: [x + 9 * s, y + 9 * s] },
    { op: "l", c: [x + 24 * s, y + 9 * s] },
    { op: "c", c: [x + 24 * s, y + (9 + 15 * c) * s, x + (9 + 15 * c) * s, y + 24 * s, x + 9 * s, y + 24 * s] },
    { op: "h" },
  ], "F");
  doc.rect(x + 9 * s, y + 24 * s, 15 * s, 15 * s, "F");
  // M24 39 H39 A7.5 7.5 0 0 0 24 39 Z (busur ke atas)
  doc.path([
    { op: "m", c: [x + 24 * s, y + 39 * s] },
    { op: "l", c: [x + 39 * s, y + 39 * s] },
    { op: "c", c: [x + 39 * s, y + (39 - 7.5 * c) * s, x + (31.5 + 7.5 * c) * s, y + 31.5 * s, x + 31.5 * s, y + 31.5 * s] },
    { op: "c", c: [x + (31.5 - 7.5 * c) * s, y + 31.5 * s, x + 24 * s, y + (39 - 7.5 * c) * s, x + 24 * s, y + 39 * s] },
    { op: "h" },
  ], "F");
  doc.setFillColor(...rgb(WARNA.merahIkon));
  doc.circle(x + 31.5 * s, y + 16.5 * s, 7.5 * s, "F");
}

/** Judul bagian bernomor + keterangan + garis pemisah. `ruangIsi` = perkiraan
 *  tinggi isi yang harus satu halaman dengan judulnya (judul tidak boleh yatim). */
function judulBagian(k: Kanvas, nomor: number, judul: string, keterangan?: string, ruangIsi = 30) {
  pastikanRuang(k, 20 + ruangIsi);
  teks(k, `${nomor}. ${judul}`, MARGIN, k.y + 4, { ukuran: 12.5, tebal: true });
  k.y += 8.5;
  if (keterangan) {
    k.doc.setFont("helvetica", "normal");
    k.doc.setFontSize(8.5);
    const baris: string[] = k.doc.splitTextToSize(keterangan, lebarIsi(k));
    teks(k, baris.join("\n"), MARGIN, k.y, { ukuran: 8.5, warna: WARNA.redup });
    k.y += baris.length * 4 + 1;
  }
  k.doc.setDrawColor(...rgb(WARNA.garis));
  k.doc.setLineWidth(0.25);
  k.doc.line(MARGIN, k.y, k.W - MARGIN, k.y);
  k.y += 6;
}

/** Baris kartu KPI (stat tile): label, nilai besar, keterangan. */
function barisKpi(k: Kanvas, item: { label: string; nilai: string; keterangan?: string }[]) {
  const gap = 4;
  const h = 22;
  const w = (lebarIsi(k) - gap * (item.length - 1)) / item.length;
  pastikanRuang(k, h + 6);
  item.forEach((it, i) => {
    const x = MARGIN + i * (w + gap);
    k.doc.setFillColor(...rgb(WARNA.kartu));
    k.doc.setDrawColor(...rgb(WARNA.garis));
    k.doc.setLineWidth(0.25);
    k.doc.roundedRect(x, k.y, w, h, 3, 3, "FD");
    teks(k, potong(k, it.label, w - 8, 8), x + 4, k.y + 6.5, { ukuran: 8, warna: WARNA.redup });
    teks(k, it.nilai, x + 4, k.y + 14.5, { ukuran: 15, tebal: true });
    if (it.keterangan) {
      teks(k, potong(k, it.keterangan, w - 8, 7.5), x + 4, k.y + 19.5, { ukuran: 7.5, warna: WARNA.redup });
    }
  });
  k.y += h + 6;
}

/** Grafik batang mendatar; nilai ditulis di ujung batang. Mengembalikan tinggi. */
function grafikBatangMendatar(
  k: Kanvas, x: number, lebar: number,
  data: { label: string; nilai: number; teks?: string }[],
): number {
  const tBar = 5;
  const jarak = 3.5;
  const lebarLabel = Math.min(46, lebar * 0.36);
  const lebarNilai = 20;
  const barX = x + lebarLabel + 3;
  const barMaks = lebar - lebarLabel - 3 - lebarNilai;
  const maks = Math.max(0, ...data.map((d) => d.nilai));
  const tinggi = data.length * (tBar + jarak) - jarak;

  k.doc.setDrawColor(...rgb(WARNA.garisKuat));
  k.doc.setLineWidth(0.3);
  k.doc.line(barX, k.y - 1, barX, k.y + tinggi + 1);

  data.forEach((d, i) => {
    const yy = k.y + i * (tBar + jarak);
    const dasar = yy + tBar * 0.74;
    teks(k, potong(k, d.label, lebarLabel, 8.5), barX - 3, dasar, { ukuran: 8.5, rata: "right" });
    const w = maks > 0 ? (d.nilai / maks) * barMaks : 0;
    if (w > 0) batang(k, barX, yy, w, tBar, "kanan");
    teks(k, d.teks ?? String(d.nilai), barX + w + 2, dasar, { ukuran: 8.5 });
  });
  return tinggi;
}

/** Batas atas sumbu yang "rapi" untuk 4 garis kisi (4, 8, 20, 40, 80, …). */
function batasRapi(v: number): number {
  if (v <= 4) return 4;
  for (let p = 1; p < 1e9; p *= 10) {
    for (const s of [1, 2, 5]) if (4 * s * p >= v) return 4 * s * p;
  }
  return v;
}

/** Grafik kolom (tren per bulan) dengan kisi mendatar dan label nilai. */
function grafikKolom(
  k: Kanvas, x: number, lebar: number, tinggi: number,
  data: { label: string; nilai: number }[],
) {
  const padKiri = 9;
  const padAtas = 6;
  const padBawah = 8;
  const plotX = x + padKiri;
  const plotW = lebar - padKiri;
  const plotY = k.y + padAtas;
  const plotH = tinggi - padAtas - padBawah;
  const batas = batasRapi(Math.max(0, ...data.map((d) => d.nilai)));

  for (let t = 0; t <= 4; t++) {
    const yy = plotY + plotH - (t / 4) * plotH;
    k.doc.setDrawColor(...rgb(t === 0 ? WARNA.garisKuat : WARNA.garis));
    k.doc.setLineWidth(t === 0 ? 0.3 : 0.2);
    k.doc.line(plotX, yy, plotX + plotW, yy);
    teks(k, String((batas * t) / 4), plotX - 2, yy + 1, { ukuran: 7.5, warna: WARNA.redup, rata: "right" });
  }

  const slot = plotW / Math.max(data.length, 1);
  const lebarKolom = Math.min(slot * 0.6, 14);
  data.forEach((d, i) => {
    const cx = plotX + i * slot + (slot - lebarKolom) / 2;
    const h = batas > 0 ? (d.nilai / batas) * plotH : 0;
    const atas = plotY + plotH - h;
    if (h > 0) batang(k, cx, atas, lebarKolom, h, "atas");
    teks(k, String(d.nilai), cx + lebarKolom / 2, atas - 1.5, { ukuran: 8, rata: "center" });
    teks(k, d.label, cx + lebarKolom / 2, plotY + plotH + 5, { ukuran: 7.5, warna: WARNA.redup, rata: "center" });
  });
}

/** Meter proporsi satu isian (anonim vs teridentifikasi) + legenda. */
function meterProporsi(k: Kanvas, x: number, lebar: number, isi: number, total: number, labelIsi: string, labelSisa: string) {
  const h = 4;
  k.doc.setFillColor(...rgb(WARNA.latar));
  k.doc.setDrawColor(...rgb(WARNA.garis));
  k.doc.setLineWidth(0.2);
  k.doc.roundedRect(x, k.y, lebar, h, 2, 2, "FD");
  const w = total > 0 ? (isi / total) * lebar : 0;
  if (w > 0) {
    k.doc.setFillColor(...rgb(WARNA.tinta));
    k.doc.roundedRect(x, k.y, Math.max(w, h), h, 2, 2, "F");
  }
  k.y += h + 5;
  // legenda: kotak kecil + teks
  k.doc.setFillColor(...rgb(WARNA.tinta));
  k.doc.rect(x, k.y - 2.6, 3, 3, "F");
  teks(k, `${labelIsi}: ${isi} (${persen(isi, total)}%)`, x + 4.5, k.y, { ukuran: 8.5 });
  const geser = x + 4.5 + k.doc.getTextWidth(`${labelIsi}: ${isi} (${persen(isi, total)}%)`) + 8;
  k.doc.setFillColor(...rgb(WARNA.latar));
  k.doc.setDrawColor(...rgb(WARNA.garisKuat));
  k.doc.rect(geser, k.y - 2.6, 3, 3, "FD");
  teks(k, `${labelSisa}: ${total - isi} (${persen(total - isi, total)}%)`, geser + 4.5, k.y, { ukuran: 8.5 });
  k.y += 6;
}

/** Gaya tabel HC Panel: kisi tipis warna garis, kepala berlatar latar. */
function gayaTabel(): UserOptions {
  return {
    theme: "grid",
    styles: {
      font: "helvetica", fontSize: 8.5, textColor: rgb(WARNA.tinta),
      lineColor: rgb(WARNA.garis), lineWidth: 0.2,
      cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
    },
    headStyles: { fillColor: rgb(WARNA.latar), textColor: rgb(WARNA.redup), fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
  };
}

// jspdf-autotable menyuntik `lastAutoTable` ke instance jsPDF tiap kali dipanggil,
// tapi augmentasi tipenya tidak selalu terbaca lewat import fungsional. Akses
// lewat helper bertipe (via unknown) agar tetap bebas `any`.
function lastTableY(doc: object): number {
  return (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
}

/** Kaki halaman di semua halaman: nomor halaman + label kerahasiaan. */
function kakiHalaman(k: Kanvas, periode: string) {
  const n = k.doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    k.doc.setPage(i);
    k.doc.setDrawColor(...rgb(WARNA.garis));
    k.doc.setLineWidth(0.25);
    k.doc.line(MARGIN, k.H - 14, k.W - MARGIN, k.H - 14);
    teks(k, `${APP_NAME} · Laporan periodik ${periode} · Rahasia, hanya untuk internal`, MARGIN, k.H - 9.5, { ukuran: 7.5, warna: WARNA.redup });
    teks(k, `Halaman ${i} dari ${n}`, k.W - MARGIN, k.H - 9.5, { ukuran: 7.5, warna: WARNA.redup, rata: "right" });
  }
}

const KOLOM_ANGKA = { halign: "right" as const };

// ── PDF: dokumen ──────────────────────────────────────────────

async function downloadPDF(
  reports: Report[], logs: StatusLog[],
  sM: number, sY: number, eM: number, eY: number,
) {
  const [{ default: jsPDFCtor }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const m = buildMetrics(reports, logs);
  const periode = formatPeriode(sM, sY, eM, eY);
  const doc = new jsPDFCtor({ orientation: "portrait", unit: "mm", format: "a4" });
  const k: Kanvas = { doc, W: doc.internal.pageSize.getWidth(), H: doc.internal.pageSize.getHeight(), y: MARGIN };
  const isi = lebarIsi(k);
  const tabel = (o: UserOptions) => autoTable(doc, { ...gayaTabel(), ...o });

  // ── Masthead ──
  gambarLogo(k, MARGIN, 14, 11);
  teks(k, APP_NAME, MARGIN + 15, 19, { ukuran: 10, tebal: true });
  teks(k, `${ORG_NAME} · Human Capital`, MARGIN + 15, 23.5, { ukuran: 8, warna: WARNA.redup });
  const lebarPil = 38;
  doc.setDrawColor(...rgb(WARNA.merah));
  doc.setLineWidth(0.3);
  doc.roundedRect(k.W - MARGIN - lebarPil, 15.5, lebarPil, 7, 3.5, 3.5, "S");
  teks(k, "RAHASIA · INTERNAL", k.W - MARGIN - lebarPil / 2, 20.2, { ukuran: 7, tebal: true, warna: WARNA.merah, rata: "center" });
  doc.setDrawColor(...rgb(WARNA.merah));
  doc.setLineWidth(0.7);
  doc.line(MARGIN, 31, MARGIN + 14, 31);
  doc.setDrawColor(...rgb(WARNA.garis));
  doc.setLineWidth(0.25);
  doc.line(MARGIN + 14, 31, k.W - MARGIN, 31);

  k.y = 44;
  teks(k, "Laporan Periodik Penanganan RWP", MARGIN, k.y, { ukuran: 20, tebal: true });
  k.y += 8;
  teks(k, `Periode ${periode}`, MARGIN, k.y, { ukuran: 11.5, warna: WARNA.redup });
  k.y += 6;
  teks(
    k,
    `Dibuat ${formatDateTime(new Date().toISOString())} · ${m.total} laporan dalam periode · Angka agregat tanpa identitas pelapor`,
    MARGIN, k.y, { ukuran: 8, warna: WARNA.redup },
  );
  k.y += 12;

  // ── 1. Ringkasan eksekutif ──
  judulBagian(k, 1, "Ringkasan eksekutif");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const paragraf: string[] = doc.splitTextToSize(narasi(m, periode), isi);
  teks(k, paragraf.join("\n"), MARGIN, k.y, { ukuran: 9.5 });
  k.y += paragraf.length * 4.8 + 4;

  const t = m.durasi.total;
  barisKpi(k, [
    { label: "Laporan masuk", nilai: String(m.total), keterangan: `${m.pctAnon}% anonim` },
    { label: "Selesai atau ditutup", nilai: String(m.selesai), keterangan: `${m.pctSelesai}% dari laporan masuk` },
    { label: "Masih ditangani", nilai: String(m.aktif), keterangan: "Belum selesai atau ditutup" },
    {
      label: "Median penyelesaian",
      nilai: t ? formatDurasi(t.median) : "—",
      keterangan: t ? `Rata-rata ${formatDurasi(t.rataRata)}` : "Belum ada yang selesai",
    },
  ]);

  pastikanRuang(k, 24);
  teks(k, "Privasi pelapor", MARGIN, k.y, { ukuran: 9, tebal: true });
  k.y += 5;
  meterProporsi(k, MARGIN, isi, m.anon, m.total, "Anonim", "Teridentifikasi");
  k.y += 4;

  // ── 2. Laporan per status (grafik kiri, tabel kanan) ──
  const lebarGrafik = 92;
  const lebarTabel = isi - lebarGrafik - 8;
  const xTabel = k.W - MARGIN - lebarTabel;

  judulBagian(
    k, 2, "Laporan per status", "Posisi terakhir setiap laporan yang masuk pada periode ini.",
    Math.max(STATUSES.length * 8.5, (STATUSES.length + 1) * 7.5) + 6,
  );
  {
    const dataStatus = STATUSES.map((s) => ({ label: s, nilai: m.byStatus[s] }));
    const tinggiGrafik = dataStatus.length * 8.5;
    pastikanRuang(k, Math.max(tinggiGrafik, (dataStatus.length + 1) * 7.5) + 6);
    const yAwal = k.y;
    grafikBatangMendatar(k, MARGIN, lebarGrafik, dataStatus);
    tabel({
      startY: yAwal - 1,
      margin: { left: xTabel, right: MARGIN },
      tableWidth: lebarTabel,
      head: [["Status", "Jumlah", "%"]],
      body: STATUSES.map((s) => [s, String(m.byStatus[s]), `${persen(m.byStatus[s], m.total)}%`]),
      columnStyles: { 1: KOLOM_ANGKA, 2: KOLOM_ANGKA },
    });
    k.y = Math.max(yAwal + tinggiGrafik, lastTableY(doc)) + 10;
  }

  // ── 3. Laporan per kategori ──
  if (m.byKategori.length > 0) {
    judulBagian(
      k, 3, "Laporan per kategori insiden", "Kategori dengan laporan terbanyak di urutan atas.",
      Math.max(m.byKategori.length * 8.5, (m.byKategori.length + 1) * 7.5) + 6,
    );
    const dataKategori = m.byKategori.map((c) => ({ label: c.kategori, nilai: c.count }));
    const tinggiGrafik = dataKategori.length * 8.5;
    pastikanRuang(k, Math.max(tinggiGrafik, (dataKategori.length + 1) * 7.5) + 6);
    const yAwal = k.y;
    grafikBatangMendatar(k, MARGIN, lebarGrafik, dataKategori);
    tabel({
      startY: yAwal - 1,
      margin: { left: xTabel, right: MARGIN },
      tableWidth: lebarTabel,
      head: [["Kategori", "Jumlah", "%"]],
      body: m.byKategori.map((c) => [c.kategori, String(c.count), `${persen(c.count, m.total)}%`]),
      columnStyles: { 1: KOLOM_ANGKA, 2: KOLOM_ANGKA },
    });
    k.y = Math.max(yAwal + tinggiGrafik, lastTableY(doc)) + 10;
  }

  // ── 4. Tren laporan masuk per bulan (bila lebih dari satu bulan) ──
  let nomor = 4;
  if (m.trend.length > 1) {
    const tinggiGrafik = 58;
    judulBagian(k, nomor++, "Tren laporan masuk per bulan", "Jumlah laporan yang masuk pada tiap bulan dalam periode.", tinggiGrafik + 6);
    pastikanRuang(k, tinggiGrafik + 6);
    grafikKolom(k, MARGIN, isi, tinggiGrafik, m.trend.map((tr) => ({ label: tr.singkat, nilai: tr.count })));
    k.y += tinggiGrafik + 4;
    tabel({
      startY: k.y,
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 90,
      head: [["Bulan", "Laporan masuk"]],
      body: m.trend.map((tr) => [tr.bulan, String(tr.count)]),
      columnStyles: { 1: KOLOM_ANGKA },
    });
    k.y = lastTableY(doc) + 10;
  }

  // ── 5. Durasi penanganan (SLA) ──
  judulBagian(
    k, nomor++, "Durasi penanganan",
    "Lama laporan bertahan di tiap status sebelum berpindah, dihitung dari riwayat perubahan status. Dasar untuk menetapkan dan memantau SLA.",
    74, // kartu KPI + grafik/tabel per status, supaya bagian ini tidak terpecah
  );
  barisKpi(k, [
    { label: "Rata-rata penyelesaian", nilai: t ? formatDurasi(t.rataRata) : "—", keterangan: t ? `Dari ${t.n} laporan selesai/ditutup` : "Belum ada yang selesai" },
    { label: "Median penyelesaian", nilai: t ? formatDurasi(t.median) : "—", keterangan: "Separuh laporan tuntas lebih cepat" },
    { label: "Penyelesaian terlama", nilai: t ? formatDurasi(t.terlama) : "—", keterangan: "Sejak masuk sampai selesai/ditutup" },
  ]);
  const fase: DurasiPenanganan["perFase"] = m.durasi.perFase;
  if (fase.some((f) => f.n > 0)) {
    pastikanRuang(k, 40);
    teks(k, "Rata-rata lama di tiap status", MARGIN, k.y, { ukuran: 9, tebal: true });
    k.y += 5.5;
    const yAwal = k.y;
    const tinggiGrafik = fase.length * 8.5;
    grafikBatangMendatar(
      k, MARGIN, lebarGrafik,
      fase.map((f) => ({ label: f.fase, nilai: f.n > 0 ? f.rataRata : 0, teks: f.n > 0 ? formatDurasi(f.rataRata) : "—" })),
    );
    tabel({
      startY: yAwal - 1,
      margin: { left: xTabel, right: MARGIN },
      tableWidth: lebarTabel,
      head: [["Status", "Laporan", "Median", "Terlama"]],
      body: fase.map((f) => [
        f.fase, String(f.n),
        f.n > 0 ? formatDurasi(f.median) : "—",
        f.n > 0 ? formatDurasi(f.terlama) : "—",
      ]),
      // Lebar eksplisit (jumlah = lebarTabel) supaya nama status dan kepala
      // kolom tidak terbungkus.
      columnStyles: {
        0: { cellWidth: 28 },
        1: { ...KOLOM_ANGKA, cellWidth: 17 },
        2: { ...KOLOM_ANGKA, cellWidth: 16 },
        3: { ...KOLOM_ANGKA, cellWidth: 17 },
      },
    });
    k.y = Math.max(yAwal + tinggiGrafik, lastTableY(doc)) + 10;
  } else {
    teks(k, "Belum ada perubahan status pada laporan periode ini, sehingga lama per status belum dapat dihitung.", MARGIN, k.y, { ukuran: 9, warna: WARNA.redup });
    k.y += 10;
  }

  // ── 6. Catatan metodologi ──
  judulBagian(k, nomor, "Catatan metodologi");
  const catatan = [
    "Laporan dikelompokkan menurut bulan masuknya (tanggal pengajuan). Status, kategori, dan durasi mengikuti kohort tersebut.",
    "Durasi dihitung dalam waktu kalender, termasuk akhir pekan dan hari libur, dari catatan perubahan status yang ditulis sistem saat admin mengubah status.",
    "Lama di tiap status hanya dihitung untuk laporan yang sudah berpindah dari status itu. Laporan yang masih berada di status tersebut belum ikut dihitung.",
    "Dokumen ini hanya memuat angka agregat. Tidak ada identitas pelapor, nomor tiket, maupun rincian per laporan, sesuai kebijakan perlindungan pelapor.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  catatan.forEach((c) => {
    const baris: string[] = doc.splitTextToSize(c, isi - 6);
    pastikanRuang(k, baris.length * 4 + 2);
    teks(k, "•", MARGIN + 1, k.y, { ukuran: 8.5, warna: WARNA.redup });
    teks(k, baris.join("\n"), MARGIN + 6, k.y, { ukuran: 8.5, warna: WARNA.redup });
    k.y += baris.length * 4 + 1.5;
  });

  kakiHalaman(k, periode);

  const filename = `laporan-rwp-${periode.replace(/\s+/g, "-").replace(/–/g, "sd")}.pdf`;
  doc.save(filename);
}

// ── Excel ─────────────────────────────────────────────────────

/** Durasi (ms) ke hari dengan dua desimal — angka, supaya bisa dihitung ulang di Excel. */
const keHari = (ms: number) => Math.round((ms / 86_400_000) * 100) / 100;

async function downloadExcel(
  reports: Report[], logs: StatusLog[],
  sM: number, sY: number, eM: number, eY: number,
) {
  const XLSX = await import("xlsx");
  const m = buildMetrics(reports, logs);
  const periode = formatPeriode(sM, sY, eM, eY);
  const wb = XLSX.utils.book_new();

  // Helper lembar: baris + lebar kolom (karakter).
  const addSheet = (name: string, rows: (string | number)[][], lebar: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = lebar.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  const t = m.durasi.total;

  // 1. Ringkasan
  addSheet("Ringkasan", [
    [`${APP_NAME} — Laporan Periodik Penanganan RWP`],
    ["Periode", periode],
    ["Organisasi", `${ORG_NAME} · Human Capital`],
    ["Dibuat", formatDateTime(new Date().toISOString())],
    ["Kerahasiaan", "Rahasia, hanya untuk internal. Angka agregat tanpa identitas pelapor."],
    [],
    ["Metrik", "Nilai"],
    ["Laporan masuk", m.total],
    ["Selesai atau ditutup", m.selesai],
    ["Tingkat penyelesaian (%)", m.pctSelesai],
    ["Masih ditangani", m.aktif],
    ["Rata-rata penyelesaian (hari)", t ? keHari(t.rataRata) : "-"],
    ["Median penyelesaian (hari)", t ? keHari(t.median) : "-"],
    ["Penyelesaian terlama (hari)", t ? keHari(t.terlama) : "-"],
    ["Laporan anonim", m.anon],
    ["Laporan teridentifikasi", m.total - m.anon],
    ["Anonim (%)", m.pctAnon],
    [],
    ["Catatan", "Durasi dalam hari kalender. Laporan dikelompokkan menurut bulan masuknya."],
  ], [34, 70]);

  // 2. Per status
  addSheet("Per status", [
    ["Status", "Jumlah", "Persentase (%)"],
    ...STATUSES.map((s) => [s, m.byStatus[s], persen(m.byStatus[s], m.total)]),
  ], [22, 10, 16]);

  // 3. Per kategori
  addSheet("Per kategori", [
    ["Kategori insiden", "Jumlah", "Persentase (%)"],
    ...m.byKategori.map((c) => [c.kategori, c.count, persen(c.count, m.total)]),
  ], [26, 10, 16]);

  // 4. Tren bulanan
  addSheet("Tren bulanan", [
    ["Bulan", "Laporan masuk"],
    ...m.trend.map((tr) => [tr.bulan, tr.count]),
  ], [18, 16]);

  // 5. Durasi penanganan
  addSheet("Durasi penanganan", [
    ["Status", "Laporan", "Rata-rata (hari)", "Median (hari)", "Terlama (hari)"],
    ...m.durasi.perFase.map((f) => [
      f.fase, f.n,
      f.n > 0 ? keHari(f.rataRata) : "-",
      f.n > 0 ? keHari(f.median) : "-",
      f.n > 0 ? keHari(f.terlama) : "-",
    ]),
    [
      "Masuk sampai selesai/ditutup", t ? t.n : 0,
      t ? keHari(t.rataRata) : "-", t ? keHari(t.median) : "-", t ? keHari(t.terlama) : "-",
    ],
    [],
    ["Catatan", "Lama di tiap status hanya untuk laporan yang sudah berpindah dari status itu."],
  ], [30, 10, 18, 16, 16]);

  const filename = `laporan-rwp-${periode.replace(/\s+/g, "-").replace(/–/g, "sd")}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── Komponen utama ────────────────────────────────────────────

// Opsi dropdown HC Panel — GlassSelect memakai nilai string, jadi angka bulan
// dan tahun dikonversi bolak-balik. Data yang dipakai tetap angka.
const OPSI_BULAN = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
const OPSI_TAHUN = YEARS.map((y) => ({ value: String(y), label: String(y) }));

export function ReportDownload() {
  const { reports, logs } = useStore();

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
        await downloadPDF(filtered, logs, startMonth, startYear, endMonth, endYear);
      } else {
        await downloadExcel(filtered, logs, startMonth, startYear, endMonth, endYear);
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
            Ekspor ringkasan penanganan laporan dalam rentang bulan tertentu: PDF
            bergrafik untuk dibagikan, Excel bertabel untuk diolah lebih lanjut.
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
