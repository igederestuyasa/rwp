# RWP Hutama Karya

Aplikasi web internal PT Hutama Karya (Persero) untuk **Respectful Workplace Policy**:
membaca kebijakan, melaporkan insiden secara rahasia, melacak penanganannya, dan
mengakses layanan psikologi perusahaan.

> **Status: pilot internal.** Belum dirancang untuk menampung laporan asli
> berskala besar. Lihat [Sebelum dipakai sungguhan](#sebelum-dipakai-sungguhan).

---

## Apa yang ada di dalamnya

| Untuk | Fitur |
|---|---|
| Karyawan | Baca handbook RWP · Lapor insiden (bisa anonim, boleh lampirkan bukti) · Lacak status & chat dengan admin · Tanya asisten AI (Sahabat RWP) · 6 kanal Layanan Psikologi |
| Admin RWP | Dashboard (status, tren, kategori insiden, proporsi anonim) · Daftar laporan · Ubah status 2 tahap + lampiran · Balas pelapor · Kelola isi halaman Kebijakan di `/kelola-kebijakan` (tambah, ubah, draft/terbit, PDF) dan memantaunya lewat menu Kebijakan RWP · Kelola korpus asisten di `/korpus` |
| Admin Superior | Semua di atas + eskalasi identitas pelapor anonim (teraudit) + unduh laporan periodik PDF/Excel |

**Prinsip yang tidak dikompromikan** (detail di `CLAUDE.md` §9):
identitas pelapor terpisah dari isi laporan · RLS di level database, bukan cuma UI ·
asisten AI tidak pernah menyentuh data laporan · unggahan divalidasi ekstensi, ukuran,
dan magic byte · rahasia tidak pernah masuk git.

---

## Teknologi

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth +
Storage + pgvector) · OpenAI (`gpt-4.1-mini` + `text-embedding-3-small`) ·
Recharts · Phosphor Icons · zod.

Aplikasi berjalan **dua mode** lewat flag `NEXT_PUBLIC_USE_MOCK`:

- `true` → data mock di memori. Tidak butuh backend maupun internet. Ini mode demo.
- selain `true` (termasuk kosong) → Supabase live (auth, laporan, chat, berkas,
  eskalasi semuanya nyata).

---

## Struktur folder

```
src/app/                 ← route (App Router); (app)/ = halaman setelah masuk, api/ = Route Handler
src/components/          ← komponen UI (ui/ primitif, hc/ sistem HC Panel)
src/lib/                 ← data layer, konstanta, tipe, auth, store, chunker korpus
supabase/                ← database (petunjuk lengkap: supabase/README.md)
  migrations/            ← SATU berkas: seluruh skema
  seeds/                 ← isi demo (jangan dipakai di lingkungan produksi)
scripts/                 ← skrip uji koneksi/login/eskalasi, kalibrasi RAG, impor akun
  corpus/                ← dokumen cara-pakai untuk korpus asisten (diunggah lewat /korpus)
docs/DESIGN.md           ← sistem UI "HC Panel" (acuan semua perubahan tampilan)
docs/embedding.md        ← praktik retrieval RAG & kalibrasi MIN_SIMILARITY
docs/handbook-rwp-asli.md← handbook RWP mentah (sumber seed policies)
docs/deck-pitch.md       ← bahan presentasi
jalankan.bat             ← Windows: npm run dev
jalankan-prod.bat        ← Windows: npm run build && npm run start
```

Dokumen panduan untuk agen AI: `CLAUDE.md` (arsitektur, aturan keamanan, utang
teknis) dan `AGENTS.md`.

---

## Setup dari nol

### 1. Prasyarat

Node.js 20+ (disarankan 24 LTS), akun Supabase, dan API key OpenAI.

### 2. Pasang dependensi

```bash
npm ci
```

`postinstall` menyalin worker PDF.js ke `public/` — normal, bukan error.

### 3. Jalan cepat tanpa backend (mode demo)

```bash
cp .env.local.example .env.local     # biarkan NEXT_PUBLIC_USE_MOCK=true
npm run dev                          # http://localhost:3000
```

Tombol demo di halaman masuk: **Karyawan**, **Admin RWP**, **Admin Superior**.
Cukup untuk melihat seluruh alur tanpa menyiapkan apa pun.

### 4. Menyalakan Supabase

Buat project Supabase baru, lalu jalankan SQL di `supabase/` **berurutan**.
Detail dua cara (SQL Editor atau Supabase CLI) dan cara menangani database
yang sudah ada: [`supabase/README.md`](supabase/README.md).

| Urutan | Berkas | Isi |
|---|---|---|
| 1 | `supabase/migrations/20260916000000_skema_rwp.sql` | Seluruh skema: tabel, RLS, view admin, RPC, bucket storage |
| 2 | *(Dashboard)* buat 3 akun Auth demo | *Authentication → Users*, centang **Auto Confirm User** |
| 3 | `supabase/seeds/01_users_demo.sql` | Profil 3 akun demo (menautkan ke akun Auth di langkah 2) |
| 4 | `supabase/seeds/02_policies.sql` | Isi halaman Kebijakan (handbook RWP) |

Nomor 1 adalah **migrasi** (dijalankan di semua lingkungan). Nomor 3–4 adalah
**seed** (isi demo — jangan dijalankan di lingkungan yang menampung laporan asli).

Akun demo untuk langkah 2:

| Email | Peran | Sandi demo |
|---|---|---|
| `budi@hutamakarya.co.id` | karyawan | `Password123!` |
| `admin.rwp@hutamakarya.co.id` | admin RWP | `Password123!` |
| `admin@hutamakarya.co.id` | admin superior | `Password123!` |

Lalu isi `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co     # tanpa /rest/v1/
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-only; dipakai /api/policy-pdf dan skrip di scripts/
OPENAI_API_KEY=...
NEXT_PUBLIC_USE_MOCK=false
```

Verifikasi:

```bash
node scripts/test-connection.mjs    # semua tabel ada & RLS aktif
node scripts/test-login.mjs         # alur masuk + ambil profil
node scripts/test-escalation.mjs    # karyawan DITOLAK, superior BERHASIL
```

### 5. Mengisi halaman Kebijakan

Isi `/kebijakan` dikelola admin dari **halaman `/kelola-kebijakan`** (menu
**Kelola Kebijakan**): tambah dokumen, tulis isinya dalam Markdown atau pasang
PDF (dibaca karyawan lewat penampil berwatermark), atur urutan, lalu
**Terbitkan**. Yang belum terbit tersimpan sebagai draft — karyawan tidak
melihatnya, tetapi admin bisa mempratinjaunya lewat menu **Kebijakan RWP**,
berlabel "Draft". Seed `02_policies.sql` hanya perlu untuk mengisi handbook awal.

### 6. Menyalakan asisten (RAG)

Pengetahuan asisten dikelola dari **halaman admin `/korpus`** — tanpa terminal:

1. Masuk sebagai admin, buka **Korpus AI** di menu.
2. Tekan **Kirim ke korpus** pada kebijakan yang sudah terbit — isinya dipelajari
   asisten langsung dari baris yang sama yang dibaca karyawan di `/kebijakan`.
3. Unggah dokumen cara-pakai `.md`/`.txt` (yang ikut repo ada di
   `scripts/corpus/`), lalu tekan **Proses**. Progresnya tampil per dokumen.
4. Hapus atau proses ulang dokumen kapan saja dari panel detailnya.

Semua itu berjalan sebagai admin yang login lewat RLS, bukan `service_role`, jadi
route API-nya tidak bisa dipakai karyawan meski dipanggil langsung. PDF belum
bisa diunggah ke korpus — konversi dulu ke `.md`.

**Setelah korpus berubah**, jalankan sekali dari terminal:

```bash
node scripts/diagnose-retrieval.mjs   # ukur sebaran skor
```

Langkah ini **bukan formalitas**: keluarannya merekomendasikan nilai
`MIN_SIMILARITY` untuk `src/app/api/asisten/route.ts`. Ambang yang sekarang
dikalibrasi untuk korpus lama dan hampir pasti perlu digeser. Jangan pakai angka
"0.70–0.80" yang beredar umum — di setup ini terbukti salah. Latar metodenya di
`docs/embedding.md`.

### 7. Akun tambahan (opsional)

- `node scripts/add-demo-users.mjs` — 40 akun karyawan demo (daftar di
  `scripts/demo-accounts.md`). Hapus sebelum go-live.
- `node scripts/import-users-csv.mjs` — impor karyawan dari CSV; sandi
  dibangkitkan per akun ke `scripts/credentials-output.csv` (gitignored —
  hapus setelah didistribusikan).

Keduanya memakai `SUPABASE_SERVICE_ROLE_KEY`.

---

## Perintah harian

```bash
npm run dev              # server pengembangan (Windows: jalankan.bat)
npx tsc --noEmit         # type check
npx eslint src           # lint — baseline 0 error, 0 warning; CI menggagalkan build bila bertambah
npm run build            # build produksi (Windows: jalankan-prod.bat = build + start)
```

---

## Deploy ke Vercel

Urutannya sengaja: **deploy dulu, baru migrasi, baru uji.** Aplikasi tetap bisa
di-build sebelum databasenya ada, tapi tidak bisa diuji tanpa skema.

### 1. Import repo

Aplikasi Next.js ada langsung di root repo (`package.json`, `next.config.ts`,
`vercel.json`), jadi **Root Directory dibiarkan kosong/default**. Vercel akan
mendeteksi **Next.js** sendiri. Build command, output directory, dan install
command biarkan default.

Kalau project Vercel dibuat saat aplikasi masih di folder `web/` (versi lama
repo), buka *Project Settings → General → Root Directory* dan **kosongkan**
nilainya, lalu deploy ulang.

### 2. Isi environment variables

Isikan di *Project Settings → Environment Variables*, untuk **Production dan
Preview**. Daftar lengkap beserta penjelasannya ada di `.env.local.example`.

| Variabel | Nilai |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase (tanpa `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_USE_MOCK` | `false` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key — **server-only, mem-bypass RLS** |
| `OPENAI_API_KEY` | kunci OpenAI untuk asisten |
| `OPENAI_CHAT_MODEL` | `gpt-4.1-mini` |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` |
| `POLICY_PDF_BUCKET` | `policy-docs` |

⚠️ **Variabel `NEXT_PUBLIC_*` dibaca saat BUILD, bukan saat runtime.** Menambah
atau mengubahnya tidak berpengaruh sampai kamu deploy ulang.

`NEXT_PUBLIC_SUPABASE_URL` khususnya ikut menyusun header `Content-Security-Policy`
di `next.config.ts`. Kalau kosong saat build, host Supabase tidak masuk
`connect-src` dan browser memblokir **setiap** permintaan ke database — aplikasi
tampak jalan tapi semua data gagal dimuat. Karena itu build sengaja dihentikan
dengan pesan jelas bila `NEXT_PUBLIC_USE_MOCK` bukan `true` sementara URL-nya
kosong. Kalau build gagal dengan pesan itu, variabelnya memang belum terpasang.

### 3. Jalankan migrasi di Supabase

Ikuti tabel di [Menyalakan Supabase](#4-menyalakan-supabase): satu migrasi,
buat akun Auth demo, lalu dua seed. Seed hanya untuk pilot — **jangan
dijalankan** di lingkungan yang menampung laporan asli.

### 4. Whitelist URL pengalihan

*Authentication → URL Configuration*, tambahkan ke **Redirect URLs**:

```
https://<domain-kamu>/update-password
```

Tanpa ini, tautan reset kata sandi dari email berakhir 404.

### 5. Uji setelah deploy

| Yang diuji | Cara | Lulus kalau |
|---|---|---|
| Koneksi database | Masuk pakai akun demo | Berhasil masuk, tidak menggantung |
| CSP benar | Buka Console browser | Tidak ada error `Refused to connect` |
| RLS jalan | Masuk sebagai karyawan, buka `/laporan` | Hanya laporan sendiri yang tampil |
| Privasi pelapor | Masuk sebagai admin RWP, buka laporan anonim | Nama & NIK pelapor tidak tampil |
| Unggah bukti | Buat laporan dengan lampiran di `/lapor` | Berkas terunggah, bisa diunduh lagi |
| Asisten | Tanya sesuatu di `/asisten` | Menjawab; kalau korpus kosong, menjawab jujur tidak ditemukan |

Asisten baru berguna setelah korpusnya diisi — lihat bagian
[Menyalakan asisten (RAG)](#6-menyalakan-asisten-rag).

---

## Jebakan yang sudah pernah kena

- **Brave Shields memblokir `supabase.co`** → request menggantung. Pakai Chrome, atau matikan Shields untuk localhost.
- **Lupa `npm ci`** → `tsc` melaporkan "Cannot find module 'clsx'" yang menyesatkan.
- **`.next` basi setelah menghapus route** → `tsc` mengeluh soal berkas yang sudah tidak ada. Hapus `.next`.
- **Ganti `OPENAI_EMBED_MODEL`** → wajib proses ulang semua dokumen dari `/korpus`. Dimensi vektor di skema = 1536.
- **Reset kata sandi lewat email** → free tier Supabase dibatasi 2 email/jam, dan URL pengalihan harus di-whitelist di Dashboard.
- **Vercel mendeteksi framework "Other"** → Root Directory masih menunjuk folder yang tidak ada (`web`). Kosongkan Root Directory di *Project Settings → General*; aplikasi kini di root repo.
- **Build gagal: `NEXT_PUBLIC_SUPABASE_URL kosong padahal NEXT_PUBLIC_USE_MOCK bukan "true"`** → environment variables belum dipasang untuk lingkungan yang di-build (Production/Preview). Ini penjaga yang disengaja, bukan bug. Isi variabelnya, deploy ulang.
- **Deploy jalan tapi semua data gagal dimuat** → `NEXT_PUBLIC_SUPABASE_URL` belum ada saat build, jadi host Supabase tidak masuk `connect-src` di CSP. Isi variabelnya lalu deploy ulang.
- **`supabase db push` menolak karena riwayat migrasi tidak cocok** → database dibuat dengan enam migrasi lama. Samakan riwayatnya dengan `supabase migration repair` (lihat `supabase/README.md`); skemanya sendiri sudah sama.

---

## Sebelum dipakai sungguhan

- [ ] Validasi kategori insiden & alur status dengan kebijakan RWP resmi.
- [ ] Tinjauan hukum/compliance untuk penyimpanan PII dan data sensitif.
- [ ] Ganti akun demo dengan SSO atau akun resmi; hapus data demo (`src/lib/demoReports.ts`, `DEMO_USERS` di `mock.ts`, akun dari `scripts/add-demo-users.mjs`).
- [ ] Naikkan Supabase ke tier berbayar: backup, audit log, retensi data.
- [ ] Enkripsi at-rest untuk `reporter_id`.
- [ ] Rate limiting pada halaman masuk.
- [ ] Isi korpus asisten dengan dokumen kebijakan final, lalu kalibrasi ulang `MIN_SIMILARITY`.
