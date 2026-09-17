"use client";

// Kelola Kebijakan — halaman admin untuk mengelola isi halaman /kebijakan
// (pola daftar-detail HC Panel, docs/DESIGN.md).
//
// Yang bisa dilakukan di sini:
//   1. Tambah / ubah kebijakan   → insert/update `policies` lewat RLS
//                                  (policies_admin_insert / policies_admin_update).
//   2. Terbitkan / jadikan draft → update `is_published`. Draft tidak sampai ke
//                                  karyawan (RLS), tetapi tampil untuk admin di
//                                  /kebijakan berlabel "Draft" untuk pratinjau.
//   3. Pasang / lepas PDF        → bucket privat `policy-docs`, path acak
//                                  (§9.4: nama asli berkas tidak dipakai).
//   4. Hapus kebijakan           → delete `policies`. Dokumen korpus yang
//                                  bersumber darinya tetap ada (policy_id → NULL)
//                                  dan dihapus terpisah dari /korpus.
//
// Semua tulis-baca memakai token admin yang login, bukan service_role, jadi
// RLS tetap lapis penegaknya (§9.2). Halaman ini tidak menyentuh `reports`,
// `report_messages`, maupun identitas siapa pun.
//
// Mode mock: daftar contoh di memori. Perubahan hidup selama halaman terbuka
// supaya alurnya bisa dicoba; unggah PDF nonaktif karena tidak ada Storage.

import { Suspense, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  CheckCircle,
  CircleNotch,
  Eye,
  EyeSlash,
  FilePdf,
  FloppyDisk,
  Info,
  NotePencil,
  Plus,
  Trash,
  UploadSimple,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { USE_MOCK, getSupabase } from "@/lib/supabaseClient";
import { ASSISTANT_NAME } from "@/lib/constants";
import { POLICIES, type PolicyDoc } from "@/lib/policies";
import { validateFile } from "@/lib/fileValidation";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { DataTable, type Kolom } from "@/components/hc/DataTable";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";
import { DetailPanel } from "@/components/hc/DetailPanel";
import { KosongHC } from "@/components/hc/KosongHC";
import { StatusLabel } from "@/components/hc/StatusLabel";
import { SearchField } from "@/components/hc/SearchField";
import { FilterTabs } from "@/components/hc/FilterTabs";
import { useDaftarDetail } from "@/components/hc/useDaftarDetail";

// ─── Kontrak data ─────────────────────────────────────────────────────────────
// Bentuk baris `policies` apa adanya — kolom yang sama dibaca /kebijakan.

type KebijakanBaris = {
  id: string;
  title: string;
  kategori: string;
  ringkas: string;
  /** Paragraf polos warisan; tidak diedit di sini, hanya dibawa apa adanya. */
  body: string[];
  markdown: string | null;
  pdf_path: string | null;
  is_published: boolean;
  display_order: number;
  updated_at: string;
};

const KOLOM_BARIS =
  "id, title, kategori, ringkas, body, markdown, pdf_path, is_published, display_order, updated_at";

type FilterTerbit = "semua" | "terbit" | "draft";
type Pesan = { nada: "sukses" | "info" | "gagal"; teks: string };

/** Nilai form editor — teks semua supaya input terkontrol; diparse saat simpan. */
type NilaiForm = {
  id: string;
  title: string;
  kategori: string;
  ringkas: string;
  markdown: string;
  display_order: string;
  is_published: boolean;
};
type GalatForm = Partial<Record<keyof NilaiForm | "pdf", string>>;

/** Nasib PDF saat form disimpan. */
type AksiPdf = { jenis: "tetap" } | { jenis: "lepas" } | { jenis: "ganti"; berkas: File };
type HasilForm = { nilai: NilaiForm; pdf: AksiPdf };

/** Bucket & awalan yang sama dengan /api/policy-pdf dan korpus (lib/korpusServer.ts). */
const BUCKET = "policy-docs";
const AWALAN_PDF = "kebijakan";
/** ID kebijakan ikut ke URL (/kebijakan?id=…) dan path Storage, jadi dibatasi slug. */
const POLA_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAKS_ID = 64;

function bentukDokumen(k: KebijakanBaris): string {
  if (k.pdf_path) return "PDF berwatermark";
  if (k.markdown && k.markdown.trim()) return "Teks lengkap";
  return "Belum ada isi";
}

/** Terbit butuh isi: tanpa Markdown atau PDF, karyawan hanya melihat halaman kosong. */
function adaIsi(k: KebijakanBaris): boolean {
  return !!k.pdf_path || !!(k.markdown && k.markdown.trim());
}

function slugDari(judul: string): string {
  return judul
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAKS_ID)
    .replace(/-+$/, "");
}

/** Urutan yang sama dengan /kebijakan: display_order, lalu judul. */
function urutkan(daftar: KebijakanBaris[]): KebijakanBaris[] {
  return [...daftar].sort(
    (a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title, "id"),
  );
}

function namaBerkas(path: string): string {
  return path.split("/").pop() ?? path;
}

function ukuranBerkas(byte: number): string {
  if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024))} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

function pesanGalat(e: unknown, bawaan: string): string {
  // Pelanggaran kunci unik dari PostgREST — kasus yang paling mungkin: ID kembar.
  if (e && typeof e === "object" && (e as { code?: unknown }).code === "23505") {
    return "ID ini sudah dipakai kebijakan lain.";
  }
  if (e instanceof Error && e.message) return e.message;
  // PostgrestError/StorageError punya `message` walau bukan turunan Error.
  if (e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string") {
    return (e as { message: string }).message || bawaan;
  }
  return bawaan;
}

function normalisasiBaris(row: Record<string, unknown>): KebijakanBaris {
  const urut = Number(row.display_order);
  return {
    id: String(row.id),
    title: String(row.title),
    kategori: String(row.kategori),
    ringkas: String(row.ringkas),
    body: Array.isArray(row.body) ? (row.body as string[]) : [],
    markdown: typeof row.markdown === "string" ? row.markdown : null,
    pdf_path: typeof row.pdf_path === "string" && row.pdf_path ? row.pdf_path : null,
    is_published: row.is_published !== false,
    display_order: Number.isFinite(urut) ? urut : 0,
    updated_at: String(row.updated_at),
  };
}

// ─── Data contoh untuk mode mock ─────────────────────────────────────────────
// Handbook dari lib/policies.ts (data yang sama dengan /kebijakan) ditambah
// satu draft kosong — contoh yang sama dipakai /korpus — supaya keadaan
// "draft tanpa isi" ikut terlihat.

function dariPolicyDoc(p: PolicyDoc, i: number): KebijakanBaris {
  return {
    id: p.id,
    title: p.title,
    kategori: p.kategori,
    ringkas: p.ringkas,
    body: p.body,
    markdown: p.markdown ?? null,
    pdf_path: p.pdfPath ?? null,
    is_published: p.isPublished !== false,
    display_order: i,
    updated_at: p.updated,
  };
}

const CONTOH: KebijakanBaris[] = [
  ...POLICIES.map(dariPolicyDoc),
  {
    id: "kode-etik",
    title: "Kode Etik Perilaku",
    kategori: "Hubungan Kerja",
    ringkas: "Draft — isi menyusul dari tim HC.",
    body: [],
    markdown: null,
    pdf_path: null,
    is_published: false,
    display_order: POLICIES.length,
    updated_at: "2026-09-01T10:15:00+07:00",
  },
];

// ─── Akses data (Supabase, lewat RLS admin) ──────────────────────────────────

async function muatDaftar(): Promise<KebijakanBaris[]> {
  const { data, error } = await getSupabase()
    .from("policies")
    .select(KOLOM_BARIS)
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(normalisasiBaris);
}

/** Validasi PDF di klien (§9.4): ekstensi .pdf DAN tanda tangan %PDF. Bucket
 *  membatasi ulang MIME dan ukuran sebagai lapis kedua. */
async function validasiPdf(berkas: File): Promise<string | null> {
  if (!/\.pdf$/i.test(berkas.name)) return "hanya berkas .pdf yang diterima";
  return validateFile(berkas);
}

/** Simpan PDF dengan nama acak di bawah folder kebijakannya (§9.4). */
async function unggahPdf(policyId: string, berkas: File): Promise<string> {
  const path = `${AWALAN_PDF}/${policyId}/${crypto.randomUUID()}.pdf`;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, berkas, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error(`Gagal mengunggah PDF: ${error.message}`);
  return path;
}

/** Bersihkan berkas yang tidak dirujuk lagi. Gagal di sini tidak membatalkan
 *  apa pun — barisnya sudah tersimpan — cukup dicatat untuk diagnosa. */
async function hapusBerkas(path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) console.error(`Gagal menghapus berkas "${path}":`, error.message);
}

// ─── Potongan tampilan ────────────────────────────────────────────────────────

function LabelTerbit({ terbit }: { terbit: boolean }) {
  return (
    <StatusLabel nada={terbit ? "sukses" : "peringatan"}>{terbit ? "Terbit" : "Draft"}</StatusLabel>
  );
}

function BarisPesan({ pesan }: { pesan: Pesan }) {
  const Ikon = pesan.nada === "gagal" ? WarningCircle : pesan.nada === "sukses" ? CheckCircle : Info;
  return (
    <p
      role="status"
      className={cn(
        "mt-3 flex items-start gap-2 text-bantu leading-[1.5]",
        pesan.nada === "gagal" ? "text-merah" : "text-redup",
      )}
    >
      <Ikon
        size={18}
        aria-hidden="true"
        className={cn("mt-0.5 shrink-0", pesan.nada === "sukses" && "text-sukses")}
      />
      <span>{pesan.teks}</span>
    </p>
  );
}

/** Tombol sekunder selebar panel, sejajar tombol aksi utama DetailPanel. */
const KELAS_TOMBOL_PANEL = cn(
  "flex h-12 w-full items-center justify-center gap-2 rounded-full",
  "border border-garis-kuat bg-kartu text-isi font-semibold text-tinta",
  "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
  "active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 disabled:hover:bg-kartu",
);

/** Tautan bergaya tombol sekunder tinggi 44 (Button hanya untuk <button>). */
const KELAS_TAUTAN_SEKUNDER = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5",
  "border border-garis-kuat bg-kartu text-bantu font-semibold text-tinta",
  "transition-colors duration-150 hover:bg-latar",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
);

/** Kontrol PDF di dalam form: tampilkan keadaan sekarang + apa yang akan terjadi saat disimpan. */
function KotakPdf({
  pdfSekarang,
  aksi,
  galat,
  nonaktif,
  onPilih,
  onLepas,
  onUrungkan,
}: {
  pdfSekarang: string | null;
  aksi: AksiPdf;
  galat?: string;
  nonaktif: boolean;
  onPilih: (berkas: File) => void;
  onLepas: () => void;
  onUrungkan: () => void;
}) {
  const idInput = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  let keterangan: { judul: string; sub: string | null };
  if (aksi.jenis === "ganti") {
    keterangan = {
      judul: pdfSekarang ? "PDF akan diganti saat disimpan" : "PDF akan diunggah saat disimpan",
      sub: `${aksi.berkas.name} · ${ukuranBerkas(aksi.berkas.size)}`,
    };
  } else if (aksi.jenis === "lepas") {
    keterangan = {
      judul: "PDF akan dilepas saat disimpan",
      sub: pdfSekarang ? namaBerkas(pdfSekarang) : null,
    };
  } else if (pdfSekarang) {
    keterangan = { judul: "PDF terpasang", sub: namaBerkas(pdfSekarang) };
  } else {
    keterangan = { judul: "Belum ada PDF", sub: "Isi Markdown yang dibaca karyawan." };
  }

  return (
    <div>
      <span className="block text-bantu font-semibold text-tinta">PDF (opsional)</span>
      <p className="mt-2 text-bantu leading-[1.5] text-redup">
        Kalau ada PDF, karyawan membaca PDF berwatermark dan isi Markdown hanya dipakai asisten.
        Maksimal 10 MB.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-input)] border border-garis bg-latar px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-garis bg-kartu text-tinta">
          <FilePdf size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 basis-[200px]">
          <span className="block text-bantu font-medium leading-[1.35] text-tinta">{keterangan.judul}</span>
          {keterangan.sub && (
            <span className="mt-0.5 block truncate text-bantu leading-[1.5] text-redup">{keterangan.sub}</span>
          )}
        </span>

        <span className="flex flex-wrap gap-2">
          {aksi.jenis !== "tetap" ? (
            <Button type="button" variant="secondary" size="sm" onClick={onUrungkan}>
              Urungkan
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={nonaktif}
                onClick={() => inputRef.current?.click()}
              >
                <UploadSimple size={16} aria-hidden="true" />
                {pdfSekarang ? "Ganti PDF" : "Pilih PDF"}
              </Button>
              {pdfSekarang && (
                <Button type="button" variant="secondary" size="sm" onClick={onLepas}>
                  Lepas PDF
                </Button>
              )}
            </>
          )}
        </span>

        <input
          ref={inputRef}
          id={idInput}
          type="file"
          accept=".pdf,application/pdf"
          disabled={nonaktif}
          className="sr-only"
          aria-label="Pilih berkas PDF"
          onChange={(e) => {
            // Tangkap File SEBELUM value direset (jebakan yang pernah terjadi di /lapor).
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onPilih(f);
          }}
        />
      </div>

      {nonaktif && (
        <p className="mt-2 text-bantu leading-[1.5] text-redup">
          Unggah PDF hanya aktif saat terhubung ke Supabase.
        </p>
      )}
      {galat && (
        <p className="mt-2 flex items-start gap-1.5 text-bantu text-merah">
          <WarningCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {galat}
        </p>
      )}
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────
// Menggantikan daftar di kolom kiri saat URL punya `ubah=1` (item `pilih`)
// atau `baru=1`. Semua validasi di sini hanya untuk umpan balik cepat;
// batasan sebenarnya ditegakkan constraint tabel dan RLS.

type PropsForm = {
  awal: KebijakanBaris | null;
  idTerpakai: string[];
  kategoriTersedia: string[];
  sibuk: boolean;
  onSimpan: (hasil: HasilForm) => void;
  onBatal: () => void;
};

function FormKebijakan({ awal, idTerpakai, kategoriTersedia, sibuk, onSimpan, onBatal }: PropsForm) {
  const baru = awal === null;
  const idDatalist = useId();

  const [nilai, setNilai] = useState<NilaiForm>(() => ({
    id: awal?.id ?? "",
    title: awal?.title ?? "",
    kategori: awal?.kategori ?? "",
    ringkas: awal?.ringkas ?? "",
    markdown: awal?.markdown ?? "",
    // Kebijakan baru otomatis di urutan terakhir.
    display_order: String(awal?.display_order ?? idTerpakai.length),
    is_published: awal?.is_published ?? false,
  }));
  // ID diturunkan dari judul sampai admin mengetik ID sendiri.
  const [idManual, setIdManual] = useState(!baru);
  const [pdf, setPdf] = useState<AksiPdf>({ jenis: "tetap" });
  const [galat, setGalat] = useState<GalatForm>({});

  function ubah<K extends keyof NilaiForm>(kunci: K, v: NilaiForm[K]) {
    setNilai((n) => ({ ...n, [kunci]: v }));
    setGalat((g) => (g[kunci] ? { ...g, [kunci]: undefined } : g));
  }

  function ubahJudul(v: string) {
    setNilai((n) => ({ ...n, title: v, ...(baru && !idManual ? { id: slugDari(v) } : {}) }));
    setGalat((g) => (g.title || g.id ? { ...g, title: undefined, id: undefined } : g));
  }

  async function pilihPdf(berkas: File) {
    const alasan = await validasiPdf(berkas);
    if (alasan) {
      setGalat((g) => ({ ...g, pdf: `Berkas “${berkas.name}” ditolak: ${alasan}.` }));
      return;
    }
    setGalat((g) => ({ ...g, pdf: undefined, is_published: undefined }));
    setPdf({ jenis: "ganti", berkas });
  }

  function validasi(): GalatForm {
    const g: GalatForm = {};
    const id = nilai.id.trim();
    if (baru) {
      if (!id) g.id = "ID wajib diisi.";
      else if (id.length > MAKS_ID) g.id = `Maksimal ${MAKS_ID} karakter.`;
      else if (!POLA_ID.test(id)) g.id = "Hanya huruf kecil, angka, dan tanda hubung, misalnya kode-etik.";
      else if (idTerpakai.includes(id)) g.id = "ID ini sudah dipakai kebijakan lain.";
    }
    if (!nilai.title.trim()) g.title = "Judul wajib diisi.";
    if (!nilai.kategori.trim()) g.kategori = "Kategori wajib diisi.";
    if (!nilai.ringkas.trim()) g.ringkas = "Ringkasan wajib diisi.";
    const urut = Number(nilai.display_order);
    if (nilai.display_order.trim() === "" || !Number.isInteger(urut) || urut < 0) {
      g.display_order = "Isi bilangan bulat 0 atau lebih.";
    }
    const adaPdfAkhir =
      pdf.jenis === "ganti" ? true : pdf.jenis === "lepas" ? false : !!awal?.pdf_path;
    if (nilai.is_published && !nilai.markdown.trim() && !adaPdfAkhir) {
      g.is_published = "Isi Markdown atau pasang PDF dulu sebelum menerbitkan.";
    }
    return g;
  }

  function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sibuk) return;
    const g = validasi();
    if (Object.values(g).some(Boolean)) {
      setGalat(g);
      return;
    }
    onSimpan({
      nilai: {
        ...nilai,
        id: nilai.id.trim(),
        title: nilai.title.trim(),
        kategori: nilai.kategori.trim(),
        ringkas: nilai.ringkas.trim(),
        display_order: nilai.display_order.trim(),
      },
      pdf,
    });
  }

  return (
    <form onSubmit={kirim} noValidate>
      <Button type="button" variant="secondary" className="h-11" onClick={onBatal} disabled={sibuk}>
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke daftar kebijakan
      </Button>

      <header className="mt-6">
        <h1 className="text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta">
          {baru ? "Kebijakan baru" : "Ubah kebijakan"}
        </h1>
        <p className="mt-3 max-w-[44ch] text-subjudul leading-[1.5] text-redup">
          {baru
            ? "Simpan sebagai draft dulu, terbitkan setelah isinya lengkap."
            : "Perubahan langsung tampil di halaman Kebijakan RWP begitu disimpan."}
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <Panel title="Identitas dokumen">
          <div className="space-y-4">
            <Field label="Judul" required error={galat.title}>
              <Input
                value={nilai.title}
                onChange={(e) => ubahJudul(e.target.value)}
                maxLength={160}
                placeholder="mis. Respectful Workplace Policy (RWP)"
                autoFocus={baru}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Kategori"
                required
                error={galat.kategori}
                hint="Satu sampai tiga kata, tampil sebagai label di kartu dokumen."
              >
                <Input
                  list={idDatalist}
                  value={nilai.kategori}
                  onChange={(e) => ubah("kategori", e.target.value)}
                  maxLength={30}
                  placeholder="mis. Hubungan Kerja"
                />
                <datalist id={idDatalist}>
                  {kategoriTersedia.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </Field>

              <Field
                label="Urutan tampil"
                required
                error={galat.display_order}
                hint="Angka kecil tampil lebih dulu."
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={nilai.display_order}
                  onChange={(e) => ubah("display_order", e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="ID"
              required={baru}
              error={galat.id}
              hint={
                baru
                  ? "Dipakai di tautan (/kebijakan?id=…) dan tidak bisa diubah setelah disimpan. Otomatis dari judul, boleh diganti."
                  : `ID tidak bisa diubah — tautan ${ASSISTANT_NAME} dan korpus bergantung padanya.`
              }
            >
              <Input
                value={nilai.id}
                disabled={!baru}
                onChange={(e) => {
                  setIdManual(true);
                  ubah("id", e.target.value.toLowerCase());
                }}
                maxLength={MAKS_ID}
                className="font-mono"
                placeholder="mis. kode-etik"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>

            <Field
              label="Ringkasan"
              required
              error={galat.ringkas}
              hint="Satu dua kalimat untuk kartu daftar dan panel detail."
            >
              <Textarea
                rows={3}
                value={nilai.ringkas}
                onChange={(e) => ubah("ringkas", e.target.value)}
                maxLength={400}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Isi dokumen">
          <div className="space-y-4">
            <Field
              label="Isi (Markdown)"
              hint={`Dirender di halaman Kebijakan bila tidak ada PDF, dan inilah yang dipelajari ${ASSISTANT_NAME} saat dikirim ke korpus.`}
            >
              <Textarea
                rows={18}
                value={nilai.markdown}
                onChange={(e) => ubah("markdown", e.target.value)}
                className="font-mono text-bantu leading-[1.55]"
                placeholder={"## Bab I\n\nTulis isi kebijakan di sini…"}
                spellCheck={false}
              />
            </Field>

            <KotakPdf
              pdfSekarang={awal?.pdf_path ?? null}
              aksi={pdf}
              galat={galat.pdf}
              nonaktif={USE_MOCK || sibuk}
              onPilih={pilihPdf}
              onLepas={() => setPdf({ jenis: "lepas" })}
              onUrungkan={() => {
                setPdf({ jenis: "tetap" });
                setGalat((g) => (g.pdf ? { ...g, pdf: undefined } : g));
              }}
            />
          </div>
        </Panel>

        <Panel title="Penerbitan">
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              checked={nilai.is_published}
              onChange={(e) => ubah("is_published", e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-garis-kuat accent-tinta"
            />
            <span>
              <span className="block text-isi leading-[1.35] font-[650] tracking-[-0.01em] text-tinta">
                Terbitkan ke karyawan
              </span>
              <span className="mt-1 block text-bantu leading-[1.5] text-redup">
                Tidak dicentang berarti draft: hanya admin yang melihatnya di halaman Kebijakan RWP,
                berlabel “Draft”.
              </span>
            </span>
          </label>
          {galat.is_published && (
            <p className="mt-3 flex items-start gap-1.5 text-bantu text-merah">
              <WarningCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              {galat.is_published}
            </p>
          )}
        </Panel>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11" disabled={sibuk}>
            {sibuk ? (
              <CircleNotch size={18} aria-hidden="true" className="animate-spin" />
            ) : (
              <FloppyDisk size={18} aria-hidden="true" />
            )}
            {baru ? "Simpan kebijakan" : "Simpan perubahan"}
          </Button>
          <Button type="button" variant="secondary" className="h-11" onClick={onBatal} disabled={sibuk}>
            Batal
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Isi halaman ──────────────────────────────────────────────────────────────

// Kolom Judul mengambil sisa lebar; kolom tetap dijaga ramping supaya judul
// tidak terpotong di lebar kolom daftar (~640px pada 1440). Urutan tampil
// tidak dijadikan kolom — urutan barisnya sendiri sudah menunjukkannya, dan
// angkanya ada di panel detail.
const KOLOM_TABEL: Kolom<KebijakanBaris>[] = [
  {
    kunci: "judul",
    judul: "Judul",
    render: (d) => <span className="line-clamp-2 break-words">{d.title}</span>,
  },
  {
    kunci: "kategori",
    judul: "Kategori",
    lebar: "128px",
    render: (d) => <StatusLabel>{d.kategori}</StatusLabel>,
  },
  {
    kunci: "status",
    judul: "Status",
    lebar: "76px",
    render: (d) => <LabelTerbit terbit={d.is_published} />,
  },
  {
    kunci: "bentuk",
    judul: "Bentuk",
    lebar: "124px",
    render: (d) => <span className="whitespace-nowrap text-redup">{bentukDokumen(d)}</span>,
  },
  {
    kunci: "diperbarui",
    judul: "Diperbarui",
    lebar: "100px",
    render: (d) => <span className="whitespace-nowrap text-redup">{formatDate(d.updated_at)}</span>,
  },
];

const TAB_FILTER: { id: FilterTerbit; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "terbit", label: "Terbit" },
  { id: "draft", label: "Draft" },
];

function KelolaKebijakanIsi() {
  const pathname = usePathname();
  const params = useSearchParams();
  const daftarRef = useRef<HTMLDivElement>(null);
  const mobilRef = useRef<HTMLDivElement>(null);

  // Data — mock langsung dari contoh, Supabase lewat effect di bawah.
  const [daftar, setDaftar] = useState<KebijakanBaris[]>(USE_MOCK ? CONTOH : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Menaikkan `versi` memicu muat ulang dari tabel.
  const [versi, setVersi] = useState(0);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTerbit>("semua");
  // Satu aksi pada satu waktu: "simpan" | "terbit:<id>" | "hapus:<id>".
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState<Pesan | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    let batal = false;

    async function load() {
      try {
        const data = await muatDaftar();
        if (batal) return;
        setDaftar(data);
        setFetchError(null);
      } catch (e) {
        if (!batal) setFetchError(pesanGalat(e, "Gagal memuat daftar kebijakan."));
      } finally {
        if (!batal) setLoading(false);
      }
    }

    load();
    return () => {
      batal = true;
    };
  }, [versi]);

  const muatUlang = () => setVersi((v) => v + 1);

  const jumlahTerbit = daftar.filter((d) => d.is_published).length;
  const jumlahDraft = daftar.length - jumlahTerbit;

  const tampil = useMemo(() => {
    const q = query.toLowerCase().trim();
    return daftar.filter((d) => {
      if (filter !== "semua" && (filter === "terbit") !== d.is_published) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.kategori.toLowerCase().includes(q) ||
        d.ringkas.toLowerCase().includes(q) ||
        d.id.includes(q)
      );
    });
  }, [daftar, filter, query]);

  // Pemilihan panel detail: hover intent 120ms, fokus memilih, id di `?pilih=`.
  const { terpilih, pilih, propsHover } = useDaftarDetail<KebijakanBaris>({
    items: tampil,
    idDari: (d) => d.id,
  });

  // ── Editor di URL ─────────────────────────────────────────────────────────
  // `baru=1` → form kosong; `ubah=1` → form untuk item `pilih`. Disimpan di URL
  // supaya bisa di-refresh dan dituju dari /kebijakan ("Ubah kebijakan").
  // URL diubah lewat window.history.replaceState — alasannya sama dengan
  // useDaftarDetail (router.replace diam saja pada halaman statis).
  const modeBaru = params.get("baru") === "1";
  const modeUbah = !modeBaru && params.get("ubah") === "1" && terpilih !== null;
  const mengedit = modeBaru || modeUbah;

  function ubahUrl(perubahan: Record<string, string | null>, gulir: boolean) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(perubahan)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    window.history.replaceState(null, "", q.size > 0 ? `${pathname}?${q.toString()}` : pathname);
    // Berganti antara daftar dan editor terasa seperti pindah halaman → ke atas.
    if (gulir) window.scrollTo({ top: 0 });
  }
  function bukaEditor(d: KebijakanBaris) {
    setPesan(null);
    pilih(d.id);
    ubahUrl({ pilih: d.id, ubah: "1", baru: null }, true);
  }
  function bukaBaru() {
    setPesan(null);
    ubahUrl({ baru: "1", ubah: null }, true);
  }
  function tutupEditor() {
    ubahUrl({ ubah: null, baru: null }, true);
  }

  // ── Aksi ──────────────────────────────────────────────────────────────────

  async function simpan({ nilai, pdf }: HasilForm) {
    if (sibuk !== null) return;
    const awal = modeBaru ? null : terpilih;
    setPesan(null);
    setSibuk("simpan");

    const sekarang = new Date().toISOString();
    let pathBaru: string | null = null;
    let tersimpan = false;
    try {
      // PDF naik dulu supaya path-nya ikut tersimpan di baris yang sama.
      if (pdf.jenis === "ganti") pathBaru = await unggahPdf(nilai.id, pdf.berkas);
      const pdfPath =
        pdf.jenis === "ganti" ? pathBaru : pdf.jenis === "lepas" ? null : (awal?.pdf_path ?? null);

      const payload = {
        title: nilai.title,
        kategori: nilai.kategori,
        ringkas: nilai.ringkas,
        markdown: nilai.markdown.trim() ? nilai.markdown : null,
        pdf_path: pdfPath,
        is_published: nilai.is_published,
        display_order: Number(nilai.display_order),
        // Tabel policies tidak punya trigger updated_at; diisi dari sini.
        updated_at: sekarang,
      };

      let baris: KebijakanBaris;
      if (USE_MOCK) {
        baris = { id: nilai.id, body: awal?.body ?? [], ...payload };
      } else if (awal) {
        const { data, error } = await getSupabase()
          .from("policies")
          .update(payload)
          .eq("id", awal.id)
          .select(KOLOM_BARIS)
          .single();
        if (error) throw error;
        baris = normalisasiBaris(data as Record<string, unknown>);
      } else {
        const { data, error } = await getSupabase()
          .from("policies")
          .insert({ id: nilai.id, body: [], ...payload })
          .select(KOLOM_BARIS)
          .single();
        if (error) throw error;
        baris = normalisasiBaris(data as Record<string, unknown>);
      }
      tersimpan = true;

      // Berkas lama tidak dirujuk lagi → bersihkan (gagal pun tidak apa-apa).
      const pathLama = awal?.pdf_path ?? null;
      if (!USE_MOCK && pathLama && pathLama !== baris.pdf_path) await hapusBerkas(pathLama);

      setDaftar((prev) =>
        urutkan(awal ? prev.map((d) => (d.id === awal.id ? baris : d)) : [...prev, baris]),
      );
      // Jangan sampai baris yang baru disimpan langsung tersembunyi filter tab.
      if (filter !== "semua" && (filter === "terbit") !== baris.is_published) setFilter("semua");
      pilih(baris.id);
      ubahUrl({ pilih: baris.id, ubah: null, baru: null }, true);

      const isiBerubah = awal !== null && (awal.markdown ?? "") !== (baris.markdown ?? "");
      setPesan(
        awal
          ? {
              nada: "sukses",
              teks: isiBerubah
                ? `“${baris.title}” tersimpan. Isi Markdown berubah — kalau kebijakan ini ada di korpus, kirim ulang dari halaman Korpus AI supaya ${ASSISTANT_NAME} ikut diperbarui.`
                : `“${baris.title}” tersimpan.`,
            }
          : {
              nada: "sukses",
              teks: `“${baris.title}” ditambahkan sebagai ${baris.is_published ? "kebijakan terbit" : "draft"}.`,
            },
      );
    } catch (e) {
      // Baris gagal tersimpan tetapi PDF telanjur naik → jangan tinggalkan berkas yatim.
      if (pathBaru && !tersimpan) await hapusBerkas(pathBaru);
      setPesan({ nada: "gagal", teks: `Gagal menyimpan kebijakan: ${pesanGalat(e, "permintaan ditolak.")}` });
    } finally {
      setSibuk(null);
    }
  }

  async function ubahTerbit(d: KebijakanBaris, terbit: boolean) {
    if (sibuk !== null) return;
    setPesan(null);
    if (terbit && !adaIsi(d)) {
      setPesan({
        nada: "gagal",
        teks: `“${d.title}” belum punya isi Markdown atau PDF, lengkapi dulu sebelum diterbitkan.`,
      });
      return;
    }

    setSibuk(`terbit:${d.id}`);
    const sekarang = new Date().toISOString();
    try {
      let baris: KebijakanBaris = { ...d, is_published: terbit, updated_at: sekarang };
      if (!USE_MOCK) {
        const { data, error } = await getSupabase()
          .from("policies")
          .update({ is_published: terbit, updated_at: sekarang })
          .eq("id", d.id)
          .select(KOLOM_BARIS)
          .single();
        if (error) throw error;
        baris = normalisasiBaris(data as Record<string, unknown>);
      }
      setDaftar((prev) => prev.map((x) => (x.id === d.id ? baris : x)));
      setPesan({
        nada: "sukses",
        teks: terbit
          ? `“${d.title}” diterbitkan dan sekarang terlihat karyawan.`
          : `“${d.title}” dijadikan draft dan tidak lagi terlihat karyawan.`,
      });
    } catch (e) {
      setPesan({
        nada: "gagal",
        teks: `Gagal mengubah status “${d.title}”: ${pesanGalat(e, "permintaan ditolak.")}`,
      });
    } finally {
      setSibuk(null);
    }
  }

  async function hapus(d: KebijakanBaris) {
    if (sibuk !== null) return;
    const yakin = window.confirm(
      `Hapus “${d.title}”?\n\nDokumen hilang dari halaman Kebijakan RWP${
        d.pdf_path ? " beserta PDF-nya" : ""
      }. Dokumen korpus yang bersumber darinya tetap ada dan dihapus terpisah dari Korpus AI. Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!yakin) return;

    setPesan(null);
    setSibuk(`hapus:${d.id}`);
    try {
      if (!USE_MOCK) {
        const { error } = await getSupabase().from("policies").delete().eq("id", d.id);
        if (error) throw error;
        if (d.pdf_path) await hapusBerkas(d.pdf_path);
      }
      setDaftar((prev) => prev.filter((x) => x.id !== d.id));
      ubahUrl({ pilih: null, ubah: null, baru: null }, mengedit);
      setPesan({ nada: "sukses", teks: `“${d.title}” dihapus.` });
    } catch (e) {
      setPesan({ nada: "gagal", teks: `Gagal menghapus “${d.title}”: ${pesanGalat(e, "permintaan ditolak.")}` });
    } finally {
      setSibuk(null);
    }
  }

  // ── Turunan untuk tampilan ────────────────────────────────────────────────

  const aksiMati = sibuk !== null;
  const adaDaftar = !loading && !fetchError && daftar.length > 0;
  const kategoriTersedia = useMemo(
    () => Array.from(new Set(daftar.map((d) => d.kategori))).sort((a, b) => a.localeCompare(b, "id")),
    [daftar],
  );
  const idTerpakai = daftar.map((d) => d.id);

  const detail =
    terpilih && !modeBaru
      ? {
          nama: terpilih.title,
          kategori: terpilih.kategori,
          status: <LabelTerbit terbit={terpilih.is_published} />,
          deskripsi: terpilih.ringkas,
          baris: [
            { label: "Bentuk", nilai: bentukDokumen(terpilih) },
            { label: "Urutan", nilai: String(terpilih.display_order) },
            { label: "Diperbarui", nilai: formatDateTime(terpilih.updated_at) },
            { label: "ID", nilai: <span className="font-mono break-all">{terpilih.id}</span> },
          ],
        }
      : null;

  // Panah bawah dari kolom cari: ke baris/kartu pertama YANG TERLIHAT — tabel
  // (desktop) dan kartu (HP) sama-sama ada di DOM, hanya satu yang tampil.
  function fokusPertama() {
    const kandidat = daftarRef.current?.querySelectorAll<HTMLElement>('tr[data-baris="ya"], button');
    if (!kandidat) return;
    for (const el of kandidat) {
      if (el.offsetParent !== null) {
        el.focus();
        return;
      }
    }
  }

  function pilihDariKartu(d: KebijakanBaris) {
    pilih(d.id);
    // Di HP panel disembunyikan; ringkasan + tombol aksi ada di bawah daftar.
    mobilRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-y-12 pt-6",
        "lg:grid-cols-[minmax(0,1fr)_clamp(320px,36%,400px)] lg:gap-x-16 lg:gap-y-8 lg:pt-8",
        // Baris konten `1fr`, bukan `auto`: panel detail membentang dua baris dan
        // tingginya berubah tiap item berganti. Kalau kedua baris `auto`, tinggi
        // ekstra panel dibagi ke baris pembuka juga, dan tabel yang sedang disorot
        // kursor bergeser ke bawah — klik pun luput (mousedown dan mouseup jatuh
        // di baris berbeda). Daftar di sini pendek, jadi kasus ini nyata.
        "lg:grid-rows-[auto_1fr]",
      )}
    >
      {mengedit ? (
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <FormKebijakan
            key={modeBaru ? "baru" : terpilih?.id}
            awal={modeBaru ? null : terpilih}
            idTerpakai={idTerpakai}
            kategoriTersedia={kategoriTersedia}
            sibuk={sibuk === "simpan"}
            onSimpan={simpan}
            onBatal={tutupEditor}
          />
          {pesan && <BarisPesan pesan={pesan} />}
        </div>
      ) : (
        <>
          {/* Pembuka: h1, subjudul, kontrol utama (§Spasi — maksimal 4 elemen teks) */}
          <header className="min-w-0 lg:col-start-1 lg:row-start-1">
            <h1 className="pembuka-masuk text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta">
              Kelola Kebijakan
            </h1>
            <p
              className="pembuka-masuk mt-3 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
              style={{ animationDelay: "60ms" }}
            >
              {loading
                ? "Memuat daftar kebijakan."
                : `${jumlahTerbit} terbit dan ${jumlahDraft} draft. Yang terbit dibaca karyawan di halaman Kebijakan RWP.`}
            </p>

            <div className="pembuka-masuk mt-8 max-w-xl" style={{ animationDelay: "110ms" }}>
              <SearchField
                label="Cari kebijakan"
                value={query}
                onChange={setQuery}
                placeholder="Judul, kategori, ringkasan, atau ID"
                hasilInfo={`${tampil.length} kebijakan cocok`}
                onArrowDown={fokusPertama}
                onEnter={() => {
                  if (tampil.length > 0 && !aksiMati) bukaEditor(tampil[0]);
                }}
                nonaktif={loading || !!fetchError}
              />
              {USE_MOCK && (
                <p className="mt-3 rounded-[var(--radius-input)] border border-dashed border-garis-putus px-4 py-3 text-bantu leading-[1.5] text-redup">
                  Mode demo: perubahan hanya tersimpan di halaman ini sampai dimuat ulang, dan
                  unggah PDF nonaktif.
                </p>
              )}
              {pesan && <BarisPesan pesan={pesan} />}
            </div>
          </header>

          {/* Konten kiri */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="judul-daftar">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <h2
                      id="judul-daftar"
                      className="text-bagian leading-[1.25] font-bold tracking-[-0.02em] text-tinta"
                    >
                      Kebijakan
                    </h2>
                    {!loading && !fetchError && (
                      <span className="text-bantu font-medium text-redup tabular-nums">{daftar.length}</span>
                    )}
                  </div>
                  <p className="mt-1 text-bantu leading-[1.5] text-redup">
                    Klik baris untuk mengubah isinya. Draft hanya terlihat admin.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={bukaBaru}
                  disabled={loading || !!fetchError || aksiMati}
                >
                  <Plus size={18} aria-hidden="true" />
                  Tambah kebijakan
                </Button>
              </div>

              {adaDaftar && (
                <FilterTabs
                  className="mt-4"
                  label="Status terbit"
                  aktif={filter}
                  onPilih={(id) => setFilter(id as FilterTerbit)}
                  items={TAB_FILTER.map((t) => ({
                    ...t,
                    jumlah: t.id === "semua" ? daftar.length : t.id === "terbit" ? jumlahTerbit : jumlahDraft,
                  }))}
                />
              )}

              <div ref={daftarRef} className="mt-4">
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-16 text-bantu text-redup">
                    <CircleNotch size={20} aria-hidden="true" className="animate-spin" />
                    Memuat daftar kebijakan…
                  </div>
                )}

                {!loading && fetchError && (
                  <div className="flex flex-col items-center gap-3 rounded-[var(--radius-kartu)] border border-dashed border-garis-putus px-6 py-10 text-center">
                    <Warning size={24} aria-hidden="true" className="text-merah" />
                    <p className="text-subjudul leading-[1.3] font-bold tracking-[-0.02em] text-tinta">
                      Gagal memuat daftar kebijakan
                    </p>
                    <p className="max-w-[44ch] text-bantu leading-[1.5] text-redup">{fetchError}</p>
                    <Button variant="secondary" className="mt-2 h-11" onClick={muatUlang}>
                      Coba lagi
                    </Button>
                  </div>
                )}

                {!loading && !fetchError && daftar.length === 0 && (
                  <KosongHC
                    judul="Belum ada kebijakan"
                    ajakan="Tambahkan dokumen kebijakan RWP pertama, simpan sebagai draft, lalu terbitkan begitu isinya siap dibaca karyawan."
                    aksiLabel="Tambah kebijakan"
                    onAksi={aksiMati ? undefined : bukaBaru}
                  />
                )}

                {adaDaftar && tampil.length === 0 && (
                  <KosongHC
                    judul="Tidak ada kebijakan yang cocok"
                    ajakan={
                      query
                        ? `Tidak ada dokumen yang memuat “${query}” pada filter ini, coba kata kunci lain atau hapus pencarian.`
                        : "Tidak ada dokumen dengan status ini, ganti tab filter atau tambahkan kebijakan baru."
                    }
                    aksiLabel={query ? "Hapus pencarian" : "Tampilkan semua"}
                    onAksi={() => {
                      setQuery("");
                      setFilter("semua");
                    }}
                  />
                )}

                {adaDaftar && tampil.length > 0 && (
                  <>
                    {/* Desktop: tabel. Sorot baris = pilih untuk panel; klik/Enter = ubah. */}
                    <div className="hidden lg:block">
                      <DataTable<KebijakanBaris>
                        label="Daftar kebijakan"
                        kolom={KOLOM_TABEL}
                        data={tampil}
                        kunciBaris={(d) => d.id}
                        terpilih={terpilih?.id ?? null}
                        onPilih={(d) => pilih(d.id)}
                        onBuka={(d) => {
                          if (!aksiMati) bukaEditor(d);
                        }}
                      />
                    </div>

                    {/* Di bawah 1024px: kartu, ketuk = pilih lalu aksi di blok bawah */}
                    <div className="lg:hidden">
                      <ItemCardGrid>
                        {tampil.map((d, i) => {
                          const hover = propsHover(d);
                          return (
                            <ItemCard
                              key={d.id}
                              nama={d.title}
                              deskripsi={`${d.kategori} · ${bentukDokumen(d)} · ${formatDate(d.updated_at)}`}
                              status={<LabelTerbit terbit={d.is_published} />}
                              indeks={i}
                              terpilih={hover.terpilih}
                              onPilih={hover.onPilih}
                              onMouseEnter={hover.onMouseEnter}
                              onMouseLeave={hover.onMouseLeave}
                              onBuka={() => pilihDariKartu(d)}
                            />
                          );
                        })}
                      </ItemCardGrid>
                    </div>

                    {/* Ringkasan + aksi untuk HP (panel detail disembunyikan di bawah 1024px) */}
                    {terpilih && (
                      <div
                        ref={mobilRef}
                        className="mt-6 rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4 lg:hidden"
                      >
                        <p className="text-bantu leading-[1.35] font-[650] text-tinta">Kebijakan terpilih</p>
                        <p className="mt-2 text-isi leading-[1.35] font-[650] tracking-[-0.01em] text-tinta">
                          {terpilih.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-bantu font-medium text-redup">
                          <span>{terpilih.kategori}</span>
                          <LabelTerbit terbit={terpilih.is_published} />
                          <span>{bentukDokumen(terpilih)}</span>
                        </div>
                        <p className="mt-2 text-bantu leading-[1.5] text-redup">{terpilih.ringkas}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button className="h-11" disabled={aksiMati} onClick={() => bukaEditor(terpilih)}>
                            <NotePencil size={18} aria-hidden="true" />
                            Ubah
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-11"
                            disabled={aksiMati}
                            onClick={() => ubahTerbit(terpilih, !terpilih.is_published)}
                          >
                            {terpilih.is_published ? (
                              <EyeSlash size={18} aria-hidden="true" />
                            ) : (
                              <Eye size={18} aria-hidden="true" />
                            )}
                            {terpilih.is_published ? "Jadikan draft" : "Terbitkan"}
                          </Button>
                          <Link
                            href={`/kebijakan?id=${encodeURIComponent(terpilih.id)}`}
                            className={KELAS_TAUTAN_SEKUNDER}
                          >
                            <ArrowSquareOut size={18} aria-hidden="true" />
                            Lihat
                          </Link>
                          <Button
                            variant="secondary"
                            className="h-11"
                            disabled={aksiMati}
                            onClick={() => hapus(terpilih)}
                          >
                            <Trash size={18} aria-hidden="true" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Kaki: pengingat sinkron dengan korpus (CLAUDE.md §3) */}
            <p className="mt-12 border-t border-garis pt-6 text-bantu leading-[1.5] text-redup">
              Perubahan isi Markdown tidak otomatis sampai ke {ASSISTANT_NAME}: setelah menyimpan,
              kirim ulang kebijakan itu dari halaman Korpus AI.
            </p>
          </div>
        </>
      )}

      {/* Panel detail — desktop saja, menempel di atas (§Pola daftar-detail) */}
      <div className="hidden lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:self-start">
        <DetailPanel
          entitas="kebijakan"
          item={detail}
          aksiLabel={modeUbah ? "Sedang diubah" : "Ubah kebijakan"}
          onAksi={detail && terpilih && !mengedit && !aksiMati ? () => bukaEditor(terpilih) : undefined}
        />

        {terpilih && !modeBaru && (
          <div className="mt-3 rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={aksiMati}
                onClick={() => ubahTerbit(terpilih, !terpilih.is_published)}
                className={KELAS_TOMBOL_PANEL}
              >
                {terpilih.is_published ? (
                  <EyeSlash size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
                {terpilih.is_published ? "Jadikan draft" : "Terbitkan"}
              </button>
              <Link
                href={`/kebijakan?id=${encodeURIComponent(terpilih.id)}`}
                className={KELAS_TOMBOL_PANEL}
              >
                <ArrowSquareOut size={18} aria-hidden="true" />
                Lihat di halaman Kebijakan
              </Link>
              <button
                type="button"
                disabled={aksiMati}
                onClick={() => hapus(terpilih)}
                className={KELAS_TOMBOL_PANEL}
              >
                <Trash size={18} aria-hidden="true" />
                Hapus kebijakan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KelolaKebijakanPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Lapis 2: hanya admin yang mengelola kebijakan (cek di level logika, §9.2);
  // lapis 1-nya RLS policies_admin_* di database.
  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/beranda");
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  // useDaftarDetail membaca ?pilih= lewat useSearchParams → butuh batas Suspense.
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-20 text-bantu text-redup">
          <CircleNotch size={20} aria-hidden="true" className="animate-spin" />
          Memuat kebijakan…
        </div>
      }
    >
      <KelolaKebijakanIsi />
    </Suspense>
  );
}
