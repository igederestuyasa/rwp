"use client";

// Halaman Kebijakan RWP — pola daftar-detail HC Panel (docs/DESIGN.md).
//
// Dua lapis navigasi yang sengaja dipisah:
//   1. `?pilih=<id>` — item yang tampil di PANEL DETAIL (dikelola useDaftarDetail).
//      Hover/fokus kartu hanya mengisi panel, tidak membuka apa-apa.
//   2. `?id=<id>`    — deep-link dari Sahabat RWP (/kebijakan?id=rwp) yang LANGSUNG
//      membuka pembaca dokumen. Keduanya hidup berdampingan.
//
// Admin membuka halaman yang SAMA untuk memantau apa yang dibaca karyawan.
// Bedanya satu: draft (`is_published = false`) ikut dimuat dan diberi label
// "Draft" supaya bisa dipratinjau sebelum terbit — RLS memang mengizinkan
// admin membacanya, sedangkan karyawan hanya menerima yang terbit. Isinya
// dikelola di /kelola-kebijakan, bukan di sini.

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleNotch, NotePencil, Warning } from "@phosphor-icons/react";
import { POLICIES, type PolicyDoc } from "@/lib/policies";
import { USE_MOCK, getSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/hc/SearchField";
import { ItemCard, ItemCardGrid } from "@/components/hc/ItemCard";
import { DetailPanel } from "@/components/hc/DetailPanel";
import { StatusLabel } from "@/components/hc/StatusLabel";
import { KosongHC } from "@/components/hc/KosongHC";
import { useDaftarDetail } from "@/components/hc/useDaftarDetail";
import { PdfViewer } from "@/components/PdfViewer";
import { MarkdownKebijakan } from "@/components/MarkdownKebijakan";

// ─── Mapper baris DB → PolicyDoc ─────────────────────────────────────────────
function rowToPolicy(row: Record<string, unknown>): PolicyDoc {
  return {
    id: String(row.id),
    title: String(row.title),
    kategori: String(row.kategori),
    ringkas: String(row.ringkas),
    body: Array.isArray(row.body) ? (row.body as string[]) : [],
    updated: String(row.updated_at),
    // Kolom markdown opsional — kalau ada di DB, dipakai langsung
    ...(row.markdown ? { markdown: String(row.markdown) } : {}),
    // Kolom pdf_path opsional — path file di bucket privat Supabase Storage
    ...(row.pdf_path ? { pdfPath: String(row.pdf_path) } : {}),
    // Hanya draft yang ditandai; baris terbit dibiarkan `undefined` seperti data mock.
    ...(row.is_published === false ? { isPublished: false } : {}),
  };
}

/** Draft hanya sampai ke admin (lihat catatan di kepala berkas). */
function adalahDraft(doc: PolicyDoc): boolean {
  return doc.isPublished === false;
}

/** Tautan bergaya tombol sekunder (Button hanya untuk <button>). */
const KELAS_TAUTAN_SEKUNDER = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5",
  "border border-garis-kuat bg-kartu text-bantu font-semibold text-tinta",
  "transition-colors duration-150 hover:bg-latar",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
);

/** Bentuk dokumen, untuk baris `dl` di panel detail. */
function bentukDokumen(doc: PolicyDoc): string {
  if (doc.pdfPath) return "PDF berwatermark";
  if (doc.markdown) return "Teks lengkap";
  return "Ringkasan teks";
}

// ─── Pembaca dokumen ─────────────────────────────────────────────────────────
function PolicyDetail({ doc, onBack }: { doc: PolicyDoc; onBack: () => void }) {
  const { user } = useAuth();
  // Watermark: nama + NIK user yang login → bocoran dokumen bisa dilacak.
  const watermark = user ? `${user.nama} · ${user.nik}` : APP_NAME;

  return (
    <div className="pt-6 lg:pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" className="h-11" onClick={onBack}>
          <ArrowLeft size={18} weight="regular" aria-hidden="true" />
          Kembali ke daftar kebijakan
        </Button>
        {/* Admin: lompat ke editor kebijakan ini (cek peran hanya untuk tampilan;
            halaman tujuan dan RLS yang menegakkan wewenangnya, §9.2). */}
        {user?.role === "admin" && (
          <Link
            href={`/kelola-kebijakan?pilih=${encodeURIComponent(doc.id)}&ubah=1`}
            className={KELAS_TAUTAN_SEKUNDER}
          >
            <NotePencil size={18} aria-hidden="true" />
            Ubah kebijakan
          </Link>
        )}
      </div>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusLabel>{doc.kategori}</StatusLabel>
          {adalahDraft(doc) && <StatusLabel nada="peringatan">Draft</StatusLabel>}
        </div>
        <h1 className="mt-3 text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta">
          {doc.title}
        </h1>
        <p className="mt-3 max-w-[44ch] text-subjudul leading-[1.5] text-redup">
          Diperbarui {formatDate(doc.updated)}
        </p>
      </header>

      <div className="mt-8">
        {doc.pdfPath ? (
          <PdfViewer path={doc.pdfPath} title={doc.title} watermark={watermark} />
        ) : (
          <div
            className="rounded-[var(--radius-panel)] border border-garis bg-kartu p-6 select-none sm:p-8"
            onContextMenu={(e) => e.preventDefault()}
          >
            {doc.markdown ? (
              <MarkdownKebijakan>{doc.markdown}</MarkdownKebijakan>
            ) : (
              <>
                <div className="space-y-4 text-isi leading-[1.6] text-tinta">
                  {doc.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <p className="mt-8 border-t border-garis pt-4 text-mikro leading-[1.5] font-semibold text-redup">
                  Dokumen contoh (placeholder). Ganti dengan dokumen kebijakan resmi HC.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Susunan daftar-detail (§Spasi, bentuk, tata letak) ──────────────────────
const GAYA_DAFTAR_DETAIL: CSSProperties = {
  gridTemplateColumns: "minmax(0,1fr) clamp(320px,36%,400px)",
  // Baris konten `1fr`: panel yang membentang dua baris tidak boleh ikut
  // meninggikan baris pembuka, atau daftar bergeser tiap panel berganti isi
  // (nyata saat dokumen cuma satu-dua). Lihat catatan yang sama di /kelola-kebijakan.
  gridTemplateRows: "auto 1fr",
  gridTemplateAreas: '"pembuka panel" "konten panel"',
  columnGap: 64,
  rowGap: 32,
};

// ─── Halaman daftar ───────────────────────────────────────────────────────────
function KebijakanIsi() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selected, setSelected] = useState<PolicyDoc | null>(null);
  const [query, setQuery] = useState("");
  const kontenRef = useRef<HTMLDivElement>(null);

  // Data — mock langsung, Supabase via fetch
  const [policies, setPolicies] = useState<PolicyDoc[]>(USE_MOCK ? POLICIES : []);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Deep-link: /kebijakan?id=<policyId> langsung buka detail kebijakan tsb.
  // Disesuaikan saat render (pola resmi React "adjusting state during render"),
  // bukan lewat effect — dan sengaja HANYA sekali. Versi effect sebelumnya ikut
  // berjalan ulang setiap kali `selected` berubah, jadi tombol "kembali" di
  // halaman detail langsung membuka ulang kebijakan yang sama selama `?id=`
  // masih menempel di URL.
  const deepLinkId = searchParams.get("id");
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  if (!deepLinkApplied && deepLinkId && policies.length > 0) {
    setDeepLinkApplied(true);
    const found = policies.find((p) => p.id === deepLinkId);
    if (found) setSelected(found);
  }

  useEffect(() => {
    if (USE_MOCK) return;

    async function load() {
      try {
        // Karyawan: hanya yang terbit. Admin: semuanya, draft diberi label —
        // RLS tetap lapis penegaknya, filter ini cuma menentukan tampilan.
        let query = getSupabase()
          .from("policies")
          .select("id, title, kategori, ringkas, body, markdown, pdf_path, is_published, updated_at");
        if (!isAdmin) query = query.eq("is_published", true);
        const { data, error } = await query.order("display_order", { ascending: true });

        if (error) throw error;
        setPolicies((data ?? []).map(rowToPolicy));
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Gagal memuat daftar kebijakan.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAdmin]);

  const jumlahDraft = isAdmin ? policies.filter(adalahDraft).length : 0;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return policies;
    return policies.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.ringkas.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q),
    );
  }, [query, policies]);

  // Pemilihan panel detail: hover intent 120ms, fokus memilih, id di `?pilih=`.
  const { terpilih, propsHover } = useDaftarDetail<PolicyDoc>({
    items: filtered,
    idDari: (p) => p.id,
  });

  const adaIsi = !loading && !fetchError && filtered.length > 0;

  function bukaDokumen(doc: PolicyDoc) {
    setSelected(doc);
  }

  // Panah bawah dari kolom cari: pindah ke kartu pertama (§Aksesibilitas).
  function fokusKartuPertama() {
    kontenRef.current?.querySelector<HTMLElement>("a,button")?.focus();
  }

  if (selected) return <PolicyDetail doc={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="pt-6 lg:grid lg:pt-8" style={GAYA_DAFTAR_DETAIL}>
      {/* Pembuka: h1 → subjudul → kontrol utama (maksimal 4 elemen teks) */}
      <header style={{ gridArea: "pembuka" }}>
        <h1
          className="pembuka-masuk text-halaman leading-[1.05] font-bold tracking-[-0.04em] text-balance text-tinta"
          style={{ animationDelay: "0ms" }}
        >
          Kebijakan RWP
        </h1>
        <p
          className="pembuka-masuk mt-3 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
          style={{ animationDelay: "60ms" }}
        >
          {loading
            ? "Memuat daftar dokumen kebijakan."
            : jumlahDraft > 0
              ? `${policies.length - jumlahDraft} dokumen terbit dan ${jumlahDraft} draft yang hanya terlihat admin, pilih satu untuk membaca isinya.`
              : `${policies.length} dokumen kebijakan RWP, pilih satu untuk membaca isinya.`}
        </p>

        <div
          className="pembuka-masuk mt-8 max-w-xl"
          style={{ animationDelay: "110ms" }}
        >
          <SearchField
            label="Cari kebijakan"
            value={query}
            onChange={setQuery}
            placeholder="Judul, ringkasan, atau kategori"
            hasilInfo={`${filtered.length} dokumen cocok`}
            onArrowDown={fokusKartuPertama}
            onEnter={() => {
              if (filtered.length > 0) bukaDokumen(filtered[0]);
            }}
            nonaktif={loading || !!fetchError}
          />
        </div>
      </header>

      {/* Konten: daftar dokumen */}
      <div ref={kontenRef} style={{ gridArea: "konten" }} className="mt-12 lg:mt-0">
        {/* Keadaan: memuat */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-bantu text-redup">
            <CircleNotch size={20} weight="regular" aria-hidden="true" className="animate-spin" />
            Memuat kebijakan…
          </div>
        )}

        {/* Keadaan: gagal memuat */}
        {!loading && fetchError && (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-kartu)] border border-dashed border-garis-putus px-6 py-10 text-center">
            <Warning size={24} weight="regular" aria-hidden="true" className="text-merah" />
            <p className="text-subjudul leading-[1.3] font-bold tracking-[-0.02em] text-tinta">
              Gagal memuat kebijakan
            </p>
            <p className="max-w-[44ch] text-bantu leading-[1.5] text-redup">{fetchError}</p>
            <Button
              variant="secondary"
              className="mt-2 h-11"
              onClick={() => window.location.reload()}
            >
              Coba lagi
            </Button>
          </div>
        )}

        {/* Keadaan: kosong setelah filter / belum ada yang dipublikasikan */}
        {!loading && !fetchError && filtered.length === 0 && (
          query ? (
            <KosongHC
              judul="Tidak ada kebijakan yang cocok"
              ajakan={`Tidak ada dokumen yang memuat “${query}”, coba kata kunci lain atau hapus pencarian.`}
              aksiLabel="Hapus pencarian"
              onAksi={() => setQuery("")}
            />
          ) : (
            isAdmin ? (
              <KosongHC
                judul="Belum ada kebijakan"
                ajakan="Tambahkan dokumen kebijakan dari halaman Kelola Kebijakan, lalu terbitkan supaya karyawan bisa membacanya."
                aksiLabel="Buka Kelola Kebijakan"
                href="/kelola-kebijakan"
              />
            ) : (
              <KosongHC
                judul="Belum ada kebijakan yang dipublikasikan"
                ajakan="Dokumen akan muncul di sini begitu tim HC menerbitkannya, sementara itu tanya Sahabat RWP."
                aksiLabel="Buka Sahabat RWP"
                href="/asisten"
              />
            )
          )
        )}

        {/* Daftar kartu dokumen */}
        {adaIsi && (
          <ItemCardGrid>
            {filtered.map((p, i) => (
              <ItemCard
                key={p.id}
                nama={p.title}
                deskripsi={p.ringkas}
                status={
                  // "Draft" di depan: ItemCard hanya menyusutkan label terakhir,
                  // jadi kategori yang panjang terpotong, penanda draft tidak.
                  <>
                    {adalahDraft(p) && <StatusLabel nada="peringatan">Draft</StatusLabel>}
                    <StatusLabel>{p.kategori}</StatusLabel>
                  </>
                }
                indeks={i}
                onBuka={() => bukaDokumen(p)}
                {...propsHover(p)}
              />
            ))}
          </ItemCardGrid>
        )}
      </div>

      {/* Panel detail — desktop saja, menempel di atas (§Pola daftar-detail) */}
      <div
        style={{ gridArea: "panel" }}
        className="hidden lg:sticky lg:top-6 lg:block lg:self-start"
      >
        <DetailPanel
          entitas="kebijakan"
          item={
            terpilih
              ? {
                  nama: terpilih.title,
                  kategori: terpilih.kategori,
                  status: adalahDraft(terpilih) ? (
                    <StatusLabel nada="peringatan">Draft</StatusLabel>
                  ) : undefined,
                  deskripsi: terpilih.ringkas,
                  baris: [
                    { label: "Diperbarui", nilai: formatDate(terpilih.updated) },
                    { label: "Bentuk", nilai: bentukDokumen(terpilih) },
                  ],
                }
              : null
          }
          aksiLabel="Buka dokumen"
          onAksi={terpilih ? () => bukaDokumen(terpilih) : undefined}
        />
      </div>
    </div>
  );
}

export default function KebijakanPage() {
  // useSearchParams (di sini dan di useDaftarDetail) butuh batas Suspense.
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-20 text-bantu text-redup">
          <CircleNotch size={20} weight="regular" aria-hidden="true" className="animate-spin" />
          Memuat kebijakan…
        </div>
      }
    >
      <KebijakanIsi />
    </Suspense>
  );
}
