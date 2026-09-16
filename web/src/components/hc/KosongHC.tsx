"use client";

// Keadaan kosong HC Panel (docs/DESIGN.md §Komponen → "Keadaan kosong").
// Kotak putus-putus, judul 18px 700, satu kalimat ajakan, satu tombol aksi.
// Tulisannya ajakan + langkah berikutnya, bukan sekadar "Data tidak ada" (§Tulisan).

import * as React from "react";
import { cn } from "@/lib/utils";

export type KosongHCProps = {
  judul: string;
  /** Satu kalimat ajakan beserta langkah berikutnya. */
  ajakan: string;
  aksiLabel?: string;
  onAksi?: () => void;
  href?: string;
  className?: string;
};

const KELAS_AKSI = cn(
  "inline-flex h-10 items-center justify-center rounded-full px-5",
  "bg-tinta text-[14px] font-semibold text-kartu",
  "transition-[background-color] duration-150 ease-[var(--ease-standar)]",
  "hover:bg-tinta-hover active:scale-[.99]",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
);

export function KosongHC({
  judul,
  ajakan,
  aksiLabel,
  onAksi,
  href,
  className,
}: KosongHCProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-kartu)]",
        // Keadaan kosong itu ajakan, bukan kegagalan — diberi latar hangat lembut
        // sesuai §Token warna.
        "border border-dashed border-hangat-garis bg-hangat-latar px-6 py-8 text-center",
        className,
      )}
    >
      <h3 className="text-[18px] leading-[1.3] font-bold tracking-[-0.02em] text-tinta">
        {judul}
      </h3>
      <p className="mt-2 max-w-[44ch] text-[16px] leading-[1.5] text-redup">{ajakan}</p>

      {aksiLabel ? (
        <div className="mt-6">
          {href ? (
            <a href={href} className={KELAS_AKSI}>
              {aksiLabel}
            </a>
          ) : (
            <button type="button" onClick={onAksi} disabled={!onAksi} className={KELAS_AKSI}>
              {aksiLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
