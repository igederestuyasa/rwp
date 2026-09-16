"use client";

// Lonceng notifikasi — tampilan mengikuti sistem UI "HC Panel" (docs/DESIGN.md).
// Popover boleh berbayangan (shadow-popover); tombol lonceng tidak.
// Sumber data & aksi (useNotifications: markRead, markAllRead, dismiss,
// dismissAll, persist localStorage) tidak berubah.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, FileText, ChatCircle, ArrowsClockwise, X, Trash } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { useNotifications, type AppNotification } from "@/lib/useNotifications";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "new_message")
    return <ChatCircle size={18} aria-hidden="true" className="text-redup" />;
  if (type === "new_ticket")
    return <FileText size={18} aria-hidden="true" className="text-redup" />;
  return <ArrowsClockwise size={18} aria-hidden="true" className="text-redup" />;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, isRead, dismiss, dismissAll } =
    useNotifications(user?.role ?? "karyawan");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!user) return null;

  const filtered = notifications;

  return (
    <div ref={ref} className="relative flex flex-col justify-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Buka notifikasi"
        aria-expanded={open}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-full",
          "border border-garis bg-kartu text-redup",
          "transition-colors duration-150 ease-[var(--ease-standar)]",
          "hover:border-garis-kuat hover:text-tinta",
        )}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1",
              "bg-merah text-mikro font-bold leading-none text-kartu tabular-nums",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-[440px] max-w-[calc(100vw-2.5rem)]",
            "rounded-[var(--radius-kartu)] border border-garis bg-kartu",
            "shadow-[var(--shadow-popover)]",
          )}
        >
          {/* Kepala */}
          <div className="flex items-center justify-between gap-3 border-b border-garis px-4 py-2">
            <span className="text-bantu font-semibold text-tinta">Notifikasi</span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className={cn(
                      "flex h-11 items-center rounded-full px-3 text-bantu font-medium text-redup",
                      "transition-colors duration-150 ease-[var(--ease-standar)]",
                      "hover:bg-latar hover:text-tinta",
                    )}
                  >
                    Tandai dibaca
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismissAll}
                  className={cn(
                    "flex h-11 items-center gap-1.5 rounded-full px-3 text-bantu font-medium text-redup",
                    "transition-colors duration-150 ease-[var(--ease-standar)]",
                    "hover:bg-latar hover:text-merah",
                  )}
                >
                  <Trash size={16} aria-hidden="true" />
                  Hapus semua
                </button>
              </div>
            )}
          </div>

          {/* Daftar notifikasi */}
          <ul className="max-h-96 divide-y divide-garis overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-center text-bantu text-redup">
                Belum ada notifikasi. Pemberitahuan baru akan muncul di sini.
              </li>
            ) : (
              filtered.map((n) => (
                <li key={n.id} className={cn("group relative", !isRead(n.id) && "bg-latar")}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex gap-3 px-4 py-3 pr-14",
                      "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      <NotifIcon type={n.type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-bantu font-semibold text-tinta">{n.title}</span>
                        {!isRead(n.id) && (
                          <span
                            aria-label="Belum dibaca"
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-merah"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-bantu text-redup">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-mikro text-redup">
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </Link>

                  {/* Tombol hapus notifikasi — muncul saat hover atau saat difokus */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(n.id);
                    }}
                    aria-label={`Hapus notifikasi ${n.title}`}
                    className={cn(
                      "absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center",
                      "rounded-full text-redup opacity-0",
                      "transition-[color,opacity] duration-150 ease-[var(--ease-standar)]",
                      "hover:text-merah group-hover:opacity-100 focus-visible:opacity-100",
                    )}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
