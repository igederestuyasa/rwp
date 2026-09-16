"use client";

import Link from "next/link";
import { List } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { APP_NAME, ORG_NAME } from "@/lib/constants";
import { Logo } from "@/components/hc/Logo";
import { NotificationBell } from "@/components/NotificationBell";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.nama
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-garis bg-latar px-5 md:h-[72px] lg:px-10">
      {/* Kiri: hamburger (hanya HP) + merek */}
      <div className="flex min-w-0 items-center gap-1">
        <button
          onClick={onMenuClick}
          aria-label="Buka menu"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-redup transition-colors duration-150 hover:bg-kartu hover:text-tinta md:hidden"
        >
          <List size={20} />
        </button>
        <span className="flex min-w-0 items-center gap-2.5">
          <Logo size={28} />
          <span className="truncate text-isi font-bold text-tinta">{APP_NAME}</span>
        </span>
      </div>

      {/* Kanan: nama unit + notifikasi + profil */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-bantu text-redup sm:block">{ORG_NAME}</span>
        <NotificationBell />
        <Link
          href="/profil"
          className="flex min-h-11 items-center gap-3 rounded-full border border-garis bg-kartu px-2 py-1 transition-colors duration-150 hover:border-garis-kuat"
        >
          <div className="hidden pl-1.5 text-right leading-tight lg:block">
            <div className="text-bantu font-semibold text-tinta">{user.nama}</div>
            <div className="text-mikro capitalize text-redup">{user.role}</div>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-latar text-bantu font-bold text-tinta">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
