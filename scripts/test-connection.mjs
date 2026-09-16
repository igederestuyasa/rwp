// Smoke test koneksi Supabase. Jalankan: node scripts/test-connection.mjs
// Baca .env.local manual (tanpa dependency tambahan).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL  :", url || "(KOSONG)");
console.log("Key  :", key ? key.slice(0, 20) + "..." : "(KOSONG)");

if (!url || !key) {
  console.error("\n❌ URL atau anon key kosong di .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

// Cek tiap tabel utama. Sebagai anon (belum login), RLS akan filter semua baris
// → hasil [] TANPA error = tabel ADA + RLS aktif + koneksi OK.
const tables = ["users", "reports", "report_evidence", "report_messages", "report_status_log",
                "policies", "rag_chunks", "chat_sessions", "chat_messages", "chat_feedback"];

let ok = true;
for (const t of tables) {
  const { error } = await supabase.from(t).select("*").limit(1);
  if (error) {
    console.log(`❌ ${t.padEnd(20)} → ${error.message}`);
    ok = false;
  } else {
    console.log(`✅ ${t.padEnd(20)} → tabel ada, RLS aktif`);
  }
}

console.log(ok ? "\n🎉 Koneksi & skema OK — siap wiring!" : "\n⚠️ Ada masalah di atas.");
process.exit(ok ? 0 : 1);
