"use client";

// Kolom cari — kontrol utama layar (docs/DESIGN.md §Komponen).
//
// Ini SATU-SATUNYA elemen berbayangan di satu layar (§Prinsip: satu elevasi).
// Kalau layar lain memerlukan bayangan, hapus dulu bayangan di sini.

import { useEffect, useId, useRef } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type SearchFieldProps = {
  /** Label di atas input (14px, 600). Wajib — bukan sekadar placeholder. */
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Panah bawah dari kolom cari: pindah ke item pertama (§Aksesibilitas). */
  onArrowDown?: () => void;
  /** Enter menjalankan aksi hasil teratas (§Pola daftar-detail). */
  onEnter?: () => void;
  id?: string;
  className?: string;
  /** Ringkasan hasil, mis. "3 laporan cocok". Diumumkan lewat role="status". */
  hasilInfo?: string;
  nonaktif?: boolean;
};

export function SearchField({
  label,
  value,
  onChange,
  placeholder,
  onArrowDown,
  onEnter,
  id,
  className,
  hasilInfo,
  nonaktif = false,
}: SearchFieldProps) {
  const idBawaan = useId();
  const idInput = id ?? `cari-${idBawaan}`;
  const inputRef = useRef<HTMLInputElement>(null);

  // Petunjuk hasil hanya terlihat selagi ada kata kunci.
  const sedangMencari = value.trim().length > 0;

  // Pintasan global: "/" dan Ctrl/Cmd+K memfokuskan kolom cari (§Aksesibilitas).
  // Diabaikan kalau fokus sedang berada di input/textarea/select lain, supaya
  // tidak merebut ketikan orang yang sedang mengisi formulir.
  useEffect(() => {
    if (nonaktif) return;

    function saatTekanTombol(e: KeyboardEvent) {
      const sasaran = e.target as HTMLElement | null;
      const sedangMengetik =
        !!sasaran &&
        (sasaran.tagName === "INPUT" ||
          sasaran.tagName === "TEXTAREA" ||
          sasaran.tagName === "SELECT" ||
          sasaran.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === "/" && !sedangMengetik && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", saatTekanTombol);
    return () => window.removeEventListener("keydown", saatTekanTombol);
  }, [nonaktif]);

  function saatTekanDiInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onArrowDown?.();
    } else if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    } else if (e.key === "Escape" && value !== "") {
      // Esc mengosongkan pencarian, fokus tetap di kolom cari.
      e.preventDefault();
      onChange("");
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={idInput} className="block text-[14px] leading-tight font-semibold text-tinta">
        {label}
      </label>

      <div
        className={cn(
          "relative mt-2 flex h-[60px] items-center rounded-[var(--radius-kartu)]",
          "border border-garis-kuat bg-kartu shadow-[var(--shadow-kontrol)]",
          "transition-colors duration-150 [transition-timing-function:var(--ease-standar)]",
          !nonaktif &&
            "hover:border-redup focus-within:border-tinta focus-within:ring-1 focus-within:ring-tinta",
          nonaktif && "cursor-not-allowed border-garis bg-latar opacity-60 shadow-none",
        )}
      >
        <MagnifyingGlass
          size={20}
          weight="regular"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-redup"
        />

        <input
          ref={inputRef}
          id={idInput}
          type="search"
          value={value}
          disabled={nonaktif}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={saatTekanDiInput}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "h-full w-full rounded-[var(--radius-kartu)] bg-transparent pl-[52px] pr-[60px]",
            "text-[16px] font-medium text-tinta placeholder:text-redup",
            "caret-[var(--color-merah)] outline-none! disabled:cursor-not-allowed",
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />

        {/* Petunjuk "/" hanya untuk perangkat berkursor — murni lewat CSS. */}
        {!sedangMencari && !nonaktif && (
          <kbd
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 items-center rounded-md border border-garis",
              "px-1.5 py-0.5 font-sans text-[12px] leading-none font-semibold text-redup",
              "[@media(hover:hover)]:flex",
            )}
          >
            /
          </kbd>
        )}

        {sedangMencari && !nonaktif && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className={cn(
              "absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full",
              // Bulatannya 36px sesuai spesifikasi; area sentuhnya dilebarkan ke 44px.
              "after:absolute after:-inset-1 after:content-['']",
              "text-redup transition-colors duration-150 [transition-timing-function:var(--ease-standar)]",
              "hover:bg-latar hover:text-tinta focus-visible:text-tinta",
            )}
          >
            <X size={18} weight="regular" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Hasil cari diumumkan, tapi teksnya hanya terlihat saat mencari. */}
      <p
        role="status"
        aria-live="polite"
        className={sedangMencari && hasilInfo ? "mt-2 text-[14px] text-redup" : "sr-only"}
      >
        {sedangMencari ? (hasilInfo ?? "") : ""}
      </p>
    </div>
  );
}
