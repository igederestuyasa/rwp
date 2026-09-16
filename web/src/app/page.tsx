"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";

/**
 * Halaman akar `/`:
 *  - Pengunjung (belum login) → tampilkan landing page publik (default web).
 *  - Sudah login → arahkan ke beranda/dashboard sesuai role.
 * Login page memang push ke `/`, jadi redirect role tetap berjalan di sini.
 */
export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(user.role === "admin" ? "/dashboard" : "/beranda");
  }, [ready, user, router]);

  // Selagi auth dicek, atau saat user terdeteksi (sedang dialihkan), tahan render landing.
  if (!ready || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-latar text-bantu text-redup">
        Memuat…
      </div>
    );
  }

  return <LandingPage />;
}
