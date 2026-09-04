"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BookOpen, ShieldAlert, ListChecks, HeartHandshake, Search, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ASSISTANT_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function BerandaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");

  const firstName = user?.nama.split(" ")[0] ?? "";

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/asisten?q=${encodeURIComponent(q.trim())}`);
    } else {
      router.push("/asisten");
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm min-h-[400px] px-10 py-16 sm:px-14 sm:py-[68px]">
        {/* Video background — kanan */}
        <video
          className="pointer-events-none absolute bottom-0 right-0 top-0 h-full w-[60%] object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>

        {/* Fade overlay — pakai CSS var agar adaptif dark mode */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background: [
              "linear-gradient(to right, var(--color-surface) 45%, transparent 70%)",
              "linear-gradient(to left,  var(--color-surface) 0%,  transparent 10%)",
              "linear-gradient(to bottom, var(--color-surface) 0%, transparent 15%)",
              "linear-gradient(to top,   var(--color-surface) 0%, transparent 15%)",
            ].join(", "),
          }}
        />

        {/* Konten kiri */}
        <div className="relative z-[2] max-w-[54%]">
          <h1 className="text-[34px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[38px]" style={{ marginBottom: 24 }}>
            Halo, {firstName}. Apa yang bisa<br />
            kami bantu{" "}
            <span className="bg-gradient-to-r from-[#5B5BD6] via-[#8A5BD6] to-[#C95BC5] bg-clip-text text-transparent">
              hari ini?
            </span>
          </h1>
          <p className="mb-10 max-w-[52ch] text-[15px] leading-[1.65] text-ink-secondary">
            Tanya {ASSISTANT_NAME} soal kebijakan RWP, laporkan insiden lewat jalur
            yang aman, atau lacak penanganan laporanmu.
          </p>

          {/* Search */}
          <form
            onSubmit={onSearch}
            className={cn(
              "flex max-w-[540px] items-center gap-2 rounded-2xl",
              "border-[1.5px] border-line-strong bg-surface-raised px-3 py-[10px]",
              "shadow-xs transition-[border-color,box-shadow] duration-150",
              "focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(91,91,214,0.12)]",
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Tanya ${ASSISTANT_NAME}… mis. "apa itu perundungan?"`}
              className="min-w-0 flex-1 bg-transparent py-0.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-accent px-[18px] py-2 text-sm font-medium text-white shadow-accent transition-colors hover:bg-accent-hover active:scale-[0.98]"
            >
              Tanya
            </button>
          </form>
        </div>
      </div>

      {/* 4 pintu */}
      <div className="mt-5 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <DoorCard
          href="/kebijakan"
          icon={<BookOpen className="h-[22px] w-[22px]" />}
          tone="accent"
          title="Kebijakan RWP"
          desc="Baca handbook Respectful Workplace Policy: definisi, contoh kasus, dan sanksinya."
          cta="Baca kebijakan"
        />
        <DoorCard
          href="/lapor"
          icon={<ShieldAlert className="h-[22px] w-[22px]" />}
          tone="rose"
          title="Lapor Insiden"
          desc="Laporkan pelecehan, diskriminasi, atau perundungan — bisa anonim, dijaga kerahasiaannya."
          cta="Buat laporan"
        />
        <DoorCard
          href="/laporan"
          icon={<ListChecks className="h-[22px] w-[22px]" />}
          tone="emerald"
          title="Lacak Laporan"
          desc="Pantau status penanganan dan berkomunikasi dengan admin RWP."
          cta="Lihat laporan"
        />
        <DoorCard
          href="/psikologi"
          icon={<HeartHandshake className="h-[22px] w-[22px]" />}
          tone="teal"
          title="Layanan Psikologi"
          desc="Konseling profesional & careline 24/7. Tanpa perlu membuat laporan lebih dulu."
          cta="Lihat kanal"
        />
      </div>
    </div>
  );
}

type Tone = "accent" | "rose" | "emerald" | "teal";

const TONE_CFG: Record<Tone, { iconBg: string; iconText: string; cta: string }> = {
  accent: {
    iconBg: "bg-accent-soft",
    iconText: "text-accent",
    cta: "text-accent",
  },
  rose: {
    iconBg: "bg-rose-50 dark:bg-rose-950/30",
    iconText: "text-rose-600 dark:text-rose-400",
    cta: "text-rose-600 dark:text-rose-400",
  },
  emerald: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconText: "text-emerald-600 dark:text-emerald-400",
    cta: "text-emerald-600 dark:text-emerald-400",
  },
  teal: {
    iconBg: "bg-teal-50 dark:bg-teal-950/30",
    iconText: "text-teal-600 dark:text-teal-400",
    cta: "text-teal-600 dark:text-teal-400",
  },
};

function DoorCard({ href, icon, title, desc, cta, tone }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  tone: Tone;
}) {
  const c = TONE_CFG[tone];
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
      )}
    >
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", c.iconBg, c.iconText)}>
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-[1.55] text-ink-secondary">{desc}</p>
      <span className={cn("mt-4 inline-flex items-center gap-1 text-[13px] font-semibold", c.cta)}>
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
