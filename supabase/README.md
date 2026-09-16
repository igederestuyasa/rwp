# Database RWP Hutama Karya

Struktur di folder ini mengikuti tata letak Supabase CLI.

```
supabase/
├── config.toml                          konfigurasi CLI (project_id, daftar seed)
├── migrations/
│   └── 20260916000000_skema_rwp.sql     SELURUH skema: tabel, helper, RLS, view admin,
│                                        RPC, bucket & policy storage
└── seeds/                               ISI awal, bukan skema
    ├── 01_users_demo.sql                profil 3 akun demo
    └── 02_policies.sql                  handbook RWP untuk halaman /kebijakan
```

**Satu migrasi = seluruh skema.** Enam migrasi terdahulu (baseline, storage,
korpus admin, `chunk_index`, pengerasan RLS, indeks & policy) sudah dilebur ke
keadaan akhirnya. Hasil leburannya diverifikasi dengan `pg_dump` pada Postgres
16 + pgvector: pemasangan baru, pemasangan di atas database yang sudah memakai
enam migrasi lama, dan eksekusi dua kali — ketiganya menghasilkan skema yang
identik.

**Migrasi mengubah bentuk database, seed mengisinya.** Migrasi dijalankan di
setiap lingkungan; seed hanya untuk demo dan pilot, dan JANGAN dijalankan di
lingkungan yang sudah menampung laporan asli — akun demo bukan untuk produksi.

## Pemasangan dari nol

### Cara A — SQL Editor di Dashboard (paling sederhana)

1. Buka *Supabase Dashboard → SQL Editor*.
2. Tempel seluruh isi `migrations/20260916000000_skema_rwp.sql`, jalankan.
3. Buat tiga akun Auth demo di *Authentication → Users* (centang **Auto
   Confirm User**) dengan email persis seperti di `seeds/01_users_demo.sql`.
4. Tempel dan jalankan `seeds/01_users_demo.sql`, lalu `seeds/02_policies.sql`.
   Query verifikasi di ujung tiap seed harus mengembalikan 3 baris dan 1 baris.

Kalau nanti ingin memakai CLI (Cara B) pada database yang sama, catat dulu
bahwa migrasinya sudah jalan supaya `db push` tidak mengulangnya:

```bash
supabase migration repair --status applied 20260916000000
```

Mengulangnya pun tidak merusak — migrasinya idempotent — tetapi ini membuat
riwayat CLI rapi.

### Cara B — Supabase CLI

```bash
supabase link --project-ref <ref-project-kamu>   # Dashboard → Project Settings → General → Reference ID
supabase db push                                 # menjalankan migrations/ yang belum tercatat
```

Seed tetap butuh akun Auth demo lebih dulu (langkah 3 di atas), karena
`01_users_demo.sql` hanya menautkan profil ke akun yang **sudah ada**. Setelah
itu:

```bash
psql "$DATABASE_URL" -f supabase/seeds/01_users_demo.sql
psql "$DATABASE_URL" -f supabase/seeds/02_policies.sql
```

`DATABASE_URL` ada di *Dashboard → Project Settings → Database → Connection
string*. Alternatifnya `supabase db push --include-seed`, yang membaca
`sql_paths` di `config.toml`.

## Database yang sudah memakai enam migrasi lama

Database yang dibuat sebelum penggabungan sudah mencatat versi
`20260101000100` … `20260101000600` di `supabase_migrations.schema_migrations`.
Skemanya **sudah sama persis** dengan migrasi gabungan, jadi tidak ada SQL
yang perlu dijalankan. Yang perlu disamakan hanya riwayat migrasi, dan itu
pun hanya kalau memakai CLI:

```bash
supabase migration repair --status reverted 20260101000100 20260101000200 20260101000300 20260101000400 20260101000500 20260101000600
supabase migration repair --status applied  20260916000000
```

Tanpa ini `db push` menolak karena riwayat remote memuat versi yang tidak ada
di `migrations/`. Kalau database itu hanya dikelola lewat SQL Editor, tidak
perlu melakukan apa pun.

## Menambah perubahan skema berikutnya

Jangan mengedit migrasi yang sudah pernah dijalankan di database mana pun —
`db push` tidak akan menjalankannya ulang, jadi perubahannya tidak akan pernah
sampai. Buat berkas baru:

```bash
supabase migration new nama_perubahan
```

atau manual: `migrations/<UTC YYYYMMDDHHMMSS>_nama.sql`. Tulis idempotent
(`if not exists`, `drop policy if exists`, `create or replace`) supaya aman
ditempel ulang di SQL Editor.

**Jangan menyisipkan versi migrasi ke `supabase_migrations.schema_migrations`
dari dalam berkas.** CLI mencatatnya sendiri dengan `insert` biasa setelah
berkas selesai dijalankan, dan baris yang sudah ada membuat `db push` gagal.
Migrasi lama pernah melakukan ini; itulah sebabnya jalur CLI dulu tidak bisa
dipakai. Untuk migrasi yang dijalankan lewat SQL Editor, catat versinya dengan
`supabase migration repair --status applied <versi>` seperti di atas.

Setelah menambah migrasi, perbarui daftar di berkas ini, di `README.md`, dan
di `CLAUDE.md` §2.

## Catatan

- Migrasi tidak memuat perintah yang menghapus data, jadi aman dijalankan
  ulang di database yang sudah terisi.
- Belum ada skrip `down`/rollback. Untuk pilot ini disengaja; sebelum menampung
  laporan asli, siapkan prosedur rollback dan backup (lihat `CLAUDE.md` §10).
- Verifikasi dilakukan di Postgres 16 + pgvector dengan stub skema
  `auth`/`storage`; struktur ini belum diuji lewat Supabase CLI sungguhan dari
  repo ini.
