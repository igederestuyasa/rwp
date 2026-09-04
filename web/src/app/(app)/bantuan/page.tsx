"use client";

import { useRouter } from "next/navigation";
import { Bot, BookOpen, Mail, ChevronRight, HelpCircle } from "lucide-react";
import { ASSISTANT_NAME } from "@/lib/constants";
import { Card, CardBody } from "@/components/ui/Card";
import { DotGrid } from "@/components/ui/DotGrid";

export default function BantuanPage() {
  const router = useRouter();
  const faqs = [
    { q: "Bagaimana cara melaporkan insiden RWP?", a: "Buka menu Lapor Insiden, isi kategori, kronologi, dan tanggal kejadian. Bukti pendukung boleh dilampirkan, dan kamu bisa memilih melapor secara anonim. Setelah terkirim kamu menerima nomor tiket untuk melacak penanganannya." },
    { q: "Apakah laporan saya dijamin rahasia?", a: "Identitas pelapor disimpan terpisah dari isi laporan dan tidak ditampilkan ke admin. Anonimitas bersifat prosedural: sistem tetap menyimpan kaitan ke akun untuk anti-spam dan tindak lanjut, tapi identitas hanya bisa dibuka lewat eskalasi resmi oleh admin berwenang — dan pembukaan itu tercatat di riwayat laporanmu." },
    { q: "Bagaimana memantau status laporan?", a: "Buka Lacak Laporan untuk melihat status terkini, riwayat penanganan, dan berkomunikasi langsung dengan admin RWP." },
    { q: "Saya belum siap melapor, tapi butuh dukungan.", a: "Buka menu Layanan Psikologi. Ada careline 24/7, WhatsApp, psikolog internal, dan platform Naluri — semuanya terpisah dari sistem pelaporan dan tidak otomatis membuat laporan." },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, #C95BC5 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-[60px] left-1/4 h-[180px] w-[180px] rounded-full"
          style={{ background: "radial-gradient(circle, #5B5BD6 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #8A5BD6, #C95BC5)", WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)", maskImage: "radial-gradient(circle, black 1px, transparent 1px)", WebkitMaskSize: "22px 22px", maskSize: "22px 22px", opacity: 0.2, animation: "hero-dots 8s linear infinite" }} />
        <div className="relative flex items-center gap-4 px-8 py-7">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg, #5B5BD6, #C95BC5)" }}>
            <HelpCircle className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #C95BC5)" }}>Bantuan</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">Temukan jawaban seputar RWP, atau hubungi tim Human Capital.</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => router.push("/asisten")}
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tanya {ASSISTANT_NAME}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Asisten AI untuk pertanyaan cepat.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        </button>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hubungi HC</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">hc-support@hutamakarya.co.id</p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pertanyaan umum</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {faqs.map((f) => (
              <div key={f.q} className="py-3.5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{f.q}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.a}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
