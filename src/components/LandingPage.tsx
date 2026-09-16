"use client";

// Landing page publik untuk pengunjung yang belum login.
// Sistem UI "HC Panel" (docs/DESIGN.md): netral tetap netral, karakter datang
// dari aksen pastel: `lembut` untuk permukaan menyambut (pratinjau di hero,
// blok asisten) dan ramp `data-1..4` untuk pengelompokan langkah dan jaminan.
// Merah HK tetap satu-satunya aksen merek. Ikon Phosphor/GenerativeIcon/Logo,
// tanpa bayangan. Gerak dibatasi ke muat halaman dan umpan balik hover.
//
// Register bahasa: formal korporat yang terbuka dan ramah ("Anda", "kami").

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, ChatCircleText, EyeSlash, FileMagnifyingGlass,
  Lock, Plus, ShieldWarning,
} from "@phosphor-icons/react";
import { APP_NAME, ORG_NAME, ASSISTANT_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/hc/Logo";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";
import { StatusLabelLaporan } from "@/components/hc/StatusLabel";
import { GenerativeIcon } from "@/components/hc/GenerativeIcon";

// Empat rona ramp data, dipakai berurutan untuk jaminan dan langkah supaya
// warna yang sama selalu berarti urutan yang sama.
const PASTEL = [
  { tile: "bg-data-1/20 border-data-1/50", ikon: "text-data-1" },
  { tile: "bg-data-2/20 border-data-2/50", ikon: "text-data-2" },
  { tile: "bg-data-3/20 border-data-3/50", ikon: "text-data-3" },
  { tile: "bg-data-4/20 border-data-4/50", ikon: "text-data-4" },
] as const;

const JAMINAN = [
  {
    icon: EyeSlash,
    title: "Pelaporan anonim",
    desc: "Anda menentukan apakah identitas disertakan. Bila anonim, admin tidak melihat nama Anda.",
  },
  {
    icon: Lock,
    title: "Identitas disimpan terpisah",
    desc: "Nama pelapor tidak melekat pada isi laporan yang dibaca admin.",
  },
  {
    icon: FileMagnifyingGlass,
    title: "Pembukaan identitas tercatat",
    desc: "Hanya admin berwenang yang dapat membukanya, dan catatannya tampil di riwayat laporan Anda.",
  },
];

const LANGKAH = [
  { title: "Tulis laporan", desc: "Pilih kategori, uraikan kronologi, lampirkan bukti bila ada." },
  { title: "Terima nomor tiket", desc: "Kunci Anda untuk memantau penanganan, termasuk saat melapor anonim." },
  { title: "Ditinjau tim HC", desc: "Status berjalan dari Diterima, Sedang Ditinjau, hingga Tindak Lanjut." },
  { title: "Tetap terhubung", desc: "Komunikasi dengan admin berlangsung di dalam laporan, tanpa membuka identitas." },
];

// Ikon pintu datang dari GenerativeIcon di dalam ItemCard (§Batas gaya).
const PINTU = [
  { title: "Kebijakan RWP", desc: "Handbook resmi: definisi, kategori pelanggaran, contoh kasus, dan sanksi." },
  { title: "Pelaporan insiden", desc: "Kanal resmi untuk pelecehan, diskriminasi, perundungan, kekerasan, bias gender, dan eksklusivitas." },
  { title: "Pelacakan laporan", desc: "Pantau status penanganan dan berkomunikasi dengan admin RWP." },
  { title: "Layanan psikologi", desc: "Careline 24 jam, psikolog internal, dan platform kesejahteraan, terpisah dari sistem pelaporan." },
];

const FAQ = [
  {
    q: "Apakah identitas saya benar-benar tidak diketahui?",
    a: "Anonimitas bersifat prosedural. Sistem menyimpan kaitan ke akun Anda untuk mencegah penyalahgunaan dan memungkinkan tindak lanjut, tetapi identitas tidak ditampilkan kepada admin. Pembukaannya hanya dapat dilakukan admin berwenang dan selalu tercatat di riwayat laporan Anda.",
  },
  {
    q: "Bagaimana jika saya belum yakin ini termasuk pelanggaran?",
    a: `Tanyakan kepada ${ASSISTANT_NAME}. Jawabannya merujuk handbook RWP resmi beserta contoh kasus, sehingga Anda dapat menimbang tanpa harus melapor terlebih dahulu.`,
  },
  {
    q: "Saya membutuhkan dukungan, tetapi belum siap melapor.",
    a: "Layanan Psikologi tersedia melalui careline 24 jam, psikolog internal, dan platform Naluri. Kanal ini terpisah dari sistem pelaporan dan tidak membuat laporan secara otomatis.",
  },
  {
    q: "Apakah pelapor dapat mengalami pembalasan?",
    a: "Perusahaan melarang segala bentuk pembalasan terhadap pelapor yang beritikad baik. Bila terjadi, hal itu merupakan pelanggaran tersendiri yang dapat dilaporkan.",
  },
];

// Isi pratinjau pelacakan di hero: data ilustrasi, dirender dengan komponen
// asli aplikasi (GenerativeIcon, StatusLabelLaporan), bukan gambar palsu.
const PRATINJAU_TIKET = "RWP-2026-0041";
const PRATINJAU_RIWAYAT = [
  { status: "Diterima", waktu: "Senin, 09.12" },
  { status: "Sedang Ditinjau", waktu: "Selasa, 14.30" },
  { status: "Tindak Lanjut", waktu: "Kamis, 10.05" },
] as const;

/** Judul bagian + keterangan yang selalu ditumpuk di bawahnya (§Batas gaya). */
function JudulBagian({ judul, keterangan }: { judul: string; keterangan?: string }) {
  return (
    <>
      <h2 className="text-bagian font-bold leading-[1.25] tracking-[-0.02em] text-balance text-tinta">
        {judul}
      </h2>
      {keterangan && (
        <p className="mt-2 max-w-[62ch] text-bantu leading-[1.6] text-redup">{keterangan}</p>
      )}
    </>
  );
}

/** Pratinjau kartu pelacakan laporan, permukaan menyambut (aksen lembut). */
function PratinjauPelacakan() {
  return (
    <aside
      aria-label="Contoh tampilan pelacakan laporan"
      className="pembuka-masuk rounded-[var(--radius-panel)] border border-lembut-garis bg-lembut-latar p-4 lg:p-5"
      style={{ animationDelay: "140ms" }}
    >
      <div className="rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4">
        <div className="flex items-start gap-3">
          <GenerativeIcon nama={PRATINJAU_TIKET} size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-mikro font-semibold text-redup">Nomor tiket</div>
            <div className="text-isi font-[650] tracking-[-0.01em] text-tinta tabular-nums">
              {PRATINJAU_TIKET}
            </div>
          </div>
          <StatusLabelLaporan status="Tindak Lanjut" />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-garis pt-4 text-bantu">
          <div>
            <dt className="text-mikro font-semibold text-redup">Kategori</dt>
            <dd className="mt-0.5 text-tinta">Perundungan</dd>
          </div>
          <div>
            <dt className="text-mikro font-semibold text-redup">Identitas pelapor</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-lembut">
              <EyeSlash size={14} aria-hidden="true" />
              Anonim
            </dd>
          </div>
        </dl>

        <ol className="mt-4 space-y-2.5 border-t border-garis pt-4" aria-label="Riwayat status">
          {PRATINJAU_RIWAYAT.map((r, i) => (
            <li key={r.status} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    i === PRATINJAU_RIWAYAT.length - 1 ? "bg-lembut" : "bg-garis-kuat",
                  )}
                />
                <StatusLabelLaporan status={r.status} />
              </span>
              <span className="text-mikro text-redup tabular-nums">{r.waktu}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-3 text-mikro leading-[1.5] text-redup">
        Contoh tampilan pelacakan laporan di dalam aplikasi. Data ilustrasi.
      </p>
    </aside>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-latar">
      {/* ── Bar atas ── */}
      <header className="sticky top-0 z-20 border-b border-garis bg-kartu">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 lg:h-18 lg:px-10">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-isi font-bold tracking-[-0.01em] text-tinta">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden text-bantu text-redup sm:block">Divisi Human Capital</span>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-tinta px-5 text-bantu font-semibold text-kartu transition-colors duration-150 hover:bg-tinta-hover"
            >
              Masuk
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 pb-16 lg:px-10">
        {/* ── Pembuka layar: teks di kiri, pratinjau nyata di kanan ── */}
        <section className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-center lg:gap-14 lg:pt-16">
          <div>
            <span
              className="pembuka-masuk inline-flex items-center gap-2 rounded-full border border-lembut-garis bg-lembut-latar px-3 py-1.5 text-mikro font-semibold text-lembut"
              style={{ animationDelay: "0ms" }}
            >
              <ShieldWarning size={14} aria-hidden="true" className="text-merah-ikon" />
              Respectful Workplace Policy
            </span>

            <h1
              className="pembuka-masuk mt-5 max-w-[26ch] text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta lg:text-[44px]"
              style={{ animationDelay: "60ms" }}
            >
              Lingkungan kerja yang aman dimulai dari keberanian bersuara.
            </h1>

            <p
              className="pembuka-masuk mt-5 max-w-[56ch] text-subjudul leading-[1.5] text-redup"
              style={{ animationDelay: "110ms" }}
            >
              Kanal resmi {ORG_NAME} untuk melaporkan pelecehan, diskriminasi,
              perundungan, dan kekerasan. Kerahasiaan Anda kami jaga sejak awal.
            </p>

            <div
              className="pembuka-masuk mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "170ms" }}
            >
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-tinta px-6 text-isi font-semibold text-kartu transition-colors duration-150 hover:bg-tinta-hover"
              >
                Masuk untuk melapor
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                href="#cara-kerja"
                className="inline-flex h-12 items-center justify-center rounded-full border border-garis-kuat bg-kartu px-6 text-isi font-semibold text-tinta transition-colors duration-150 hover:bg-latar"
              >
                Lihat cara kerjanya
              </a>
            </div>
          </div>

          <PratinjauPelacakan />
        </section>

        {/* ── Jaminan kerahasiaan: satu panel, tiga baris berikon pastel ── */}
        <section className="mt-20">
          <JudulBagian judul="Kerahasiaan yang dibangun ke dalam sistem" />
          <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3">
            {JAMINAN.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="flex gap-4 md:block">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-input)] border",
                    PASTEL[i].tile, PASTEL[i].ikon,
                  )}
                >
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div className="md:mt-4">
                  <h3 className="text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                    {title}
                  </h3>
                  <p className="mt-1.5 max-w-[34ch] text-bantu leading-[1.5] text-redup">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Cara kerja: langkah bernomor dengan garis penghubung ── */}
        <section id="cara-kerja" className="mt-20 scroll-mt-24">
          <JudulBagian judul="Empat langkah dari laporan ke tindak lanjut" />
          <ol className="relative mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {/* Garis penghubung antar langkah, hanya di baris tunggal (lg) */}
            <span
              aria-hidden="true"
              className="absolute top-5 right-[12.5%] left-[12.5%] hidden h-px bg-garis-kuat lg:block"
            />
            {LANGKAH.map(({ title, desc }, i) => (
              <li key={title} className="relative flex gap-4 lg:block lg:text-center">
                <span
                  className={cn(
                    "relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-bantu font-bold text-tinta tabular-nums lg:mx-auto",
                    PASTEL[i].tile,
                  )}
                >
                  {i + 1}
                </span>
                <div className="lg:mt-4">
                  <h3 className="text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                    {title}
                  </h3>
                  <p className="mt-1.5 max-w-[30ch] text-bantu leading-[1.5] text-redup lg:mx-auto">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Pintu masuk aplikasi (komponen kartu asli) ── */}
        <section className="mt-20">
          <JudulBagian
            judul="Empat layanan dalam satu aplikasi"
            keterangan="Masuk dengan akun karyawan untuk mengaksesnya."
          />
          <ItemCardGrid className="mt-6">
            {PINTU.map(({ title, desc }, i) => (
              <ItemCard
                key={title}
                nama={title}
                deskripsi={desc}
                indeks={i}
                as="a"
                href="/login"
              />
            ))}
          </ItemCardGrid>
        </section>

        {/* ── Sahabat RWP: permukaan menyambut ── */}
        <section className="mt-20 rounded-[var(--radius-panel)] border border-lembut-garis bg-lembut-latar p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-8">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-kartu)] border border-lembut-garis bg-kartu text-lembut">
              <ChatCircleText size={26} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-bagian font-bold leading-[1.25] tracking-[-0.02em] text-tinta">
                {ASSISTANT_NAME}, asisten kebijakan RWP
              </h2>
              <p className="mt-3 max-w-[60ch] text-isi leading-[1.55] text-tinta">
                Belum yakin apakah yang Anda alami termasuk pelanggaran? Tanyakan
                lebih dulu. Jawaban disusun dari handbook RWP resmi, dan bila
                informasinya tidak tersedia, asisten menyampaikannya apa adanya.
              </p>
              <p className="mt-3 max-w-[60ch] text-bantu leading-[1.5] text-redup">
                Penilaian dan tindak lanjut resmi tetap dilakukan tim Human Capital.
              </p>
            </div>
          </div>
        </section>

        {/* ── Pertanyaan yang sering diajukan ── */}
        <section className="mt-20">
          <JudulBagian judul="Pertanyaan yang sering diajukan" />
          <div className="mt-6 divide-y divide-garis overflow-hidden rounded-[var(--radius-kartu)] border border-garis bg-kartu">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                  {q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-garis text-redup transition-transform duration-200 ease-[var(--ease-standar)] group-open:rotate-45">
                    <Plus size={14} aria-hidden="true" />
                  </span>
                </summary>
                <p className="mt-3 max-w-[72ch] text-bantu leading-[1.6] text-redup">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Ajakan penutup: tanpa kartu, cukup garis atas ── */}
        <section className="mt-20 border-t border-garis pt-12 text-center">
          <h2 className="text-bagian font-bold leading-[1.25] tracking-[-0.02em] text-balance text-tinta">
            Anda tidak perlu menghadapinya sendiri.
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-bantu leading-[1.6] text-redup">
            Melapor memberi perusahaan kesempatan untuk memperbaiki keadaan.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-tinta px-6 text-isi font-semibold text-kartu transition-colors duration-150 hover:bg-tinta-hover"
          >
            Masuk untuk melapor
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>

      {/* ── Kaki halaman ── */}
      <footer className="border-t border-garis bg-kartu">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 pt-6 pb-12 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <div className="text-bantu font-semibold text-tinta">{APP_NAME}</div>
            <div className="mt-1 text-bantu text-redup">{ORG_NAME}, Divisi Human Capital</div>
            <a
              href="mailto:hc@hutamakarya.co.id"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-garis-kuat bg-kartu px-5 text-bantu font-semibold text-tinta transition-colors duration-150 hover:bg-latar"
            >
              Hubungi tim HC
            </a>
          </div>
          <div className="flex items-center gap-5">
            {/* Tinggi 32px, lebar mengikuti rasio asli berkas (h-8 w-auto). */}
            <Image
              src="/logos/danantara.png" alt="Danantara" width={128} height={32} className="h-8 w-auto"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <Image
              src="/logos/hk.png" alt="Hutama Karya" width={128} height={32} className="h-8 w-auto"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
