# Database RWP Hutama Karya

Struktur di folder ini mengikuti tata letak Supabase CLI.

```
supabase/
├── config.toml                              konfigurasi CLI
├── migrations/                              perubahan SKEMA, dijalankan berurutan
│   ├── 20260101000100_baseline_schema.sql   10 tabel, trigger, RLS, view admin, RPC
│   ├── 20260101000200_storage_buckets.sql   bucket rwp-evidence & policy-docs
│   ├── 20260101000300_korpus_admin.sql      tabel corpus_documents + RLS tulis admin (korpus AI)
│   ├── 20260101000400_rag_chunk_index.sql   kolom chunk_index (urutan potongan)
│   ├── 20260101000500_pengerasan_rls.sql    hasil audit: tutup celah RLS users/reports/storage
│   └── 20260101000600_indeks_dan_policy.sql indeks yang hilang + policy anak lewat helper definer
└── seeds/                                   ISI awal, bukan skema
    ├── 01_users_demo.sql                    profil 3 akun demo
    └── 02_policies.sql                      handbook RWP untuk halaman /kebijakan
```

**Migrasi mengubah bentuk database, seed mengisinya.** Migrasi selalu dijalankan
di setiap lingkungan; seed hanya untuk demo dan pilot, dan JANGAN dijalankan di
lingkungan yang sudah menampung laporan asli — akun demo bukan untuk produksi.

## Menjalankan pertama kali

### Cara A — Supabase CLI (disarankan)

```bash
cd web
supabase link --project-ref <ref-project-kamu>
supabase db push                 # menjalankan seluruh migrations/ yang belum tercatat
psql "$DATABASE_URL" -f supabase/seeds/01_users_demo.sql
psql "$DATABASE_URL" -f supabase/seeds/02_policies.sql
```

### Cara B — SQL Editor di Dashboard

Buka isi tiap berkas, tempel, jalankan **berurutan**: seluruh `migrations/` dulu
(urut nama), baru `seeds/`.

Tiap migrasi mencatat dirinya sendiri ke `supabase_migrations.schema_migrations`,
tabel yang juga dipakai Supabase CLI. Jadi kalau nanti pindah ke Cara A, `db push`
tahu migrasi mana yang sudah jalan dan tidak mengulanginya.

### Prasyarat seed akun demo

`01_users_demo.sql` hanya menautkan profil aplikasi ke akun Auth yang **sudah ada**.
Buat dulu tiga akunnya di Dashboard > Authentication > Users (centang "Auto Confirm
User") dengan email persis seperti di berkas itu.

## Menambah perubahan skema berikutnya

Jangan mengedit migrasi yang sudah pernah dijalankan di database mana pun —
`db push` tidak akan menjalankannya ulang, jadi perubahannya tidak akan pernah
sampai. Buat berkas baru:

```bash
cd web && supabase migration new nama_perubahan
```

atau secara manual, berkas `migrations/<UTC YYYYMMDDHHMMSS>_nama.sql` dengan blok
pencatat versi yang sama seperti migrasi lain (salin dari bagian bawah salah satu
berkas yang ada, ganti version dan name-nya).

## Catatan

- Seluruh migrasi ditulis **idempotent** (`if not exists`, `drop policy if exists`,
  `create or replace`), jadi aman dijalankan ulang di database yang sudah terisi.
- Belum ada skrip `down`/rollback. Untuk pilot ini disengaja; sebelum menampung
  laporan asli, siapkan prosedur rollback dan backup (lihat CLAUDE.md §10).
- Struktur ini belum pernah diuji lewat Supabase CLI sungguhan dari repo ini —
  yang sudah diverifikasi hanya isi SQL-nya dan konsistensinya terhadap kode.
