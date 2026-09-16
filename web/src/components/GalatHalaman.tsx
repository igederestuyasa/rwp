"use client";

// Tampilan galat bersama untuk error.tsx, (app)/error.tsx, dan global-error.tsx.
// Mengikuti HC Panel (docs/DESIGN.md): permukaan datar, warna lewat token,
// tanpa bayangan (jatah satu bayangan per layar milik kontrol utama), dan
// satu tombol utama per tampilan.
//
// Keamanan (§9.7): `error.message` TIDAK pernah dirender. Di produksi Next
// memang mengganti pesan galat dari Server Component dengan teks generik,
// tetapi galat dari Client Component tetap membawa pesan asli yang bisa
// menyebut nama tabel atau kolom. Pengguna hanya melihat `digest` untuk
// dicocokkan tim teknis dengan log server.

import { useEffect } from "react";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type GalatHalamanProps = {
  error: Error & { digest?: string };
  reset: () => void;
  className?: string;
};

// Tautan bergaya tombol sekunder (§Komponen): pil, latar kartu, border
// garis-kuat, teks tinta. Button bukan komponen polimorfik, jadi kelasnya
// disalin di sini — pola yang sama dipakai KosongHC dan halaman detail.
const KELAS_TAUTAN_SEKUNDER = cn(
  "inline-flex h-10 items-center justify-center rounded-full px-5",
  "border border-garis-kuat bg-kartu text-bantu font-semibold text-tinta",
  "transition-colors duration-150 hover:bg-latar active:scale-[.99]",
);

export function GalatHalaman({ error, reset, className }: GalatHalamanProps) {
  useEffect(() => {
    // Untuk pengembang di konsol; pengguna tidak pernah melihat pesannya.
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className={cn("flex w-full max-w-[44ch] flex-col items-center text-center", className)}
    >
      {/* Ikon dalam kotak ber-radius kartu; merah = token pesan galat (§Token warna). */}
      <div
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-kartu)] border border-garis bg-kartu text-merah"
      >
        <Warning size={28} weight="regular" />
      </div>

      {/* Satu elemen bermetrik teks per level: judul, isi, catatan. */}
      <h1 className="mt-6 text-bagian leading-[1.25] font-bold tracking-[-0.02em] text-tinta">
        Terjadi gangguan
      </h1>
      <p className="mt-2 text-isi leading-[1.5] text-redup">
        Halaman ini belum bisa ditampilkan. Data laporan kamu tetap aman. Coba
        lagi, atau hubungi tim HC bila gangguan berlanjut.
      </p>

      {error.digest ? (
        <p className="tabular mt-3 text-mikro font-semibold text-redup">
          Kode: <span className="select-all">{error.digest}</span>
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Coba lagi
        </Button>
        <Link href="/" className={KELAS_TAUTAN_SEKUNDER}>
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
