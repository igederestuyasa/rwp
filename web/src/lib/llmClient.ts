// ============================================================
// LLM client — ABSTRAKSI provider (server-side only).
// ------------------------------------------------------------
// Tujuan: bongkar-pasang model/provider tanpa ubah kode pemanggil.
//  - Ganti CHAT model      → set OPENAI_CHAT_MODEL di env.
//  - Ganti EMBED model     → set OPENAI_EMBED_MODEL (HATI-HATI: ganti
//    embedding = WAJIB re-ingest semua dokumen, lihat CLAUDE.md).
//  - Ganti provider (Azure/Anthropic) → cukup ubah fungsi di file INI;
//    pemanggil (route /api/asisten, script ingest) tidak berubah.
//
// ⚠️ JANGAN import file ini dari komponen client — berisi OPENAI_API_KEY.
//    Hanya dipakai di Route Handler (server) & script Node.
// ============================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function assertKey(): string {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY belum diisi di web/.env.local. Asisten RWP butuh ini untuk embedding & chat.",
    );
  }
  return OPENAI_API_KEY;
}

/** Ubah satu teks → vektor embedding. */
export async function embed(text: string): Promise<number[]> {
  const key = assertKey();
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) {
    throw new Error(`Embedding gagal (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.data[0].embedding as number[];
}

/** Panggil chat completion. Mengembalikan teks jawaban. */
export async function chat(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const key = assertKey();
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      max_tokens: opts?.maxTokens ?? 800,
      temperature: opts?.temperature ?? 0.2,
    }),
  });
  if (!res.ok) {
    throw new Error(`Chat gagal (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return (json.choices[0].message.content ?? "") as string;
}
