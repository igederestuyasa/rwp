// Tipe data domain RWP (mockup UI — selaras skema Supabase nantinya).

export type Role = "karyawan" | "admin";

// Sub-role khusus admin. Di app RWP hanya ada satu grup admin, jadi
// pembedanya cuma wewenang eskalasi identitas (lihat User.canEscalate).
export type SubRole = "superior" | "rwp";

export type Status =
  | "Diterima"
  | "Sedang Ditinjau"
  | "Tindak Lanjut"
  | "Selesai"
  | "Ditutup";

export interface User {
  id: string;
  nik: string;
  nama: string;
  email: string;
  role: Role;
  subRole?: SubRole; // hanya untuk admin; undefined = karyawan biasa
  canEscalate: boolean;
}

export interface Report {
  id: string;
  ticketNo: string;
  kategori: string; // salah satu dari KATEGORI_INSIDEN
  judul: string;
  kronologi: string; // deskripsi / kronologi
  tanggalKejadian: string;
  lokasi?: string;
  terlapor?: string;
  isAnonymous: boolean;
  // Identitas pelapor — hanya diisi bila isAnonymous: false.
  // Tidak pernah ditampilkan ke admin kecuali via eskalasi (isAnonymous: true)
  // atau langsung terlihat (isAnonymous: false) untuk admin OD & superior.
  reporterName?: string;
  reporterNik?: string;
  status: Status;
  createdAt: string; // waktu masuk
  updatedAt: string;
  resolvedAt?: string; // waktu selesai/ditutup (untuk tracking SLA)
  evidenceCount: number;
  evidence?: EvidenceFile[]; // file bukti yang diunggah saat pelaporan
}

/** Berkas bukti — nama asli (tampilan) + path di Storage (untuk signed URL). */
export interface EvidenceFile {
  name: string;
  path: string; // kosong di mode mock (tidak ada file asli)
}

export interface ChatMessage {
  id: string;
  reportId: string;
  senderRole: Role;
  message: string;
  attachments?: EvidenceFile[]; // file yang dilampirkan dalam pesan
  createdAt: string;
}

/** Penilaian pelapor atas penanganan laporannya — satu kali, hanya setelah
 *  status final (Selesai/Ditutup). Tidak membawa identitas: kepemilikan
 *  diturunkan dari laporan (§9.1). */
export interface ReportFeedback {
  reportId: string;
  stars: number; // 1–5
  comment?: string;
  createdAt: string;
}

export interface StatusLog {
  id: string;
  reportId: string;
  fromStatus: Status | null;
  toStatus: Status;
  note?: string;
  attachments?: EvidenceFile[]; // file yang dilampirkan admin saat ubah status
  createdAt: string;
}
