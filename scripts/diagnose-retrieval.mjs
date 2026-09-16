// ============================================================
// Diagnostik retrieval HCsisten — ukur similarity score asli.
// ------------------------------------------------------------
// Pakai: node scripts/diagnose-retrieval.mjs
//
// Tujuan: melihat DISTRIBUSI skor similarity nyata dari
// match_rag_chunks untuk query relevan vs query noise, supaya
// MIN_SIMILARITY bisa dikalibrasi dari DATA — bukan dari tabel umum.
//
// Output: tiap query → top-5 chunk + similarity-nya, lalu ringkasan
// rekomendasi threshold berdasar gap antara "relevan" dan "noise".
// ============================================================
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---- Baca .env.local (manual, tanpa dependency) ----
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const OPENAI_BASE_URL = env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const EMBED_MODEL = env.OPENAI_EMBED_MODEL || "text-embedding-3-small";

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("❌ Env kurang (URL / SERVICE_ROLE / OPENAI_API_KEY) di .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---- Query uji: campuran RELEVAN (harus dapat skor tinggi) & NOISE (harus rendah) ----
const RELEVANT_QUERIES = [
  "apa itu kebijakan RWP?",
  "gimana cara lapor pelecehan?",
  "bedanya perundungan sama kritik biasa apa?",
  "apa saja kategori pelanggaran RWP?",
  "laporan saya bisa anonim nggak?",
  "identitas pelapor bisa dibuka nggak?",
  "nomor careline psikologi berapa?",
  "cara lacak laporan yang sudah dibuat",
];

// Noise = pertanyaan yang MEMANG di luar cakupan korpus RWP. Pertanyaan HC
// lain (cuti, gaji, pelatihan) sengaja masuk sini: sejak app dipisah, itu
// bukan wilayah asisten dan seharusnya TIDAK menarik chunk mana pun.
const NOISE_QUERIES = [
  "halooo",
  "berapa hari jatah cuti tahunan?",
  "kapan slip gaji terbit?",
  "cara daftar pelatihan gimana?",
  "resep nasi goreng",
  "siapa presiden indonesia",
];

async function embed(text) {
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Embedding gagal (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

async function topChunks(query, k = 5) {
  const queryEmbedding = await embed(query);
  const { data, error } = await supabase.rpc("match_rag_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: k,
  });
  if (error) throw new Error(`RPC gagal: ${error.message}`);
  return data ?? [];
}

function bar(sim) {
  const n = Math.max(0, Math.min(20, Math.round(sim * 20)));
  return "█".repeat(n) + "░".repeat(20 - n);
}

function snippet(text) {
  return text.replace(/\s+/g, " ").slice(0, 50);
}

// ---- Main ----
console.log(`\n🔬 Diagnostik Retrieval — model: ${EMBED_MODEL}`);
console.log(`   Similarity = 1 - cosine_distance (pgvector)\n`);

const relevantTops = []; // skor #1 tiap query relevan
const noiseTops = [];     // skor #1 tiap query noise

async function runGroup(title, queries, collector) {
  console.log(`\n${"═".repeat(64)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(64));
  for (const q of queries) {
    const rows = await topChunks(q);
    const top = rows[0]?.similarity ?? 0;
    collector.push(top);
    console.log(`\n❓ "${q}"`);
    rows.forEach((r, i) => {
      console.log(
        `   ${i === 0 ? "▶" : " "} ${r.similarity.toFixed(3)} ${bar(r.similarity)} ` +
          `${r.source_doc} — "${snippet(r.chunk_text)}…"`,
      );
    });
  }
}

await runGroup("✅ QUERY RELEVAN (harusnya skor TINGGI)", RELEVANT_QUERIES, relevantTops);
await runGroup("🚫 QUERY NOISE (harusnya skor RENDAH)", NOISE_QUERIES, noiseTops);

// ---- Ringkasan & rekomendasi ----
const min = (a) => Math.min(...a);
const max = (a) => Math.max(...a);
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

console.log(`\n\n${"═".repeat(64)}`);
console.log("  📊 RINGKASAN");
console.log("═".repeat(64));
console.log(`\n  RELEVAN  → min ${min(relevantTops).toFixed(3)} · avg ${avg(relevantTops).toFixed(3)} · max ${max(relevantTops).toFixed(3)}`);
console.log(`  NOISE    → min ${min(noiseTops).toFixed(3)} · avg ${avg(noiseTops).toFixed(3)} · max ${max(noiseTops).toFixed(3)}`);

const lowestRelevant = min(relevantTops);
const highestNoise = max(noiseTops);
const gap = lowestRelevant - highestNoise;

console.log(`\n  Relevan TERENDAH : ${lowestRelevant.toFixed(3)}`);
console.log(`  Noise TERTINGGI  : ${highestNoise.toFixed(3)}`);
console.log(`  Gap pemisah      : ${gap.toFixed(3)}`);

console.log(`\n${"─".repeat(64)}`);
if (gap > 0.02) {
  const recommended = (lowestRelevant + highestNoise) / 2;
  console.log(`  ✅ Ada gap bersih. Threshold ideal ≈ ${recommended.toFixed(2)}`);
  console.log(`     (tepat di tengah antara noise tertinggi & relevan terendah)`);
} else {
  console.log(`  ⚠️  Gap tipis/tumpang-tindih — noise dan relevan susah dipisah`);
  console.log(`     hanya dengan threshold. Pertimbangkan perbaiki corpus/chunking,`);
  console.log(`     atau set threshold di ~${highestNoise.toFixed(2)} (toleransi noise minimal).`);
}
console.log(`${"─".repeat(64)}\n`);

process.exit(0);
