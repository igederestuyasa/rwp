"use client";

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { useSearchParams } from "next/navigation";
import { BookOpen, ChevronLeft, FileText, Search, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { POLICIES, type PolicyDoc } from "@/lib/policies";
import { USE_MOCK, getSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DotGrid } from "@/components/ui/DotGrid";
import { PdfViewer } from "@/components/PdfViewer";

// ─── Komponen custom untuk ReactMarkdown ────────────────────────────────────
const mdComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 last:mb-0">
      {children}
    </p>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm text-slate-600 dark:text-slate-400">
      {children}
    </ol>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-4 list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
      {children}
    </ul>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-1">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-xl border-l-4 border-blue-300 bg-blue-50 px-4 py-3 text-sm italic text-blue-800 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-800 dark:text-slate-200">{children}</strong>
  ),
  hr: () => (
    <hr className="my-6 border-slate-100 dark:border-slate-700" />
  ),
};

// ─── Warna per kategori ───────────────────────────────────────────────────────
interface Tone { grad: string; iconBg: string; iconText: string; badge: string }

const CATEGORY_TONE: Record<string, Tone> = {
  "Hubungan Kerja": {
    grad: "from-rose-500 to-pink-600",
    iconBg: "bg-rose-50 dark:bg-rose-900/30",
    iconText: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
  "Operasional": {
    grad: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-50 dark:bg-amber-900/30",
    iconText: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  "Compensation & Benefits": {
    grad: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconText: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  "Kepatuhan": {
    grad: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-50 dark:bg-violet-900/30",
    iconText: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
};
const DEFAULT_TONE: Tone = {
  grad: "from-[#5B5BD6] to-[#9B5BD6]",
  iconBg: "bg-violet-50 dark:bg-violet-900/30",
  iconText: "text-violet-600 dark:text-violet-400",
  badge: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};
const tone = (k: string) => CATEGORY_TONE[k] ?? DEFAULT_TONE;

// ─── Mapper baris DB → PolicyDoc ─────────────────────────────────────────────
function rowToPolicy(row: Record<string, unknown>): PolicyDoc {
  return {
    id: String(row.id),
    title: String(row.title),
    kategori: String(row.kategori),
    ringkas: String(row.ringkas),
    body: Array.isArray(row.body) ? (row.body as string[]) : [],
    updated: String(row.updated_at),
    // Kolom markdown opsional — kalau ada di DB, dipakai langsung
    ...(row.markdown ? { markdown: String(row.markdown) } : {}),
    // Kolom pdf_path opsional — path file di bucket privat Supabase Storage
    ...(row.pdf_path ? { pdfPath: String(row.pdf_path) } : {}),
  };
}

// ─── Halaman detail ───────────────────────────────────────────────────────────
function PolicyDetail({ doc, onBack }: { doc: PolicyDoc; onBack: () => void }) {
  const t = tone(doc.kategori);
  const { user } = useAuth();
  // Watermark: nama + NIK user yang login → bocoran dokumen bisa dilacak.
  const watermark = user ? `${user.nama} · ${user.nik}` : APP_NAME;
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali ke daftar kebijakan
      </button>

      <div className="mx-auto max-w-3xl">
        <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-8 text-white mb-5", t.grad)}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-4 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
          <DotGrid />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium ring-1 ring-white/25 backdrop-blur-sm">
              <FileText className="h-3.5 w-3.5" /> {doc.kategori}
            </span>
            <h1 className="mt-3 text-2xl font-bold leading-snug">{doc.title}</h1>
            <p className="mt-1 text-sm text-white/70">Diperbarui {formatDate(doc.updated)}</p>
          </div>
        </div>

        {doc.pdfPath ? (
          <PdfViewer path={doc.pdfPath} title={doc.title} watermark={watermark} />
        ) : (
          <div
            className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800 select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {doc.markdown ? (
              <ReactMarkdown components={mdComponents}>{doc.markdown}</ReactMarkdown>
            ) : (
              <>
                <div className="space-y-4 leading-relaxed text-slate-700 dark:text-slate-300">
                  {doc.body.map((p, i) => <p key={i}>{p}</p>)}
                </div>
                <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  Dokumen contoh (placeholder). Ganti dengan dokumen kebijakan resmi HC.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Halaman daftar ───────────────────────────────────────────────────────────
export default function KebijakanPage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<PolicyDoc | null>(null);
  const [query, setQuery] = useState("");

  // Data — mock langsung, Supabase via fetch
  const [policies, setPolicies] = useState<PolicyDoc[]>(USE_MOCK ? POLICIES : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Deep-link: /kebijakan?id=<policyId> langsung buka detail kebijakan tsb
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || policies.length === 0 || selected) return;
    const found = policies.find((p) => p.id === id);
    if (found) setSelected(found);
  }, [policies, searchParams, selected]);

  useEffect(() => {
    if (USE_MOCK) return;

    async function load() {
      try {
        const { data, error } = await getSupabase()
          .from("policies")
          .select("id, title, kategori, ringkas, body, markdown, pdf_path, updated_at")
          .eq("is_published", true)
          .order("display_order", { ascending: true });

        if (error) throw error;
        setPolicies((data ?? []).map(rowToPolicy));
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Gagal memuat daftar kebijakan.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return policies;
    return policies.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.ringkas.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q),
    );
  }, [query, policies]);

  if (selected) return <PolicyDetail doc={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, #C95BC5 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-[60px] left-1/4 h-[180px] w-[180px] rounded-full"
          style={{ background: "radial-gradient(circle, #5B5BD6 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #8A5BD6, #C95BC5)", WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)", maskImage: "radial-gradient(circle, black 1px, transparent 1px)", WebkitMaskSize: "22px 22px", maskSize: "22px 22px", opacity: 0.2, animation: "hero-dots 8s linear infinite" }} />

        <div className="relative flex flex-col gap-5 px-8 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg, #5B5BD6, #C95BC5)" }}>
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #C95BC5)" }}>HC Policy</h1>
              <p className="mt-0.5 text-sm text-ink-secondary">
                {loading ? "Memuat…" : `${policies.length} dokumen kebijakan & panduan RWP`}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 rounded-2xl border border-line bg-surface-raised px-4 py-2.5 sm:max-w-xs">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kebijakan…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* State: loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat kebijakan…
        </div>
      )}

      {/* State: error */}
      {!loading && fetchError && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-900/30">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Gagal memuat kebijakan</p>
          <p className="text-xs text-slate-400">{fetchError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* State: kosong setelah filter */}
      {!loading && !fetchError && filtered.length === 0 && (
        <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
          {query
            ? <>Tidak ada kebijakan yang cocok dengan &ldquo;{query}&rdquo;</>
            : "Belum ada kebijakan yang dipublish."}
        </div>
      )}

      {/* Grid kartu */}
      {!loading && !fetchError && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => {
            const t = tone(p.kategori);
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={cn(
                  "group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                  "dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600",
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  t.iconBg, t.iconText,
                )}>
                  <BookOpen className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", t.badge)}>
                    {p.kategori}
                  </span>
                  <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">{p.title}</h3>
                  <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{p.ringkas}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      diperbarui {formatDate(p.updated)}
                    </span>
                    <span className={cn(
                      "flex items-center gap-0.5 text-xs font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                      t.iconText,
                    )}>
                      Baca <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
