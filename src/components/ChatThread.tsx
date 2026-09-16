"use client";

import { useState, useRef, type FormEvent } from "react";
import {
  PaperPlaneTilt,
  Paperclip,
  X,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getEvidenceUrl } from "@/lib/storage";
import { validateFiles, formatRejections, ACCEPT_ATTR } from "@/lib/fileValidation";
import { formatDateTime } from "@/lib/utils";
import type { EvidenceFile } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

export function ChatThread({ reportId }: { reportId: string }) {
  const { user } = useAuth();
  const { messages, addMessage } = useStore();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const thread = messages.filter((m) => m.reportId === reportId);
  const myRole = user!.role;

  const canSend = (text.trim().length > 0 || files.length > 0) && !sending;

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []); // tangkap sebelum reset
    e.target.value = "";
    const { ok, rejected } = await validateFiles(picked);
    setFileError(rejected.length > 0 ? `Ditolak: ${formatRejections(rejected)}.` : "");
    if (ok.length > 0) setFiles((prev) => [...prev, ...ok]);
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function openAttachment(f: EvidenceFile) {
    if (!f.path) return;
    const url = await getEvidenceUrl(f.path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      await addMessage(reportId, myRole, text.trim(), files.length > 0 ? files : undefined);
      setText("");
      setFiles([]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* Thread */}
      <div className="space-y-4">
        {thread.length === 0 && (
          <p className="py-4 text-center text-bantu text-redup">Belum ada percakapan.</p>
        )}
        {thread.map((m) => {
          const isAdmin = m.senderRole === "admin";
          const mine = m.senderRole === myRole;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[78%]">
                <div
                  className={cn(
                    "rounded-[var(--radius-kartu)] px-3.5 py-2.5 text-bantu leading-relaxed",
                    mine
                      ? "bg-tinta text-kartu"
                      : "border border-garis bg-latar text-tinta",
                  )}
                >
                  {/* Teks pesan */}
                  {m.message && <p className="break-words">{m.message}</p>}

                  {/* Lampiran */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div
                      className={cn(
                        "space-y-1.5",
                        m.message && "mt-2.5 border-t pt-2.5",
                        mine ? "border-kartu/30" : "border-garis",
                      )}
                    >
                      {m.attachments.map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openAttachment(f)}
                          disabled={!f.path}
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded-[var(--radius-input)] border px-2 py-1.5 text-mikro transition-colors duration-150",
                            f.path ? "cursor-pointer" : "cursor-default",
                            mine
                              ? "border-kartu/30 text-kartu enabled:hover:bg-kartu/10"
                              : "border-garis bg-kartu text-tinta enabled:hover:bg-latar",
                          )}
                        >
                          <Paperclip size={14} className="shrink-0" aria-hidden />
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={cn("mt-1.5 text-mikro text-redup", mine && "text-right")}>
                  {isAdmin ? "Admin HC" : "Pelapor"} · {formatDateTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        {/* Preview file sebelum kirim */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-[var(--radius-input)] border border-garis bg-latar px-2.5 py-1.5 text-mikro text-tinta"
              >
                <Paperclip size={14} className="shrink-0 text-redup" aria-hidden />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Hapus lampiran ${f.name}`}
                  className="text-redup transition-colors duration-150 hover:text-merah"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        {fileError && (
          <p className="flex items-start gap-1.5 text-bantu text-merah">
            <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {fileError}
          </p>
        )}

        <div className="flex items-center gap-2">
          {/* Tombol lampiran */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Lampirkan file"
            aria-label="Lampirkan file"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-garis-kuat bg-kartu text-redup transition-colors duration-150 hover:bg-latar hover:text-tinta"
          >
            <Paperclip size={18} aria-hidden />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={onFiles}
          />

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={myRole === "admin" ? "Balas pelapor" : "Tulis pesan untuk Admin HC"}
            placeholder={myRole === "admin" ? "Balas pelapor…" : "Tulis pesan untuk Admin HC…"}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!canSend}
            aria-label="Kirim pesan"
            className="h-11 w-11 shrink-0 p-0"
          >
            <PaperPlaneTilt size={18} aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}
