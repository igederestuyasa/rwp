"use client";

import {
  useState,
  useRef,
  useEffect,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { CaretDown, Check, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// Input form sistem UI "HC Panel" (docs/DESIGN.md §Komponen):
// label di atas 14px 600, tinggi 44, radius 12, border garis-kuat, latar kartu.
// Hover: border redup. Fokus: border tinta + cincin 1px tinta. Tanpa bayangan.
const baseControl =
  "w-full rounded-[var(--radius-input)] border border-garis-kuat bg-kartu px-3 " +
  "text-bantu text-tinta placeholder:text-redup transition-colors duration-150 " +
  "hover:border-redup focus:border-tinta focus:outline-none focus:ring-1 focus:ring-tinta " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  /** Pesan kesalahan opsional — tampil di bawah kontrol dengan ikon peringatan. */
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-bantu font-semibold text-tinta">
        {label}
        {required && <span className="text-merah"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-2 block text-bantu text-redup">{hint}</span>}
      {error && (
        <span className="mt-2 flex items-start gap-1.5 text-bantu text-merah">
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseControl, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  // Textarea boleh lebih tinggi dari 44, radius/border/fokus tetap sama.
  return (
    <textarea className={cn(baseControl, "resize-y py-3 leading-relaxed", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseControl, "h-11 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

// ── GlassSelect — dropdown kustom (native <option> tidak bisa ditata) ──
export interface GlassSelectOption {
  value: string;
  label: string;
}

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = "— Pilih —",
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Tutup saat tekan ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Pemicu */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          baseControl,
          "flex h-11 cursor-pointer items-center justify-between pr-3 text-left",
          !selected && "text-redup",
          open && "border-tinta ring-1 ring-tinta",
        )}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <CaretDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-redup transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {/* Panel dropdown — popover boleh berbayangan */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[var(--radius-kartu)] border border-garis bg-kartu shadow-[var(--shadow-popover)]">
          <ul className="max-h-64 overflow-y-auto py-1.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-bantu transition-colors duration-150",
                      isSelected
                        ? "bg-latar font-semibold text-tinta"
                        : "text-redup hover:bg-latar hover:text-tinta",
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-tinta" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
