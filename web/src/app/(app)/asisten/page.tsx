"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Bot, Send, Sparkles, FileText, HeartHandshake, ShieldAlert, Trash2,
  Plus, MessageSquare, Star, X, History, Loader2,
} from "lucide-react";
import { MOCK_QA_ANSWER, MOCK_QA_SOURCES } from "@/lib/mock";
import { ASSISTANT_NAME } from "@/lib/constants";
import { USE_MOCK, getSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
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

const SUGGESTIONS = [
  "Bagaimana cara mengajukan cuti?",
  "Kapan slip gaji terbit?",
  "Bagaimana mendaftar pelatihan?",
  "Apa itu kebijakan RWP?",
];

export default function AsistenPage() {
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
    <div className="lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-5 lg:items-start">
      {/* ── Sidebar riwayat ── */}
      <aside className="mb-4 lg:mb-0 lg:sticky lg:top-4">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" /> Chat baru
        </button>

        {/* Toggle riwayat di mobile */}
        <button
          onClick={() => setMobileHistoryOpen((o) => !o)}
          className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <span className="flex items-center gap-2"><History className="h-4 w-4" /> Riwayat percakapan</span>
          {sessions.length > 0 && <span className="text-xs text-slate-400">{sessions.length}</span>}
        </button>

        <div className={cn("mt-2 space-y-1", mobileHistoryOpen ? "block" : "hidden", "lg:block")}>
          <p className="hidden px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block dark:text-slate-500">
            Riwayat
          </p>
          {loadingSessions ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="px-1 py-3 text-xs text-slate-400 dark:text-slate-500">
              Belum ada percakapan tersimpan.
            </p>
          ) : (
            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-0.5">
              {sessions.map((s) => {
                const active = s.id === currentSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => openSession(s.id)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60",
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                      aria-label="Hapus percakapan"
                      className="shrink-0 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 dark:text-slate-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Kolom chat ── */}
      <div className="min-w-0">
        {/* Hero */}
        <div className="relative mb-5 overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
            style={{ background: "radial-gradient(circle, #C95BC5 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
          <div className="pointer-events-none absolute -bottom-[60px] left-1/4 h-[180px] w-[180px] rounded-full"
            style={{ background: "radial-gradient(circle, #5B5BD6 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #8A5BD6, #C95BC5)", WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)", maskImage: "radial-gradient(circle, black 1px, transparent 1px)", WebkitMaskSize: "22px 22px", maskSize: "22px 22px", opacity: 0.2, animation: "hero-dots 8s linear infinite" }} />

          <div className="relative flex items-center gap-4 px-8 py-7">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg, #5B5BD6, #C95BC5)" }}>
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #C95BC5)" }}>{ASSISTANT_NAME}</h1>
              </div>
              <p className="mt-0.5 text-sm text-ink-secondary">
                Asisten kebijakan RWP. Jawaban dari dokumen resmi perusahaan.
              </p>
            </div>
          </div>
        </div>

        {/* Area chat */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {/* Toolbar atas */}
          {messages.length > 0 && (
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-700">
              <span className="text-xs text-slate-400 dark:text-slate-500">{qaCount} pertanyaan</span>
              <button
                onClick={newChat}
                disabled={thinking}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              >
                <Plus className="h-3.5 w-3.5" /> Chat baru
              </button>
            </div>
          )}

          {/* Percakapan */}
          <div className="max-h-[52vh] min-h-[320px] space-y-5 overflow-y-auto p-5 sm:p-6">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 && !thinking ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mulai bertanya tentang kebijakan &amp; layanan HC
                </p>
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Misalnya:</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-slate-600 dark:hover:text-blue-400"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                  {m.role === "assistant" && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm"
                        : "max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600"
                    }
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <MarkdownMessage text={m.text} />
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-200 pt-2 text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        Sumber: {m.sources.join(", ")}
                      </div>
                    )}
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-600">
                        {m.actions.filter((a) => a.type === "policy").map((a) => (
                          <button
                            key={a.url}
                            onClick={() => router.push(a.url)}
                            className="flex w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700/60 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            {a.label}
                          </button>
                        ))}
                        {m.actions.filter((a) => a.type === "tiket").map((a) => (
                          <div key={a.url}>
                            {a.description && (
                              <p className="mb-1.5 text-xs text-slate-400 dark:text-slate-500">{a.description}</p>
                            )}
                            <button
                              onClick={() => router.push(a.url)}
                              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                            >
                              {a.type === "policy"
                                ? <FileText className="h-3.5 w-3.5 shrink-0" />
                                : <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
                              {a.label}
                            </button>
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
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-3 ring-1 ring-slate-100 dark:bg-slate-700/60 dark:ring-slate-600">
                  <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-slate-700">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan Anda…"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-700 dark:focus:ring-blue-900/30"
            />
            <Button type="submit" disabled={!input.trim() || thinking} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Prompt rating — muncul di jeda alami */}
        {ratingFor && <RatingPrompt onSubmit={submitRating} onDismiss={dismissRating} />}

        {/* Tombol aksi — hanya untuk karyawan */}
        {user?.role === "karyawan" && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => router.push("/psikologi")}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md hover:shadow-teal-100/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700 dark:hover:shadow-teal-950/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Layanan Psikologi</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Konseling &amp; careline 24/7.</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/lapor")}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md hover:shadow-rose-100/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-rose-700 dark:hover:shadow-rose-950/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pelaporan RWP</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Rahasia &amp; terlindungi.</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
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
    <div className="animate-in relative mt-5 overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm dark:border-blue-800/50 dark:from-blue-950/30 dark:to-indigo-950/20">
      <button
        onClick={onDismiss}
        aria-label="Tutup"
        className="absolute right-3 top-3 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Seberapa membantu {ASSISTANT_NAME} sejauh ini?
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Masukanmu membantu kami memperbaiki asisten ini.
      </p>

      <div className="mt-3 flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || stars) >= n;
          return (
            <button
              key={n}
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} bintang`}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-7 w-7 transition-colors",
                  filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300 dark:text-slate-600",
                )}
              />
            </button>
          );
        })}
      </div>

      {stars > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            placeholder="Komentar (opsional)…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <Button onClick={() => onSubmit(stars, comment)} className="shrink-0">
            Kirim
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
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h3 className="text-base font-bold">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-bold">{children}</h3>,
          h3: ({ children }) => <h3 className="text-sm font-bold">{children}</h3>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-200 px-1 py-0.5 text-[0.85em] dark:bg-slate-600">{children}</code>
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
      className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-300 dark:bg-slate-500"
      style={{ animationDelay: delay }}
    />
  );
}
