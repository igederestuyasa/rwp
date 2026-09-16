// ============================================================
// POST /api/korpus/dari-kebijakan — daftarkan isi satu kebijakan (tabel
// policies) sebagai dokumen korpus, supaya jawaban asisten bersumber dari
// baris DB yang SAMA dengan yang dibaca karyawan di /kebijakan.
// ------------------------------------------------------------
// Ini pengganti skrip terminal lama (build-corpus.mjs, sudah dihapus) yang
// mengambil handbook dari lib/policies.ts (kode) — akar drift antara
// halaman kebijakan dan AI.
// Route ini hanya MENDAFTARKAN; pemrosesannya lewat /api/korpus/ingest
// seperti dokumen lain. source_doc memakai awalan "kebijakan:" agar satu
// kebijakan selalu memetakan ke satu dokumen korpus (upsert).
// ============================================================
import {
  SkemaDariKebijakan, bacaBody, jsonError, otorisasiAdmin,
} from "@/lib/korpusServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await otorisasiAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  const body = await bacaBody(req, SkemaDariKebijakan);
  if (body instanceof Response) return body;
  const { policyId } = body;

  const { data: pol, error: polErr } = await supabase
    .from("policies")
    .select("id, title, markdown")
    .eq("id", policyId)
    .maybeSingle<{ id: string; title: string; markdown: string | null }>();
  if (polErr) return jsonError("Gagal membaca kebijakan.", 500, polErr);
  if (!pol) return jsonError("Kebijakan tidak ditemukan.", 404);
  if (!pol.markdown || pol.markdown.trim().length === 0) {
    return jsonError("Kebijakan ini belum punya isi Markdown untuk dipelajari asisten.", 422);
  }

  const { data, error } = await supabase
    .from("corpus_documents")
    .upsert(
      {
        nama: pol.title,
        jenis: "kebijakan",
        source_doc: `kebijakan:${pol.id}`,
        storage_path: null,
        policy_id: pol.id,
        status: "menunggu",
        pesan_error: null,
        dibuat_oleh: userId,
      },
      { onConflict: "source_doc" },
    )
    .select()
    .single();
  if (error) return jsonError("Gagal mendaftarkan dokumen.", 500, error);

  return Response.json({ dokumen: data });
}
