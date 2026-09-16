// ============================================================
// Chunker heading-aware — PORT 1:1 dari scripts/ingest.mjs (server-side).
// ------------------------------------------------------------
// Sumber kebenaran logika: scripts/ingest.mjs, blok "Chunking HEADING-AWARE
// v2" (parseFrontMatter → buildMetaPrefix → segmentLines → splitLongTable →
// parseSections → splitBody → chunkText). File ini memindahkan logika itu ke
// TypeScript TANPA mengubah perilaku: regex, urutan pemeriksaan, ambang
// karakter, dan cara menggabungkan pasal pendek semuanya sama.
//
// PARITAS: keluaran `chunkToTexts()` diverifikasi IDENTIK (elemen demi
// elemen) dengan string yang dikirim ingest.mjs ke embedBatch, untuk seluruh
// dokumen hasil `node scripts/build-corpus.mjs`. Kalau logika di sini perlu
// berubah, ubah ingest.mjs juga (atau sebaliknya) dan uji ulang paritasnya —
// korpus yang di-embed dengan chunker berbeda akan menghasilkan chunk yang
// tidak sebanding.
//
// Perbedaan bentuk API (bukan perilaku):
//  - `chunkText()` JS asli langsung mengembalikan string[]. Di sini langkah
//    itu dipecah dua: `chunkText()` mengembalikan objek `Chunk[]` (bentuk
//    internal sebelum map terakhir), dan `chunkToTexts()` melakukan map
//    `prefix\n\nbody` yang sama persis dengan baris terakhir chunkText JS.
//
// Server-only secara peruntukan (dipakai Route Handler / skrip Node). Tidak
// ada import sama sekali — murni operasi string — sehingga aman dari sisi
// dependency dan tidak menyentuh API browser maupun Node.
// ============================================================

// ---- Konstanta ukuran ----
// Estimasi token: 1 token ≈ 4 karakter.
// Split utama di # (Bab/Lampiran) dan ## (Pasal). Satu pasal = satu chunk dasar.
export const TOKEN_CHARS = 4;
export const TOKEN_MAX = 800; // maks token per chunk
export const TOKEN_MIN = 150; // min token sebelum digabung
export const CHUNK_SIZE = TOKEN_MAX * TOKEN_CHARS; // 3200 karakter
export const CHUNK_MIN = TOKEN_MIN * TOKEN_CHARS; //  600 karakter

// ---- Tipe ----

/** Pasangan kunci→nilai hasil parsing YAML front-matter (datar, string saja). */
export type FrontMatter = Record<string, string>;

/** Satu bagian dokumen (pasal/sub-pasal) hasil parseSections. */
export interface Section {
  h1: string; // # Bab / Lampiran
  h2: string; // ## Pasal
  h3: string; // ### Sub-section
  body: string;
  blockquoteCtx: string; // blockquote "> Konteks:" yang berlaku untuk pasal ini
  metaPrefix: string; // "doc_id: … | nomor: … | tanggal_ditetapkan: …"
}

/** Blok baris hasil segmentLines: tabel Markdown atau teks biasa. */
interface Segment {
  type: "table" | "text";
  lines: string[];
}

/**
 * Bentuk internal chunk — sama dengan objek `raw`/`merged` di ingest.mjs.
 * `len` = panjang `body` (tanpa prefix), dipakai untuk keputusan merge.
 */
export interface Chunk {
  prefix: string; // metaPrefix + "\n" + konteks heading ("Judul › Bab › Pasal")
  body: string;
  h1: string; // dipakai untuk syarat merge: hanya dalam bab yang sama
  len: number;
}

// ---- Helpers front-matter ----
export function parseFrontMatter(text: string): { meta: FrontMatter; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const meta: FrontMatter = {};
  for (const line of m[1].split("\n")) {
    const ci = line.indexOf(":");
    if (ci === -1) continue;
    const key = line.slice(0, ci).trim();
    const val = line
      .slice(ci + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) meta[key] = val;
  }
  return { meta, body: text.slice(m[0].length) };
}

export function buildMetaPrefix(meta: FrontMatter): string {
  const parts: string[] = [];
  if (meta.doc_id) parts.push(`doc_id: ${meta.doc_id}`);
  if (meta.nomor) parts.push(`nomor: ${meta.nomor}`);
  if (meta.tanggal_ditetapkan) parts.push(`tanggal_ditetapkan: ${meta.tanggal_ditetapkan}`);
  return parts.join(" | ");
}

// ---- Helpers deteksi baris ----
// Catatan: regex kedua `/\|.*\|/` sengaja longgar (dua pipa di mana pun pada
// baris) — sama dengan aslinya, jangan dipersempit.
const isTableLine = (l: string): boolean => /^\s*\|/.test(l) || /\|.*\|/.test(l);
const isFormulaLine = (l: string): boolean => /[=×÷]/.test(l) || /^```/.test(l.trim());

// ---- Segmentasi baris jadi blok text / table ----
function segmentLines(lines: string[]): Segment[] {
  const segs: Segment[] = [];
  let cur: Segment | null = null;
  for (const line of lines) {
    const type: Segment["type"] = isTableLine(line) ? "table" : "text";
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
function splitLongTable(tableLines: string[]): string[] {
  if (tableLines.length < 3) return [tableLines.join("\n")];
  const header = tableLines[0];
  const sep = tableLines[1];
  const rows = tableLines.slice(2);
  const parts: string[] = [];
  let buf: string[] = [header, sep];
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
// Mengembalikan { docTitle, sections: [{h1,h2,h3,body,blockquoteCtx,metaPrefix}], metaPrefix }.
export function parseSections(text: string): {
  docTitle: string;
  sections: Section[];
  metaPrefix: string;
} {
  const { meta, body: bodyText } = parseFrontMatter(text);
  const metaPrefix = buildMetaPrefix(meta);

  const clean = bodyText.replace(/\r\n/g, "\n").trim();
  const lines = clean.split("\n");

  let docTitle = "";
  let h1 = ""; // # Bab / Lampiran
  let h2 = ""; // ## Pasal
  let h3 = ""; // ### Sub-section
  let pasalBQ = ""; // blockquote > Konteks: aktif untuk pasal saat ini

  const sections: Section[] = [];
  // Akumulator bagian yang sedang dibaca. `lines` di sini masih array baris;
  // baru digabung jadi `body` saat flush.
  let cur: { h1: string; h2: string; h3: string; lines: string[]; blockquoteCtx: string } = {
    h1: "",
    h2: "",
    h3: "",
    lines: [],
    blockquoteCtx: "",
  };

  const flush = () => {
    const bodyStr = cur.lines.join("\n").trim();
    if (bodyStr)
      sections.push({
        h1: cur.h1,
        h2: cur.h2,
        h3: cur.h3,
        body: bodyStr,
        blockquoteCtx: cur.blockquoteCtx,
        metaPrefix,
      });
  };

  for (const line of lines) {
    // Cocokkan dari paling spesifik supaya ### tidak ter-capture oleh # regex.
    // (`\s+` setelah tanda pagar memastikan "## X" tidak cocok ke regex "#".)
    // Heading level 4 ke atas (####) tidak cocok ke mana pun → masuk body.
    const m3 = line.match(/^###\s+(.+)/);
    const m2 = line.match(/^##\s+(.+)/);
    const m1 = line.match(/^#\s+(.+)/); // hanya # (bukan ## / ###)

    if (m3) {
      flush();
      h3 = m3[1].trim();
      cur = { h1, h2, h3, lines: [], blockquoteCtx: pasalBQ };
      continue;
    }
    if (m2) {
      flush();
      h2 = m2[1].trim();
      h3 = "";
      pasalBQ = "";
      cur = { h1, h2, h3, lines: [], blockquoteCtx: "" };
      continue;
    }
    if (m1) {
      // Perilaku asli: H1 PERTAMA jadi judul dokumen TANPA flush/reset —
      // baris apa pun sebelum H1 pertama tetap menempel di `cur` (h1 kosong).
      if (!docTitle) {
        docTitle = m1[1].trim();
      } else {
        flush();
        h1 = m1[1].trim();
        h2 = "";
        h3 = "";
        pasalBQ = "";
        cur = { h1, h2, h3, lines: [], blockquoteCtx: "" };
      }
      continue;
    }

    // Deteksi > Konteks: di awal pasal (body masih kosong) — graceful jika tidak ada.
    // Perhatikan: kosong-tidaknya body dicek lewat join("") (tanpa pemisah), sama
    // dengan aslinya.
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
export function splitBody(body: string, blockquoteCtx = ""): string[] {
  const lines = body.split("\n");
  const segs = segmentLines(lines);
  const parts: string[] = [];
  let buf = "";

  const wrap = (t: string): string =>
    blockquoteCtx ? `${blockquoteCtx}\n\n${t.trim()}` : t.trim();

  const flushBuf = () => {
    if (buf.trim()) {
      parts.push(wrap(buf));
      buf = "";
    }
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
      // Teks: split per paragraf; rumus + paragraf berikutnya dijaga bersama.
      // Perilaku asli: satu paragraf yang sendirian > CHUNK_SIZE TIDAK dipecah
      // lebih lanjut — ia jadi satu chunk utuh.
      const paras = segText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      let i = 0;
      while (i < paras.length) {
        const para = paras[i];
        const isFormula = para.split("\n").some(isFormulaLine);
        const nextPara = paras[i + 1] ?? "";
        // Gabungkan rumus dengan paragraf penjelasan berikutnya
        const block = isFormula && nextPara ? para + "\n\n" + nextPara : para;
        const step = isFormula && nextPara ? 2 : 1;

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
/**
 * Potong dokumen jadi chunk (bentuk internal). Setara dengan chunkText() di
 * ingest.mjs SEBELUM baris `merged.map(...)` terakhir — lihat chunkToTexts().
 */
export function chunkText(text: string): Chunk[] {
  const { docTitle, sections } = parseSections(text);
  const raw: Chunk[] = [];

  for (const sec of sections) {
    const ctx = [docTitle, sec.h1, sec.h2, sec.h3].filter(Boolean).join(" › ");
    const prefix = [sec.metaPrefix, ctx].filter(Boolean).join("\n");
    for (const part of splitBody(sec.body, sec.blockquoteCtx)) {
      raw.push({ prefix, body: part, h1: sec.h1, len: part.length });
    }
  }

  // Merge pasal pendek (< CHUNK_MIN) dengan chunk berikutnya dalam bab yang sama.
  // Perilaku asli yang dipertahankan:
  //  - hasil merge memakai `prefix` milik chunk BERIKUTNYA (spread `...next`),
  //    bukan milik pasal pendek yang digabung;
  //  - merge tidak berantai: setelah dua chunk digabung, kursor lompat dua
  //    (i += 2), jadi hasil gabungan tidak dicek lagi terhadap chunk sesudahnya.
  const merged: Chunk[] = [];
  let i = 0;
  while (i < raw.length) {
    const cur = raw[i];
    const next: Chunk | undefined = raw[i + 1];
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

  return merged;
}

// ---- chunkToTexts ----
/**
 * String final siap embed — PERSIS sama dengan nilai balik chunkText() di
 * ingest.mjs (yang lalu dikirim apa adanya ke embedBatch dan disimpan sebagai
 * `rag_chunks.chunk_text`). Ini yang dibandingkan pada uji paritas.
 */
export function chunkToTexts(text: string): string[] {
  return chunkText(text).map((c) => (c.prefix ? `${c.prefix}\n\n${c.body}` : c.body));
}
