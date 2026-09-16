"use client";

// Korpus Sahabat RWP — halaman admin untuk mengelola pengetahuan asisten AI
// (pola daftar-detail HC Panel, docs/DESIGN.md).
//
// Admin RWP bukan orang teknis, jadi bahasanya sederhana: dokumen "diproses"
// dan "dipelajari asisten", bukan "di-embed". Yang bisa dilakukan di sini:
//   1. Unggah berkas .md/.txt  → POST /api/korpus/unggah, lalu otomatis diproses.
//   2. Proses / proses ulang   → POST /api/korpus/ingest, dipanggil BERULANG
//                                (sebagian potongan per panggilan, batas waktu
//                                serverless) sampai `selesai: true`.
//   3. Hapus dokumen           → DELETE /api/korpus/[id].
//   4. Kirim isi kebijakan     → POST /api/korpus/dari-kebijakan, lalu diproses.
//
// §9.3: korpus HANYA berisi dokumen kebijakan. Halaman ini tidak menyentuh
// `reports`, `report_messages`, maupun identitas siapa pun.
//
// Mode mock: daftar contoh statis supaya tata letak bisa ditinjau; semua aksi
// nonaktif dan tidak ada panggilan API sama sekali.

import { Suspense, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  FileText,
  Info,
  PaperPlaneRight,
  Trash,
  UploadSimple,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { USE_MOCK, getSupabase } from "@/lib/supabaseClient";
import { ASSISTANT_NAME } from "@/lib/constants";
import { KORPUS_ACCEPT_ATTR, validateKorpusFile } from "@/lib/fileValidation";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { DataTable, type Kolom } from "@/components/hc/DataTable";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";
import { DetailPanel } from "@/components/hc/DetailPanel";
import { KosongHC } from "@/components/hc/KosongHC";
import { StatusLabel } from "@/components/hc/StatusLabel";
import { useDaftarDetail } from "@/components/hc/useDaftarDetail";
import { FilterTabs } from "@/components/hc/FilterTabs";
import { MarkdownKebijakan } from "@/components/MarkdownKebijakan";
import { chunkToTexts } from "@/lib/chunker";
import { POLICIES } from "@/lib/policies";

// ─── Kontrak data ─────────────────────────────────────────────────────────────
// Bentuk baris `corpus_documents` — dibaca langsung lewat RLS (admin boleh select).

type JenisDokumen = "md" | "txt" | "pdf" | "kebijakan";
type StatusDokumen = "menunggu" | "diproses" | "selesai" | "gagal";

type DokumenKorpus = {
  id: string;
  nama: string;
  jenis: JenisDokumen;
  source_doc: string;
  storage_path: string | null;
  policy_id: string | null;
  status: StatusDokumen;
  jumlah_chunk: number;
  embed_model: string | null;
  pesan_error: string | null;
  created_at: string;
  updated_at: string;
};

/** Ringkasan baris `policies` — hanya kolom yang dibutuhkan halaman ini. */
type KebijakanRingkas = {
  id: string;
  title: string;
  isPublished: boolean;
  /** Hanya kebijakan yang punya isi teks yang bisa dikirim ke korpus. */
  adaMarkdown: boolean;
};

/** Balasan POST /api/korpus/ingest — satu tahap dari beberapa. */
type HasilIngest = {
  id: string;
  total: number;
  diproses: number;
  berikutnya: number | null;
  selesai: boolean;
  status: "diproses" | "selesai";
};

type Progres = { id: string; diproses: number; total: number | null };
type Pesan = { nada: "sukses" | "info" | "gagal"; teks: string };

/** Satu baris rag_chunks. `indeks` null untuk potongan hasil skrip lama. */
type Potongan = { indeks: number | null; teks: string };

/** Balasan GET /api/korpus/[id]/isi. */
type IsiDokumen = {
  /** Teks sumber asli; null bila berkasnya memang tidak tersimpan (warisan). */
  teks: string | null;
  /** Terisi bila sumbernya ada tetapi gagal dibaca. */
  galatTeks: string | null;
  potongan: Potongan[];
};

/** Tab pembaca isi. URL `lihat=isi` berarti tab otomatis (teks bila ada). */
type TabIsi = "teks" | "potongan";

const LABEL_JENIS: Record<JenisDokumen, string> = {
  md: "Markdown",
  txt: "Teks",
  pdf: "PDF",
  kebijakan: "Kebijakan",
};

const LABEL_STATUS: Record<StatusDokumen, string> = {
  menunggu: "Menunggu",
  diproses: "Diproses",
  selesai: "Selesai",
  gagal: "Gagal",
};

/** Dokumen WARISAN: hasil skrip lama, berkas sumbernya tidak tersimpan, jadi
 *  tidak bisa diproses ulang — hanya bisa dihapus. */
function adalahWarisan(d: DokumenKorpus): boolean {
  return d.storage_path === null && d.jenis !== "kebijakan";
}

function sumberDokumen(d: DokumenKorpus): string {
  if (d.jenis === "kebijakan") return "Halaman Kebijakan";
  if (d.storage_path) return "Berkas unggahan";
  return "Skrip lama — tidak bisa diproses ulang";
}

/** Kalimat status untuk panel detail, dalam bahasa awam. */
function kalimatStatus(d: DokumenKorpus, sedangDiproses: boolean): string {
  if (sedangDiproses) return "Sedang diproses. Tunggu sebentar, jangan tutup halaman ini.";
  if (d.status === "gagal") {
    return d.pesan_error
      ? `Gagal diproses: ${d.pesan_error}`
      : "Gagal diproses. Coba proses lagi, atau hapus dokumen ini.";
  }
  if (adalahWarisan(d)) {
    return "Dokumen dari skrip lama. Isinya masih dipakai asisten, tetapi berkas aslinya tidak tersimpan sehingga tidak bisa diproses ulang. Kalau sudah tidak relevan, hapus saja.";
  }
  switch (d.status) {
    case "menunggu":
      return "Belum dipelajari asisten. Tekan “Proses sekarang” supaya isinya dipakai untuk menjawab.";
    case "diproses":
      return "Pemrosesan sebelumnya belum selesai. Tekan “Proses sekarang” untuk mengulang dari awal.";
    case "selesai":
      return "Sudah dipelajari asisten dan dipakai untuk menjawab pertanyaan karyawan.";
  }
}

// ─── Data contoh untuk mode mock ─────────────────────────────────────────────
// Tiga keadaan yang perlu terlihat: selesai, warisan, dan gagal (dengan pesan).

// Isi contoh memakai handbook dari lib/policies.ts — data seed yang sama dengan
// /kebijakan — supaya pembaca isi tampil realistis tanpa mengarang kebijakan.
const TEKS_CONTOH = `# ${POLICIES[0].title}\n\n${(POLICIES[0].markdown ?? "").trim()}\n`;
const POTONGAN_CONTOH: Potongan[] = chunkToTexts(TEKS_CONTOH).map((teks, i) => ({ indeks: i, teks }));

const CONTOH_DOKUMEN: DokumenKorpus[] = [
  {
    id: "contoh-selesai",
    nama: "handbook-rwp.md",
    jenis: "md",
    source_doc: "handbook-rwp.md",
    storage_path: "korpus/contoh-selesai.md",
    policy_id: null,
    status: "selesai",
    jumlah_chunk: POTONGAN_CONTOH.length,
    embed_model: "text-embedding-3-small",
    pesan_error: null,
    created_at: "2026-08-12T09:00:00+07:00",
    updated_at: "2026-08-12T09:04:00+07:00",
  },
  {
    id: "contoh-warisan",
    nama: "contoh-pelanggaran-rwp.md",
    jenis: "md",
    source_doc: "contoh-pelanggaran-rwp.md",
    storage_path: null,
    policy_id: null,
    status: "selesai",
    jumlah_chunk: 5,
    embed_model: "text-embedding-3-small",
    pesan_error: null,
    created_at: "2026-06-10T14:20:00+07:00",
    updated_at: "2026-06-10T14:20:00+07:00",
  },
  {
    id: "contoh-gagal",
    nama: "panduan-layanan-psikologi.txt",
    jenis: "txt",
    source_doc: "panduan-layanan-psikologi.txt",
    storage_path: "korpus/contoh-gagal.txt",
    policy_id: null,
    status: "gagal",
    jumlah_chunk: 0,
    embed_model: null,
    pesan_error: "Layanan pemrosesan tidak merespons dalam 30 detik. Coba proses lagi beberapa menit kemudian.",
    created_at: "2026-09-01T10:15:00+07:00",
    updated_at: "2026-09-01T10:16:00+07:00",
  },
];

const CONTOH_KEBIJAKAN: KebijakanRingkas[] = [
  { id: "rwp", title: "Respectful Workplace Policy", isPublished: true, adaMarkdown: true },
  { id: "kode-etik", title: "Kode Etik Perilaku", isPublished: false, adaMarkdown: false },
];

const CONTOH_ISI: Record<string, IsiDokumen> = {
  "contoh-selesai": { teks: TEKS_CONTOH, galatTeks: null, potongan: POTONGAN_CONTOH },
  // Warisan: berkas asli tidak ada; potongan tanpa indeks karena urutannya tak tersimpan.
  "contoh-warisan": {
    teks: null,
    galatTeks: null,
    potongan: POTONGAN_CONTOH.slice(-5).map((p) => ({ indeks: null, teks: p.teks })),
  },
  // Gagal diproses: teks ada, potongan belum ada.
  "contoh-gagal": {
    teks: "Panduan Layanan Psikologi\n\nBerkas contoh untuk mode demo. Isi sebenarnya diunggah admin dari halaman ini.",
    galatTeks: null,
    potongan: [],
  },
};

// ─── Pemanggil API ────────────────────────────────────────────────────────────
// Semua endpoint korpus memakai Authorization: Bearer <token sesi Supabase>
// (pola yang sama dengan /api/asisten).

async function panggilApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const pesan =
      json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Permintaan gagal (${res.status}).`;
    throw new Error(pesan);
  }
  return json as T;
}

function pesanGalat(e: unknown, bawaan: string): string {
  return e instanceof Error && e.message ? e.message : bawaan;
}

// ─── Potongan tampilan ────────────────────────────────────────────────────────

function LabelStatusDokumen({ dokumen, progres }: { dokumen: DokumenKorpus; progres: Progres | null }) {
  if (progres && progres.id === dokumen.id) {
    return (
      <StatusLabel nada="peringatan" className="tabular-nums">
        {progres.total ? `Diproses ${progres.diproses}/${progres.total}` : "Diproses"}
      </StatusLabel>
    );
  }
  if (dokumen.status === "gagal") {
    return <StatusLabel className="text-merah">Gagal</StatusLabel>;
  }
  return (
    <StatusLabel nada={dokumen.status === "selesai" ? "sukses" : "peringatan"}>
      {LABEL_STATUS[dokumen.status]}
    </StatusLabel>
  );
}

/** Bilah kemajuan: track latar, isi tinta (§Token warna). */
function BilahProgres({ diproses, total }: { diproses: number; total: number | null }) {
  const persen = total && total > 0 ? Math.min(100, Math.round((diproses / total) * 100)) : 0;
  return (
    <div>
      <p className="flex items-center gap-2 text-bantu leading-[1.5] text-tinta tabular-nums">
        <CircleNotch size={16} aria-hidden="true" className="shrink-0 animate-spin text-redup" />
        {total === null ? "Menyiapkan pemrosesan…" : `${diproses} dari ${total} potongan teks`}
      </p>
      <div
        role="progressbar"
        aria-label="Kemajuan pemrosesan dokumen"
        aria-valuemin={0}
        aria-valuemax={total ?? undefined}
        aria-valuenow={total === null ? undefined : diproses}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-latar"
      >
        <div
          className="h-full rounded-full bg-tinta transition-[width] duration-300 ease-[var(--ease-standar)]"
          style={{ width: `${persen}%` }}
        />
      </div>
    </div>
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

/**
 * Kontrol utama layar: kotak unggah. Ini SATU-SATUNYA elemen berbayangan di
 * halaman ini (§Prinsip — satu elevasi); di halaman lain jatah itu milik
 * kolom cari, tapi di sini tidak ada kolom cari.
 */
function KotakUnggah({
  nonaktif,
  sibuk,
  onBerkas,
  inputRef,
}: {
  nonaktif: boolean;
  sibuk: boolean;
  onBerkas: (file: File) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const idInput = useId();
  const [seret, setSeret] = useState(false);
  const mati = nonaktif || sibuk;

  return (
    <div>
      <span className="block text-bantu leading-tight font-semibold text-tinta">Unggah dokumen</span>
      <label
        htmlFor={idInput}
        onDragOver={(e) => {
          if (mati) return;
          e.preventDefault();
          if (!seret) setSeret(true);
        }}
        onDragLeave={() => {
          if (seret) setSeret(false);
        }}
        onDrop={(e) => {
          if (mati) return;
          e.preventDefault();
          setSeret(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onBerkas(f);
        }}
        className={cn(
          "mt-2 flex min-h-[60px] items-center gap-4 rounded-[var(--radius-kartu)] px-4 py-3",
          "border border-garis-kuat bg-kartu shadow-[var(--shadow-kontrol)]",
          "transition-colors duration-150 [transition-timing-function:var(--ease-standar)]",
          !mati &&
            "cursor-pointer hover:border-redup focus-within:border-tinta focus-within:ring-1 focus-within:ring-tinta",
          !mati && seret && "border-tinta ring-1 ring-tinta",
          mati && "cursor-not-allowed border-garis bg-latar opacity-60 shadow-none",
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-garis bg-latar text-tinta">
          {sibuk ? (
            <CircleNotch size={20} aria-hidden="true" className="animate-spin" />
          ) : (
            <UploadSimple size={20} aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-isi leading-[1.35] font-medium text-tinta">
            {sibuk ? "Mengunggah berkas…" : "Pilih berkas .md atau .txt"}
          </span>
          <span className="mt-0.5 block text-bantu leading-[1.5] text-redup">
            Seret ke sini atau klik untuk memilih. Maksimal 10 MB, isinya teks saja.
          </span>
        </span>
        <span className="hidden h-10 shrink-0 items-center rounded-full border border-garis-kuat bg-kartu px-4 text-bantu font-semibold text-tinta sm:inline-flex">
          Pilih berkas
        </span>
        <input
          ref={inputRef}
          id={idInput}
          type="file"
          accept={KORPUS_ACCEPT_ATTR}
          disabled={mati}
          className="sr-only"
          onChange={(e) => {
            // Tangkap File SEBELUM value direset — kalau tidak, daftar file
            // sudah kosong saat dibaca (jebakan yang pernah terjadi di /lapor).
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onBerkas(f);
          }}
        />
      </label>
    </div>
  );
}

// ─── Pembaca isi dokumen ──────────────────────────────────────────────────────
// Menggantikan daftar di kolom kiri saat URL punya `lihat=`. Dua tab:
//   Teks asli — sumber apa adanya (Markdown dirender; .txt ditampilkan polos);
//   Potongan  — baris rag_chunks, persis yang dibaca asisten saat menjawab.

type PropsPembaca = {
  dokumen: DokumenKorpus;
  isi: IsiDokumen | null;
  memuat: boolean;
  galat: string | null;
  tab: TabIsi;
  progres: Progres | null;
  onTab: (tab: TabIsi) => void;
  onKembali: () => void;
  onCobaLagi: () => void;
};

function PembacaDokumen({ dokumen, isi, memuat, galat, tab, progres, onTab, onKembali, onCobaLagi }: PropsPembaca) {
  const tanpaIndeks = !!isi && isi.potongan.length > 0 && isi.potongan.every((p) => p.indeks === null);
  const keterangan = [
    `${dokumen.jumlah_chunk} potongan`,
    sumberDokumen(dokumen),
    `Diperbarui ${formatDate(dokumen.updated_at)}`,
  ].join(" · ");

  return (
    <div>
      <Button variant="secondary" className="h-11" onClick={onKembali}>
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke daftar dokumen
      </Button>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusLabel>{LABEL_JENIS[dokumen.jenis]}</StatusLabel>
          {adalahWarisan(dokumen) && <StatusLabel>Warisan</StatusLabel>}
          <LabelStatusDokumen dokumen={dokumen} progres={progres} />
        </div>
        <h1 className="mt-3 text-halaman leading-[1.05] font-bold tracking-[-0.04em] break-words text-tinta">
          {dokumen.nama}
        </h1>
        <p className="mt-3 text-subjudul leading-[1.5] text-redup">{keterangan}</p>
      </header>

      <FilterTabs
        className="mt-8"
        label="Tampilan isi"
        aktif={tab}
        onPilih={(id) => onTab(id as TabIsi)}
        items={[
          { id: "teks", label: "Teks asli" },
          { id: "potongan", label: "Potongan", jumlah: isi?.potongan.length },
        ]}
      />

      <div className="mt-6">
        {memuat && (
          <div className="flex items-center justify-center gap-2 py-16 text-bantu text-redup">
            <CircleNotch size={20} aria-hidden="true" className="animate-spin" />
            Memuat isi dokumen…
          </div>
        )}

        {!memuat && galat && (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-kartu)] border border-dashed border-garis-putus px-6 py-10 text-center">
            <Warning size={24} aria-hidden="true" className="text-merah" />
            <p className="text-subjudul leading-[1.3] font-bold tracking-[-0.02em] text-tinta">
              Gagal memuat isi dokumen
            </p>
            <p className="max-w-[44ch] text-bantu leading-[1.5] text-redup">{galat}</p>
            <Button variant="secondary" className="h-11" onClick={onCobaLagi}>
              Coba lagi
            </Button>
          </div>
        )}

        {!memuat && !galat && isi && tab === "teks" && (
          isi.teks !== null ? (
            <article className="rounded-[var(--radius-panel)] border border-garis bg-kartu p-6 sm:p-8">
              {dokumen.jenis === "txt" ? (
                <pre className="font-sans text-isi leading-[1.6] whitespace-pre-wrap text-tinta">{isi.teks}</pre>
              ) : (
                <MarkdownKebijakan>{isi.teks}</MarkdownKebijakan>
              )}
            </article>
          ) : (
            <KosongHC
              judul={isi.galatTeks ? "Teks asli tidak bisa dibaca" : "Berkas asli tidak tersimpan"}
              ajakan={
                isi.galatTeks ??
                "Dokumen ini berasal dari skrip lama, jadi yang tersedia hanya potongan yang dibaca asisten."
              }
              aksiLabel={isi.potongan.length > 0 ? "Lihat potongan" : undefined}
              onAksi={isi.potongan.length > 0 ? () => onTab("potongan") : undefined}
            />
          )
        )}

        {!memuat && !galat && isi && tab === "potongan" && (
          isi.potongan.length === 0 ? (
            <KosongHC
              judul="Belum ada potongan"
              ajakan="Dokumen ini belum selesai diproses, jadi asisten belum membaca isinya. Kembali ke daftar lalu tekan “Proses sekarang”."
            />
          ) : (
            <>
              <p className="max-w-[60ch] text-bantu leading-[1.5] text-redup">
                Ini persis teks yang dibaca asisten saat menjawab. Tiap potongan diawali judul dokumen
                dan bagiannya supaya konteksnya tidak hilang.
                {tanpaIndeks &&
                  " Urutan potongan dari skrip lama tidak tersimpan; yang tampil adalah urutan penyimpanan."}
              </p>
              <ol className="mt-4 space-y-3">
                {isi.potongan.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4 sm:p-5"
                  >
                    <div className="flex items-baseline justify-between gap-3 text-mikro font-medium text-redup tabular-nums">
                      <span>Potongan {(p.indeks ?? i) + 1}</span>
                      <span>{p.teks.length} karakter</span>
                    </div>
                    <pre className="mt-2 font-mono text-bantu leading-[1.55] whitespace-pre-wrap text-tinta">
                      {p.teks}
                    </pre>
                  </li>
                ))}
              </ol>
            </>
          )
        )}
      </div>
    </div>
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

// ─── Isi halaman ──────────────────────────────────────────────────────────────

const KOLOM_DASAR: Kolom<DokumenKorpus>[] = [
  {
    kunci: "nama",
    judul: "Nama",
    render: (d) => <span className="line-clamp-2 break-words">{d.nama}</span>,
  },
  {
    kunci: "jenis",
    judul: "Jenis",
    lebar: "120px",
    render: (d) => (
      <span className="flex flex-wrap items-center gap-1.5">
        <StatusLabel>{LABEL_JENIS[d.jenis]}</StatusLabel>
        {adalahWarisan(d) && <StatusLabel>Warisan</StatusLabel>}
      </span>
    ),
  },
  {
    kunci: "potongan",
    judul: "Potongan",
    angka: true,
    lebar: "84px",
    render: (d) => <span>{d.jumlah_chunk}</span>,
  },
  {
    kunci: "diperbarui",
    judul: "Diperbarui",
    lebar: "108px",
    render: (d) => <span className="whitespace-nowrap text-redup">{formatDate(d.updated_at)}</span>,
  },
];

function KorpusIsi() {
  const inputRef = useRef<HTMLInputElement>(null);
  const mobilRef = useRef<HTMLDivElement>(null);

  // Data — mock langsung dari contoh, Supabase lewat effect di bawah.
  const [dokumen, setDokumen] = useState<DokumenKorpus[]>(USE_MOCK ? CONTOH_DOKUMEN : []);
  const [kebijakan, setKebijakan] = useState<KebijakanRingkas[]>(USE_MOCK ? CONTOH_KEBIJAKAN : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Menaikkan `versi` memicu muat ulang dari tabel (dipanggil dari handler aksi).
  const [versi, setVersi] = useState(0);

  // Satu aksi pada satu waktu: "unggah" | "ingest:<id>" | "hapus:<id>" | "kebijakan:<id>".
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [progres, setProgres] = useState<Progres | null>(null);
  const [pesan, setPesan] = useState<Pesan | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    let batal = false;

    async function load() {
      try {
        const sb = getSupabase();
        const [d, p] = await Promise.all([
          sb
            .from("corpus_documents")
            .select(
              "id, nama, jenis, source_doc, storage_path, policy_id, status, jumlah_chunk, embed_model, pesan_error, created_at, updated_at",
            )
            .order("updated_at", { ascending: false }),
          sb
            .from("policies")
            .select("id, title, is_published, markdown")
            .order("display_order", { ascending: true }),
        ]);
        if (batal) return;
        if (d.error) throw d.error;
        if (p.error) throw p.error;

        setDokumen((d.data ?? []) as DokumenKorpus[]);
        setKebijakan(
          ((p.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
            id: String(row.id),
            title: String(row.title),
            isPublished: Boolean(row.is_published),
            adaMarkdown: typeof row.markdown === "string" && row.markdown.trim().length > 0,
          })),
        );
        setFetchError(null);
      } catch (e) {
        if (!batal) setFetchError(pesanGalat(e, "Gagal memuat daftar dokumen."));
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

  // Pemilihan panel detail: hover intent 120ms, fokus memilih, id di `?pilih=`.
  const { terpilih, pilih, propsHover } = useDaftarDetail<DokumenKorpus>({
    items: dokumen,
    idDari: (d) => d.id,
  });

  // ── Pembaca isi (URL `lihat=`) ────────────────────────────────────────────
  // Disimpan di URL supaya bisa di-refresh dan dibagikan antar admin.
  // `lihat=isi` membuka dengan tab otomatis; `teks`/`potongan` memilih tab.
  // URL diubah lewat window.history.replaceState (disinkronkan Next ke
  // useSearchParams) — alasannya sama dengan useDaftarDetail.
  const pathname = usePathname();
  const params = useSearchParams();
  const lihat = params.get("lihat");
  const membaca = lihat === "isi" || lihat === "teks" || lihat === "potongan";
  const idIsi = membaca && terpilih ? terpilih.id : null;

  const [isiMuat, setIsiMuat] = useState<{ id: string; data: IsiDokumen } | null>(null);
  const [isiGalat, setIsiGalat] = useState<{ id: string; pesan: string } | null>(null);
  const [versiIsi, setVersiIsi] = useState(0);

  // Muat isi saat pembaca terbuka; `versi` ikut supaya selesai ingest langsung
  // memperbarui tab Potongan tanpa keluar dari pembaca.
  useEffect(() => {
    if (!idIsi || USE_MOCK) return;
    let batal = false;

    async function loadIsi(id: string) {
      try {
        const data = await panggilApi<IsiDokumen>(`/api/korpus/${encodeURIComponent(id)}/isi`);
        if (batal) return;
        setIsiMuat({ id, data });
        setIsiGalat(null);
      } catch (e) {
        if (!batal) setIsiGalat({ id, pesan: pesanGalat(e, "Gagal memuat isi dokumen.") });
      }
    }

    loadIsi(idIsi);
    return () => {
      batal = true;
    };
  }, [idIsi, versi, versiIsi]);

  const isiTerpilih: IsiDokumen | null =
    idIsi === null
      ? null
      : USE_MOCK
        ? (CONTOH_ISI[idIsi] ?? { teks: null, galatTeks: null, potongan: [] })
        : isiMuat && isiMuat.id === idIsi
          ? isiMuat.data
          : null;
  const galatIsi = idIsi !== null && isiGalat?.id === idIsi ? isiGalat.pesan : null;
  const memuatIsi = idIsi !== null && isiTerpilih === null && galatIsi === null;
  const tabIsi: TabIsi =
    lihat === "potongan"
      ? "potongan"
      : lihat === "teks"
        ? "teks"
        : isiTerpilih && isiTerpilih.teks === null
          ? "potongan"
          : "teks";

  function ubahUrlIsi(id: string, lihatBaru: string | null, gulir: boolean) {
    const q = new URLSearchParams(params.toString());
    q.set("pilih", id);
    if (lihatBaru) q.set("lihat", lihatBaru);
    else q.delete("lihat");
    window.history.replaceState(null, "", `${pathname}?${q.toString()}`);
    // Berganti antara daftar dan pembaca terasa seperti pindah halaman → ke atas.
    if (gulir) window.scrollTo({ top: 0 });
  }
  function bukaIsi(d: DokumenKorpus) {
    pilih(d.id);
    ubahUrlIsi(d.id, "isi", true);
  }
  function tutupIsi() {
    if (terpilih) ubahUrlIsi(terpilih.id, null, true);
    else {
      window.history.replaceState(null, "", pathname);
      window.scrollTo({ top: 0 });
    }
  }
  function gantiTabIsi(tab: TabIsi) {
    if (terpilih) ubahUrlIsi(terpilih.id, tab, false);
  }

  // ── Aksi ──────────────────────────────────────────────────────────────────

  /**
   * Loop ingest bertahap. Server hanya memproses sebagian potongan per
   * panggilan; klien memanggil ulang dengan `mulaiDari = berikutnya` sampai
   * `selesai: true`. `berikutnya` adalah indeks potongan berikutnya, sama
   * dengan jumlah yang sudah tuntas, jadi dipakai sebagai angka kumulatif
   * untuk bilah progres apa pun makna `diproses` per panggilan.
   */
  async function jalankanIngest(dok: DokumenKorpus) {
    setSibuk(`ingest:${dok.id}`);
    setProgres({ id: dok.id, diproses: 0, total: null });
    // Daftar langsung menunjukkan "diproses" tanpa menunggu muat ulang.
    setDokumen((prev) =>
      prev.map((d) => (d.id === dok.id ? { ...d, status: "diproses", pesan_error: null } : d)),
    );

    try {
      let mulaiDari = 0;
      for (;;) {
        const hasil = await panggilApi<HasilIngest>("/api/korpus/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dok.id, mulaiDari }),
        });
        const tuntas = hasil.selesai ? hasil.total : (hasil.berikutnya ?? hasil.diproses);
        setProgres({ id: dok.id, diproses: tuntas, total: hasil.total });

        if (hasil.selesai || hasil.berikutnya === null) break;
        if (hasil.berikutnya <= mulaiDari) {
          throw new Error("Pemrosesan tidak bergerak maju. Coba lagi beberapa saat kemudian.");
        }
        mulaiDari = hasil.berikutnya;
      }
      setPesan({ nada: "sukses", teks: `“${dok.nama}” selesai diproses dan siap dipakai asisten.` });
    } catch (e) {
      const teks = pesanGalat(e, "Gagal memproses dokumen.");
      setDokumen((prev) =>
        prev.map((d) => (d.id === dok.id ? { ...d, status: "gagal", pesan_error: teks } : d)),
      );
      setPesan({ nada: "gagal", teks: `Pemrosesan “${dok.nama}” gagal: ${teks}` });
    } finally {
      setProgres(null);
      setSibuk(null);
      muatUlang();
    }
  }

  /** Sisipkan/ganti satu baris di daftar lalu jadikan pilihan panel. */
  function tampilkanDokumenBaru(dok: DokumenKorpus) {
    setDokumen((prev) => [dok, ...prev.filter((d) => d.id !== dok.id)]);
    pilih(dok.id);
  }

  async function unggahBerkas(file: File) {
    if (USE_MOCK || sibuk !== null) return;
    setPesan(null);

    // Validasi di klien dulu (§9.4) supaya penolakan langsung terlihat;
    // server tetap memvalidasi ulang.
    const hasil = await validateKorpusFile(file);
    if (!hasil.ok) {
      setPesan({ nada: "gagal", teks: `Berkas “${file.name}” ditolak: ${hasil.alasan}.` });
      return;
    }

    setSibuk("unggah");
    let dok: DokumenKorpus;
    try {
      const form = new FormData();
      form.append("berkas", file);
      const res = await panggilApi<{ dokumen: DokumenKorpus }>("/api/korpus/unggah", {
        method: "POST",
        body: form,
      });
      dok = res.dokumen;
    } catch (e) {
      setPesan({ nada: "gagal", teks: `Unggah gagal: ${pesanGalat(e, "berkas tidak tersimpan.")}` });
      setSibuk(null);
      return;
    }

    tampilkanDokumenBaru(dok);
    await jalankanIngest(dok);
  }

  async function kirimKebijakan(p: KebijakanRingkas) {
    if (USE_MOCK || sibuk !== null || !p.adaMarkdown) return;
    setPesan(null);
    setSibuk(`kebijakan:${p.id}`);

    let dok: DokumenKorpus;
    try {
      const res = await panggilApi<{ dokumen: DokumenKorpus }>("/api/korpus/dari-kebijakan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: p.id }),
      });
      dok = res.dokumen;
    } catch (e) {
      setPesan({
        nada: "gagal",
        teks: `Gagal mengirim “${p.title}” ke korpus: ${pesanGalat(e, "permintaan ditolak.")}`,
      });
      setSibuk(null);
      return;
    }

    tampilkanDokumenBaru(dok);
    await jalankanIngest(dok);
  }

  async function hapusDokumen(dok: DokumenKorpus) {
    if (USE_MOCK || sibuk !== null) return;
    const yakin = window.confirm(
      `Hapus “${dok.nama}” dari korpus?\n\nAsisten tidak akan memakai isinya lagi. Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!yakin) return;

    setPesan(null);
    setSibuk(`hapus:${dok.id}`);
    try {
      const res = await panggilApi<{ ok: boolean; peringatan: string | null }>(
        `/api/korpus/${encodeURIComponent(dok.id)}`,
        { method: "DELETE" },
      );
      setDokumen((prev) => prev.filter((d) => d.id !== dok.id));
      if (idIsi === dok.id) {
        const q = new URLSearchParams(params.toString());
        q.delete("lihat");
        q.delete("pilih");
        window.history.replaceState(null, "", q.size > 0 ? `${pathname}?${q.toString()}` : pathname);
      }
      // Peringatan dari server bersifat informasi (dokumen tetap terhapus), bukan galat.
      setPesan(
        res.peringatan
          ? { nada: "info", teks: res.peringatan }
          : { nada: "sukses", teks: `“${dok.nama}” dihapus dari korpus.` },
      );
    } catch (e) {
      setPesan({ nada: "gagal", teks: `Gagal menghapus “${dok.nama}”: ${pesanGalat(e, "permintaan ditolak.")}` });
    } finally {
      setSibuk(null);
      muatUlang();
    }
  }

  // ── Turunan untuk tampilan ────────────────────────────────────────────────

  const aksiMati = USE_MOCK || sibuk !== null;
  const warisanTerpilih = terpilih ? adalahWarisan(terpilih) : false;
  const sedangDiprosesTerpilih = !!terpilih && progres?.id === terpilih.id;
  const aksiLabel = terpilih && terpilih.status === "selesai" ? "Proses ulang" : "Proses sekarang";
  const bolehProses = !!terpilih && !warisanTerpilih && !aksiMati;
  const adaWarisan = dokumen.some(adalahWarisan);
  const adaIsi = !loading && !fetchError && dokumen.length > 0;

  const kolom: Kolom<DokumenKorpus>[] = [
    KOLOM_DASAR[0],
    KOLOM_DASAR[1],
    {
      kunci: "status",
      judul: "Status",
      lebar: "132px",
      render: (d) => <LabelStatusDokumen dokumen={d} progres={progres} />,
    },
    KOLOM_DASAR[2],
    KOLOM_DASAR[3],
  ];

  const detail = terpilih
    ? {
        nama: terpilih.nama,
        kategori: LABEL_JENIS[terpilih.jenis],
        status: <LabelStatusDokumen dokumen={terpilih} progres={progres} />,
        deskripsi: kalimatStatus(terpilih, sedangDiprosesTerpilih),
        baris: [
          { label: "Potongan teks", nilai: String(terpilih.jumlah_chunk) },
          { label: "Model", nilai: terpilih.embed_model ?? "" },
          { label: "Diunggah", nilai: formatDateTime(terpilih.created_at) },
          { label: "Diperbarui", nilai: formatDateTime(terpilih.updated_at) },
          { label: "Sumber", nilai: sumberDokumen(terpilih) },
        ],
      }
    : null;

  function pilihDariKartu(d: DokumenKorpus) {
    pilih(d.id);
    // Di HP panel disembunyikan; ringkasan + tombol aksi ada di bawah daftar.
    mobilRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-y-12 pt-6",
        "lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-x-16 lg:gap-y-8 lg:pt-8",
      )}
    >
      {membaca && terpilih ? (
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <PembacaDokumen
            dokumen={terpilih}
            isi={isiTerpilih}
            memuat={memuatIsi}
            galat={galatIsi}
            tab={tabIsi}
            progres={progres}
            onTab={gantiTabIsi}
            onKembali={tutupIsi}
            onCobaLagi={() => setVersiIsi((v) => v + 1)}
          />
        </div>
      ) : (
        <>
          {/* Pembuka: h1, subjudul, kontrol utama (§Spasi — maksimal 4 elemen teks) */}
          <header className="min-w-0 lg:col-start-1 lg:row-start-1">
            <h1 className="pembuka-masuk text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta">
              Korpus {ASSISTANT_NAME}
            </h1>
            <p
              className="pembuka-masuk mt-3 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
              style={{ animationDelay: "60ms" }}
            >
              Dokumen yang dipelajari asisten AI. Hanya dokumen kebijakan — jangan pernah mengunggah
              isi laporan.
            </p>

            <div className="pembuka-masuk mt-8" style={{ animationDelay: "110ms" }}>
              <KotakUnggah
                nonaktif={USE_MOCK || loading || !!fetchError}
                sibuk={sibuk !== null}
                onBerkas={unggahBerkas}
                inputRef={inputRef}
              />
              {USE_MOCK && (
                <p className="mt-3 rounded-[var(--radius-input)] border border-dashed border-garis-putus px-4 py-3 text-bantu leading-[1.5] text-redup">
                  Pengelolaan korpus hanya aktif saat terhubung ke Supabase.
                </p>
              )}
              {pesan && <BarisPesan pesan={pesan} />}
            </div>
          </header>

          {/* Konten kiri */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {/* a) Dokumen */}
            <section aria-labelledby="judul-dokumen">
              <div className="flex items-baseline gap-2">
                <h2
                  id="judul-dokumen"
                  className="text-bagian leading-[1.25] font-bold tracking-[-0.02em] text-tinta"
                >
                  Dokumen
                </h2>
                {!loading && !fetchError && (
                  <span className="text-bantu font-medium text-redup tabular-nums">{dokumen.length}</span>
                )}
              </div>
              <p className="mt-1 text-bantu leading-[1.5] text-redup">
                Berkas yang isinya sudah atau akan dipelajari asisten.
              </p>

              <div className="mt-4">
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-16 text-bantu text-redup">
                    <CircleNotch size={20} aria-hidden="true" className="animate-spin" />
                    Memuat daftar dokumen…
                  </div>
                )}

                {!loading && fetchError && (
                  <div className="flex flex-col items-center gap-3 rounded-[var(--radius-kartu)] border border-dashed border-garis-putus px-6 py-10 text-center">
                    <Warning size={24} aria-hidden="true" className="text-merah" />
                    <p className="text-subjudul leading-[1.3] font-bold tracking-[-0.02em] text-tinta">
                      Gagal memuat daftar dokumen
                    </p>
                    <p className="max-w-[44ch] text-bantu leading-[1.5] text-redup">{fetchError}</p>
                    <Button variant="secondary" className="mt-2 h-11" onClick={muatUlang}>
                      Coba lagi
                    </Button>
                  </div>
                )}

                {!loading && !fetchError && dokumen.length === 0 && (
                  <KosongHC
                    judul="Belum ada dokumen di korpus"
                    ajakan="Unggah berkas .md atau .txt berisi kebijakan RWP, lalu proses supaya asisten bisa menjawab dari isinya."
                    aksiLabel="Unggah dokumen"
                    onAksi={USE_MOCK ? undefined : () => inputRef.current?.click()}
                  />
                )}

                {adaIsi && (
                  <>
                    {/* Desktop: tabel. Sorot baris = pilih untuk panel; klik/Enter = buka isi. */}
                    <div className="hidden lg:block">
                      <DataTable<DokumenKorpus>
                        label="Daftar dokumen korpus"
                        kolom={kolom}
                        data={dokumen}
                        kunciBaris={(d) => d.id}
                        terpilih={terpilih?.id ?? null}
                        onPilih={(d) => pilih(d.id)}
                        onBuka={(d) => bukaIsi(d)}
                      />
                    </div>

                    {/* Di bawah 1024px: kartu, ketuk = pilih lalu aksi di blok bawah */}
                    <div className="lg:hidden">
                      <ItemCardGrid>
                        {dokumen.map((d, i) => {
                          const hover = propsHover(d);
                          return (
                            <ItemCard
                              key={d.id}
                              nama={d.nama}
                              deskripsi={`${LABEL_JENIS[d.jenis]}${adalahWarisan(d) ? " · Warisan" : ""} · ${d.jumlah_chunk} potongan · ${formatDate(d.updated_at)}`}
                              status={<LabelStatusDokumen dokumen={d} progres={progres} />}
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

                    {adaWarisan && (
                      <p className="mt-3 text-bantu leading-[1.5] text-redup">
                        Dokumen bertanda “Warisan” berasal dari skrip lama: isinya tetap dipakai asisten,
                        tetapi tidak bisa diproses ulang, hanya bisa dihapus.
                      </p>
                    )}

                    {/* Ringkasan + aksi untuk HP (panel detail disembunyikan di bawah 1024px) */}
                    {terpilih && (
                      <div
                        ref={mobilRef}
                        className="mt-6 rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4 lg:hidden"
                      >
                        <p className="text-bantu leading-[1.35] font-[650] text-tinta">Dokumen terpilih</p>
                        <p className="mt-2 text-isi leading-[1.35] font-[650] tracking-[-0.01em] break-all text-tinta">
                          {terpilih.nama}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-bantu font-medium text-redup">
                          <span>{LABEL_JENIS[terpilih.jenis]}</span>
                          <LabelStatusDokumen dokumen={terpilih} progres={progres} />
                        </div>
                        <p className="mt-2 text-bantu leading-[1.5] text-redup">
                          {kalimatStatus(terpilih, sedangDiprosesTerpilih)}
                        </p>
                        {sedangDiprosesTerpilih && progres && (
                          <div className="mt-3">
                            <BilahProgres diproses={progres.diproses} total={progres.total} />
                          </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="secondary" className="h-11" onClick={() => bukaIsi(terpilih)}>
                            <FileText size={18} aria-hidden="true" />
                            Lihat isi
                          </Button>
                          <Button
                            className="h-11"
                            disabled={!bolehProses}
                            onClick={() => {
                              if (bolehProses) jalankanIngest(terpilih);
                            }}
                          >
                            {aksiLabel}
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-11"
                            disabled={aksiMati}
                            onClick={() => hapusDokumen(terpilih)}
                          >
                            <Trash size={18} aria-hidden="true" />
                            Hapus dokumen
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* b) Dari halaman Kebijakan */}
            <section aria-labelledby="judul-kebijakan" className="mt-12">
              <h2
                id="judul-kebijakan"
                className="text-bagian leading-[1.25] font-bold tracking-[-0.02em] text-tinta"
              >
                Dari halaman Kebijakan
              </h2>
              <p className="mt-1 max-w-[60ch] text-bantu leading-[1.5] text-redup">
                Kirim isi kebijakan yang sudah terbit ke korpus supaya jawaban asisten sama dengan yang
                dibaca karyawan.
              </p>

              {!loading && kebijakan.length === 0 ? (
                <p className="mt-4 text-bantu leading-[1.5] text-redup">
                  Belum ada kebijakan di halaman Kebijakan.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-garis rounded-[var(--radius-kartu)] border border-garis bg-kartu">
                  {kebijakan.map((p) => {
                    const dok = dokumen.find((d) => d.policy_id === p.id);
                    const sibukIni = sibuk === `kebijakan:${p.id}`;
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1 basis-[200px]">
                          <p className="text-isi leading-[1.35] font-medium text-tinta">{p.title}</p>
                          <p className="mt-0.5 text-bantu leading-[1.5] text-redup">
                            {!p.adaMarkdown
                              ? "Belum ada isi teks yang bisa dikirim."
                              : dok
                                ? `Sudah ada di korpus · ${LABEL_STATUS[dok.status]}`
                                : "Belum ada di korpus."}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusLabel nada={p.isPublished ? "sukses" : "netral"}>
                            {p.isPublished ? "Terbit" : "Draft"}
                          </StatusLabel>
                          {dok && <StatusLabel>Di korpus</StatusLabel>}
                        </div>
                        <Button
                          variant="secondary"
                          className="h-11"
                          disabled={aksiMati || !p.adaMarkdown}
                          onClick={() => kirimKebijakan(p)}
                        >
                          {sibukIni ? (
                            <CircleNotch size={18} aria-hidden="true" className="animate-spin" />
                          ) : (
                            <PaperPlaneRight size={18} aria-hidden="true" />
                          )}
                          Kirim ke korpus
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Kaki: pengingat kalibrasi (CLAUDE.md §3) */}
            <p className="mt-12 border-t border-garis pt-6 text-bantu leading-[1.5] text-redup">
              Setelah korpus berubah, jalankan{" "}
              <code className="font-mono text-mikro">scripts/diagnose-retrieval.mjs</code> untuk
              menyetel ulang ambang kemiripan (lihat CLAUDE.md §3).
            </p>
          </div>
        </>
      )}

      {/* Panel detail — desktop saja, menempel di atas (§Pola daftar-detail) */}
      <div className="hidden lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:self-start">
        <DetailPanel
          entitas="dokumen"
          item={detail}
          aksiLabel={aksiLabel}
          onAksi={bolehProses && terpilih ? () => jalankanIngest(terpilih) : undefined}
        />

        {terpilih && (
          <div className="mt-3 rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4">
            {sedangDiprosesTerpilih && progres && (
              <div className="mb-4">
                <BilahProgres diproses={progres.diproses} total={progres.total} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              {!membaca && (
                <button type="button" onClick={() => bukaIsi(terpilih)} className={KELAS_TOMBOL_PANEL}>
                  <FileText size={18} aria-hidden="true" />
                  Lihat isi
                </button>
              )}
              <button
                type="button"
                disabled={aksiMati}
                onClick={() => hapusDokumen(terpilih)}
                className={KELAS_TOMBOL_PANEL}
              >
                <Trash size={18} aria-hidden="true" />
                Hapus dokumen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KorpusPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Lapis 2: hanya admin yang mengelola korpus (cek di level logika, §9.2).
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
          Memuat korpus…
        </div>
      }
    >
      <KorpusIsi />
    </Suspense>
  );
}
