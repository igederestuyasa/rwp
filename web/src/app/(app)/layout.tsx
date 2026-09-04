"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useIdleTimeout } from "@/lib/useIdleTimeout";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MobileDrawer } from "@/components/MobileDrawer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const { showWarning, countdown, resetIdle } = useIdleTimeout(logout);

  // Guard: arahkan ke login bila belum masuk (cek di level logika, §9.2).
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Memuat…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <MobileDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 px-5 py-7 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-5xl animate-in">{children}</div>
        </main>
      </div>
      {/* Modal peringatan idle — muncul 1 menit sebelum auto-logout */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path
                  strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
              Sesi hampir berakhir
            </h2>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              Kamu tidak aktif selama beberapa saat. Akan otomatis keluar dalam{" "}
              <span className="font-semibold text-amber-600">{countdown} detik</span>.
            </p>
            <button
              onClick={resetIdle}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Tetap Masuk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
