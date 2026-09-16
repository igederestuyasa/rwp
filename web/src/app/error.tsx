"use client";

// Batas galat di bawah root layout: menangkap galat dari halaman publik
// (/, /login, /update-password) dan dari layout (app) itu sendiri. Root layout
// masih hidup, jadi font, token, dan Providers tetap tersedia.
// Kontrak Next 16: Client Component dengan props { error, reset }.

import { GalatHalaman } from "@/components/GalatHalaman";

export default function GalatRoot({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-latar px-5 py-12">
      <GalatHalaman error={error} reset={reset} />
    </div>
  );
}
