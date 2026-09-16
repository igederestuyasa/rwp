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
  ArrowUpRight, CheckCircle, Eye, EyeSlash, Tray, Warning, XCircle,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { STATUSES, KATEGORI_INSIDEN } from "@/lib/constants";
import type { Status } from "@/lib/types";
import { cn, localIsoDate, daysAgo } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { KosongHC } from "@/components/hc/KosongHC";

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

// Panel grafik: permukaan datar bertoken, radius 24, tanpa bayangan.
const KELAS_PANEL =
  "rounded-[var(--radius-panel)] border border-garis bg-kartu p-5 sm:p-6";

export function RwpDashboard() {
  const { reports } = useStore();
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
                    <stop offset="5%"  stopColor={palet.merah} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={palet.merah} stopOpacity={0} />
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
                  stroke={palet.merah} strokeWidth={2}
                  fill="url(#rwpTrend)" dot={false}
                  activeDot={{ r: 4, fill: palet.merah, stroke: palet.kartu, strokeWidth: 2 }}
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
                  {/* Satu warna (tinta) dengan gradasi opasitas — bukan palet pelangi. */}
                  <Bar dataKey="value" name="Laporan" radius={[0, 4, 4, 0]} fill={palet.tinta}>
                    {byKategori.map((d, i) => (
                      <Cell
                        key={d.name}
                        fill={palet.tinta}
                        fillOpacity={Math.max(0.4, 1 - i * 0.1)}
                      />
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
  nilai: number;
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
