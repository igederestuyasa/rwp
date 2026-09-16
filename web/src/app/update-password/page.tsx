"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/hc/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

// Halaman ini adalah landing dari link reset password di email.
// Supabase otomatis mendeteksi token di URL hash dan set sesi "recovery".
// Flow: /login → "Lupa kata sandi?" → email → klik link → halaman ini → update password.
//
// Tampilan mengikuti sistem UI "HC Panel" (docs/DESIGN.md): satu kolom terpusat,
// warna hanya dari token, permukaan datar tanpa bayangan.

type PageState = "loading" | "form" | "success" | "invalid";

// Warna indikator kekuatan: satu-satunya tempat sukses/peringatan dipakai di
// halaman ini, dan itu sah karena menandai status data (§Batas gaya).
const NADA_KEKUATAN = ["bg-redup", "bg-peringatan", "bg-sukses"];
const LABEL_KEKUATAN = ["Terlalu pendek", "Cukup", "Kuat", "Sangat kuat"];

/** Indikator kekuatan password: lemah / sedang / kuat */
function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const len = password.length;
  const strength = len < 8 ? 0 : len < 10 ? 1 : len < 12 ? 2 : 3;
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-150",
              i < strength ? NADA_KEKUATAN[strength - 1] : "bg-garis",
            )}
          />
        ))}
      </div>
      <p className="text-mikro font-semibold text-redup">{LABEL_KEKUATAN[strength]}</p>
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
    <div className="min-h-screen bg-latar px-5 py-12 lg:px-10">
      <div className="mx-auto flex w-full max-w-[420px] flex-col">

        {/* ── Pembuka: merek ── */}
        <div
          className="pembuka-masuk flex items-center gap-2.5"
          style={{ animationDelay: "0ms" }}
        >
          <Logo size={28} />
          <span className="text-isi font-bold tracking-[-0.01em] text-tinta">{APP_NAME}</span>
        </div>

        {/* ── Memverifikasi tautan ── */}
        {pageState === "loading" && (
          <div className="animate-in mt-8 flex items-center gap-3">
            <CircleNotch size={20} aria-hidden="true" className="shrink-0 animate-spin text-redup" />
            <p className="text-isi text-redup">Memverifikasi tautan pengaturan ulang…</p>
          </div>
        )}

        {/* ── Token tidak valid / kedaluwarsa ── */}
        {pageState === "invalid" && (
          <div className="animate-in">
            <span className="mt-8 flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-kartu text-merah">
              <WarningCircle size={22} aria-hidden="true" />
            </span>

            <h1 className="mt-6 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta">
              Tautan tidak valid
            </h1>
            <p className="mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup">
              Tautan sudah kedaluwarsa atau pernah dipakai. Minta tautan baru dari halaman masuk.
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-bantu font-semibold text-tinta transition-colors duration-150 hover:text-merah"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali ke halaman masuk
            </button>
          </div>
        )}

        {/* ── Form ganti sandi ── */}
        {pageState === "form" && (
          <div className="animate-in">
            <h1
              className="pembuka-masuk mt-8 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
              style={{ animationDelay: "60ms" }}
            >
              Buat kata sandi baru
            </h1>
            <p
              className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
              style={{ animationDelay: "110ms" }}
            >
              Masukkan kata sandi baru yang kuat untuk akun kamu.
            </p>

            <form
              onSubmit={onSubmit}
              className="pembuka-masuk mt-8 flex flex-col gap-4"
              style={{ animationDelay: "170ms" }}
            >
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
                <p role="alert" className="flex items-start gap-1.5 text-bantu text-merah">
                  <WarningCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Menyimpan…" : "Simpan kata sandi baru"}
              </Button>
            </form>
          </div>
        )}

        {/* ── Sukses ── */}
        {pageState === "success" && (
          <div className="animate-in">
            <span className="mt-8 flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-kartu text-sukses">
              <CheckCircle size={22} aria-hidden="true" />
            </span>

            <h1 className="mt-6 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta">
              Kata sandi diperbarui
            </h1>
            <p className="mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup">
              Kata sandi akunmu berhasil diubah. Masuk kembali dengan kata sandi baru.
            </p>

            <Button
              size="lg"
              className="mt-8 w-full"
              onClick={() => router.push("/login")}
            >
              Masuk sekarang
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
