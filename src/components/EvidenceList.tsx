"use client";

import { useState } from "react";
import { Paperclip, DownloadSimple, CircleNotch } from "@phosphor-icons/react";
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
    <ul className="space-y-2">
      {files.map((f, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => open(f, i)}
            disabled={!f.path || loading === i}
            className="flex w-full items-center gap-2 rounded-[var(--radius-input)] border border-garis bg-kartu px-3 py-2.5 text-left text-bantu text-tinta transition-colors duration-150 enabled:hover:bg-latar disabled:cursor-default"
          >
            <Paperclip size={16} className="shrink-0 text-redup" aria-hidden />
            <span className="truncate">{f.name}</span>
            {f.path &&
              (loading === i ? (
                <CircleNotch
                  size={16}
                  className="ml-auto shrink-0 animate-spin text-redup"
                  aria-hidden
                />
              ) : (
                <DownloadSimple size={16} className="ml-auto shrink-0 text-redup" aria-hidden />
              ))}
          </button>
        </li>
      ))}
    </ul>
  );
}
