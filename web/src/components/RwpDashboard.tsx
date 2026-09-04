"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area,
} from "recharts";
import {
  ShieldAlert, EyeOff, Eye, Inbox, AlertTriangle, CheckCircle2,
  XCircle, TrendingUp, BarChart2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUSES, KATEGORI_INSIDEN } from "@/lib/constants";
import type { Status } from "@/lib/types";
import { cn, localIsoDate, daysAgo } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { DotGrid } from "@/components/ui/DotGrid";

const STATUS_GRAD: Record<Status, string> = {
  Diterima:          "from-blue-500 to-indigo-600",
  "Sedang Ditinjau": "from-amber-400 to-amber-600",
  "Tindak Lanjut":   "from-orange-400 to-orange-600",
  Selesai:           "from-emerald-400 to-teal-600",
  Ditutup:           "from-slate-400 to-slate-600",
};

const STATUS_SHADOW: Record<Status, string> = {
  Diterima:          "hover:shadow-blue-200 dark:hover:shadow-blue-900/60",
  "Sedang Ditinjau": "hover:shadow-amber-200 dark:hover:shadow-amber-900/60",
  "Tindak Lanjut":   "hover:shadow-orange-200 dark:hover:shadow-orange-900/60",
  Selesai:           "hover:shadow-emerald-200 dark:hover:shadow-emerald-900/60",
  Ditutup:           "hover:shadow-slate-200 dark:hover:shadow-slate-700/60",
};

const STATUS_ICON: Record<Status, React.ElementType> = {
  Diterima:          Inbox,
  "Sedang Ditinjau": Eye,
  "Tindak Lanjut":   AlertTriangle,
  Selesai:           CheckCircle2,
  Ditutup:           XCircle,
};

// Warna per kategori insiden
const KATEGORI_COLORS = [
  "#f43f5e", "#fb923c", "#f59e0b", "#8b5cf6", "#3b82f6", "#0ea5e9", "#64748b",
];

export function RwpDashboard() {
  const { reports } = useStore();
  const router = useRouter();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const chartAxisTick  = dark ? "#94a3b8" : "#64748b";
  const chartGrid      = dark ? "#334155" : "#f1f5f9";
  const chartCursor    = dark ? "#1e293b" : "#f8fafc";
  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    backgroundColor: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#cbd5e1" : "#0f172a",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  };
  const tooltipLabelStyle = { color: dark ? "#e2e8f0" : "#0f172a", fontWeight: 600 };
  const tooltipItemStyle  = { color: dark ? "#94a3b8" : "#475569" };

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
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-600 to-orange-600 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl" />
        <DotGrid />

        <div className="relative px-6 pb-6 pt-6 sm:px-8 sm:pt-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            {/* Judul */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-rose-100 ring-1 ring-white/20 backdrop-blur-sm">
                <ShieldAlert className="h-3.5 w-3.5" />
                Respectful Workplace Policy
              </div>
              <h1 className="mt-2.5 text-2xl font-bold tracking-tight">
                Dashboard RWP
              </h1>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-rose-100">
                Pemantauan laporan RWP. Identitas pelapor tidak ditampilkan.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="flex flex-wrap gap-3">
              {/* Total */}
              <div className="min-w-[100px] rounded-2xl bg-white/15 px-4 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
                <div className="text-3xl font-bold">{totalRwp}</div>
                <div className="mt-0.5 text-xs font-medium text-rose-100">Total Laporan</div>
              </div>
              {/* Anonim */}
              <div className="min-w-[100px] rounded-2xl bg-white/15 px-4 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <EyeOff className="h-4 w-4 text-rose-200" />
                  <span className="text-3xl font-bold">{anonCount}</span>
                </div>
                <div className="mt-0.5 text-xs font-medium text-rose-100">
                  Anonim ({anonPct}%)
                </div>
              </div>
              {/* Aktif */}
              <div className="min-w-[100px] rounded-2xl bg-white/15 px-4 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
                <div className="text-3xl font-bold">{activeCount}</div>
                <div className="mt-0.5 text-xs font-medium text-rose-100">Sedang Aktif</div>
              </div>
            </div>
          </div>

          {/* Status cards */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STATUSES.map((s) => {
              const Icon = STATUS_ICON[s];
              const count = countByStatus[s];
              return (
                <button
                  key={s}
                  onClick={() => router.push(`/tiket?status=${encodeURIComponent(s)}`)}
                  className={cn(
                    "group flex flex-col gap-1.5 rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15",
                    "transition-all hover:bg-white/20 hover:shadow-lg",
                    STATUS_SHADOW[s],
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                    STATUS_GRAD[s],
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs font-medium text-rose-100 leading-tight">{s}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Tren laporan masuk */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tren Laporan Masuk
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { label: "7H",  days: 7 },
                { label: "30H", days: 30 },
                { label: "3B",  days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => setPreset(days)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  {label}
                </button>
              ))}
              <input
                type="date" value={trendFrom}
                onChange={(e) => setTrendFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                type="date" value={trendTo}
                onChange={(e) => setTrendTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              />
            </div>
          </div>
          <div className="px-4 py-5">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rwpTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartAxisTick }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartAxisTick }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: chartCursor }} />
                <Area type="monotone" dataKey="value" name="Laporan" stroke="#f43f5e" strokeWidth={2} fill="url(#rwpTrend)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown per kategori insiden */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm">
              <BarChart2 className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Laporan per Kategori
            </h2>
          </div>
          <div className="px-4 py-5">
            {byKategori.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
                Belum ada data laporan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byKategori} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: chartAxisTick }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category" dataKey="name" width={160}
                    tick={{ fontSize: 10, fill: chartAxisTick }} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => v.replace(" (harassment)", "").replace(" (bullying)", "")}
                  />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: chartCursor }} />
                  <Bar dataKey="value" name="Laporan" radius={[0, 4, 4, 0]}>
                    {byKategori.map((_, i) => (
                      <Cell key={i} fill={KATEGORI_COLORS[i % KATEGORI_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Anonim vs Teridentifikasi */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-sm">
              <EyeOff className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Privasi Pelapor
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 px-5 py-5">
          {/* Progress bar */}
          <div className="flex-1 min-w-[200px]">
            <div className="mb-2 flex justify-between text-xs font-medium">
              <span className="text-slate-500 dark:text-slate-400">Anonim</span>
              <span className="text-slate-500 dark:text-slate-400">Teridentifikasi</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all"
                style={{ width: `${anonPct}%` }}
              />
            </div>
          </div>
          {/* Angka */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{anonCount}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Anonim ({anonPct}%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{totalRwp - anonCount}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Teridentifikasi ({100 - anonPct}%)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
