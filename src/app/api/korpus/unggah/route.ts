// ============================================================
// POST /api/korpus/unggah — terima berkas .md/.txt dari admin, simpan ke
// bucket privat, catat sebagai dokumen korpus berstatus "menunggu".
// ------------------------------------------------------------
// Ingest (chunk + embed) TIDAK dilakukan di sini — itu tugas
// /api/korpus/ingest yang dipanggil bertahap supaya tidak menabrak batas
// waktu fungsi serverless. Route ini hanya menerima dan mencatat.
//
// §9.3: hanya dokumen kebijakan yang boleh masuk korpus. §9.4: whitelist
// tipe, batas ukuran, cek isi (bukan sekadar ekstensi), dan berkas disimpan
// dengan nama acak — nama asli hanya untuk tampilan.
// ============================================================
import { validateKorpusFile } from "@/lib/fileValidation";
import { KORPUS_BUCKET, KORPUS_PREFIX, jsonError, otorisasiAdmin } from "@/lib/korpusServer";

export const runtime = "nodejs";

const CONTENT_TYPE = { md: "text/markdown", txt: "text/plain" } as const;

export async function POST(req: Request) {
  const ctx = await otorisasiAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { supabase, userId } = ctx;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Permintaan harus berupa multipart/form-data.", 400);
  }
  const berkas = form.get("berkas");
  if (!(berkas instanceof File)) return jsonError("Sertakan berkas pada field 'berkas'.", 400);

  const hasil = await validateKorpusFile(berkas);
  if (!hasil.ok) return jsonError(`Berkas ditolak: ${hasil.alasan}.`, 422);

  // Satu UUID untuk id baris, kunci source_doc, dan nama berkas di bucket.
  const id = crypto.randomUUID();
  const storagePath = `${KORPUS_PREFIX}/${id}.${hasil.jenis}`;

  const { error: upErr } = await supabase.storage
    .from(KORPUS_BUCKET)
    .upload(storagePath, new TextEncoder().encode(hasil.teks), {
      contentType: CONTENT_TYPE[hasil.jenis],
      upsert: false,
    });
  if (upErr) return jsonError("Gagal menyimpan berkas.", 500, upErr);

  const { data, error: insErr } = await supabase
    .from("corpus_documents")
    .insert({
      id,
      nama: berkas.name,
      jenis: hasil.jenis,
      source_doc: id,
      storage_path: storagePath,
      status: "menunggu",
      dibuat_oleh: userId,
    })
    .select()
    .single();

  if (insErr) {
    // Jangan tinggalkan berkas tanpa catatan — bersihkan lagi.
    await supabase.storage.from(KORPUS_BUCKET).remove([storagePath]);
    return jsonError("Gagal mencatat dokumen.", 500, insErr);
  }

  return Response.json({ dokumen: data }, { status: 201 });
}
