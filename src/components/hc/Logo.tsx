// Logo HC Panel (docs/DESIGN.md §Komponen). Warna seluruhnya lewat token.
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="12" fill="var(--color-tinta)" />
      <path d="M9 9H24A15 15 0 0 1 9 24Z" fill="var(--color-latar)" />
      <circle cx="31.5" cy="16.5" r="7.5" fill="var(--color-merah-ikon)" />
      <rect x="9" y="24" width="15" height="15" fill="var(--color-latar)" />
      <path d="M24 39H39A7.5 7.5 0 0 0 24 39Z" fill="var(--color-latar)" />
    </svg>
  );
}
