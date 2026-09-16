"use client";

// Landing page publik — pengunjung yang belum login.
// Sistem UI "HC Panel" (docs/DESIGN.md): permukaan datar, warna hanya dari
// token, satu aksen merah, ikon Phosphor/GenerativeIcon/Logo, tanpa bayangan.
// Gerak dibatasi ke muat halaman dan umpan balik hover.

import Link from "next/link";
import {
  ArrowRight, ChatCircleText, EyeSlash, FileMagnifyingGlass,
  Lock, Plus, ShieldWarning,
} from "@phosphor-icons/react";
import { APP_NAME, ORG_NAME, ASSISTANT_NAME } from "@/lib/constants";
import { Logo } from "@/components/hc/Logo";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";

const JAMINAN = [
  {
    icon: EyeSlash,
    title: "Bisa melapor anonim",
    desc: "Kamu memilih sendiri apakah namamu ikut terkirim. Kalau anonim, identitasmu tidak ditampilkan kepada admin.",
  },
  {
    icon: Lock,
    title: "Identitas disimpan terpisah",
    desc: "Nama pelapor tidak menempel pada isi laporan. Admin membaca laporannya, bukan siapa yang menulisnya.",
  },
  {
    icon: FileMagnifyingGlass,
    title: "Pembukaan identitas tercatat",
    desc: "Bila penanganan menuntutnya, identitas hanya bisa dibuka admin berwenang — dan kamu melihat catatannya di riwayat laporanmu.",
  },
];

const LANGKAH = [
  { n: "01", title: "Tulis laporanmu", desc: "Pilih kategori insiden, ceritakan kronologinya, lampirkan bukti bila ada." },
  { n: "02", title: "Terima nomor tiket", desc: "Nomor ini kuncimu untuk memantau penanganan, bahkan bila kamu melapor anonim." },
  { n: "03", title: "Ditinjau tim HC", desc: "Status berubah dari Diterima → Sedang Ditinjau → Tindak Lanjut, semuanya terlihat olehmu." },
  { n: "04", title: "Tetap terhubung", desc: "Balas pertanyaan admin lewat kolom percakapan di dalam laporan, tanpa membuka identitas." },
];

// Ikon pintu datang dari GenerativeIcon di dalam ItemCard (§Batas gaya),
// jadi entri di sini cukup nama + keterangan.
const PINTU = [
  { title: "Kebijakan RWP", desc: "Handbook lengkap: definisi, kategori pelanggaran, contoh kasus nyata, dan sanksinya." },
  { title: "Pelaporan insiden", desc: "Kanal resmi untuk pelecehan, diskriminasi, perundungan, kekerasan, bias gender, dan eksklusivitas." },
  { title: "Pelacakan laporan", desc: "Pantau status penanganan dan berkomunikasi dengan admin RWP." },
  { title: "Layanan psikologi", desc: "Careline 24/7, psikolog internal, dan platform wellness — terpisah dari sistem pelaporan." },
];

const FAQ = [
  {
    q: "Apakah benar-benar tidak ada yang tahu siapa saya?",
    a: "Anonimitas di sini bersifat prosedural, bukan teknis absolut — dan kami memilih jujur soal itu. Sistem tetap menyimpan kaitan ke akunmu untuk mencegah penyalahgunaan dan agar tindak lanjut mungkin dilakukan. Yang dijamin: identitasmu tidak ditampilkan kepada admin, dan pembukaannya hanya bisa dilakukan admin berwenang serta selalu tercatat di riwayat laporanmu.",
  },
  {
    q: "Bagaimana kalau saya belum yakin ini termasuk pelanggaran?",
    a: `Tanya dulu ke ${ASSISTANT_NAME}. Asisten menjawab berdasarkan handbook RWP resmi, termasuk contoh kasus nyata, sehingga kamu bisa menimbang tanpa harus melapor lebih dulu.`,
  },
  {
    q: "Saya butuh dukungan, tapi belum siap melapor.",
    a: "Buka Layanan Psikologi. Careline 24/7, psikolog internal, dan platform Naluri bisa dihubungi langsung. Kanal-kanal itu terpisah dari sistem pelaporan dan tidak otomatis membuat laporan.",
  },
  {
    q: "Apakah pelapor bisa dibalas atau dirugikan?",
    a: "Tidak boleh. Perusahaan melarang segala bentuk pembalasan terhadap pelapor yang beritikad baik. Bila kamu mengalaminya, itu sendiri merupakan pelanggaran yang bisa dilaporkan.",
  },
];

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
        {/* ── Pembuka layar ── */}
        <section className="pt-12 lg:pt-16">
          <span
            className="pembuka-masuk inline-flex items-center gap-2 rounded-full border border-garis bg-kartu px-3 py-1.5 text-mikro font-semibold text-redup"
            style={{ animationDelay: "0ms" }}
          >
            <ShieldWarning size={14} aria-hidden="true" className="text-merah-ikon" />
            Respectful Workplace Policy
          </span>

          <h1
            className="pembuka-masuk mt-5 max-w-[24ch] text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
            style={{ animationDelay: "60ms" }}
          >
            Tempat kerja yang aman dimulai dari berani bicara.
          </h1>

          <p
            className="pembuka-masuk mt-5 max-w-[58ch] text-subjudul leading-[1.5] text-redup"
            style={{ animationDelay: "110ms" }}
          >
            Kanal resmi {ORG_NAME} untuk melaporkan pelecehan, diskriminasi,
            perundungan, dan kekerasan di tempat kerja. Kerahasiaan dijaga sejak
            laporan ditulis sampai penanganannya selesai.
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
              Pelajari alurnya
            </a>
          </div>
        </section>

        {/* ── Jaminan privasi ── */}
        <section className="mt-16">
          <JudulBagian
            judul="Yang bikin kanal ini beda"
            keterangan="Alasan orang urung melapor hampir selalu sama: takut ketahuan. Tiga hal berikut dibangun ke dalam sistem, bukan sekadar dijanjikan."
          />
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {JAMINAN.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-latar text-tinta">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                  {title}
                </h3>
                <p className="mt-2 text-bantu leading-[1.5] text-redup">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cara kerja ── */}
        <section id="cara-kerja" className="mt-16 scroll-mt-20">
          <JudulBagian judul="Empat langkah, dari cerita ke tindak lanjut" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map(({ n, title, desc }) => (
              <div
                key={n}
                className="rounded-[var(--radius-kartu)] border border-garis bg-kartu p-4"
              >
                <span className="text-mikro font-semibold tracking-[0.08em] text-merah">{n}</span>
                <h3 className="mt-3 text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                  {title}
                </h3>
                <p className="mt-2 text-bantu leading-[1.5] text-redup">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pintu masuk aplikasi ── */}
        <section className="mt-16">
          <JudulBagian
            judul="Bukan cuma kotak pengaduan"
            keterangan="Empat pintu di dalam aplikasi. Masuk dengan akun karyawan untuk membukanya."
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

        {/* ── Sahabat RWP ── */}
        <section className="mt-16 rounded-[var(--radius-panel)] border border-garis bg-kartu p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-latar text-tinta">
              <ChatCircleText size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                {ASSISTANT_NAME}
              </div>
              <div className="mt-1 text-bantu text-redup">Asisten kebijakan RWP</div>
            </div>
          </div>
          <p className="mt-5 max-w-[62ch] text-isi leading-[1.5] text-redup">
            Ragu apakah yang kamu alami termasuk pelanggaran? Tanya lebih dulu.
            Jawabannya disusun dari handbook RWP resmi perusahaan — termasuk contoh
            kasus nyata — dan bila informasinya tidak ada di dokumen, asisten akan
            bilang tidak tahu, bukan mengarang.
          </p>
          <p className="mt-4 max-w-[62ch] text-bantu leading-[1.5] text-redup">
            Asisten membantu menjelaskan kebijakan. Penilaian dan tindak lanjut resmi
            tetap dilakukan tim Human Capital.
          </p>
        </section>

        {/* ── Pertanyaan yang sering muncul ── */}
        <section className="mt-16">
          <JudulBagian judul="Pertanyaan yang sering muncul" />
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

        {/* ── Ajakan penutup ── */}
        <section className="mt-16 rounded-[var(--radius-panel)] border border-garis bg-kartu p-8 text-center lg:p-12">
          <h2 className="text-bagian font-bold leading-[1.25] tracking-[-0.02em] text-balance text-tinta">
            Kamu tidak harus menghadapinya sendirian
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-bantu leading-[1.6] text-redup">
            Melapor bukan berarti mencari masalah. Melapor berarti memberi kesempatan
            perusahaan untuk memperbaikinya.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-tinta px-6 text-isi font-semibold text-kartu transition-colors duration-150 hover:bg-tinta-hover"
          >
            Masuk ke {APP_NAME}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>

      {/* ── Kaki halaman ── */}
      <footer className="border-t border-garis bg-kartu">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 pt-6 pb-12 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <div className="text-bantu font-semibold text-tinta">{APP_NAME}</div>
            <div className="mt-1 text-bantu text-redup">{ORG_NAME} · Divisi Human Capital</div>
            <a
              href="mailto:hc@hutamakarya.co.id"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-garis-kuat bg-kartu px-5 text-bantu font-semibold text-tinta transition-colors duration-150 hover:bg-latar"
            >
              Hubungi tim HC
            </a>
          </div>
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/danantara.png" alt="Danantara" className="h-8 w-auto"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/hk.png" alt="Hutama Karya" className="h-8 w-auto"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
