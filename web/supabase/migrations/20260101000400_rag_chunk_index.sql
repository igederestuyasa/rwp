-- ============================================================
-- Migrasi: urutan potongan (chunk_index) pada rag_chunks
-- ------------------------------------------------------------
-- Potongan disisipkan per batch, sehingga banyak baris memakai created_at
-- yang sama dan urutan aslinya di dokumen tidak bisa dipulihkan. Kolom ini
-- menyimpan posisi potongan (0, 1, 2, …) supaya halaman /korpus bisa
-- menampilkan isi dokumen dalam urutan yang benar.
--
-- Potongan hasil skrip lama tetap NULL — urutannya memang tidak tersimpan.
-- RPC match_rag_chunks tidak terpengaruh: kolom keluarannya eksplisit.
--
-- Idempotent: aman dijalankan ulang.
-- ============================================================

alter table public.rag_chunks
    add column if not exists chunk_index integer;

create index if not exists rag_chunks_source_doc_index_idx
    on public.rag_chunks (source_doc, chunk_index);

-- ============================================================
-- Catat versi (tabel yang sama dipakai Supabase CLI)
-- ============================================================
create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
    version    text primary key,
    statements text[],
    name       text
);

insert into supabase_migrations.schema_migrations (version, name)
values ('20260101000400', 'rag_chunk_index')
on conflict (version) do nothing;
