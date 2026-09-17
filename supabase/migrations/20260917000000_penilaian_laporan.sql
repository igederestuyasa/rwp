-- ============================================================
-- Penilaian penanganan laporan (rating pelapor)
-- ------------------------------------------------------------
-- Setelah laporan berstatus final (Selesai / Ditutup), pelapor boleh
-- memberi 1–5 bintang dan komentar opsional, SATU kali per laporan.
-- Dibaca dari /laporan/[id]; admin melihatnya di /dashboard sebagai
-- agregat harian, sama seperti rating asisten (chat_feedback).
--
-- PRINSIP PRIVASI (CLAUDE.md §9.1):
--  - Tabel TIDAK menyimpan user_id. Kepemilikan diturunkan dari
--    reports.reporter_id lewat helper definer, jadi baris penilaian tidak
--    menambah salinan identitas pelapor.
--  - Admin TIDAK punya policy select. Rating hanya keluar sebagai agregat
--    (tanggal × bintang × jumlah) lewat get_report_feedback_summary.
--    Komentar dan report_id tidak pernah ikut ke agregat.
--  - Tidak ada policy update/delete: penilaian bersifat final.
--
-- Idempotent dan tidak memuat perintah penghapusan data. Versi migrasi
-- TIDAK dicatat dari dalam berkas (lihat supabase/README.md).
-- ============================================================

create table if not exists public.report_feedback (
    -- Primary key = report_id → satu penilaian per laporan, ditegakkan DB.
    report_id  uuid primary key references public.reports(id) on delete cascade,
    stars      int not null check (stars between 1 and 5),
    comment    text,
    created_at timestamptz not null default now()
);
create index if not exists idx_report_feedback_created on public.report_feedback (created_at);

alter table public.report_feedback enable row level security;

-- Boleh menilai: pemilik laporan DAN laporan sudah final. Security definer
-- dengan pola yang sama seperti pemilik_laporan, supaya policy tidak memicu
-- RLS `reports` berlapis.
create or replace function public.boleh_nilai_laporan(p_report_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.reports r
        where r.id = p_report_id
          and r.reporter_id = (select auth.uid())
          and r.status in ('Selesai', 'Ditutup')
    );
$$;
revoke all on function public.boleh_nilai_laporan(uuid) from public;
grant execute on function public.boleh_nilai_laporan(uuid) to authenticated;

-- Pelapor membaca penilaiannya sendiri (untuk menampilkan "sudah dinilai").
drop policy if exists report_feedback_select_own on public.report_feedback;
create policy report_feedback_select_own on public.report_feedback
    for select to authenticated using (public.pemilik_laporan(report_id));

drop policy if exists report_feedback_insert_own on public.report_feedback;
create policy report_feedback_insert_own on public.report_feedback
    for insert to authenticated with check (public.boleh_nilai_laporan(report_id));

-- Agregat untuk dashboard admin — bentuk keluarannya sama persis dengan
-- get_chat_feedback_summary supaya panel dashboard yang sama bisa dipakai.
create or replace function public.get_report_feedback_summary(p_start date, p_end date)
returns table (log_date date, stars int, count bigint)
language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then
        raise exception 'Akses ditolak';
    end if;

    return query
        select date(rf.created_at at time zone 'Asia/Jakarta') as log_date,
               rf.stars,
               count(*)::bigint
        from public.report_feedback rf
        where date(rf.created_at at time zone 'Asia/Jakarta') between p_start and p_end
        group by 1, 2
        order by 1, 2;
end;
$$;
