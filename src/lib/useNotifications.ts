"use client";

import { useMemo, useState } from "react";
import { useStore } from "./store";
import type { Role } from "./types";

export interface AppNotification {
  id: string;
  type: "status_change" | "new_message" | "new_ticket";
  title: string;
  body: string;
  reportId: string;
  href: string;
  createdAt: string;
}

const STORAGE_KEY = "rwp_notif_read";
const DISMISSED_KEY = "rwp_notif_dismissed";

/** Baca readIds dari localStorage (bertahan saat refresh). */
function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Simpan readIds ke localStorage. */
function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage penuh atau tidak tersedia — abaikan
  }
}

/** Baca dismissedIds dari localStorage. */
function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Simpan dismissedIds ke localStorage. */
function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // abaikan
  }
}

export function useNotifications(role: Role) {
  const { reports, messages, logs } = useStore();
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedIds());

  const notifications = useMemo<AppNotification[]>(() => {
    const notifs: AppNotification[] = [];

    if (role === "karyawan") {
      // Perubahan status tiket
      for (const log of logs) {
        const report = reports.find((r) => r.id === log.reportId);
        if (!report) continue;
        const body = `${report.ticketNo}: status berubah ke "${log.toStatus}"`;
        notifs.push({
          id: `log-${log.id}`,
          type: "status_change",
          title: "Status tiket diperbarui",
          body,
          reportId: report.id,
          href: `/laporan/${report.id}`,
          createdAt: log.createdAt,
        });
      }

      // Balasan admin
      for (const msg of messages) {
        if (msg.senderRole !== "admin") continue;
        const report = reports.find((r) => r.id === msg.reportId);
        if (!report) continue;
        const body = `Ada balasan baru pada laporan ${report.ticketNo}`;
        notifs.push({
          id: `msg-${msg.id}`,
          type: "new_message",
          title: "Balasan dari admin",
          body,
          reportId: report.id,
          href: `/laporan/${report.id}`,
          createdAt: msg.createdAt,
        });
      }
    } else {
      // Tiket baru (status Diterima)
      for (const report of reports) {
        if (report.status !== "Diterima") continue;
        const body = `${report.ticketNo} — laporan sensitif masuk`;
        notifs.push({
          id: `new-${report.id}`,
          type: "new_ticket",
          title: "Tiket baru masuk",
          body,
          reportId: report.id,
          href: `/tiket/${report.id}`,
          createdAt: report.createdAt,
        });
      }

      // Pesan masuk dari karyawan
      for (const msg of messages) {
        if (msg.senderRole !== "karyawan") continue;
        const report = reports.find((r) => r.id === msg.reportId);
        if (!report) continue;
        const body = `Pesan baru pada laporan ${report.ticketNo}`;
        notifs.push({
          id: `msg-${msg.id}`,
          type: "new_message",
          title: "Pesan baru dari karyawan",
          body,
          reportId: report.id,
          href: `/tiket/${report.id}`,
          createdAt: msg.createdAt,
        });
      }
    }

    return notifs
      .filter((n) => !dismissedIds.has(n.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [role, reports, messages, logs, dismissedIds]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set([...prev, id]);
      saveReadIds(next);
      return next;
    });
  }

  function markAllRead() {
    const next = new Set(notifications.map((n) => n.id));
    saveReadIds(next);
    setReadIds(next);
  }

  function isRead(id: string) {
    return readIds.has(id);
  }

  function dismiss(id: string) {
    setDismissedIds((prev) => {
      const next = new Set([...prev, id]);
      saveDismissedIds(next);
      return next;
    });
  }

  function dismissAll() {
    setDismissedIds((prev) => {
      const next = new Set([...prev, ...notifications.map((n) => n.id)]);
      saveDismissedIds(next);
      return next;
    });
  }

  return { notifications, unreadCount, markRead, markAllRead, isRead, dismiss, dismissAll };
}
