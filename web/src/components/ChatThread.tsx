"use client";

import { useState, useRef, type FormEvent } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getEvidenceUrl } from "@/lib/storage";
import { validateFiles, formatRejections, ACCEPT_ATTR } from "@/lib/fileValidation";
import { formatDateTime } from "@/lib/utils";
import type { EvidenceFile } from "@/lib/types";
import { Button } from "@/components/ui/Button";

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
      <div className="space-y-3">
        {thread.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            Belum ada percakapan.
          </p>
        )}
        {thread.map((m) => {
          const isAdmin = m.senderRole === "admin";
          const mine = m.senderRole === myRole;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[78%]">
                <div
                  className={
                    mine
                      ? "rounded-2xl rounded-tr-sm bg-blue-600 px-3.5 py-2 text-sm text-white"
                      : "rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  }
                >
                  {/* Teks pesan */}
                  {m.message && <p>{m.message}</p>}

                  {/* Lampiran */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className={`${m.message ? "mt-2 pt-2 border-t" : ""} ${mine ? "border-blue-500" : "border-slate-200"} space-y-1`}>
                      {m.attachments.map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openAttachment(f)}
                          disabled={!f.path}
                          className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${f.path ? "cursor-pointer" : "cursor-default"} ${
                            mine ? "bg-blue-500/50 text-blue-100 enabled:hover:bg-blue-500/70" : "bg-slate-200/60 text-slate-600 enabled:hover:bg-slate-200 dark:bg-slate-600/60 dark:text-slate-300"
                          }`}
                        >
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`mt-1 text-xs text-slate-400 dark:text-slate-500 ${mine ? "text-right" : ""}`}>
                  {isAdmin ? "Admin HC" : "Pelapor"} · {formatDateTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="mt-4 space-y-2">
        {/* Preview file sebelum kirim */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                <Paperclip className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {fileError && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{fileError}</p>
        )}

        <div className="flex items-center gap-2">
          {/* Tombol lampiran */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Lampirkan file"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={onFiles}
          />

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={myRole === "admin" ? "Balas pelapor…" : "Tulis pesan untuk Admin HC…"}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
          />
          <Button type="submit" size="sm" disabled={!canSend} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
