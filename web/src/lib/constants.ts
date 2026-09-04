// Konstanta domain RWP (placeholder — wajib divalidasi tim HC sebelum produksi).
import {
  Phone, MessageCircle, CalendarCheck, Mail, Globe, Brain, type LucideIcon,
} from "lucide-react";
import type { Status, SubRole } from "./types";

// ===== Brand =====
export const APP_NAME = "RWP Hutama Karya";
export const APP_TAGLINE = "Kanal kebijakan & pelaporan Respectful Workplace Policy";
export const ASSISTANT_NAME = "Sahabat RWP";
export const ORG_NAME = "PT Hutama Karya (Persero)";

// ===== Layanan Psikologi (EAP) — 6 kanal kontak =====
export type PsikologiChannelType = "tel" | "whatsapp" | "url" | "email";

export interface PsikologiChannel {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  type: PsikologiChannelType;
  href: string;
  cta: string;       // teks tombol aksi
  badge?: string;    // badge opsional (mis. "24/7")
}

export const PSIKOLOGI_CHANNELS: PsikologiChannel[] = [
  {
    id: "careline",
    label: "Careline 24/7",
    desc: "Layanan telepon konseling darurat tersedia 24 jam sehari, 7 hari seminggu.",
    icon: Phone,
    type: "tel",
    href: "tel:08001504045",
    cta: "Hubungi Sekarang",
    badge: "24/7",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Chat",
    desc: "Immediate support melalui WhatsApp untuk respons cepat kapan pun Anda butuhkan.",
    icon: MessageCircle,
    type: "whatsapp",
    href: "https://wa.me/6281190077217",
    cta: "Buka WhatsApp",
    badge: "24/7",
  },
  {
    id: "daftar-internal",
    label: "Psikolog Internal Perusahaan",
    desc: "Daftar sesi konseling dengan psikolog internal PT Hutama Karya melalui tautan berikut.",
    icon: CalendarCheck,
    type: "url",
    href: "https://bit.ly/DaftarLayananKonselingHK",
    cta: "Daftar Sekarang",
  },
  {
    id: "email-internal",
    label: "Email Psikolog Internal",
    desc: "Kirim pertanyaan atau jadwal konseling melalui email psikolog internal perusahaan.",
    icon: Mail,
    type: "email",
    href: "mailto:konseling@hutamakarya.com",
    cta: "Kirim Email",
  },
  {
    id: "naluri",
    label: "Psikolog Eksternal — Naluri",
    desc: "Akses platform wellness Naluri, mitra resmi PT Hutama Karya untuk Employee Assistance Program (EAP).",
    icon: Globe,
    type: "url",
    href: "https://wellness.naluri.life/id/hutamakarya-eap",
    cta: "Buka Naluri",
  },
  {
    id: "screening",
    label: "Screening Kondisi Psikologis",
    desc: "Coba asesmen mandiri kondisi psikologis kamu secara anonim. Hasil hanya untuk keperluan pribadi.",
    icon: Brain,
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

export const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  Diterima: ["Sedang Ditinjau", "Ditutup"],
  "Sedang Ditinjau": ["Tindak Lanjut", "Ditutup"],
  "Tindak Lanjut": ["Selesai", "Ditutup"],
  Selesai: [],
  Ditutup: [],
};

export const STATUS_STYLES: Record<Status, string> = {
  Diterima: "bg-blue-50 text-blue-700 ring-blue-200",
  "Sedang Ditinjau": "bg-amber-50 text-amber-700 ring-amber-200",
  "Tindak Lanjut": "bg-orange-50 text-orange-700 ring-orange-200",
  Selesai: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Ditutup: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const STATUS_CHART_COLORS: Record<Status, string> = {
  Diterima: "#3b82f6",
  "Sedang Ditinjau": "#f59e0b",
  "Tindak Lanjut": "#f97316",
  Selesai: "#10b981",
  Ditutup: "#94a3b8",
};
