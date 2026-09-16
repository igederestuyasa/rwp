"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, WarningCircle, UploadSimple, X, CaretLeft,
} from "@phosphor-icons/react";
import { KATEGORI_INSIDEN } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { localIsoDate } from "@/lib/utils";
import { validateFiles, formatRejections, ACCEPT_ATTR } from "@/lib/fileValidation";
import { Button } from "@/components/ui/Button";
import { Field, GlassSelect, Input, Textarea } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { Card } from "@/components/ui/Card";
import { StatusLabel } from "@/components/hc/StatusLabel";

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
      <div>
        <p
          className="pembuka-masuk flex items-center gap-2 text-isi font-medium text-redup"
          style={{ animationDelay: "0ms" }}
        >
          <CheckCircle size={20} aria-hidden="true" className="text-sukses" />
          Terkirim
        </p>

        <h1
          className="pembuka-masuk mt-2 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
          style={{ animationDelay: "60ms" }}
        >
          Laporan terkirim
        </h1>

        <p
          className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
          style={{ animationDelay: "110ms" }}
        >
          Laporan Anda diterima tim HC. Simpan nomor tiket berikut untuk melacak
          penanganannya.
        </p>

        <div className="pembuka-masuk mt-8" style={{ animationDelay: "170ms" }}>
          <div className="rounded-[var(--radius-panel)] border border-garis bg-kartu p-4 sm:p-6">
            <p className="text-mikro font-semibold text-redup">Nomor tiket</p>
            <p className="mt-2 font-mono text-panel font-bold tabular tracking-[-0.025em] text-tinta">
              {ticket}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => { setTicket(null); resetForm(); }}
            >
              Buat laporan lain
            </Button>
            <Button onClick={() => router.push("/laporan")}>Lacak laporan</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── State: form utama ── */
  return (
    <div>
      {/* Tombol kembali */}
      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={() => router.back()}
      >
        <CaretLeft size={16} aria-hidden="true" /> Kembali
      </Button>

      {/* ── Pembuka layar ── */}
      <h1
        className="pembuka-masuk mt-6 text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
        style={{ animationDelay: "0ms" }}
      >
        Lapor insiden
      </h1>
      <p
        className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
        style={{ animationDelay: "60ms" }}
      >
        Laporkan pelecehan, diskriminasi, perundungan, atau intimidasi di lingkungan
        kerja.
      </p>
      <div className="pembuka-masuk mt-5" style={{ animationDelay: "110ms" }}>
        <StatusLabel>Identitas pelapor dilindungi</StatusLabel>
      </div>

      {/* ── Form ── */}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {/* Blok: Insiden */}
        <Panel title="Detail insiden">
          <div className="space-y-4">
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
          </div>
        </Panel>

        {/* Blok: Bukti */}
        <Panel title="Bukti pendukung (opsional)">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-input)] border border-dashed border-garis-kuat bg-latar px-6 py-7 text-center transition-colors duration-150 hover:border-tinta">
            <UploadSimple size={20} aria-hidden="true" className="text-redup" />
            <span className="mt-2 text-bantu font-semibold text-tinta">
              Klik untuk mengunggah
            </span>
            <span className="mt-1 text-bantu text-redup">
              Gambar, PDF, dokumen, atau audio · Maks 10 MB per file
            </span>
            <input type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={onFiles} />
          </label>

          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-garis bg-latar px-3.5 py-2.5 text-bantu text-tinta"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Hapus ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-redup transition-colors duration-150 hover:text-merah"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Blok: Anonimitas */}
        <Card>
          <label className="flex cursor-pointer items-start gap-4 p-4 sm:p-6">
            <input
              type="checkbox"
              checked={anonim}
              onChange={(e) => setAnonim(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-garis-kuat accent-tinta"
            />
            <div>
              <p className="text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                Laporkan secara anonim
              </p>
              <p className="mt-1 text-bantu leading-[1.5] text-redup">
                Identitas Anda disembunyikan dari admin HC. Anonimitas bersifat <em>prosedural</em> —
                sistem tetap menyimpan kaitan ke akun untuk keperluan anti-spam dan tindak lanjut jika diperlukan,
                namun tidak ditampilkan kepada siapa pun.
              </p>
            </div>
          </label>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-[var(--radius-input)] border border-garis bg-merah-latar px-4 py-3 text-bantu text-merah">
            <WarningCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pb-2">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Mengirim…" : "Kirim laporan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
