"use client";

// Dashboard admin RWP. Isi utamanya ada di <RwpDashboard/>; halaman ini
// hanya penjaga akses + komposisi panel tambahan.
//   - ChatRatingDashboard : rating agregat asisten (tanpa isi percakapan, §9.2)
//   - ReportDownload      : unduh laporan periodik — hanya admin superior

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { RwpDashboard } from "@/components/RwpDashboard";
import { ChatRatingDashboard } from "@/components/ChatRatingDashboard";
import { ReportDownload } from "@/components/ReportDownload";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Lapis 2: karyawan tidak punya dashboard (cek di level logika, §9.2).
  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/beranda");
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <RwpDashboard />
      <ChatRatingDashboard />
      {user.subRole === "superior" && <ReportDownload />}
    </div>
  );
}
