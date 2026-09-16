// Halaman 404 (Server Component): dipakai saat notFound() dipanggil dan untuk
// seluruh URL yang tidak cocok dengan rute mana pun. Dirender di dalam root
// layout, jadi font dan token sudah tersedia. KosongHC adalah Client Component,
// tetapi aman dirender dari sini karena semua prop-nya string.

import { KosongHC } from "@/components/hc/KosongHC";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-latar px-5 py-12">
      <KosongHC
        className="w-full max-w-[480px]"
        judul="Halaman tidak ditemukan"
        ajakan="Alamatnya mungkin keliru atau halaman sudah dipindahkan. Kembali ke beranda untuk melanjutkan."
        aksiLabel="Ke beranda"
        href="/"
      />
    </div>
  );
}
