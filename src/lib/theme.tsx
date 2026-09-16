"use client";

// ThemeProvider — kelola tema terang/gelap, simpan di localStorage.
// Saat wiring backend nanti, preferensi ini bisa disimpan di tabel user_preferences.
import {
  createContext, useContext, useEffect, useSyncExternalStore, type ReactNode,
} from "react";

export type Theme = "light" | "dark";
const THEME_KEY = "rwp_theme";
const THEME_EVENT = "rwp-theme-change"; // notifikasi perubahan di tab yang sama

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.style.colorScheme = t;
}

// ── Tema sebagai external store (localStorage) ──
// useSyncExternalStore = pola resmi React untuk subscribe ke store di luar React.
// getServerSnapshot menjaga SSR konsisten ("light") tanpa hydration mismatch;
// React otomatis re-render ke nilai client setelah hydrate.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);   // perubahan dari tab lain
  window.addEventListener(THEME_EVENT, onChange);  // perubahan dari tab ini
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}
function getSnapshot(): Theme {
  // Pilihan tersimpan menang; kalau belum pernah dipilih, ikut preferensi sistem.
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}
function getServerSnapshot(): Theme {
  return "light"; // cocok dengan default anti-flash di layout.tsx
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Terapkan kelas .dark ke <html> tiap tema berubah. (Flash awal sudah dicegah
  // script inline di layout.tsx; efek ini menjaga sinkron setelahnya.)
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(t: Theme) {
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
    window.dispatchEvent(new Event(THEME_EVENT)); // picu re-baca snapshot
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme harus dipakai di dalam ThemeProvider");
  return ctx;
}
