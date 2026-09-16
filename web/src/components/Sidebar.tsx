"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SidebarSimple, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/hc/Logo";
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
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 items-center rounded-full text-bantu transition-colors duration-150",
          collapsed ? "justify-center px-0" : "gap-3 px-3",
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
        {!collapsed && item.label}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col transition-[width] duration-200",
        "md:sticky md:top-0 md:flex md:h-screen",
        "border-r border-garis bg-kartu",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Merek — tinggi disamakan dengan bar atas (72) supaya tidak loncat saat toggle */}
      <div
        className={cn(
          "flex h-[72px] shrink-0 items-center",
          collapsed ? "justify-center px-2" : "justify-between px-3",
        )}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            title="Buka menu"
            aria-label="Buka menu"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-latar"
          >
            <Logo size={28} />
          </button>
        ) : (
          <>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <Logo size={28} />
            </span>
            <button
              onClick={toggle}
              title="Tutup menu"
              aria-label="Tutup menu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-redup transition-colors duration-150 hover:bg-latar hover:text-tinta"
            >
              <SidebarSimple size={20} />
            </button>
          </>
        )}
      </div>

      <div className="mx-3 h-px shrink-0 bg-garis" />

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
          onClick={logout}
          title="Log out"
          aria-label="Log out"
          className={cn(
            "group mt-2 flex min-h-11 w-full items-center rounded-full text-bantu font-medium transition-colors duration-150",
            "text-redup hover:bg-latar hover:text-merah",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
          )}
        >
          <SignOut size={20} className="shrink-0 transition-colors group-hover:text-merah" />
          {!collapsed && "Log out"}
        </button>
      </div>
    </aside>
  );
}
