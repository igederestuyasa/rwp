// Ikon generatif HC Panel (docs/DESIGN.md §Ikon generatif).
//
// PENTING: fungsi rancangIkon() di bawah disalin PERSIS dari spesifikasi.
// Satu nama harus selalu menghasilkan ikon yang sama di seluruh app HC,
// jadi jangan "dirapikan" — mengubah urutan pemanggilan acak() saja sudah
// membuat ikon aplikasi ini berbeda dari app HC lainnya.

const BENTUK = ["kotak", "bulat", "seperempat", "setengah", "segitiga", "kosong"] as const;
type Bentuk = (typeof BENTUK)[number];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function hash(teks: string) {
  let h = 2166136261;
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pengacak(benih: number) {
  let a = benih;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rancangIkon(nama: string) {
  const acak = pengacak(hash(norm(nama)));
  const pilih = (tanpaKosong: boolean): Bentuk => BENTUK[Math.floor(acak() * (tanpaKosong ? 5 : 6))];
  const gelap = acak() < 0.55;
  const isi: Bentuk[] = [pilih(false), pilih(false), pilih(false), pilih(false)];
  for (let i = 0; i < 4 && isi.filter((b) => b !== "kosong").length < 3; i++) {
    if (isi[i] === "kosong") isi[i] = pilih(true);
  }
  const aksen = acak() < 0.5 ? Math.floor(acak() * 4) : -1;
  const sel = isi.map((jenis, i) => ({ jenis, i, putar: Math.floor(acak() * 4) * 90, aksen: i === aksen }));
  return { gelap, sel: sel.filter((s) => s.jenis !== "kosong") };
}

// ── Penggambaran satu sel ──────────────────────────────────────────────
// Sel ke-i menempati kotak 15×15 pada kisi 2×2 yang dimulai di (9, 9).
function jalurBentuk(jenis: Bentuk, x: number, y: number) {
  switch (jenis) {
    case "seperempat": return `M ${x} ${y} H ${x + 15} A 15 15 0 0 1 ${x} ${y + 15} Z`;
    case "setengah":   return `M ${x} ${y} H ${x + 15} A 7.5 7.5 0 0 1 ${x} ${y} Z`;
    case "segitiga":   return `M ${x} ${y} H ${x + 15} L ${x} ${y + 15} Z`;
    default:           return "";
  }
}

export type GenerativeIconProps = {
  /** Nama entitas — penentu tunggal rupa ikon. */
  nama: string;
  /** Sisi ikon dalam px. 40 di kartu, 96 di panel. */
  size?: number;
  /** Item belum tersedia → versi rencana (garis putus-putus). */
  rencana?: boolean;
  /** Urutan item dalam daftar, untuk menunda animasi muat halaman. */
  indeks?: number;
  className?: string;
};

export function GenerativeIcon({
  nama,
  size = 40,
  rencana = false,
  indeks = 0,
  className,
}: GenerativeIconProps) {
  const { gelap, sel } = rancangIkon(nama);

  // Latar: tinta kalau gelap, kartu bergaris kalau terang.
  const latarIsi    = rencana ? "none" : gelap ? "var(--color-tinta)" : "var(--color-kartu)";
  const latarGaris  = rencana ? "var(--color-garis-putus)" : gelap ? "none" : "var(--color-garis-kuat)";
  // Bentuk: kontras terhadap latarnya sendiri.
  const bentukWarna = rencana ? "var(--color-garis-putus)" : gelap ? "var(--color-kartu)" : "var(--color-tinta)";

  // Tunda animasi: 260ms + 40ms per item (maksimal 16 item) + 55ms per bentuk.
  const tundaDasar = 260 + Math.min(indeks, 16) * 40;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <rect
        x={0.75}
        y={0.75}
        width={46.5}
        height={46.5}
        rx={12}
        fill={latarIsi}
        stroke={latarGaris}
        strokeWidth={1.25}
        strokeDasharray={rencana ? "3 3" : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {sel.map(({ jenis, i, putar, aksen }) => {
        const x = 9 + (i % 2) * 15;
        const y = 9 + Math.floor(i / 2) * 15;
        const warna = aksen && !rencana ? "var(--color-merah-ikon)" : bentukWarna;
        const gaya = {
          animation: `ikonPop 420ms var(--ease-pantul) both`,
          animationDelay: `${tundaDasar + i * 55}ms`,
          transformOrigin: `${x + 7.5}px ${y + 7.5}px`,
        } as const;

        return (
          <g key={i} transform={`rotate(${putar}, ${x + 7.5}, ${y + 7.5})`}>
            {jenis === "kotak" ? (
              <rect x={x} y={y} width={15} height={15} fill={warna} style={gaya} />
            ) : jenis === "bulat" ? (
              <circle cx={x + 7.5} cy={y + 7.5} r={7.5} fill={warna} style={gaya} />
            ) : (
              <path d={jalurBentuk(jenis, x, y)} fill={warna} style={gaya} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
