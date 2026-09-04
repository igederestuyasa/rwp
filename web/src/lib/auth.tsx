"use client";

// Auth — flag-gated.
//  - USE_MOCK=true  → mock localStorage (DemoUserKey), perilaku lama.
//  - USE_MOCK=false → Supabase Auth (email/password) + fetch profil dari
//    tabel public.users untuk role, sub_role, can_escalate.
//
// Kontrak yang dijaga (dipakai 30+ komponen): { user, ready, loginAs, login, logout }.
import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import { DEMO_USERS, type DemoUserKey } from "./mock";
import { getSupabase, USE_MOCK } from "./supabaseClient";
import { userFromRow, type UserRow } from "./mappers";
import { withTimeout } from "./utils";
import type { User } from "./types";

interface AuthValue {
  user: User | null;
  ready: boolean;
  /** Mock saja — login instan sebagai demo user. */
  loginAs: (key: DemoUserKey) => void;
  /** Supabase — login email/password. Kembalikan { error } bila gagal. */
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const STORAGE_KEY = "rwp_demo_role";

/** Pesan error auth Supabase → Bahasa Indonesia. */
function translateAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email atau kata sandi salah.";
  if (/email not confirmed/i.test(msg)) return "Email belum dikonfirmasi.";
  if (/refresh token/i.test(msg)) return "Sesi kamu sudah habis. Silakan login ulang.";
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // ─────────────────────────────────────────────
  // MODE MOCK — pulihkan sesi dari localStorage
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!USE_MOCK) return;
    const key = localStorage.getItem(STORAGE_KEY) as DemoUserKey | null;
    // Backward-compat: nilai lama "admin" → admin_superior
    const resolved: DemoUserKey | null =
      key === ("admin" as string) ? "admin_superior" : key;
    // Restore sesi mock SEKALI saat mount. Sengaja via efek (bukan lazy
    // initializer): server tak punya localStorage, sehingga lazy-init akan
    // memberi nilai berbeda di server vs client → hydration mismatch. Memulai
    // null lalu set di efek = pola SSR yang benar di sini. useSyncExternalStore
    // tak dipakai karena `user` mutable (loginAs/logout).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (resolved && resolved in DEMO_USERS) {
      setUser(DEMO_USERS[resolved]);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ─────────────────────────────────────────────
  // MODE SUPABASE — cek sesi + subscribe perubahan auth
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (USE_MOCK) return;
    const supabase = getSupabase();
    let active = true;

    // Safety timeout: kalau Supabase tidak balas dalam 8 detik (mis. Brave
    // Shields blokir, koneksi ngadat, cold start lama), paksa ready=true
    // supaya app tidak stuck di "Memuat…" selamanya. User diarahkan ke
    // /login (karena user masih null) dan bisa coba ulang.
    const failsafe = setTimeout(() => {
      if (active) {
        console.warn("Auth init timeout — koneksi ke Supabase lambat/terblokir.");
        setReady(true);
      }
    }, 8000);

    // Ambil profil dari public.users (role, sub_role, dll).
    async function loadProfile(id: string): Promise<User | null> {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        if (error) console.error("Gagal memuat profil:", error.message);
        if (active) setUser(null);
        return null;
      }
      const u = userFromRow(data as UserRow);
      if (active) setUser(u);
      return u;
    }

    // Cek sesi awal (sekali saat mount).
    // PENTING: getSession() bisa MENGGANTUNG kalau token di localStorage basi
    // dan refresh-nya ke jaringan tak berbalas (Brave Shields, koneksi ngadat,
    // cold start). Maka di-race dengan timeout 5 detik. Kalau timeout/error,
    // buang token LOKAL via signOut({ scope: "local" }) — instan, tanpa request
    // jaringan (jadi tak ikut hang), supaya refresh berikutnya bersih dan user
    // TIDAK perlu hapus localStorage manual.
    (async () => {
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession(), 5000);
        if (error) throw error;
        if (active && data.session) await loadProfile(data.session.user.id);
      } catch (e) {
        console.warn("Auth init gagal/timeout — membersihkan sesi lokal:", e);
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // abaikan — yang penting token lokal dibuang sebisanya
        }
        if (active) setUser(null);
      } finally {
        clearTimeout(failsafe); // init selesai duluan → batalkan failsafe
        if (active) setReady(true);
      }
    })();

    // Dengarkan login/logout berikutnya.
    // INITIAL_SESSION diabaikan: sesi awal sudah ditangani IIFE getSession().
    // PENTING: JANGAN await panggilan supabase langsung di dalam callback ini.
    // Callback dipanggil saat auth-lock masih dipegang (mis. oleh
    // signInWithPassword); query DB butuh lock yang sama → DEADLOCK (login
    // "memproses terus"). Tunda ke task berikutnya via setTimeout(0) agar
    // lock dilepas dulu. (Gotcha resmi supabase-js.)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === "INITIAL_SESSION") return;
      setTimeout(() => {
        if (!active) return;
        if (session) loadProfile(session.user.id);
        else setUser(null);
      }, 0);
    });

    return () => {
      active = false;
      clearTimeout(failsafe);
      sub.subscription.unsubscribe();
    };
  }, []);

  // ── Aksi ──
  function loginAs(key: DemoUserKey) {
    if (!USE_MOCK) return; // diabaikan di mode Supabase
    localStorage.setItem(STORAGE_KEY, key);
    setUser(DEMO_USERS[key]);
  }

  async function login(email: string, password: string): Promise<{ error?: string }> {
    if (USE_MOCK) {
      // Mode demo: kredensial diabaikan, masuk sebagai karyawan.
      loginAs("karyawan");
      return {};
    }
    const supabase = getSupabase();
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
      );
      if (error) return { error: translateAuthError(error.message) };

      // Pastikan profil ada di public.users.
      const { data: profile, error: pErr } = await withTimeout(
        supabase.from("users").select("*").eq("id", data.user.id).single(),
        15000,
      );
      if (pErr || !profile) {
        await supabase.auth.signOut({ scope: "local" });
        return { error: "Akun terdaftar, tapi profil belum disiapkan. Hubungi admin HC." };
      }
      setUser(userFromRow(profile as UserRow));
      return {};
    } catch (e) {
      // timeout / jaringan menggantung — jangan biarkan tombol "Memproses…" selamanya
      const msg = e instanceof Error && e.message === "timeout"
        ? "Koneksi ke server lambat / terblokir. Cek internet atau pemblokir (Brave/Edge/extension), lalu coba lagi."
        : "Gagal masuk. Coba lagi.";
      return { error: msg };
    }
  }

  function logout() {
    // Bersihkan data sesi user yang tersimpan di localStorage
    localStorage.removeItem("rwp_chat_history");
    if (USE_MOCK) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return;
    }
    // signOut tidak di-await (UX: logout langsung terasa), tapi di-void
    // agar tidak jadi dangling promise yang bisa memicu unhandled rejection.
    void getSupabase().auth.signOut({ scope: "local" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, loginAs, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
