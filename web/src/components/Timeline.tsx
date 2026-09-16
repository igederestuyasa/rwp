"use client";

import { ShieldWarning } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import type { Report } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { StatusLabelLaporan } from "@/components/hc/StatusLabel";
import { EvidenceList } from "@/components/EvidenceList";

// Prefix ini ditulis oleh database saat identitas pelapor dibuka (CLAUDE.md §2).
// Nilainya HARUS sama persis dengan yang dipakai RPC reveal_reporter.
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
    <ol className="relative space-y-6 border-l border-garis pl-5">
      <li className="relative">
        <Titik />
        <div className="flex flex-wrap items-center gap-2">
          <StatusLabelLaporan status="Diterima" />
          <span className="text-bantu font-medium text-tinta">Laporan dibuat</span>
        </div>
        <p className="mt-1 text-mikro text-redup">{formatDateTime(report.createdAt)}</p>
      </li>

      {entries.map((l) => {
        const isEskalasi = l.note?.startsWith(ESKALASI_PREFIX);

        if (isEskalasi) {
          const reason = l.note!.slice(ESKALASI_PREFIX.length) || "—";
          return (
            <li key={l.id} className="relative">
              <TitikPeringatan />
              <div className="flex items-center gap-1.5">
                <ShieldWarning size={16} className="shrink-0 text-peringatan" aria-hidden />
                <span className="text-bantu font-semibold text-peringatan">
                  Identitas dibuka oleh Admin HC
                </span>
              </div>
              <p className="mt-1 text-mikro text-redup">{formatDateTime(l.createdAt)}</p>
              <p className="mt-1.5 text-bantu text-redup">
                <span className="font-medium text-tinta">Alasan:</span> {reason}
              </p>
            </li>
          );
        }

        return (
          <li key={l.id} className="relative">
            <Titik />
            <StatusLabelLaporan status={l.toStatus} />
            <p className="mt-1.5 text-mikro text-redup">{formatDateTime(l.createdAt)}</p>
            {l.note && <p className="mt-1.5 text-bantu text-redup">{l.note}</p>}
            {l.attachments && l.attachments.length > 0 && (
              <div className="mt-2.5">
                <EvidenceList files={l.attachments} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Titik penanda baris biasa — netral, memakai warna tinta. */
function Titik() {
  return (
    <span
      aria-hidden
      className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-kartu bg-tinta"
    />
  );
}

/** Titik penanda baris eskalasi identitas — memakai token peringatan. */
function TitikPeringatan() {
  return (
    <span
      aria-hidden
      className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-kartu bg-peringatan"
    />
  );
}
