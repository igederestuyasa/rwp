# CLAUDE.md — RWP Hutama Karya

> Panduan untuk Claude Code saat bekerja di repo ini. Baca sebelum menulis kode.
> Kalau ada konflik antara dokumen ini dan kode, **kode yang menang** — lalu
> perbarui dokumen ini.

---

## 0. Apa aplikasi ini

Web app internal PT Hutama Karya (Persero) untuk **Respectful Workplace Policy**.
Satu jalur, satu tujuan: karyawan bisa memahami kebijakan RWP, melaporkan insiden
secara rahasia, dan memantau penanganannya.

Empat fungsi:

1. **Kebijakan RWP** (`/kebijakan`) — handbook lengkap, dirender dari Markdown atau PDF berwatermark.
2. **Pelaporan** (`/lapor` → `/laporan` → `/laporan/[id]`) — form insiden, opsi anonim, unggah bukti, pelacakan status, percakapan dengan admin.
3. **Sahabat RWP** (`/asisten`) — asisten AI berbasis RAG, korpusnya HANYA dokumen kebijakan.
4. **Layanan Psikologi** (`/psikologi`) — 6 kanal EAP, kontak langsung, tanpa tiket.

Sisi admin: `/dashboard` (analitik) dan `/tiket` → `/tiket/[id]` (penanganan).

**Nama**: `APP_NAME = "RWP Hutama Karya"`, `ASSISTANT_NAME = "Sahabat RWP"` —
keduanya satu-satunya sumber kebenaran, di `web/src/lib/constants.ts`.
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

`web/src/lib/supabaseClient.ts` mengekspor `USE_MOCK` dari
`NEXT_PUBLIC_USE_MOCK`. Dua berkas yang flag-gated:

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

Empat berkas SQL di `web/scripts/`, dijalankan **berurutan** di project kosong:

1. `01_schema.sql` — tabel, trigger, helper, RLS, view `v_reports_admin`, RPC
2. `02_storage.sql` — bucket `rwp-evidence` & `policy-docs` + batas ukuran/MIME
3. `03_seed_users.sql` — profil 3 akun demo (akun Auth dibuat manual dulu)
4. `04_seed_policies.sql` — isi halaman Kebijakan

Tabel: `users`, `reports`, `report_evidence`, `report_messages`,
`report_status_log`, `policies`, `rag_chunks`, `chat_sessions`, `chat_messages`,
`chat_feedback`.

RPC: `change_report_status`, `reveal_reporter`, `match_rag_chunks`,
`get_chat_feedback_summary`.

### Yang tidak boleh diubah tanpa berpikir dua kali

- **`v_reports_admin`** menyembunyikan `reporter_name`/`reporter_nik` bila laporan
  anonim **atau** pembacanya tidak ber-`can_escalate`. Penegakannya harus tetap di
  SQL. Pernah terjadi: pembatasan hanya ada di JSX sementara `store.tsx` melakukan
  `select("*")`, jadi setiap admin sebenarnya sudah memegang identitas pelapor.
- **Prefix `'[ESKALASI IDENTITAS] '`** pada catatan audit dibaca
  `components/Timeline.tsx` untuk merender baris amber. Ubah salah satu, ubah keduanya.
- **`policies.pdf_path`** wajib ada. `kebijakan/page.tsx` menyeleksi kolom itu, dan
  PostgREST menolak seluruh query bila satu kolom tidak ada — halaman kebijakan akan
  gagal total, bukan sekadar kehilangan fitur PDF.
- **Entri eskalasi terlihat oleh pelapor.** `laporan/[id]` sengaja memakai
  `hideEscalation={false}`. Ini keputusan transparansi, bukan bug.

---

## 3. Asisten & RAG

Alur: `asisten/page.tsx` → `POST /api/asisten` → verifikasi user → embed pertanyaan
→ RPC `match_rag_chunks` → saring `MIN_SIMILARITY` → prompt + konteks → LLM.

- **Endpoint hanya menyentuh `rag_chunks`.** Tidak pernah `reports`,
  `report_messages`, atau identitas. Ini aturan keras (§9.3).
- **Batas topik**: RWP, aplikasi ini, dan Layanan Psikologi. Pertanyaan HC lain
  (cuti, gaji, pelatihan) ditolak dan diarahkan ke tim HC.
- **Korpus dibangun ulang** dengan `node scripts/build-corpus.mjs` — handbook
  diambil dari `lib/policies.ts` supaya asisten dan halaman kebijakan tidak
  bercerita berbeda. Dokumen cara-pakai ada di `scripts/corpus/` (ikut repo);
  `scripts/docs/` gitignored.
- **`MIN_SIMILARITY` harus dari data**, bukan dari angka yang beredar umum.
  Jalankan `scripts/diagnose-retrieval.mjs` setiap kali korpus berubah. Nilai
  sekarang masih warisan korpus lama dan perlu disetel ulang.

---

## 4. Desain UI

- Bahasa UI: **Bahasa Indonesia**, seluruhnya.
- Token tema di `src/app/globals.css` (`--color-surface`, `--color-ink`,
  `--color-line`, `--color-accent`, …). Pakai kelas token (`bg-surface`,
  `text-ink-secondary`) supaya dark mode ikut jalan tanpa penanganan khusus.
- Dark mode lewat class `.dark` di `<html>`, dikelola `lib/theme.tsx`,
  disimpan di `localStorage` key `rwp_theme`. **Tailwind v4**: `darkMode: "selector"`
  wajib lewat `web/tailwind.config.js` yang direferensikan `@config` di `globals.css`.
- Komponen bersama di `components/ui/`: `Button`, `Card`, `Field` (termasuk
  `GlassSelect`), `StatusPill`, `Panel`, `DotGrid`, `EmptyState`. Pakai ulang,
  jangan bikin varian baru.
- Prefix `rwp_` pada key `localStorage` dan nama bucket memang disengaja.

---

## 5. Cara bekerja di repo ini

- **Bangun bertahap.** Setiap langkah harus meninggalkan `npx tsc --noEmit` dan
  `npm run build` hijau.
- **Verifikasi sebelum mengklaim selesai.** `tsc`, `eslint src`, `build`. Baseline
  lint saat ini: **0 error**, 6 warning (impor `DotGrid`/`ThemeSegment` tak terpakai,
  satu `eslint-disable` yang sudah tidak perlu). Jangan menambah error baru — CI
  memakai `eslint src` sebagai gate yang menggagalkan build.
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
- **[MVP]** Semua kredensial (`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`)
  di `.env`. `.env` WAJIB di `.gitignore`. Sediakan `.env.example` tanpa nilai asli.
- **[MVP]** Repo **private**. Dokumen RWP asli & data laporan JANGAN di-commit.
- **[MVP]** Di Streamlit Cloud, pakai **Secrets manager**, bukan file yang di-push.
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
- **[MVP]** Akses lewat HTTPS (Streamlit Cloud default).
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
  (`web/src/lib/demoReports.ts`, `DEMO_USERS` di `mock.ts`).
- Kebijakan retensi & penghapusan data.
- Isi korpus asisten dengan dokumen kebijakan final.

---

## 11. Utang teknis yang diketahui

- ~~9 error lint `react-hooks`~~ — **SELESAI.** Ternyata bukan di `auth.tsx`/
  `store.tsx`/`theme.tsx` seperti catatan lama ini (ketiganya sudah bersih),
  melainkan di `login/page.tsx` (4 ikon SVG statis dideklarasikan ulang tiap
  render), `useIdleTimeout.ts` (tulis ref saat render + `setState` sinkron di
  effect), `ChatRatingDashboard.tsx` dan `kebijakan/page.tsx` (`setState` sinkron
  di effect). `eslint src` sekarang exit 0.
- Sisa 6 warning lint yang belum disentuh: impor `DotGrid` tak terpakai di
  `bantuan`/`laporan`/`pengaturan`/`profil`, `ThemeSegment` tak terpakai di
  `pengaturan`, dan satu `eslint-disable` mubazir di `login/page.tsx`.
- `MIN_SIMILARITY` di `api/asisten/route.ts` masih warisan korpus lama.
- Notifikasi belum realtime (data dari Supabase, status baca/dismiss di localStorage).
- Belum ada dukungan PDF/DOCX di skrip ingest — konversi manual dulu ke `.md`.
- `storage.ts` masih hardcode nama bucket.
- Belum di-deploy; belum ada PWA.
