import { cn } from "@/lib/utils";

/**
 * Dekorasi dot-grid untuk latar hero (overlay absolut, putih transparan).
 * Kepekatan via className (mis. "opacity-[0.06]"), kerapatan via size (px).
 */
export function DotGrid({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 opacity-[0.07]", className)}
      style={{
        backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
