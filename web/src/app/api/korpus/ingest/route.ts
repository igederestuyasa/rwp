// ============================================================
// POST /api/korpus/ingest — pecah dokumen jadi chunk, sematkan (embed),
// simpan ke rag_chunks. Menggantikan scripts/ingest.mjs.
// ------------------------------------------------------------
// BERTAHAP & TANPA STATE DI SERVER. Fungsi serverless punya batas waktu
// (Vercel Hobby ~10 detik), sementara embedding ratusan chunk bisa lebih
// lama. Karena itu tiap panggilan hanya memproses BATCH chunk, lalu
// mengembalikan `berikutnya` — klien memanggil lagi sampai `selesai`.
// Dokumen di-chunk ulang tiap panggilan (deterministik dan murah) supaya
// server tidak perlu menyimpan apa pun di antara panggilan.
//
// Panggilan pertama (mulaiDari = 0) membersihkan chunk lama dokumen itu,
// jadi ingest ulang tidak menggandakan pengetahuan AI.
//
// §9.3: sumbernya HANYA berkas korpus di bucket atau policies.markdown —
// tidak pernah reports atau report_messages.
// ============================================================
import { chunkToTexts } from "@/lib/chunker";
import { embedBatch, embedModelName } from "@/lib/llmClient";
import { KORPUS_BUCKET, jsonError, otorisasiAdmin, type DokumenKorpus } from "@/lib/korpusServer";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
// Beri ruang di paket yang mengizinkan; di Hobby tetap dibatasi platform.
export const maxDuration = 60;

/** Chunk per panggilan. 40 chunk ≈ 2 panggilan embedding, aman di bawah 10 detik. */
const BATCH = 40;
/** Teks per panggilan OpenAI. */
const EMBED_SUB = 20;

type Baris = Pick<DokumenKorpus, "id" | "nama" | "jenis" | "source_doc" | "storage_path" | "policy_id">;

/** Ambil teks sumber dokumen sesuai jenisnya. */
async function ambilTeks(supabase: SupabaseClient, dok: Baris): Promise<string> {
  if (dok.jenis === "kebijakan") {
    if (!dok.policy_id) throw new Error("Dokumen kebijakan tidak menunjuk ke policy_id.");
    const { data, error } = await supabase
      .from("policies")
      .select("title, markdown")
      .eq("id", dok.policy_id)
      .maybeSingle<{ title: string; markdown: string | null }>();
    if (error) throw new Error(`Gagal membaca kebijakan: ${error.message}`);
    if (!data?.markdown) throw new Error("Kebijakan tidak punya isi Markdown.");
    // Sama seperti build-corpus.mjs dulu: judul jadi heading utama, supaya
    // hasil chunk handbook tidak berubah dibanding jalur skrip lama.
    return `# ${data.title}\n\n${data.markdown.trim()}\n`;
  }
  if (!dok.storage_path) {
    throw new Error("Dokumen ini hasil skrip lama tanpa berkas sumber — tidak bisa diproses ulang, hanya bisa dihapus.");
  }
  const { data, error } = await supabase.storage.from(KORPUS_BUCKET).download(dok.storage_path);
  if (error || !data) throw new Error(`Gagal membaca berkas sumber: ${error?.message ?? "kosong"}`);
  return await data.text();
}

export async function POST(req: Request) {
  const ctx = await otorisasiAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  let body: { id?: unknown; mulaiDari?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Body harus JSON.", 400);
  }
  const id = typeof body.id === "string" ? body.id : "";
  const mulaiDari = Number.isInteger(body.mulaiDari) && (body.mulaiDari as number) >= 0 ? (body.mulaiDari as number) : 0;
  if (!id) return jsonError("Sertakan id dokumen.", 400);

  const { data: dok, error: dokErr } = await supabase
    .from("corpus_documents")
    .select("id, nama, jenis, source_doc, storage_path, policy_id")
    .eq("id", id)
    .maybeSingle<Baris>();
  if (dokErr) return jsonError(`Gagal membaca dokumen: ${dokErr.message}`, 500);
  if (!dok) return jsonError("Dokumen tidak ditemukan.", 404);

  // Catat kegagalan ke baris dokumen supaya admin melihat sebabnya di UI,
  // lalu kembalikan 500 dengan pesan yang sama.
  const gagal = async (pesan: string) => {
    await supabase.from("corpus_documents").update({ status: "gagal", pesan_error: pesan }).eq("id", id);
    return jsonError(pesan, 500);
  };

  try {
    const teks = await ambilTeks(supabase, dok);
    const semua = chunkToTexts(teks);
    const total = semua.length;
    if (total === 0) return await gagal("Dokumen tidak menghasilkan potongan teks apa pun.");

    if (mulaiDari === 0) {
      const { error: delErr } = await supabase.from("rag_chunks").delete().eq("source_doc", dok.source_doc);
      if (delErr) return await gagal(`Gagal membersihkan chunk lama: ${delErr.message}`);
      await supabase
        .from("corpus_documents")
        .update({ status: "diproses", pesan_error: null, embed_model: embedModelName(), jumlah_chunk: 0 })
        .eq("id", id);
    }
    if (mulaiDari >= total) {
      // Klien meminta melewati akhir — anggap selesai, jangan proses apa pun.
      await supabase.from("corpus_documents").update({ status: "selesai", jumlah_chunk: total }).eq("id", id);
      return Response.json({ id, total, diproses: total, berikutnya: null, selesai: true, status: "selesai" });
    }

    const slice = semua.slice(mulaiDari, mulaiDari + BATCH);
    for (let i = 0; i < slice.length; i += EMBED_SUB) {
      const sub = slice.slice(i, i + EMBED_SUB);
      const vektor = await embedBatch(sub);
      const rows = sub.map((chunk_text, j) => ({
        source_doc: dok.source_doc,
        chunk_text,
        // JSON string, sama dengan ingest.mjs, agar bentuk kolom konsisten.
        embedding: JSON.stringify(vektor[j]),
        embed_model: embedModelName(),
      }));
      const { error: insErr } = await supabase.from("rag_chunks").insert(rows);
      if (insErr) return await gagal(`Gagal menyimpan chunk: ${insErr.message}`);
    }

    const diproses = mulaiDari + slice.length;
    const selesai = diproses >= total;
    await supabase
      .from("corpus_documents")
      .update(selesai ? { status: "selesai", jumlah_chunk: total } : { status: "diproses", jumlah_chunk: diproses })
      .eq("id", id);

    return Response.json({
      id, total, diproses,
      berikutnya: selesai ? null : diproses,
      selesai,
      status: selesai ? "selesai" : "diproses",
    });
  } catch (e) {
    return await gagal(e instanceof Error ? e.message : "Kesalahan tak dikenal saat memproses dokumen.");
  }
}
