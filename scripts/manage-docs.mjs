// ============================================================
// Manage dokumen di rag_chunks — list & delete per source_doc.
// Pakai ini kalau mau hapus 1 dokumen tanpa --clear semua.
// ------------------------------------------------------------
// Cara pakai:
//   node scripts/manage-docs.mjs --list
//     → tampilkan semua source_doc + jumlah chunk di DB
//
//   node scripts/manage-docs.mjs --delete <nama-file>
//     → hapus semua chunk dari dokumen itu (nama sesuai kolom source_doc)
//     contoh: node scripts/manage-docs.mjs --delete rwp-overview.md
//
// Nama source_doc = nama file lengkap (misal: rwp-overview.md, handbook-rwp.md).
// Untuk lihat nama exaknya, --list dulu.
// ============================================================
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

// ---- Baca .env.local ----
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
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kosong di .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---- Parse args ----
const args = process.argv.slice(2);
const doList   = args.includes("--list");
const delIdx   = args.indexOf("--delete");
const delDoc   = delIdx !== -1 ? args[delIdx + 1] : null;

if (!doList && !delDoc) {
  console.log("Penggunaan:");
  console.log("  node scripts/manage-docs.mjs --list");
  console.log("  node scripts/manage-docs.mjs --delete <nama-file.md>");
  process.exit(0);
}

// ---- LIST ----
if (doList) {
  // Ambil semua chunk, lalu hitung per source_doc di sisi client
  // (Supabase JS tidak mendukung GROUP BY langsung)
  const { data, error } = await supabase
    .from("rag_chunks")
    .select("source_doc")
    .order("source_doc");

  if (error) {
    console.error("❌ Gagal fetch:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("rag_chunks kosong — belum ada dokumen yang di-ingest.");
    process.exit(0);
  }

  // Hitung per source_doc
  const counts = {};
  for (const row of data) {
    counts[row.source_doc] = (counts[row.source_doc] || 0) + 1;
  }

  const total = data.length;
  console.log(`\n📚 Dokumen di rag_chunks (total ${total} chunk):\n`);
  const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  const maxLen = Math.max(...sorted.map(([k]) => k.length));
  for (const [doc, count] of sorted) {
    console.log(`  ${doc.padEnd(maxLen + 2)} ${count} chunk`);
  }
  console.log();
}

// ---- DELETE ----
if (delDoc) {
  // Cek dulu apakah ada
  const { data: existing, error: fetchErr } = await supabase
    .from("rag_chunks")
    .select("id")
    .eq("source_doc", delDoc);

  if (fetchErr) {
    console.error("❌ Gagal cek dokumen:", fetchErr.message);
    process.exit(1);
  }

  if (!existing || existing.length === 0) {
    console.log(`⚠️  Tidak ada chunk untuk source_doc = "${delDoc}"`);
    console.log("   Cek nama yang tepat dengan: node scripts/manage-docs.mjs --list");
    process.exit(0);
  }

  console.log(`🗑️  Menghapus ${existing.length} chunk dari "${delDoc}"...`);

  const { error: delErr } = await supabase
    .from("rag_chunks")
    .delete()
    .eq("source_doc", delDoc);

  if (delErr) {
    console.error("❌ Gagal hapus:", delErr.message);
    process.exit(1);
  }

  console.log(`✅ Berhasil dihapus: ${existing.length} chunk dari "${delDoc}"`);
}

process.exit(0);
