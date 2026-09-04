"use client";

// Panel Layanan Psikologi (EAP) — 6 kanal kontak langsung, tanpa tiket.
// Diekstrak dari /layanan (katalog HC) agar bisa berdiri sebagai halaman sendiri
// di /psikologi. Prop `onBack` opsional: dipakai saat panel dirender di dalam
// alur lain yang punya halaman induk untuk dituju.

import { ChevronLeft, HeartHandshake, ExternalLink, ShieldCheck } from "lucide-react";
import { PSIKOLOGI_CHANNELS } from "@/lib/constants";

export function PsikologiPanel({ onBack }: { onBack?: () => void }) {
  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>
      )}

      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        {/* Circles gradient */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full"
          style={{ background: "radial-gradient(circle, #14b8a6 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-16 left-4 h-56 w-56 rounded-full"
          style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        {/* Dot grid gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, #10b981, #14b8a6)",
            WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)",
            maskImage: "radial-gradient(circle, black 1px, transparent 1px)",
            WebkitMaskSize: "22px 22px",
            maskSize: "22px 22px",
            opacity: 0.2,
            animation: "hero-dots 8s linear infinite",
          }}
        />
        <div className="relative p-8">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #10b981, #14b8a6)" }}
            >
              <HeartHandshake className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1
                className="text-xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(to right, #10b981, #14b8a6)" }}
              >
                Layanan Psikologi Perusahaan
              </h1>
              <p className="text-sm text-ink-secondary">Employee Assistance Program (EAP)</p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Mengalami tekanan di tempat kerja, atau sedang memproses kejadian yang tidak
            menyenangkan? Kamu tidak harus menghadapinya sendirian. Enam kanal di bawah ini
            terhubung langsung ke tenaga profesional — tanpa perlu membuat laporan lebih dulu.
          </p>
        </div>
      </div>

      {/* Catatan privasi */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-teal-50/70 px-4 py-3.5 ring-1 ring-teal-200 dark:bg-teal-900/20 dark:ring-teal-800/60">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
        <p className="text-sm leading-relaxed text-teal-900 dark:text-teal-200">
          Kanal-kanal ini <span className="font-semibold">terpisah dari sistem pelaporan</span>.
          Isi sesi konseling tidak masuk ke aplikasi ini dan tidak terlihat oleh admin HC.
          Menghubungi mereka juga tidak otomatis membuat laporan.
        </p>
      </div>

      {/* 6 kanal */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PSIKOLOGI_CHANNELS.map((ch) => {
          const Icon = ch.icon;
          return (
            <div
              key={ch.id}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                  <Icon className="h-5 w-5" />
                </div>
                {ch.badge && (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:ring-teal-800">
                    {ch.badge}
                  </span>
                )}
              </div>

              <h3 className="mt-3.5 text-sm font-bold text-slate-900 dark:text-slate-100">{ch.label}</h3>
              <p className="mt-1 flex-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{ch.desc}</p>

              <a
                href={ch.href}
                target={ch.type === "tel" || ch.type === "email" ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {ch.cta}
                {(ch.type === "url" || ch.type === "whatsapp") && (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
