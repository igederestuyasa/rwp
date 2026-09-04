"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, FileText, MessageSquare, RefreshCw, X, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNotifications, type AppNotification } from "@/lib/useNotifications";

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
    return <MessageSquare className="h-4 w-4 text-blue-500" />;
  if (type === "new_ticket")
    return <FileText className="h-4 w-4 text-amber-500" />;
  return <RefreshCw className="h-4 w-4 text-green-500" />;
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
    <div ref={ref} className="relative flex flex-col">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Buka notifikasi"
        className="relative flex flex-1 items-center justify-center rounded-xl px-2.5 text-slate-600 bg-white/75 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:bg-slate-800 dark:text-slate-300 dark:ring-1 dark:ring-slate-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[440px] max-w-[calc(100vw-1.25rem)] rounded-xl border border-slate-200/60 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifikasi</span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Tandai dibaca
                  </button>
                )}
                <button
                  onClick={dismissAll}
                  className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus semua
                </button>
              </div>
            )}
          </div>

          {/* List notifikasi */}
          <ul className="max-h-96 divide-y divide-slate-50 overflow-y-auto dark:divide-slate-700">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                Tidak ada notifikasi
              </li>
            ) : (
              filtered.map((n) => (
                <li
                  key={n.id}
                  className={`group relative ${isRead(n.id) ? "" : "bg-blue-50 dark:bg-blue-900/20"}`}
                >
                  <Link
                    href={n.href}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className="flex gap-3 px-4 py-3 pr-9 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotifIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {n.title}
                        </span>
                        {!isRead(n.id) && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {n.body}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                  {/* Tombol hapus notifikasi — muncul saat hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(n.id);
                    }}
                    aria-label="Hapus notifikasi"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-red-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
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
