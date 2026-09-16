import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_MS  = 5 * 60 * 1000; // 5 menit tidak aktif → logout
const WARN_MS  = 60 * 1000;     // peringatan muncul 1 menit sebelum logout

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown",
  "touchstart", "scroll", "click",
] as const;

export function useIdleTimeout(onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(60);

  const logoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warnRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tickRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // Simpan referensi terbaru agar closure di timer tidak stale.
  // Ditulis di effect, bukan saat render: menulis ref selama render bikin
  // hasilnya tidak konsisten kalau React mengulang render.
  const onLogoutRef = useRef(onLogout);
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  // Hanya memasang ulang timer — sengaja TIDAK menyentuh state, supaya aman
  // dipanggil langsung dari effect saat mount (state sudah di nilai awalnya).
  const schedule = useCallback(() => {
    clearTimeout(logoutRef.current);
    clearTimeout(warnRef.current);
    clearInterval(tickRef.current);

    // Jadwalkan peringatan
    warnRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
      tickRef.current = setInterval(() => {
        setCountdown((c: number) => c - 1);
      }, 1000);
    }, IDLE_MS - WARN_MS);

    // Jadwalkan logout otomatis
    logoutRef.current = setTimeout(() => {
      clearInterval(tickRef.current);
      setShowWarning(false);
      onLogoutRef.current();
    }, IDLE_MS);
  }, []);

  // Dipakai handler aktivitas: buang peringatan yang sedang tampil,
  // lalu jadwalkan ulang dari nol.
  const reset = useCallback(() => {
    setShowWarning(false);
    setCountdown(60);
    schedule();
  }, [schedule]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(e =>
      window.addEventListener(e, reset, { passive: true }),
    );
    schedule(); // mulai timer saat komponen mount

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(logoutRef.current);
      clearTimeout(warnRef.current);
      clearInterval(tickRef.current);
    };
  }, [reset, schedule]);

  return { showWarning, countdown, resetIdle: reset };
}
