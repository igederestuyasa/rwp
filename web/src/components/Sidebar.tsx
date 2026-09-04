"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Layers, LogOut, PanelLeftClose } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APP_NAME, ORG_NAME } from "@/lib/constants";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rwp_sidebar_collapsed";

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1",
  );

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (!user) return null;

  const { main, bottom } = NAV[user.role];

  function NavLink({ item }: { item: (typeof main)[number] }) {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150",
          collapsed ? "justify-center px-0" : "gap-3 px-3",
          active
            ? "bg-accent-soft text-accent"
            : "text-ink-secondary hover:bg-surface-raised hover:text-ink",
        )}
      >
        {/* Garis aktif di kiri */}
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
        )}
        <Icon className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-accent" : "text-ink-muted group-hover:text-ink-secondary",
        )} />
        {!collapsed && item.label}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col transition-[width] duration-200",
        "md:sticky md:top-0 md:flex md:h-screen",
        "border-r border-line bg-surface",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Brand — h tetap 60px agar tidak loncat saat toggle */}
      <div className={cn(
        "flex h-[60px] shrink-0 items-center",
        collapsed ? "justify-center px-2" : "justify-between px-3.5",
      )}>
        {collapsed ? (
          <button
            onClick={toggle}
            title="Buka menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm transition-all duration-150 hover:bg-accent-hover active:scale-95"
          >
            <Layers className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
                <Layers className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-ink">{APP_NAME}</div>
                <div className="truncate text-xs text-ink-muted">{ORG_NAME.split(" (")[0]}</div>
              </div>
            </div>
            <button
              onClick={toggle}
              title="Tutup menu"
              className="ml-2 shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-secondary"
            >
              <PanelLeftClose className="h-[17px] w-[17px]" />
            </button>
          </>
        )}
      </div>

      <div className="mx-3 h-px shrink-0 bg-line" />

      {/* Nav utama */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {main.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* Bawah: Pengaturan, Bantuan, Logout */}
      <div className="shrink-0 px-3 pb-4">
        <div className="mb-2 h-px bg-line" />

        <div className="space-y-0.5">
          {bottom.map((item) => <NavLink key={item.href} item={item} />)}
        </div>

        <div className="mt-2 h-px bg-line" />

        <button
          onClick={logout}
          title="Log out"
          className={cn(
            "group mt-2 flex w-full items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150",
            "text-ink-muted hover:bg-red-50 hover:text-red-500",
            "dark:hover:bg-red-950/25 dark:hover:text-red-400",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 transition-colors group-hover:text-red-500 dark:group-hover:text-red-400" />
          {!collapsed && "Log out"}
        </button>
      </div>
    </aside>
  );
}
