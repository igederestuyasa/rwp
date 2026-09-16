"use client";

// Batas galat di dalam cangkang aplikasi: Sidebar/Topbar dari (app)/layout.tsx
// tetap tampil dan hanya area konten yang diganti, sehingga pengguna masih
// bisa berpindah menu. Padding atas selaras halaman lain (pt-6 lg:pt-8).

import { GalatHalaman } from "@/components/GalatHalaman";

export default function GalatApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex justify-center pt-6 lg:pt-8">
      <GalatHalaman error={error} reset={reset} />
    </div>
  );
}
