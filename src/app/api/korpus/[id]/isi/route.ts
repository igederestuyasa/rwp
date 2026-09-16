// ============================================================
// GET /api/korpus/[id]/isi — isi sebuah dokumen korpus, untuk dibaca admin.
// ------------------------------------------------------------
// Mengembalikan dua tampilan sekaligus supaya klien cukup memanggil sekali:
//   teks      — teks sumber asli (berkas unggahan atau policies.markdown).
//               null bila sumbernya memang tidak tersimpan (warisan skrip lama).
//   potongan  — baris rag_chunks dokumen ini, PERSIS seperti yang dibaca
//               asisten saat menjawab (termasuk prefix "Judul › Bagian"),
//               urut chunk_index. Potongan skrip lama tidak punya indeks.
//
// §9.3: hanya menyentuh corpus_documents, policies, rag_chunks, dan bucket
// korpus — tidak pernah reports, report_messages, atau identitas.
// ============================================================
import {
  SkemaIdDokumen, ambilTeksSumber, jsonError, otorisasiAdmin, pesanGalatAwam, type DokumenKorpus,
} from "@/lib/korpusServer";

export const runtime = "nodejs";

type Baris = Pick<DokumenKorpus, "id" | "jenis" | "source_doc" | "storage_path" | "policy_id">;
type BarisPotongan = { chunk_index: number | null; chunk_text: string };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await otorisasiAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const { id } = await params;
  if (!SkemaIdDokumen.safeParse(id).success) return jsonError("Id dokumen tidak valid.", 400);

  const { data: dok, error: dokErr } = await supabase
    .from("corpus_documents")
    .select("id, jenis, source_doc, storage_path, policy_id")
    .eq("id", id)
    .maybeSingle<Baris>();
  if (dokErr) return jsonError("Gagal membaca dokumen.", 500, dokErr);
  if (!dok) return jsonError("Dokumen tidak ditemukan.", 404);

  // Teks asli. Dokumen warisan tidak punya sumber — itu bukan galat, cukup null.
  // Kalau sumbernya ADA tetapi gagal dibaca, pesan awamnya dikirim agar admin
  // tahu; galat aslinya hanya ke log server.
  let teks: string | null = null;
  let galatTeks: string | null = null;
  if (dok.jenis === "kebijakan" || dok.storage_path) {
    try {
      teks = await ambilTeksSumber(supabase, dok);
    } catch (e) {
      console.error("[korpus] teks sumber gagal dibaca", e);
      galatTeks = pesanGalatAwam(e, "Gagal membaca teks sumber.");
    }
  }

  const { data: baris, error: chunkErr } = await supabase
    .from("rag_chunks")
    .select("chunk_index, chunk_text")
    .eq("source_doc", dok.source_doc)
    .order("chunk_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (chunkErr) return jsonError("Gagal membaca potongan teks.", 500, chunkErr);

  const potongan = ((baris ?? []) as BarisPotongan[]).map((b) => ({
    indeks: b.chunk_index,
    teks: b.chunk_text,
  }));

  return Response.json({ id: dok.id, teks, galatTeks, potongan });
}
