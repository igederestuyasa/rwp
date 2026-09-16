// ============================================================
// POST /api/asisten — endpoint asisten RWP (RAG).
// ------------------------------------------------------------
// Alur: verifikasi user → embed pertanyaan → retrieve chunk relevan
// dari rag_chunks → susun prompt + konteks → panggil LLM → balikin
// jawaban + sumber.
//
// KEAMANAN (§9.3): HANYA query rag_chunks (dokumen kebijakan).
// TIDAK PERNAH menyentuh reports/report_messages/identitas. OPENAI_API_KEY
// hanya ada di server (file ini & llmClient), tak pernah ke client.
// ============================================================
import type { NextRequest } from "next/server";
import { z } from "zod";
import { embed, chat, type ChatMessage } from "@/lib/llmClient";
import { supabaseWithToken } from "@/lib/supabaseServer";

const MATCH_COUNT = 6;    // jumlah chunk konteks — naik dari 5 karena chunker
// heading-aware menghasilkan chunk lebih kecil/fokus (1 topik), jadi butuh sedikit
// lebih banyak agar volume konteks tetap memadai (quality-first, lihat CLAUDE.md).
const MAX_HISTORY = 6;    // pesan percakapan terakhir yang dibawa (biar bisa convo)
const MIN_SIMILARITY = 0.41; // ⚠️ WAJIB DIKALIBRASI ULANG untuk korpus RWP.
// Angka ini berasal dari korpus LAMA (187 chunk, campuran kebijakan HC + dokumen
// aplikasi). Korpus sekarang jauh lebih kecil dan seragam (handbook RWP + 4 dokumen
// cara pakai), sehingga distribusinya bergeser: distraktor hilang, tapi query di
// luar topik pun tetap menarik chunk RWP teratas — jadi jarak relevan↔noise
// MENYEMPIT dan ambangnya kemungkinan perlu NAIK, bukan turun.
// Cara menyetel: node scripts/build-corpus.mjs → node scripts/ingest.mjs --clear
// → node scripts/diagnose-retrieval.mjs, lalu pakai angka rekomendasinya.
// Angka tabel umum (0.70-0.80) TIDAK berlaku untuk query pendek vs chunk prosa di
// pgvector + text-embedding-3-small — itu sudah terbukti salah di setup ini.

const SYSTEM_PROMPT = `Kamu adalah Sahabat RWP — asisten Respectful Workplace Policy PT Hutama Karya. Hangat, tidak menghakimi, dan sabar. Banyak yang bertanya ke kamu sedang dalam posisi tidak nyaman, jadi jawablah seperti teman kerja yang bisa dipercaya: jelas, menenangkan, tanpa nada birokratis.

BATAS TOPIK (WAJIB DIPATUHI):
- Kamu HANYA menjawab soal Respectful Workplace Policy (RWP) — definisi, kategori pelanggaran, contoh kasus, pencegahan, sanksi — serta cara memakai aplikasi ini (melapor, melacak laporan, anonimitas, eskalasi identitas) dan Layanan Psikologi perusahaan.
- Pertanyaan HC di luar RWP (cuti, gaji, tunjangan, pelatihan, rekrutmen) BUKAN wilayahmu. Tolak dengan sopan dan arahkan ke tim Human Capital.
- Pertanyaan di luar topik kerja sama sekali — resep, coding umum, berita, hiburan — tolak dengan sopan tapi tegas.
- Sapaan singkat ("halo", "selamat pagi") boleh dibalas ramah, lalu tawarkan bantuan seputar RWP.

Cara kamu menjawab:
- Gunakan bahasa yang natural dan hangat. Hindari terasa seperti membaca SOP.
- Jelaskan dengan sederhana. Kalau ada istilah teknis, jelaskan maksudnya. Beri contoh konkret kalau itu membantu.
- Format jawaban rapi dengan Markdown: paragraf pendek, dan kalau ada daftar atau langkah, gunakan bullet (-) atau nomor — masing-masing di baris baru.
- Jawab berdasarkan "Konteks dokumen" yang diberikan. Kalau informasinya memang tidak ada di sana, jujur bilang kamu belum punya infonya, lalu sarankan menghubungi tim HC.
- Kalau ada yang cerita soal pengalaman tidak menyenangkan di tempat kerja — pelecehan, diskriminasi, perundungan, kekerasan — tanggapi dengan empati LEBIH DULU, jangan langsung menghakimi apakah itu masuk kategori atau tidak. Setelah itu baru jelaskan pelan-pelan, dan sebutkan bahwa ia bisa melapor lewat menu Lapor Insiden (bisa anonim) atau lebih dulu mencari dukungan di menu Layanan Psikologi.
- JANGAN pernah menilai atau memutuskan apakah sebuah laporan terbukti. Itu wewenang tim HC. Kamu hanya menjelaskan kebijakan.
- Jangan tebak-tebak dan jangan minta data pribadi. Kamu tidak punya akses ke isi laporan siapa pun, dan tidak boleh berpura-pura punya.`;

/** Body POST /api/asisten. userRole selain "admin" diperlakukan sebagai karyawan. */
const SkemaTanya = z.object({
  question: z.string().trim().min(1).max(2000),
  userName: z.string().max(200).optional().nullable(),
  userRole: z
    .string()
    .optional()
    .transform((r): "admin" | "karyawan" => (r === "admin" ? "admin" : "karyawan")),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10_000),
      }),
    )
    .max(50)
    .optional()
    .default([]),
});

interface MatchedChunk {
  source_doc: string;
  chunk_text: string;
  similarity: number;
}

interface ActionItem {
  type: "policy" | "tiket";
  label: string;
  url: string;
  description?: string;
}

// Peta nama file dokumen → ID kebijakan di halaman /kebijakan
const SOURCE_TO_POLICY_ID: Record<string, string> = {
  "handbook-rwp.md": "rwp",
  "contoh-pelanggaran-rwp.md": "rwp",
};

export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi user (token dari header Authorization)
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return Response.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }
    const supabase = supabaseWithToken(token);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return Response.json({ error: "Sesi tidak valid. Silakan login ulang." }, { status: 401 });
    }

    // 2. Validasi input (§9.4) — bentuk dicek skema, bukan diasumsikan.
    const json: unknown = await req.json().catch(() => null);
    const hasil = SkemaTanya.safeParse(json);
    if (!hasil.success) {
      const soalPertanyaan = hasil.error.issues.find((i) => i.path[0] === "question");
      if (soalPertanyaan?.code === "too_big") {
        return Response.json(
          { error: "Pertanyaan terlalu panjang (maks. 2000 karakter)." },
          { status: 400 },
        );
      }
      if (soalPertanyaan) {
        return Response.json({ error: "Pertanyaan kosong." }, { status: 400 });
      }
      console.error("/api/asisten input tidak valid:", hasil.error.issues);
      return Response.json({ error: "Isi permintaan tidak valid." }, { status: 400 });
    }
    const { question, userName, userRole } = hasil.data;
    const firstName = userName ? userName.slice(0, 50).split(" ")[0] : null;
    const history: ChatMessage[] = hasil.data.history.slice(-MAX_HISTORY);

    // 3. Embed pertanyaan
    const queryEmbedding = await embed(question);

    // 4. Retrieve chunk relevan (HANYA rag_chunks)
    const { data: chunks, error: matchErr } = await supabase.rpc("match_rag_chunks", {
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
    });
    if (matchErr) throw new Error(`Retrieval gagal: ${matchErr.message}`);

    // Filter chunk yang similarity-nya di bawah threshold — buang yang tidak relevan
    const matched = ((chunks ?? []) as MatchedChunk[]).filter(
      (c) => c.similarity >= MIN_SIMILARITY,
    );
    const hasContext = matched.length > 0;
    const context = matched
      .map((c, i) => `[${i + 1}] (${c.source_doc})\n${c.chunk_text}`)
      .join("\n\n");
    const sources = [...new Set(matched.map((c) => c.source_doc))];

    // 5. Susun prompt (system → history → pertanyaan + konteks)
    const roleContext =
      userRole === "admin"
        ? `\n\nPengguna ini adalah ADMIN RWP. Fokuskan jawaban pada fitur admin: Dashboard, Daftar Laporan, mengubah status laporan, dan eskalasi identitas (khusus admin superior). Admin TIDAK bisa membuat laporan RWP.`
        : `\n\nPengguna ini adalah KARYAWAN biasa (bukan admin). Saat menjelaskan fitur aplikasi, sebut HANYA yang relevan untuk karyawan: bertanya ke asisten, membaca Kebijakan RWP, melaporkan insiden lewat menu Lapor Insiden, melacak laporan & chat dengan admin, menghubungi Layanan Psikologi, dan mengatur akun (tema, notifikasi, ganti sandi). JANGAN menyebut fitur khusus admin (Dashboard, Daftar Laporan, ubah status, eskalasi identitas) seolah karyawan bisa memakainya.`;

    const accuracyRule = `\n\nPENTING: jangan mengklaim fitur yang tidak ada. Aplikasi ini HANYA menangani RWP — tidak ada katalog layanan HC, tidak ada pengajuan cuti/klaim/pelatihan di sini. Data profil (nama, NIK, email) TIDAK bisa diedit sendiri; itu lewat sistem HR. Yang bisa diatur sendiri hanya tema, notifikasi, dan kata sandi. Kalau ragu suatu fitur ada atau tidak, jangan dikarang.`;

    const nameContext = firstName
      ? `\n\nNama pengguna yang kamu ajak ngobrol sekarang: ${firstName}. Panggil namanya sesekali supaya terasa personal — tapi jangan berlebihan di setiap kalimat.`
      : "";

    const systemWithName = SYSTEM_PROMPT + roleContext + accuracyRule + nameContext;

    const userContent = hasContext
      ? `Konteks dokumen:\n${context}\n\nPertanyaan: ${question}`
      : `(Tidak ada dokumen relevan untuk pertanyaan ini. Kalau ini sapaan/obrolan ringan, balas ramah lalu tawarkan bantuan seputar RWP. Kalau ini curhat soal pengalaman tidak menyenangkan di tempat kerja, tanggapi dengan empati dan arahkan ke menu Lapor Insiden atau Layanan Psikologi. Kalau ini pertanyaan di luar topik RWP, tolak dengan sopan sesuai batas topik di system prompt — JANGAN menjawabnya meski tidak ada konteks dokumen.)\n\nPesan: ${question}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemWithName },
      ...history,
      { role: "user", content: userContent },
    ];

    // 6. Panggil LLM
    const answer = await chat(messages, { maxTokens: 800, temperature: 0.4 });

    // 7. Susun action chips untuk frontend
    const actions: ActionItem[] = [];
    // Policy link: ambil satu policy pertama yang cocok dari source docs
    for (const src of sources) {
      const policyId = SOURCE_TO_POLICY_ID[src];
      if (policyId) {
        actions.push({ type: "policy", label: "Lihat kebijakan terkait", url: `/kebijakan?id=${policyId}` });
        break;
      }
    }
    // Jalur pelaporan: selalu tampilkan untuk karyawan
    if (userRole === "karyawan") {
      actions.push({
        type: "tiket",
        label: "Lapor insiden RWP",
        url: "/lapor",
        description: "Kalau yang kamu alami perlu ditindaklanjuti resmi, laporkan lewat jalur rahasia ini:",
      });
    }

    return Response.json({ answer, sources, actions });
  } catch (e) {
    console.error("/api/asisten error:", e);
    return Response.json(
      { error: "Maaf, terjadi gangguan pada asisten. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
