"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, Clock, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { ORG_NAME } from "@/lib/constants";
import { useIdleTimeout } from "@/lib/useIdleTimeout";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MobileDrawer } from "@/components/MobileDrawer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const { error: galatStore, refresh } = useStore();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const { showWarning, countdown, resetIdle } = useIdleTimeout(logout);

  // Guard: arahkan ke login bila belum masuk (cek di level logika, §9.2).
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-bantu text-redup">
        Memuat…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-latar">
      {/* Lompat langsung ke konten — tersembunyi sampai difokus lewat keyboard. */}
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-[10000] focus:flex focus:min-h-11 focus:items-center focus:rounded-full focus:border focus:border-garis-kuat focus:bg-kartu focus:px-5 focus:text-bantu focus:font-semibold focus:text-tinta"
      >
        Lewati ke konten
      </a>

      <Sidebar />
      <MobileDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} />

        <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
          {/* Tepi halaman 20 di HP, 40 mulai 1024. Lebar maksimum 1240 termasuk tepi. */}
          <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-6 lg:px-10 lg:pt-8">
            {/* Pemuatan data gagal: satu spanduk untuk semua halaman, supaya
                daftar kosong tidak disalahartikan sebagai "belum ada laporan". */}
            {galatStore && (
              <div
                role="alert"
                className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-kartu)] border border-garis bg-merah-latar px-4 py-3 text-bantu leading-[1.5] text-tinta"
              >
                <span className="flex items-start gap-2">
                  <WarningCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-merah" />
                  {galatStore}
                </span>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-garis-kuat bg-kartu px-4 text-bantu font-semibold text-tinta transition-colors duration-150 hover:bg-latar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
                >
                  <ArrowsClockwise size={16} aria-hidden="true" />
                  Coba lagi
                </button>
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Kaki halaman */}
        <footer className="mx-auto w-full max-w-[1240px] px-5 lg:px-10">
          <div className="flex flex-col gap-1 border-t border-garis pb-12 pt-6 text-bantu text-redup sm:flex-row sm:items-center sm:justify-between">
            <span>{ORG_NAME}</span>
            <span>
              Kontak HC:{" "}
              <a
                href="mailto:hc@hutamakarya.co.id"
                className="text-tinta underline-offset-4 hover:underline"
              >
                hc@hutamakarya.co.id
              </a>
            </span>
          </div>
        </footer>
      </div>

      {/* Modal peringatan idle — muncul 1 menit sebelum auto-logout */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-latar/80 px-5">
          <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-garis bg-kartu p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-latar text-peringatan">
              <Clock size={24} />
            </div>
            <h2 className="mb-1 text-subjudul font-bold text-tinta">
              Sesi hampir berakhir
            </h2>
            <p className="mb-5 text-bantu text-redup">
              Kamu tidak aktif selama beberapa saat. Akan otomatis keluar dalam{" "}
              <span className="font-semibold text-peringatan">{countdown} detik</span>.
            </p>
            <button
              onClick={resetIdle}
              className="flex h-12 w-full items-center justify-center rounded-full bg-tinta text-bantu font-semibold text-kartu transition-colors duration-150 hover:bg-tinta-hover active:scale-[.99]"
            >
              Tetap masuk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
