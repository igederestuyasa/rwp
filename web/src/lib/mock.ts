// Data contoh (mockup UI). Identitas pelapor sengaja TIDAK disertakan di
// data laporan untuk mencerminkan prinsip privasi (§9.1).
import type { ChatMessage, Report, StatusLog, User } from "./types";

export type DemoUserKey = "karyawan" | "admin_rwp" | "admin_superior";

export const DEMO_USERS: Record<DemoUserKey, User> = {
  karyawan: {
    id: "u-emp", nik: "EMP001", nama: "Budi Santoso",
    email: "budi@hutamakarya.co.id", role: "karyawan", canEscalate: false,
  },
  admin_rwp: {
    id: "u-adm-rwp", nik: "ADM005", nama: "Admin RWP",
    email: "admin.rwp@hutamakarya.co.id", role: "admin", subRole: "rwp", canEscalate: false,
  },
  admin_superior: {
    id: "u-adm", nik: "ADM001", nama: "Admin HC",
    email: "admin@hutamakarya.co.id", role: "admin", subRole: "superior", canEscalate: true,
  },
};

export const SEED_REPORTS: Report[] = [
  // ===== Jalur RWP (sensitif) =====
  {
    id: "r1", ticketNo: "RWP-2026-0001",
    kategori: "Perundungan",
    judul: "Perundungan verbal di tim proyek",
    kronologi:
      "Rekan kerja berulang kali melontarkan ejekan di depan tim saat rapat mingguan selama tiga minggu terakhir.",
    tanggalKejadian: "2026-05-20", lokasi: "Kantor Pusat", terlapor: "Inisial X",
    isAnonymous: true, status: "Sedang Ditinjau",
    createdAt: "2026-05-21T09:30:00", updatedAt: "2026-05-22T14:00:00", evidenceCount: 2,
  },
  {
    id: "r3", ticketNo: "RWP-2026-0002",
    kategori: "Pelecehan",
    judul: "Komentar tidak pantas berulang",
    kronologi: "Komentar bernada melecehkan disampaikan melalui kanal chat tim.",
    tanggalKejadian: "2026-05-28", lokasi: undefined, terlapor: "Inisial Y",
    isAnonymous: true, status: "Tindak Lanjut",
    createdAt: "2026-05-29T08:15:00", updatedAt: "2026-05-30T10:00:00", evidenceCount: 1,
  },
];

export const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "m1", reportId: "r1", senderRole: "karyawan",
    message: "Selamat siang, saya ingin menanyakan perkembangan laporan saya.",
    createdAt: "2026-05-22T10:15:00",
  },
  {
    id: "m2", reportId: "r1", senderRole: "admin",
    message: "Terima kasih. Laporan Anda sedang kami tinjau dan akan kami kabari perkembangannya.",
    createdAt: "2026-05-22T14:05:00",
  },
];

export const SEED_LOGS: StatusLog[] = [
  {
    id: "l1", reportId: "r1", fromStatus: "Diterima", toStatus: "Sedang Ditinjau",
    note: "Laporan sedang dinilai tim HC.", createdAt: "2026-05-22T14:00:00",
  },
  {
    id: "l2", reportId: "r3", fromStatus: "Diterima", toStatus: "Sedang Ditinjau",
    note: undefined, createdAt: "2026-05-29T15:00:00",
  },
  {
    id: "l3", reportId: "r3", fromStatus: "Sedang Ditinjau", toStatus: "Tindak Lanjut",
    note: "Mulai penanganan oleh tim terkait.", createdAt: "2026-05-30T10:00:00",
  },
];


// Jawaban Q&A contoh (mock RAG) — ditampilkan saat user bertanya.
export const MOCK_QA_ANSWER =
  "Berdasarkan dokumen kebijakan RWP, setiap karyawan berhak atas lingkungan " +
  "kerja yang bebas dari pelecehan, diskriminasi, dan perundungan. Laporan dapat " +
  "disampaikan melalui kanal resmi, identitas pelapor dilindungi, dan perusahaan " +
  "melarang segala bentuk pembalasan terhadap pelapor yang beritikad baik.";

export const MOCK_QA_SOURCES = ["Kebijakan_RWP_HK.pdf"];
