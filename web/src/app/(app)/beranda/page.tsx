"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ASSISTANT_NAME } from "@/lib/constants";
import { SearchField } from "@/components/hc/SearchField";
import { BookOpen, NotePencil, ListChecks, HandHeart } from "@phosphor-icons/react";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";

// Empat pintu masuk karyawan. Set tetap, jadi memakai ikon semantik (§Batas gaya).
const PINTU = [
  {
    nama: "Kebijakan RWP",
    ikon: BookOpen,
    href: "/kebijakan",
    deskripsi:
      "Baca handbook Respectful Workplace Policy: definisi, contoh kasus, dan sanksinya.",
  },
  {
    nama: "Lapor insiden",
    ikon: NotePencil,
    href: "/lapor",
    deskripsi:
      "Laporkan pelecehan, diskriminasi, atau perundungan. Bisa anonim, kerahasiaannya dijaga.",
  },
  {
    nama: "Lacak laporan",
    ikon: ListChecks,
    href: "/laporan",
    deskripsi: "Pantau status penanganan dan berkomunikasi dengan admin RWP.",
  },
  {
    nama: "Layanan psikologi",
    ikon: HandHeart,
    href: "/psikologi",
    deskripsi:
      "Konseling profesional dan careline 24 jam, tanpa perlu membuat laporan lebih dulu.",
  },
] as const;

export default function BerandaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");

  const firstName = user?.nama.split(" ")[0] ?? "";

  // Pertanyaan dilempar ke Sahabat RWP lewat query ?q= (perilaku lama dipertahankan).
  function tanyaAsisten() {
    const teks = q.trim();
    router.push(teks ? `/asisten?q=${encodeURIComponent(teks)}` : "/asisten");
  }

  return (
    <div>
      {/* ── Pembuka layar ── */}
      {firstName && (
        <p
          className="pembuka-masuk text-isi font-medium text-lembut"
          style={{ animationDelay: "0ms" }}
        >
          Halo, {firstName}
        </p>
      )}

      <h1
        className="pembuka-masuk mt-2 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
        style={{ animationDelay: "60ms" }}
      >
        Apa yang bisa kami bantu hari ini?
      </h1>

      <p
        className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
        style={{ animationDelay: "110ms" }}
      >
        Tanya {ASSISTANT_NAME} soal kebijakan RWP, laporkan insiden lewat jalur aman,
        atau lacak penanganan laporanmu.
      </p>

      {/* Kontrol utama layar — satu-satunya elemen berbayangan di halaman ini. */}
      <div className="pembuka-masuk mt-8" style={{ animationDelay: "170ms" }}>
        <SearchField
          label={`Tanya ${ASSISTANT_NAME}`}
          value={q}
          onChange={setQ}
          onEnter={tanyaAsisten}
          placeholder={`mis. "apa itu perundungan?"`}
          hasilInfo="Tekan Enter untuk mengirim pertanyaan ke asisten."
        />
      </div>

      {/* ── Empat pintu ── */}
      <section className="mt-12">
        <h2 className="mb-3 text-bantu font-[650] text-tinta">
          Jalur layanan{" "}
          <span className="font-medium text-redup">{PINTU.length}</span>
        </h2>

        <ItemCardGrid>
          {PINTU.map((pintu, i) => (
            <ItemCard
              key={pintu.href}
              nama={pintu.nama}
              ikon={pintu.ikon}
              deskripsi={pintu.deskripsi}
              indeks={i}
              onBuka={() => router.push(pintu.href)}
            />
          ))}
        </ItemCardGrid>
      </section>
    </div>
  );
}
