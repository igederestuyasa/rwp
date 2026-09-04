"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Star } from "lucide-react";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import { useTheme } from "@/lib/theme";
import { localIsoDate, daysAgo } from "@/lib/utils";
import { ASSISTANT_NAME } from "@/lib/constants";

// ── Tipe ──────────────────────────────────────────────────────
interface FeedbackRow {
  log_date: string;
  stars: number;
  count: number;
}

// ── Konstanta ──────────────────────────────────────────────────
const PRESETS: { label: string; days: number }[] = [
  { label: "7H",  days: 7 },
  { label: "30H", days: 30 },
  { label: "3B",  days: 90 },
];

const STAR_COLORS: Record<number, string> = {
  1: "#f43f5e",
  2: "#fb923c",
  3: "#facc15",
  4: "#34d399",
  5: "#10b981",
};

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
  const { theme } = useTheme();
  const dark = theme === "dark";
  const today = localIsoDate();

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [from, setFrom] = useState(() => localIsoDate(daysAgo(29)));
  const [to, setTo] = useState(today);

  const range = `${from}|${to}`;
  const [loadedRange, setLoadedRange] = useState<string | null>(null);
  const loading = loadedRange !== range;

  useEffect(() => {
    let active = true;
    if (USE_MOCK) {
      const mock = makeMockRows(from, to);
      if (active) { setRows(mock); setLoadedRange(`${from}|${to}`); }
      return () => { active = false; };
    }
    void getSupabase()
      .rpc("get_chat_feedback_summary", { p_start: from, p_end: to })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setRows(data as FeedbackRow[]);
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

  // Chart styles (seragam dengan dashboard)
  const axisColor   = dark ? "#94a3b8" : "#64748b";
  const axisColorMuted = dark ? "#64748b" : "#94a3b8";
  const gridColor   = dark ? "#334155" : "#f1f5f9";
  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    backgroundColor: dark ? "#1e293b" : "#fff",
    color: dark ? "#cbd5e1" : "#0f172a",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
            <Star className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Rating {ASSISTANT_NAME}
          </h2>
        </div>

        {/* Kontrol tanggal */}
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date" value={from} max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200/60 bg-white/60 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-300 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-200"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="date" value={to} min={from}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200/60 bg-white/60 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-300 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-200"
          />
          {PRESETS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => setPreset(days)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Konten */}
      <div className={`p-6 transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : ""}`}>

        {/* KPI row */}
        <div className="mb-6 flex flex-wrap gap-4">
          <KpiChip
            label="Total Ulasan"
            value={totalRatings === 0 ? "—" : totalRatings.toLocaleString("id-ID")}
          />
          <KpiChip
            label="Rata-rata Bintang"
            value={avgStars === null ? "—" : `${avgStars} / 5`}
            accent
          />
          {avgStars !== null && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className="h-4 w-4"
                  fill={s <= Math.round(avgStars) ? "#f59e0b" : "none"}
                  stroke={s <= Math.round(avgStars) ? "#f59e0b" : "#94a3b8"}
                />
              ))}
            </div>
          )}
        </div>

        {totalRatings === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            Belum ada ulasan pada rentang tanggal ini.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Distribusi bintang */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Distribusi Bintang
              </p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distribution}
                    margin={{ top: 4, right: 16, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: axisColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: axisColorMuted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => [v, "Ulasan"]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {distribution.map((d) => (
                        <Cell key={d.stars} fill={STAR_COLORS[d.stars]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tren rata-rata harian */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tren Rata-rata Harian
              </p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trend}
                    margin={{ top: 4, right: 16, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: axisColorMuted }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11, fill: axisColorMuted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => [`${v} bintang`, "Rata-rata"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/60 dark:bg-slate-700/50 dark:ring-slate-600/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-amber-500" : "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}
