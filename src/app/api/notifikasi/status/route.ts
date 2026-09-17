// ============================================================
// POST /api/notifikasi/status — email "ada pembaruan" ke pelapor.
// ------------------------------------------------------------
// Dipanggil store.tsx (changeStatus) SETELAH RPC change_report_status
// sukses, secara best-effort: gagal di sini tidak membatalkan perubahan
// status yang sudah tercatat, dan pelapor tetap melihatnya di aplikasi.
//
// Alur: verifikasi admin (token sesi) → validasi body → SERVICE ROLE
// mencari reports.reporter_id → users.email → kirim lewat Brevo.
//
// KEAMANAN:
//   - Ini satu-satunya tempat selain /api/policy-pdf yang memakai
//     service_role, dan satu-satunya yang membaca reporter_id di luar RPC
//     reveal_reporter. Alamat email hanya hidup di memori server selama
//     permintaan ini; respons ke browser cuma { dikirim, alasan? }.
//     JANGAN PERNAH mengembalikan reporter_id/email ke klien (§9.1).
//   - Isi email generik, lihat lib/emailServer.ts.
//   - Tidak ada log alamat email, identitas, maupun isi laporan (§9.7).
//   - Pemanggil wajib admin (lapis logika §9.2); pelapor tidak bisa
//     memicu email untuk dirinya sendiri atau orang lain.
// ============================================================
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseWithToken } from "@/lib/supabaseServer";
import {
  emailTerkonfigurasi, kirimEmailPembaruanStatus, urlAplikasi, GalatBrevo,
} from "@/lib/emailServer";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const USE_MOCK         = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** Body: id laporan yang statusnya baru diubah. */
const SkemaBody = z.object({ reportId: z.uuid() });

/** Kode tetap yang menjelaskan mengapa email dilewati (bukan galat). */
type AlasanLewat = "mock" | "belum-dikonfigurasi" | "tanpa-email";

function dilewati(alasan: AlasanLewat): Response {
  return Response.json({ dikirim: false, alasan });
}

function galat(pesan: string, status: number, detail?: unknown): Response {
  if (detail !== undefined) console.error("[notifikasi]", pesan, detail);
  return Response.json({ error: pesan }, { status });
}

export async function POST(req: NextRequest) {
  if (USE_MOCK) return dilewati("mock");

  // 1. Verifikasi pemanggil: wajib admin.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return galat("Tidak terautentikasi.", 401);
  const supabase = supabaseWithToken(token);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return galat("Sesi tidak valid. Silakan login ulang.", 401);

  // Peran dibaca dari baris users milik sendiri (RLS users_select).
  const { data: profil, error: profilErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profilErr || profil?.role !== "admin") {
    return galat("Hanya admin yang boleh mengirim notifikasi status.", 403);
  }

  // 2. Validasi body (§9.4).
  const json: unknown = await req.json().catch(() => null);
  const hasil = SkemaBody.safeParse(json);
  if (!hasil.success) return galat("Isi permintaan tidak valid.", 400, hasil.error.issues);
  const { reportId } = hasil.data;

  if (!emailTerkonfigurasi()) return dilewati("belum-dikonfigurasi");
  if (!SERVICE_ROLE_KEY || !SUPABASE_URL) return galat("Konfigurasi server tidak lengkap.", 500);

  // 3. Cari alamat pelapor — service role, hasilnya tidak keluar dari sini.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: laporan, error: laporanErr } = await admin
    .from("reports")
    .select("reporter_id")
    .eq("id", reportId)
    .maybeSingle<{ reporter_id: string }>();
  if (laporanErr) return galat("Gagal mencari laporan.", 502, laporanErr);
  if (!laporan) return galat("Laporan tidak ditemukan.", 404);

  const { data: pelapor, error: pelaporErr } = await admin
    .from("users")
    .select("email")
    .eq("id", laporan.reporter_id)
    .maybeSingle<{ email: string | null }>();
  if (pelaporErr) return galat("Gagal mencari penerima.", 502, pelaporErr);
  const email = pelapor?.email?.trim();
  if (!email) return dilewati("tanpa-email");

  // 4. Kirim. Tautan menuju halaman laporan milik pelapor (RLS yang menjaga).
  const dasar = urlAplikasi();
  const tautan = dasar ? `${dasar}/laporan/${reportId}` : null;
  try {
    await kirimEmailPembaruanStatus(email, tautan);
  } catch (e) {
    // Hanya kode status yang dicatat — body Brevo bisa memuat alamat penerima.
    const detail = e instanceof GalatBrevo ? `HTTP ${e.status}` : e instanceof Error ? e.name : e;
    return galat("Email notifikasi gagal dikirim.", 502, detail);
  }
  return Response.json({ dikirim: true });
}
