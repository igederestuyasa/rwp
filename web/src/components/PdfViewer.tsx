"use client";

// ============================================================
// PdfViewer — render PDF pakai PDF.js ke <canvas> + watermark.
// ------------------------------------------------------------
// Kenapa bukan iframe PDF viewer bawaan browser:
//   - Viewer bawaan punya tombol unduh/print yang tak bisa kita kontrol,
//     dan klik-kanan→Save tak bisa dicegah (di luar jangkauan JS halaman).
//   - Dengan render ke canvas: tak ada teks yang bisa di-copy, klik-kanan
//     bisa diblok, dan watermark (nama+NIK) DI-BAKE ke piksel — jadi
//     screenshot pun tetap membawa watermark (deterrent kebocoran).
//
// Catatan: ini tetap bisa dibypass orang teknikal (network tab / canvas
// extraction). Tujuannya menaikkan friksi + traceability, bukan DRM absolut.
//
// Performa: tiap halaman dirender LAZY (IntersectionObserver) saat mendekati
// viewport — load awal cepat walau dokumen banyak halaman.
// ============================================================
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FileText, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { getSupabase } from "@/lib/supabaseClient";

// Gambar watermark tiled-diagonal ke seluruh canvas (di atas konten halaman).
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  dpr: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.1;
  // Warna dibaca dari token supaya watermark ikut mode gelap; canvas butuh
  // nilai JS, bukan kelas.
  ctx.fillStyle =
    typeof document === "undefined"
      ? "#000"
      : getComputedStyle(document.documentElement).getPropertyValue("--color-tinta").trim() || "#000";
  ctx.font = `${14 * dpr}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // Putar -30° dari tengah canvas
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-30 * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);
  const stepX = 300 * dpr;
  const stepY = 130 * dpr;
  for (let y = -h; y < h * 2; y += stepY) {
    for (let x = -w; x < w * 2; x += stepX) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

interface PageProps {
  pdf: PDFDocumentProxy;
  pageNum: number;
  scale: number;
  watermark: string;
  placeholderW: number;
  placeholderH: number;
  root: HTMLElement | null;
}

// Satu halaman PDF — render ke canvas saat mendekati viewport.
function PdfPage({ pdf, pageNum, scale, watermark, placeholderW, placeholderH, root }: PageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const renderedRef = useRef(false);

  // Pantau visibilitas (render saat ~400px sebelum masuk area scroll).
  // root = container scroll dokumen (bukan viewport) agar deteksi akurat.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible(true); },
      { root, rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  // Render halaman + watermark
  useEffect(() => {
    if (!visible || renderedRef.current) return;
    renderedRef.current = true;
    let cancelled = false;

    (async () => {
      const page = await pdf.getPage(pageNum);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
      drawWatermark(ctx, canvas.width, canvas.height, watermark, dpr);
      setRendered(true);
    })();

    return () => { cancelled = true; };
  }, [visible, pdf, pageNum, scale, watermark]);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto bg-kartu"
      style={{ width: placeholderW, minHeight: rendered ? undefined : placeholderH }}
    >
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center text-mikro text-redup">
          <CircleNotch size={16} className="animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

interface PdfViewerProps {
  path: string;
  title: string;
  watermark: string;
}

export function PdfViewer({ path, title, watermark }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simpan elemen container scroll untuk dipakai sebagai root IntersectionObserver
  useEffect(() => { setRootEl(containerRef.current); }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1. Ambil PDF lewat proxy ber-auth (Bearer token)
        const { data: { session } } = await getSupabase().auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

        const res = await fetch(`/api/policy-pdf?path=${encodeURIComponent(path)}`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        // 2. Muat PDF.js (dinamis — hanya di browser) + set worker
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const doc = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;

        // 3. Hitung skala dari lebar kontainer (pakai halaman 1 sebagai acuan)
        const page1 = await doc.getPage(1);
        const base = page1.getViewport({ scale: 1 });
        // clientWidth termasuk padding p-4 (32px) → kurangi agar tak overflow
        const containerW = (containerRef.current?.clientWidth ?? 800) - 32;
        const targetW = Math.min(containerW, 900); // batasi lebar maksimum
        const s = targetW / base.width;
        if (cancelled) return;

        setScale(s);
        setDims({ w: base.width * s, h: base.height * s });
        setPdf(doc);
      } catch (e) {
        console.error("Gagal memuat PDF:", e);
        if (!cancelled) setError("Gagal memuat dokumen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [path]);

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-kartu)] border border-garis bg-kartu select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-garis bg-latar px-4 py-2.5">
        <FileText size={16} className="shrink-0 text-redup" />
        <span className="truncate text-mikro font-medium text-redup">{title}</span>
      </div>

      {/* Area dokumen */}
      <div
        ref={containerRef}
        className="overflow-y-auto bg-latar p-4"
        style={{ height: "75vh", minHeight: "500px" }}
      >
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-bantu text-redup">
            <CircleNotch size={20} className="animate-spin" /> Memuat dokumen…
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center gap-2 text-bantu text-redup">
            <WarningCircle size={20} /> {error}
          </div>
        )}
        {pdf && dims && (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <PdfPage
                key={i + 1}
                pdf={pdf}
                pageNum={i + 1}
                scale={scale}
                watermark={watermark}
                placeholderW={dims.w}
                placeholderH={dims.h}
                root={rootEl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
