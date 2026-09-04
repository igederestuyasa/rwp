// ============================================================
// Helper Supabase Storage untuk bukti laporan.
// ------------------------------------------------------------
// - Nama file di-generate ulang (UUID), nama asli disimpan terpisah
//   di kolom file_name (§9.4: jangan pakai nama asli user di path).
// - Bucket private → akses via signed URL berdurasi pendek.
// ============================================================
import { getSupabase } from "./supabaseClient";
import type { EvidenceFile } from "./types";

const BUCKET = "rwp-evidence";

/** Path penyimpanan: <reportId>/<uuid>.<ext> — nama asli user tidak dipakai (§9.4). */
function storagePath(reportId: string, fileName: string): string {
  const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
  return `${reportId}/${crypto.randomUUID()}${ext}`;
}

/** Upload daftar file untuk sebuah laporan + catat metadata di report_evidence. */
export async function uploadEvidence(reportId: string, files: File[]): Promise<void> {
  if (!files.length) return;
  const supabase = getSupabase();

  for (const file of files) {
    const path = storagePath(reportId, file.name);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) throw new Error(`Gagal mengunggah ${file.name}: ${upErr.message}`);

    const { error: insErr } = await supabase.from("report_evidence").insert({
      report_id: reportId,
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size,
    });
    if (insErr) throw new Error(`Gagal menyimpan metadata ${file.name}: ${insErr.message}`);
  }
}

/** Upload lampiran (chat / ubah status) ke bucket yang sama.
 *  Mengembalikan daftar {name, path} untuk disimpan di kolom attachments. */
export async function uploadAttachments(reportId: string, files: File[]): Promise<EvidenceFile[]> {
  if (!files.length) return [];
  const supabase = getSupabase();
  const result: EvidenceFile[] = [];

  for (const file of files) {
    const path = storagePath(reportId, file.name);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw new Error(`Gagal mengunggah ${file.name}: ${error.message}`);
    result.push({ name: file.name, path });
  }
  return result;
}

/** Signed URL berdurasi 10 menit untuk membuka/unduh bukti. */
export async function getEvidenceUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error || !data) {
    // Bantu diagnosa kenapa file tak bisa dibuka (file hilang dari Storage,
    // policy read kebuka, dll) — sebelumnya error ditelan diam-diam.
    console.error(`Gagal membuat signed URL untuk "${path}":`, error?.message ?? "tidak ada data");
    return null;
  }
  return data.signedUrl;
}
