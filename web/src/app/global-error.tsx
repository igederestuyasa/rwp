"use client";

// Fallback terakhir: aktif hanya bila root layout sendiri yang gagal. Berkas ini
// MENGGANTIKAN layout.tsx, jadi wajib merender <html> dan <body> sendiri,
// mengimpor globals.css (token warna), dan memuat font yang sama. Providers
// (auth/store/tema) tidak tersedia di sini — jangan pakai hook konteks.
// `metadata` tidak didukung di Client Component, maka <title> ditulis langsung.

import { useEffect } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";
import { GalatHalaman } from "@/components/GalatHalaman";

// Sama persis dengan layout.tsx supaya <html> tidak berganti kelas saat
// batas ini menggantikan root layout di sisi klien.
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const KUNCI_TEMA = "rwp_theme";

// Salinan script anti-flash layout.tsx: tema dibaca dari localStorage SEBELUM
// render saat berkas ini dirender di server. Tidak bisa diimpor dari layout.tsx
// karena berkas itu Server Component yang mengekspor metadata.
const SKRIP_TEMA = `(function(){try{var t=localStorage.getItem('${KUNCI_TEMA}');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){}})();`;

export default function GalatGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Bila batas ini aktif di sisi klien, <script> yang dirender React tidak
  // dieksekusi, jadi tema diterapkan ulang lewat efek dengan logika yang sama.
  useEffect(() => {
    try {
      let t = localStorage.getItem(KUNCI_TEMA);
      if (t !== "dark" && t !== "light") {
        t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t;
    } catch {
      // localStorage bisa diblokir; biarkan tema bawaan (terang).
    }
  }, []);

  return (
    <html lang="id" className={`${plusJakarta.variable} h-full`} suppressHydrationWarning>
      <head>
        <title>{`Terjadi gangguan · ${APP_NAME}`}</title>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body className="min-h-full bg-latar font-sans text-tinta antialiased">
        <div className="flex min-h-dvh items-center justify-center px-5 py-12">
          <GalatHalaman error={error} reset={reset} />
        </div>
      </body>
    </html>
  );
}
