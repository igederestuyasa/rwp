"use client";

// Sahabat RWP — tanya-jawab kebijakan berbasis RAG.
// Tampilan mengikuti sistem UI "HC Panel" (docs/DESIGN.md): token warna,
// ikon Phosphor, permukaan datar tanpa bayangan. Ini pekerjaan tampilan —
// alur data (lib/chat), pembuatan sesi lazy, aturan kemunculan rating, dan
// payload POST /api/asisten TIDAK berubah.

import { Suspense, useState, useRef, useEffect, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Robot, PaperPlaneRight, Sparkle, FileText, ShieldWarning, Trash,
  Plus, ChatCircle, Star, X, ClockCounterClockwise, CircleNotch, HandHeart, NotePencil } from "@phosphor-icons/react";
import { MOCK_QA_ANSWER, MOCK_QA_SOURCES } from "@/lib/mock";
import { ASSISTANT_NAME } from "@/lib/constants";
import { USE_MOCK, getSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";
import {
  type ActionItem, type ChatMsg, type ChatSession,
  listSessions, loadMessages, createSession, appendMessages, deleteSession,
  saveFeedback, makeSessionTitle, canShowRating, markRatingRated, markRatingDismissed,
} from "@/lib/chat";

const MOCK_ACTIONS: ActionItem[] = [
  { type: "policy", label: "Lihat kebijakan terkait", url: "/kebijakan?id=rwp" },
  { type: "tiket", label: "Lapor insiden RWP", url: "/lapor", description: "Kalau yang kamu alami perlu ditindaklanjuti resmi, laporkan lewat jalur rahasia ini:" },
];

// Prompt rating muncul di jeda alami setelah min. sekian tanya-jawab.
const MIN_QA_FOR_RATING = 3;
const IDLE_MS = 45_000; // 45 detik idle setelah jawaban → tawarkan rating

// Contoh pertanyaan pembuka. Harus soal RWP / aplikasi ini / Layanan
// Psikologi — di luar itu asisten memang menolak (lihat api/asisten).
const SUGGESTIONS = [
  "Apa itu kebijakan RWP?",
  "Apa saja kategori pelanggaran RWP?",
  "Apakah kritik keras dari atasan termasuk perundungan?",
  "Bagaimana cara melapor secara anonim?",
];

// Jalur lain untuk karyawan — set tetap, jadi memakai ikon semantik yang
// sama persis dengan pintu di beranda supaya konsisten di seluruh app.
const JALUR_LAIN = [
  {
    nama: "Layanan psikologi",
    ikon: HandHeart,
    href: "/psikologi",
    deskripsi: "Konseling profesional dan careline 24 jam, tanpa perlu membuat laporan lebih dulu.",
  },
  {
    nama: "Lapor insiden",
    ikon: NotePencil,
    href: "/lapor",
    deskripsi: "Laporkan pelanggaran RWP lewat jalur rahasia. Bisa anonim, kerahasiaannya dijaga.",
  },
] as const;

export default function AsistenPage() {
  // Auto-ask dari beranda membaca ?q= lewat useSearchParams → butuh batas Suspense.
  return (
    <Suspense fallback={<p className="text-isi text-redup">Memuat {ASSISTANT_NAME}…</p>}>
      <IsiAsisten />
    </Suspense>
  );
}

function IsiAsisten() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();
  const hasFiredInitial = useRef(false);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  // Rating: sesi mana yang sedang ditanyai (null = tidak tampil).
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const promptedSessions = useRef<Set<string>>(new Set());
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  // ── Muat daftar sesi saat user siap ──
  useEffect(() => {
    if (!ready) return;
    if (!USE_MOCK && !user) return;
    let cancelled = false;
    // Fetch-on-change (sah): setState terjadi setelah await, bukan cascading sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSessions(true);
    listSessions()
      .then((s) => { if (!cancelled) setSessions(s); })
      .catch((e) => console.error("Gagal memuat daftar sesi:", e))
      .finally(() => { if (!cancelled) setLoadingSessions(false); });
    return () => { cancelled = true; };
  }, [ready, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, ratingFor]);

  // ── Auto-ask pertanyaan dari beranda via ?q= ──
  useEffect(() => {
    if (hasFiredInitial.current) return;
    const q = searchParams.get("q");
    if (!q?.trim()) return;
    hasFiredInitial.current = true;
    ask(q.trim());
    router.replace("/asisten", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Idle → tawarkan rating (jeda alami + cooldown, maks 1×/sesi) ──
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    const sid = currentSessionId;
    const qaCount = messages.filter((m) => m.role === "user").length;
    if (!sid || thinking || ratingFor) return;
    if (qaCount < MIN_QA_FOR_RATING) return;
    if (promptedSessions.current.has(sid) || !canShowRating()) return;
    idleTimer.current = setTimeout(() => {
      promptedSessions.current.add(sid);
      setRatingFor(sid);
    }, IDLE_MS);
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [messages, thinking, currentSessionId, ratingFor]);

  // Saat meninggalkan percakapan (chat baru / buka sesi lain) — kalau memenuhi
  // syarat & belum ditanya, tawarkan rating untuk sesi yang ditinggalkan.
  function maybePromptOnLeave() {
    const sid = currentSessionId;
    if (!sid || ratingFor || promptedSessions.current.has(sid)) return;
    const qaCount = messages.filter((m) => m.role === "user").length;
    if (qaCount < MIN_QA_FOR_RATING || !canShowRating()) return;
    promptedSessions.current.add(sid);
    setRatingFor(sid);
  }

  function newChat() {
    maybePromptOnLeave();
    setMessages([]);
    setCurrentSessionId(null);
    setInput("");
    setMobileHistoryOpen(false);
  }

  async function openSession(id: string) {
    if (id === currentSessionId) { setMobileHistoryOpen(false); return; }
    maybePromptOnLeave();
    setCurrentSessionId(id);
    setMobileHistoryOpen(false);
    setLoadingMsgs(true);
    try {
      const msgs = await loadMessages(id);
      setMessages(msgs);
    } catch (e) {
      console.error("Gagal memuat percakapan:", e);
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function removeSession(id: string) {
    if (!window.confirm("Hapus percakapan ini? Tindakan tak bisa dibatalkan.")) return;
    try {
      await deleteSession(id);
    } catch (e) {
      console.error("Gagal menghapus percakapan:", e);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      setMessages([]);
      setCurrentSessionId(null);
    }
  }

  function bumpSession(sid: string) {
    setSessions((prev) => {
      const found = prev.find((s) => s.id === sid);
      if (!found) return prev;
      const now = new Date().toISOString();
      return [{ ...found, updatedAt: now }, ...prev.filter((s) => s.id !== sid)];
    });
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || thinking) return;
    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    const userMsg: ChatMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    // 1. Dapatkan jawaban
    let assistantMsg: ChatMsg;
    let ok = true;
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 700));
      assistantMsg = {
        role: "assistant",
        text: MOCK_QA_ANSWER,
        sources: MOCK_QA_SOURCES,
        actions: user?.role === "karyawan" ? MOCK_ACTIONS : undefined,
      };
    } else {
      try {
        const { data } = await getSupabase().auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
        const res = await fetch("/api/asisten", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question: text, history, userName: user?.nama, userRole: user?.role }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gagal mendapat jawaban.");
        assistantMsg = { role: "assistant", text: json.answer, sources: json.sources, actions: json.actions };
      } catch (e) {
        ok = false;
        assistantMsg = {
          role: "assistant",
          text: e instanceof Error ? e.message : "Maaf, terjadi gangguan pada asisten.",
        };
      }
    }
    setMessages((m) => [...m, assistantMsg]);
    setThinking(false);

    // 2. Persist hanya kalau berhasil (hindari sesi kosong saat gagal)
    if (!ok) return;
    try {
      let sid = currentSessionId;
      if (!sid) {
        const s = await createSession(user?.id ?? "anon", makeSessionTitle(text));
        sid = s.id;
        setCurrentSessionId(s.id);
        setSessions((prev) => [s, ...prev]);
      }
      await appendMessages(sid, [userMsg, assistantMsg]);
      bumpSession(sid);
    } catch (e) {
      console.error("Gagal menyimpan percakapan:", e);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  async function submitRating(stars: number, comment: string) {
    const sid = ratingFor;
    setRatingFor(null);
    markRatingRated();
    try {
      await saveFeedback(user?.id ?? "anon", sid, stars, comment);
    } catch (e) {
      console.error("Gagal menyimpan rating:", e);
    }
  }

  function dismissRating() {
    setRatingFor(null);
    markRatingDismissed();
  }

  const qaCount = messages.filter((m) => m.role === "user").length;

  return (
    <div>
      {/* ── Pembuka layar: h1 + subjudul (§Spasi — maksimal 4 elemen teks) ── */}
      <header>
        <h1
          className="pembuka-masuk text-balance text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-tinta"
          style={{ animationDelay: "0ms" }}
        >
          {ASSISTANT_NAME}
        </h1>
        <p
          className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
          style={{ animationDelay: "60ms" }}
        >
          Tanya apa saja soal kebijakan RWP. Jawabannya disusun dari dokumen resmi
          perusahaan, bukan karangan.
        </p>
      </header>

      <div
        className={cn(
          "pembuka-masuk mt-8",
          "lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:items-start lg:gap-x-12",
        )}
        style={{ animationDelay: "110ms" }}
      >
        {/* ── Sidebar riwayat ── */}
        <aside className="mb-8 lg:mb-0 lg:sticky lg:top-6">
          <button
            type="button"
            onClick={newChat}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-full",
              "border border-garis-kuat bg-kartu px-5 text-bantu font-semibold text-tinta",
              "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
              "active:scale-[.99]",
            )}
          >
            <Plus size={18} aria-hidden="true" /> Chat baru
          </button>

          {/* Toggle riwayat di HP */}
          <button
            type="button"
            onClick={() => setMobileHistoryOpen((o) => !o)}
            aria-expanded={mobileHistoryOpen}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-between rounded-full",
              "border border-garis bg-kartu px-4 text-bantu font-medium text-redup",
              "transition-colors duration-150 ease-[var(--ease-standar)] hover:text-tinta",
              "lg:hidden",
            )}
          >
            <span className="flex items-center gap-2">
              <ClockCounterClockwise size={18} aria-hidden="true" /> Riwayat percakapan
            </span>
            {sessions.length > 0 && (
              <span className="text-mikro font-semibold text-redup tabular-nums">
                {sessions.length}
              </span>
            )}
          </button>

          <div className={cn("mt-3", mobileHistoryOpen ? "block" : "hidden", "lg:block")}>
            <p className="hidden px-3 pb-2 text-mikro font-semibold text-redup lg:block">
              Riwayat
            </p>

            {loadingSessions ? (
              <div className="flex items-center justify-center py-6 text-redup">
                <CircleNotch size={18} className="animate-spin" aria-hidden="true" />
                <span className="sr-only">Memuat riwayat percakapan…</span>
              </div>
            ) : sessions.length === 0 ? (
              <p className="px-3 py-3 text-bantu text-redup">
                Belum ada percakapan tersimpan. Ajukan pertanyaan pertamamu di bawah.
              </p>
            ) : (
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                {sessions.map((s) => {
                  const active = s.id === currentSessionId;
                  return (
                    <li key={s.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => openSession(s.id)}
                        aria-current={active || undefined}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-input)]",
                          "py-2 pl-3 pr-11 text-left text-bantu",
                          "transition-colors duration-150 ease-[var(--ease-standar)]",
                          active
                            ? "bg-latar font-semibold text-tinta"
                            : "text-redup hover:bg-latar hover:text-tinta",
                        )}
                      >
                        <ChatCircle size={16} aria-hidden="true" className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSession(s.id)}
                        aria-label={`Hapus percakapan ${s.title}`}
                        className={cn(
                          "absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center",
                          "rounded-full text-redup opacity-0",
                          "transition-[color,opacity] duration-150 ease-[var(--ease-standar)]",
                          "hover:text-merah group-hover:opacity-100 focus-visible:opacity-100",
                        )}
                      >
                        <Trash size={16} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Kolom percakapan ── */}
        <div className="min-w-0">
          <div className="rounded-[var(--radius-panel)] border border-garis bg-kartu">
            {/* Toolbar atas */}
            {messages.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-b border-garis px-4 py-2">
                <span className="text-mikro font-semibold text-redup tabular-nums">
                  {qaCount} pertanyaan
                </span>
                <button
                  type="button"
                  onClick={newChat}
                  disabled={thinking}
                  className={cn(
                    "flex h-11 items-center gap-1.5 rounded-full px-3 text-bantu font-medium text-redup",
                    "transition-colors duration-150 ease-[var(--ease-standar)]",
                    "hover:bg-latar hover:text-tinta disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  <Plus size={16} aria-hidden="true" /> Chat baru
                </button>
              </div>
            )}

            {/* Percakapan */}
            <div className="max-h-[52vh] min-h-[320px] space-y-5 overflow-y-auto p-5 sm:p-6">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-16 text-redup">
                  <CircleNotch size={20} className="animate-spin" aria-hidden="true" />
                  <span className="sr-only">Memuat percakapan…</span>
                </div>
              ) : messages.length === 0 && !thinking ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-garis bg-latar text-tinta">
                    <Sparkle size={22} aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-isi font-semibold text-tinta">
                    Mulai bertanya soal kebijakan RWP
                  </p>
                  <p className="mt-1 text-bantu text-redup">Misalnya:</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => ask(s)}
                        className={cn(
                          "inline-flex min-h-11 items-center rounded-full border border-garis-kuat bg-kartu px-4",
                          "text-bantu text-tinta",
                          "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                    {m.role === "assistant" && <AvatarAsisten />}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-[var(--radius-kartu)] px-4 py-3 text-bantu leading-[1.6]",
                        m.role === "user"
                          ? "bg-tinta text-kartu"
                          : "border border-garis bg-kartu text-tinta",
                      )}
                    >
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      ) : (
                        <MarkdownMessage text={m.text} />
                      )}

                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 flex items-start gap-1.5 border-t border-garis pt-2 text-mikro text-redup">
                          <FileText size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                          Sumber: {m.sources.join(", ")}
                        </div>
                      )}

                      {m.actions && m.actions.length > 0 && (
                        <div className="mt-3 space-y-3 border-t border-garis pt-3">
                          {/* Pil kebijakan */}
                          {m.actions.some((a) => a.type === "policy") && (
                            <div className="flex flex-wrap gap-2">
                              {m.actions
                                .filter((a) => a.type === "policy")
                                .map((a) => (
                                  <PilAksi
                                    key={a.url}
                                    label={a.label}
                                    ikon={<FileText size={16} aria-hidden="true" />}
                                    onClick={() => router.push(a.url)}
                                  />
                                ))}
                            </div>
                          )}

                          {/* Pil pelaporan — boleh punya keterangan di atasnya */}
                          {m.actions
                            .filter((a) => a.type === "tiket")
                            .map((a) => (
                              <div key={a.url}>
                                {a.description && (
                                  <p className="mb-2 text-mikro text-redup">{a.description}</p>
                                )}
                                <PilAksi
                                  label={a.label}
                                  ikon={<ShieldWarning size={16} aria-hidden="true" />}
                                  onClick={() => router.push(a.url)}
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {thinking && (
                <div className="flex gap-3">
                  <AvatarAsisten />
                  <div className="flex items-center gap-1 rounded-[var(--radius-kartu)] border border-garis bg-kartu px-4 py-3">
                    <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                    <span className="sr-only">{ASSISTANT_NAME} sedang menyusun jawaban…</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Kolom tanya */}
            <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-garis p-4">
              <label htmlFor="tanya-asisten" className="sr-only">
                Tulis pertanyaan
              </label>
              <Input
                id="tanya-asisten"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tulis pertanyaanmu di sini…"
                autoComplete="off"
                className="min-w-0 flex-1"
              />
              <Button
                type="submit"
                aria-label="Kirim pertanyaan"
                disabled={!input.trim() || thinking}
                className="h-11 w-11 shrink-0 px-0"
              >
                <PaperPlaneRight size={18} aria-hidden="true" />
              </Button>
            </form>
          </div>

          {/* Prompt rating — muncul di jeda alami */}
          {ratingFor && <RatingPrompt onSubmit={submitRating} onDismiss={dismissRating} />}

          {/* Jalur lain — hanya untuk karyawan */}
          {user?.role === "karyawan" && (
            <section className="mt-8">
              <h2 className="mb-3 text-bantu font-[650] text-tinta">Jalur lain</h2>
              <ItemCardGrid>
                {JALUR_LAIN.map((j, i) => (
                  <ItemCard
                    key={j.href}
                    nama={j.nama}
                    ikon={j.ikon}
                    deskripsi={j.deskripsi}
                    indeks={i}
                    onBuka={() => router.push(j.href)}
                  />
                ))}
              </ItemCardGrid>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Potongan kecil ────────────────────────────────────────────────────────────

function AvatarAsisten() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-garis bg-latar text-tinta"
    >
      <Robot size={16} />
    </span>
  );
}

/** Chip aksi berbentuk pil bertoken (§Komponen — tombol, label, chip = pil). */
function PilAksi({
  label,
  ikon,
  onClick,
}: {
  label: string;
  ikon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border border-garis-kuat bg-kartu px-4",
        "text-bantu font-medium text-tinta",
        "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
        "active:scale-[.99]",
      )}
    >
      {ikon}
      {label}
    </button>
  );
}

// ─── Prompt rating bintang (Likert) ────────────────────────────────────────────
function RatingPrompt({
  onSubmit, onDismiss,
}: { onSubmit: (stars: number, comment: string) => void; onDismiss: () => void }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <div className="animate-in relative mt-5 rounded-[var(--radius-kartu)] border border-garis bg-kartu p-5">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup penilaian"
        className={cn(
          "absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-redup",
          "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar hover:text-tinta",
        )}
      >
        <X size={18} aria-hidden="true" />
      </button>

      <p className="pr-12 text-bantu font-semibold text-tinta">
        Seberapa membantu {ASSISTANT_NAME} sejauh ini?
      </p>
      <p className="mt-1 text-bantu text-redup">
        Masukanmu membantu kami memperbaiki asisten ini.
      </p>

      <div className="mt-2 flex items-center" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || stars) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} bintang`}
              aria-pressed={stars === n}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <Star
                size={26}
                weight={filled ? "fill" : "regular"}
                aria-hidden="true"
                className={cn(
                  "transition-colors duration-150 ease-[var(--ease-standar)]",
                  filled ? "text-tinta" : "text-garis-kuat",
                )}
              />
            </button>
          );
        })}
      </div>

      {stars > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="komentar-rating" className="sr-only">
            Komentar penilaian
          </label>
          <Input
            id="komentar-rating"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            placeholder="Komentar (opsional)…"
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSubmit(stars, comment)}
            className="h-11 shrink-0"
          >
            Kirim penilaian
          </Button>
        </div>
      )}
    </div>
  );
}

function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="leading-[1.6]">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
          h1: ({ children }) => <h3 className="text-isi font-bold text-tinta">{children}</h3>,
          h2: ({ children }) => <h3 className="text-isi font-bold text-tinta">{children}</h3>,
          h3: ({ children }) => <h3 className="text-bantu font-bold text-tinta">{children}</h3>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-tinta underline underline-offset-4 hover:text-merah"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-latar px-1 py-0.5 text-[0.85em]">{children}</code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 animate-bounce rounded-full bg-redup"
      style={{ animationDelay: delay }}
    />
  );
}
