"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PsikologiPanel } from "@/components/PsikologiPanel";

export default function PsikologiPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Lapis 2: halaman ini untuk karyawan (cek di level logika, §9.2).
  useEffect(() => {
    if (user?.role === "admin") router.replace("/dashboard");
  }, [user, router]);

  if (user?.role === "admin") return null;

  return <PsikologiPanel />;
}
