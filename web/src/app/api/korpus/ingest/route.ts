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
import {
  SkemaIngest, ambilTeksSumber, bacaBody, jsonError, otorisasiAdmin, pesanGalatAwam, type DokumenKorpus,
} from "@/lib/korpusServer";

export const runtime = "nodejs";
// Beri ruang di paket yang mengizinkan; di Hobby tetap dibatasi platform.
export const maxDuration = 60;

/** Chunk per panggilan. 40 chunk ≈ 2 panggilan embedding, aman di bawah 10 detik. */
const BATCH = 40;
/** Teks per panggilan OpenAI. */
const EMBED_SUB = 20;

type Baris = Pick<DokumenKorpus, "id" | "nama" | "jenis" | "source_doc" | "storage_path" | "policy_id">;

export async function POST(req: Request) {
  const ctx = await otorisasiAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const body = await bacaBody(req, SkemaIngest);
  if (body instanceof Response) return body;
  const { id, mulaiDari } = body;

  const { data: dok, error: dokErr } = await supabase
    .from("corpus_documents")
    .select("id, nama, jenis, source_doc, storage_path, policy_id")
    .eq("id", id)
    .maybeSingle<Baris>();
  if (dokErr) return jsonError("Gagal membaca dokumen.", 500, dokErr);
  if (!dok) return jsonError("Dokumen tidak ditemukan.", 404);

  // Catat kegagalan ke baris dokumen supaya admin melihat sebabnya di UI,
  // lalu kembalikan 500 dengan pesan yang sama. `pesan` tersimpan di DB dan
  // tampil di browser, jadi WAJIB teks awam; galat aslinya hanya ke log.
  const gagal = async (pesan: string, detail?: unknown) => {
    await supabase.from("corpus_documents").update({ status: "gagal", pesan_error: pesan }).eq("id", id);
    return jsonError(pesan, 500, detail);
  };

  try {
    const teks = await ambilTeksSumber(supabase, dok);
    const semua = chunkToTexts(teks);
    const total = semua.length;
    if (total === 0) return await gagal("Dokumen tidak menghasilkan potongan teks apa pun.");

    if (mulaiDari === 0) {
      const { error: delErr } = await supabase.from("rag_chunks").delete().eq("source_doc", dok.source_doc);
      if (delErr) return await gagal("Gagal membersihkan potongan teks lama.", delErr);
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
        // Posisi di dokumen — dipakai pembaca isi untuk menampilkan urutan asli.
        chunk_index: mulaiDari + i + j,
        chunk_text,
        // JSON string, sama dengan ingest.mjs, agar bentuk kolom konsisten.
        embedding: JSON.stringify(vektor[j]),
        embed_model: embedModelName(),
      }));
      const { error: insErr } = await supabase.from("rag_chunks").insert(rows);
      if (insErr) return await gagal("Gagal menyimpan potongan teks.", insErr);
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
    // Pesan GalatAdmin (mis. dokumen warisan tanpa berkas sumber) memang
    // ditulis untuk admin; galat lain (OpenAI, PostgREST, bug) diganti teks
    // awam supaya tidak ada body provider yang bocor ke UI maupun DB.
    return await gagal(
      pesanGalatAwam(e, "Pemrosesan gagal. Coba lagi beberapa saat, atau hubungi tim teknis bila terus terjadi."),
      e,
    );
  }
}
