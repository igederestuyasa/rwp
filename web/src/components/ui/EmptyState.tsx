import { Inbox } from "lucide-react";

/** Tampilan kosong untuk daftar tiket (admin & karyawan) — teks via props. */
export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
        <Inbox className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
