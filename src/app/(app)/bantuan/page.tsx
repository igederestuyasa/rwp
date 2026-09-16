"use client";

import { useRouter } from "next/navigation";
import { Robot, EnvelopeSimple, CaretRight } from "@phosphor-icons/react";
import { ASSISTANT_NAME } from "@/lib/constants";
import { Card, SectionTitle } from "@/components/ui/Card";

export default function BantuanPage() {
  const router = useRouter();
  const faqs = [
    { q: "Bagaimana cara melaporkan insiden RWP?", a: "Buka menu Lapor Insiden, isi kategori, kronologi, dan tanggal kejadian. Bukti pendukung boleh dilampirkan, dan kamu bisa memilih melapor secara anonim. Setelah terkirim kamu menerima nomor tiket untuk melacak penanganannya." },
    { q: "Apakah laporan saya dijamin rahasia?", a: "Identitas pelapor disimpan terpisah dari isi laporan dan tidak ditampilkan ke admin. Anonimitas bersifat prosedural: sistem tetap menyimpan kaitan ke akun untuk anti-spam dan tindak lanjut, tapi identitas hanya bisa dibuka lewat eskalasi resmi oleh admin berwenang — dan pembukaan itu tercatat di riwayat laporanmu." },
    { q: "Bagaimana memantau status laporan?", a: "Buka Lacak Laporan untuk melihat status terkini, riwayat penanganan, dan berkomunikasi langsung dengan admin RWP." },
    { q: "Saya belum siap melapor, tapi butuh dukungan.", a: "Buka menu Layanan Psikologi. Ada careline 24/7, WhatsApp, psikolog internal, dan platform Naluri — semuanya terpisah dari sistem pelaporan dan tidak otomatis membuat laporan." },
  ];

  return (
    <div>
      {/* ── Pembuka layar ── */}
      <h1
        className="pembuka-masuk text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
        style={{ animationDelay: "0ms" }}
      >
        Bantuan
      </h1>
      <p
        className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
        style={{ animationDelay: "60ms" }}
      >
        Temukan jawaban seputar RWP, atau hubungi tim Human Capital.
      </p>

      {/* ── Dua kartu aksi ── */}
      <div
        className="pembuka-masuk mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
        style={{ animationDelay: "110ms" }}
      >
        <Card className="transition-colors duration-150 [transition-timing-function:var(--ease-standar)] hover:border-tinta">
          <button
            type="button"
            onClick={() => router.push("/asisten")}
            className="flex w-full items-center gap-4 p-4 text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-latar text-tinta">
              <Robot size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                Tanya {ASSISTANT_NAME}
              </span>
              <span className="mt-1 block text-bantu text-redup">
                Asisten AI untuk pertanyaan cepat.
              </span>
            </span>
            <CaretRight size={18} aria-hidden="true" className="shrink-0 text-redup" />
          </button>
        </Card>

        <Card>
          <div className="flex items-center gap-4 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-latar text-tinta">
              <EnvelopeSimple size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                Hubungi HC
              </p>
              <p className="mt-1 truncate text-bantu text-redup">
                hc-support@hutamakarya.co.id
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Pertanyaan umum ── */}
      <section className="mt-12">
        <SectionTitle
          title="Pertanyaan umum"
          subtitle="Jawaban ringkas untuk hal yang paling sering ditanyakan karyawan."
        />
        <Card className="mt-4 divide-y divide-garis">
          {faqs.map((f) => (
            <div key={f.q} className="p-4 sm:p-6">
              <h3 className="text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                {f.q}
              </h3>
              <p className="mt-2 text-isi leading-[1.5] text-redup">{f.a}</p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
