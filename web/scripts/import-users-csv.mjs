/**
 * import-users-csv.mjs
 * Import karyawan dari CSV lokal → Supabase (auth + profil).
 * Password di-generate unik per user, lalu disimpan ke credentials-output.csv.
 *
 * Cara pakai:
 *   1. Edit scripts/users-import.csv sesuai data karyawan
 *   2. node scripts/import-users-csv.mjs
 *   3. Ambil password dari scripts/credentials-output.csv → distribusikan ke karyawan
 *   4. HAPUS credentials-output.csv setelah selesai distribusi!
 *
 * Format CSV input (header wajib ada):
 *   nik, nama, email, role, sub_role, can_escalate
 *
 * Nilai sub_role yang valid: superior | rwp | (kosong = null, untuk karyawan)
 *
 * ⚠️  Kedua file CSV di-gitignore — JANGAN commit ke repo.
 * ⚠️  Butuh SUPABASE_SERVICE_ROLE_KEY di web/.env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";

// ─── Load .env.local (tanpa dotenv) ─────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kosong di .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Generate password unik ──────────────────────────────────────────────────
// Format: HK-<NIK>-<4 char random> contoh: HK-10001-aB3x
// Mudah diingat, unik per NIK, cukup kuat untuk pilot
function generatePassword(nik) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa karakter ambigu
  const random = Array.from(randomBytes(4))
    .map((b) => chars[b % chars.length])
    .join("");
  return `HK-${nik}-${random}`;
}

// ─── Parse CSV ───────────────────────────────────────────────────────────────
function parseCsv(filePath) {
  const raw = readFileSync(new URL(filePath, import.meta.url), "utf8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    // Handle nilai yang mungkin ada koma dalam quotes
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
const CSV_INPUT  = "../scripts/users-import.csv";
const CSV_OUTPUT = "../scripts/credentials-output.csv";

// Cek file input ada
if (!existsSync(new URL(CSV_INPUT, import.meta.url))) {
  console.error(`❌ File tidak ditemukan: scripts/users-import.csv`);
  console.error(`   Buat file CSV dulu dengan format:`);
  console.error(`   nik,nama,email,role,sub_role,can_escalate`);
  process.exit(1);
}

const rows = parseCsv(CSV_INPUT);
console.log(`\n📋 ${rows.length} user ditemukan di CSV\n`);

let ok = 0, skip = 0, fail = 0;
const credentials = [["nama", "email", "password", "role", "sub_role"]]; // header output

for (const row of rows) {
  const { nik, nama, email, role, sub_role, can_escalate } = row;

  // Validasi minimal
  if (!email || !nama || !nik) {
    console.warn(`⚠️  Skip baris kosong/tidak lengkap: ${JSON.stringify(row)}`);
    skip++;
    continue;
  }

  const password    = generatePassword(nik);
  const subRole     = sub_role?.trim() || null;
  const canEscalate = can_escalate?.toLowerCase() === "true";

  // 1. Buat auth user
  const { data, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message?.includes("already been registered") || authErr.code === "email_exists") {
      console.log(`⏭️  Skip (sudah ada): ${email}`);
      skip++;
      continue;
    }
    console.error(`❌ Auth gagal ${email}: ${authErr.message}`);
    fail++;
    continue;
  }

  // 2. Insert profil
  const { error: profErr } = await supabase.from("users").insert({
    id: data.user.id,
    nik,
    nama,
    email,
    role: role || "karyawan",
    sub_role: subRole,
    can_escalate: canEscalate,
  });

  if (profErr) {
    if (profErr.code === "23505") {
      console.log(`⏭️  Skip profil (sudah ada): ${email}`);
      skip++;
    } else {
      console.error(`❌ Profil gagal ${email}: ${profErr.message}`);
      fail++;
    }
    continue;
  }

  console.log(`✅ ${nama.padEnd(24)} ${email}`);
  credentials.push([nama, email, password, role || "karyawan", subRole || "-"]);
  ok++;
}

// ─── Simpan credentials ke CSV lokal ────────────────────────────────────────
if (credentials.length > 1) {
  const csvContent = credentials.map((r) => r.join(",")).join("\n");
  writeFileSync(new URL(CSV_OUTPUT, import.meta.url), csvContent, "utf8");
  console.log(`\n📄 Credentials disimpan ke: scripts/credentials-output.csv`);
  console.log(`   ⚠️  HAPUS file ini setelah selesai distribusi ke karyawan!\n`);
}

// ─── Ringkasan ───────────────────────────────────────────────────────────────
console.log(`─────────────────────────────────────
✅ Berhasil : ${ok}
⏭️  Skip     : ${skip}
❌ Gagal    : ${fail}
─────────────────────────────────────`);
