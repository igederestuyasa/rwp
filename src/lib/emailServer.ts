// ============================================================
// Pengirim email SISI SERVER lewat Brevo (API email transaksional).
// ------------------------------------------------------------
// Dipakai /api/notifikasi/status untuk memberi tahu pelapor bahwa status
// laporannya berubah. Isi email SENGAJA generik (§9.1): tanpa nomor tiket,
// status baru, judul, kategori, kronologi, maupun catatan admin. Email ini
// melewati Brevo dan server mail perusahaan — dua pihak di luar aplikasi
// yang menyimpan log dan isinya — jadi yang boleh keluar hanya "ada
// pembaruan" plus tautan ke halaman laporan di aplikasi.
//
// Alamat penerima tidak pernah dicatat ke log (§9.7); saat gagal, yang
// dicatat hanya kode status HTTP dari Brevo.
//
// Tanpa BREVO_API_KEY fitur ini mati dengan tenang: pemanggil mendapat
// `terkonfigurasi() === false` dan melewatinya — perubahan status tidak
// boleh bergantung pada email.
//
// ⚠️ Server-only. `import "server-only"` membuat build GAGAL bila berkas ini
// tersasar ke komponen client. BREVO_API_KEY hanya dibaca di sini.
// ============================================================
import "server-only";
import { APP_NAME } from "@/lib/constants";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const BATAS_WAKTU_MS = 10_000;

function bacaEnv(nama: string): string {
  return (process.env[nama] ?? "").trim();
}

/** Benar bila kunci API dan alamat pengirim sudah diisi. */
export function emailTerkonfigurasi(): boolean {
  return bacaEnv("BREVO_API_KEY") !== "" && bacaEnv("BREVO_SENDER_EMAIL") !== "";
}

/**
 * URL publik aplikasi untuk tautan di email, tanpa garis miring di akhir.
 * APP_URL diisi eksplisit; di Vercel boleh kosong karena
 * VERCEL_PROJECT_PRODUCTION_URL (tanpa skema) disediakan otomatis.
 * Null bila keduanya kosong — email tetap dikirim tanpa tautan.
 */
export function urlAplikasi(): string | null {
  const eksplisit = bacaEnv("APP_URL");
  if (eksplisit) return eksplisit.replace(/\/+$/, "");
  const vercel = bacaEnv("VERCEL_PROJECT_PRODUCTION_URL");
  return vercel ? `https://${vercel}` : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Galat pengiriman: hanya membawa kode status HTTP, bukan body Brevo. */
export class GalatBrevo extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Brevo menolak permintaan (HTTP ${status}).`);
    this.name = "GalatBrevo";
    this.status = status;
  }
}

/**
 * Kirim email "ada pembaruan pada laporan Anda" ke satu alamat.
 * `tautan` adalah URL halaman laporan di aplikasi (null = tanpa tautan).
 * Melempar GalatBrevo bila Brevo menolak, atau galat fetch bila jaringan
 * gagal / melewati batas waktu. Pemanggil yang memutuskan cara melaporkannya.
 */
export async function kirimEmailPembaruanStatus(ke: string, tautan: string | null): Promise<void> {
  const apiKey = bacaEnv("BREVO_API_KEY");
  const pengirimEmail = bacaEnv("BREVO_SENDER_EMAIL");
  const pengirimNama = bacaEnv("BREVO_SENDER_NAME") || APP_NAME;
  if (!apiKey || !pengirimEmail) {
    throw new Error("Brevo belum dikonfigurasi (BREVO_API_KEY / BREVO_SENDER_EMAIL).");
  }

  const ajakan = tautan
    ? `Masuk ke aplikasi untuk melihat detailnya:\n${tautan}`
    : `Masuk ke aplikasi ${APP_NAME} untuk melihat detailnya.`;
  const teks =
    `Halo,\n\n` +
    `Ada pembaruan pada status salah satu laporan yang Anda buat di ${APP_NAME}.\n` +
    `${ajakan}\n\n` +
    `Email ini dikirim otomatis. Mohon tidak membalas email ini.\n`;

  const ajakanHtml = tautan
    ? `Masuk ke aplikasi untuk melihat detailnya: <a href="${escapeHtml(tautan)}">${escapeHtml(tautan)}</a>`
    : `Masuk ke aplikasi ${escapeHtml(APP_NAME)} untuk melihat detailnya.`;
  const html =
    `<p>Halo,</p>` +
    `<p>Ada pembaruan pada status salah satu laporan yang Anda buat di ${escapeHtml(APP_NAME)}.<br>` +
    `${ajakanHtml}</p>` +
    `<p style="color:#666;font-size:12px">Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "api-key": apiKey,
  };
  // Mode sandbox Brevo: permintaan divalidasi dan dijawab seolah sukses,
  // tetapi tidak ada email yang benar-benar dikirim. Untuk uji coba.
  if (bacaEnv("BREVO_SANDBOX") === "true") headers["X-Sib-Sandbox"] = "drop";

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sender: { name: pengirimNama, email: pengirimEmail },
      to: [{ email: ke }],
      subject: "Ada pembaruan pada laporan Anda",
      textContent: teks,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(BATAS_WAKTU_MS),
  });
  if (!res.ok) throw new GalatBrevo(res.status);
}
