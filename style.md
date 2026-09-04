# Global Style Guide — Design System

> **Apa ini:** sistem desain global yang fleksibel & dapat dipakai ulang di berbagai
> konteks website (landing page, dashboard, form, dll). Bukan untuk satu halaman saja —
> ini **palet & token sumber-kebenaran** yang bisa di-drop ke proyek mana pun.
>
> **Inspirasi:** aesthetic [Specify](https://specifyapp.com) — bersih, premium,
> banyak whitespace, teks near-black di atas base terang, satu aksen vibran + gradient
> halus, tipografi grotesque modern, kesan "developer-tool kelas atas".
>
> **Catatan kejujuran:** token persis dari situs Specify tidak bisa diekstrak (situsnya
> JS-rendered, token-nya privat). Nilai di bawah adalah interpretasi yang menangkap
> *rasa* yang sama — semuanya nilai nyata & siap pakai, bukan placeholder.

---

## 1. Filosofi Desain (4 prinsip)

1. **Clarity over decoration** — whitespace adalah fitur. Biarkan konten bernapas.
2. **One bold accent** — satu warna aksen yang kuat, dipakai hemat. Sisanya netral.
3. **Soft & precise** — sudut membulat lembut, border tipis, bayangan halus. Tidak ada
   efek berat (no heavy drop-shadow, no skeuomorphism).
4. **Consistent rhythm** — semua spacing, radius, dan ukuran font mengikuti skala
   yang sudah ditentukan. Tidak ada angka "asal".

---

## 2. Design Tokens (sumber kebenaran)

> Pakai blok ini sebagai dasar. Semua komponen dibangun dari token ini —
> jangan hardcode hex/ukuran di komponen.

```css
:root {
  /* ─── BRAND / ACCENT ─── */
  --accent:            #5B5BD6;   /* indigo-violet — warna signature */
  --accent-hover:      #4A4AC4;
  --accent-active:     #3D3DB0;
  --accent-soft:       #EEEEFB;   /* bg lembut untuk highlight/chip */
  --accent-contrast:   #FFFFFF;   /* teks di atas accent */

  /* ─── NETRAL (LIGHT) ─── */
  --bg:                #FFFFFF;   /* base paling bawah */
  --bg-subtle:         #FAFAFB;   /* section selang-seling */
  --surface:           #FFFFFF;   /* kartu */
  --surface-elevated:  #F7F7F8;   /* kartu di atas kartu */
  --border:            #ECECEF;   /* garis default */
  --border-strong:     #DADAE0;   /* garis lebih tegas */

  --text:              #0B0B0F;   /* judul / teks utama (near-black) */
  --text-secondary:    #55555F;   /* paragraf */
  --text-muted:        #8A8A97;   /* caption, placeholder */
  --text-inverse:      #FFFFFF;

  /* ─── SEMANTIK (status) ─── */
  --success:           #30A46C;
  --success-soft:      #E7F6EE;
  --warning:           #E5A000;
  --warning-soft:      #FBF3E0;
  --danger:            #E5484D;
  --danger-soft:       #FDECEC;
  --info:              #3B82F6;
  --info-soft:         #E8F1FE;

  /* ─── GRADIENT SIGNATURE ─── */
  --gradient-brand:    linear-gradient(135deg, #5B5BD6 0%, #8A5BD6 50%, #C95BC5 100%);
  --gradient-subtle:   linear-gradient(180deg, #FAFAFB 0%, #FFFFFF 100%);

  /* ─── RADIUS ─── */
  --radius-sm:   6px;
  --radius-md:   10px;   /* default kartu & input */
  --radius-lg:   16px;   /* kartu besar / panel */
  --radius-xl:   24px;   /* hero / section block */
  --radius-full: 9999px; /* pill / avatar */

  /* ─── SHADOW / ELEVATION ─── */
  --shadow-xs: 0 1px 2px rgba(11,11,15,0.04);
  --shadow-sm: 0 1px 3px rgba(11,11,15,0.06), 0 1px 2px rgba(11,11,15,0.04);
  --shadow-md: 0 4px 12px rgba(11,11,15,0.08);
  --shadow-lg: 0 12px 32px rgba(11,11,15,0.10);
  --shadow-accent: 0 8px 24px rgba(91,91,214,0.25); /* glow tombol utama */

  /* ─── SPACING (skala 4px) ─── */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 24px;  --space-6: 32px;  --space-7: 48px;  --space-8: 64px;
  --space-9: 96px;  --space-10: 128px;

  /* ─── TYPOGRAPHY ─── */
  --font-display: "General Sans", "Satoshi", "Inter", system-ui, sans-serif;
  --font-body:    "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono:    "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
}

/* ─── DARK THEME (toggle via .dark di <html>) ─── */
.dark {
  --bg:                #0B0B0F;
  --bg-subtle:         #101016;
  --surface:           #16161C;
  --surface-elevated:  #1E1E26;
  --border:            #26262E;
  --border-strong:     #34343E;

  --text:              #F4F4F6;
  --text-secondary:    #B4B4BE;
  --text-muted:        #76767F;

  --accent:            #7A7AE6;   /* sedikit lebih terang agar kontras di gelap */
  --accent-soft:       #1E1E33;

  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.5);
  --gradient-subtle: linear-gradient(180deg, #101016 0%, #0B0B0F 100%);
}
```

---

## 3. Warna — Cara Pakai

**Aturan 60-30-10:**
- **60%** netral terang (`--bg`, `--bg-subtle`, `--surface`) — dominan.
- **30%** teks & border (`--text`, `--text-secondary`, `--border`).
- **10%** aksen (`--accent` + gradient) — hemat, hanya untuk CTA, link, highlight,
  ikon penting. Jangan tebar di mana-mana.

**Jangan:**
- Pakai lebih dari 1 warna aksen brand dalam satu layar.
- Warna semantik (success/danger) untuk dekorasi — hanya untuk status nyata.
- Teks abu-abu muda (`--text-muted`) untuk paragraf panjang (kontras kurang).

---

## 4. Tipografi

**Pasangan font:**
- **Display/Heading:** General Sans (Fontshare, gratis) — grotesque modern, mirip vibe
  Specify. Alternatif: Satoshi, atau Inter Display.
- **Body:** Inter (Google Fonts, gratis) — netral, sangat terbaca.
- **Mono (aksen dev-tool):** Geist Mono / JetBrains Mono — untuk label kecil, kode,
  angka teknis, eyebrow uppercase.

**Skala tipografi (type scale, rasio ~1.25):**

| Token | Ukuran | Line-height | Weight | Pakai untuk |
|---|---|---|---|---|
| `display` | 56–72px | 1.05 | 600 | Hero headline |
| `h1` | 40px | 1.1 | 600 | Judul halaman |
| `h2` | 32px | 1.15 | 600 | Judul section |
| `h3` | 24px | 1.25 | 600 | Sub-section |
| `h4` | 20px | 1.3 | 500 | Judul kartu |
| `body-lg` | 18px | 1.6 | 400 | Paragraf hero/lead |
| `body` | 16px | 1.6 | 400 | Teks default |
| `body-sm` | 14px | 1.5 | 400 | Caption, meta |
| `eyebrow` | 13px | 1.4 | 500 | Label uppercase, tracking +0.08em, mono |

**Aturan:**
- Heading: `letter-spacing: -0.02em` (grotesque modern terlihat lebih rapat & premium).
- Body: `letter-spacing: 0`, line-height longgar (1.6) untuk keterbacaan.
- Lebar baris paragraf maksimal **~70 karakter** (`max-width: 65ch`).
- Eyebrow/label kecil: uppercase + font mono + warna `--accent` atau `--text-muted`.

---

## 5. Spacing & Layout

- **Skala 4px** — semua margin/padding kelipatan 4 (pakai `--space-*`). Jangan 13px, 27px.
- **Section padding vertikal:** `--space-9` (96px) di desktop, `--space-7` (48px) di mobile.
- **Container max-width:** 1200px, dengan padding samping `--space-5` (24px).
- **Grid:** 12 kolom, gutter `--space-5` (24px).
- **Gap antar kartu:** `--space-5` (24px).

**Breakpoints:**
| Nama | Lebar |
|---|---|
| mobile | < 640px |
| tablet | 640–1024px |
| desktop | > 1024px |
| wide | > 1280px |

---

## 6. Border Radius & Elevation

- **Input, tombol, kartu kecil:** `--radius-md` (10px).
- **Kartu besar, panel:** `--radius-lg` (16px).
- **Hero block, section terbungkus:** `--radius-xl` (24px).
- **Pill, avatar, badge:** `--radius-full`.

**Elevation (kapan pakai shadow apa):**
- Kartu diam (resting): `--shadow-sm`.
- Kartu hover / dropdown / popover: `--shadow-md`.
- Modal / panel mengambang: `--shadow-lg`.
- Tombol utama (opsional glow): `--shadow-accent`.
- **Default: minim shadow.** Lebih sering pakai border tipis (`--border`) daripada
  bayangan. Bayangan hanya untuk elemen yang benar-benar "mengambang".

---

## 7. Komponen (dibangun dari token)

### Tombol

```css
/* Primary — aksi utama, 1 per layar idealnya */
.btn-primary {
  background: var(--accent);
  color: var(--accent-contrast);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  font: 500 16px/1 var(--font-body);
  box-shadow: var(--shadow-accent);
  transition: background .15s ease, transform .15s ease;
}
.btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
.btn-primary:active { background: var(--accent-active); transform: translateY(0); }

/* Secondary — aksi pendukung */
.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 12px 20px;
}
.btn-secondary:hover { background: var(--surface-elevated); }

/* Ghost — aksi tersier / link-like */
.btn-ghost {
  background: transparent;
  color: var(--accent);
  padding: 12px 16px;
}
.btn-ghost:hover { background: var(--accent-soft); }
```

- Ukuran: tinggi default 44px (sm: 36px, lg: 52px).
- Selalu ada state: default / hover / active / focus-visible / disabled.
- `focus-visible`: outline 2px `--accent` + offset 2px (aksesibilitas, jangan dihapus).

### Kartu

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  transition: box-shadow .2s ease, border-color .2s ease;
}
.card:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
```

### Input / Form Field

```css
.input {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  font: 400 16px/1.4 var(--font-body);
  color: var(--text);
}
.input::placeholder { color: var(--text-muted); }
.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
```

- Label di atas input, `body-sm` + weight 500.
- Pesan error: `--danger`, `body-sm`, di bawah input.

### Badge / Chip

```css
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--radius-full);
  padding: 4px 12px;
  font: 500 13px/1 var(--font-body);
}
```

- Varian status: pakai pasangan `--success`/`--success-soft`, dst.

---

## 8. Iconography

- **Library:** [Lucide](https://lucide.dev) (garis, stroke 1.5–2px) — konsisten dengan
  aesthetic bersih. Hindari mencampur ikon filled & outline.
- Ukuran default: 20px (inline teks), 24px (tombol/nav), 16px (caption).
- Warna ikut `currentColor` — ikut warna teks di sekitarnya. Ikon penting boleh `--accent`.

---

## 9. Motion / Transisi

- **Durasi:** 150ms (mikro: hover, focus), 200–300ms (kartu, panel), 400ms (masuk halaman).
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out-ish) untuk hampir semua.
- **Hover lift:** `translateY(-1px sampai -2px)` + naik shadow — halus, jangan berlebihan.
- **Hormati `prefers-reduced-motion`** — matikan animasi non-esensial.
- Prinsip: animasi memandu perhatian, bukan pamer. Cepat & halus > lambat & mencolok.

---

## 10. Gradient & Aksen Visual (hemat!)

- **Gradient brand** (`--gradient-brand`) hanya untuk: hero background blob, 1 kartu
  unggulan, atau teks display (background-clip). **Maksimal 1–2 per halaman.**
- **Dot-grid / pattern halus** sebagai dekorasi hero (opacity rendah, `--border`).
- **Glow** (`--shadow-accent`) hanya di tombol utama atau elemen fokus.
- Jangan: gradient di setiap kartu, teks gradient di mana-mana, neon. Itu murahin kesan.

---

## 11. Aksesibilitas (non-negotiable)

- Kontras teks: minimal **4.5:1** untuk body, **3:1** untuk teks besar (cek `--text-muted`).
- `focus-visible` selalu terlihat (outline aksen) — jangan `outline: none` tanpa pengganti.
- Target sentuh minimal **44×44px**.
- Semua warna semantik diberi **ikon/teks pendamping** — jangan andalkan warna saja.

---

## 12. Cara Pakai Ulang di Konteks Berbeda

Style ini **agnostik konteks**. Untuk adaptasi:

1. **Ganti `--accent`** → ganti satu variabel, seluruh brand ikut berubah. (Mis. proyek
   lain: ubah ke teal `#2DB7A3` atau biru `#3B82F6`.)
2. **Token tetap, komponen tetap** — landing page, dashboard, app form semua pakai token
   yang sama. Yang beda hanya komposisi/layout.
3. **Tailwind v4:** map token ini ke `@theme` di `globals.css`:
   ```css
   @theme {
     --color-accent: var(--accent);
     --color-surface: var(--surface);
     --radius-md: 10px;
     /* dst — lalu pakai bg-accent, text-surface, rounded-md di markup */
   }
   ```
4. **Dark mode** sudah built-in via `.dark` — tinggal toggle class di `<html>`.

---

## Ringkasan Cepat (cheat sheet)

| Aspek | Nilai |
|---|---|
| Aksen utama | `#5B5BD6` (indigo-violet) |
| Base terang | `#FFFFFF` / `#FAFAFB` |
| Teks utama | `#0B0B0F` |
| Font heading | General Sans / Satoshi |
| Font body | Inter |
| Radius default | 10px (kartu besar 16px) |
| Spacing | kelipatan 4px |
| Shadow | minim — utamakan border tipis |
| Aturan warna | 60 netral / 30 teks / 10 aksen |
| Gradient | maks 1–2 per halaman |
