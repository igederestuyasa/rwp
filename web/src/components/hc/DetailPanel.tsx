"use client";

// Panel detail HC Panel (docs/DESIGN.md §Pola daftar-detail).
//
// Urutan isi dikunci oleh spesifikasi: ikon 96px → kategori + status →
// judul → deskripsi → daftar `dl`. Tinggi isi dipatok 460px supaya tombol
// aksi tidak melompat saat isi berganti. Desktop saja: di bawah 1024px
// panel disembunyikan dan daftar yang mengambil alih.

import * as React from "react";
import { GenerativeIcon } from "@/components/hc/GenerativeIcon";
import { cn } from "@/lib/utils";

export type DetailBaris = {
  label: string;
  nilai: React.ReactNode;
};

export type DetailItem = {
  nama: string;
  kategori?: string;
  status?: React.ReactNode;
  deskripsi?: string;
  /** Belum tersedia: tombol aksi diganti catatan berbingkai putus-putus. */
  rencana?: boolean;
  /** Baris `dl`; hanya yang ada isinya yang dirender. */
  baris?: DetailBaris[];
};

export type DetailPanelProps = {
  /** Nama entitas untuk label kepala, mis. "laporan" → "Detail laporan". */
  entitas: string;
  item?: DetailItem | null;
  aksiLabel?: string;
  onAksi?: () => void;
  catatanRencana?: string;
  className?: string;
};

export function DetailPanel({
  entitas,
  item,
  aksiLabel = "Buka detail",
  onAksi,
  catatanRencana = "Fitur ini belum tersedia. Kami kabari lewat halaman ini begitu bisa dipakai.",
  className,
}: DetailPanelProps) {
  // Hanya baris yang benar-benar ada datanya (§Pola daftar-detail).
  const baris = (item?.baris ?? []).filter(
    (b) => b.nilai !== null && b.nilai !== undefined && b.nilai !== "",
  );

  return (
    <aside
      className={cn(
        "panel-hc hidden lg:block",
        "rounded-[var(--radius-panel)] border border-garis bg-kartu p-6",
        className,
      )}
    >
      {/* a. Kepala */}
      <div>
        <p className="text-[14px] leading-[1.35] font-[650] text-tinta">
          Detail {entitas}
        </p>
        <p className="mt-1 text-[14px] leading-[1.5] text-redup">
          Arahkan kursor ke item untuk melihat detailnya.
        </p>
      </div>

      {/* b. Garis pemisah */}
      <div className="mt-4 border-t border-garis" />

      {/* c. Isi — `key` memaksa animasi panelMasuk berjalan ulang tiap ganti item. */}
      {item ? (
        <div
          key={item.nama}
          className="flex min-h-[460px] flex-col pt-6"
          style={{ animation: "panelMasuk 240ms var(--ease-keluar) both" }}
        >
          <GenerativeIcon nama={item.nama} size={96} rencana={item.rencana} />

          {(item.kategori || item.status) && (
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[14px] leading-[1.35] font-medium text-redup">
              {item.kategori ? <span>{item.kategori}</span> : null}
              {item.status}
            </div>
          )}

          <h2 className="mt-2 text-[24px] leading-[1.2] font-bold tracking-[-0.025em] text-tinta">
            {item.nama}
          </h2>

          {item.deskripsi ? (
            <p className="mt-3 text-[16px] leading-[1.5] text-redup">{item.deskripsi}</p>
          ) : null}

          {baris.length > 0 ? (
            <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-[14px] leading-[1.5]">
              {baris.map((b) => (
                <React.Fragment key={b.label}>
                  <dt className="text-redup">{b.label}</dt>
                  <dd className="min-w-0 font-medium text-tinta">{b.nilai}</dd>
                </React.Fragment>
              ))}
            </dl>
          ) : null}

          {/* d. Area aksi menempel di bawah */}
          <div className="mt-auto pt-8">
            {item.rencana ? (
              <p className="rounded-[var(--radius-input)] border border-dashed border-garis-putus px-4 py-3 text-[14px] leading-[1.5] text-redup">
                {catatanRencana}
              </p>
            ) : (
              <button
                type="button"
                onClick={onAksi}
                disabled={!onAksi}
                className={cn(
                  "flex h-12 w-full items-center justify-center rounded-full",
                  "bg-tinta text-[16px] font-semibold text-kartu",
                  "transition-[background-color,opacity] duration-150 ease-[var(--ease-standar)]",
                  "hover:bg-tinta-hover active:scale-[.99]",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
                )}
              >
                {aksiLabel}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
