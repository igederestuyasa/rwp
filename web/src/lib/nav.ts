// Konfigurasi menu navigasi — dipakai bersama Sidebar (desktop) & MobileDrawer (HP).
import {
  House, Robot, Gear, Question, SquaresFour, ListChecks,
  BookOpen, ShieldWarning, HandHeart, type Icon,
} from "@phosphor-icons/react";
import { ASSISTANT_NAME } from "./constants";
import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

export interface NavConfig {
  /** Item utama — tampil di atas / tengah nav. */
  main: NavItem[];
  /** Item utilitas — tampil di bawah, dekat tombol logout. */
  bottom: NavItem[];
}

const BOTTOM: NavItem[] = [
  { href: "/pengaturan", label: "Pengaturan", icon: Gear },
  { href: "/bantuan", label: "Bantuan", icon: Question },
];

const ASISTEN: NavItem = { href: "/asisten", label: ASSISTANT_NAME, icon: Robot };

export const NAV: Record<Role, NavConfig> = {
  karyawan: {
    main: [
      { href: "/beranda", label: "Beranda", icon: House },
      ASISTEN,
      { href: "/kebijakan", label: "Kebijakan RWP", icon: BookOpen },
      { href: "/lapor", label: "Lapor Insiden", icon: ShieldWarning },
      { href: "/laporan", label: "Lacak Laporan", icon: ListChecks },
      { href: "/psikologi", label: "Layanan Psikologi", icon: HandHeart },
    ],
    bottom: BOTTOM,
  },
  admin: {
    main: [
      { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
      { href: "/tiket", label: "Daftar Laporan", icon: ListChecks },
      ASISTEN,
    ],
    bottom: BOTTOM,
  },
};
