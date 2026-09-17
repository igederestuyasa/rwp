"use client";

// Store — flag-gated.
//  - USE_MOCK=true  → state di memori (seed mock), perilaku lama.
//  - USE_MOCK=false → Supabase. Reports/messages/logs di-fetch saat user siap.
//
// Kontrak dijaga: { reports, messages, logs, addReport, addMessage, changeStatus }.
// Perubahan signature: addReport kini async (Promise<Report>) — call site di-await.
// Tambahan (hasil audit): `loading` dan `error`, supaya halaman bisa membedakan
// "belum tiba" / "gagal memuat" dari "memang kosong".
// Tambahan (penilaian): `feedback` + `rateReport` — penilaian pelapor setelah
// laporan final; hanya milik pelapor sendiri, admin tidak pernah menerimanya.
import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from "react";
import { SEED_LOGS, SEED_MESSAGES, SEED_REPORTS } from "./mock";
import { DEMO_REPORTS } from "./demoReports"; // ⚠️ data demo (mode mock)
import { useAuth } from "./auth";
import { getSupabase, USE_MOCK } from "./supabaseClient";
import {
  reportFromRow, reportToInsert, messageFromRow, statusLogFromRow, feedbackFromRow,
  encodeAttachments,
  type ReportRow, type MessageRow, type StatusLogRow, type FeedbackRow,
} from "./mappers";
import { uploadEvidence, uploadAttachments } from "./storage";
import { STATUS_FINAL } from "./constants";
import type {
  ChatMessage, EvidenceFile, Report, ReportFeedback, Role, Status, StatusLog,
} from "./types";
import { makeTicketNo, withTimeout } from "./utils";

// Batas waktu fetch Supabase — kalau request menggantung (mis. browser
// blokir supabase.co), refresh() menyerah daripada nunggu selamanya.
const FETCH_TIMEOUT_MS = 12000;

// Kolom yang benar-benar dipakai mapper — kolom baru di DB tidak otomatis
// ikut terkirim ke browser (§9.1: jangan tampilkan lebih dari yang perlu).
const KOLOM_LAPORAN =
  "id, ticket_no, kategori, judul, kronologi, tanggal_kejadian, lokasi, terlapor, is_anonymous, status, created_at, updated_at, resolved_at";
const KOLOM_LAPORAN_ADMIN = `${KOLOM_LAPORAN}, reporter_name, reporter_nik`;
const KOLOM_PESAN = "id, report_id, sender_role, message, attachments, created_at";
const KOLOM_LOG = "id, report_id, from_status, to_status, note, attachments, created_at";
const KOLOM_PENILAIAN = "report_id, stars, comment, created_at";

/** Baris v_reports_admin: kolom laporan + identitas yang sudah disaring SQL. */
type ReportRowAdmin = ReportRow & { reporter_name?: string | null; reporter_nik?: string | null };

/**
 * Minta server mengirim email "ada pembaruan" ke pelapor lewat
 * POST /api/notifikasi/status (Brevo). Hanya dipanggil dari changeStatus
 * setelah RPC sukses. Kegagalan cukup ke console: statusnya sudah berubah
 * dan pelapor tetap melihatnya di aplikasi. Jawaban server tidak pernah
 * memuat alamat email pelapor (§9.1).
 */
async function kirimNotifikasiStatus(reportId: string): Promise<void> {
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/notifikasi/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reportId }),
    });
    const hasil = (await res.json().catch(() => null)) as
      { dikirim?: boolean; alasan?: string; error?: string } | null;
    if (!res.ok) {
      console.warn("[notifikasi] email status tidak terkirim:", hasil?.error ?? res.status);
    } else if (hasil?.dikirim === false) {
      console.info("[notifikasi] email status dilewati:", hasil.alasan);
    }
  } catch (e) {
    console.warn("[notifikasi] email status tidak terkirim:", e);
  }
}

const PESAN_GAGAL_MUAT =
  "Data laporan belum bisa dimuat dari server. Periksa koneksi, lalu coba lagi.";

interface NewReportInput {
  kategori: string;
  judul: string;
  kronologi: string;
  tanggalKejadian: string;
  lokasi?: string;
  terlapor?: string;
  isAnonymous: boolean;
  reporterName?: string;
  reporterNik?: string;
  files?: File[]; // file bukti (diupload ke Storage di mode Supabase)
}

interface StoreValue {
  reports: Report[];
  messages: ChatMessage[];
  logs: StatusLog[];
  /** Penilaian penanganan milik pelapor sendiri (untuk admin selalu kosong). */
  feedback: ReportFeedback[];
  addReport: (input: NewReportInput) => Promise<Report>;
  addMessage: (reportId: string, senderRole: Role, message: string, files?: File[]) => Promise<void>;
  changeStatus: (reportId: string, to: Status, note?: string, files?: File[]) => Promise<void>;
  /** Beri penilaian 1–5 bintang atas penanganan laporan yang sudah final — satu kali per laporan. */
  rateReport: (reportId: string, stars: number, comment?: string) => Promise<void>;
  /** Buka identitas pelapor anonim (eskalasi berotorisasi, dicatat di audit log). */
  revealReporter: (reportId: string, reason: string) => Promise<{ nama: string; nik: string }>;
  refresh: () => Promise<void>;
  /** Pemuatan pertama dari Supabase belum selesai (selalu false di mode mock). */
  loading: boolean;
  /** Pemuatan terakhir gagal — kalimat awam untuk ditampilkan; null bila sehat. */
  error: string | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();

  // Mode mock → seed langsung. Mode Supabase → kosong dulu, isi lewat refresh().
  const [reports, setReports] = useState<Report[]>(
    USE_MOCK ? [...SEED_REPORTS, ...DEMO_REPORTS] : [],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(USE_MOCK ? SEED_MESSAGES : []);
  const [logs, setLogs] = useState<StatusLog[]>(USE_MOCK ? SEED_LOGS : []);
  const [feedback, setFeedback] = useState<ReportFeedback[]>([]);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Fetch dari Supabase (role-aware)
  //  - admin   → v_reports_admin (tanpa reporter_id; nama hanya non-anonim)
  //  - karyawan→ reports (RLS otomatis filter ke laporannya sendiri)
  // ─────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (USE_MOCK || !user) return;
    const supabase = getSupabase();
    const isAdmin = user.role === "admin";

    try {
      // Lima sumber tidak saling bergantung → satu putaran jaringan, bukan lima.
      const [repRes, evRes, msgRes, logRes, fbRes] = await Promise.all([
        withTimeout(
          isAdmin
            ? supabase.from("v_reports_admin").select(KOLOM_LAPORAN_ADMIN).order("created_at", { ascending: false })
            : supabase.from("reports").select(KOLOM_LAPORAN).order("created_at", { ascending: false }),
          FETCH_TIMEOUT_MS,
        ),
        withTimeout(
          supabase.from("report_evidence").select("report_id, file_name, file_path"),
          FETCH_TIMEOUT_MS,
        ),
        withTimeout(
          supabase.from("report_messages").select(KOLOM_PESAN).order("created_at", { ascending: true }),
          FETCH_TIMEOUT_MS,
        ),
        withTimeout(
          supabase.from("report_status_log").select(KOLOM_LOG).order("created_at", { ascending: true }),
          FETCH_TIMEOUT_MS,
        ),
        // Penilaian hanya bisa dibaca pelapornya (tidak ada policy admin),
        // jadi untuk admin tidak perlu ditanyakan sama sekali.
        isAdmin
          ? Promise.resolve({ data: [] as FeedbackRow[], error: null })
          : withTimeout(supabase.from("report_feedback").select(KOLOM_PENILAIAN), FETCH_TIMEOUT_MS),
      ]);
      if (repRes.error) throw new Error(`reports: ${repRes.error.message}`);
      if (evRes.error) throw new Error(`evidence: ${evRes.error.message}`);
      if (msgRes.error) throw new Error(`messages: ${msgRes.error.message}`);
      if (logRes.error) throw new Error(`status_log: ${logRes.error.message}`);
      if (fbRes.error) throw new Error(`feedback: ${fbRes.error.message}`);

      // Evidence (jumlah + nama + path untuk signed URL)
      const evByReport = new Map<string, EvidenceFile[]>();
      ((evRes.data ?? []) as Array<{ report_id: string; file_name: string | null; file_path: string }>).forEach((e) => {
        const arr = evByReport.get(e.report_id) ?? [];
        arr.push({ name: e.file_name ?? "berkas", path: e.file_path });
        evByReport.set(e.report_id, arr);
      });

      setReports(
        ((repRes.data ?? []) as unknown as ReportRowAdmin[]).map((row) =>
          reportFromRow(row, {
            evidence: evByReport.get(row.id),
            evidenceCount: (evByReport.get(row.id) ?? []).length,
            reporterName: row.reporter_name ?? undefined,
            reporterNik: row.reporter_nik ?? undefined,
          }),
        ),
      );
      setMessages(((msgRes.data ?? []) as unknown as MessageRow[]).map(messageFromRow));
      setLogs(((logRes.data ?? []) as unknown as StatusLogRow[]).map(statusLogFromRow));
      setFeedback(((fbRes.data ?? []) as unknown as FeedbackRow[]).map(feedbackFromRow));
      setError(null);
    } catch (e) {
      // Jangan biarkan error/timeout menggantungkan UI: catat detailnya di
      // konsol, tampilkan kalimat awam lewat `error` supaya halaman tidak
      // menyamarkan kegagalan sebagai "belum ada laporan".
      console.error("Gagal memuat data dari Supabase:", e);
      setError(PESAN_GAGAL_MUAT);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Bersihkan data user sebelumnya saat logout/sesi habis (#4). Dilakukan di
  // fase render (adjust state during render) agar tak ada setState sinkron di
  // dalam efek. Mode mock dilewati sepenuhnya → data seed tetap utuh.
  const [prevUserId, setPrevUserId] = useState<string | null>(user?.id ?? null);
  if (!USE_MOCK && (user?.id ?? null) !== prevUserId) {
    setPrevUserId(user?.id ?? null);
    if (!user) {
      setReports([]);
      setMessages([]);
      setLogs([]);
      setFeedback([]);
    }
  }

  // Muat data saat user siap (efek async — sinkronisasi dengan Supabase).
  // refresh() async: setState terjadi SETELAH await (bukan cascading render
  // sinkron), jadi peringatan rule di sini false-positive — fetch-on-change
  // adalah penggunaan efek yang sah.
  useEffect(() => {
    if (USE_MOCK || !ready || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [ready, user, refresh]);

  // ── addReport ──
  async function addReport(input: NewReportInput): Promise<Report> {
    const files = input.files ?? [];

    if (USE_MOCK) {
      const now = new Date().toISOString();
      const report: Report = {
        id: `r-${Date.now()}`,
        ticketNo: makeTicketNo("RWP", reports.length + 101),
        kategori: input.kategori,
        judul: input.judul, kronologi: input.kronologi,
        tanggalKejadian: input.tanggalKejadian, lokasi: input.lokasi, terlapor: input.terlapor,
        isAnonymous: input.isAnonymous,
        reporterName: input.reporterName, reporterNik: input.reporterNik,
        status: "Diterima", createdAt: now, updatedAt: now,
        evidenceCount: files.length,
        evidence: files.map((f) => ({ name: f.name, path: "" })),
      };
      setReports((prev) => [report, ...prev]);
      return report;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reports")
      .insert(reportToInsert(input, user!.id))
      .select()
      .single();
    if (error) throw new Error(error.message);

    const report = reportFromRow(data, { evidenceCount: files.length });
    // Upload bukti ke Storage (kalau ada), lalu tarik ulang agar evidence muncul.
    if (files.length > 0) await uploadEvidence(report.id, files);
    await refresh();
    return report;
  }

  // ── addMessage ──
  async function addMessage(
    reportId: string, senderRole: Role, message: string, files?: File[],
  ): Promise<void> {
    if (USE_MOCK) {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`, reportId, senderRole, message,
          attachments: files && files.length > 0
            ? files.map((f) => ({ name: f.name, path: "" }))
            : undefined,
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    const supabase = getSupabase();
    const uploaded = files && files.length > 0 ? await uploadAttachments(reportId, files) : [];
    const { data, error } = await supabase
      .from("report_messages")
      .insert({
        report_id: reportId, sender_role: senderRole, message,
        attachments: encodeAttachments(uploaded),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setMessages((prev) => [...prev, messageFromRow(data)]);
  }

  // ── changeStatus ──
  async function changeStatus(
    reportId: string, to: Status, note?: string, files?: File[],
  ): Promise<void> {
    if (USE_MOCK) {
      const now = new Date().toISOString();
      const isFinal = to === "Selesai" || to === "Ditutup";
      const current = reports.find((r) => r.id === reportId);
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: to, updatedAt: now, resolvedAt: isFinal ? now : undefined }
            : r,
        ),
      );
      setLogs((prev) => [
        ...prev,
        {
          id: `l-${Date.now()}`, reportId,
          fromStatus: current?.status ?? null, toStatus: to, note,
          attachments: files && files.length > 0
            ? files.map((f) => ({ name: f.name, path: "" }))
            : undefined,
          createdAt: now,
        },
      ]);
      return;
    }

    const supabase = getSupabase();
    const uploaded = files && files.length > 0 ? await uploadAttachments(reportId, files) : [];
    const { error } = await supabase.rpc("change_report_status", {
      p_report_id: reportId,
      p_to_status: to,
      p_note: note ?? null,
      p_attachments: encodeAttachments(uploaded),
    });
    if (error) throw new Error(error.message);
    // Email "ada pembaruan" ke pelapor — best-effort dan tidak ditunggu:
    // status sudah tercatat di DB, jadi kegagalan email tidak boleh
    // menggagalkan aksi ini maupun menunda refresh.
    void kirimNotifikasiStatus(reportId);
    await refresh(); // tarik ulang reports + logs
  }

  // ── rateReport (penilaian penanganan) ──
  async function rateReport(reportId: string, stars: number, comment?: string): Promise<void> {
    const bintang = Math.max(1, Math.min(5, Math.round(stars)));
    const catatan = comment?.trim() || undefined;

    if (USE_MOCK) {
      const r = reports.find((x) => x.id === reportId);
      if (!r || !STATUS_FINAL.includes(r.status)) {
        throw new Error("Penilaian hanya bisa diberikan setelah penanganan laporan selesai.");
      }
      if (feedback.some((f) => f.reportId === reportId)) {
        throw new Error("Laporan ini sudah pernah dinilai.");
      }
      setFeedback((prev) => [
        ...prev,
        { reportId, stars: bintang, comment: catatan, createdAt: new Date().toISOString() },
      ]);
      return;
    }

    // Kepemilikan + syarat status final ditegakkan RLS (boleh_nilai_laporan),
    // satu penilaian per laporan ditegakkan primary key. Galat DB diteruskan
    // apa adanya; halaman yang menampilkan kalimat awamnya.
    const { data, error } = await getSupabase()
      .from("report_feedback")
      .insert({ report_id: reportId, stars: bintang, comment: catatan ?? null })
      .select(KOLOM_PENILAIAN)
      .single();
    if (error) throw new Error(error.message);
    setFeedback((prev) => [...prev, feedbackFromRow(data as unknown as FeedbackRow)]);
  }

  // ── revealReporter (eskalasi) ──
  async function revealReporter(
    reportId: string, reason: string,
  ): Promise<{ nama: string; nik: string }> {
    if (!reason.trim()) throw new Error("Alasan eskalasi wajib diisi.");

    if (USE_MOCK) {
      const r = reports.find((x) => x.id === reportId);
      return { nama: r?.reporterName ?? "Budi Santoso", nik: r?.reporterNik ?? "EMP001" };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("reveal_reporter", {
      p_report_id: reportId,
      p_reason: reason.trim(),
    });
    if (error) throw new Error(error.message);
    const row = (data as { nik: string; nama: string }[] | null)?.[0];
    if (!row) throw new Error("Identitas pelapor tidak ditemukan.");
    return { nama: row.nama, nik: row.nik };
  }

  return (
    <StoreContext.Provider
      value={{
        reports, messages, logs, feedback,
        addReport, addMessage, changeStatus, rateReport, revealReporter, refresh,
        loading, error,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam StoreProvider");
  return ctx;
}
