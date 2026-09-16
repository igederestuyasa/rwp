// ============================================================
// Pendukung SISI SERVER untuk route /api/korpus/* (kelola pengetahuan AI).
// ------------------------------------------------------------
// Semua route korpus bertindak sebagai ADMIN YANG SEDANG LOGIN lewat
// supabaseWithToken — bukan service_role. RLS di migrasi korpus_admin
// menolak penulisan oleh non-admin di level database. Pemeriksaan peran di
// sini adalah lapis LOGIKA (§9.2) supaya pemanggil tanpa hak mendapat 403
// yang jelas, bukan galat RLS yang membingungkan.
//
// ⚠️ Server-only. Jangan diimpor dari komponen client.
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseWithToken } from "@/lib/supabaseServer";

/** Bucket privat tempat berkas korpus disimpan — sama dengan /api/policy-pdf. */
export const KORPUS_BUCKET = process.env.POLICY_PDF_BUCKET ?? "policy-docs";

/** Awalan path di dalam bucket, memisahkan berkas korpus dari PDF kebijakan. */
export const KORPUS_PREFIX = "korpus";

export type AdminKonteks = { supabase: SupabaseClient; userId: string };

/** Balasan JSON bergaya seragam untuk seluruh route korpus. */
export function jsonError(pesan: string, status: number): Response {
  return Response.json({ error: pesan }, { status });
}

/**
 * Verifikasi token pengguna dan pastikan perannya admin.
 * Mengembalikan konteks bila lolos, atau Response 401/403 bila tidak.
 */
export async function otorisasiAdmin(req: Request): Promise<AdminKonteks | Response> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return jsonError("Tidak terautentikasi.", 401);

  const supabase = supabaseWithToken(token);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  // Peran dibaca dari tabel users lewat RLS (pengguna boleh membaca barisnya
  // sendiri). Ini pelengkap RLS tulis, bukan penggantinya.
  const { data: profil, error: profilErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profilErr || profil?.role !== "admin") {
    return jsonError("Hanya admin yang boleh mengelola korpus.", 403);
  }

  return { supabase, userId: userData.user.id };
}

/** Bentuk baris corpus_documents sebagaimana dikirim ke klien. */
export type DokumenKorpus = {
  id: string;
  nama: string;
  jenis: "md" | "txt" | "pdf" | "kebijakan";
  source_doc: string;
  storage_path: string | null;
  policy_id: string | null;
  status: "menunggu" | "diproses" | "selesai" | "gagal";
  jumlah_chunk: number;
  embed_model: string | null;
  pesan_error: string | null;
  created_at: string;
  updated_at: string;
};
