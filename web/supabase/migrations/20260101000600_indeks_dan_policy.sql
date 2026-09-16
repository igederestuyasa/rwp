-- ============================================================
-- Migrasi: indeks yang hilang + policy RLS lebih hemat
-- ------------------------------------------------------------
-- Dua kelompok perbaikan dari audit performa:
--
--  1. Indeks pada kolom yang dipakai policy dan foreign key tanpa indeks
--     (chat_feedback.user_id/session_id, report_status_log.changed_by,
--     corpus_documents.policy_id/dibuat_oleh). Tanpa ini, penghapusan sesi
--     chat atau pengguna memaksa scan penuh tabel anak.
--
--  2. Policy tabel anak (report_evidence, report_messages,
--     report_status_log, chat_messages) dulu memakai
--     `exists (select … from reports/chat_sessions …)` — subquery itu
--     melewati RLS tabel induk lagi untuk SETIAP baris. Kini lewat helper
--     SECURITY DEFINER (pemilik_laporan / pemilik_sesi_chat), dan
--     `auth.uid()` dibungkus `(select …)` supaya dievaluasi sekali per query.
--     Makna kebijakannya TIDAK berubah: pelapor/pemilik dan admin sama
--     seperti sebelumnya.
--
-- Prasyarat: 20260101000500_pengerasan_rls.sql (pemilik_laporan(text)).
-- Idempotent: aman dijalankan ulang.
-- ============================================================


-- ============================================================
-- 1. Indeks
-- ============================================================
create index if not exists idx_chat_feedback_user
    on public.chat_feedback (user_id);
create index if not exists idx_chat_feedback_session
    on public.chat_feedback (session_id);
create index if not exists idx_status_log_changed_by
    on public.report_status_log (changed_by);
create index if not exists idx_corpus_documents_policy
    on public.corpus_documents (policy_id);
create index if not exists idx_corpus_documents_dibuat_oleh
    on public.corpus_documents (dibuat_oleh);


-- ============================================================
-- 2a. Helper (SECURITY DEFINER, stable)
-- ============================================================
-- Varian uuid dari pemilik_laporan — dipakai policy tabel anak yang
-- kolom report_id-nya uuid. Varian text (migrasi 0500) tetap untuk storage.
create or replace function public.pemilik_laporan(p_report_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.reports r
        where r.id = p_report_id
          and r.reporter_id = (select auth.uid())
    );
$$;
revoke all on function public.pemilik_laporan(uuid) from public;
grant execute on function public.pemilik_laporan(uuid) to authenticated;

create or replace function public.pemilik_sesi_chat(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.chat_sessions s
        where s.id = p_session_id
          and s.user_id = (select auth.uid())
    );
$$;
revoke all on function public.pemilik_sesi_chat(uuid) from public;
grant execute on function public.pemilik_sesi_chat(uuid) to authenticated;


-- ============================================================
-- 2b. report_evidence
-- ============================================================
drop policy if exists evidence_select on public.report_evidence;
create policy evidence_select on public.report_evidence
    for select to authenticated
    using (public.is_admin() or public.pemilik_laporan(report_id));

drop policy if exists evidence_insert_own on public.report_evidence;
create policy evidence_insert_own on public.report_evidence
    for insert to authenticated
    with check (public.pemilik_laporan(report_id));


-- ============================================================
-- 2c. report_messages
-- ============================================================
drop policy if exists messages_select on public.report_messages;
create policy messages_select on public.report_messages
    for select to authenticated
    using (public.is_admin() or public.pemilik_laporan(report_id));

drop policy if exists messages_insert on public.report_messages;
create policy messages_insert on public.report_messages
    for insert to authenticated
    with check (
        (public.is_admin() and sender_role = 'admin')
        or (sender_role = 'karyawan' and public.pemilik_laporan(report_id))
    );


-- ============================================================
-- 2d. report_status_log
-- ============================================================
drop policy if exists statuslog_select on public.report_status_log;
create policy statuslog_select on public.report_status_log
    for select to authenticated
    using (public.is_admin() or public.pemilik_laporan(report_id));


-- ============================================================
-- 2e. chat_sessions — (select auth.uid())
-- ============================================================
drop policy if exists chat_sessions_select_own on public.chat_sessions;
create policy chat_sessions_select_own on public.chat_sessions
    for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists chat_sessions_insert_own on public.chat_sessions;
create policy chat_sessions_insert_own on public.chat_sessions
    for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists chat_sessions_delete_own on public.chat_sessions;
create policy chat_sessions_delete_own on public.chat_sessions
    for delete to authenticated using (user_id = (select auth.uid()));


-- ============================================================
-- 2f. chat_messages — lewat helper pemilik_sesi_chat
-- ============================================================
drop policy if exists chat_messages_select_own on public.chat_messages;
create policy chat_messages_select_own on public.chat_messages
    for select to authenticated using (public.pemilik_sesi_chat(session_id));

drop policy if exists chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own on public.chat_messages
    for insert to authenticated with check (public.pemilik_sesi_chat(session_id));

drop policy if exists chat_messages_delete_own on public.chat_messages;
create policy chat_messages_delete_own on public.chat_messages
    for delete to authenticated using (public.pemilik_sesi_chat(session_id));


-- ============================================================
-- 2g. chat_feedback — (select auth.uid())
-- ============================================================
drop policy if exists chat_feedback_insert_own on public.chat_feedback;
create policy chat_feedback_insert_own on public.chat_feedback
    for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists chat_feedback_select_own on public.chat_feedback;
create policy chat_feedback_select_own on public.chat_feedback
    for select to authenticated using (user_id = (select auth.uid()));


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
values ('20260101000600', 'indeks_dan_policy')
on conflict (version) do nothing;
