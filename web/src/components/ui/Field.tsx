import {
  useState,
  useRef,
  useEffect,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const baseControl =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition-colors " +
  "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 " +
  "dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 " +
  "dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/30";

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseControl, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(baseControl, "resize-y leading-relaxed", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseControl, "cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

// ── GlassSelect — custom dropdown dengan glass texture ──
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
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          baseControl,
          "flex cursor-pointer items-center justify-between pr-3 text-left",
          !selected && "text-slate-400 dark:text-slate-500",
          open && "border-blue-400 ring-2 ring-blue-100 dark:border-blue-500 dark:ring-blue-900/30",
        )}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-xl dark:border-slate-600/40 dark:bg-slate-800/95">
          <ul className="max-h-64 overflow-y-auto py-1.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-blue-50 font-semibold text-blue-700 dark:bg-white/15 dark:text-white"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-300" />}
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
