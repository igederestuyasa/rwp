import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "";

// Hentikan build kalau mode Supabase dipilih tapi URL-nya tidak ada.
// Tanpa penjagaan ini, build tetap lolos dan hasil deploy-nya rusak secara
// senyap: connect-src di CSP bawah tidak memuat host Supabase, sehingga
// SETIAP permintaan ke database diblokir browser tanpa pesan yang jelas.
// NEXT_PUBLIC_* dibaca saat build, jadi variabelnya harus sudah ada di
// environment build (di Vercel: Project Settings > Environment Variables).
if (process.env.NEXT_PUBLIC_USE_MOCK !== "true" && !supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL kosong padahal NEXT_PUBLIC_USE_MOCK bukan \"true\". " +
      "Isi variabelnya di environment build, atau set NEXT_PUBLIC_USE_MOCK=true " +
      "kalau memang ingin build mode mock.",
  );
}

// Development butuh 'unsafe-eval' untuk HMR (hot module replacement).
// Production tidak perlu.
const isDev = process.env.NODE_ENV === "development";

const cspHeader = [
  "default-src 'self'",
  // Next.js bundle + anti-flash inline script di layout.tsx
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind + Recharts pakai inline styles
  "style-src 'self' 'unsafe-inline'",
  // Supabase: REST API + Auth + Storage + Realtime websocket
  `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}`,
  // Logo & gambar lokal, avatar data URI, file dari Supabase Storage
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // 'self' (bukan 'none') supaya app boleh nge-frame konten sendiri,
  // mis. pratinjau PDF kebijakan di /api/policy-pdf (HC Policy). Situs
  // lain tetap tak bisa nge-frame app → proteksi clickjacking tetap jalan.
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Akses dev dari perangkat lain di jaringan lokal (mis. menguji di HP).
  // Isi lewat env, jangan ditulis langsung: alamat IP milik satu mesin tidak
  // ada gunanya bagi orang lain dan ikut terbawa ke repo.
  //   NEXT_PUBLIC_DEV_ORIGIN=192.168.0.174 npm run dev
  allowedDevOrigins: process.env.NEXT_PUBLIC_DEV_ORIGIN
    ? [process.env.NEXT_PUBLIC_DEV_ORIGIN]
    : [],
  experimental: {
    // Ikon diimpor dari akar paket di 30+ berkas; tanpa ini Turbopack
    // mem-parse ribuan modul barrel tiap kompilasi dev. Paket populer lain
    // (recharts, lucide) sudah ada di daftar bawaan Next, phosphor belum.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          // Cegah clickjacking (fallback untuk browser lama yang belum paham CSP frame-ancestors).
          // SAMEORIGIN, bukan DENY: app perlu nge-frame konten sendiri (pratinjau PDF HC Policy).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Cegah browser menebak-nebak MIME type (sniffing attack)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Jangan kirim full URL di Referer header ke domain lain
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
