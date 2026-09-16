-- ============================================================
-- RWP Hutama Karya — Storage buckets & policies
-- ------------------------------------------------------------
-- Migrasi kedua, setelah baseline_schema.
-- Aman dijalankan ulang (idempotent).
--
-- Dua bucket, dua tujuan:
--   rwp-evidence : bukti pelaporan & lampiran percakapan (ditulis pengguna)
--   policy-docs  : PDF dokumen kebijakan (ditulis admin lewat service_role)
--
-- CATATAN: sebelumnya pembuatan bucket dilakukan manual lewat Dashboard dan
-- bucket policy-docs tidak pernah punya skrip sama sekali, padahal dipakai
-- /api/policy-pdf. Sekarang keduanya dibuat di sini agar setup bisa diulang.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('rwp-evidence', 'rwp-evidence', false),
       ('policy-docs',  'policy-docs',  false)
on conflict (id) do nothing;


-- ============================================================
-- rwp-evidence — pengguna terautentikasi boleh unggah & baca
-- ------------------------------------------------------------
-- Path file memakai UUID acak (bukan nama asli, §9.4) dan hanya diekspos
-- ke pengguna yang berhak lewat RLS tabel report_evidence. Pengetatan
-- per-kepemilikan di level Storage = penyempurnaan [PROD].
-- ============================================================
drop policy if exists "rwp_evidence_upload" on storage.objects;
create policy "rwp_evidence_upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'rwp-evidence');

drop policy if exists "rwp_evidence_read" on storage.objects;
create policy "rwp_evidence_read"
on storage.objects for select to authenticated
using (bucket_id = 'rwp-evidence');


-- ============================================================
-- policy-docs — hanya baca. Unggah dokumen kebijakan dilakukan admin
-- lewat Dashboard / service_role, bukan dari aplikasi.
-- ============================================================
drop policy if exists "policy_docs_read" on storage.objects;
create policy "policy_docs_read"
on storage.objects for select to authenticated
using (bucket_id = 'policy-docs');


-- ============================================================
-- Batas ukuran & tipe file di level BUCKET (§9.4).
-- Lapis kedua setelah validasi client (lib/fileValidation.ts) — validasi
-- client bisa dilewati lewat API langsung, jadi batas ini ditegakkan juga
-- di server. 10 MB = 10485760 byte.
-- ============================================================
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
        'image/jpeg', 'image/png', 'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
        'audio/wav', 'audio/x-wav', 'audio/ogg', 'application/ogg'
    ]
where id = 'rwp-evidence';

update storage.buckets
set file_size_limit = 20971520,          -- 20 MB, dokumen kebijakan bisa tebal
    allowed_mime_types = array['application/pdf']
where id = 'policy-docs';

-- Selesai. Lanjut ke 03_seed_users.sql.


-- ============================================================
-- Catat versi migrasi ini.
-- ------------------------------------------------------------
-- Tabel ini milik Supabase CLI. Dengan menuliskannya sendiri, migrasi yang
-- dijalankan manual lewat SQL Editor tetap terbaca oleh `supabase db push`
-- nanti, sehingga tidak dijalankan dua kali.
-- ============================================================
create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
    version    text primary key,
    statements text[],
    name       text
);

insert into supabase_migrations.schema_migrations (version, name)
values ('20260101000200', 'storage_buckets')
on conflict (version) do nothing;
