"use client";

import { useState } from "react";
import { Paperclip, Download, Loader2 } from "lucide-react";
import { getEvidenceUrl } from "@/lib/storage";
import type { EvidenceFile } from "@/lib/types";

/** Daftar berkas bukti. Bila punya path Storage → klik untuk buka via signed URL. */
export function EvidenceList({ files }: { files: EvidenceFile[] }) {
  const [loading, setLoading] = useState<number | null>(null);

  async function open(file: EvidenceFile, i: number) {
    if (!file.path) return; // mode mock: tidak ada file asli
    setLoading(i);
    const url = await getEvidenceUrl(file.path);
    setLoading(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <ul className="space-y-1.5">
      {files.map((f, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => open(f, i)}
            disabled={!f.path || loading === i}
            className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100 transition-colors enabled:hover:bg-slate-100 disabled:cursor-default dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600 dark:enabled:hover:bg-slate-600"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="truncate">{f.name}</span>
            {f.path && (
              loading === i
                ? <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
                : <Download className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
