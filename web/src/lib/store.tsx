"use client";

// Store — flag-gated.
//  - USE_MOCK=true  → state di memori (seed mock), perilaku lama.
//  - USE_MOCK=false → Supabase. Reports/messages/logs di-fetch saat user siap.
//
// Kontrak dijaga: { reports, messages, logs, addReport, addMessage, changeStatus }.
// Perubahan signature: addReport kini async (Promise<Report>) — call site di-await.
import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from "react";
import { SEED_LOGS, SEED_MESSAGES, SEED_REPORTS } from "./mock";
import { DEMO_REPORTS } from "./demoReports"; // ⚠️ data demo (mode mock)
import { useAuth } from "./auth";
import { getSupabase, USE_MOCK } from "./supabaseClient";
import {
  reportFromRow, reportToInsert, messageFromRow, statusLogFromRow, encodeAttachments,
} from "./mappers";
import { uploadEvidence, uploadAttachments } from "./storage";
import type { ChatMessage, EvidenceFile, Report, Role, Status, StatusLog } from "./types";
import { makeTicketNo, withTimeout } from "./utils";

// Batas waktu fetch Supabase — kalau request menggantung (mis. browser
// blokir supabase.co), refresh() menyerah daripada nunggu selamanya.
const FETCH_TIMEOUT_MS = 12000;

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
  addReport: (input: NewReportInput) => Promise<Report>;
  addMessage: (reportId: string, senderRole: Role, message: string, files?: File[]) => Promise<void>;
  changeStatus: (reportId: string, to: Status, note?: string, files?: File[]) => Promise<void>;
  /** Buka identitas pelapor anonim (eskalasi berotorisasi, dicatat di audit log). */
  revealReporter: (reportId: string, reason: string) => Promise<{ nama: string; nik: string }>;
  refresh: () => Promise<void>;
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
      // Reports
      const repSource = isAdmin ? "v_reports_admin" : "reports";
      const { data: reps, error: repErr } = await withTimeout(
        supabase.from(repSource).select("*").order("created_at", { ascending: false }),
        FETCH_TIMEOUT_MS,
      );
      if (repErr) throw new Error(`reports: ${repErr.message}`);

      // Evidence (jumlah + nama + path untuk signed URL)
      const { data: evs, error: evErr } = await withTimeout(
        supabase.from("report_evidence").select("report_id, file_name, file_path"),
        FETCH_TIMEOUT_MS,
      );
      if (evErr) throw new Error(`evidence: ${evErr.message}`);
      const evByReport = new Map<string, EvidenceFile[]>();
      (evs ?? []).forEach((e: { report_id: string; file_name: string | null; file_path: string }) => {
        const arr = evByReport.get(e.report_id) ?? [];
        arr.push({ name: e.file_name ?? "berkas", path: e.file_path });
        evByReport.set(e.report_id, arr);
      });

      setReports(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (reps ?? []).map((row: any) =>
          reportFromRow(row, {
            evidence: evByReport.get(row.id),
            evidenceCount: (evByReport.get(row.id) ?? []).length,
            reporterName: row.reporter_name ?? undefined,
            reporterNik: row.reporter_nik ?? undefined,
          }),
        ),
      );

      // Messages
      const { data: msgs, error: msgErr } = await withTimeout(
        supabase.from("report_messages").select("*").order("created_at", { ascending: true }),
        FETCH_TIMEOUT_MS,
      );
      if (msgErr) throw new Error(`messages: ${msgErr.message}`);
      setMessages((msgs ?? []).map(messageFromRow));

      // Status log
      const { data: lgs, error: logErr } = await withTimeout(
        supabase.from("report_status_log").select("*").order("created_at", { ascending: true }),
        FETCH_TIMEOUT_MS,
      );
      if (logErr) throw new Error(`status_log: ${logErr.message}`);
      setLogs((lgs ?? []).map(statusLogFromRow));
    } catch (e) {
      // Jangan biarkan error/timeout menggantungkan UI; cukup catat.
      console.error("Gagal memuat data dari Supabase:", e);
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
    await refresh(); // tarik ulang reports + logs
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
      value={{ reports, messages, logs, addReport, addMessage, changeStatus, revealReporter, refresh }}
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
