"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Layers, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

// Halaman ini adalah landing dari link reset password di email.
// Supabase otomatis mendeteksi token di URL hash dan set sesi "recovery".
// Flow: /login → "Lupa kata sandi?" → email → klik link → halaman ini → update password.

type PageState = "loading" | "form" | "success" | "invalid";

/** Indikator kekuatan password: lemah / sedang / kuat */
function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const len = password.length;
  const strength = len < 8 ? 0 : len < 10 ? 1 : len < 12 ? 2 : 3;
  const labels = ["Terlalu pendek", "Cukup", "Kuat", "Sangat kuat"];
  const colors = ["bg-rose-400", "bg-amber-400", "bg-blue-400", "bg-emerald-400"];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < strength ? colors[strength - 1] : "bg-slate-200 dark:bg-slate-700",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{labels[strength]}</p>
    </div>
  );
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  // USE_MOCK konstan di server & client (env build-time) → tak ada hydration
  // mismatch. Mode mock langsung tampilkan form lewat initializer.
  const [pageState, setPageState] = useState<PageState>(USE_MOCK ? "form" : "loading");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (USE_MOCK) return; // form sudah di-set lewat initializer

    const supabase = getSupabase();

    // Supabase v2 otomatis proses token di URL hash saat halaman load.
    // Event PASSWORD_RECOVERY menandakan token valid & sesi recovery aktif.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPageState("form");
      }
    });

    // Fallback: kalau sudah ada sesi aktif (mis. user langsung akses halaman ini)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPageState((s) => s === "loading" ? "form" : s);
    });

    // Safety timeout — token tidak valid / sudah expired
    const timeout = setTimeout(() => {
      setPageState((s) => s === "loading" ? "invalid" : s);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setError("");
    setLoading(true);

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1000));
      setLoading(false);
      setPageState("success");
      return;
    }

    const { error } = await getSupabase().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Gagal memperbarui kata sandi. Link mungkin sudah kedaluwarsa, coba minta link baru.");
      return;
    }
    // Sign out setelah ganti sandi agar user login ulang dengan sandi baru
    await getSupabase().auth.signOut({ scope: "local" });
    setPageState("success");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
            {APP_NAME}
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white px-8 py-9 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:shadow-slate-900/40 dark:ring-slate-700/60">

          {/* ── Loading ── */}
          {pageState === "loading" && (
            <div className="py-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Memverifikasi link reset…
              </p>
            </div>
          )}

          {/* ── Token tidak valid / expired ── */}
          {pageState === "invalid" && (
            <div className="text-center">
              <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/30">
                <AlertCircle className="h-7 w-7 text-rose-500 dark:text-rose-400" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-slate-100">
                Link tidak valid
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Link sudah kedaluwarsa atau sudah pernah digunakan. Silakan minta
                link reset baru dari halaman masuk.
              </p>
              <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-700/50">
                <button
                  onClick={() => router.push("/login")}
                  className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  ← Kembali ke halaman masuk
                </button>
              </div>
            </div>
          )}

          {/* ── Form ganti sandi ── */}
          {pageState === "form" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30">
                <KeyRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>

              <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Buat kata sandi baru
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Masukkan kata sandi baru yang kuat untuk akun kamu.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <Field label="Kata sandi baru">
                  <Input
                    type="password"
                    placeholder="Min. 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                  />
                </Field>

                {/* Indikator kekuatan */}
                <StrengthBar password={password} />

                <Field label="Konfirmasi kata sandi">
                  <Input
                    type="password"
                    placeholder="Ketik ulang kata sandi baru"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>

                {/* Pesan error */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700 ring-1 ring-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Menyimpan…" : "Simpan Kata Sandi Baru"}
                </Button>
              </form>
            </div>
          )}

          {/* ── Sukses ── */}
          {pageState === "success" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 text-center">
              <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30">
                <CheckCircle2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Kata sandi diperbarui!
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Kata sandi akun kamu berhasil diubah. Silakan masuk kembali dengan
                kata sandi baru kamu.
              </p>

              <Button
                size="lg"
                className="mt-7 w-full"
                onClick={() => router.push("/login")}
              >
                Masuk sekarang
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
