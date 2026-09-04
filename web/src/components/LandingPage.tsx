"use client";

// Landing page publik — pengunjung yang belum login.
// Ditulis sebagai komponen React biasa (bukan HTML inline seperti versi
// HC One Service) supaya ikut token tema & dark mode aplikasi.

import Link from "next/link";
import {
  ShieldAlert, EyeOff, Lock, FileSearch, ArrowRight, HeartHandshake,
  MessageSquare, ListChecks, BookOpen,
} from "lucide-react";
import { APP_NAME, ORG_NAME, ASSISTANT_NAME } from "@/lib/constants";
import { DotGrid } from "@/components/ui/DotGrid";

const JAMINAN = [
  {
    icon: EyeOff,
    title: "Bisa melapor anonim",
    desc: "Kamu memilih sendiri apakah namamu ikut terkirim. Kalau anonim, identitasmu tidak ditampilkan kepada admin.",
  },
  {
    icon: Lock,
    title: "Identitas disimpan terpisah",
    desc: "Nama pelapor tidak menempel pada isi laporan. Admin membaca laporannya, bukan siapa yang menulisnya.",
  },
  {
    icon: FileSearch,
    title: "Pembukaan identitas tercatat",
    desc: "Bila penanganan menuntutnya, identitas hanya bisa dibuka admin berwenang — dan kamu melihat catatannya di riwayat laporanmu.",
  },
];

const LANGKAH = [
  { n: "01", title: "Tulis laporanmu", desc: "Pilih kategori insiden, ceritakan kronologinya, lampirkan bukti bila ada." },
  { n: "02", title: "Terima nomor tiket", desc: "Nomor ini kuncimu untuk memantau penanganan, bahkan bila kamu melapor anonim." },
  { n: "03", title: "Ditinjau tim HC", desc: "Status berubah dari Diterima → Sedang Ditinjau → Tindak Lanjut, semuanya terlihat olehmu." },
  { n: "04", title: "Tetap terhubung", desc: "Balas pertanyaan admin lewat kolom percakapan di dalam laporan, tanpa membuka identitas." },
];

const PINTU = [
  { icon: BookOpen, title: "Kebijakan RWP", desc: "Handbook lengkap: definisi, kategori pelanggaran, contoh kasus nyata, dan sanksinya." },
  { icon: ShieldAlert, title: "Pelaporan insiden", desc: "Kanal resmi untuk pelecehan, diskriminasi, perundungan, kekerasan, bias gender, dan eksklusivitas." },
  { icon: ListChecks, title: "Pelacakan laporan", desc: "Pantau status penanganan dan berkomunikasi dengan admin RWP." },
  { icon: HeartHandshake, title: "Layanan psikologi", desc: "Careline 24/7, psikolog internal, dan platform wellness — terpisah dari sistem pelaporan." },
];

const FAQ = [
  {
    q: "Apakah benar-benar tidak ada yang tahu siapa saya?",
    a: "Anonimitas di sini bersifat prosedural, bukan teknis absolut — dan kami memilih jujur soal itu. Sistem tetap menyimpan kaitan ke akunmu untuk mencegah penyalahgunaan dan agar tindak lanjut mungkin dilakukan. Yang dijamin: identitasmu tidak ditampilkan kepada admin, dan pembukaannya hanya bisa dilakukan admin berwenang serta selalu tercatat di riwayat laporanmu.",
  },
  {
    q: "Bagaimana kalau saya belum yakin ini termasuk pelanggaran?",
    a: `Tanya dulu ke ${ASSISTANT_NAME}. Asisten menjawab berdasarkan handbook RWP resmi, termasuk contoh kasus nyata, sehingga kamu bisa menimbang tanpa harus melapor lebih dulu.`,
  },
  {
    q: "Saya butuh dukungan, tapi belum siap melapor.",
    a: "Buka Layanan Psikologi. Careline 24/7, psikolog internal, dan platform Naluri bisa dihubungi langsung. Kanal-kanal itu terpisah dari sistem pelaporan dan tidak otomatis membuat laporan.",
  },
  {
    q: "Apakah pelapor bisa dibalas atau dirugikan?",
    a: "Tidak boleh. Perusahaan melarang segala bentuk pembalasan terhadap pelapor yang beritikad baik. Bila kamu mengalaminya, itu sendiri merupakan pelanggaran yang bisa dilaporkan.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-sm">
              <ShieldAlert className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-none text-ink">{APP_NAME}</div>
              <div className="mt-1 text-[10.5px] leading-none text-ink-muted">PT Hutama Karya</div>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-accent transition-colors hover:bg-accent-hover"
          >
            Masuk
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        {/* ── Hero ── */}
        <section className="relative mt-8 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle, #e11d48 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-6 h-80 w-80 rounded-full"
            style={{ background: "radial-gradient(circle, #f43f5e 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }}
          />
          <DotGrid className="opacity-[0.05]" />

          <div className="relative px-7 py-14 sm:px-12 sm:py-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/25 dark:text-rose-300 dark:ring-rose-800/60">
              <ShieldAlert className="h-3.5 w-3.5" />
              Respectful Workplace Policy
            </span>

            <h1 className="mt-5 max-w-[20ch] text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
              Tempat kerja yang aman{" "}
              <span className="bg-gradient-to-r from-rose-500 to-rose-700 bg-clip-text text-transparent">
                dimulai dari berani bicara.
              </span>
            </h1>

            <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.7] text-ink-secondary sm:text-base">
              Kanal resmi {ORG_NAME} untuk melaporkan pelecehan, diskriminasi,
              perundungan, dan kekerasan di tempat kerja. Kerahasiaan dijaga sejak
              laporan ditulis sampai penanganannya selesai.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-accent transition-colors hover:bg-accent-hover"
              >
                Masuk untuk melapor
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#cara-kerja"
                className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface-raised px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Pelajari alurnya
              </a>
            </div>
          </div>
        </section>

        {/* ── Jaminan privasi ── */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
            Yang bikin kanal ini beda
          </h2>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.65] text-ink-secondary">
            Alasan orang urung melapor hampir selalu sama: takut ketahuan. Tiga hal
            berikut dibangun ke dalam sistem, bukan sekadar dijanjikan.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {JAMINAN.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Icon className="h-[22px] w-[22px]" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-[1.6] text-ink-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cara kerja ── */}
        <section id="cara-kerja" className="mt-16 scroll-mt-20">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
            Empat langkah, dari cerita ke tindak lanjut
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map(({ n, title, desc }) => (
              <div key={n} className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <span className="font-mono text-xs font-bold tracking-widest text-rose-500">{n}</span>
                <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-[1.6] text-ink-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Isi aplikasi ── */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
            Bukan cuma kotak pengaduan
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PINTU.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-[22px] w-[22px]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-[1.6] text-ink-secondary">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Asisten ── */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B5BD6] to-[#9B5BD6] text-white shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{ASSISTANT_NAME}</div>
              <div className="text-xs text-ink-muted">Asisten kebijakan RWP</div>
            </div>
          </div>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.7] text-ink-secondary">
            Ragu apakah yang kamu alami termasuk pelanggaran? Tanya lebih dulu.
            Jawabannya disusun dari handbook RWP resmi perusahaan — termasuk contoh
            kasus nyata — dan bila informasinya tidak ada di dokumen, asisten akan
            bilang tidak tahu, bukan mengarang.
          </p>
          <p className="mt-4 text-sm italic leading-[1.6] text-ink-muted">
            Asisten membantu menjelaskan kebijakan. Penilaian dan tindak lanjut resmi
            tetap dilakukan tim Human Capital.
          </p>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Pertanyaan yang sering muncul</h2>
          <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
                  {q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-light leading-none text-accent transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-[1.7] text-ink-secondary">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA penutup ── */}
        <section className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 p-10 text-center text-white shadow-sm sm:p-14">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            Kamu tidak harus menghadapinya sendirian
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-[1.7] text-rose-100/90">
            Melapor bukan berarti mencari masalah. Melapor berarti memberi kesempatan
            perusahaan untuk memperbaikinya.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-rose-700 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Masuk ke {APP_NAME}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <div className="text-sm font-semibold text-ink">{APP_NAME}</div>
            <div className="mt-1 text-xs text-ink-muted">{ORG_NAME} · Divisi Human Capital</div>
            <div className="mt-3 text-xs text-ink-muted">
              Butuh bantuan?{" "}
              <a href="mailto:hc@hutamakarya.co.id" className="font-medium text-accent">
                hc@hutamakarya.co.id
              </a>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/danantara.png" alt="Danantara" className="h-8 w-auto opacity-80"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/hk.png" alt="Hutama Karya" className="h-8 w-auto opacity-80"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
