"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  ShieldWarning,
  Paperclip,
  X,
  ArrowCounterClockwise,
  Eye,
  PencilSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { EvidenceList } from "@/components/EvidenceList";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { STATUS_TRANSITIONS } from "@/lib/constants";
import type { Status } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { validateFiles, formatRejections, ACCEPT_ATTR } from "@/lib/fileValidation";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Panel, MetaField, SlaBox } from "@/components/ui/Panel";
import { StatusLabelLaporan } from "@/components/hc/StatusLabel";
import { KosongHC } from "@/components/hc/KosongHC";
import { MemuatHC } from "@/components/hc/MemuatHC";
import { ChatThread } from "@/components/ChatThread";
import { Timeline } from "@/components/Timeline";

// Tombol kembali — bentuk pil sekunder, target sentuh 44px (§Aksesibilitas).
const KELAS_KEMBALI =
  "inline-flex h-11 items-center gap-2 rounded-full border border-garis-kuat bg-kartu px-4 " +
  "text-bantu font-semibold text-tinta transition-colors duration-150 hover:bg-latar";

export default function TiketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { reports, changeStatus, loading } = useStore();
  const report = reports.find((r) => r.id === id);

  if (user?.role !== "admin") {
    return <div className="text-bantu text-redup">Halaman ini hanya untuk admin HC.</div>;
  }

  // Data belum tiba: jangan tampilkan "tidak ditemukan" sebelum tahu.
  if (!report && loading) return <MemuatHC teks="Memuat laporan…" />;

  if (!report) {
    return (
      <div>
        <Link href="/tiket" className={KELAS_KEMBALI}>
          <ArrowLeft size={16} aria-hidden />
          Kembali ke daftar tiket
        </Link>
        <div className="mt-8">
          <KosongHC
            judul="Tiket tidak ditemukan"
            ajakan="Tautannya mungkin keliru atau tiket sudah tidak tersedia. Buka daftar tiket untuk memilih tiket lain."
            aksiLabel="Buka daftar tiket"
            href="/tiket"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Pembuka halaman: tombol kembali, judul, lalu teks pendukung ── */}
      <header>
        <Link href="/tiket" className={`pembuka-masuk ${KELAS_KEMBALI}`}>
          <ArrowLeft size={16} aria-hidden />
          Kembali ke daftar tiket
        </Link>

        <h1
          className="pembuka-masuk mt-6 line-clamp-2 break-words text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
          style={{ animationDelay: "60ms" }}
        >
          {report.judul}
        </h1>

        <div
          className="pembuka-masuk mt-3 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "110ms" }}
        >
          <span className="tabular text-bantu font-medium text-redup">{report.ticketNo}</span>
          <StatusLabelLaporan status={report.status} />
        </div>
      </header>

      {/* ── Isi: detail & tindakan di kiri, riwayat & percakapan di kanan ── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <Panel title="Detail laporan">
            {/* Baris metadata — hanya baris yang ada datanya. */}
            <dl className="grid gap-y-3">
              {report.evidenceCount > 0 && (
                <MetaField label="Lampiran" value={`${report.evidenceCount} berkas`} />
              )}
              {report.kategori && <MetaField label="Kategori" value={report.kategori} />}
              {report.tanggalKejadian && (
                <MetaField
                  label="Tanggal kejadian"
                  value={formatDate(report.tanggalKejadian)}
                />
              )}
              {report.lokasi && <MetaField label="Lokasi" value={report.lokasi} />}
              {report.terlapor && <MetaField label="Terlapor" value={report.terlapor} />}
              <MetaField
                label="Pelaporan"
                value={report.isAnonymous ? "Anonim" : "Teridentifikasi"}
              />
            </dl>

            {/* SLA */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <SlaBox label="Waktu masuk" value={formatDateTime(report.createdAt)} />
              <SlaBox
                label="Waktu selesai"
                value={
                  report.resolvedAt ? formatDateTime(report.resolvedAt) : "Belum selesai"
                }
                muted={!report.resolvedAt}
              />
            </div>

            {/* Deskripsi / Kronologi */}
            <div className="mt-6 border-t border-garis pt-5">
              <p className="mb-2 text-bantu font-semibold text-tinta">Kronologi</p>
              <p className="break-words text-isi leading-relaxed text-redup">
                {report.kronologi}
              </p>
            </div>

            {/* Bukti pelaporan */}
            {report.evidence && report.evidence.length > 0 && (
              <div className="mt-5 border-t border-garis pt-5">
                <p className="mb-3 text-bantu font-semibold text-tinta">
                  Bukti pelaporan ({report.evidence.length} berkas)
                </p>
                <EvidenceList files={report.evidence} />
              </div>
            )}

            {/* Identitas pelapor — gating tetap seperti semula (CLAUDE.md §9.1):
                hanya admin ber-canEscalate yang melihat nama & NIK pelapor. */}
            <div className="mt-5 border-t border-garis pt-5">
              {!report.isAnonymous && report.reporterName ? (
                user?.canEscalate ? (
                  <div>
                    <p className="mb-1.5 text-bantu font-semibold text-tinta">
                      Identitas pelapor
                    </p>
                    <p className="text-bantu font-medium text-tinta">{report.reporterName}</p>
                    <p className="text-mikro text-redup">NIK {report.reporterNik}</p>
                  </div>
                ) : (
                  <p className="text-bantu text-redup">
                    Identitas pelapor hanya dapat dilihat oleh admin dengan wewenang eskalasi.
                  </p>
                )
              ) : report.isAnonymous ? (
                <p className="text-bantu text-redup">
                  Pelapor memilih <span className="font-medium text-tinta">anonim</span> —
                  identitas tersembunyi.
                </p>
              ) : null}
            </div>
          </Panel>

          {/* Tindak lanjut status — key memaksa remount (reset form) saat
              tiket atau statusnya berganti, menggantikan reset via useEffect. */}
          <Panel title="Tindak lanjut status">
            <StatusTindakLanjut
              key={`${report.id}:${report.status}`}
              report={report}
              onChange={changeStatus}
            />
          </Panel>

          {/* Eskalasi identitas — hanya untuk laporan anonim, oleh admin superior */}
          {user?.canEscalate && report.isAnonymous && (
            <Panel title="Eskalasi identitas">
              <Escalation reportId={report.id} />
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Riwayat status">
            <Timeline report={report} hideEscalation={false} />
          </Panel>

          <Panel title="Komunikasi dengan pelapor">
            <ChatThread reportId={report.id} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ── Komponen fungsional ── */

function StatusTindakLanjut({
  report,
  onChange,
}: {
  report: { id: string; status: Status };
  onChange: (
    id: string,
    to: Status,
    note?: string,
    files?: File[],
  ) => void | Promise<void>;
}) {
  const options = STATUS_TRANSITIONS[report.status];
  const [to, setTo] = useState<Status | "">("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<"form" | "review">("form");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []); // tangkap sebelum reset
    e.target.value = "";
    const { ok, rejected } = await validateFiles(picked);
    setErr(
      rejected.length > 0
        ? `Beberapa file ditolak: ${formatRejections(rejected)}.`
        : "",
    );
    if (ok.length > 0) setFiles((prev) => [...prev, ...ok]);
  }

  function toReview() {
    if (!to) {
      setErr("Pilih status tujuan.");
      return;
    }
    if (to === "Ditutup" && !note.trim()) {
      setErr("Status 'Ditutup' wajib disertai alasan.");
      return;
    }
    setErr("");
    setPhase("review");
  }

  async function apply() {
    setSaving(true);
    try {
      await onChange(
        report.id,
        to as Status,
        note.trim() || undefined,
        files.length > 0 ? files : undefined,
      );
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memperbarui status.");
      setPhase("form");
    } finally {
      setSaving(false);
    }
  }

  // Tiket final: tampilkan opsi buka kembali
  if (options.length === 0) {
    return <ReopenSection report={report} onChange={onChange} />;
  }

  if (done) {
    return (
      <p className="flex items-center gap-1.5 text-bantu font-medium text-sukses">
        <CheckCircle size={16} aria-hidden /> Status diperbarui.
      </p>
    );
  }

  // ── Fase review ──
  if (phase === "review") {
    return (
      <div className="space-y-4">
        <div className="space-y-3 rounded-[var(--radius-kartu)] border border-garis bg-latar p-4">
          <p className="text-bantu font-semibold text-tinta">Ringkasan perubahan</p>
          <div className="flex items-center gap-2 text-bantu">
            <span className="text-redup">Status baru:</span>
            <StatusLabelLaporan status={to as Status} />
          </div>
          <div className="text-bantu">
            <span className="text-redup">Catatan: </span>
            <span className="text-tinta">
              {note.trim() || <span className="text-redup">Tidak ada</span>}
            </span>
          </div>
          <div className="text-bantu">
            <span className="text-redup">Lampiran: </span>
            {files.length === 0 ? (
              <span className="text-redup">Tidak ada</span>
            ) : (
              <span className="text-tinta">
                {files.length} file ({files.map((f) => f.name).join(", ")})
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPhase("form")} disabled={saving}>
            <PencilSimple size={16} aria-hidden /> Edit
          </Button>
          <Button onClick={apply} disabled={saving}>
            <CheckCircle size={16} aria-hidden />
            {saving ? "Menerapkan…" : "Konfirmasi & Terapkan"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Fase form ──
  return (
    <div className="space-y-4">
      <Field label="Ubah status ke">
        <Select
          value={to}
          onChange={(e) => {
            setTo(e.target.value as Status);
            setErr("");
          }}
        >
          <option value="">— Pilih —</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Catatan" hint="Wajib bila menutup laporan">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {/* Lampiran */}
      {to && (
        <div>
          <p className="mb-2 text-bantu font-semibold text-tinta">
            Lampiran <span className="font-normal text-redup">(opsional)</span>
          </p>
          <label className={`${KELAS_KEMBALI} cursor-pointer`}>
            <Paperclip size={16} aria-hidden />
            Lampirkan file
            <input
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={onFiles}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-garis bg-latar px-3 py-2.5 text-bantu text-tinta"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    aria-label={`Hapus lampiran ${f.name}`}
                    className="shrink-0 text-redup transition-colors duration-150 hover:text-merah"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {err && (
        <p className="flex items-start gap-1.5 text-bantu text-merah">
          <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {err}
        </p>
      )}
      <Button onClick={toReview}>
        <Eye size={16} aria-hidden /> Tinjau perubahan
      </Button>
    </div>
  );
}

function ReopenSection({
  report,
  onChange,
}: {
  report: { id: string; status: Status };
  onChange: (
    id: string,
    to: Status,
    note?: string,
    files?: File[],
  ) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function reopen() {
    if (!reason.trim()) {
      setErr("Alasan wajib diisi sebelum membuka kembali tiket.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await onChange(
        report.id,
        "Sedang Ditinjau",
        `[Dibuka kembali] ${reason.trim()}`,
      );
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuka kembali tiket.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-1.5 text-bantu font-medium text-sukses">
        <CheckCircle size={16} aria-hidden /> Tiket dibuka kembali & tercatat di log.
      </p>
    );
  }

  return (
    <div>
      <p className="text-bantu text-redup">
        Status <span className="font-medium text-tinta">{report.status}</span> sudah final.
      </p>
      {!open ? (
        <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
          <ArrowCounterClockwise size={16} aria-hidden /> Buka kembali tiket ini
        </Button>
      ) : (
        <div className="mt-4 space-y-3 rounded-[var(--radius-kartu)] border border-garis bg-latar p-4">
          <p className="text-bantu font-semibold text-tinta">Buka kembali tiket</p>
          <p className="text-bantu text-redup">
            Tiket akan dikembalikan ke status <strong className="font-semibold text-tinta">Sedang Ditinjau</strong>.
            Alasan wajib diisi dan akan dicatat di riwayat tiket.
          </p>
          <Field label="Alasan membuka kembali">
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErr("");
              }}
              placeholder="Mis. Ditemukan informasi baru yang perlu ditindaklanjuti…"
            />
          </Field>
          {err && (
            <p className="flex items-start gap-1.5 text-bantu text-merah">
              <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {err}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setErr("");
              }}
              disabled={saving}
            >
              Batal
            </Button>
            <Button variant="danger" onClick={reopen} disabled={saving}>
              <ArrowCounterClockwise size={16} aria-hidden />
              {saving ? "Membuka…" : "Buka kembali"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Escalation({ reportId }: { reportId: string }) {
  const { revealReporter } = useStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onReveal() {
    if (!reason.trim()) {
      setErr("Alasan eskalasi wajib diisi.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const id = await revealReporter(reportId, reason);
      setRevealed(`${id.nama} · NIK ${id.nik}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuka identitas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-bantu text-redup">
        Tindakan ini dicatat di audit log (siapa, kapan, alasan). Gunakan hanya untuk
        eskalasi resmi sesuai prosedur.
      </p>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <ShieldWarning size={16} aria-hidden />
        Buka identitas pelapor
      </Button>
      {open && (
        <div className="mt-4 rounded-[var(--radius-kartu)] border border-garis bg-latar p-4">
          {!revealed ? (
            <>
              <Field label="Alasan eskalasi" required>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setErr("");
                  }}
                  placeholder="Alasan eskalasi (wajib)…"
                  disabled={loading}
                />
              </Field>
              {err && (
                <p className="mt-2 flex items-start gap-1.5 text-bantu text-merah">
                  <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                  {err}
                </p>
              )}
              <div className="mt-4">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onReveal}
                  disabled={loading}
                >
                  {loading ? "Membuka…" : "Buka identitas"}
                </Button>
              </div>
            </>
          ) : (
            <p className="rounded-[var(--radius-input)] border border-garis bg-kartu px-3 py-2.5 text-bantu font-medium text-tinta">
              Identitas pelapor: {revealed}. Pembukaan ini telah dicatat di audit log.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
