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
| Karyawan | Baca handbook RWP · Lapor insiden (bisa anonim, boleh lampirkan bukti) · Lacak status & chat dengan admin · Tanya asisten AI · 6 kanal Layanan Psikologi |
| Admin RWP | Dashboard (status, tren, kategori insiden, proporsi anonim) · Daftar laporan · Ubah status 2 tahap + lampiran · Balas pelapor |
| Admin Superior | Semua di atas + eskalasi identitas pelapor anonim (teraudit) + unduh laporan periodik PDF/Excel |

**Prinsip yang tidak dikompromikan** (detail di `CLAUDE.md` §9):
identitas pelapor terpisah dari isi laporan · RLS di level database, bukan cuma UI ·
asisten AI tidak pernah menyentuh data laporan · unggahan divalidasi ekstensi, ukuran,
dan magic byte · rahasia tidak pernah masuk git.

---

## Teknologi

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth +
Storage + pgvector) · OpenAI (`gpt-4.1-mini` + `text-embedding-3-small`) ·
Recharts · lucide-react.

Aplikasi berjalan **dua mode** lewat flag `NEXT_PUBLIC_USE_MOCK`:

- `true` → data mock di memori. Tidak butuh backend maupun internet. Ini mode demo.
- `false` → Supabase live (auth, laporan, chat, berkas, eskalasi semuanya nyata).

---

## Struktur folder

```
web/                     ← aplikasi (satu-satunya yang dijalankan)
  src/app/               ← route (App Router)
  src/components/        ← komponen UI (ui/ primitif, hc/ sistem HC Panel)
  src/lib/               ← data layer, konstanta, tipe, auth, store
  supabase/              ← database
    migrations/          ← perubahan skema, berurutan
    seeds/               ← isi demo (jangan dipakai di lingkungan produksi)
  scripts/               ← ingest RAG & skrip uji
    corpus/              ← sumber dokumen korpus RAG (ikut di-commit)
    docs/                ← korpus siap ingest (gitignored, dibangun skrip)
  vercel.json            ← menegaskan framework Next.js ke Vercel
docs/DESIGN.md           ← sistem UI "HC Panel" (acuan semua perubahan tampilan)
docs/embedding.md        ← praktik retrieval RAG & kalibrasi MIN_SIMILARITY
file-file-embedding/     ← dokumen sumber mentah (handbook RWP asli)
deck-pitch.md            ← bahan presentasi
```

---

## Setup dari nol

### 1. Prasyarat

Node.js 20+ (disarankan 24 LTS), akun Supabase, dan API key OpenAI.

### 2. Pasang dependensi

```bash
cd web
npm ci
```

### 3. Jalan cepat tanpa backend (mode demo)

```bash
cp .env.local.example .env.local     # biarkan NEXT_PUBLIC_USE_MOCK=true
npm run dev                          # http://localhost:3000
```

Tombol demo di halaman masuk: **Karyawan**, **Admin RWP**, **Admin Superior**.
Cukup untuk melihat seluruh alur tanpa menyiapkan apa pun.

### 4. Menyalakan Supabase

Buat project Supabase baru, lalu jalankan SQL di `web/supabase/` secara
**berurutan** — lewat `supabase db push` atau tempel manual di **SQL Editor**.
Petunjuk lengkap beserta cara menambah perubahan skema berikutnya ada di
[`web/supabase/README.md`](web/supabase/README.md).

| Urutan | Berkas | Isi |
|---|---|---|
| 1 | `web/supabase/migrations/20260101000100_baseline_schema.sql` | Semua tabel, trigger, RLS, view admin, dan RPC |
| 2 | `web/supabase/migrations/20260101000200_storage_buckets.sql` | Bucket `rwp-evidence` & `policy-docs` + batas ukuran/MIME |
| 3 | `web/supabase/migrations/20260101000300_korpus_admin.sql` | Tabel `corpus_documents` + izin tulis admin untuk korpus AI |
| 4 | `web/supabase/migrations/20260101000400_rag_chunk_index.sql` | Kolom `chunk_index` supaya isi korpus bisa dibaca urut |
| 5 | `web/supabase/migrations/20260101000500_pengerasan_rls.sql` | Hasil audit: tutup celah RLS `users`/`reports`/bucket bukti |
| 6 | `web/supabase/migrations/20260101000600_indeks_dan_policy.sql` | Indeks yang hilang + policy tabel anak lewat helper definer |
| 7 | `web/supabase/seeds/01_users_demo.sql` | Profil 3 akun demo |
| 8 | `web/supabase/seeds/02_policies.sql` | Isi halaman Kebijakan (handbook RWP) |

Dua yang pertama adalah **migrasi** (mengubah bentuk database, dijalankan di
semua lingkungan). Dua terakhir adalah **seed** (isi demo — jangan dijalankan di
lingkungan yang menampung laporan asli).

**Sebelum menjalankan nomor 3**, buat dulu akun Auth-nya di
*Dashboard → Authentication → Users* (centang **Auto Confirm User**):

| Email | Peran | Sandi demo |
|---|---|---|
| `budi@hutamakarya.co.id` | karyawan | `Password123!` |
| `admin.rwp@hutamakarya.co.id` | admin RWP | `Password123!` |
| `admin@hutamakarya.co.id` | admin superior | `Password123!` |

Lalu isi `web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co     # tanpa /rest/v1/
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-only, dipakai skrip ingest
OPENAI_API_KEY=...
NEXT_PUBLIC_USE_MOCK=false
```

Verifikasi:

```bash
node scripts/test-connection.mjs    # semua tabel ada & RLS aktif
node scripts/test-login.mjs         # alur masuk + ambil profil
node scripts/test-escalation.mjs    # karyawan DITOLAK, superior BERHASIL
```

### 5. Menyalakan asisten (RAG)

Pengetahuan asisten dikelola dari **halaman admin `/korpus`** — tanpa terminal:

1. Masuk sebagai admin, buka **Korpus AI** di menu.
2. Tekan **Kirim ke korpus** pada kebijakan yang sudah terbit — isinya dipelajari
   asisten langsung dari baris yang sama yang dibaca karyawan di `/kebijakan`.
3. Unggah dokumen cara-pakai `.md`/`.txt` (yang ikut repo ada di
   `web/scripts/corpus/`), lalu tekan **Proses**. Progresnya tampil per dokumen.
4. Hapus atau proses ulang dokumen kapan saja dari panel detailnya.

Semua itu berjalan sebagai admin yang login lewat RLS, bukan `service_role`, jadi
route API-nya tidak bisa dipakai karyawan meski dipanggil langsung.

**Setelah korpus berubah**, jalankan sekali dari terminal:

```bash
cd web && node scripts/diagnose-retrieval.mjs   # ukur sebaran skor
```

Langkah ini **bukan formalitas**: keluarannya merekomendasikan nilai
`MIN_SIMILARITY` untuk `web/src/app/api/asisten/route.ts`. Ambang yang sekarang
dikalibrasi untuk korpus lama dan hampir pasti perlu digeser. Jangan pakai angka
"0.70–0.80" yang beredar umum — di setup ini terbukti salah. Latar metodenya di
`docs/embedding.md`.

Skrip lama `build-corpus.mjs` dan `ingest.mjs --clear` masih ada sebagai cadangan
dan menghasilkan chunk yang identik dengan jalur UI. PDF belum bisa diunggah ke
korpus — konversi dulu ke `.md`.

---

## Perintah harian

```bash
cd web
npm run dev              # server pengembangan
npx tsc --noEmit         # type check
npx eslint src           # lint
npm run build            # build produksi
```

---

## Deploy ke Vercel

Urutannya sengaja: **deploy dulu, baru migrasi, baru uji.** Aplikasi tetap bisa
di-build sebelum databasenya ada, tapi tidak bisa diuji tanpa skema.

### 1. Import repo

**Root Directory WAJIB diisi `web`.**

Ini bukan opsional dan bukan sekadar kerapian. Vercel mendeteksi framework dengan
memindai Root Directory, sementara root repo ini tidak punya `package.json` —
aplikasinya ada di `web/`. Kalau dibiarkan default, Vercel melaporkan framework
**"Other"**, tidak menjalankan build Next.js, dan hasilnya gagal atau kosong.
Begitu Root Directory diisi `web`, framework langsung terbaca **Next.js**.

Build command, output directory, dan install command biarkan default.

### 2. Isi environment variables

Isikan di *Project Settings → Environment Variables*, untuk **Production dan
Preview**. Daftar lengkap beserta penjelasannya ada di `web/.env.local.example`.

| Variabel | Nilai |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase (tanpa `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_USE_MOCK` | `false` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key — **server-only, mem-bypass RLS** |
| `OPENAI_API_KEY` | kunci OpenAI untuk asisten |
| `OPENAI_CHAT_MODEL` | `gpt-4.1-mini` |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` |
| `SUPABASE_STORAGE_BUCKET` | `rwp-evidence` |
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

Lihat [`web/supabase/README.md`](web/supabase/README.md) untuk langkah lengkapnya.
Ringkasnya, berurutan:

1. `migrations/20260101000100_baseline_schema.sql`
2. `migrations/20260101000200_storage_buckets.sql`
3. `migrations/20260101000300_korpus_admin.sql`
4. `migrations/20260101000400_rag_chunk_index.sql`
5. `migrations/20260101000500_pengerasan_rls.sql`
6. `migrations/20260101000600_indeks_dan_policy.sql`
7. Buat 3 akun Auth demo di *Authentication → Users* (centang **Auto Confirm User**)
8. `seeds/01_users_demo.sql`
9. `seeds/02_policies.sql`

Seed nomor 4 dan 5 hanya untuk pilot. **Jangan dijalankan** di lingkungan yang
menampung laporan asli — akun demo bukan untuk produksi.

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

Asisten baru berguna setelah korpusnya di-ingest — lihat bagian
[Menyalakan asisten (RAG)](#5-menyalakan-asisten-rag).

---

## Jebakan yang sudah pernah kena

- **Brave Shields memblokir `supabase.co`** → request menggantung. Pakai Chrome, atau matikan Shields untuk localhost.
- **Lupa `npm ci`** → `tsc` melaporkan "Cannot find module 'clsx'" yang menyesatkan.
- **`.next` basi setelah menghapus route** → `tsc` mengeluh soal berkas yang sudah tidak ada. Hapus `.next`.
- **Ganti `OPENAI_EMBED_MODEL`** → wajib ingest ulang semua dokumen. Dimensi vektor di skema = 1536.
- **Reset kata sandi lewat email** → free tier Supabase dibatasi 2 email/jam, dan URL pengalihan harus di-whitelist di Dashboard.
- **Vercel mendeteksi framework "Other"** → Root Directory belum diisi `web`. Root repo tidak punya `package.json`, jadi Vercel tidak menemukan Next.js.
- **Deploy jalan tapi semua data gagal dimuat** → `NEXT_PUBLIC_SUPABASE_URL` belum ada saat build, jadi host Supabase tidak masuk `connect-src` di CSP. Isi variabelnya lalu deploy ulang.

---

## Sebelum dipakai sungguhan

- [ ] Validasi kategori insiden & alur status dengan kebijakan RWP resmi.
- [ ] Tinjauan hukum/compliance untuk penyimpanan PII dan data sensitif.
- [ ] Ganti akun demo dengan SSO atau akun resmi; hapus data demo (`web/src/lib/demoReports.ts`, `DEMO_USERS` di `mock.ts`).
- [ ] Naikkan Supabase ke tier berbayar: backup, audit log, retensi data.
- [ ] Enkripsi at-rest untuk `reporter_id`.
- [ ] Rate limiting pada halaman masuk.
- [ ] Isi korpus asisten dengan dokumen kebijakan final.
