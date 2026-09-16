"use client";

// Panel Layanan Psikologi (EAP) — 6 kanal kontak langsung, tanpa tiket.
// Dipakai sebagai halaman /psikologi. Prop `onBack` opsional: dipakai saat panel
// dirender di dalam alur lain yang punya halaman induk untuk dituju.
//
// Susunannya pola daftar-detail HC Panel (docs/DESIGN.md §Pola daftar-detail):
// daftar kanal di kiri, panel detail menempel di kanan (desktop). Aksi utama
// tiap kanal = membuka href-nya; tombol di panel menjalankan aksi yang sama.

import { Suspense, type CSSProperties } from "react";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react";
import {
  PSIKOLOGI_CHANNELS,
  type PsikologiChannel,
  type PsikologiChannelType,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";
import { DetailPanel } from "@/components/hc/DetailPanel";
import { StatusLabel } from "@/components/hc/StatusLabel";
import { useDaftarDetail } from "@/components/hc/useDaftarDetail";

// Jenis kanal dalam bahasa awam — dipakai sebagai kategori di panel detail.
const JENIS_KANAL: Record<PsikologiChannelType, string> = {
  tel: "Telepon",
  whatsapp: "WhatsApp",
  email: "Email",
  url: "Tautan web",
};

/** Kanal web dibuka di tab baru; telepon & email tetap di tab yang sama. */
function perluTabBaru(ch: PsikologiChannel): boolean {
  return ch.type === "url" || ch.type === "whatsapp";
}

/** Tujuan kanal dalam bentuk yang enak dibaca (nomor, alamat email, domain). */
function kontakKanal(ch: PsikologiChannel): string {
  if (ch.type === "tel") return ch.href.replace(/^tel:/, "");
  if (ch.type === "email") return ch.href.replace(/^mailto:/, "");
  return ch.href.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Aksi utama kanal — dipakai tombol panel detail. */
function bukaKanal(ch: PsikologiChannel) {
  if (perluTabBaru(ch)) window.open(ch.href, "_blank", "noopener,noreferrer");
  else window.location.href = ch.href;
}

// ─── Susunan daftar-detail (§Spasi, bentuk, tata letak) ──────────────────────
const GAYA_DAFTAR_DETAIL: CSSProperties = {
  gridTemplateColumns: "minmax(0,1fr) minmax(320px,400px)",
  gridTemplateAreas: '"pembuka panel" "konten panel"',
  columnGap: 64,
  rowGap: 32,
};

function PsikologiIsi({ onBack }: { onBack?: () => void }) {
  // Pemilihan panel: hover intent 120ms, fokus memilih, id di `?pilih=`.
  const { terpilih, propsHover } = useDaftarDetail<PsikologiChannel>({
    items: PSIKOLOGI_CHANNELS,
    idDari: (ch) => ch.id,
  });

  return (
    <div className="pt-6 lg:grid lg:pt-8" style={GAYA_DAFTAR_DETAIL}>
      {/* Pembuka: keterangan program → h1 → subjudul (3 elemen teks) */}
      <header style={{ gridArea: "pembuka" }}>
        {onBack && (
          <Button variant="secondary" className="mb-6 h-11" onClick={onBack}>
            <ArrowLeft size={18} weight="regular" aria-hidden="true" />
            Kembali
          </Button>
        )}

        <p
          className="pembuka-masuk text-isi leading-[1.4] font-medium text-redup"
          style={{ animationDelay: "0ms" }}
        >
          Employee Assistance Program (EAP)
        </p>
        <h1
          className="pembuka-masuk mt-2 text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta"
          style={{ animationDelay: "60ms" }}
        >
          Layanan Psikologi Perusahaan
        </h1>
        <p
          className="pembuka-masuk mt-3 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
          style={{ animationDelay: "110ms" }}
        >
          Enam kanal ini terhubung langsung ke tenaga profesional, tanpa perlu membuat
          laporan lebih dulu.
        </p>
      </header>

      {/* Konten: catatan privasi lalu daftar kanal */}
      <div style={{ gridArea: "konten" }} className="mt-12 lg:mt-0">
        {/* Catatan privasi — teks sengaja dipertahankan apa adanya */}
        {/* Blok menyambut: boleh memakai token lembut (§Token warna). */}
        <div className="flex items-start gap-3 rounded-[var(--radius-kartu)] border border-lembut-garis bg-lembut-latar px-4 py-3.5">
          <ShieldCheck
            size={20}
            weight="regular"
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-lembut"
          />
          <p className="text-bantu leading-[1.5] text-tinta">
            Kanal-kanal ini <span className="font-semibold">terpisah dari sistem pelaporan</span>.
            Isi sesi konseling tidak masuk ke aplikasi ini dan tidak terlihat oleh admin HC.
            Menghubungi mereka juga tidak otomatis membuat laporan.
          </p>
        </div>

        <ItemCardGrid className="mt-6">
          {PSIKOLOGI_CHANNELS.map((ch, i) => (
            // Pembungkus hanya untuk membuka kanal web di tab baru: ItemCard
            // merender <a> tanpa prop `target`, jadi navigasi bawaannya dicegat
            // di fase capture lalu diteruskan ke window.open. Tautannya tetap
            // <a href> asli, jadi klik kanan "buka di tab baru" ikut jalan.
            <div
              key={ch.id}
              className="h-full"
              onClickCapture={
                perluTabBaru(ch)
                  ? (e) => {
                      e.preventDefault();
                      window.open(ch.href, "_blank", "noopener,noreferrer");
                    }
                  : undefined
              }
            >
              <ItemCard
                as="a"
                href={ch.href}
                className="h-full"
                nama={ch.label}
                deskripsi={ch.desc}
                status={ch.badge ? <StatusLabel>{ch.badge}</StatusLabel> : undefined}
                indeks={i}
                {...propsHover(ch)}
              />
            </div>
          ))}
        </ItemCardGrid>
      </div>

      {/* Panel detail — desktop saja, menempel di atas (§Pola daftar-detail) */}
      <div
        style={{ gridArea: "panel" }}
        className="hidden lg:sticky lg:top-6 lg:block lg:self-start"
      >
        <DetailPanel
          entitas="kanal"
          item={
            terpilih
              ? {
                  nama: terpilih.label,
                  kategori: JENIS_KANAL[terpilih.type],
                  status: terpilih.badge ? (
                    <StatusLabel>{terpilih.badge}</StatusLabel>
                  ) : undefined,
                  deskripsi: terpilih.desc,
                  baris: [{ label: "Kontak", nilai: kontakKanal(terpilih) }],
                }
              : null
          }
          aksiLabel={terpilih?.cta}
          onAksi={terpilih ? () => bukaKanal(terpilih) : undefined}
        />
      </div>
    </div>
  );
}

export function PsikologiPanel({ onBack }: { onBack?: () => void }) {
  // useDaftarDetail memakai useSearchParams → butuh batas Suspense.
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-bantu text-redup">Memuat kanal layanan…</div>
      }
    >
      <PsikologiIsi onBack={onBack} />
    </Suspense>
  );
}
