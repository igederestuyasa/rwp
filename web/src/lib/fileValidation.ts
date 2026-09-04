// ============================================================
// Validasi file upload (§9.4) — dipakai di semua titik unggah:
// bukti RWP (/lapor), lampiran chat, lampiran ubah status.
// ------------------------------------------------------------
// Tiga lapis:
//  1. Whitelist EKSTENSI (tolak tipe di luar daftar).
//  2. Batas UKURAN (tolak > 10 MB & file kosong).
//  3. MAGIC BYTE — baca beberapa byte awal & cocokkan dengan
//     tanda tangan asli file. Ini mencegah "rename .exe -> .jpg":
//     ekstensi/nama dari user TIDAK dipercaya, isi diperiksa.
// ============================================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_SIZE_LABEL = "10 MB";

/** Cocokkan urutan byte pada offset tertentu. */
function matchAt(b: Uint8Array, sig: number[], offset = 0): boolean {
  return sig.every((v, i) => b[offset + i] === v);
}

/** Helper: ubah string ASCII jadi array byte. */
function ascii(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0));
}

interface TypeRule {
  ext: string[]; // ekstensi (huruf kecil, tanpa titik)
  /** Periksa tanda tangan dari ~16 byte awal file. true = cocok. */
  sniff: (b: Uint8Array) => boolean;
}

const RULES: TypeRule[] = [
  { ext: ["jpg", "jpeg"], sniff: (b) => matchAt(b, [0xff, 0xd8, 0xff]) },
  { ext: ["png"], sniff: (b) => matchAt(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { ext: ["pdf"], sniff: (b) => matchAt(b, ascii("%PDF")) },
  // docx/xlsx = arsip ZIP (Office Open XML) → tanda tangan "PK"
  {
    ext: ["docx", "xlsx"],
    sniff: (b) =>
      matchAt(b, [0x50, 0x4b, 0x03, 0x04]) ||
      matchAt(b, [0x50, 0x4b, 0x05, 0x06]) ||
      matchAt(b, [0x50, 0x4b, 0x07, 0x08]),
  },
  // doc/xls lama = format OLE2 Compound File
  { ext: ["doc", "xls"], sniff: (b) => matchAt(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) },
  // mp3: tag "ID3" atau frame sync (0xFF Ex/Fx)
  { ext: ["mp3"], sniff: (b) => matchAt(b, ascii("ID3")) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  // wav: "RIFF"....."WAVE"
  { ext: ["wav"], sniff: (b) => matchAt(b, ascii("RIFF")) && matchAt(b, ascii("WAVE"), 8) },
  { ext: ["ogg"], sniff: (b) => matchAt(b, ascii("OggS")) },
  // m4a/aac: kotak "ftyp" (MP4) di offset 4, atau ADTS sync (0xFF Fx)
  { ext: ["m4a", "aac"], sniff: (b) => matchAt(b, ascii("ftyp"), 4) || (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) },
];

/** Semua ekstensi yang diizinkan (untuk atribut accept & pesan). */
const ALLOWED_EXTENSIONS: string[] = RULES.flatMap((r) => r.ext);

/** String untuk atribut <input accept="..."> (mis. ".jpg,.png,..."). */
export const ACCEPT_ATTR: string = ALLOWED_EXTENSIONS.map((e) => "." + e).join(",");

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Validasi satu file. Return null bila valid, atau pesan error (Bahasa Indonesia). */
export async function validateFile(file: File): Promise<string | null> {
  const ext = extensionOf(file.name);
  const rule = RULES.find((r) => r.ext.includes(ext));
  if (!rule) return `tipe tidak didukung (.${ext || "?"})`;
  if (file.size === 0) return "file kosong";
  if (file.size > MAX_FILE_SIZE) return `ukuran melebihi ${MAX_FILE_SIZE_LABEL}`;

  // Baca byte awal untuk verifikasi tanda tangan asli (anti rename ekstensi).
  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return "gagal membaca file";
  }
  if (!rule.sniff(head)) return "isi file tidak cocok dengan ekstensinya";
  return null;
}

export interface FileRejection {
  file: string;
  reason: string;
}

/** Validasi banyak file sekaligus. Pisahkan yang lolos & yang ditolak. */
export async function validateFiles(
  files: File[],
): Promise<{ ok: File[]; rejected: FileRejection[] }> {
  const ok: File[] = [];
  const rejected: FileRejection[] = [];
  for (const f of files) {
    const reason = await validateFile(f);
    if (reason) rejected.push({ file: f.name, reason });
    else ok.push(f);
  }
  return { ok, rejected };
}

/** Format daftar penolakan jadi satu pesan ringkas. */
export function formatRejections(rejected: FileRejection[]): string {
  return rejected.map((r) => `${r.file} (${r.reason})`).join(", ");
}
