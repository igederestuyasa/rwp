// ============================================================
// Bangun folder korpus RAG (scripts/docs/) dari sumber yang ADA di repo.
//
// Kenapa perlu skrip ini: scripts/docs/ sengaja gitignored (bisa memuat
// dokumen sensitif), sehingga siapa pun yang meng-clone repo mendapati
// korpusnya kosong dan `ingest.mjs` langsung gagal. Skrip ini membuat
// ulang korpus dasar sehingga setup RAG bisa diulang dari nol.
//
// Sumber:
//   1. handbook RWP  ← src/lib/policies.ts (POLICIES[0].markdown)
//      Sengaja dari sini, bukan dari file mentah hasil OCR: teks di sini
//      sudah bersih DAN identik dengan yang dibaca halaman /kebijakan,
//      jadi asisten dan halaman kebijakan tidak bercerita beda.
//   2. dokumen cara pakai ← scripts/corpus/*.md (ikut di-commit)
//
// Pakai:
//   node scripts/build-corpus.mjs
//   node scripts/ingest.mjs --clear
//   node scripts/diagnose-retrieval.mjs
//
// Dokumen tambahan boleh ditaruh langsung di scripts/docs/ — skrip ini
// hanya menimpa berkas yang dihasilkannya sendiri.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(here, "docs");
const corpusDir = path.join(here, "corpus");
const policiesTs = path.join(here, "..", "src", "lib", "policies.ts");

mkdirSync(docsDir, { recursive: true });

// ── 1. Handbook RWP dari policies.ts ──
const ts = readFileSync(policiesTs, "utf8");
const start = ts.indexOf("markdown: `");
if (start === -1) {
  console.error("❌ Tidak menemukan POLICIES[0].markdown di src/lib/policies.ts");
  process.exit(1);
}
const bodyStart = start + "markdown: `".length;
const bodyEnd = ts.indexOf("`,\n  },\n];", bodyStart);
if (bodyEnd === -1) {
  console.error("❌ Gagal menentukan akhir blok markdown di policies.ts");
  process.exit(1);
}
const markdown = ts.slice(bodyStart, bodyEnd);

const title = /title: "([^"]+)"/.exec(ts)?.[1] ?? "Respectful Workplace Policy (RWP)";
const handbook = `# ${title}\n\n${markdown.trim()}\n`;
writeFileSync(path.join(docsDir, "handbook-rwp.md"), handbook, "utf8");
console.log(`✅ handbook-rwp.md  (${handbook.length.toLocaleString("id-ID")} karakter)`);

// ── 2. Dokumen cara pakai dari corpus/ ──
let n = 0;
for (const f of readdirSync(corpusDir).filter((f) => f.endsWith(".md")).sort()) {
  copyFileSync(path.join(corpusDir, f), path.join(docsDir, f));
  console.log(`✅ ${f}`);
  n++;
}

console.log(`\n📁 ${docsDir}`);
console.log(`   ${n + 1} dokumen siap di-ingest.`);
console.log("\nLangkah berikutnya:");
console.log("   node scripts/ingest.mjs --clear");
console.log("   node scripts/diagnose-retrieval.mjs   # setel ulang MIN_SIMILARITY dari hasilnya");
