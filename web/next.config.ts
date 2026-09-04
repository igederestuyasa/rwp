import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "";

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
  // DEV ONLY: izinkan akses dari HP di jaringan lokal. Hapus setelah testing.
  allowedDevOrigins: ["192.168.0.174"],
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
