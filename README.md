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
  src/components/        ← komponen UI
  src/lib/               ← data layer, konstanta, tipe, auth, store
  scripts/               ← SQL setup, ingest RAG, skrip uji
    corpus/              ← sumber dokumen korpus RAG (ikut di-commit)
    docs/                ← korpus siap ingest (gitignored, dibangun skrip)
file-file-embedding/     ← dokumen sumber mentah (handbook RWP asli)
style.md, animation.md   ← panduan desain & motion
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

Buat project Supabase baru, lalu jalankan empat berkas SQL di **SQL Editor**
secara **berurutan**:

| Urutan | Berkas | Isi |
|---|---|---|
| 1 | `web/scripts/01_schema.sql` | Semua tabel, trigger, RLS, view admin, dan RPC |
| 2 | `web/scripts/02_storage.sql` | Bucket `rwp-evidence` & `policy-docs` + batas ukuran/MIME |
| 3 | `web/scripts/03_seed_users.sql` | Profil 3 akun demo |
| 4 | `web/scripts/04_seed_policies.sql` | Isi halaman Kebijakan (handbook RWP) |

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

```bash
cd web
node scripts/build-corpus.mjs       # susun scripts/docs/ dari sumber di repo
node scripts/ingest.mjs --clear     # potong → embed → simpan ke rag_chunks
node scripts/diagnose-retrieval.mjs # ukur sebaran skor
```

Langkah terakhir **bukan formalitas**: keluarannya merekomendasikan nilai
`MIN_SIMILARITY` untuk `web/src/app/api/asisten/route.ts`. Ambang yang sekarang
dikalibrasi untuk korpus lama dan hampir pasti perlu digeser. Jangan pakai angka
"0.70–0.80" yang beredar umum — di setup ini terbukti salah.

Menambah dokumen sendiri: taruh `.txt`/`.md` di `web/scripts/docs/` lalu ulangi
ingest. PDF/DOCX harus dikonversi dulu. Dokumen cara-pakai yang ikut repo ada di
`web/scripts/corpus/`; dokumen sensitif jangan di-commit.

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

## Jebakan yang sudah pernah kena

- **Brave Shields memblokir `supabase.co`** → request menggantung. Pakai Chrome, atau matikan Shields untuk localhost.
- **Lupa `npm ci`** → `tsc` melaporkan "Cannot find module 'clsx'" yang menyesatkan.
- **`.next` basi setelah menghapus route** → `tsc` mengeluh soal berkas yang sudah tidak ada. Hapus `.next`.
- **Ganti `OPENAI_EMBED_MODEL`** → wajib ingest ulang semua dokumen. Dimensi vektor di skema = 1536.
- **Reset kata sandi lewat email** → free tier Supabase dibatasi 2 email/jam, dan URL pengalihan harus di-whitelist di Dashboard.

---

## Sebelum dipakai sungguhan

- [ ] Validasi kategori insiden & alur status dengan kebijakan RWP resmi.
- [ ] Tinjauan hukum/compliance untuk penyimpanan PII dan data sensitif.
- [ ] Ganti akun demo dengan SSO atau akun resmi; hapus data demo (`web/src/lib/demoReports.ts`, `DEMO_USERS` di `mock.ts`).
- [ ] Naikkan Supabase ke tier berbayar: backup, audit log, retensi data.
- [ ] Enkripsi at-rest untuk `reporter_id`.
- [ ] Rate limiting pada halaman masuk.
- [ ] Isi korpus asisten dengan dokumen kebijakan final.
