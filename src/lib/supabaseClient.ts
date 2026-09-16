// ============================================================
// Supabase client singleton (browser-side).
// ------------------------------------------------------------
// App ini mayoritas client-side (context providers + "use client"),
// jadi koneksi pakai anon key — keamanan ditegakkan oleh RLS di DB.
// JANGAN pernah pakai service_role key di sini (itu bypass RLS,
// hanya untuk script server-side).
//
// Aman saat env belum diisi: getSupabase() melempar error yang jelas,
// tapi import modul ini tidak meng-crash app. Selama USE_MOCK=true,
// kode tidak akan memanggil getSupabase() sama sekali.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Flag global: true = pakai data mock, false = pakai Supabase.
// Mock HANYA bila eksplisit "true" — sama dengan next.config.ts dan route
// server. Dulu default-nya mock bila variabel kosong, sehingga deploy yang
// lupa menyetel variabel ini diam-diam menampilkan tombol login demo dan
// data palsu sementara route server sudah memakai Supabase sungguhan.
// Untuk dev tanpa backend: salin .env.local.example (isinya sudah true).
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

let client: SupabaseClient | null = null;

/** Ambil singleton Supabase client. Lempar error jelas bila env belum diisi. */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  if (!URL || !ANON_KEY) {
    throw new Error(
      "Supabase env belum diisi. Set NEXT_PUBLIC_SUPABASE_URL & " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local, atau biarkan " +
        "NEXT_PUBLIC_USE_MOCK=true untuk mode mock.",
    );
  }

  client = createClient(URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
