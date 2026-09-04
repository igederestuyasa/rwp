"use client";

import { ShieldAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Report } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { StatusPill } from "@/components/ui/StatusPill";
import { EvidenceList } from "@/components/EvidenceList";

const ESKALASI_PREFIX = "[ESKALASI IDENTITAS] ";

/** Timeline status laporan. Baris audit eskalasi disembunyikan dari pelapor by default. */
export function Timeline({
  report,
  hideEscalation = true,
}: {
  report: Report;
  hideEscalation?: boolean;
}) {
  const { logs } = useStore();
  const entries = logs
    .filter((l) => l.reportId === report.id)
    .filter((l) => !(hideEscalation && l.note?.startsWith("[ESKALASI")))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5 dark:border-slate-700">
      <li className="relative">
        <Dot />
        <div className="flex items-center gap-2">
          <StatusPill status="Diterima" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Laporan dibuat</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(report.createdAt)}</p>
      </li>

      {entries.map((l) => {
        const isEskalasi = l.note?.startsWith(ESKALASI_PREFIX);

        if (isEskalasi) {
          const reason = l.note!.slice(ESKALASI_PREFIX.length) || "—";
          return (
            <li key={l.id} className="relative">
              <DotAmber />
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Identitas dibuka oleh Admin HC
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(l.createdAt)}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium">Alasan:</span> {reason}
              </p>
            </li>
          );
        }

        return (
          <li key={l.id} className="relative">
            <Dot />
            <StatusPill status={l.toStatus} />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(l.createdAt)}</p>
            {l.note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{l.note}</p>}
            {l.attachments && l.attachments.length > 0 && (
              <div className="mt-2">
                <EvidenceList files={l.attachments} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Dot() {
  return (
    <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-1 ring-blue-200 dark:border-slate-800" />
  );
}

function DotAmber() {
  return (
    <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400 ring-1 ring-amber-200 dark:border-slate-800 dark:ring-amber-700" />
  );
}
