import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Kartu sistem UI "HC Panel": radius 16, border garis, latar kartu, TANPA
// bayangan (docs/DESIGN.md §Prinsip "satu elevasi").
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-kartu)] border border-garis bg-kartu",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-6", className)} {...props} />;
}

/** Judul bagian (h2) — keterangannya selalu ditumpuk di bawah judul. */
export function SectionTitle({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-1", className)}>
      <h2 className="text-bagian font-bold leading-[1.25] tracking-[-0.02em] text-tinta">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-bantu text-redup">{subtitle}</p>}
    </div>
  );
}
