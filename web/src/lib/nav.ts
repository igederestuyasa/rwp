// Konfigurasi menu navigasi — dipakai bersama Sidebar (desktop) & MobileDrawer (HP).
import {
  Home, Bot, Settings, HelpCircle, LayoutDashboard, ListChecks,
  BookOpen, ShieldAlert, HeartHandshake, type LucideIcon,
} from "lucide-react";
import { ASSISTANT_NAME } from "./constants";
import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavConfig {
  /** Item utama — tampil di atas / tengah nav. */
  main: NavItem[];
  /** Item utilitas — tampil di bawah, dekat tombol logout. */
  bottom: NavItem[];
}

const BOTTOM: NavItem[] = [
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  { href: "/bantuan", label: "Bantuan", icon: HelpCircle },
];

const ASISTEN: NavItem = { href: "/asisten", label: ASSISTANT_NAME, icon: Bot };

export const NAV: Record<Role, NavConfig> = {
  karyawan: {
    main: [
      { href: "/beranda", label: "Beranda", icon: Home },
      ASISTEN,
      { href: "/kebijakan", label: "Kebijakan RWP", icon: BookOpen },
      { href: "/lapor", label: "Lapor Insiden", icon: ShieldAlert },
      { href: "/laporan", label: "Lacak Laporan", icon: ListChecks },
      { href: "/psikologi", label: "Layanan Psikologi", icon: HeartHandshake },
    ],
    bottom: BOTTOM,
  },
  admin: {
    main: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tiket", label: "Daftar Laporan", icon: ListChecks },
      ASISTEN,
    ],
    bottom: BOTTOM,
  },
};
