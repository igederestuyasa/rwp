-- ============================================================
-- Migrasi: pengerasan RLS (hasil audit sebelum deploy)
-- ------------------------------------------------------------
-- Menutup empat celah yang ditemukan audit keamanan:
--
--  1. users_insert_self — akun Auth yang belum punya baris profil bisa
--     menyisipkan barisnya sendiri dengan role 'admin' dan can_escalate
--     true (with check hanya memeriksa id). Profil dibuat lewat seed /
--     SQL Editor oleh admin, bukan oleh aplikasi, jadi policy ini dihapus.
--
--  2. Bucket rwp-evidence — policy lama hanya memeriksa bucket_id, sehingga
--     setiap pengguna login bisa mendaftar (list) dan mengunduh bukti
--     laporan siapa pun, atau mengunggah ke folder laporan orang lain.
--     Kini akses diikat ke pemilik laporan (folder pertama path = id
--     laporan) atau admin.
--
--  3. Kolom reporter_id — RLS menyaring baris, bukan kolom. Admin yang
--     boleh membaca semua baris `reports` bisa mengambil reporter_id lewat
--     REST dan mencocokkannya ke `users`, melewati RPC reveal_reporter yang
--     teraudit (§9.1). Kini admin TIDAK membaca tabel `reports` langsung:
--     satu-satunya jalan adalah view v_reports_admin yang berjalan dengan
--     hak pemilik, menyaring is_admin() di dalam, dan tidak memuat
--     reporter_id. users_select pun dipersempit ke baris sendiri.
--     Klien tidak pernah meng-update `reports` langsung (semua lewat RPC
--     change_report_status yang security definer), jadi
--     reports_update_admin ikut dihapus.
--
--  4. chat_sessions_update_own tanpa WITH CHECK — pemilik sesi bisa
--     memindahkan user_id sesinya ke orang lain.
--
-- Policy yang disentuh sekaligus memakai (select auth.uid()) supaya
-- dievaluasi sekali per query, bukan per baris.
--
-- Idempotent: aman dijalankan ulang.
-- ============================================================


-- ============================================================
-- Helper: pemilik laporan (SECURITY DEFINER — dipakai policy storage dan
-- tabel anak tanpa memicu RLS `reports` berlapis). Menerima text supaya
-- segmen path storage yang bukan UUID tidak melempar galat cast.
-- ============================================================
create or replace function public.pemilik_laporan(p_report_id text)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.reports r
        where r.id::text = p_report_id
          and r.reporter_id = (select auth.uid())
    );
$$;

revoke all on function public.pemilik_laporan(text) from public;
grant execute on function public.pemilik_laporan(text) to authenticated;


-- ============================================================
-- 1 & 3. users — baris sendiri saja; tidak ada insert dari aplikasi
-- ============================================================
drop policy if exists users_insert_self on public.users;

drop policy if exists users_select on public.users;
create policy users_select on public.users
    for select to authenticated using (id = (select auth.uid()));


-- ============================================================
-- 3. reports — pelapor membaca miliknya; admin lewat view
-- ============================================================
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
    for select to authenticated using (reporter_id = (select auth.uid()));

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
    for insert to authenticated with check (reporter_id = (select auth.uid()));

-- Perubahan status hanya lewat RPC change_report_status (security definer).
drop policy if exists reports_update_admin on public.reports;


-- ============================================================
-- 3. v_reports_admin — berjalan sebagai pemilik, saring admin di dalam
-- ------------------------------------------------------------
-- security_invoker = false: RLS `reports`/`users` tidak berlaku pada view,
-- jadi klausa WHERE public.is_admin() adalah penjaganya. security_barrier
-- memastikan penyaring itu dievaluasi sebelum ekspresi lain.
-- reporter_id tetap TIDAK pernah ikut ke view ini.
-- ============================================================
drop view if exists public.v_reports_admin;
create view public.v_reports_admin
with (security_invoker = false, security_barrier = true) as
select
    r.id, r.ticket_no, r.kategori, r.judul, r.kronologi,
    r.tanggal_kejadian, r.lokasi, r.terlapor, r.is_anonymous,
    r.status, r.created_at, r.updated_at, r.resolved_at,
    case when r.is_anonymous or not public.can_escalate() then null else u.nama end as reporter_name,
    case when r.is_anonymous or not public.can_escalate() then null else u.nik  end as reporter_nik
from public.reports r
left join public.users u on u.id = r.reporter_id
where public.is_admin();

revoke all on public.v_reports_admin from anon;
grant select on public.v_reports_admin to authenticated;


-- ============================================================
-- 4. chat_sessions — UPDATE wajib WITH CHECK
-- ============================================================
drop policy if exists chat_sessions_update_own on public.chat_sessions;
create policy chat_sessions_update_own on public.chat_sessions
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));


-- ============================================================
-- 2. Storage rwp-evidence — pemilik laporan atau admin
-- ------------------------------------------------------------
-- Path berkas: <report_id>/<uuid>.<ext> (lib/storage.ts), jadi segmen
-- folder pertama adalah id laporan. Admin mengunggah lampiran perubahan
-- status dan balasan percakapan, pelapor mengunggah bukti miliknya.
-- ============================================================
drop policy if exists "rwp_evidence_upload" on storage.objects;
create policy "rwp_evidence_upload"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'rwp-evidence'
    and (public.is_admin() or public.pemilik_laporan((storage.foldername(name))[1]))
);

drop policy if exists "rwp_evidence_read" on storage.objects;
create policy "rwp_evidence_read"
on storage.objects for select to authenticated
using (
    bucket_id = 'rwp-evidence'
    and (public.is_admin() or public.pemilik_laporan((storage.foldername(name))[1]))
);


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
values ('20260101000500', 'pengerasan_rls')
on conflict (version) do nothing;
