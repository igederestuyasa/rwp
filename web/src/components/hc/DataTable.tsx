"use client";

// Tabel (docs/DESIGN.md §Komponen + §Pola daftar-detail).
//
// Baris bisa difokus keyboard: menyorot (hover/fokus) memilih baris untuk
// panel detail, Enter membuka aksi utamanya. Panah atas/bawah dan Home/End
// berpindah antarbaris sesuai urutan visual (§Aksesibilitas).

import type React from "react";
import { cn } from "@/lib/utils";

export type Kolom<T> = {
  kunci: string;
  judul: string;
  /** Kolom angka: rata kanan dan tabular-nums. */
  angka?: boolean;
  /** Lebar kolom, mis. "120px" atau "30%". */
  lebar?: string;
  render: (baris: T) => React.ReactNode;
};

export type DataTableProps<T> = {
  kolom: Kolom<T>[];
  data: T[];
  kunciBaris: (baris: T) => string;
  /** Kunci baris yang sedang tampil di panel detail. */
  terpilih?: string | null;
  /** Dipanggil saat baris disorot kursor atau mendapat fokus keyboard. */
  onPilih?: (baris: T) => void;
  /** Aksi utama baris: klik atau Enter. */
  onBuka?: (baris: T) => void;
  /** Baris yang belum bisa dibuka (mis. data belum lengkap). */
  barisNonaktif?: (baris: T) => boolean;
  /** Label tabel untuk pembaca layar. */
  label?: string;
  /** Kalimat saat tidak ada data. */
  teksKosong?: string;
  className?: string;
};

export function DataTable<T>({
  kolom,
  data,
  kunciBaris,
  terpilih,
  onPilih,
  onBuka,
  barisNonaktif,
  label,
  teksKosong = "Belum ada data.",
  className,
}: DataTableProps<T>) {
  const adaLebar = kolom.some((k) => k.lebar);

  // Pindah fokus antarbaris tanpa mengubah state — mengikuti urutan visual.
  function pindahFokus(dari: HTMLTableRowElement, arah: "maju" | "mundur" | "awal" | "akhir") {
    const semua = Array.from(
      dari.parentElement?.querySelectorAll<HTMLTableRowElement>('tr[data-baris="ya"]') ?? [],
    ).filter((el) => el.tabIndex >= 0);
    if (semua.length === 0) return;
    const posisi = semua.indexOf(dari);
    const tujuan =
      arah === "awal"
        ? semua[0]
        : arah === "akhir"
          ? semua[semua.length - 1]
          : arah === "maju"
            ? semua[Math.min(posisi + 1, semua.length - 1)]
            : semua[Math.max(posisi - 1, 0)];
    tujuan?.focus();
  }

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table
        aria-label={label}
        className="w-full border-collapse text-left"
      >
        {adaLebar && (
          <colgroup>
            {kolom.map((k) => (
              <col key={k.kunci} style={k.lebar ? { width: k.lebar } : undefined} />
            ))}
          </colgroup>
        )}

        <thead>
          <tr className="border-b border-garis">
            {kolom.map((k) => (
              <th
                key={k.kunci}
                scope="col"
                className={cn(
                  "h-10 px-3 align-middle text-[12px] font-semibold whitespace-nowrap text-redup",
                  k.angka && "text-right",
                )}
              >
                {k.judul}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={kolom.length} className="h-12 px-3 text-[14px] text-redup">
                {teksKosong}
              </td>
            </tr>
          )}

          {data.map((baris) => {
            const kunci = kunciBaris(baris);
            const nonaktif = barisNonaktif?.(baris) ?? false;
            const dipilih = terpilih != null && terpilih === kunci;

            return (
              <tr
                key={kunci}
                data-baris="ya"
                tabIndex={nonaktif ? -1 : 0}
                aria-current={dipilih ? "true" : undefined}
                aria-disabled={nonaktif || undefined}
                onMouseEnter={() => {
                  if (!nonaktif) onPilih?.(baris);
                }}
                onFocus={() => {
                  if (!nonaktif) onPilih?.(baris);
                }}
                onClick={() => {
                  if (!nonaktif) onBuka?.(baris);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!nonaktif) onBuka?.(baris);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    pindahFokus(e.currentTarget, "maju");
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    pindahFokus(e.currentTarget, "mundur");
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    pindahFokus(e.currentTarget, "awal");
                  } else if (e.key === "End") {
                    e.preventDefault();
                    pindahFokus(e.currentTarget, "akhir");
                  }
                }}
                className={cn(
                  "h-12 border-b border-garis last:border-b-0",
                  "transition-colors duration-150 [transition-timing-function:var(--ease-standar)]",
                  "outline-offset-[-2px]!",
                  // Baris nonaktif tetap harus terbaca, jadi memakai redup
                  // (bukan garis-putus yang kontrasnya terlalu rendah untuk data).
                  nonaktif
                    ? "cursor-not-allowed text-redup"
                    : "text-tinta hover:bg-latar focus-visible:bg-latar",
                  !nonaktif && onBuka && "cursor-pointer",
                  dipilih && !nonaktif && "bg-latar font-semibold",
                )}
              >
                {kolom.map((k) => (
                  <td
                    key={k.kunci}
                    className={cn(
                      "h-12 px-3 align-middle text-[14px] leading-tight",
                      k.angka && "text-right tabular-nums",
                    )}
                  >
                    {k.render(baris)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
