# Motion & Animation Guide — RWP Hutama Karya

> **Apa ini:** panduan animasi yang menemani [`style.md`](style.md). Kalau `style.md`
> mengatur *bagaimana sesuatu terlihat* (warna, tipografi, spacing), dokumen ini
> mengatur *bagaimana sesuatu bergerak* — supaya website terasa hidup & premium,
> bukan statis, tanpa jatuh ke "lebay".
>
> **Hubungan dengan `style.md`:** semua nilai gerak di sini adalah perpanjangan dari
> §9 (Motion / Transisi) `style.md`. Token visual tetap dari `style.md`; dokumen ini
> menambahkan **token gerak** (durasi, easing, jarak) + komponen reusable + koreografi
> per-section landing page.
>
> **Library:** **Motion** (rebranding dari Framer Motion) — `motion/react`. Dipilih
> karena orkestrasi (stagger, scroll-reveal, presence) jauh lebih ringkas daripada
> CSS murni, dan punya dukungan `prefers-reduced-motion` bawaan.
>
> **Stack target:** Next.js 16 (App Router) + React 19 + Tailwind v4. ⚠️ Komponen yang
> memakai `motion` **wajib `"use client"`** (lihat §3).

---

## 1. Filosofi Gerak (5 prinsip)

Sejajar dengan 4 prinsip `style.md`. Animasi mengikuti, bukan melawan, "clarity over decoration".

1. **Memandu, bukan pamer.** Setiap animasi punya tujuan: menarik mata ke hal penting,
   menjelaskan asal/tujuan elemen, atau memberi umpan balik. Kalau tidak menambah
   pemahaman → hapus.
2. **Cepat & halus > lambat & mencolok.** Default condong pendek (150–400ms). Animasi
   panjang hanya untuk *entrance* hero. User tidak boleh "menunggu" UI.
3. **Konsisten lewat token.** Semua durasi & easing dari `lib/motion.ts` (§4). Tidak ada
   `duration: 0.37` asal — sama seperti `style.md` melarang `13px`.
4. **Reduced-motion itu wajib, bukan opsional.** Setara aturan aksesibilitas `style.md` §11.
   Hormati `prefers-reduced-motion` di **semua** animasi (§7).
5. **Sekali jalan, bukan loop.** Scroll-reveal menyala **sekali** (`once: true`). Loop tak
   berujung hanya untuk dekorasi ambient yang sangat halus (mis. blob hero) — tidak pernah
   pada konten yang dibaca.

> **Prinsip performa (selalu):** animasikan **hanya `transform` & `opacity`**. Keduanya
> ditangani GPU/compositor → mulus 60fps. Jangan animasikan `width`, `height`, `top`,
> `left`, `margin` (memicu layout/reflow → patah-patah). Detail di §8.

---

## 2. Token Gerak (sumber kebenaran)

> Analog dengan "Design Tokens" `style.md` §2. Jangan hardcode angka di komponen —
> ambil dari sini. **Motion memakai detik (s), bukan milidetik (ms).**

### Durasi

| Token | Nilai | Pakai untuk |
|---|---|---|
| `fast` | **0.15s** | Mikro-interaksi: hover, focus, tap, toggle warna |
| `base` | **0.25s** | Kartu, dropdown, popover, accordion, reveal kecil |
| `slow` | **0.40s** | Reveal section, masuk halaman, modal |
| `slower` | **0.60s** | *Entrance* hero, orkestrasi besar (hemat — jangan di mana-mana) |

### Easing (cubic-bezier)

| Token | Kurva | Karakter | Pakai untuk |
|---|---|---|---|
| `standard` | `[0.4, 0, 0.2, 1]` | Ease-out seimbang | Default hampir semua transisi & hover |
| `out` | `[0.16, 1, 0.3, 1]` | Decelerate kuat (expo-ish) | *Entrance* / reveal — kesan premium "mendarat" |
| `in` | `[0.4, 0, 1, 1]` | Accelerate | *Exit* — elemen yang pergi/hilang |

> **Spring** untuk interaksi yang terasa "fisik" (tombol pop, drag): `type: "spring",
> stiffness: 400, damping: 30`. Pakai hemat — kebanyakan transisi cukup pakai easing
> di atas. Spring yang terlalu "bouncy" terasa murahan untuk produk korporat.

### Jarak geser & stagger

| Token | Nilai | Pakai untuk |
|---|---|---|
| `reveal-sm` | **8px** | Geser halus (teks paragraf, masuk halaman app) |
| `reveal-md` | **16px** | Default reveal kartu/section |
| `reveal-lg` | **24px** | Hero / elemen besar |
| `stagger` | **0.06–0.08s** | Jeda antar anak (kartu, list item, chip) |
| `delayChildren` | **0.10s** | Jeda sebelum anak pertama mulai |

> **Aturan jarak:** makin besar elemen, makin jauh boleh bergeser — tapi tetap kecil.
> Geser >32px terasa "melempar" dan mengganggu keterbacaan.

---

## 3. Setup (Next.js 16 + React 19)

```bash
cd web
npm install motion
```

> Paket sekarang bernama **`motion`** (dulu `framer-motion`). Impor React dari
> **`motion/react`**. Pastikan versi terbaru agar kompatibel React 19.

**⚠️ Aturan App Router yang WAJIB dipahami:**
- `motion.*` memakai hooks & context → komponen pemakainya **harus** `"use client"`.
- **Server Component tidak bisa** memakai `motion` langsung, tapi **boleh** me-render
  komponen client yang memakainya sebagai children. Pola yang dianjurkan: bungkus
  animasi dalam komponen kecil client (`<Reveal>`, `<Stagger>`) dan pakai dari page
  Server Component biasa.
- Untuk transisi antar-halaman App Router, pakai **`template.tsx`** (re-mount tiap
  navigasi), bukan `layout.tsx` (persisten) — lihat §6.4.

> ⚠️ Sesuai `web/AGENTS.md`: Next.js 16 punya breaking change. `template.tsx` &
> `"use client"` adalah fundamental App Router (bukan baru di 16), tapi tetap verifikasi
> ke `web/node_modules/next/dist/docs/` sebelum menulis kode yang menyentuh routing.

### File token bersama — `web/src/lib/motion.ts`

```ts
import type { Variants } from "motion/react";

// ─── Durasi (detik) ───
export const DUR = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

// ─── Easing (cubic-bezier sebagai tuple) ───
export const EASE = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
};

// ─── Variants reusable ───

// Fade + geser ke atas. `custom` = delay (detik) agar bisa di-stagger manual.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE.out, delay },
  }),
};

// Fade murni — untuk elemen yang tak boleh bergeser (mis. gambar besar).
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE.standard } },
};

// Container yang men-stagger anak-anaknya.
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
```

### Provider reduced-motion global — `web/src/lib/motion-provider.tsx`

```tsx
"use client";
import { MotionConfig } from "motion/react";

// Bungkus app sekali di (app)/layout atau root layout client boundary.
// reducedMotion="user" → Motion otomatis mematikan animasi transform/layout
// jika OS user minta, tapi tetap mengizinkan opacity. Aksesibilitas "gratis".
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
```

---

## 4. Komponen Reusable (dipakai di seluruh website)

> Ini bagian "global" — komponen yang sama dipakai di landing page **dan** halaman app
> (dashboard, form) nanti, persis seperti komponen di `style.md` §7 yang agnostik konteks.

### `<Reveal>` — fade-up saat masuk viewport

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";
import { fadeUp } from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number; // detik
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduce = useReducedMotion();
  // Reduced motion: render apa adanya, konten tetap terlihat (tanpa gerak).
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }} // sekali, saat 25% terlihat
    >
      {children}
    </motion.div>
  );
}
```

### `<Stagger>` — sekuens anak otomatis

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";
import { staggerContainer, fadeUp } from "@/lib/motion";

export function Stagger({ children, className }: {
  children: React.ReactNode; className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// Anak — pakai untuk tiap item di dalam <Stagger>.
// Karena nama variant ("hidden"/"show") sama dengan parent, sekuens otomatis.
export function StaggerItem({ children, className }: {
  children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
```

### Hover & tap untuk tombol/kartu

> Aturan `style.md` §9: hover lift `translateY(-1px s/d -2px)` + naik shadow.
> **Pembagian kerja:** shadow biarkan CSS (`hover:shadow-md` Tailwind — cepat & murah);
> Motion urus lift + tap feedback.

```tsx
"use client";
import { motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";

export function LiftButton({ children, className }: {
  children: React.ReactNode; className?: string;
}) {
  return (
    <motion.button
      className={className} // sertakan: transition-shadow hover:shadow-md
      whileHover={{ y: -2 }}
      whileTap={{ y: 0, scale: 0.98 }}
      transition={{ duration: DUR.fast, ease: EASE.standard }}
    >
      {children}
    </motion.button>
  );
}
```

- Kartu: `whileHover={{ y: -4 }}` (lebih besar dari tombol karena elemen lebih besar).
- **`focus-visible` jangan dianimasikan hilang** — outline aksen harus instan & jelas
  (`style.md` §11). Animasi hanya untuk hover/tap, bukan focus state.

---

## 5. Scroll & Presence (pola lanjutan)

### Parallax hero (scroll-linked)

```tsx
"use client";
import { motion, useScroll, useTransform } from "motion/react";

export function HeroBlob() {
  const { scrollY } = useScroll();
  // Saat scroll 0→400px, blob turun 0→80px (bergerak lebih pelan dari konten).
  const y = useTransform(scrollY, [0, 400], [0, 80]);
  return (
    <motion.div
      style={{ y }}
      className="pointer-events-none absolute -z-10 ..." // gradient-brand blur
      aria-hidden
    />
  );
}
```

> Parallax **halus saja** (rasio gerak < 25% scroll). Berlebihan = motion sickness.
> Elemen parallax selalu `aria-hidden` (dekorasi murni).

### Topbar sticky yang mengkerut/meninggi saat scroll

```tsx
const { scrollY } = useScroll();
const [scrolled, setScrolled] = useState(false);
useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
// lalu animasikan bg/blur/shadow via className conditional + transition CSS
```

### `<AnimatePresence>` — mount/unmount (FAQ, drawer, modal)

```tsx
"use client";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";

export function FaqItem({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: DUR.base, ease: EASE.standard }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

> `height: "auto"` adalah pengecualian sah dari "jangan animasi height" — Motion
> mengukur tinggi target & meng-handle-nya. Tetap pakai `overflow: hidden`.
> Pola sama dipakai untuk **MobileDrawer** (slide `x`) & **modal** (fade + scale 0.96→1).

---

## 6. Koreografi Landing Page (per section)

> Mengikuti urutan 11 section di [`content-brief-landing-page.md`](content-brief-landing-page.md).
> Prinsip umum: **hero animasi saat load**, sisanya **reveal saat scroll masuk
> (`once`)**. Jangan semua section pakai gerak identik — variasikan halus agar tidak monoton,
> tapi tetap dalam token §2.

| # | Section | Yang dianimasikan | Trigger | Gerak & timing |
|---|---|---|---|---|
| 1 | **Hero** | eyebrow → headline → subhead → CTA (berurutan); blob gradient; dot-grid | Load | Stagger `fadeUp` (delayChildren 0.1, stagger 0.08, durasi `slower`). Blob: drift ambient + parallax. CTA primary: glow `--shadow-accent` muncul terakhir |
| 2 | **Masalah/Konteks** | judul + paragraf; baris tabel "dulu vs sekarang" | Scroll | `Reveal` judul, lalu `Stagger` baris tabel (tiap baris fadeUp) |
| 3 | **Tiga Pintu** | 3 kartu value-prop | Scroll | `Stagger` 3 kartu (`fadeUp`, stagger 0.07) + hover lift `y:-4` per kartu |
| 4 | **Dua Jalur** | panel Reguler & panel RWP | Scroll | Dua panel reveal; **panel RWP diberi delay sedikit lebih lama** + callout privasi (🔒) fade-in terakhir → terasa "lebih dijaga" (sesuai catatan brief) |
| 5 | **HCsisten** | chat demo, contoh-pertanyaan (chips), 3 keunggulan | Scroll | Chips `Stagger`; (opsional) 1 bubble jawaban "mengetik" sekali — jangan loop |
| 6 | **Keamanan** | 4 kartu pilar + ikon | Scroll | `Stagger` 4 kartu. **Nada tenang** — durasi `base`, jarak kecil. Keamanan = kalem, bukan flashy |
| 7 | **Cara Kerja** | 4 langkah + garis penghubung | Scroll | Langkah reveal berurutan (`Stagger`); garis SVG penghubung "menggambar" (`pathLength` 0→1) |
| 8 | **Untuk Admin** | mockup dashboard, poin kemampuan | Scroll | Chart bar tumbuh (Recharts sudah animasi bawaan); poin `Stagger`. Trigger sekali saat terlihat |
| 9 | **FAQ** | item accordion | Scroll + klik | Item `Reveal` saat masuk; expand/collapse via `AnimatePresence` (§5) |
| 10 | **Penutup/CTA** | judul + CTA | Scroll | `Reveal` judul + subteks; CTA primary glow halus (sekali, jangan pulse loop) |
| 11 | **Footer** | kolom tautan | Scroll | `Reveal` lembut saja (jarak `reveal-sm`). Footer tak perlu "wah" |

**Contoh — Section 3 (Tiga Pintu):**

```tsx
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

<Stagger className="grid gap-6 md:grid-cols-3">
  {pintu.map((p) => (
    <StaggerItem key={p.id}>
      <PintuCard {...p} /> {/* kartu pakai whileHover y:-4 internal */}
    </StaggerItem>
  ))}
</Stagger>
```

**Animasi "menggambar" garis (Section 7):**

```tsx
<motion.path
  d="M ..."
  initial={{ pathLength: 0 }}
  whileInView={{ pathLength: 1 }}
  viewport={{ once: true }}
  transition={{ duration: DUR.slow, ease: EASE.out }}
/>
```

### 6.4 Transisi antar-halaman app (`template.tsx`)

Untuk halaman aplikasi (bukan landing), ganti pola `.animate-in` lama dengan template
App Router yang re-mount tiap navigasi:

```tsx
// web/src/app/(app)/template.tsx
"use client";
import { motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 7. Reduced Motion (non-negotiable)

Setara `style.md` §11 — **wajib di setiap animasi.** Tiga lapis pertahanan:

1. **Global Motion:** `<MotionConfig reducedMotion="user">` (§3) — otomatis mematikan
   gerak transform/layout bila OS user minta, tetap izinkan opacity.
2. **Per-komponen:** hook `useReducedMotion()` → render varian statis (lihat `<Reveal>`
   di §4 yang langsung mengembalikan `<div>` polos).
3. **CSS fallback** (untuk animasi non-Motion / `.animate-in` lama) — tambahkan ke
   `web/src/app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

> **Aturan emas:** dengan reduced-motion aktif, semua konten harus **tetap muncul &
> terbaca** — cuma tanpa gerak. Jangan sampai elemen yang `initial: opacity 0`
> "tersangkut" tak terlihat. Itulah kenapa `<Reveal>` mengembalikan div polos, bukan
> sekadar mempercepat animasi.

---

## 8. Performa (wajib diperhatikan)

- **Hanya `transform` & `opacity`.** Keduanya GPU-composited. Hindari menganimasikan
  `width/height/top/left/margin/padding` → memicu reflow, patah-patah di mobile.
  (Pengecualian terkelola: `height: auto` via Motion untuk accordion, §5.)
- **`viewport={{ once: true }}`** di semua scroll-reveal → observer lepas setelah jalan,
  hemat & tidak re-trigger saat scroll bolak-balik.
- **Stagger, jangan serempak.** 12 kartu fade bersamaan = berat & kacau. Stagger 0.06–0.08s
  ringan & lebih elegan.
- **Bundle (opsional):** untuk menekan ukuran Motion, pakai `LazyMotion` + `domAnimation`
  features dan komponen `m.*` alih-alih `motion.*`. Tidak wajib untuk pilot, tapi catat.
- **Mobile lebih hemat.** Kurangi parallax & jarak geser di layar kecil; baterai & GPU
  lebih terbatas. Cek `style.md` breakpoints.
- **Ambient loop harus murah.** Blob hero yang drift = 1 elemen, transform saja, durasi
  panjang (8–12s), `ease: linear`/`mirror`. Jangan banyak elemen loop bersamaan.

---

## 9. Anti-pattern (Jangan)

Sejajar gaya "Jangan" di `style.md`:

- ❌ **Animasi layout** (`width`, `height`, `top`, `margin`) → pakai `transform`.
- ❌ **Reveal yang fire berulang** tiap kali elemen masuk-keluar viewport → `once: true`.
- ❌ **Loop mencolok di konten** (teks/kartu berdenyut terus) → distraksi. Loop hanya
  dekorasi ambient super halus.
- ❌ **Delay panjang sebelum konten muncul** (>0.6s) → user merasa app lambat.
- ❌ **Geser jarak jauh** (>32px) atau **zoom besar** → mengganggu keterbacaan.
- ❌ **Spring terlalu bouncy** (overshoot besar) → terasa mainan, bukan produk korporat.
- ❌ **Parallax berlebihan** → motion sickness.
- ❌ **Lupa reduced-motion** → pelanggaran aksesibilitas, sama seriusnya dengan kontras buruk.
- ❌ **Animasi sebagai pengganti hierarki.** Kalau butuh animasi agar user "ngeh" suatu
  elemen, mungkin layout/kontrasnya yang kurang (perbaiki di `style.md` dulu).

---

## 10. Cheat Sheet

| Kebutuhan | Pakai |
|---|---|
| Reveal section saat scroll | `<Reveal>` (fadeUp, `once`, amount 0.25) |
| Sekuens banyak kartu/list | `<Stagger>` + `<StaggerItem>` (stagger 0.07) |
| Hover tombol/kartu | `whileHover={{ y: -2/-4 }}` + `whileTap` (dur `fast`) |
| Buka/tutup (FAQ, drawer, modal) | `<AnimatePresence>` + `height:auto`/`x`/scale |
| Parallax hero | `useScroll` + `useTransform` (rasio < 25%) |
| Garis "menggambar" | `motion.path` + `pathLength` 0→1 |
| Transisi antar halaman app | `(app)/template.tsx` (fade-up `base`) |
| Matikan untuk aksesibilitas | `<MotionConfig reducedMotion="user">` + `useReducedMotion()` + CSS media query |

| Token | Nilai default |
|---|---|
| Durasi mikro / reveal / hero | `0.15s` / `0.4s` / `0.6s` |
| Easing default / entrance / exit | `[0.4,0,0.2,1]` / `[0.16,1,0.3,1]` / `[0.4,0,1,1]` |
| Jarak geser reveal | 16px (kartu) · 24px (hero) · 8px (teks) |
| Stagger antar anak | 0.06–0.08s |
| Properti yang boleh dianimasi | **`transform` & `opacity` saja** |

---

## 11. Urutan Implementasi (saran)

Bangun bertahap, sama seperti `CLAUDE.md` §11:

1. `npm install motion` + buat `lib/motion.ts` (token + variants) & `MotionProvider`.
2. Pasang `MotionProvider` + tambah CSS reduced-motion ke `globals.css`.
3. Buat komponen reusable: `<Reveal>`, `<Stagger>`/`<StaggerItem>`, `LiftButton`.
4. Terapkan ke landing page **section per section** (mulai Hero → bawah), uji tiap section.
5. Tambah `(app)/template.tsx` untuk transisi halaman app (ganti `.animate-in` lama).
6. **Uji reduced-motion**: aktifkan di OS → pastikan semua konten tetap muncul & terbaca.
7. Cek performa di mobile (throttle CPU di DevTools) — pastikan 60fps, tidak ada reflow.

> Setelah tiap section, berhenti & review — jangan animasikan semua sekaligus lalu
> kaget kalau terasa "ramai". Animasi paling bagus justru yang nyaris tak disadari.
