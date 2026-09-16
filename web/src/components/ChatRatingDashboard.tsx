"use client";

// ============================================================
// Rating asisten — panel agregat di dashboard admin.
// Tampilan mengikuti sistem UI "HC Panel" (docs/DESIGN.md). Logika tidak
// berubah: rentang tanggal, preset, RPC get_chat_feedback_summary, dan
// pemisahan mock/Supabase tetap sama. Isi percakapan TIDAK pernah dibaca (§9.2).
// ============================================================

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Star } from "@phosphor-icons/react";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import { localIsoDate, daysAgo } from "@/lib/utils";
import { ASSISTANT_NAME } from "@/lib/constants";
import { usePaletChart, gayaTooltip } from "@/components/RwpDashboard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

// ── Tipe ──────────────────────────────────────────────────────
interface FeedbackRow {
  log_date: string;
  stars: number;
  count: number;
}

// ── Konstanta ──────────────────────────────────────────────────
const PRESETS: { label: string; days: number }[] = [
  { label: "7 hari",  days: 7 },
  { label: "30 hari", days: 30 },
  { label: "3 bulan", days: 90 },
];

// ── Mock data ──────────────────────────────────────────────────
function makeMockRows(from: string, to: string): FeedbackRow[] {
  const rows: FeedbackRow[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    const d = localIsoDate(cur);
    // Simulasi: kebanyakan 4–5 bintang
    const dist = [1, 0, 1, 3, 5];
    dist.forEach((count, i) => {
      if (count > 0) rows.push({ log_date: d, stars: i + 1, count });
    });
    cur.setDate(cur.getDate() + 1);
  }
  return rows;
}

// ── Agregasi ──────────────────────────────────────────────────

function toDistribution(rows: FeedbackRow[]): { stars: number; count: number; label: string }[] {
  const map = new Map<number, number>();
  for (let s = 1; s <= 5; s++) map.set(s, 0);
  rows.forEach((r) => map.set(r.stars, (map.get(r.stars) ?? 0) + r.count));
  return Array.from(map, ([stars, count]) => ({
    stars,
    count,
    label: "★".repeat(stars),
  }));
}

interface TrendPoint { date: string; avg: number | null; total: number }

function toTrend(rows: FeedbackRow[], from: string, to: string): TrendPoint[] {
  const map = new Map<string, { sum: number; total: number }>();
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    map.set(localIsoDate(cur), { sum: 0, total: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  rows.forEach((r) => {
    const pt = map.get(r.log_date);
    if (pt) { pt.sum += r.stars * r.count; pt.total += r.count; }
  });
  return Array.from(map, ([d, { sum, total }]) => ({
    date: d.slice(5),
    avg: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
    total,
  }));
}

// ── Komponen utama ─────────────────────────────────────────────

export function ChatRatingDashboard() {
  const today = localIsoDate();

  const [fetchedRows, setFetchedRows] = useState<FeedbackRow[]>([]);
  const [from, setFrom] = useState(() => localIsoDate(daysAgo(29)));
  const [to, setTo] = useState(today);

  const range = `${from}|${to}`;
  const [loadedRange, setLoadedRange] = useState<string | null>(null);

  // Mode mock: baris dihitung langsung dari rentang tanggal. Ini fungsi murni,
  // jadi tak perlu effect — menghitungnya saat render menghindari render kedua
  // yang cuma menyalin hasil ke state.
  const mockRows = useMemo(
    () => (USE_MOCK ? makeMockRows(from, to) : []),
    [from, to],
  );

  const rows    = USE_MOCK ? mockRows : fetchedRows;
  const loading = USE_MOCK ? false : loadedRange !== range;

  useEffect(() => {
    if (USE_MOCK) return;
    let active = true;
    void getSupabase()
      .rpc("get_chat_feedback_summary", { p_start: from, p_end: to })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setFetchedRows(data as FeedbackRow[]);
        setLoadedRange(`${from}|${to}`);
      });
    return () => { active = false; };
  }, [from, to]);

  function setPreset(days: number) {
    setFrom(localIsoDate(daysAgo(days - 1)));
    setTo(today);
  }

  const distribution = useMemo(() => toDistribution(rows), [rows]);
  const trend        = useMemo(() => toTrend(rows, from, to), [rows, from, to]);

  const totalRatings = useMemo(() => rows.reduce((s, r) => s + r.count, 0), [rows]);
  const avgStars = useMemo(() => {
    const totalSum = rows.reduce((s, r) => s + r.stars * r.count, 0);
    return totalRatings > 0 ? Math.round((totalSum / totalRatings) * 10) / 10 : null;
  }, [rows, totalRatings]);

  // Warna grafik dari token (seragam dengan RwpDashboard).
  const palet = usePaletChart();
  const tooltip = gayaTooltip(palet);
  const gayaSumbu = { fontSize: 12, fill: palet.redup };

  return (
    <section className="rounded-[var(--radius-panel)] border border-garis bg-kartu p-5 sm:p-6">
      {/* Kepala panel */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-subjudul font-bold tracking-[-0.02em] text-tinta">
            Rating {ASSISTANT_NAME}
          </h2>
          <p className="mt-1 text-bantu text-redup">
            Ulasan agregat dari karyawan, tanpa isi percakapan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(({ label, days }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-11"
              onClick={() => setPreset(days)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Kontrol tanggal */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          type="date"
          aria-label="Tanggal mulai rating"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="w-auto"
        />
        <span className="text-bantu text-redup">–</span>
        <Input
          type="date"
          aria-label="Tanggal akhir rating"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="w-auto"
        />
      </div>

      {/* Konten */}
      <div
        className={`mt-6 transition-opacity duration-150 ${
          loading ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {/* Ringkasan */}
        <div className="flex flex-wrap items-center gap-3">
          <KartuRingkas
            label="Total ulasan"
            nilai={totalRatings === 0 ? "—" : totalRatings.toLocaleString("id-ID")}
          />
          <KartuRingkas
            label="Rata-rata bintang"
            nilai={avgStars === null ? "—" : `${avgStars} / 5`}
          />
          {avgStars !== null && (
            <div
              className="flex items-center gap-1"
              aria-label={`Rata-rata ${avgStars} dari 5 bintang`}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={18}
                  aria-hidden="true"
                  weight={s <= Math.round(avgStars) ? "fill" : "regular"}
                  className={s <= Math.round(avgStars) ? "text-tinta" : "text-garis-kuat"}
                />
              ))}
            </div>
          )}
        </div>

        {totalRatings === 0 ? (
          <p className="mt-6 text-isi text-redup">
            Belum ada ulasan pada rentang tanggal ini — coba rentang yang lebih panjang.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Distribusi bintang */}
            <div>
              <h3 className="text-bantu font-semibold text-tinta">Distribusi bintang</h3>
              <p className="mt-1 text-bantu text-redup">
                Jumlah ulasan untuk tiap jumlah bintang.
              </p>
              <div className="mt-4 h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distribution}
                    margin={{ top: 4, right: 16, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={palet.garis} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={gayaSumbu}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={gayaSumbu}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltip.contentStyle}
                      labelStyle={tooltip.labelStyle}
                      itemStyle={tooltip.itemStyle}
                      cursor={{ fill: tooltip.cursorFill }}
                      formatter={(v) => [v, "Ulasan"]}
                    />
                    {/* Ramp data hangat — satu keluarga warna per jumlah bintang. */}
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} fill={palet.data[0]}>
                      {distribution.map((d, i) => (
                        <Cell key={d.stars} fill={palet.data[i % palet.data.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tren rata-rata harian */}
            <div>
              <h3 className="text-bantu font-semibold text-tinta">Tren rata-rata harian</h3>
              <p className="mt-1 text-bantu text-redup">
                Rata-rata bintang per hari pada rentang terpilih.
              </p>
              <div className="mt-4 h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trend}
                    margin={{ top: 4, right: 16, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={palet.garis} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={gayaSumbu}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={gayaSumbu}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltip.contentStyle}
                      labelStyle={tooltip.labelStyle}
                      itemStyle={tooltip.itemStyle}
                      cursor={{ fill: tooltip.cursorFill }}
                      formatter={(v) => [`${v} bintang`, "Rata-rata"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke={palet.data[2]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: palet.data[2], strokeWidth: 0 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Kartu ringkas: permukaan datar bertoken, tanpa bayangan.
function KartuRingkas({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-[var(--radius-kartu)] border border-garis bg-kartu px-4 py-3">
      <p className="text-bantu text-redup">{label}</p>
      <p className="mt-1 text-bagian font-bold tabular-nums text-tinta">{nilai}</p>
    </div>
  );
}
