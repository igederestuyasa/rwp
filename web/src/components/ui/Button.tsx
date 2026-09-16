import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

// Tombol sistem UI "HC Panel" (docs/DESIGN.md §Komponen).
// Semua varian berbentuk pil, memakai token warna, dan TANPA bayangan —
// bayangan hanya milik kontrol utama layar (prinsip "satu elevasi").

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  // Tombol utama: latar tinta, teks kartu. Satu per tampilan.
  primary: "bg-tinta text-kartu hover:bg-tinta-hover",
  // Tombol sekunder: latar kartu, border garis-kuat, teks tinta.
  secondary: "bg-kartu text-tinta border border-garis-kuat hover:bg-latar",
  // Ghost: transparan, teks redup, hover memakai warna latar.
  ghost: "bg-transparent text-redup hover:bg-latar hover:text-tinta",
  // Danger: aksen merah HK, dipakai untuk aksi merusak.
  danger: "bg-merah text-kartu hover:bg-merah/90",
};

// Tinggi mengikuti spesifikasi: md = 40, lg = 48 (tombol di panel).
// sm = 36 — dipakai untuk aksi sekunder padat; beri padding lega supaya
// target sentuhnya tetap nyaman.
const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-bantu gap-1.5",
  md: "h-10 px-5 text-bantu gap-2",
  lg: "h-12 px-6 text-isi gap-2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        "transition-all duration-150",
        // Cincin fokus: outline 2px tinta dengan offset 2px.
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
        // Umpan balik saat ditekan.
        "active:scale-[0.99]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
