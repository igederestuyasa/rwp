"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  ShieldAlert,
  Paperclip,
  X,
  RotateCcw,
  Eye,
  Pencil,
  FileText,
  Tag,
  Calendar,
  MapPin,
  User,
  Lock,
  MessageSquare,
} from "lucide-react";
import { EvidenceList } from "@/components/EvidenceList";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { STATUS_TRANSITIONS } from "@/lib/constants";
import type { Status } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { validateFiles, formatRejections, ACCEPT_ATTR } from "@/lib/fileValidation";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Panel, HeroChip, MetaField, SlaBox } from "@/components/ui/Panel";
import { DotGrid } from "@/components/ui/DotGrid";
import { ChatThread } from "@/components/ChatThread";
import { Timeline } from "@/components/Timeline";

export default function TiketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { reports, changeStatus } = useStore();
  const report = reports.find((r) => r.id === id);

  if (user?.role !== "admin") {
    return (
      <div className="text-sm text-slate-500">Halaman ini hanya untuk admin HC.</div>
    );
  }

  if (!report) {
    return (
      <div>
        <Link
          href="/tiket"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Daftar Tiket
        </Link>
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">
            Tiket tidak ditemukan.
          </p>
        </div>
      </div>
    );
  }

  const Icon = ShieldAlert;

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B5BD6] via-[#7A7AE6] to-[#9B5BD6] p-5 text-white sm:p-6">
        {/* Dekorasi latar */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-6 h-80 w-80 rounded-full bg-violet-400/25 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-0 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" />
        <DotGrid />

        <div className="relative">
          {/* Tombol kembali */}
          <Link
            href="/tiket"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-blue-100 ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ChevronLeft className="h-4 w-4" />
            Daftar Tiket
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Ikon tiket */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
              <Icon className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              {/* Nomor + badge + status */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-blue-200">
                  {report.ticketNo}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm">
                  {report.status}
                </span>
                {report.resolvedAt && (
                  <HeroChip
                    icon={<CheckCircle2 className="h-3 w-3" />}
                    label="Selesai"
                  />
                )}
              </div>

              {/* Judul */}
              <h1 className="mt-1 text-lg font-bold leading-snug sm:text-xl">
                {report.judul}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Konten 2 kolom ── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* ── Kolom kiri: detail + tindak lanjut ── */}
        <div className="space-y-5">
          {/* Detail tiket */}
          <Panel title="Detail Tiket">
            {/* Grid meta */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
              <MetaField
                label="Lampiran"
                value={`${report.evidenceCount} berkas`}
                icon={<Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              />
              <MetaField
                label="Kategori"
                value={report.kategori ?? "-"}
                icon={<Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              />
              {report.tanggalKejadian && (
                <MetaField
                  label="Tgl. kejadian"
                  value={formatDate(report.tanggalKejadian)}
                  icon={<Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                />
              )}
              {report.lokasi && (
                <MetaField
                  label="Lokasi"
                  value={report.lokasi}
                  icon={<MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                />
              )}
              {report.terlapor && (
                <MetaField
                  label="Terlapor"
                  value={report.terlapor}
                  icon={<User className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                />
              )}
              <MetaField
                label="Pelaporan"
                value={report.isAnonymous ? "Anonim" : "Teridentifikasi"}
                icon={<Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              />
            </dl>

            {/* SLA */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <SlaBox label="Waktu masuk" value={formatDateTime(report.createdAt)} />
              <SlaBox
                label="Waktu selesai"
                value={
                  report.resolvedAt
                    ? formatDateTime(report.resolvedAt)
                    : "Belum selesai"
                }
                muted={!report.resolvedAt}
              />
            </div>

            {/* Deskripsi / Kronologi */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700/60">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Kronologi
              </p>
              <p className="text-sm leading-relaxed text-slate-600 break-words dark:text-slate-300">
                {report.kronologi}
              </p>
            </div>

            {/* Bukti pelaporan */}
            {report.evidence && report.evidence.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-700/60">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Bukti pelaporan ({report.evidence.length} berkas)
                </p>
                <EvidenceList files={report.evidence} />
              </div>
            )}

            {/* Identitas pelapor */}
            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-700/60">
              {!report.isAnonymous && report.reporterName ? (
                user?.canEscalate ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Identitas pelapor
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {report.reporterName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      NIK {report.reporterNik}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Identitas pelapor hanya dapat dilihat oleh admin dengan wewenang eskalasi.
                  </p>
                )
              ) : report.isAnonymous ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Pelapor memilih{" "}
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    anonim
                  </span>{" "}
                  — identitas tersembunyi.
                </p>
              ) : null}
            </div>
          </Panel>

          {/* Tindak lanjut status — key memaksa remount (reset form) saat
              tiket atau statusnya berganti, menggantikan reset via useEffect. */}
          <Panel title="Tindak Lanjut Status">
            <StatusTindakLanjut
              key={`${report.id}:${report.status}`}
              report={report}
              onChange={changeStatus}
            />
          </Panel>

          {/* Eskalasi identitas — hanya untuk laporan anonim, oleh admin superior */}
          {user?.canEscalate && report.isAnonymous && (
            <Panel title="Eskalasi Identitas">
              <Escalation reportId={report.id} />
            </Panel>
          )}
        </div>

        {/* ── Kolom kanan: riwayat + chat ── */}
        <div className="space-y-5">
          <Panel title="Riwayat Status">
            <Timeline report={report} hideEscalation={false} />
          </Panel>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700/60">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B5BD6] to-[#9B5BD6] text-white shadow-sm">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Komunikasi dengan Pelapor
              </h2>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <ChatThread reportId={report.id} />
            </div>
          </div>
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
      <p className="flex items-center gap-1.5 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" /> Status diperbarui.
      </p>
    );
  }

  // ── Fase review ──
  if (phase === "review") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 dark:border-slate-700 dark:bg-slate-700/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Ringkasan perubahan
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Status baru:</span>
            <StatusPill status={to as Status} />
          </div>
          <div className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Catatan: </span>
            <span className="text-slate-700 dark:text-slate-300">
              {note.trim() || (
                <span className="italic text-slate-400 dark:text-slate-500">
                  Tidak ada
                </span>
              )}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Lampiran: </span>
            {files.length === 0 ? (
              <span className="italic text-slate-400 dark:text-slate-500">
                Tidak ada
              </span>
            ) : (
              <span className="text-slate-700 dark:text-slate-300">
                {files.length} file ({files.map((f) => f.name).join(", ")})
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPhase("form")} disabled={saving}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button onClick={apply} disabled={saving}>
            <CheckCircle2 className="h-4 w-4" />
            {saving ? "Menerapkan…" : "Konfirmasi & Terapkan"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Fase form ──
  return (
    <div className="space-y-3">
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
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Lampiran{" "}
            <span className="font-normal text-slate-400">(opsional)</span>
          </p>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-100/50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-700/30 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-700/60 dark:hover:text-slate-200">
            <Paperclip className="h-4 w-4 shrink-0" />
            Klik untuk melampirkan file
            <input
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={onFiles}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="ml-2 shrink-0 text-slate-400 hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {err && <p className="text-sm text-rose-600">{err}</p>}
      <Button onClick={toReview}>
        <Eye className="h-4 w-4" /> Tinjau Perubahan
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
      <p className="flex items-center gap-1.5 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" /> Tiket dibuka kembali & tercatat di log.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Status{" "}
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {report.status}
        </span>{" "}
        sudah final.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          <RotateCcw className="h-4 w-4" /> Buka kembali tiket ini
        </button>
      ) : (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
            Buka kembali tiket
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Tiket akan dikembalikan ke status{" "}
            <strong>Sedang Ditinjau</strong>. Alasan wajib diisi dan akan
            dicatat di riwayat tiket.
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
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex gap-2">
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
              <RotateCcw className="h-4 w-4" />
              {saving ? "Membuka…" : "Buka Kembali"}
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
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Tindakan ini dicatat di audit log (siapa, kapan, alasan). Gunakan hanya
        untuk eskalasi resmi sesuai prosedur.
      </p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
      >
        <ShieldAlert className="h-4 w-4" />
        Buka identitas pelapor
      </button>
      {open && (
        <div className="mt-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100 dark:bg-amber-900/20 dark:ring-amber-800">
          {!revealed ? (
            <>
              <div>
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
              </div>
              {err && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{err}</p>
              )}
              <div className="mt-3">
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
            <p className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-slate-800 dark:text-amber-200 dark:ring-amber-700">
              Identitas pelapor: {revealed}. Pembukaan ini telah dicatat di
              audit log.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
