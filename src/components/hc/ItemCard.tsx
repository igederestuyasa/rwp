"use client";

// Kartu item HC Panel (docs/DESIGN.md §Komponen → "Kartu item").
//
// Grid `auto 1fr auto` dengan area "ikon nama ujung" / "ikon desk desk".
// Kartu TIDAK boleh berbayang: satu layar hanya punya satu elemen berbayangan
// dan jatahnya kolom cari (§Prinsip — satu elevasi).

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
    "group grid w-full items-start text-left",
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

  const gayaGrid: React.CSSProperties = {
    gridTemplateColumns: "auto 1fr auto",
    gridTemplateAreas: '"ikon nama ujung" "ikon desk desk"',
    columnGap: 16,
    rowGap: 4,
  };

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
        className="flex h-[22px] shrink-0 items-center gap-2 self-center"
      >
        {rencana ? <StatusLabel>Segera</StatusLabel> : status}
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
        style={gayaGrid}
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
      style={gayaGrid}
      onFocus={saatFokus}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={saatKlik}
    >
      {isi}
    </button>
  );
}

/** Grid kartu item: 1 kolom, 2 kolom mulai 640px, jarak 12 (§Komponen). */
export function ItemCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}
