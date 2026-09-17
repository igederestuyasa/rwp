"use client";

// ============================================================
// Dashboard RWP — tampilan sistem UI "HC Panel" (docs/DESIGN.md).
// Ini pekerjaan tampilan: sumber data (useStore), perhitungan KPI, rentang
// tren, dan deep-link kartu status ke /tiket?status=<Status> TIDAK berubah.
// ============================================================

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area,
} from "recharts";
import {
  ArrowUpRight, CheckCircle, Eye, EyeSlash, Timer, Tray, Warning, XCircle,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { STATUSES, KATEGORI_INSIDEN } from "@/lib/constants";
import type { Report, Status, StatusLog } from "@/lib/types";
import { cn, localIsoDate, daysAgo, formatDurasi } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { KosongHC } from "@/components/hc/KosongHC";
import { DataTable, type Kolom } from "@/components/hc/DataTable";
import { StatusLabelLaporan } from "@/components/hc/StatusLabel";

// ── Warna grafik dari token ───────────────────────────────────
// Recharts butuh warna sebagai NILAI JavaScript, bukan kelas Tailwind. Supaya
// grafik tetap ikut token (dan ikut mode gelap) nilainya dibaca dari CSS saat
// runtime, bukan di-hardcode. Aman di SSR: getComputedStyle hanya dipanggil
// kalau `document` ada.
export const tokenWarna = (nama: string): string =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(nama).trim();

export interface PaletChart {
  tinta: string;
  redup: string;
  garis: string;
  kartu: string;
  latar: string;
  merah: string;
  lembut: string;
  /** Ramp data pastel — lima rona berjauhan, tervalidasi dataviz. */
  data: string[];
}

/**
 * Palet grafik bertoken. Dihitung ulang tiap tema berganti: lib/theme.tsx
 * memasang kelas `.dark` ke <html> sebelum render berikutnya, jadi pembacaan
 * token di sini selalu sesuai mode yang aktif.
 */
export function usePaletChart(): PaletChart {
  const { theme } = useTheme();
  return useMemo(() => {
    void theme; // kunci perhitungan ulang — nilainya dibaca dari CSS, bukan dari sini
    return {
      tinta: tokenWarna("--color-tinta"),
      redup: tokenWarna("--color-redup"),
      garis: tokenWarna("--color-garis"),
      kartu: tokenWarna("--color-kartu"),
      latar: tokenWarna("--color-latar"),
      merah: tokenWarna("--color-merah"),
      lembut: tokenWarna("--color-lembut"),
      data: [
        tokenWarna("--color-data-1"),
        tokenWarna("--color-data-2"),
        tokenWarna("--color-data-3"),
        tokenWarna("--color-data-4"),
        tokenWarna("--color-data-5"),
      ],
    };
  }, [theme]);
}

/** Gaya tooltip Recharts: latar kartu, border garis, teks tinta, radius 12. */
export function gayaTooltip(p: PaletChart) {
  return {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${p.garis}`,
      backgroundColor: p.kartu,
      color: p.tinta,
      fontSize: 12,
      padding: "8px 12px",
      boxShadow: "var(--shadow-popover)",
    },
    labelStyle: { color: p.tinta, fontWeight: 600 },
    itemStyle: { color: p.redup },
    cursorFill: p.latar,
  };
}

// ── Ikon status (Phosphor, gaya regular) ──────────────────────
const IKON_STATUS: Record<Status, React.ElementType> = {
  Diterima:          Tray,
  "Sedang Ditinjau": Eye,
  "Tindak Lanjut":   Warning,
  Selesai:           CheckCircle,
  Ditutup:           XCircle,
};

const PRESET_TREN = [
  { label: "7 hari",  hari: 7 },
  { label: "30 hari", hari: 30 },
  { label: "3 bulan", hari: 90 },
];

// ── Durasi penanganan per fase (dasar penetapan SLA) ──────────
// Laporan masuk fase "Diterima" saat dibuat, lalu berpindah fase lewat baris
// report_status_log. Lama sebuah fase = waktu keluar − waktu masuk; fase yang
// belum ditinggalkan tidak dihitung. Baris audit eskalasi identitas bukan
// perpindahan status (from == to, lihat RPC reveal_reporter), jadi diabaikan.
// Hanya menyentuh timestamp dan status — tidak ada isi laporan maupun
// identitas (§9.1).

/** Fase yang bisa ditinggalkan; status akhir tidak punya lama "di dalam". */
const FASE_BERJALAN: Status[] = ["Diterima", "Sedang Ditinjau", "Tindak Lanjut"];

export interface RingkasanDurasi {
  /** Jumlah laporan yang menjadi sampel. */
  n: number;
  rataRata: number; // ms
  median: number;   // ms
  terlama: number;  // ms
}

export interface DurasiFase extends RingkasanDurasi {
  fase: Status;
}

export interface DurasiPenanganan {
  /** Lama laporan bertahan di tiap fase sebelum berpindah. */
  perFase: DurasiFase[];
  /** Masuk → status akhir (Selesai/Ditutup), dari resolvedAt — definisi yang
   *  sama dengan rata-rata penyelesaian di laporan periodik (ReportDownload). */
  total: RingkasanDurasi | null;
}

const waktu = (iso: string) => new Date(iso).getTime();

function ringkas(sampel: number[]): RingkasanDurasi | null {
  if (sampel.length === 0) return null;
  const urut = [...sampel].sort((a, b) => a - b);
  const tengah = Math.floor(urut.length / 2);
  return {
    n: urut.length,
    rataRata: urut.reduce((s, x) => s + x, 0) / urut.length,
    median: urut.length % 2 === 0 ? (urut[tengah - 1] + urut[tengah]) / 2 : urut[tengah],
    terlama: urut[urut.length - 1],
  };
}

export function hitungDurasiPenanganan(reports: Report[], logs: StatusLog[]): DurasiPenanganan {
  const sampel = new Map<Status, number[]>(FASE_BERJALAN.map((f) => [f, []]));

  // Perpindahan sungguhan saja, dikelompokkan per laporan dan urut waktu.
  const perLaporan = new Map<string, StatusLog[]>();
  logs.forEach((l) => {
    if (l.fromStatus === null || l.fromStatus === l.toStatus) return;
    const arr = perLaporan.get(l.reportId) ?? [];
    arr.push(l);
    perLaporan.set(l.reportId, arr);
  });

  reports.forEach((r) => {
    const masuk = new Map<Status, number>([["Diterima", waktu(r.createdAt)]]);
    const urut = [...(perLaporan.get(r.id) ?? [])].sort(
      (a, b) => waktu(a.createdAt) - waktu(b.createdAt),
    );
    urut.forEach((l) => {
      const dari = l.fromStatus as Status;
      const t = waktu(l.createdAt);
      const awal = masuk.get(dari);
      if (awal !== undefined && t >= awal) sampel.get(dari)?.push(t - awal);
      masuk.delete(dari);
      masuk.set(l.toStatus, t);
    });
  });

  const perFase: DurasiFase[] = FASE_BERJALAN.map((fase) => ({
    fase,
    ...(ringkas(sampel.get(fase) ?? []) ?? { n: 0, rataRata: 0, median: 0, terlama: 0 }),
  }));

  const total = ringkas(
    reports
      .filter((r) => r.resolvedAt)
      .map((r) => waktu(r.resolvedAt!) - waktu(r.createdAt))
      .filter((ms) => ms >= 0),
  );

  return { perFase, total };
}

const nilaiDurasi = (f: DurasiFase, ms: number) => (f.n > 0 ? formatDurasi(ms) : "—");

const KOLOM_DURASI: Kolom<DurasiFase>[] = [
  { kunci: "fase", judul: "Status", render: (f) => <StatusLabelLaporan status={f.fase} /> },
  { kunci: "n", judul: "Laporan", angka: true, render: (f) => f.n },
  { kunci: "rataRata", judul: "Rata-rata", angka: true, render: (f) => nilaiDurasi(f, f.rataRata) },
  { kunci: "median", judul: "Median", angka: true, render: (f) => nilaiDurasi(f, f.median) },
  { kunci: "terlama", judul: "Terlama", angka: true, render: (f) => nilaiDurasi(f, f.terlama) },
];

// Panel grafik: permukaan datar bertoken, radius 24, tanpa bayangan.
const KELAS_PANEL =
  "rounded-[var(--radius-panel)] border border-garis bg-kartu p-5 sm:p-6";

export function RwpDashboard() {
  const { reports, logs } = useStore();
  const router = useRouter();

  const palet = usePaletChart();
  const tooltip = gayaTooltip(palet);
  const gayaSumbu = { fontSize: 12, fill: palet.redup };

  const [trendFrom, setTrendFrom] = useState(() => localIsoDate(daysAgo(6)));
  const [trendTo, setTrendTo] = useState(() => localIsoDate());

  function setPreset(days: number) {
    setTrendFrom(localIsoDate(daysAgo(days - 1)));
    setTrendTo(localIsoDate());
  }

  const rwpReports = reports;

  const totalRwp   = rwpReports.length;
  const anonCount  = rwpReports.filter((r) => r.isAnonymous).length;
  const anonPct    = totalRwp > 0 ? Math.round((anonCount / totalRwp) * 100) : 0;
  const activeCount = rwpReports.filter(
    (r) => r.status !== "Selesai" && r.status !== "Ditutup",
  ).length;

  const countByStatus = useMemo(
    () => Object.fromEntries(
      STATUSES.map((s) => [s, rwpReports.filter((r) => r.status === s).length]),
    ) as Record<Status, number>,
    [rwpReports],
  );

  // Tren laporan masuk
  const trend = useMemo(() => {
    const map = new Map<string, number>();
    rwpReports.forEach((r) => {
      const d = r.createdAt.slice(0, 10);
      if (d < trendFrom || d > trendTo) return;
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    const result: { date: string; value: number }[] = [];
    const cur = new Date(trendFrom + "T00:00:00");
    const end = new Date(trendTo + "T00:00:00");
    while (cur <= end) {
      const d = localIsoDate(cur);
      result.push({ date: d.slice(5), value: map.get(d) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [rwpReports, trendFrom, trendTo]);

  // Breakdown per kategori insiden
  const byKategori = useMemo(() => {
    const map = new Map<string, number>();
    rwpReports.forEach((r) => {
      if (r.kategori) map.set(r.kategori, (map.get(r.kategori) ?? 0) + 1);
    });
    return KATEGORI_INSIDEN
      .map((k) => ({ name: k, value: map.get(k) ?? 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rwpReports]);

  // Durasi penanganan per fase — dasar SLA
  const durasi = useMemo(() => hitungDurasiPenanganan(rwpReports, logs), [rwpReports, logs]);
  const adaDurasiFase = durasi.perFase.some((f) => f.n > 0);

  return (
    <div className="space-y-12">
      {/* ── Ringkasan (KPI) ── */}
      <section>
        <SectionTitle
          title="Ringkasan laporan"
          subtitle="Dihitung dari seluruh laporan RWP yang masuk."
        />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KartuKpi label="Total laporan" nilai={totalRwp} />
          <KartuKpi
            label="Anonim"
            nilai={anonCount}
            keterangan={`${anonPct}% dari total`}
            ikon={<EyeSlash size={20} aria-hidden="true" />}
          />
          <KartuKpi
            label="Sedang aktif"
            nilai={activeCount}
            keterangan="Belum selesai atau ditutup"
          />
        </div>
      </section>

      {/* ── Kartu status: deep-link ke daftar tiket terfilter ── */}
      <section>
        <SectionTitle
          title="Laporan per status"
          subtitle="Pilih satu status untuk membuka daftar tiketnya."
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATUSES.map((s) => {
            const Ikon = IKON_STATUS[s];
            const count = countByStatus[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => router.push(`/tiket?status=${encodeURIComponent(s)}`)}
                className={cn(
                  "group flex min-h-[92px] flex-col gap-2 rounded-[var(--radius-kartu)]",
                  "border border-garis bg-kartu p-4 text-left",
                  "transition-colors duration-150 ease-[var(--ease-standar)]",
                  "hover:border-tinta active:scale-[.99]",
                )}
              >
                <span className="flex items-center justify-between text-redup">
                  <Ikon size={20} aria-hidden="true" />
                  <ArrowUpRight
                    size={18}
                    aria-hidden="true"
                    className={cn(
                      "transition-all duration-200 ease-[var(--ease-standar)]",
                      "group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-merah",
                    )}
                  />
                </span>
                <span className="text-bagian font-bold tabular-nums text-tinta">
                  {count}
                </span>
                <span className="text-bantu text-redup">{s}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Durasi penanganan: dasar penetapan SLA ── */}
      <section className={KELAS_PANEL}>
        <h2 className="text-subjudul font-bold tracking-[-0.02em] text-tinta">
          Durasi penanganan
        </h2>
        <p className="mt-1 text-bantu text-redup">
          Lama laporan bertahan di tiap status sebelum berpindah, dihitung dari
          riwayat perubahan status. Dasar untuk menetapkan SLA.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KartuKpi
            label="Rata-rata penyelesaian"
            nilai={durasi.total ? formatDurasi(durasi.total.rataRata) : "—"}
            keterangan={
              durasi.total
                ? `Dari ${durasi.total.n} laporan yang selesai atau ditutup`
                : "Belum ada laporan yang selesai atau ditutup"
            }
            ikon={<Timer size={20} aria-hidden="true" />}
          />
          <KartuKpi
            label="Median penyelesaian"
            nilai={durasi.total ? formatDurasi(durasi.total.median) : "—"}
            keterangan="Separuh laporan tuntas lebih cepat dari ini"
          />
          <KartuKpi
            label="Penyelesaian terlama"
            nilai={durasi.total ? formatDurasi(durasi.total.terlama) : "—"}
            keterangan="Sejak laporan masuk sampai selesai atau ditutup"
          />
        </div>

        <div className="mt-6">
          <h3 className="text-bantu font-semibold text-tinta">Lama di tiap status</h3>
          <p className="mt-1 text-bantu text-redup">
            Sejak laporan masuk ke status itu sampai berpindah ke status berikutnya.
            Laporan yang masih berada di status tersebut belum ikut dihitung.
          </p>
          {adaDurasiFase ? (
            <DataTable
              className="mt-4"
              label="Lama laporan di tiap status"
              kolom={KOLOM_DURASI}
              data={durasi.perFase}
              kunciBaris={(f) => f.fase}
            />
          ) : (
            <KosongHC
              className="mt-4"
              judul="Belum ada perubahan status"
              ajakan="Begitu laporan pertama berpindah status dari halaman tiket, lama tiap fasenya muncul di sini."
            />
          )}
        </div>
      </section>

      {/* ── Grafik ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tren laporan masuk */}
        <div className={KELAS_PANEL}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-subjudul font-bold tracking-[-0.02em] text-tinta">
                Tren laporan masuk
              </h2>
              <p className="mt-1 text-bantu text-redup">
                Jumlah laporan per hari pada rentang terpilih.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_TREN.map(({ label, hari }) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11"
                  onClick={() => setPreset(hari)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="Tanggal mulai tren"
              value={trendFrom}
              max={trendTo}
              onChange={(e) => setTrendFrom(e.target.value)}
              className="w-auto"
            />
            <span className="text-bantu text-redup">–</span>
            <Input
              type="date"
              aria-label="Tanggal akhir tren"
              value={trendTo}
              min={trendFrom}
              onChange={(e) => setTrendTo(e.target.value)}
              className="w-auto"
            />
          </div>

          <div className="mt-5">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rwpTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={palet.data[0]} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={palet.data[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={palet.garis} vertical={false} />
                <XAxis dataKey="date" tick={gayaSumbu} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={gayaSumbu} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  contentStyle={tooltip.contentStyle}
                  labelStyle={tooltip.labelStyle}
                  itemStyle={tooltip.itemStyle}
                  cursor={{ fill: tooltip.cursorFill }}
                />
                <Area
                  type="monotone" dataKey="value" name="Laporan"
                  stroke={palet.data[0]} strokeWidth={2}
                  fill="url(#rwpTrend)" dot={false}
                  activeDot={{ r: 4, fill: palet.data[0], stroke: palet.kartu, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown per kategori insiden */}
        <div className={KELAS_PANEL}>
          <h2 className="text-subjudul font-bold tracking-[-0.02em] text-tinta">
            Laporan per kategori
          </h2>
          <p className="mt-1 text-bantu text-redup">
            Kategori insiden dengan laporan terbanyak di urutan atas.
          </p>

          <div className="mt-5">
            {byKategori.length === 0 ? (
              <KosongHC
                judul="Belum ada laporan"
                ajakan="Begitu laporan pertama masuk, sebarannya per kategori muncul di sini."
              />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byKategori} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palet.garis} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={gayaSumbu} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category" dataKey="name" width={140}
                    tick={gayaSumbu} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => v.replace(" (harassment)", "").replace(" (bullying)", "")}
                  />
                  <Tooltip
                    contentStyle={tooltip.contentStyle}
                    labelStyle={tooltip.labelStyle}
                    itemStyle={tooltip.itemStyle}
                    cursor={{ fill: tooltip.cursorFill }}
                  />
                  {/* Ramp data pastel — lima rona berjauhan, bukan gradasi satu warna. */}
                  <Bar dataKey="value" name="Laporan" radius={[0, 4, 4, 0]} fill={palet.data[0]}>
                    {byKategori.map((d, i) => (
                      <Cell key={d.name} fill={palet.data[i % palet.data.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Privasi pelapor ── */}
      <section className={KELAS_PANEL}>
        <h2 className="text-subjudul font-bold tracking-[-0.02em] text-tinta">
          Privasi pelapor
        </h2>
        <p className="mt-1 text-bantu text-redup">
          Perbandingan laporan anonim dan teridentifikasi.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-8">
          <div className="min-w-[200px] flex-1">
            <div className="mb-2 flex justify-between text-bantu text-redup">
              <span>Anonim</span>
              <span>Teridentifikasi</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-latar">
              <div
                className="h-full rounded-full bg-tinta transition-all duration-150"
                style={{ width: `${anonPct}%` }}
              />
            </div>
          </div>

          <div className="flex gap-8">
            <div>
              <div className="text-panel font-bold tabular-nums text-tinta">{anonCount}</div>
              <div className="text-bantu text-redup">Anonim ({anonPct}%)</div>
            </div>
            <div>
              <div className="text-panel font-bold tabular-nums text-tinta">
                {totalRwp - anonCount}
              </div>
              <div className="text-bantu text-redup">
                Teridentifikasi ({100 - anonPct}%)
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Kartu KPI: permukaan datar bertoken, tanpa bayangan & gradient ──
function KartuKpi({
  label,
  nilai,
  keterangan,
  ikon,
}: {
  label: string;
  nilai: number | string;
  keterangan?: string;
  ikon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4">
      <div className="flex items-center gap-2 text-bantu font-semibold text-redup">
        {ikon}
        {label}
      </div>
      <div className="mt-2 text-panel font-bold tabular-nums leading-none text-tinta">
        {nilai}
      </div>
      {keterangan && <p className="mt-2 text-bantu text-redup">{keterangan}</p>}
    </div>
  );
}
