// Smoke test login Supabase. Jalankan: node scripts/test-login.mjs
// Meniru persis yang dilakukan auth.tsx: signIn → fetch profil dari public.users.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Ganti email/password di sini untuk tes akun lain.
const EMAIL = "budi@hutamakarya.co.id";
const PASSWORD = "Password123!";

console.log(`Login sebagai ${EMAIL} ...`);
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: EMAIL, password: PASSWORD,
});
if (authErr) {
  console.error("❌ Login gagal:", authErr.message);
  process.exit(1);
}
console.log("✅ Auth OK — uid:", auth.user.id);

const { data: profile, error: pErr } = await supabase
  .from("users").select("*").eq("id", auth.user.id).single();
if (pErr || !profile) {
  console.error("❌ Profil tidak ditemukan:", pErr?.message);
  process.exit(1);
}
console.log("✅ Profil OK:", {
  nama: profile.nama, role: profile.role,
  sub_role: profile.sub_role, can_escalate: profile.can_escalate,
});
console.log("\n🎉 Alur login Supabase berfungsi penuh!");
process.exit(0);
