// ============================================================
// DATA DEMO — laporan RWP untuk menguji dashboard, filter tanggal,
// dan pagination Daftar Laporan di mode mock (USE_MOCK=true).
//
// Skenario diambil dari contoh pelanggaran di handbook RWP supaya
// demo terasa nyata, bukan "test test". Kategori WAJIB memakai string
// dari KATEGORI_INSIDEN — kalau meleset, chart kategori di dashboard
// akan kosong (bug ini pernah terjadi dengan "Perundungan (bullying)").
//
// ⚠️ CARA HAPUS SETELAH DEMO:
//   1. Hapus file ini.
//   2. Di src/lib/store.tsx: hapus import DEMO_REPORTS dan
//      hapus "...DEMO_REPORTS" dari nilai awal useState reports.
// ============================================================
import type { Report, Status } from "./types";
import { KATEGORI_INSIDEN } from "./constants";
import { makeTicketNo } from "./utils";

type Skenario = {
  kategori: (typeof KATEGORI_INSIDEN)[number];
  judul: string;
  kronologi: string;
  lokasi?: string;
};

// 14 skenario × siklus status/anonimitas → sebaran yang tidak monoton.
const SKENARIO: Skenario[] = [
  {
    kategori: "Perundungan",
    judul: "Ejekan berulang di rapat mingguan tim proyek",
    kronologi:
      "Dalam tiga rapat terakhir, seorang rekan berulang kali melontarkan ejekan soal cara saya berbicara di depan seluruh tim. Setelah rapat, candaan itu dilanjutkan di grup chat tim.",
    lokasi: "Kantor Pusat Lt. 5",
  },
  {
    kategori: "Pelecehan",
    judul: "Komentar bernada seksual di kanal chat tim",
    kronologi:
      "Beberapa kali menerima komentar bernada seksual terhadap penampilan saya melalui chat kerja. Sudah saya minta hentikan, tetapi berlanjut.",
    lokasi: "Kanal chat internal",
  },
  {
    kategori: "Diskriminasi",
    judul: "Kesempatan pelatihan dibatasi karena status pernikahan",
    kronologi:
      "Saat pembagian peserta pelatihan, saya diberitahu tidak diikutkan karena 'sudah berkeluarga dan pasti repot'. Rekan lain dengan kompetensi setara diikutkan.",
    lokasi: "Divisi Operasional",
  },
  {
    kategori: "Bias Gender",
    judul: "Penugasan notulen selalu diberikan ke karyawan perempuan",
    kronologi:
      "Dalam setiap rapat unit, tugas notulen otomatis diberikan ke karyawan perempuan tanpa rotasi, sementara rekan laki-laki tidak pernah mendapat giliran.",
    lokasi: "Ruang rapat Divisi",
  },
  {
    kategori: "Eksklusivitas",
    judul: "Keputusan tim dibahas di grup chat tertutup",
    kronologi:
      "Sekelompok rekan membuat grup chat terbatas dan memutuskan hal-hal pekerjaan di sana sebelum rapat resmi. Saya selalu datang rapat tanpa informasi yang cukup.",
  },
  {
    kategori: "Kekerasan",
    judul: "Membentak dan menggebrak meja saat evaluasi kerja",
    kronologi:
      "Saat evaluasi pekerjaan, atasan membentak dengan suara keras dan menggebrak meja di depan rekan-rekan satu ruangan. Saya merasa terintimidasi.",
    lokasi: "Ruang kerja unit",
  },
  {
    kategori: "Perundungan",
    judul: "Dikucilkan dari komunikasi kerja sehari-hari",
    kronologi:
      "Sejak berbeda pendapat dalam satu rapat, saya tidak lagi diajak berdiskusi dan informasi pekerjaan sengaja tidak diteruskan kepada saya.",
  },
  {
    kategori: "Eksklusivitas",
    judul: "Informasi kerja ditahan berdasarkan senioritas",
    kronologi:
      "Rekan yang lebih senior menolak membagikan template dan data yang dibutuhkan untuk menyelesaikan tugas, dengan alasan 'cari sendiri dulu seperti dulu saya'.",
    lokasi: "Proyek Tol Ruas B",
  },
  {
    kategori: "Diskriminasi",
    judul: "Penilaian kinerja dikaitkan dengan asal daerah",
    kronologi:
      "Dalam sesi umpan balik, atasan mengaitkan cara kerja saya dengan stereotip asal daerah saya. Hal serupa terjadi dua kali dalam periode penilaian ini.",
  },
  {
    kategori: "Pelecehan",
    judul: "Sentuhan fisik tidak pantas saat kegiatan kantor",
    kronologi:
      "Saat kegiatan gathering unit, seorang rekan beberapa kali melakukan sentuhan fisik yang membuat saya tidak nyaman meski sudah saya hindari.",
    lokasi: "Kegiatan gathering unit",
  },
  {
    kategori: "Bias Gender",
    judul: "Ucapan meremehkan kemampuan teknis rekan perempuan",
    kronologi:
      "Saat pembahasan teknis, rekan perempuan berulang kali dipotong dan idenya baru diterima setelah diulang oleh rekan laki-laki.",
    lokasi: "Site Proyek",
  },
  {
    kategori: "Lainnya",
    judul: "Tekanan untuk menutupi temuan pekerjaan",
    kronologi:
      "Saya diminta tidak mencantumkan sebuah temuan di laporan dengan alasan menjaga nama baik unit. Saya merasa ini tidak sesuai nilai perusahaan.",
  },
  {
    kategori: "Kekerasan",
    judul: "Ancaman terkait kelanjutan kontrak kerja",
    kronologi:
      "Setelah menolak permintaan lembur di luar ketentuan, saya menerima pernyataan bahwa kelanjutan kontrak saya 'bisa dipertimbangkan ulang'.",
  },
  {
    kategori: "Perundungan",
    judul: "Julukan merendahkan yang terus dipakai di tempat kerja",
    kronologi:
      "Rekan-rekan satu unit memakai julukan merendahkan terkait kondisi fisik saya. Sudah saya sampaikan keberatan, namun tetap dipakai sampai sekarang.",
    lokasi: "Kantor Wilayah",
  },
];

const STATUS_CYCLE: Status[] = [
  "Diterima", "Sedang Ditinjau", "Tindak Lanjut", "Selesai", "Ditutup",
];

const TERLAPOR = ["Inisial A.B.", "Inisial R.", "Inisial D.P.", undefined, "Inisial S.W.", undefined];

// Basis tanggal demo (akhir Mei 2026) — sejalan dengan SEED_REPORTS.
const BASE = new Date("2026-05-31T09:00:00");

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function generate(): Report[] {
  const out: Report[] = [];
  let seq = 900;

  for (let i = 0; i < 40; i++) {
    const sk = SKENARIO[i % SKENARIO.length];
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];

    // ~1–2 laporan per hari, mundur dari BASE → tersebar ~28 hari.
    const dayOffset = Math.floor((i * 5) / 7);
    const created = new Date(BASE.getTime() - dayOffset * 86400000);
    created.setHours(i % 2 === 0 ? 9 : 14, (i * 7) % 60, 0, 0);

    // Kejadian mendahului laporan 1–5 hari.
    const kejadian = new Date(created.getTime() - (1 + (i % 5)) * 86400000);

    const isFinal = status === "Selesai" || status === "Ditutup";
    let resolved: Date | undefined;
    if (isFinal) {
      resolved = new Date(created.getTime() + (2 + (i % 4)) * 86400000);
      resolved.setHours(16, 0, 0, 0);
    }

    // ~60% anonim — mencerminkan kecenderungan nyata pada kanal RWP.
    const anonim = i % 5 !== 0 && i % 7 !== 0;

    out.push({
      id: `demo-${i}`,
      ticketNo: makeTicketNo("RWP", seq++),
      kategori: sk.kategori,
      judul: sk.judul,
      kronologi: sk.kronologi,
      tanggalKejadian: fmt(kejadian).slice(0, 10),
      lokasi: sk.lokasi,
      terlapor: TERLAPOR[i % TERLAPOR.length],
      isAnonymous: anonim,
      reporterName: anonim ? undefined : "Budi Santoso",
      reporterNik: anonim ? undefined : "EMP001",
      status,
      createdAt: fmt(created),
      updatedAt: fmt(resolved ?? created),
      resolvedAt: resolved ? fmt(resolved) : undefined,
      evidenceCount: i % 3 === 0 ? 1 : 0,
    });
  }
  return out;
}

export const DEMO_REPORTS: Report[] = generate();
