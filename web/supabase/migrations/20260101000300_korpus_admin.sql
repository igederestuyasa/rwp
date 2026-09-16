-- ============================================================
-- RWP Hutama Karya — Kelola korpus & kebijakan dari halaman admin
-- ------------------------------------------------------------
-- Migrasi ketiga, setelah storage_buckets.
--
-- Sebelum ini, memberi makan asisten AI hanya bisa lewat skrip terminal
-- (scripts/ingest.mjs) memakai service_role. Admin RWP bukan orang teknis,
-- jadi alurnya dipindah ke aplikasi. Prinsipnya tetap CLAUDE.md §2 dan §9.2:
-- otorisasi ditegakkan di SQL lewat RLS, bukan di JavaScript. Route API
-- bertindak sebagai admin yang sedang login (token pengguna), BUKAN
-- service_role, sehingga kalau ada yang memanggil route itu tanpa hak,
-- database sendiri yang menolak.
--
-- Aman dijalankan ulang (idempotent).
-- ============================================================


-- ============================================================
-- corpus_documents — daftar dokumen yang membentuk pengetahuan AI
-- ------------------------------------------------------------
-- source_doc adalah kunci yang dipakai rag_chunks.source_doc. Untuk unggahan
-- baru nilainya = id::text. Untuk dokumen warisan hasil skrip lama, nilainya
-- tetap nama berkas aslinya (mis. 'handbook-rwp.md') supaya chunk yang sudah
-- ada tetap terhubung dan bisa dihapus lewat UI — lihat backfill di bawah.
-- ============================================================
create table if not exists public.corpus_documents (
    id            uuid primary key default gen_random_uuid(),
    nama          text not null,
    jenis         text not null check (jenis in ('md', 'txt', 'pdf', 'kebijakan')),
    source_doc    text not null unique,
    -- Path di bucket policy-docs. NULL untuk jenis 'kebijakan' (sumbernya
    -- tabel policies) dan untuk dokumen warisan skrip lama.
    storage_path  text,
    -- Terisi hanya untuk jenis 'kebijakan'.
    policy_id     text references public.policies(id) on delete set null,
    status        text not null default 'menunggu'
                  check (status in ('menunggu', 'diproses', 'selesai', 'gagal')),
    jumlah_chunk  integer not null default 0,
    embed_model   text,
    pesan_error   text,
    dibuat_oleh   uuid references public.users(id) on delete set null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

alter table public.corpus_documents enable row level security;

drop trigger if exists trg_corpus_documents_updated_at on public.corpus_documents;
create trigger trg_corpus_documents_updated_at
    before update on public.corpus_documents
    for each row execute function public.set_updated_at();

-- Hanya admin yang melihat dan mengelola daftar dokumen.
drop policy if exists corpus_docs_admin_all on public.corpus_documents;
create policy corpus_docs_admin_all on public.corpus_documents
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());


-- ============================================================
-- Backfill: dokumen yang sudah pernah di-ingest lewat skrip lama
-- ------------------------------------------------------------
-- Tanpa ini, chunk lama jadi "yatim" — tidak terlihat dan tidak bisa dihapus
-- dari UI — dan AI berisiko memegang dua salinan handbook begitu admin
-- mengunggah versi baru. Dibuat sebagai baris berstatus selesai tanpa
-- storage_path; UI menampilkannya sebagai warisan yang hanya bisa dihapus.
-- ============================================================
insert into public.corpus_documents (nama, jenis, source_doc, status, jumlah_chunk, embed_model)
select
    source_doc,
    case when lower(source_doc) like '%.txt' then 'txt' else 'md' end,
    source_doc,
    'selesai',
    count(*),
    max(embed_model)
from public.rag_chunks
group by source_doc
on conflict (source_doc) do nothing;


-- ============================================================
-- rag_chunks — admin boleh menulis dan menghapus
-- ------------------------------------------------------------
-- Karyawan tetap hanya select (dipakai RPC match_rag_chunks). Ingest ulang
-- = hapus chunk dokumen itu lalu sisipkan yang baru, jadi update tidak perlu.
-- ============================================================
drop policy if exists rag_admin_insert on public.rag_chunks;
create policy rag_admin_insert on public.rag_chunks
    for insert to authenticated with check (public.is_admin());

drop policy if exists rag_admin_delete on public.rag_chunks;
create policy rag_admin_delete on public.rag_chunks
    for delete to authenticated using (public.is_admin());

create index if not exists rag_chunks_source_doc_idx on public.rag_chunks (source_doc);


-- ============================================================
-- policies — admin melihat draft dan boleh menulis
-- ------------------------------------------------------------
-- Karyawan tetap hanya melihat yang is_published. Penulisan dipakai
-- halaman kelola kebijakan (fase berikutnya) dan route dari-kebijakan.
-- ============================================================
drop policy if exists policies_select_published on public.policies;
create policy policies_select_published on public.policies
    for select to authenticated
    using (is_published = true or public.is_admin());

drop policy if exists policies_admin_insert on public.policies;
create policy policies_admin_insert on public.policies
    for insert to authenticated with check (public.is_admin());

drop policy if exists policies_admin_update on public.policies;
create policy policies_admin_update on public.policies
    for update to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists policies_admin_delete on public.policies;
create policy policies_admin_delete on public.policies
    for delete to authenticated using (public.is_admin());


-- ============================================================
-- Storage policy-docs — admin boleh unggah, timpa, dan hapus
-- ------------------------------------------------------------
-- Sebelumnya bucket ini hanya bisa dibaca, dan penulisan diserahkan ke
-- Dashboard atau service_role. Kini admin menulis dengan tokennya sendiri.
-- ============================================================
drop policy if exists "policy_docs_admin_insert" on storage.objects;
create policy "policy_docs_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'policy-docs' and public.is_admin());

drop policy if exists "policy_docs_admin_update" on storage.objects;
create policy "policy_docs_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'policy-docs' and public.is_admin())
with check (bucket_id = 'policy-docs' and public.is_admin());

drop policy if exists "policy_docs_admin_delete" on storage.objects;
create policy "policy_docs_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'policy-docs' and public.is_admin());

-- Batas ukuran & tipe di level bucket (§9.4). Sebelumnya bucket ini tidak
-- punya batas sama sekali. 10 MB = 10485760 byte. Validasi di route adalah
-- lapis pertama; ini lapis kedua yang tidak bisa dilewati lewat API langsung.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
        'application/pdf',
        'text/markdown', 'text/x-markdown', 'text/plain'
    ]
where id = 'policy-docs';


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
values ('20260101000300', 'korpus_admin')
on conflict (version) do nothing;
