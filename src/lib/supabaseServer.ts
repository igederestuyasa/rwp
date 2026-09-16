// ============================================================
// Supabase client SISI SERVER (per-request).
// ------------------------------------------------------------
// Dibuat dengan ACCESS TOKEN user (dari header Authorization),
// jadi RLS tetap berlaku sebagai user tsb — BUKAN service_role.
// Dipakai di Route Handler untuk: verifikasi user + query rag_chunks
// (retrieval asisten RWP). Tidak menyentuh data laporan (§9.3).
//
// ⚠️ Server-only. `import "server-only"` membuat build GAGAL bila berkas ini
// tersasar ke komponen client.
// ============================================================
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Client Supabase yang bertindak sebagai user (token dari client). */
export function supabaseWithToken(accessToken: string): SupabaseClient {
  if (!URL || !ANON_KEY) {
    throw new Error("Supabase env (URL/anon key) belum diisi di .env.local.");
  }
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
