"use client";

// Daftar laporan milik karyawan sendiri — pola daftar-detail HC Panel
// (docs/DESIGN.md §Pola daftar-detail). Ini pekerjaan tampilan: sumber data
// (useStore), urutan, paginasi, dan tujuan navigasi (/laporan/[id]) tetap sama.

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarBlank, CaretLeft, CaretRight, ShieldWarning } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { STATUSES } from "@/lib/constants";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Field, Input } from "@/components/ui/Field";
import { SearchField } from "@/components/hc/SearchField";
import { FilterTabs } from "@/components/hc/FilterTabs";
import { DataTable, type Kolom } from "@/components/hc/DataTable";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";
import { DetailPanel } from "@/components/hc/DetailPanel";
import { KosongHC } from "@/components/hc/KosongHC";
import { MemuatHC } from "@/components/hc/MemuatHC";
import { StatusLabelLaporan } from "@/components/hc/StatusLabel";
import { useDaftarDetail } from "@/components/hc/useDaftarDetail";
import type { Report } from "@/lib/types";

const PAGE_SIZE = 20;

/** Ringkas kronologi untuk panel detail — isi lengkapnya ada di halaman detail. */
function ringkas(teks: string, maks = 180): string {
  const bersih = teks.replace(/\s+/g, " ").trim();
  return bersih.length <= maks ? bersih : `${bersih.slice(0, maks).trimEnd()}…`;
}

const KOLOM: Kolom<Report>[] = [
  {
    kunci: "tiket",
    judul: "Tiket",
    lebar: "118px",
    render: (r) => <span className="font-mono text-mikro text-redup">{r.ticketNo}</span>,
  },
  { kunci: "judul", judul: "Judul", render: (r) => <span className="line-clamp-2">{r.judul}</span> },
  { kunci: "kategori", judul: "Kategori", render: (r) => <span className="text-redup">{r.kategori}</span> },
  {
    kunci: "masuk",
    judul: "Masuk",
    render: (r) => <span className="whitespace-nowrap text-redup">{formatDate(r.createdAt)}</span>,
  },
  {
    kunci: "selesai",
    judul: "Selesai",
    render: (r) => (
      <span className="whitespace-nowrap text-redup">
        {r.resolvedAt ? formatDate(r.resolvedAt) : "—"}
      </span>
    ),
  },
  { kunci: "status", judul: "Status", render: (r) => <StatusLabelLaporan status={r.status} /> },
];

export default function LaporanPage() {
  // useDaftarDetail membaca ?pilih= lewat useSearchParams → butuh batas Suspense.
  return (
    <Suspense fallback={<p className="pt-6 text-isi text-redup">Memuat daftar laporan…</p>}>
      <IsiLaporan />
    </Suspense>
  );
}

function IsiLaporan() {
  const { reports, loading } = useStore();
  const router = useRouter();

  const [cari, setCari] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDate, setFDate] = useState("");
  const [page, setPage] = useState(0);
  const daftarRef = useRef<HTMLDivElement>(null);

  const kata = cari.trim().toLowerCase();

  // Reset ke halaman pertama saat filter berubah (adjust state during render —
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const filterKey = `${fStatus}|${fDate}|${kata}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  // Pencarian murni di klien atas data yang sudah ada — tanpa query baru.
  const cocokKata = (r: Report) =>
    !kata ||
    r.ticketNo.toLowerCase().includes(kata) ||
    r.judul.toLowerCase().includes(kata) ||
    r.kategori.toLowerCase().includes(kata);

  // Dasar hitung tab: semua filter kecuali status, supaya angka di tab berarti.
  const dasarHitung = reports.filter(
    (r) => cocokKata(r) && (!fDate || r.createdAt.slice(0, 10) === fDate),
  );

  const filtered = dasarHitung
    .filter((r) => !fStatus || r.status === fStatus)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const countByStatus = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = dasarHitung.filter((r) => r.status === s).length;
    return acc;
  }, {});

  const { terpilih, pilih, propsHover } = useDaftarDetail<Report>({
    items: pageItems,
    idDari: (r) => r.id,
  });

  const adaFilter = !!(fStatus || fDate || kata);
  const buka = (r: Report) => router.push(`/laporan/${r.id}`);
  const resetFilter = () => {
    setFStatus("");
    setFDate("");
    setCari("");
  };

  // Panah bawah dari kolom cari → item pertama di daftar (§Aksesibilitas).
  const fokusItemPertama = () => {
    daftarRef.current
      ?.querySelector<HTMLElement>('tr[data-baris="ya"], button')
      ?.focus();
  };

  const detail = terpilih
    ? {
        nama: terpilih.judul,
        kategori: terpilih.kategori,
        status: <StatusLabelLaporan status={terpilih.status} />,
        deskripsi: ringkas(terpilih.kronologi),
        baris: [
          {
            label: "Nomor tiket",
            nilai: <span className="font-mono">{terpilih.ticketNo}</span>,
          },
          { label: "Kategori", nilai: terpilih.kategori },
          { label: "Status", nilai: terpilih.status },
          { label: "Pelaporan", nilai: terpilih.isAnonymous ? "Anonim" : "Teridentifikasi" },
          {
            label: "Tanggal kejadian",
            nilai: terpilih.tanggalKejadian ? formatDate(terpilih.tanggalKejadian) : "",
          },
          { label: "Lokasi", nilai: terpilih.lokasi ?? "" },
          { label: "Terlapor", nilai: terpilih.terlapor ?? "" },
          { label: "Masuk", nilai: formatDateTime(terpilih.createdAt) },
          { label: "Selesai", nilai: terpilih.resolvedAt ? formatDateTime(terpilih.resolvedAt) : "" },
        ],
      }
    : null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-y-12 pt-6",
        "lg:grid-cols-[minmax(0,1fr)_clamp(320px,36%,400px)] lg:gap-x-16 lg:gap-y-8 lg:pt-8",
      )}
    >
      {/* Pembuka: h1, subjudul, kontrol utama (§Spasi — maksimal 4 elemen teks) */}
      <header className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="pembuka-masuk text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta">
            Lacak laporan
          </h1>
          <Link
            href="/lapor"
            className={cn(
              "pembuka-masuk inline-flex h-11 shrink-0 items-center gap-2 rounded-full",
              "border border-garis-kuat bg-kartu px-5 text-bantu font-semibold text-tinta",
              "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
            )}
            style={{ animationDelay: "60ms" }}
          >
            <ShieldWarning size={18} aria-hidden="true" />
            Lapor RWP
          </Link>
        </div>

        <p
          className="pembuka-masuk mt-3 max-w-[44ch] text-subjudul text-redup"
          style={{ animationDelay: "60ms" }}
        >
          Pantau status laporan yang kamu kirim dan lanjutkan percakapan dengan tim HC.
        </p>

        <div className="pembuka-masuk mt-6" style={{ animationDelay: "110ms" }}>
          <SearchField
            label="Cari laporan"
            value={cari}
            onChange={setCari}
            placeholder="Nomor tiket, judul, atau kategori"
            hasilInfo={`${filtered.length} laporan cocok`}
            onArrowDown={fokusItemPertama}
            onEnter={() => {
              const teratas = pageItems[0];
              if (teratas) buka(teratas);
            }}
          />
        </div>
      </header>

      {/* Konten daftar */}
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <FilterTabs
          label="Filter status laporan"
          items={[
            { id: "", label: "Semua", jumlah: dasarHitung.length },
            ...STATUSES.map((s) => ({ id: s, label: s, jumlah: countByStatus[s] ?? 0 })),
          ]}
          aktif={fStatus}
          onPilih={setFStatus}
        />

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Field label="Tanggal masuk">
              <div className="relative">
                <CalendarBlank
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-redup"
                />
                <Input
                  type="date"
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>
          </div>
          {adaFilter && (
            <button
              type="button"
              onClick={resetFilter}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-bantu font-medium text-redup",
                "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar hover:text-tinta",
              )}
            >
              Reset filter
            </button>
          )}
        </div>

        <div ref={daftarRef} className="mt-6">
          {pageItems.length === 0 && loading ? (
            <MemuatHC teks="Memuat daftar laporan…" />
          ) : pageItems.length === 0 ? (
            adaFilter ? (
              <KosongHC
                judul="Tidak ada laporan yang cocok"
                ajakan="Ubah kata kunci, status, atau tanggal untuk melihat laporan lainnya."
                aksiLabel="Reset filter"
                onAksi={resetFilter}
              />
            ) : (
              <KosongHC
                judul="Belum ada laporan"
                ajakan="Kirim laporan RWP pertamamu lewat formulir pelaporan, identitasmu bisa dirahasiakan."
                aksiLabel="Buat laporan"
                onAksi={() => router.push("/lapor")}
              />
            )
          ) : (
            <>
              {/* Desktop: tabel */}
              <div className="hidden lg:block">
                <DataTable<Report>
                  label="Daftar laporan saya"
                  kolom={KOLOM}
                  data={pageItems}
                  kunciBaris={(r) => r.id}
                  terpilih={terpilih?.id ?? null}
                  onPilih={(r) => pilih(r.id)}
                  onBuka={buka}
                />
              </div>

              {/* Di bawah 1024px: kartu, ketuk = aksi utama */}
              <div className="lg:hidden">
                <ItemCardGrid>
                  {pageItems.map((r, i) => {
                    const hover = propsHover(r);
                    return (
                      <ItemCard
                        key={r.id}
                        nama={r.judul}
                        deskripsi={`${r.kategori} · Masuk ${formatDate(r.createdAt)}`}
                        status={<StatusLabelLaporan status={r.status} />}
                        indeks={i}
                        terpilih={hover.terpilih}
                        onPilih={hover.onPilih}
                        onMouseEnter={hover.onMouseEnter}
                        onMouseLeave={hover.onMouseLeave}
                        onBuka={() => buka(r)}
                      />
                    );
                  })}
                </ItemCardGrid>
              </div>
            </>
          )}
        </div>

        {/* Paginasi — tetap 20 laporan per halaman */}
        {filtered.length > PAGE_SIZE && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-garis pt-4">
            <p className="text-bantu text-redup tabular-nums">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari{" "}
              {filtered.length} laporan
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full border border-garis-kuat bg-kartu px-4",
                  "text-bantu font-semibold text-tinta",
                  "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-kartu",
                )}
              >
                <CaretLeft size={16} aria-hidden="true" /> Sebelumnya
              </button>
              <span className="text-bantu text-redup tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full border border-garis-kuat bg-kartu px-4",
                  "text-bantu font-semibold text-tinta",
                  "transition-colors duration-150 ease-[var(--ease-standar)] hover:bg-latar",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-kartu",
                )}
              >
                Berikutnya <CaretRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel detail — desktop saja, menempel di atas */}
      <DetailPanel
        entitas="laporan"
        item={detail}
        aksiLabel="Buka laporan"
        onAksi={terpilih ? () => buka(terpilih) : undefined}
        className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
      />
    </div>
  );
}
