// ============================================================
// Pendukung SISI SERVER untuk route /api/korpus/* (kelola pengetahuan AI).
// ------------------------------------------------------------
// Semua route korpus bertindak sebagai ADMIN YANG SEDANG LOGIN lewat
// supabaseWithToken — bukan service_role. RLS di migrasi korpus_admin
// menolak penulisan oleh non-admin di level database. Pemeriksaan peran di
// sini adalah lapis LOGIKA (§9.2) supaya pemanggil tanpa hak mendapat 403
// yang jelas, bukan galat RLS yang membingungkan.
//
// Galat: pesan ke klien selalu teks tetap berbahasa awam. Pesan mentah
// PostgREST/Storage/OpenAI (nama tabel, constraint, body provider) hanya
// masuk log server lewat `jsonError(..., detail)` — tidak pernah ke browser
// dan tidak pernah tersimpan di corpus_documents.pesan_error.
//
// ⚠️ Server-only. `import "server-only"` membuat build GAGAL bila berkas ini
// tersasar ke komponen client — bukan sekadar peringatan komentar.
// ============================================================
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseWithToken } from "@/lib/supabaseServer";

/** Bucket privat tempat berkas korpus disimpan — sama dengan /api/policy-pdf. */
export const KORPUS_BUCKET = process.env.POLICY_PDF_BUCKET ?? "policy-docs";

/** Awalan path di dalam bucket, memisahkan berkas korpus dari PDF kebijakan. */
export const KORPUS_PREFIX = "korpus";

export type AdminKonteks = { supabase: SupabaseClient; userId: string };

/**
 * Balasan JSON bergaya seragam untuk seluruh route korpus.
 * `pesan` dikirim ke klien apa adanya, jadi WAJIB teks tetap berbahasa awam
 * yang ditulis di kode — bukan turunan `.message` dari provider.
 * `detail` (galat asli PostgREST/Storage/OpenAI) hanya dicatat ke log server
 * supaya tim teknis tetap bisa menelusuri sebabnya.
 */
export function jsonError(pesan: string, status: number, detail?: unknown): Response {
  if (detail !== undefined) console.error("[korpus]", pesan, detail);
  return Response.json({ error: pesan }, { status });
}

/**
 * Galat yang pesannya SENGAJA ditulis untuk dibaca admin di UI /korpus
 * (mis. "dokumen warisan tanpa berkas sumber"). Pemanggil boleh meneruskan
 * `.message`-nya ke klien dan menyimpannya di pesan_error; galat lain harus
 * diganti teks awam lewat `pesanGalatAwam`.
 * `penyebab` menampung galat asli (bila ada) untuk log server saja.
 */
export class GalatAdmin extends Error {
  readonly penyebab?: unknown;
  constructor(pesan: string, penyebab?: unknown) {
    super(pesan);
    this.name = "GalatAdmin";
    this.penyebab = penyebab;
  }
}

/**
 * Pesan yang aman ditampilkan ke admin: GalatAdmin diteruskan apa adanya,
 * galat lain (PostgREST, Storage, OpenAI, bug) diganti `bawaan`.
 */
export function pesanGalatAwam(e: unknown, bawaan: string): string {
  return e instanceof GalatAdmin ? e.message : bawaan;
}

/**
 * Verifikasi token pengguna dan pastikan perannya admin.
 * Mengembalikan konteks bila lolos, atau Response 401/403 bila tidak.
 */
export async function otorisasiAdmin(req: Request): Promise<AdminKonteks | Response> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return jsonError("Tidak terautentikasi.", 401);

  const supabase = supabaseWithToken(token);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  // Peran dibaca dari tabel users lewat RLS (pengguna boleh membaca barisnya
  // sendiri). Ini pelengkap RLS tulis, bukan penggantinya.
  const { data: profil, error: profilErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profilErr || profil?.role !== "admin") {
    return jsonError("Hanya admin yang boleh mengelola korpus.", 403);
  }

  return { supabase, userId: userData.user.id };
}

/** Bentuk baris corpus_documents sebagaimana dikirim ke klien. */
export type DokumenKorpus = {
  id: string;
  nama: string;
  jenis: "md" | "txt" | "pdf" | "kebijakan";
  source_doc: string;
  storage_path: string | null;
  policy_id: string | null;
  status: "menunggu" | "diproses" | "selesai" | "gagal";
  jumlah_chunk: number;
  embed_model: string | null;
  pesan_error: string | null;
  created_at: string;
  updated_at: string;
};

/** Kolom yang diperlukan untuk menemukan teks sumber sebuah dokumen. */
export type SumberDokumen = Pick<DokumenKorpus, "jenis" | "storage_path" | "policy_id">;

/**
 * Ambil teks sumber dokumen sesuai jenisnya. Dipakai dua tempat — ingest
 * (untuk dipecah) dan pembaca isi di /korpus (untuk ditampilkan) — supaya
 * yang dilihat admin persis teks yang dipelajari asisten.
 * Selalu melempar GalatAdmin: pesannya teks tetap yang boleh ditampilkan,
 * galat asli PostgREST/Storage (bila ada) ikut di `penyebab` untuk log.
 */
export async function ambilTeksSumber(supabase: SupabaseClient, dok: SumberDokumen): Promise<string> {
  if (dok.jenis === "kebijakan") {
    if (!dok.policy_id) throw new GalatAdmin("Dokumen kebijakan ini tidak terhubung ke kebijakan mana pun.");
    const { data, error } = await supabase
      .from("policies")
      .select("title, markdown")
      .eq("id", dok.policy_id)
      .maybeSingle<{ title: string; markdown: string | null }>();
    if (error) throw new GalatAdmin("Gagal membaca kebijakan sumber.", error);
    if (!data) throw new GalatAdmin("Kebijakan sumber tidak ditemukan.");
    if (!data.markdown) throw new GalatAdmin("Kebijakan tidak punya isi Markdown.");
    // Judul jadi heading utama — bentuk yang sama dengan jalur skrip lama,
    // supaya chunk handbook yang sudah ada di korpus tetap sebanding.
    return `# ${data.title}\n\n${data.markdown.trim()}\n`;
  }
  if (!dok.storage_path) {
    throw new GalatAdmin("Dokumen ini hasil skrip lama tanpa berkas sumber — tidak bisa diproses ulang, hanya bisa dihapus.");
  }
  const { data, error } = await supabase.storage.from(KORPUS_BUCKET).download(dok.storage_path);
  if (error || !data) {
    throw new GalatAdmin("Gagal membaca berkas sumber dari penyimpanan.", error ?? "unduhan kosong");
  }
  return await data.text();
}


// ============================================================
// Skema input (§9.4) — yang datang dari jaringan adalah `unknown`, tipe
// TypeScript tidak berlaku saat runtime. Semua route korpus memvalidasi
// lewat sini sebelum nilai dipakai.
// ============================================================

/** Id baris corpus_documents (uuid). */
export const SkemaIdDokumen = z.uuid();

export const SkemaIngest = z.object({
  id: z.uuid(),
  mulaiDari: z.number().int().min(0).optional().default(0),
});

/** policies.id bertipe text (mis. "rwp"), bukan uuid. */
export const SkemaDariKebijakan = z.object({
  policyId: z.string().trim().min(1).max(100),
});

/**
 * Baca body JSON dan validasi dengan skema. Mengembalikan data yang sudah
 * bertipe, atau Response 400 yang siap dikembalikan. Detail pelanggaran
 * hanya ke log server, bukan ke klien.
 */
export async function bacaBody<T extends z.ZodType>(
  req: Request,
  skema: T,
): Promise<z.output<T> | Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Body harus JSON.", 400);
  }
  const hasil = skema.safeParse(json);
  if (!hasil.success) return jsonError("Isi permintaan tidak valid.", 400, hasil.error.issues);
  return hasil.data;
}
