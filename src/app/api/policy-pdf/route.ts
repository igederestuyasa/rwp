// ============================================================
// GET /api/policy-pdf?path=<storage-path>
// ------------------------------------------------------------
// Proxy PDF dokumen kebijakan dari bucket PRIVAT Supabase Storage.
// Flow:
//   1. Terima path file (bukan URL publik)
//   2. Buat signed URL via service role (expire 60 detik) — server-side saja
//   3. Fetch file pakai signed URL
//   4. Kirim ke browser sebagai inline — URL asli tidak pernah bocor ke client
//
// KEAMANAN:
//   - Signed URL hanya hidup 60 detik dan tidak dikirim ke browser
//   - Bucket privat: tanpa signed URL tidak bisa diakses sama sekali
//   - Path divalidasi: hanya boleh karakter aman (no traversal)
// ============================================================
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseWithToken } from "@/lib/supabaseServer";

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET               = process.env.POLICY_PDF_BUCKET ?? "policy-docs";
const SIGNED_URL_EXPIRY_S  = 60; // detik — cukup untuk satu fetch server-side
const USE_MOCK             = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Validasi path: huruf, angka, spasi, -, _, ., / (cegah path traversal)
const SAFE_PATH = /^[\w\- ./]+$/;

export async function GET(req: NextRequest) {
  // ── Auth check: wajib login, kecuali mode mock ──────────────────────────────
  if (!USE_MOCK) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return Response.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }
    const { data, error } = await supabaseWithToken(token).auth.getUser();
    if (error || !data.user) {
      return Response.json({ error: "Sesi tidak valid. Silakan login ulang." }, { status: 401 });
    }
  }

  const path = req.nextUrl.searchParams.get("path");

  if (!path || !SAFE_PATH.test(path) || path.includes("..")) {
    return Response.json({ error: "Path tidak valid." }, { status: 400 });
  }

  if (!SERVICE_ROLE_KEY) {
    return Response.json({ error: "Konfigurasi server tidak lengkap." }, { status: 500 });
  }

  // Buat signed URL pakai service role — tidak pernah dikirim ke browser
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_S);

  if (signErr || !signed?.signedUrl) {
    return Response.json(
      { error: "Gagal membuat akses dokumen." },
      { status: 502 },
    );
  }

  // Fetch file dari signed URL (sisi server)
  let upstream: Response;
  try {
    upstream = await fetch(signed.signedUrl);
  } catch {
    return Response.json({ error: "Gagal menghubungi penyimpanan dokumen." }, { status: 502 });
  }

  if (!upstream.ok) {
    return Response.json(
      { error: `Gagal mengambil dokumen (HTTP ${upstream.status}).` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/pdf";
  const buf = await upstream.arrayBuffer();

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Content-Length": String(buf.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
