"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-canvas/90 px-5 backdrop-blur-md sm:px-8">
      {/* Mobile: hamburger + brand */}
      <div className="flex items-center gap-1.5 md:hidden">
        <button
          onClick={onMenuClick}
          aria-label="Buka menu"
          className="-ml-2 rounded-lg p-2 text-ink-secondary transition-colors hover:bg-surface-raised"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-2 font-bold text-ink">
          <span className="text-accent">●</span> {APP_NAME}
        </span>
      </div>
      <div className="hidden md:block" />

      {/* Kanan: notifikasi + profil */}
      <div className="flex items-stretch gap-2">
        <NotificationBell />
        <Link
          href="/profil"
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-2.5 py-1.5 shadow-xs transition-all hover:border-line-strong hover:shadow-sm"
        >
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-semibold text-ink">{user.nama}</div>
            <div className="text-xs capitalize text-ink-muted">{user.role}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
