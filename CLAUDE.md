# CLAUDE.md — RWP Hutama Karya

> Panduan untuk Claude Code saat bekerja di repo ini. Baca sebelum menulis kode.
> Kalau ada konflik antara dokumen ini dan kode, **kode yang menang** — lalu
> perbarui dokumen ini.

@AGENTS.md

> Aplikasi Next.js ada **langsung di root repo** (`package.json`, `src/`,
> `supabase/`, `scripts/`). Folder `web/` sudah tidak ada — dipindah ke root
> supaya Vercel mendeteksi Next.js tanpa pengaturan Root Directory.

---

## 0. Apa aplikasi ini

Web app internal PT Hutama Karya (Persero) untuk **Respectful Workplace Policy**.
Satu jalur, satu tujuan: karyawan bisa memahami kebijakan RWP, melaporkan insiden
secara rahasia, dan memantau penanganannya.

Empat fungsi:

1. **Kebijakan RWP** (`/kebijakan`) — handbook lengkap, dirender dari Markdown atau PDF berwatermark.
2. **Pelaporan** (`/lapor` → `/laporan` → `/laporan/[id]`) — form insiden, opsi anonim, unggah bukti, pelacakan status, percakapan dengan admin, penilaian penanganan setelah laporan final,
   email pemberitahuan ke pelapor saat status berubah (Brevo, opsional).
3. **Sahabat RWP** (`/asisten`) — asisten AI berbasis RAG, korpusnya HANYA dokumen kebijakan.
4. **Layanan Psikologi** (`/psikologi`) — 6 kanal EAP, kontak langsung, tanpa tiket.

Sisi admin: `/dashboard` (analitik), `/tiket` → `/tiket/[id]` (penanganan),
`/kelola-kebijakan` (isi halaman Kebijakan: tambah, ubah, terbitkan, PDF, hapus),
dan `/korpus` (pengetahuan asisten). Admin juga punya menu `/kebijakan` yang sama
dengan karyawan untuk memantau apa yang tampil; di sana draft ikut terlihat
berlabel "Draft" (RLS mengizinkan admin membaca draft, karyawan tidak).

**Nama**: `APP_NAME = "RWP Hutama Karya"`, `ASSISTANT_NAME = "Sahabat RWP"` —
keduanya satu-satunya sumber kebenaran, di `src/lib/constants.ts`.
Jangan hardcode nama di tempat lain.

### Riwayat singkat

Proyek ini bermula sebagai MVP RWP berbasis Streamlit, lalu dibangun ulang sebagai
Next.js dan sempat melebar jadi **HC One Service** — portal ticketing seluruh layanan
Human Capital dengan 14 layanan, di mana RWP hanya satu entri bertanda `sensitive`.
Versi itu masih hidup di branch `master`.

Branch ini mengembalikan fokus ke RWP saja. Katalog layanan HC, WLA, simulasi
benefit, dan mood check-in **sudah dihapus** — jangan dihidupkan lagi tanpa
permintaan eksplisit.

---

## 1. Arsitektur

### Dua mode, satu kontrak

`src/lib/supabaseClient.ts` mengekspor `USE_MOCK` dari
`NEXT_PUBLIC_USE_MOCK` — mock **hanya bila nilainya persis `"true"`**, sama
dengan `next.config.ts` dan route server (variabel kosong = Supabase). Dua
berkas yang flag-gated:

- `lib/auth.tsx` — mock localStorage vs Supabase Auth
- `lib/store.tsx` — seed di memori vs Supabase

**Kontrak hook-nya dijaga** (`useAuth`, `useStore` bersignature sama), sehingga
30+ komponen UI tidak peduli mode mana yang aktif. Kalau menambah kemampuan data,
tambahkan di kedua cabang — jangan bocorkan `USE_MOCK` ke komponen.

### Peran

Hanya ada dua sumbu: `role` (`karyawan` | `admin`) dan `canEscalate`.

| | karyawan | admin RWP | admin superior |
|---|---|---|---|
| Buat laporan | ✅ | ❌ | ❌ |
| Lihat semua laporan | ❌ | ✅ | ✅ |
| Ubah status | ❌ | ✅ | ✅ |
| Lihat identitas pelapor non-anonim | — | ❌ | ✅ |
| Buka identitas pelapor anonim | ❌ | ❌ | ✅ (teraudit) |
| Unduh laporan periodik | ❌ | ❌ | ✅ |

`SubRole` (`"superior" | "rwp"`) hanya dipakai untuk label tampilan dan gating
`ReportDownload`. **Wewenang sesungguhnya ada di `canEscalate`**, karena itulah
yang dicek RPC `reveal_reporter` di database. Jangan menambah cabang otorisasi
berdasarkan `subRole` — nanti UI dan DB bisa berbeda pendapat.

### Model laporan

`Report` di `lib/types.ts` sudah tidak punya `service` maupun `sensitive` —
semua laporan di sini adalah laporan RWP. `kategori` wajib salah satu dari
`KATEGORI_INSIDEN`, dan constraint yang sama ditegakkan di database.

---

## 2. Database

SQL ada di `supabase/` dengan tata letak Supabase CLI. Petunjuk lengkap:
`supabase/README.md`.

**Migrasi** (`supabase/migrations/`) — mengubah bentuk database, dijalankan
di setiap lingkungan, berurutan menurut nama berkas:

- `20260916000000_skema_rwp.sql` — seluruh skema dalam keadaan akhirnya:
  tabel, trigger, helper definer (`is_admin`, `can_escalate`,
  `pemilik_laporan`, `pemilik_sesi_chat`), RLS, view `v_reports_admin`,
  RPC, bucket `rwp-evidence` & `policy-docs` beserta policy storage-nya.
  Ini leburan dari enam migrasi terdahulu (baseline, storage, korpus admin,
  `chunk_index`, pengerasan RLS, indeks & policy); hasilnya diverifikasi
  identik lewat `pg_dump`, termasuk saat dijalankan di atas database yang
  sudah memakai enam migrasi lama.
- `20260917000000_penilaian_laporan.sql` — tabel `report_feedback`
  (penilaian pelapor setelah laporan final), helper `boleh_nilai_laporan`,
  RLS-nya, dan RPC agregat `get_report_feedback_summary`.

**Seed** (`supabase/seeds/`) — isi demo, JANGAN dijalankan di lingkungan
yang menampung laporan asli:

- `01_users_demo.sql` — profil 3 akun demo (akun Auth dibuat manual dulu)
- `02_policies.sql` — isi halaman Kebijakan (teks yang sama dengan
  `lib/policies.ts`; ubah keduanya bersamaan)

Migrasi idempotent dan tidak memuat perintah penghapusan data.
**Jangan mengedit migrasi yang sudah pernah dijalankan** — `db push` tidak akan
mengulanginya, jadi perubahannya tidak akan pernah sampai. Buat berkas baru,
dan **jangan menyisipkan versinya sendiri** ke
`supabase_migrations.schema_migrations` dari dalam berkas: CLI mencatatnya
dengan `insert` biasa setelah berkas selesai, jadi baris yang sudah ada
membuat `db push` gagal. Migrasi yang dijalankan lewat SQL Editor dicatat
dengan `supabase migration repair --status applied <versi>`.

Tabel: `users`, `reports`, `report_evidence`, `report_messages`,
`report_status_log`, `report_feedback`, `policies`, `rag_chunks`,
`corpus_documents`, `chat_sessions`, `chat_messages`, `chat_feedback`.

RPC: `change_report_status`, `reveal_reporter`, `match_rag_chunks`,
`get_chat_feedback_summary`, `get_report_feedback_summary`.

### Yang tidak boleh diubah tanpa berpikir dua kali

- **`v_reports_admin`** menyembunyikan `reporter_name`/`reporter_nik` bila laporan
  anonim **atau** pembacanya tidak ber-`can_escalate`. Penegakannya harus tetap di
  SQL. Pernah terjadi: pembatasan hanya ada di JSX sementara `store.tsx` melakukan
  `select("*")`, jadi setiap admin sebenarnya sudah memegang identitas pelapor.
- **Admin tidak boleh membaca tabel `reports` langsung.** Sejak audit
  pengerasan RLS, `reports_select` hanya untuk pelapor; admin membaca lewat
  `v_reports_admin` (berjalan sebagai pemilik, saring `is_admin()` di dalam,
  tanpa `reporter_id`). Menambah klausa `is_admin()` ke `reports_select` akan
  membuka kembali `reporter_id` lewat REST dan mematikan audit `reveal_reporter`.
  Perubahan status tetap lewat RPC, bukan `update` langsung.
- **`users_select` hanya baris sendiri** dan tidak ada policy insert/update
  dari aplikasi. Profil dibuat lewat seed atau SQL Editor. Jangan menambah
  policy insert tanpa membatasi `role`/`can_escalate` di `with check`.
- **Prefix `'[ESKALASI IDENTITAS] '`** pada catatan audit dibaca
  `components/Timeline.tsx` untuk merender baris amber. Ubah salah satu, ubah keduanya.
- **`policies.pdf_path`** wajib ada. `kebijakan/page.tsx` menyeleksi kolom itu, dan
  PostgREST menolak seluruh query bila satu kolom tidak ada — halaman kebijakan akan
  gagal total, bukan sekadar kehilangan fitur PDF.
- **`policies` ditulis dari `/kelola-kebijakan` lewat RLS `policies_admin_*`**
  dengan token admin yang login, bukan `service_role`. Tabel ini tidak punya
  trigger `updated_at`, jadi halaman itu mengisi `updated_at` sendiri di setiap
  `update`. PDF kebijakan disimpan di bucket `policy-docs` dengan path
  `kebijakan/<id>/<uuid>.pdf` (nama asli tidak dipakai, §9.4); `id` kebijakan
  dibatasi slug karena ikut ke URL dan path Storage. Menghapus kebijakan
  membuat `corpus_documents.policy_id` jadi NULL (FK `on delete set null`), dan
  dokumen korpusnya harus dihapus terpisah dari `/korpus`.
- **`/api/notifikasi/status` adalah satu-satunya tempat selain RPC `reveal_reporter`
  yang membaca `reports.reporter_id`** — lewat `service_role` di server, semata untuk
  mencari `users.email` lalu mengirim email "ada pembaruan" lewat Brevo
  (`lib/emailServer.ts`). `reporter_id` dan alamat email tidak boleh keluar dari
  respons route itu, dan isi email harus tetap generik: tanpa nomor tiket, status,
  judul, kategori, kronologi, atau catatan admin (§9.1 — email melewati Brevo dan
  server mail perusahaan). Pemanggilnya `changeStatus` di `store.tsx`, best-effort
  setelah RPC sukses; gagal kirim tidak boleh menggagalkan perubahan status. Tanpa
  `BREVO_API_KEY` fitur ini diam saja.
- **Entri eskalasi terlihat oleh pelapor.** `laporan/[id]` sengaja memakai
  `hideEscalation={false}`. Ini keputusan transparansi, bukan bug.
- **`report_feedback` tidak menyimpan `user_id` dan tidak punya policy admin.**
  Kepemilikan diturunkan dari `reports.reporter_id` lewat `boleh_nilai_laporan`
  (pemilik + status final), dan admin hanya membaca agregat harian lewat
  `get_report_feedback_summary`. Jangan menambah policy select admin atau
  menampilkan komentar per laporan: komentar bebas adalah vektor
  de-anonimisasi lewat gaya tulisan (§9.1). Satu penilaian per laporan
  ditegakkan primary key `report_id`, tanpa policy update/delete.

---

## 3. Asisten & RAG

Alur: `asisten/page.tsx` → `POST /api/asisten` → verifikasi user → embed pertanyaan
→ RPC `match_rag_chunks` → saring `MIN_SIMILARITY` → prompt + konteks → LLM.

- **Endpoint hanya menyentuh `rag_chunks`.** Tidak pernah `reports`,
  `report_messages`, atau identitas. Ini aturan keras (§9.3).
- **Input route divalidasi skema `zod`** (`SkemaTanya` di `api/asisten`,
  `SkemaIngest`/`SkemaDariKebijakan`/`SkemaIdDokumen` + `bacaBody()` di
  `lib/korpusServer.ts`). Modul server (`llmClient`, `supabaseServer`,
  `korpusServer`) dipagari `import "server-only"`. Pesan galat ke klien
  adalah teks awam tetap; detail PostgREST/Storage/OpenAI hanya ke
  `console.error`. Galat yang memang untuk admin dilempar sebagai
  `GalatAdmin` supaya pesannya boleh diteruskan.
- **Batas topik**: RWP, aplikasi ini, dan Layanan Psikologi. Pertanyaan HC lain
  (cuti, gaji, pelatihan) ditolak dan diarahkan ke tim HC.
- **Korpus dikelola dari halaman admin `/korpus`**, bukan terminal. Admin
  mengunggah `.md`/`.txt` atau menekan "Kirim ke korpus" pada sebuah kebijakan;
  route `/api/korpus/*` memecah (`lib/chunker.ts`), menyematkan (`embedBatch`),
  dan menulis `rag_chunks` **sebagai admin yang login** lewat RLS — bukan
  `service_role`. Ingest berjalan bertahap 40 chunk per panggilan karena batas
  waktu serverless. Sumber kebenaran handbook adalah **baris tabel `policies`**
  yang juga dibaca `/kebijakan`, sehingga asisten dan halaman kebijakan tidak
  bercerita berbeda. `lib/policies.ts` kini hanya data mock dan seed. Mengubah
  Markdown di `/kelola-kebijakan` TIDAK otomatis memperbarui korpus — admin
  harus "Kirim ke korpus" lagi dari `/korpus` (halaman kelola mengingatkannya).
- **Admin bisa membaca isi korpus** dari halaman yang sama (klik baris atau
  "Lihat isi", URL `?pilih=<id>&lihat=teks|potongan`). Tab *Teks asli*
  menampilkan sumber lewat `components/MarkdownKebijakan.tsx` (renderer yang
  sama dengan `/kebijakan`); tab *Potongan* menampilkan baris `rag_chunks`
  persis seperti yang dibaca asisten, urut `chunk_index`. Route
  `GET /api/korpus/[id]/isi` hanya menyentuh tabel korpus (§9.3).
- Pembaruan search params di pola daftar-detail (`useDaftarDetail`, pembaca
  korpus) memakai `window.history.replaceState`, bukan `router.replace`:
  pada halaman statis yang dimuat langsung dengan `?pilih=` di URL,
  `router.replace` terbukti diam saja, dan cara native ini didokumentasikan
  Next sebagai jalur yang tersinkron dengan `useSearchParams`.
- Skrip terminal lama (`ingest.mjs`, `manage-docs.mjs`, `build-corpus.mjs`)
  **sudah dihapus**; `lib/chunker.ts` adalah satu-satunya pemecah dokumen
  (paritasnya dengan skrip lama diverifikasi saat dipindahkan). Kalau
  logikanya berubah, semua dokumen wajib diproses ulang dari `/korpus`.
  Dokumen cara-pakai di `scripts/corpus/` diunggah lewat UI.
- **`MIN_SIMILARITY` harus dari data**, bukan dari angka yang beredar umum.
  Jalankan `scripts/diagnose-retrieval.mjs` setiap kali korpus berubah. Nilai
  sekarang masih warisan korpus lama dan perlu disetel ulang. Latar belakang
  metodenya ada di `docs/embedding.md`.

---

## 4. Desain UI

- UI: semua perubahan tampilan mengikuti docs/DESIGN.md (sistem HC Panel).
- Bahasa UI: **Bahasa Indonesia**, seluruhnya.
- Token tema di `src/app/globals.css` (`--color-surface`, `--color-ink`,
  `--color-line`, `--color-accent`, …). Pakai kelas token (`bg-surface`,
  `text-ink-secondary`) supaya dark mode ikut jalan tanpa penanganan khusus.
- Dark mode lewat class `.dark` di `<html>`, dikelola `lib/theme.tsx`,
  disimpan di `localStorage` key `rwp_theme`. **Tailwind v4**: `darkMode: "selector"`
  wajib lewat `tailwind.config.js` yang direferensikan `@config` di `globals.css`.
- Komponen bersama: primitif di `components/ui/` (`Button`, `Card`, `Field` termasuk
  `GlassSelect` dan `InputBintang`, `Panel`) dan sistem HC Panel di `components/hc/` (`StatusLabel`,
  `KosongHC`, `MemuatHC`, `ItemCard`, `DetailPanel`, `SearchField`, `FilterTabs`,
  `DataTable`, `GenerativeIcon`, `Logo`). Pakai ulang, jangan bikin varian baru.
- Keadaan halaman: `MemuatHC` saat data store belum tiba (`useStore().loading`),
  `KosongHC` saat memang kosong. Kegagalan memuat (`useStore().error`) tampil
  sebagai satu spanduk di `(app)/layout.tsx`, bukan per halaman. Galat render
  ditangkap `app/error.tsx`, `(app)/error.tsx`, dan `global-error.tsx` lewat
  `components/GalatHalaman.tsx`; 404 lewat `app/not-found.tsx`. Pesan galat
  mentah tidak pernah dirender, hanya `digest`.
- Prefix `rwp_` pada key `localStorage` dan nama bucket memang disengaja.

---

## 5. Cara bekerja di repo ini

- **Bangun bertahap.** Setiap langkah harus meninggalkan `npx tsc --noEmit` dan
  `npm run build` hijau.
- **Verifikasi sebelum mengklaim selesai.** `tsc`, `eslint src`, `build`. Baseline
  lint saat ini: **0 error, 0 warning**. Jangan menambah keduanya — CI memakai
  `eslint src` sebagai gate yang menggagalkan build.
- **Jangan sentuh mekanika yang sudah terbukti** tanpa alasan: form status dua
  tahap di `tiket/[id]`, `Timeline`, `ChatThread`, `storage.ts`, pola flag-gated
  di `auth.tsx`/`store.tsx`.
- Komentar untuk logika domain ditulis dalam Bahasa Indonesia.
- Kalau ragu soal aturan RWP, **tanya** — jangan mengarang kebijakan.

---
## 9. Security Checklist (WAJIB diperhatikan saat ngoding)

> Nomor §9 sengaja dipertahankan walau §6–§8 tidak ada: komentar di kode
> merujuk ke §9.1–§9.4 secara eksplisit. Jangan dinomori ulang.

> Aplikasi ini menampung data RWP yang sangat sensitif. Keamanan bukan afterthought —
> bangun aman dari awal. Item bertanda **[MVP]** wajib ada sejak pilot; **[PROD]**
> wajib sebelum produksi (lihat juga §11).

### 9.1 Perlindungan identitas pelapor (paling kritikal)
- **[MVP]** Pertahankan pemisahan tegas antara identitas (`reporter_id`) dan isi
  laporan. Query dashboard/admin TIDAK boleh JOIN ke `users` by default.
- **[MVP]** Pembukaan identitas pelapor (eskalasi) HARUS lewat route terotorisasi
  khusus dan dicatat di `report_status_log` (siapa, kapan, alasan).
- **[PROD]** Encryption at rest untuk `reporter_id` & field sensitif — kalau DB bocor,
  identitas tidak langsung terbaca.
- **[MVP]** Waspadai de-anonimisasi lewat metadata (timestamp, lokasi, kombinasi
  kategori+tanggal, gaya tulisan). Jangan tampilkan metadata lebih dari yang perlu.

### 9.2 Access control & otorisasi
- **[MVP]** Cek role di setiap halaman & aksi pada level LOGIKA, bukan sekadar
  menyembunyikan tombol/menu di UI.
- **[MVP]** Aktifkan **Row-Level Security (RLS)** di Supabase — karyawan hanya bisa
  membaca laporannya sendiri, walau tahu ID laporan orang lain.
- **[MVP]** Least privilege: pisahkan admin biasa vs admin yang boleh eskalasi
  identitas.

### 9.3 Keamanan RAG / LLM
- **[MVP]** LLM/RAG HANYA boleh mengakses dokumen kebijakan RWP. JANGAN PERNAH beri
  LLM akses ke `reports`, `report_messages`, atau identitas. Pisahkan tegas: asisten
  Q&A = soal kebijakan, BUKAN soal data laporan.
- **[MVP]** Jangan kirim isi laporan / identitas ke API LLM apa pun (data keluar dari
  server begitu dikirim ke API eksternal).
- **[MVP]** Mitigasi prompt injection: perlakukan input user sebagai data, bukan
  perintah. Output LLM hanya dipakai sebagai teks jawaban — JANGAN dipakai untuk
  menyusun query DB atau memicu aksi.
- **[MVP]** Kalau retrieval tidak menemukan konteks relevan, jawab jujur "tidak
  ditemukan" — jangan mengarang kebijakan.

### 9.4 Input & file upload
- **[MVP]** Gunakan parameterized query (jangan string concatenation) → cegah SQL
  injection.
- **[MVP]** Sanitasi teks yang ditampilkan balik → cegah XSS.
- **[MVP]** File upload bukti:
  - Whitelist tipe file (mis. jpg, png, pdf saja).
  - Batasi ukuran file.
  - Verifikasi MIME type asli, jangan percaya ekstensi/nama file dari user.
  - Rename file saat disimpan (jangan pakai nama asli user).
  - Simpan di Supabase Storage, jangan di server app, jangan pernah di-execute.

### 9.5 Secret & kredensial
- **[MVP]** Semua kredensial (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `BREVO_API_KEY`, anon key) di `.env.local`. `.env*` WAJIB di `.gitignore`. Sediakan
  `.env.local.example` tanpa nilai asli.
- **[MVP]** Repo **private**. Dokumen RWP asli & data laporan JANGAN di-commit.
- **[MVP]** Di Vercel, isi lewat *Project Settings → Environment Variables*,
  bukan file yang di-push.
- **[MVP]** Semua pemanggilan API lewat backend; jangan taruh secret di sisi client.
- **[MVP]** Kalau secret pernah ter-commit: **revoke & rotate** (jejak tetap ada di
  git history).

### 9.6 Auth & session
- **[MVP]** Password jangan plaintext — hash (bcrypt/argon2). Supabase Auth sudah
  menangani ini; manfaatkan, jangan bikin sendiri.
- **[MVP]** Session timeout & invalidasi saat logout.
- **[PROD]** Rate limiting pada login → cegah brute force.
- Catatan: dummy account MVP OK, tapi tandai jelas BUKAN untuk produksi.

### 9.7 Operasional & data
- **[MVP]** Akses lewat HTTPS (Vercel default).
- **[MVP]** Logging hati-hati: JANGAN nge-log isi laporan / identitas ke log mentah.
- **[PROD]** Backup data laporan yang andal (free tier Supabase terbatas).
- **[PROD]** Kebijakan retensi & penghapusan data (data sensitif menganggur =
  liabilitas).

### 9.8 Empat hal yang TIDAK BOLEH dikompromiin di MVP
1. Pemisahan identitas vs isi laporan + RLS Supabase.
2. LLM/RAG tidak menyentuh data laporan sama sekali.
3. File upload divalidasi ketat.
4. Secret tidak ter-commit.

---
## 10. Sebelum dipakai sungguhan

Ini pilot di free tier untuk pembuktian konsep. Sebelum menampung laporan RWP asli:

- Validasi kategori insiden & alur status dengan kebijakan RWP resmi HC.
- Tinjauan hukum/compliance untuk penyimpanan PII & data sensitif.
- Migrasi ke infrastruktur berbayar: backup, audit log lengkap, kontrol akses.
- Integrasi SSO/identitas resmi HK; hapus akun & data demo
  (`src/lib/demoReports.ts`, `DEMO_USERS` di `mock.ts`).
- Kebijakan retensi & penghapusan data.
- Isi korpus asisten dengan dokumen kebijakan final.

---

## 11. Utang teknis yang diketahui

- ~~9 error lint `react-hooks`~~ — **SELESAI.** Ternyata bukan di `auth.tsx`/
  `store.tsx`/`theme.tsx` seperti catatan lama ini (ketiganya sudah bersih),
  melainkan di `login/page.tsx` (4 ikon SVG statis dideklarasikan ulang tiap
  render), `useIdleTimeout.ts` (tulis ref saat render + `setState` sinkron di
  effect), `RatingDashboard.tsx` (saat itu `ChatRatingDashboard.tsx`) dan `kebijakan/page.tsx` (`setState` sinkron
  di effect). `eslint src` sekarang exit 0.
- ~~Sisa 6 warning lint~~ — **SELESAI** saat redesign HC Panel. Impor `DotGrid`
  yang menganggur hilang bersama berkasnya, `ThemeSegment` akhirnya dirender
  sebagai pemilih tema yang berfungsi, dan `eslint-disable` mubazir di
  `login/page.tsx` ikut hilang saat berkas itu ditulis ulang.
- `MIN_SIMILARITY` di `api/asisten/route.ts` masih warisan korpus lama.
- `store.tsx` masih menarik seluruh `reports`, `report_messages`, dan
  `report_status_log` ke browser (paginasi di memori). Cukup untuk skala
  pilot; di atas ribuan pesan perlu pemuatan per laporan, yang berarti
  mengubah kontrak `useStore` yang dipakai 30+ komponen. Pemuatannya sudah
  paralel dan kolomnya eksplisit (audit batch 3).
- Tipe Supabase belum di-generate (`supabase gen types`); mapper masih
  mengetik baris secara manual di `lib/mappers.ts`.
- Notifikasi belum realtime (data dari Supabase, status baca/dismiss di localStorage).
- Email status ke pelapor dipicu dari browser admin lewat `/api/notifikasi/status`,
  bukan dari trigger database: perubahan status lewat SQL Editor tidak mengirim
  email, dan admin hanya tahu kegagalannya dari console. Langkah lanjutnya adalah
  Database Webhook Supabase pada `report_status_log` ke route yang sama. Domain
  pengirim Brevo juga belum diautentikasi (SPF/DKIM).
- Korpus belum menerima PDF/DOCX — konversi manual dulu ke `.md` sebelum
  diunggah di `/korpus`.
- `storage.ts` masih hardcode nama bucket.
- Belum ada PWA.
