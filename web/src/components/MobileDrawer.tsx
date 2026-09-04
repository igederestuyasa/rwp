"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, LogOut, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
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
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
        )}
      >
        <Icon className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500",
        )} />
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
      {/* Latar gelap */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-900/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel laci */}
      <div
        className={cn(
          "absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col shadow-xl transition-transform duration-200",
          "bg-white dark:bg-slate-900",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B5BD6] to-[#9B5BD6] text-white shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{APP_NAME}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav utama */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {main.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        {/* Bawah: Pengaturan, Bantuan, Logout */}
        <div className="px-3 pb-4">
          <div className="mb-2 h-px bg-slate-100 dark:bg-slate-700/60" />
          <div className="space-y-0.5">
            {bottom.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
          <div className="mt-2 h-px bg-slate-100 dark:bg-slate-700/60" />
          <button
            onClick={() => { onClose(); logout(); }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-slate-500" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
