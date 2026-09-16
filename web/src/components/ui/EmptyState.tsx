/**
 * Tampilan kosong untuk daftar tiket (admin & karyawan) — teks via props.
 * Kotak border putus-putus menandai "belum ada isinya" (docs/DESIGN.md
 * §Komponen "Keadaan kosong").
 */
export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-kartu)] border border-dashed border-garis-putus px-6 py-8 text-center">
      <p className="text-subjudul font-bold text-tinta">{title}</p>
      <p className="max-w-[44ch] text-bantu text-redup">{subtitle}</p>
    </div>
  );
}
