"use client";

// Renderer Markdown bergaya HC Panel. Dipakai dua tempat: /kebijakan (isi
// handbook untuk karyawan) dan /korpus (pembaca teks asli untuk admin) —
// satu sumber gaya supaya keduanya tampil sama.
//
// Semua warna dari token (docs/DESIGN.md §Token warna). Tidak ada varian mode
// gelap: nilai token sudah berganti sendiri saat kelas .dark aktif di <html>.
// react-markdown tidak merender HTML mentah, jadi teks unggahan admin aman
// ditampilkan balik (§9.4).

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const komponen: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 text-panel leading-[1.15] font-bold tracking-[-0.03em] text-tinta">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 border-b border-garis pb-2 text-bagian leading-[1.25] font-bold tracking-[-0.02em] text-tinta first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 text-subjudul leading-[1.3] font-bold tracking-[-0.02em] text-tinta">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-1.5 text-isi leading-[1.4] font-semibold text-tinta">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-isi leading-[1.6] text-tinta last:mb-0">{children}</p>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1 text-isi leading-[1.6] text-tinta">
      {children}
    </ol>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-4 list-disc space-y-1 text-isi leading-[1.6] text-tinta">
      {children}
    </ul>
  ),
  li: ({ children }) => <li className="pl-1 leading-[1.6]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-[var(--radius-input)] border border-garis bg-latar px-4 py-3 text-isi leading-[1.6] text-redup">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-tinta">{children}</strong>
  ),
  hr: () => <hr className="my-6 border-garis" />,
};

export function MarkdownKebijakan({ children }: { children: string }) {
  return <ReactMarkdown components={komponen}>{children}</ReactMarkdown>;
}
