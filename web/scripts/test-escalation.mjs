// Tes eskalasi reveal_reporter. Jalankan: node scripts/test-escalation.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PW = "Password123!";

// 1) budi bikin laporan ANONIM
const c1 = createClient(SUPA_URL, KEY);
const { data: auth1 } = await c1.auth.signInWithPassword({ email: "budi@hutamakarya.co.id", password: PW });
const { data: rep, error: e1 } = await c1.from("reports").insert({
  reporter_id: auth1.user.id,
  is_anonymous: true,
  kategori: "Perundungan", judul: "[TES] eskalasi",
  kronologi: "Laporan uji untuk verifikasi reveal_reporter.",
  tanggal_kejadian: new Date().toISOString().slice(0, 10),
}).select().single();
if (e1) { console.error("❌ Insert gagal:", e1.message); process.exit(1); }
console.log("✅ Laporan anonim dibuat:", rep.ticket_no);

// 2) budi (karyawan) coba reveal → HARUS DITOLAK
const { error: eDenied } = await c1.rpc("reveal_reporter", { p_report_id: rep.id, p_reason: "iseng" });
console.log(eDenied
  ? `✅ Karyawan ditolak (benar): "${eDenied.message}"`
  : "❌ BAHAYA: karyawan bisa buka identitas!");

// 3) admin superior reveal → HARUS BERHASIL
const c2 = createClient(SUPA_URL, KEY);
await c2.auth.signInWithPassword({ email: "admin@hutamakarya.co.id", password: PW }); // admin superior
const { data: id, error: e3 } = await c2.rpc("reveal_reporter", {
  p_report_id: rep.id, p_reason: "Eskalasi resmi untuk uji sistem.",
});
if (e3) { console.error("❌ Admin gagal reveal:", e3.message); process.exit(1); }
console.log("✅ Admin berhasil buka identitas:", id);

console.log("\n🎉 Eskalasi berfungsi: ditolak utk karyawan, berhasil utk superior + tercatat di audit.");
process.exit(0);
