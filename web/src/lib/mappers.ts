// ============================================================
// Mapper DB (snake_case) ↔ App types (camelCase)
// ------------------------------------------------------------
// Supabase mengembalikan baris dengan nama kolom snake_case,
// sementara tipe app pakai camelCase. Semua konversi dipusatkan
// di sini agar store/auth tetap bersih dan UI tidak berubah.
// ============================================================
import type {
  User, Report, ChatMessage, StatusLog, Role, Status, SubRole, EvidenceFile,
} from "./types";

// ===== Bentuk baris mentah dari DB =====
export interface UserRow {
  id: string;
  nik: string;
  nama: string;
  email: string | null;
  role: string;
  sub_role: string | null;
  can_escalate: boolean;
  created_at: string;
}

export interface ReportRow {
  id: string;
  ticket_no: string;
  reporter_id?: string; // tidak ada di v_reports_admin
  kategori: string;
  judul: string;
  kronologi: string;
  tanggal_kejadian: string;
  lokasi: string | null;
  terlapor: string | null;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface MessageRow {
  id: string;
  report_id: string;
  sender_role: string;
  message: string;
  attachments: string[] | null;
  created_at: string;
}

export interface StatusLogRow {
  id: string;
  report_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  attachments: string[] | null;
  created_at: string;
}

// ===== Lampiran (disimpan sebagai text[] berisi JSON {name,path}) =====

/** Parse kolom attachments (text[]) → EvidenceFile[]. Toleran terhadap
 *  data lama yang masih berupa nama biasa (path dikosongkan). */
export function parseAttachments(arr: string[] | null): EvidenceFile[] | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr.map((s) => {
    try {
      const o = JSON.parse(s);
      if (o && typeof o === "object" && "path" in o) {
        return { name: o.name ?? "berkas", path: o.path ?? "" };
      }
    } catch {
      /* bukan JSON → anggap nama biasa */
    }
    return { name: s, path: "" };
  });
}

/** EvidenceFile[] → text[] (JSON) untuk disimpan di DB. */
export function encodeAttachments(files: EvidenceFile[]): string[] {
  return files.map((f) => JSON.stringify(f));
}

// ===== DB → App =====

export function userFromRow(row: UserRow): User {
  return {
    id: row.id,
    nik: row.nik,
    nama: row.nama,
    email: row.email ?? "",
    role: row.role as Role,
    subRole: (row.sub_role as SubRole | null) ?? undefined,
    canEscalate: row.can_escalate,
  };
}

/** Konversi baris report. `extra` untuk data turunan (jumlah/daftar bukti,
 *  identitas pelapor bila di-join) yang bukan kolom langsung di tabel reports. */
export function reportFromRow(
  row: ReportRow,
  extra?: { evidenceCount?: number; evidence?: EvidenceFile[]; reporterName?: string; reporterNik?: string },
): Report {
  return {
    id: row.id,
    ticketNo: row.ticket_no,
    kategori: row.kategori,
    judul: row.judul,
    kronologi: row.kronologi,
    tanggalKejadian: row.tanggal_kejadian,
    lokasi: row.lokasi ?? undefined,
    terlapor: row.terlapor ?? undefined,
    isAnonymous: row.is_anonymous,
    reporterName: extra?.reporterName,
    reporterNik: extra?.reporterNik,
    status: row.status as Status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? undefined,
    evidenceCount: extra?.evidenceCount ?? 0,
    evidence: extra?.evidence,
  };
}

export function messageFromRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    reportId: row.report_id,
    senderRole: row.sender_role as Role,
    message: row.message,
    attachments: parseAttachments(row.attachments),
    createdAt: row.created_at,
  };
}

export function statusLogFromRow(row: StatusLogRow): StatusLog {
  return {
    id: row.id,
    reportId: row.report_id,
    fromStatus: (row.from_status as Status | null) ?? null,
    toStatus: row.to_status as Status,
    note: row.note ?? undefined,
    attachments: parseAttachments(row.attachments),
    createdAt: row.created_at,
  };
}

// ===== App → DB (untuk insert) =====

/** Payload insert ke tabel reports. ticket_no dibiarkan kosong agar
 *  trigger DB (set_ticket_no) yang generate — atomik & aman dari RLS. */
export function reportToInsert(
  input: {
    kategori: string;
    judul: string;
    kronologi: string;
    tanggalKejadian: string;
    lokasi?: string;
    terlapor?: string;
    isAnonymous: boolean;
  },
  reporterId: string,
) {
  return {
    reporter_id: reporterId,
    kategori: input.kategori,
    judul: input.judul,
    kronologi: input.kronologi,
    tanggal_kejadian: input.tanggalKejadian,
    lokasi: input.lokasi ?? null,
    terlapor: input.terlapor ?? null,
    is_anonymous: input.isAnonymous,
  };
}
