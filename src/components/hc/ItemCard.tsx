"use client";

// Kartu item HC Panel (docs/DESIGN.md §Komponen → "Kartu item").
//
// Grid `auto 1fr auto` dengan area "ikon nama ujung" / "ikon desk desk".
// Kartu TIDAK boleh berbayang: satu layar hanya punya satu elemen berbayangan
// dan jatahnya kolom cari (§Prinsip — satu elevasi).
//
// Dua susunan, dipilih lewat varian `kartu-sempit` (globals.css, container
// query dari ItemCardGrid):
//   - Lebar (≥400px): label status di ujung baris nama, sesuai spesifikasi.
//     Kolom ujung dibatasi `fit-content(40%)` lebar kartu; tanpa batas ini,
//     label panjang (kategori kebijakan diketik bebas oleh admin) memeras
//     kolom nama sampai satu kata per baris lalu menimpa judul. Sel ujung
//     memakai overflow-hidden supaya minimum otomatisnya nol (spek Grid §6.6)
//     dan label terakhir boleh menyusut — StatusLabel memotong teksnya
//     dengan elipsis, jadi bentuk pil tetap utuh.
//   - Sempit (<400px, mis. dua kolom pada kolom daftar ±640px): nama, label,
//     dan panah tidak muat sebaris. Label pindah ke baris sendiri di bawah
//     nama (boleh membungkus), ujung hanya berisi panah, dan nama mendapat
//     lebar penuh.

import * as React from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { GenerativeIcon } from "@/components/hc/GenerativeIcon";
import type { Icon } from "@phosphor-icons/react";
import { StatusLabel } from "@/components/hc/StatusLabel";
import { cn } from "@/lib/utils";

export type ItemCardProps = {
  /** Nama item — juga penentu rupa ikon generatif. */
  nama: string;
  /** Keterangan singkat, dipotong maksimal 3 baris. */
  deskripsi?: string;
  /** Label status di ujung kanan. Diabaikan kalau `rencana` (dipaksa "Segera"). */
  status?: React.ReactNode;
  /** Item belum tersedia: bingkai putus-putus, nama redup, ikon versi rencana. */
  rencana?: boolean;
  /**
   * Ikon Phosphor khusus, menggantikan ikon generatif. Hanya untuk daftar
   * BERISI TETAP yang namanya sudah dikenal orang (kanal kontak, pintu
   * beranda) — lihat §Batas gaya di docs/DESIGN.md. Daftar yang isinya
   * datang dari data tetap memakai ikon generatif.
   */
  ikon?: Icon;
  /** Tanda terpilih (hanya bermakna saat panel detail terlihat). */
  terpilih?: boolean;
  /** Urutan item dalam daftar — menunda animasi muat ikon. */
  indeks?: number;
  /** Dipanggil saat item dipilih (fokus keyboard / hover intent dari hook). */
  onPilih?: () => void;
  /** Aksi utama item (buka halaman detail / tautan). */
  onBuka?: () => void;
  /** Diteruskan dari `propsHover()` milik useDaftarDetail. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  as?: "button" | "a";
  href?: string;
};

export function ItemCard({
  nama,
  deskripsi,
  status,
  rencana = false,
  ikon: IkonKhusus,
  terpilih = false,
  indeks = 0,
  onPilih,
  onBuka,
  onMouseEnter,
  onMouseLeave,
  className,
  as = "button",
  href,
}: ItemCardProps) {
  const kelas = cn(
    "group grid w-full items-start gap-x-4 gap-y-1 text-left",
    // Susunan lebar (spesifikasi): "ikon nama ujung" / "ikon desk desk".
    "[grid-template-columns:auto_1fr_fit-content(40%)]",
    "[grid-template-areas:'ikon_nama_ujung'_'ikon_desk_desk']",
    // Susunan sempit: baris "status" disisipkan, ujung tinggal panah.
    "kartu-sempit:[grid-template-columns:auto_1fr_auto]",
    "kartu-sempit:[grid-template-areas:'ikon_nama_ujung'_'ikon_status_status'_'ikon_desk_desk']",
    "rounded-[var(--radius-kartu)] border p-4",
    "transition-[border-color,background-color,opacity] duration-150 ease-[var(--ease-standar)]",
    "hover:border-tinta focus-visible:border-tinta active:scale-[.99]",
    "outline-offset-2",
    rencana
      ? "border-dashed border-garis-putus bg-transparent"
      : "border-garis bg-kartu",
    // Terpilih: cukup border tinta (§Komponen — tanpa latar tambahan).
    // Hanya mulai lg: §Pola daftar-detail menetapkan tanda terpilih cuma
    // tampil saat panel detail terlihat, dan panel disembunyikan di bawah
    // 1024px. Tanpa pembatas ini, kartu pertama tampak "terpilih" di HP
    // padahal tidak ada panel yang menjelaskan artinya.
    terpilih && "lg:border-tinta",
    rencana && "cursor-default",
    className,
  );

  // Label yang sama dirender di dua tempat (ujung untuk susunan lebar, baris
  // status untuk susunan sempit); yang tidak aktif `display: none`, jadi tidak
  // ikut tata letak maupun dibaca pembaca layar.
  const label = rencana ? <StatusLabel>Segera</StatusLabel> : status;

  const isi = (
    <>
      <span style={{ gridArea: "ikon" }} className="flex items-start">
        {IkonKhusus ? (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border",
              rencana ? "border-garis-putus text-redup" : "border-garis bg-latar text-tinta",
            )}
          >
            <IkonKhusus size={20} aria-hidden="true" />
          </span>
        ) : (
          <GenerativeIcon nama={nama} size={40} rencana={rencana} indeks={indeks} />
        )}
      </span>

      <span
        style={{ gridArea: "nama" }}
        className={cn(
          "min-w-0 self-center text-[16px] leading-[1.35] font-[650] tracking-[-0.01em]",
          rencana ? "text-redup" : "text-tinta",
        )}
      >
        {nama}
      </span>

      <span
        style={{ gridArea: "ujung" }}
        className="flex h-[22px] min-w-0 items-center gap-2 self-center overflow-hidden"
      >
        {/* Susunan lebar. Hanya label TERAKHIR yang menyusut: pemanggil menaruh
            penanda pendek yang wajib terbaca (mis. "Draft") di depan dan label
            bebas (kategori) di belakang — yang terpotong selalu label bebas itu. */}
        {label ? (
          <span className="flex min-w-0 items-center gap-2 kartu-sempit:hidden [&>*:last-child]:min-w-0 [&>*:last-child]:shrink">
            {label}
          </span>
        ) : null}
        <ArrowUpRight
          size={18}
          aria-hidden="true"
          className={cn(
            "shrink-0 text-redup",
            "transition-[color,transform] duration-200 ease-[var(--ease-standar)]",
            "group-hover:text-merah group-hover:-translate-y-[2px] group-hover:translate-x-[2px]",
            "group-focus-visible:text-merah",
          )}
        />
      </span>

      {/* Susunan sempit: label di baris sendiri, boleh membungkus. */}
      {label ? (
        <span
          style={{ gridArea: "status" }}
          className="hidden min-w-0 flex-wrap items-center gap-2 kartu-sempit:flex"
        >
          {label}
        </span>
      ) : null}

      {deskripsi ? (
        <span
          style={{ gridArea: "desk" }}
          className="line-clamp-3 min-w-0 text-[14px] leading-[1.5] text-redup"
        >
          {deskripsi}
        </span>
      ) : null}
    </>
  );

  // Fokus keyboard langsung memilih item (§Pola daftar-detail).
  const saatFokus = () => onPilih?.();
  const saatKlik = () => {
    if (rencana) return; // item belum tersedia: tak ada aksi utama
    onBuka?.();
  };

  if (as === "a") {
    return (
      <a
        href={rencana ? undefined : href}
        aria-disabled={rencana || undefined}
        className={kelas}
        onFocus={saatFokus}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={saatKlik}
      >
        {isi}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-disabled={rencana || undefined}
      className={kelas}
      onFocus={saatFokus}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={saatKlik}
    >
      {isi}
    </button>
  );
}

/**
 * Grid kartu item: 1 kolom, 2 kolom bila WADAHNYA selebar ≥576px, jarak 12
 * (§Komponen). Diukur dari wadah (container query), bukan viewport: di
 * aplikasi ini sidebar muncul pada 768px dan panel detail pada 1024px, jadi
 * kolom daftar bisa jauh lebih sempit dari layar — dengan patokan viewport,
 * pada 768–1279px kartu terbelah dua jadi ±230px dan judulnya tak terbaca.
 */
export function ItemCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("@container", className)}>
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">{children}</div>
    </div>
  );
}
