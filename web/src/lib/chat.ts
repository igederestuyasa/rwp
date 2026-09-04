// ============================================================
// Data layer riwayat chat asisten + feedback rating.
// ------------------------------------------------------------
// Flag-gated (pola sama dengan store.tsx):
//  - USE_MOCK=true  → simpan di localStorage (cukup untuk demo, per-device).
//  - USE_MOCK=false → Supabase (tabel chat_sessions / chat_messages /
//    chat_feedback, RLS membatasi ke milik user — lihat migration_chat.sql).
//
// Isi chat HANYA milik user (least-privilege §9.2). Admin tak pernah membaca
// baris chat; rating hanya dilihat agregat lewat RPC get_chat_feedback_summary.
// ============================================================
import { getSupabase, USE_MOCK } from "./supabaseClient";

export interface ActionItem {
  type: "policy" | "tiket";
  label: string;
  url: string;
  description?: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  actions?: ActionItem[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Util judul sesi dari pertanyaan pertama ────────────────────────────────
export function makeSessionTitle(firstQuestion: string): string {
  const t = firstQuestion.trim().replace(/\s+/g, " ");
  return t.length > 60 ? `${t.slice(0, 60)}…` : t || "Percakapan baru";
}

// ════════════════════════════════════════════════════════════
// Mock (localStorage)
// ════════════════════════════════════════════════════════════
const LS_SESSIONS = "rwp_chat_sessions";
const LS_MSGS_PREFIX = "rwp_chat_msgs_";
const LS_FEEDBACK = "rwp_chat_feedback";

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage penuh / tidak tersedia — abaikan (mode demo)
  }
}

// ════════════════════════════════════════════════════════════
// Mappers Supabase (snake_case row → camelCase)
// ════════════════════════════════════════════════════════════
interface SessionRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
interface MsgRow {
  role: "user" | "assistant";
  content: string;
  sources: string[] | null;
  actions: ActionItem[] | null;
}

function sessionFromRow(r: SessionRow): ChatSession {
  return { id: r.id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at };
}
function msgFromRow(r: MsgRow): ChatMsg {
  return {
    role: r.role,
    text: r.content,
    sources: r.sources && r.sources.length > 0 ? r.sources : undefined,
    actions: r.actions ?? undefined,
  };
}

// ════════════════════════════════════════════════════════════
// API publik
// ════════════════════════════════════════════════════════════

/** Daftar sesi user, terbaru di atas. */
export async function listSessions(): Promise<ChatSession[]> {
  if (USE_MOCK) {
    return lsRead<ChatSession[]>(LS_SESSIONS, []);
  }
  const { data, error } = await getSupabase()
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(sessionFromRow);
}

/** Pesan dalam satu sesi, urut waktu. */
export async function loadMessages(sessionId: string): Promise<ChatMsg[]> {
  if (USE_MOCK) {
    return lsRead<ChatMsg[]>(LS_MSGS_PREFIX + sessionId, []);
  }
  const { data, error } = await getSupabase()
    .from("chat_messages")
    .select("role, content, sources, actions")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(msgFromRow);
}

/** Buat sesi baru (judul dari pertanyaan pertama). */
export async function createSession(userId: string, title: string): Promise<ChatSession> {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    const session: ChatSession = { id: `cs-${Date.now()}`, title, createdAt: now, updatedAt: now };
    const sessions = lsRead<ChatSession[]>(LS_SESSIONS, []);
    lsWrite(LS_SESSIONS, [session, ...sessions]);
    return session;
  }
  const { data, error } = await getSupabase()
    .from("chat_sessions")
    .insert({ user_id: userId, title })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return sessionFromRow(data);
}

/** Tambah pesan ke sesi + dorong updated_at sesi ke atas. */
export async function appendMessages(sessionId: string, msgs: ChatMsg[]): Promise<void> {
  if (msgs.length === 0) return;
  if (USE_MOCK) {
    const key = LS_MSGS_PREFIX + sessionId;
    const existing = lsRead<ChatMsg[]>(key, []);
    lsWrite(key, [...existing, ...msgs]);
    // Dorong sesi ke atas (updatedAt terbaru)
    const sessions = lsRead<ChatSession[]>(LS_SESSIONS, []);
    const now = new Date().toISOString();
    lsWrite(
      LS_SESSIONS,
      sessions.map((s) => (s.id === sessionId ? { ...s, updatedAt: now } : s)),
    );
    return;
  }
  const supabase = getSupabase();
  const rows = msgs.map((m) => ({
    session_id: sessionId,
    role: m.role,
    content: m.text,
    sources: m.sources ?? [],
    actions: m.actions ?? null,
  }));
  const { error } = await supabase.from("chat_messages").insert(rows);
  if (error) throw new Error(error.message);
  // Trigger set_updated_at akan menimpa ke now() — cukup kirim satu kolom.
  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/** Hapus sesi beserta pesannya. */
export async function deleteSession(sessionId: string): Promise<void> {
  if (USE_MOCK) {
    const sessions = lsRead<ChatSession[]>(LS_SESSIONS, []);
    lsWrite(LS_SESSIONS, sessions.filter((s) => s.id !== sessionId));
    try {
      localStorage.removeItem(LS_MSGS_PREFIX + sessionId);
    } catch {
      // abaikan
    }
    return;
  }
  const { error } = await getSupabase().from("chat_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
}

/** Simpan rating bintang (1–5) + komentar opsional. */
export async function saveFeedback(
  userId: string,
  sessionId: string | null,
  stars: number,
  comment?: string,
): Promise<void> {
  const clean = Math.max(1, Math.min(5, Math.round(stars)));
  if (USE_MOCK) {
    const arr = lsRead<unknown[]>(LS_FEEDBACK, []);
    lsWrite(LS_FEEDBACK, [
      ...arr,
      { sessionId, stars: clean, comment: comment?.trim() || null, createdAt: new Date().toISOString() },
    ]);
    return;
  }
  const { error } = await getSupabase().from("chat_feedback").insert({
    user_id: userId,
    session_id: sessionId,
    stars: clean,
    comment: comment?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════
// Cooldown rating (state UX per-device → selalu localStorage)
//  - sudah rating  → diam 7 hari
//  - di-dismiss    → diam 3 hari
// ════════════════════════════════════════════════════════════
const LS_RATING_STATE = "rwp_chat_rating_state";
const DAY = 24 * 60 * 60 * 1000;
const COOLDOWN_RATED = 7 * DAY;
const COOLDOWN_DISMISSED = 3 * DAY;

interface RatingState {
  lastRatedAt?: number;
  lastDismissedAt?: number;
}

/** Boleh tampilkan prompt rating? (lewati semua cooldown) */
export function canShowRating(): boolean {
  const st = lsRead<RatingState>(LS_RATING_STATE, {});
  const now = Date.now();
  if (st.lastRatedAt && now - st.lastRatedAt < COOLDOWN_RATED) return false;
  if (st.lastDismissedAt && now - st.lastDismissedAt < COOLDOWN_DISMISSED) return false;
  return true;
}

export function markRatingRated(): void {
  const st = lsRead<RatingState>(LS_RATING_STATE, {});
  lsWrite(LS_RATING_STATE, { ...st, lastRatedAt: Date.now() });
}

export function markRatingDismissed(): void {
  const st = lsRead<RatingState>(LS_RATING_STATE, {});
  lsWrite(LS_RATING_STATE, { ...st, lastDismissedAt: Date.now() });
}
