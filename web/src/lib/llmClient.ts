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
//    `import "server-only"` menjadikannya galat BUILD, bukan sekadar
//    peringatan komentar. Hanya dipakai di Route Handler (server).
//
// Galat provider: body respons OpenAI (bisa memuat detail akun/kuota)
// hanya masuk log server; pemanggil menerima Error generik
// "Layanan AI gagal (HTTP <status>)." yang aman diteruskan.
// ============================================================
import "server-only";

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
    console.error("[llm] embed gagal", res.status, await res.text());
    throw new Error(`Layanan AI gagal (HTTP ${res.status}).`);
  }
  const json = await res.json();
  return json.data[0].embedding as number[];
}

/**
 * Ubah banyak teks → banyak vektor dalam SATU panggilan API.
 * Dipakai ingest korpus dari halaman admin. OpenAI mengembalikan data
 * berurutan, tapi diurutkan ulang berdasarkan `index` supaya tidak
 * bergantung pada asumsi itu. Pemanggil yang menentukan ukuran batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = assertKey();
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) {
    console.error("[llm] embedBatch gagal", res.status, await res.text());
    throw new Error(`Layanan AI gagal (HTTP ${res.status}).`);
  }
  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  if (!Array.isArray(json.data) || json.data.length !== texts.length) {
    throw new Error(`Embedding batch: jumlah hasil (${json.data?.length ?? 0}) ≠ jumlah teks (${texts.length}).`);
  }
  return [...json.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Nama model embedding aktif — dicatat ke rag_chunks.embed_model & corpus_documents. */
export function embedModelName(): string {
  return EMBED_MODEL;
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
    console.error("[llm] chat gagal", res.status, await res.text());
    throw new Error(`Layanan AI gagal (HTTP ${res.status}).`);
  }
  const json = await res.json();
  return (json.choices[0].message.content ?? "") as string;
}
