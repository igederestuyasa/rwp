"use client";

// Halaman masuk — di luar grup (app), jadi tanpa Sidebar/Topbar.
// Sistem UI "HC Panel" (docs/DESIGN.md): satu kolom terpusat, permukaan datar,
// warna hanya dari token, tanpa bayangan (jatah bayangan milik kolom cari).
//
// Tiga tampilan bergantian di kolom yang sama: masuk → lupa sandi → email terkirim.
// Seluruh pemanggilan auth (login Supabase, loginAs mock, resetPasswordForEmail)
// dipertahankan persis seperti sebelumnya.

import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle, Envelope, Eye, EyeSlash, Lock, WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import type { DemoUserKey } from "@/lib/mock";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/hc/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

type View = "login" | "forgot" | "sent";

// Tiga akun demo mode mock (lihat DemoUserKey di lib/mock.ts).
const AKUN_DEMO: { kunci: DemoUserKey; label: string }[] = [
  { kunci: "karyawan", label: "Karyawan" },
  { kunci: "admin_rwp", label: "Admin RWP" },
  { kunci: "admin_superior", label: "Admin superior" },
];

/** Pesan galat form: 14px merah dengan ikon warning-circle (§Komponen). */
function PesanGalat({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-bantu text-merah">
      <WarningCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export default function LoginPage() {
  const { loginAs, login, user, ready } = useAuth();
  const router = useRouter();

  // Jika user sudah login (mis. tekan back dari dashboard), langsung forward.
  useEffect(() => {
    if (ready && user) {
      router.replace(user.role === "admin" ? "/dashboard" : "/beranda");
    }
  }, [ready, user, router]);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [remember, setRemember] = useState(false);

  const [view, setView]                   = useState<View>("login");
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotErr, setForgotErr]         = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  function enter(key: DemoUserKey) {
    loginAs(key);
    router.push(key === "karyawan" ? "/beranda" : "/dashboard");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    router.replace("/");
  }

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotErr("Masukkan alamat email kamu."); return; }
    setForgotErr(""); setForgotLoading(true);
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 1200));
      setForgotLoading(false); setView("sent"); return;
    }
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo: `${window.location.origin}/update-password` },
    );
    setForgotLoading(false);
    if (err) { setForgotErr("Gagal mengirim email. Pastikan alamat email benar dan coba lagi."); return; }
    setView("sent");
  }

  function goToForgot() { setForgotEmail(email); setForgotErr(""); setView("forgot"); }
  function goToLogin()   { setError(""); setView("login"); }

  return (
    <div className="min-h-screen bg-latar px-5 py-12 lg:px-10">
      <div className="mx-auto flex w-full max-w-[420px] flex-col">

        {/* ── Pembuka: merek (tetap terpasang di semua tampilan) ── */}
        <div
          className="pembuka-masuk flex items-center gap-2.5"
          style={{ animationDelay: "0ms" }}
        >
          <Logo size={28} />
          <span className="text-isi font-bold tracking-[-0.01em] text-tinta">{APP_NAME}</span>
        </div>

        {/* ── Tampilan: masuk ── */}
        {view === "login" && (
          <div className="animate-in">
            {/* Sapaan hangat: halaman masuk adalah pintu pertama kanal
                pelaporan, jadi sengaja tidak terasa klinis (§Token warna). */}
            <p
              className="pembuka-masuk mt-8 text-isi font-medium text-hangat"
              style={{ animationDelay: "40ms" }}
            >
              Selamat datang
            </p>
            <h1
              className="pembuka-masuk mt-2 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
              style={{ animationDelay: "60ms" }}
            >
              Masuk ke akun
            </h1>
            <p
              className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
              style={{ animationDelay: "110ms" }}
            >
              Gunakan akun karyawan PT Hutama Karya kamu.
            </p>

            <form
              onSubmit={onSubmit}
              className="pembuka-masuk mt-8 flex flex-col gap-4"
              style={{ animationDelay: "170ms" }}
            >
              <Field label="Email korporat">
                <div className="relative">
                  <Envelope
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-redup"
                  />
                  <Input
                    type="email"
                    placeholder="nama@hutamakarya.co.id"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Kata sandi">
                <div className="relative">
                  <Lock
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-redup"
                  />
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Kata sandi akun kamu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    aria-pressed={showPw}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] text-redup transition-colors duration-150 hover:text-tinta"
                  >
                    {showPw ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </Field>

              {/* Ingat saya + lupa kata sandi */}
              <div className="flex items-center justify-between gap-4">
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-bantu text-redup">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-tinta"
                  />
                  Ingat saya
                </label>
                <button
                  type="button"
                  onClick={goToForgot}
                  className="min-h-11 text-bantu font-semibold text-tinta transition-colors duration-150 hover:text-merah"
                >
                  Lupa kata sandi?
                </button>
              </div>

              {error && <PesanGalat>{error}</PesanGalat>}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Memproses…" : "Masuk"}
              </Button>
            </form>

            {/* Tombol akun demo — hanya di mode mock */}
            {USE_MOCK && (
              <div className="mt-8">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-garis" />
                  <span className="text-mikro font-semibold text-redup">Mode demo</span>
                  <span className="h-px flex-1 bg-garis" />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {AKUN_DEMO.map(({ kunci, label }) => (
                    <Button
                      key={kunci}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-11 px-3"
                      onClick={() => enter(kunci)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="mt-3 text-bantu text-redup">
                  Pratinjau antarmuka tanpa server.
                </p>
              </div>
            )}

            <p className="mt-8 text-bantu text-redup">
              Butuh bantuan?{" "}
              <a
                href="mailto:hc@hutamakarya.co.id"
                className="font-semibold text-tinta transition-colors duration-150 hover:text-merah"
              >
                Hubungi tim HC
              </a>
            </p>
          </div>
        )}

        {/* ── Tampilan: lupa kata sandi ── */}
        {view === "forgot" && (
          <div className="animate-in">
            <button
              type="button"
              onClick={goToLogin}
              className="mt-8 inline-flex min-h-11 items-center gap-2 text-bantu font-semibold text-redup transition-colors duration-150 hover:text-tinta"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali ke masuk
            </button>

            <h1 className="mt-4 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta">
              Lupa kata sandi
            </h1>
            <p className="mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup">
              Kami kirim tautan pengaturan ulang ke kotak masuk kamu.
            </p>

            <form onSubmit={onForgot} className="mt-8 flex flex-col gap-4">
              <Field label="Email akun kamu">
                <div className="relative">
                  <Envelope
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-redup"
                  />
                  <Input
                    type="email"
                    placeholder="nama@hutamakarya.co.id"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    className="pl-10"
                  />
                </div>
              </Field>

              {forgotErr && <PesanGalat>{forgotErr}</PesanGalat>}

              <Button type="submit" size="lg" className="w-full" disabled={forgotLoading}>
                {forgotLoading ? "Mengirim…" : "Kirim tautan pengaturan ulang"}
              </Button>
            </form>
          </div>
        )}

        {/* ── Tampilan: email terkirim ── */}
        {view === "sent" && (
          <div className="animate-in">
            <span className="mt-8 flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-kartu text-sukses">
              <CheckCircle size={22} aria-hidden="true" />
            </span>

            <h1 className="mt-6 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta">
              Email terkirim
            </h1>
            <p className="mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup">
              Tautan pengaturan ulang dikirim ke{" "}
              <span className="text-tinta">{forgotEmail || "email kamu"}</span>. Periksa kotak masuk dan folder spam.
            </p>

            <div className="mt-6 border-t border-garis pt-6">
              <p className="text-bantu text-redup">
                Tautan berlaku <span className="font-semibold text-tinta">1 jam</span>. Tidak menerima email?
                Pastikan alamatnya sesuai akun karyawan kamu.
              </p>
            </div>

            <button
              type="button"
              onClick={goToLogin}
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-bantu font-semibold text-tinta transition-colors duration-150 hover:text-merah"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali ke halaman masuk
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
