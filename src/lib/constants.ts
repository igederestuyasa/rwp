// Konstanta domain RWP (placeholder — wajib divalidasi tim HC sebelum produksi).
import {
  PhoneCall, WhatsappLogo, CalendarCheck, EnvelopeSimple, Lifebuoy, ClipboardText,
  type Icon,
} from "@phosphor-icons/react";
import type { Status, SubRole } from "./types";

// ===== Brand =====
export const APP_NAME = "RWP Hutama Karya";
export const ASSISTANT_NAME = "Sahabat RWP";
export const ORG_NAME = "PT Hutama Karya (Persero)";

// ===== Layanan Psikologi (EAP) — 6 kanal kontak =====
export type PsikologiChannelType = "tel" | "whatsapp" | "url" | "email";

export interface PsikologiChannel {
  /** Ikon semantik kanal — set tetap, jadi tidak memakai ikon generatif. */
  icon: Icon;
  id: string;
  label: string;
  desc: string;
  type: PsikologiChannelType;
  href: string;
  cta: string;       // teks tombol aksi
  badge?: string;    // badge opsional (mis. "24/7")
}

export const PSIKOLOGI_CHANNELS: PsikologiChannel[] = [
  {
    id: "careline",
    icon: PhoneCall,
    label: "Careline 24/7",
    desc: "Layanan telepon konseling darurat tersedia 24 jam sehari, 7 hari seminggu.",
    type: "tel",
    href: "tel:08001504045",
    cta: "Hubungi Sekarang",
    badge: "24/7",
  },
  {
    id: "whatsapp",
    icon: WhatsappLogo,
    label: "WhatsApp Chat",
    desc: "Immediate support melalui WhatsApp untuk respons cepat kapan pun Anda butuhkan.",
    type: "whatsapp",
    href: "https://wa.me/6281190077217",
    cta: "Buka WhatsApp",
    badge: "24/7",
  },
  {
    id: "daftar-internal",
    icon: CalendarCheck,
    label: "Psikolog Internal Perusahaan",
    desc: "Daftar sesi konseling dengan psikolog internal PT Hutama Karya melalui tautan berikut.",
    type: "url",
    href: "https://bit.ly/DaftarLayananKonselingHK",
    cta: "Daftar Sekarang",
  },
  {
    id: "email-internal",
    icon: EnvelopeSimple,
    label: "Email Psikolog Internal",
    desc: "Kirim pertanyaan atau jadwal konseling melalui email psikolog internal perusahaan.",
    type: "email",
    href: "mailto:konseling@hutamakarya.com",
    cta: "Kirim Email",
  },
  {
    id: "naluri",
    icon: Lifebuoy,
    label: "Psikolog Eksternal — Naluri",
    desc: "Akses platform wellness Naluri, mitra resmi PT Hutama Karya untuk Employee Assistance Program (EAP).",
    type: "url",
    href: "https://wellness.naluri.life/id/hutamakarya-eap",
    cta: "Buka Naluri",
  },
  {
    id: "screening",
    icon: ClipboardText,
    label: "Screening Kondisi Psikologis",
    desc: "Coba asesmen mandiri kondisi psikologis kamu secara anonim. Hasil hanya untuk keperluan pribadi.",
    type: "url",
    href: "http://psychscale.vercel.app/",
    cta: "Mulai Screening",
    badge: "Baru",
  },
];

// ===== Label sub-role admin =====
export const SUB_ROLE_LABEL: Record<SubRole, string> = {
  superior: "Admin Superior",
  rwp: "Admin RWP",
};

// ===== Kategori insiden RWP =====
export const KATEGORI_INSIDEN = [
  "Diskriminasi",
  "Kekerasan",
  "Pelecehan",
  "Perundungan",
  "Bias Gender",
  "Eksklusivitas",
  "Lainnya",
] as const;

// ===== Status tiket =====
export const STATUSES: Status[] = [
  "Diterima", "Sedang Ditinjau", "Tindak Lanjut", "Selesai", "Ditutup",
];

/** Status akhir penanganan — laporan tidak bisa berpindah status lagi dan
 *  pelapor boleh memberi penilaian (selaras boleh_nilai_laporan di DB). */
export const STATUS_FINAL: readonly Status[] = ["Selesai", "Ditutup"];

export const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  Diterima: ["Sedang Ditinjau", "Ditutup"],
  "Sedang Ditinjau": ["Tindak Lanjut", "Ditutup"],
  "Tindak Lanjut": ["Selesai", "Ditutup"],
  Selesai: [],
  Ditutup: [],
};


