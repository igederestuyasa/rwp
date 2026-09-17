"use client";

// Dashboard admin RWP. Isi utamanya ada di <RwpDashboard/>; halaman ini
// hanya penjaga akses + komposisi panel tambahan.
//   - RatingDashboard ×2  : agregat penilaian penanganan laporan dan rating
//                           asisten (tanpa komentar/isi percakapan, §9.1–9.2)
//   - ReportDownload      : unduh laporan periodik — hanya admin superior

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { RwpDashboard } from "@/components/RwpDashboard";
import { RatingDashboard } from "@/components/RatingDashboard";
import { ASSISTANT_NAME } from "@/lib/constants";
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
    <div>
      {/* Pembuka layar: h1 + subjudul (§Spasi — maksimal 4 elemen teks) */}
      <header className="min-w-0">
        <h1 className="pembuka-masuk text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta">
          Dashboard
        </h1>
        <p
          className="pembuka-masuk mt-3 max-w-[44ch] text-subjudul text-redup"
          style={{ animationDelay: "60ms" }}
        >
          Pantau laporan RWP yang masuk dan penanganannya. Identitas pelapor tidak ditampilkan.
        </p>
      </header>

      <div
        className="pembuka-masuk mt-8 space-y-12"
        style={{ animationDelay: "110ms" }}
      >
        <RwpDashboard />
        <RatingDashboard
          judul="Penilaian penanganan laporan"
          keterangan="Bintang dari pelapor setelah laporan selesai ditangani — agregat harian, tanpa komentar dan tanpa nomor tiket."
          rpc="get_report_feedback_summary"
        />
        <RatingDashboard
          judul={`Rating ${ASSISTANT_NAME}`}
          keterangan="Ulasan agregat dari karyawan, tanpa isi percakapan."
          rpc="get_chat_feedback_summary"
        />
        {user.subRole === "superior" && <ReportDownload />}
      </div>
    </div>
  );
}
