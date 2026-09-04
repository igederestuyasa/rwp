"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ShieldAlert, Upload, X, ChevronLeft,
} from "lucide-react";
import { KATEGORI_INSIDEN } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { localIsoDate } from "@/lib/utils";
import { validateFiles, formatRejections, ACCEPT_ATTR } from "@/lib/fileValidation";
import { Button } from "@/components/ui/Button";
import { Field, GlassSelect, Input, Textarea } from "@/components/ui/Field";
import { DotGrid } from "@/components/ui/DotGrid";

export default function LaporPage() {
  const { user } = useAuth();
  const { addReport } = useStore();
  const router = useRouter();

  const [kategori, setKategori] = useState("");
  const [judul, setJudul] = useState("");
  const [kronologi, setKronologi] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [terlapor, setTerlapor] = useState("");
  const [anonim, setAnonim] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lapis 2: admin tidak boleh mengakses form laporan.
  useEffect(() => {
    if (user?.role === "admin") router.replace("/dashboard");
  }, [user, router]);

  if (user?.role === "admin") return null;

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []); // tangkap SEBELUM reset value
    e.target.value = "";
    const { ok, rejected } = await validateFiles(picked);
    if (rejected.length > 0) {
      setError(`Beberapa file ditolak: ${formatRejections(rejected)}.`);
    } else {
      setError("");
    }
    if (ok.length > 0) setFiles((prev) => [...prev, ...ok]);
  }

  function resetForm() {
    setKategori(""); setJudul(""); setKronologi(""); setTanggal("");
    setLokasi(""); setTerlapor(""); setAnonim(false); setFiles([]);
  }

  const today = localIsoDate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!kategori || !judul.trim() || !kronologi.trim() || !tanggal) {
      setError("Kategori, judul, kronologi, dan tanggal wajib diisi.");
      return;
    }
    if (tanggal > today) {
      setError("Tanggal kejadian tidak boleh di masa depan.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const r = await addReport({
        kategori, judul: judul.trim(), kronologi: kronologi.trim(),
        tanggalKejadian: tanggal, lokasi: lokasi.trim() || undefined,
        terlapor: terlapor.trim() || undefined, isAnonymous: anonim,
        reporterName: anonim ? undefined : user?.nama,
        reporterNik: anonim ? undefined : user?.nik,
        files: files.length > 0 ? files : undefined,
      });
      setTicket(r.ticketNo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── State: tiket berhasil dibuat ── */
  if (ticket) {
    return (
      <div className="space-y-4">
        {/* Hero sukses */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-4 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <DotGrid className="opacity-[0.06]" />
          <div className="relative flex flex-col items-center py-4 text-center sm:py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30 backdrop-blur-sm">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Laporan Terkirim</h1>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-emerald-100/90">
              Laporan Anda telah diterima tim HC. Simpan nomor tiket berikut untuk melacak status penanganan.
            </p>
            <div className="mt-5 rounded-2xl bg-white/15 px-8 py-3.5 ring-1 ring-white/25 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Nomor Tiket</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{ticket}</p>
            </div>
          </div>
        </div>

        {/* Aksi */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => { setTicket(null); resetForm(); }}>
            Buat laporan lain
          </Button>
          <Button className="flex-1" onClick={() => router.push("/laporan")}>
            Lacak laporan
          </Button>
        </div>
      </div>
    );
  }

  /* ── State: form utama ── */
  return (
    <div className="space-y-5">
      {/* Tombol kembali */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </button>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        {/* Circles gradient */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, #e11d48 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-24 left-6 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle, #f43f5e 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        {/* Dot grid gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, #f43f5e, #e11d48)",
            WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)",
            maskImage: "radial-gradient(circle, black 1px, transparent 1px)",
            WebkitMaskSize: "22px 22px",
            maskSize: "22px 22px",
            opacity: 0.2,
            animation: "hero-dots 8s linear infinite",
          }}
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}
            >
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(to right, #f43f5e, #e11d48)" }}
              >
                RWP
              </h1>
              <p className="text-sm text-ink-secondary">Respectful Workplace Policy</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            Laporkan pelecehan, diskriminasi, perundungan, atau intimidasi di lingkungan kerja.
            Identitas Anda sebagai pelapor dijamin aman dan terlindungi.
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Blok: Insiden */}
        <FormSection title="Detail Insiden">
          <Field label="Kategori insiden" required>
            <GlassSelect
              value={kategori}
              onChange={setKategori}
              placeholder="— Pilih kategori —"
              options={KATEGORI_INSIDEN.map((k) => ({ value: k, label: k }))}
            />
          </Field>

          <Field label="Judul / ringkasan singkat" required>
            <Input
              maxLength={140}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Perundungan verbal di tim proyek"
            />
          </Field>

          <Field label="Kronologi kejadian" required>
            <Textarea
              rows={6}
              value={kronologi}
              onChange={(e) => setKronologi(e.target.value)}
              placeholder="Jelaskan kejadian secara runut: apa, kapan, di mana, siapa yang terlibat…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal kejadian" required>
              <Input
                type="date"
                value={tanggal}
                max={today}
                onChange={(e) => { setTanggal(e.target.value); setError(""); }}
              />
            </Field>
            <Field label="Lokasi" hint="Opsional">
              <Input
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="mis. Kantor Pusat Lt. 5"
              />
            </Field>
          </div>

          <Field label="Pihak terlapor" hint="Opsional — nama atau inisial">
            <Input
              value={terlapor}
              onChange={(e) => setTerlapor(e.target.value)}
              placeholder="mis. Inisial A.B."
            />
          </Field>
        </FormSection>

        {/* Blok: Bukti */}
        <FormSection title="Bukti Pendukung" hint="Opsional">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-7 text-center transition-colors hover:border-rose-300 hover:bg-rose-50/40 dark:border-slate-600 dark:bg-slate-700/30 dark:hover:border-rose-500/60 dark:hover:bg-rose-900/10">
            <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <span className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Klik untuk mengunggah
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Gambar, PDF, dokumen, atau audio · Maks 10 MB per file
            </span>
            <input type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={onFiles} />
          </label>

          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-600"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="ml-3 shrink-0 text-slate-400 transition-colors hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormSection>

        {/* Blok: Anonimitas */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
          <label className="flex cursor-pointer items-start gap-4 p-5">
            <input
              type="checkbox"
              checked={anonim}
              onChange={(e) => setAnonim(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-300 dark:border-slate-500 dark:focus:ring-rose-600"
            />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Laporkan secara anonim
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Identitas Anda disembunyikan dari admin HC. Anonimitas bersifat <em>prosedural</em> —
                sistem tetap menyimpan kaitan ke akun untuk keperluan anti-spam dan tindak lanjut jika diperlukan,
                namun tidak ditampilkan kepada siapa pun.
              </p>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-800/60">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pb-2">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Mengirim…" : "Kirim Laporan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700/60">
      <div className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-700/60">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {title}
          {hint && (
            <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
              — {hint}
            </span>
          )}
        </h2>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}
