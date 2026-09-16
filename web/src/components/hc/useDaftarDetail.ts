"use client";

// Perilaku pola daftar-detail HC Panel (docs/DESIGN.md §Pola daftar-detail).
//
// Aturan yang diwujudkan di sini:
//   - kursor berhenti 120ms di atas item → item terpilih (hover intent);
//   - fokus keyboard langsung memilih, tanpa tunda;
//   - id terpilih disimpan di URL `?pilih=<id>` lewat router.replace;
//   - kalau item terpilih hilang dari daftar (mis. kena filter), yang dipilih
//     adalah item pertama yang terlihat;
//   - pilihan awal: dari URL kalau id-nya ada di daftar, kalau tidak item
//     TERSEDIA pertama.
//
// CATATAN TEKNIS: id terpilih SENGAJA diturunkan saat render dari
// (pilihan manual → parameter URL → bawaan), bukan disimpan ulang lewat
// useEffect. Repo ini menyalakan react-hooks/set-state-in-effect sebagai
// error, dan nilai turunan juga tidak pernah basi satu render — daftar yang
// berubah langsung menghasilkan pilihan yang benar tanpa render tambahan.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Jeda hover intent (ms) sesuai spesifikasi. */
const TUNDA_HOVER = 120;

export type PropsHoverItem = {
  /** Item ini sedang tampil di panel detail. */
  terpilih: boolean;
  /** Pilih seketika — dipakai ItemCard saat menerima fokus keyboard. */
  onPilih: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export type HasilDaftarDetail<T> = {
  terpilihId: string | null;
  terpilih: T | null;
  pilih: (id: string) => void;
  propsHover: (item: T) => PropsHoverItem;
};

export type OpsiDaftarDetail<T> = {
  items: T[];
  idDari: (item: T) => string;
  /** Item yang belum tersedia tidak boleh jadi pilihan awal. Bawaan: selalu true. */
  tersediaDari?: (item: T) => boolean;
  /** Nama parameter URL. Bawaan: "pilih". */
  paramUrl?: string;
};

export function useDaftarDetail<T>(opsi: OpsiDaftarDetail<T>): HasilDaftarDetail<T> {
  const { items, idDari, tersediaDari, paramUrl = "pilih" } = opsi;

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const idUrl = params.get(paramUrl);

  // Hanya pilihan eksplisit user yang disimpan; sisanya diturunkan.
  const [pilihanManual, setPilihanManual] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bersihkan timer hover yang masih menggantung saat komponen dilepas.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const ids = items.map(idDari);

  // Bawaan: item TERSEDIA pertama; kalau semuanya belum tersedia, item pertama.
  let bawaan: string | null = null;
  for (let i = 0; i < items.length; i++) {
    if (!tersediaDari || tersediaDari(items[i])) {
      bawaan = ids[i];
      break;
    }
  }
  if (bawaan === null && ids.length > 0) bawaan = ids[0];

  // Urutan prioritas. Pilihan yang id-nya sudah tidak ada di daftar otomatis
  // gugur ke tingkat berikutnya, jadi filter yang menyembunyikan item terpilih
  // langsung jatuh ke item pertama yang terlihat.
  const terpilihId =
    pilihanManual !== null && ids.includes(pilihanManual)
      ? pilihanManual
      : idUrl !== null && ids.includes(idUrl)
        ? idUrl
        : bawaan;

  const indeks = terpilihId === null ? -1 : ids.indexOf(terpilihId);
  const terpilih = indeks >= 0 ? items[indeks] : null;

  const batalTunda = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pilih = useCallback(
    (id: string) => {
      setPilihanManual(id);
      // Simpan ke URL supaya tautan bisa dibagikan dan bertahan saat reload.
      if (params.get(paramUrl) === id) return;
      const berikut = new URLSearchParams(params.toString());
      berikut.set(paramUrl, id);
      router.replace(`${pathname}?${berikut.toString()}`, { scroll: false });
    },
    // setPilihanManual ikut didaftarkan karena React Compiler menyimpulkannya
    // sebagai dependensi; setter useState stabil, jadi tak menambah invalidasi.
    [paramUrl, params, pathname, router, setPilihanManual],
  );

  const propsHover = useCallback(
    (item: T): PropsHoverItem => {
      const id = idDari(item);
      return {
        terpilih: id === terpilihId,
        // Fokus keyboard memilih tanpa tunda.
        onPilih: () => {
          batalTunda();
          pilih(id);
        },
        onMouseEnter: () => {
          batalTunda();
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            pilih(id);
          }, TUNDA_HOVER);
        },
        onMouseLeave: batalTunda,
      };
    },
    [batalTunda, idDari, pilih, terpilihId],
  );

  return { terpilihId, terpilih, pilih, propsHover };
}
