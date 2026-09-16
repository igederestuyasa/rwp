import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Token ukuran huruf HC Panel (docs/DESIGN.md §Tipografi) berawalan "text-",
// sama seperti token warna. tailwind-merge tidak mengenal nama kustom kita,
// jadi secara bawaan ia menganggap "text-isi" dan "text-kartu" satu golongan
// lalu MEMBUANG salah satunya. Akibatnya tombol utama sempat kehilangan
// "text-kartu" dan teksnya jadi tinta di atas latar tinta alias tak terbaca.
// Daftar berikut memberi tahu tailwind-merge mana yang ukuran huruf.
const UKURAN_HURUF = [
  "mikro", "bantu", "isi", "subjudul", "bagian", "panel", "halaman",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: UKURAN_HURUF }],
    },
  },
});

/** Gabung className Tailwind dengan aman (resolve konflik). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Format tanggal: 20 Mei 2026. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format tanggal + jam: 20 Mei 2026, 14:05. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)}, ${jam}:${menit}`;
}

/** Nomor tiket contoh untuk mode mock. Di Supabase, nomor dibuat trigger
 *  set_ticket_no() — prefix RWP dengan tahun berjalan. */
export function makeTicketNo(prefix: string, seq: number): string {
  return `${prefix}-2026-${String(seq).padStart(4, "0")}`;
}

/** Tanggal hari ini dalam format YYYY-MM-DD (zona lokal, bukan UTC).
 *  Jangan pakai toISOString() — di UTC+7 bisa geser satu hari ke belakang. */
export function localIsoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Objek Date `n` hari yang lalu dari sekarang (untuk preset rentang tanggal).
 *  Helper module-scope ini menjaga `Date.now()` keluar dari scope render
 *  komponen (react-hooks/purity) — pemanggilan tetap impure tapi terisolasi. */
export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

/** Race sebuah promise dengan timeout. Reject Error("timeout") bila kelewat ms.
 *  Dipakai agar request jaringan yang menggantung (mis. browser blokir
 *  Supabase) tidak bikin UI nunggu selamanya. Menerima PromiseLike agar
 *  query builder Supabase (thenable) juga bisa di-wrap. */
export function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}
