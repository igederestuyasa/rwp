"use client";

// Tab filter (docs/DESIGN.md §Komponen).
//
// Satu baris tombol di atas garis dasar 1px. Tab aktif ditandai garis bawah
// 2px tinta yang menimpa garis dasar. Di layar sempit barisnya bisa digeser;
// tepinya memudar (mask-image) HANYA saat isinya benar-benar meluap.

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type FilterTabItem = {
  id: string;
  label: string;
  /** Jumlah item pada filter ini. Ditampilkan di samping label bila ada. */
  jumlah?: number;
  nonaktif?: boolean;
};

export type FilterTabsProps = {
  items: FilterTabItem[];
  aktif: string;
  onPilih: (id: string) => void;
  className?: string;
  /** Label daftar tab untuk pembaca layar. */
  label?: string;
};

// Lebar area memudar di tepi saat baris tab meluap.
const LEBAR_PUDAR = "24px";

export function FilterTabs({ items, aktif, onPilih, className, label = "Filter" }: FilterTabsProps) {
  const gulirRef = useRef<HTMLDivElement>(null);

  // Mask ditulis langsung ke DOM (bukan state) supaya menggeser tab tidak
  // memicu render ulang. Dua elemen diamati: wadah gulir (lebar layar berubah)
  // dan baris tab di dalamnya (jumlah tab berubah).
  useEffect(() => {
    const wadah = gulirRef.current;
    if (!wadah) return;

    function perbaruiPudar(node: HTMLDivElement) {
      const meluap = node.scrollWidth - node.clientWidth > 1;
      if (!meluap) {
        node.style.removeProperty("mask-image");
        node.style.removeProperty("-webkit-mask-image");
        return;
      }
      const adaKiri = node.scrollLeft > 1;
      const adaKanan = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      const awal = adaKiri ? `transparent 0, black ${LEBAR_PUDAR}` : "black 0";
      const akhir = adaKanan ? `black calc(100% - ${LEBAR_PUDAR}), transparent 100%` : "black 100%";
      const nilai = `linear-gradient(to right, ${awal}, ${akhir})`;
      node.style.setProperty("mask-image", nilai);
      node.style.setProperty("-webkit-mask-image", nilai);
    }

    const saatBerubah = () => perbaruiPudar(wadah);
    saatBerubah();

    wadah.addEventListener("scroll", saatBerubah, { passive: true });
    const pengamat = new ResizeObserver(saatBerubah);
    pengamat.observe(wadah);
    if (wadah.firstElementChild) pengamat.observe(wadah.firstElementChild);

    return () => {
      wadah.removeEventListener("scroll", saatBerubah);
      pengamat.disconnect();
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={gulirRef}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          role="group"
          aria-label={label}
          className="flex w-max min-w-full items-end gap-4 border-b border-garis"
        >
          {items.map((item) => {
            const terpilih = item.id === aktif;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={terpilih}
                disabled={item.nonaktif}
                onClick={() => onPilih(item.id)}
                className={cn(
                  "relative flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap",
                  "text-[14px] font-medium",
                  "transition-colors duration-150 [transition-timing-function:var(--ease-standar)]",
                  "outline-offset-[-2px]!",
                  terpilih ? "text-tinta" : "text-redup",
                  !item.nonaktif && !terpilih && "hover:text-tinta",
                  item.nonaktif && "cursor-not-allowed text-garis-putus",
                )}
              >
                {item.label}
                {typeof item.jumlah === "number" && (
                  <span className={cn("text-[14px] font-medium tabular-nums", terpilih ? "text-redup" : "")}>
                    {item.jumlah}
                  </span>
                )}
                {/* Garis bawah tab aktif duduk di atas garis dasar 1px. */}
                {terpilih && (
                  <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-tinta" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
