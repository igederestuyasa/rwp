// ============================================================
// Ingest dokumen kebijakan HC → rag_chunks (untuk HCsisten/RAG).
// ------------------------------------------------------------
// Pakai: node scripts/ingest.mjs [folder]
//   default folder = scripts/docs
//
// Alur: baca file .txt/.md → potong jadi chunk → embed (OpenAI) →
//       insert ke rag_chunks (pakai service_role, bypass RLS insert).
//
// PRASYARAT di .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (Dashboard > Settings > API > service_role)
//   OPENAI_API_KEY
//   OPENAI_EMBED_MODEL          (opsional, default text-embedding-3-small)
//
// CATATAN: PDF/DOCX → konversi dulu ke .txt/.md sebelum ditaruh di folder.
// Re-ingest aman: chunk lama untuk file yang sama dihapus dulu (idempotent).
// ============================================================
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kosong di .env.local");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY kosong di .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---- Argumen ----
//   node scripts/ingest.mjs [folder] [--clear]
//   --clear = hapus SEMUA chunk lama dulu (buat ganti dummy -> dokumen asli)
const args = process.argv.slice(2);
const clearAll = args.includes("--clear");
const folderArg = args.find((a) => !a.startsWith("--")) || "docs";

// fileURLToPath = decode path dgn benar (spasi tidak jadi %20) — penting di
// Windows dengan path berisi spasi seperti "777 My Projects".
const docsDir = fileURLToPath(new URL(`./${folderArg}`, import.meta.url));

if (!existsSync(docsDir)) {
  console.error(`❌ Folder dokumen tidak ada: ${docsDir}`);
  console.error(`   Buat folder itu & taruh file .txt/.md, atau: node scripts/ingest.mjs <folder>`);
  process.exit(1);
}

// ---- Chunking HEADING-AWARE v2 ----
// Estimasi token: 1 token ≈ 4 karakter.
// Split utama di # (Bab/Lampiran) dan ## (Pasal). Satu pasal = satu chunk dasar.
// Fitur baru: YAML front-matter, blockquote > Konteks: per-pasal,
// tabel tidak dipotong di tengah, rumus + penjelasan tetap satu chunk,
// merge pasal pendek dalam bab yang sama.
const TOKEN_CHARS = 4;
const TOKEN_MAX   = 800;                   // maks token per chunk
const TOKEN_MIN   = 150;                   // min token sebelum digabung
const CHUNK_SIZE  = TOKEN_MAX * TOKEN_CHARS; // 3200 karakter
const CHUNK_MIN   = TOKEN_MIN * TOKEN_CHARS; //  600 karakter

// ---- Helpers front-matter ----
function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const ci = line.indexOf(":");
    if (ci === -1) continue;
    const key = line.slice(0, ci).trim();
    const val = line.slice(ci + 1).trim().replace(/^["']|["']$/g, "");
    if (key) meta[key] = val;
  }
  return { meta, body: text.slice(m[0].length) };
}

function buildMetaPrefix(meta) {
  const parts = [];
  if (meta.doc_id)            parts.push(`doc_id: ${meta.doc_id}`);
  if (meta.nomor)             parts.push(`nomor: ${meta.nomor}`);
  if (meta.tanggal_ditetapkan) parts.push(`tanggal_ditetapkan: ${meta.tanggal_ditetapkan}`);
  return parts.join(" | ");
}

// ---- Helpers deteksi baris ----
const isTableLine   = (l) => /^\s*\|/.test(l) || /\|.*\|/.test(l);
const isFormulaLine = (l) => /[=×÷]/.test(l) || /^```/.test(l.trim());

// ---- Segmentasi baris jadi blok text / table ----
function segmentLines(lines) {
  const segs = [];
  let cur = null;
  for (const line of lines) {
    const type = isTableLine(line) ? "table" : "text";
    if (!cur || cur.type !== type) {
      if (cur) segs.push(cur);
      cur = { type, lines: [] };
    }
    cur.lines.push(line);
  }
  if (cur) segs.push(cur);
  return segs;
}

// Pecah tabel panjang; setiap pecahan bawa baris header + separator.
function splitLongTable(tableLines) {
  if (tableLines.length < 3) return [tableLines.join("\n")];
  const header = tableLines[0];
  const sep    = tableLines[1];
  const rows   = tableLines.slice(2);
  const parts  = [];
  let buf = [header, sep];
  for (const row of rows) {
    if ([...buf, row].join("\n").length > CHUNK_SIZE && buf.length > 2) {
      parts.push(buf.join("\n"));
      buf = [header, sep, row];
    } else {
      buf.push(row);
    }
  }
  if (buf.length > 2) parts.push(buf.join("\n"));
  return parts.length ? parts : [tableLines.join("\n")];
}

// ---- parseSections ----
// Mengembalikan { docTitle, sections: [{h1,h2,h3,body,blockquoteCtx,metaPrefix}] }.
function parseSections(text) {
  const { meta, body: bodyText } = parseFrontMatter(text);
  const metaPrefix = buildMetaPrefix(meta);

  const clean = bodyText.replace(/\r\n/g, "\n").trim();
  const lines = clean.split("\n");

  let docTitle = "";
  let h1 = "";   // # Bab / Lampiran
  let h2 = "";   // ## Pasal
  let h3 = "";   // ### Sub-section
  let pasalBQ = ""; // blockquote > Konteks: aktif untuk pasal saat ini

  const sections = [];
  let cur = { h1: "", h2: "", h3: "", lines: [], blockquoteCtx: "" };

  const flush = () => {
    const bodyStr = cur.lines.join("\n").trim();
    if (bodyStr) sections.push({ h1: cur.h1, h2: cur.h2, h3: cur.h3, body: bodyStr, blockquoteCtx: cur.blockquoteCtx, metaPrefix });
  };

  for (const line of lines) {
    // Cocokkan dari paling spesifik supaya ### tidak ter-capture oleh # regex
    const m3 = line.match(/^###\s+(.+)/);
    const m2 = line.match(/^##\s+(.+)/);
    const m1 = line.match(/^#\s+(.+)/);   // hanya # (bukan ## / ###)

    if (m3) { flush(); h3 = m3[1].trim(); cur = { h1, h2, h3, lines: [], blockquoteCtx: pasalBQ }; continue; }
    if (m2) { flush(); h2 = m2[1].trim(); h3 = ""; pasalBQ = ""; cur = { h1, h2, h3, lines: [], blockquoteCtx: "" }; continue; }
    if (m1) {
      if (!docTitle) { docTitle = m1[1].trim(); }
      else { flush(); h1 = m1[1].trim(); h2 = ""; h3 = ""; pasalBQ = ""; cur = { h1, h2, h3, lines: [], blockquoteCtx: "" }; }
      continue;
    }

    // Deteksi > Konteks: di awal pasal (body masih kosong) — graceful jika tidak ada
    if (/^>\s*Konteks:/i.test(line) && cur.lines.join("").trim() === "") {
      pasalBQ = line.trim();
      cur.blockquoteCtx = pasalBQ;
      continue;
    }
    // Baris lanjutan blockquote sesudah > Konteks:
    if (/^>/.test(line) && pasalBQ && cur.lines.join("").trim() === "") {
      pasalBQ += "\n" + line.trim();
      cur.blockquoteCtx = pasalBQ;
      continue;
    }

    if (line.trim() === "---") continue; // horizontal rule, buang
    cur.lines.push(line);
  }
  flush();
  return { docTitle, sections, metaPrefix };
}

// ---- splitBody ----
// Pecah body jadi chunk-chunk; blockquoteCtx di-prepend ke SETIAP sub-chunk.
function splitBody(body, blockquoteCtx = "") {
  const lines = body.split("\n");
  const segs  = segmentLines(lines);
  const parts = [];
  let buf = "";

  const wrap = (t) => blockquoteCtx ? `${blockquoteCtx}\n\n${t.trim()}` : t.trim();

  const flushBuf = () => {
    if (buf.trim()) { parts.push(wrap(buf)); buf = ""; }
  };

  for (const seg of segs) {
    const segText = seg.lines.join("\n");

    if (seg.type === "table") {
      if (segText.length > CHUNK_SIZE) {
        flushBuf();
        for (const tp of splitLongTable(seg.lines)) parts.push(wrap(tp));
      } else if (buf && buf.length + 2 + segText.length > CHUNK_SIZE) {
        flushBuf();
        buf = segText;
      } else {
        buf = buf ? buf + "\n\n" + segText : segText;
      }
    } else {
      // Teks: split per paragraf; rumus + paragraf berikutnya dijaga bersama
      const paras = segText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      let i = 0;
      while (i < paras.length) {
        const para = paras[i];
        const isFormula = para.split("\n").some(isFormulaLine);
        const nextPara  = paras[i + 1] ?? "";
        // Gabungkan rumus dengan paragraf penjelasan berikutnya
        const block = isFormula && nextPara ? para + "\n\n" + nextPara : para;
        const step  = isFormula && nextPara ? 2 : 1;

        if (buf && buf.length + 2 + block.length > CHUNK_SIZE) {
          flushBuf();
          buf = block;
        } else {
          buf = buf ? buf + "\n\n" + block : block;
        }
        i += step;
      }
    }
  }
  flushBuf();
  return parts;
}

// ---- chunkText ----
function chunkText(text) {
  const { docTitle, sections, metaPrefix } = parseSections(text);
  const raw = [];

  for (const sec of sections) {
    const ctx    = [docTitle, sec.h1, sec.h2, sec.h3].filter(Boolean).join(" › ");
    const prefix = [sec.metaPrefix, ctx].filter(Boolean).join("\n");
    for (const part of splitBody(sec.body, sec.blockquoteCtx)) {
      raw.push({ prefix, body: part, h1: sec.h1, len: part.length });
    }
  }

  // Merge pasal pendek (< CHUNK_MIN) dengan chunk berikutnya dalam bab yang sama
  const merged = [];
  let i = 0;
  while (i < raw.length) {
    const cur  = raw[i];
    const next = raw[i + 1];
    if (
      cur.len < CHUNK_MIN &&
      next &&
      cur.h1 === next.h1 &&
      cur.body.length + 2 + next.body.length <= CHUNK_SIZE
    ) {
      merged.push({ ...next, body: cur.body + "\n\n" + next.body, len: cur.len + 2 + next.len });
      i += 2;
    } else {
      merged.push(cur);
      i++;
    }
  }

  return merged.map((c) => (c.prefix ? `${c.prefix}\n\n${c.body}` : c.body));
}

// ---- Embed batch via OpenAI ----
async function embedBatch(texts) {
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`Embedding gagal (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// ---- Main ----
const files = readdirSync(docsDir).filter((f) => [".txt", ".md"].includes(extname(f).toLowerCase()));
if (files.length === 0) {
  console.error(`❌ Tidak ada file .txt/.md di ${docsDir}`);
  process.exit(1);
}

console.log(`📂 ${files.length} dokumen ditemukan. Model embedding: ${EMBED_MODEL}\n`);

// --clear: kosongkan seluruh rag_chunks dulu (mis. ganti dummy -> dokumen asli)
if (clearAll) {
  console.log("🧹 --clear: menghapus SEMUA chunk lama di rag_chunks...");
  const { error } = await supabase
    .from("rag_chunks")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // filter wajib = semua baris
  if (error) {
    console.error("❌ Gagal clear:", error.message);
    process.exit(1);
  }
}

let totalChunks = 0;
for (const file of files) {
  const sourceDoc = basename(file);
  const text = readFileSync(join(docsDir, file), "utf8");
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    console.log(`⏭️  ${sourceDoc}: kosong, dilewati`);
    continue;
  }

  // Idempotent: hapus chunk lama dokumen ini dulu
  await supabase.from("rag_chunks").delete().eq("source_doc", sourceDoc);

  // Embed per batch 50 chunk
  const BATCH = 50;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const embeddings = await embedBatch(slice);
    const rows = slice.map((chunk_text, j) => ({
      source_doc: sourceDoc,
      chunk_text,
      // pgvector terima format string "[...]" untuk insert
      embedding: JSON.stringify(embeddings[j]),
      embed_model: EMBED_MODEL,
    }));
    const { error } = await supabase.from("rag_chunks").insert(rows);
    if (error) {
      console.error(`❌ Insert gagal (${sourceDoc}): ${error.message}`);
      process.exit(1);
    }
  }
  totalChunks += chunks.length;
  console.log(`✅ ${sourceDoc}: ${chunks.length} chunk`);
}

console.log(`\n🎉 Selesai. Total ${totalChunks} chunk masuk ke rag_chunks.`);
process.exit(0);
