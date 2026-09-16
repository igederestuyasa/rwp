// ============================================================
// DELETE /api/korpus/[id] — hapus dokumen korpus beserta seluruh chunk-nya
// dan berkas sumbernya di bucket.
// ------------------------------------------------------------
// Urutan: chunk → berkas → baris. Kalau penghapusan berkas gagal (mis.
// dokumen warisan skrip lama yang tidak punya storage_path), baris tetap
// dihapus supaya AI berhenti memakainya; galat berkas dilaporkan.
// ============================================================
import { KORPUS_BUCKET, jsonError, otorisasiAdmin, type DokumenKorpus } from "@/lib/korpusServer";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await otorisasiAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;
  const { id } = await params;

  const { data: dok, error: cariErr } = await supabase
    .from("corpus_documents")
    .select("id, source_doc, storage_path")
    .eq("id", id)
    .maybeSingle<Pick<DokumenKorpus, "id" | "source_doc" | "storage_path">>();
  if (cariErr) return jsonError(`Gagal membaca dokumen: ${cariErr.message}`, 500);
  if (!dok) return jsonError("Dokumen tidak ditemukan.", 404);

  const { error: chunkErr } = await supabase.from("rag_chunks").delete().eq("source_doc", dok.source_doc);
  if (chunkErr) return jsonError(`Gagal menghapus chunk: ${chunkErr.message}`, 500);

  let peringatan: string | null = null;
  if (dok.storage_path) {
    const { error: fileErr } = await supabase.storage.from(KORPUS_BUCKET).remove([dok.storage_path]);
    if (fileErr) peringatan = `Chunk terhapus, tetapi berkas sumber gagal dihapus: ${fileErr.message}`;
  }

  const { error: barisErr } = await supabase.from("corpus_documents").delete().eq("id", id);
  if (barisErr) return jsonError(`Gagal menghapus catatan dokumen: ${barisErr.message}`, 500);

  return Response.json({ ok: true, peringatan });
}
