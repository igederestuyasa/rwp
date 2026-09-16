"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOut, X } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/hc/Logo";
import { NAV, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Laci navigasi untuk layar HP (muncul saat tombol hamburger ditekan). */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  if (!user) return null;

  const { main, bottom } = NAV[user.role];

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 items-center gap-3 rounded-full px-3 text-bantu transition-colors duration-150",
          active
            ? "bg-latar font-semibold text-tinta"
            : "font-medium text-redup hover:bg-latar hover:text-tinta",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            active ? "text-tinta" : "text-redup group-hover:text-tinta",
          )}
        />
        {item.label}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* Latar peredup */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-latar/80 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel laci */}
      <div
        className={cn(
          "absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col transition-transform duration-200",
          "border-r border-garis bg-kartu",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-garis px-3">
          <span className="flex min-w-0 items-center gap-2.5 pl-1">
            <Logo size={28} />
            <span className="truncate text-isi font-bold text-tinta">{APP_NAME}</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-redup transition-colors duration-150 hover:bg-latar hover:text-tinta"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav utama */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {main.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        {/* Bawah: Pengaturan, Bantuan, Log out */}
        <div className="shrink-0 px-3 pb-4">
          <div className="mb-2 h-px bg-garis" />
          <div className="space-y-1">
            {bottom.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
          <div className="mt-2 h-px bg-garis" />
          <button
            onClick={() => { onClose(); logout(); }}
            aria-label="Log out"
            className="group mt-2 flex min-h-11 w-full items-center gap-3 rounded-full px-3 text-bantu font-medium text-redup transition-colors duration-150 hover:bg-latar hover:text-merah"
          >
            <SignOut size={20} className="shrink-0 transition-colors group-hover:text-merah" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
