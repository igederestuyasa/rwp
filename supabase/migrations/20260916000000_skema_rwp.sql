-- ============================================================
-- RWP Hutama Karya — Skema database (Supabase / Postgres)
-- ------------------------------------------------------------
-- SATU migrasi untuk seluruh skema. Ini gabungan dari enam migrasi
-- terdahulu (baseline, storage, korpus admin, chunk_index, pengerasan
-- RLS, indeks & policy) yang sudah dilebur ke keadaan akhirnya supaya
-- pemasangan dari nol cukup satu berkas. Lihat supabase/README.md untuk
-- cara menjalankannya dan untuk database yang sudah pernah memakai enam
-- migrasi lama.
--
-- Idempotent: aman dijalankan ulang di database yang sudah terisi
-- (`if not exists`, `drop policy if exists`, `create or replace`).
-- Tidak ada perintah yang menghapus data.
--
-- Aplikasi ini hanya menangani satu jalur: pelaporan RWP. Pembeda hak
-- akses admin cuma satu, yaitu users.can_escalate (boleh membuka
-- identitas pelapor).
--
-- PRINSIP PRIVASI (CLAUDE.md §9.1):
--  - reporter_id disimpan (anti-spam & tindak lanjut) tapi TIDAK pernah
--    ikut ke aplikasi admin. Admin membaca lewat view v_reports_admin
--    dan TIDAK punya policy select pada tabel reports.
--  - Identitas pelapor hanya terbaca oleh admin ber-can_escalate, dan
--    pembukaan identitas laporan anonim WAJIB lewat RPC reveal_reporter
--    yang mencatat siapa/kapan/alasan di report_status_log.
-- ============================================================

create extension if not exists vector;
create extension if not exists pgcrypto;


-- ============================================================
-- 1. TABEL
-- ============================================================

-- users — profil aplikasi, 1:1 dengan auth.users.
-- Profil dibuat lewat seed / SQL Editor / skrip service_role, BUKAN oleh
-- aplikasi: tidak ada policy insert/update untuk pengguna (§9.2).
create table if not exists public.users (
    id           uuid primary key references auth.users(id) on delete cascade,
    nik          text unique not null,
    nama         text not null,
    email        text,
    role         text not null default 'karyawan' check (role in ('karyawan', 'admin')),
    -- sub_role hanya untuk admin. 'rwp' = admin penanganan biasa,
    -- 'superior' = admin yang juga berwenang mengeskalasi identitas.
    -- Wewenang sesungguhnya ada di can_escalate; sub_role hanya label.
    sub_role     text check (sub_role in ('superior', 'rwp')),
    can_escalate boolean not null default false,
    created_at   timestamptz not null default now()
);

-- reports — laporan RWP
create sequence if not exists public.report_ticket_seq;

create table if not exists public.reports (
    id              uuid primary key default gen_random_uuid(),
    ticket_no       text unique not null default '',
    reporter_id     uuid not null references public.users(id),
    -- Kategori dibatasi di level DB agar tidak bisa melenceng dari
    -- KATEGORI_INSIDEN di src/lib/constants.ts. Pernah terjadi: seed
    -- memakai "Perundungan (bullying)" sehingga chart kategori kosong.
    kategori        text not null check (kategori in (
                        'Diskriminasi', 'Kekerasan', 'Pelecehan', 'Perundungan',
                        'Bias Gender', 'Eksklusivitas', 'Lainnya')),
    judul           text not null,
    kronologi       text not null,
    tanggal_kejadian date not null,
    lokasi          text,
    terlapor        text,
    is_anonymous    boolean not null default false,
    status          text not null default 'Diterima' check (status in (
                        'Diterima', 'Sedang Ditinjau', 'Tindak Lanjut',
                        'Selesai', 'Ditutup')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    resolved_at     timestamptz
);

create index if not exists idx_reports_reporter on public.reports (reporter_id);
create index if not exists idx_reports_status   on public.reports (status);
create index if not exists idx_reports_kategori on public.reports (kategori);

-- Nomor tiket otomatis: RWP-YYYY-0001
create or replace function public.set_ticket_no()
returns trigger language plpgsql as $$
begin
    if new.ticket_no = '' then
        new.ticket_no := 'RWP-' || to_char(now(), 'YYYY') || '-'
            || lpad(nextval('public.report_ticket_seq')::text, 4, '0');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_set_ticket_no on public.reports;
create trigger trg_set_ticket_no
    before insert on public.reports
    for each row execute function public.set_ticket_no();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
    before update on public.reports
    for each row execute function public.set_updated_at();

-- Lampiran, percakapan, dan audit trail laporan
create table if not exists public.report_evidence (
    id          uuid primary key default gen_random_uuid(),
    report_id   uuid not null references public.reports(id) on delete cascade,
    file_path   text not null,   -- path di bucket rwp-evidence (UUID, bukan nama asli)
    file_name   text,            -- nama asli, hanya untuk ditampilkan
    file_type   text,
    file_size   int,
    uploaded_at timestamptz not null default now()
);
create index if not exists idx_evidence_report on public.report_evidence (report_id);

create table if not exists public.report_messages (
    id          uuid primary key default gen_random_uuid(),
    report_id   uuid not null references public.reports(id) on delete cascade,
    sender_role text not null check (sender_role in ('karyawan', 'admin')),
    message     text not null default '',
    attachments text[] not null default '{}',  -- JSON {name,path} per elemen
    created_at  timestamptz not null default now()
);
create index if not exists idx_messages_report on public.report_messages (report_id);

create table if not exists public.report_status_log (
    id          uuid primary key default gen_random_uuid(),
    report_id   uuid not null references public.reports(id) on delete cascade,
    from_status text,
    to_status   text not null,
    changed_by  uuid references public.users(id),
    note        text,
    attachments text[] not null default '{}',
    created_at  timestamptz not null default now()
);
create index if not exists idx_statuslog_report      on public.report_status_log (report_id);
create index if not exists idx_status_log_changed_by on public.report_status_log (changed_by);

-- policies — konten halaman /kebijakan (dan sumber korpus asisten)
create table if not exists public.policies (
    id            text primary key,
    title         text not null,
    kategori      text not null,
    ringkas       text not null,
    body          text[] not null default '{}',
    markdown      text,
    -- Path PDF di bucket privat policy-docs. Dibaca kebijakan/page.tsx dan
    -- diproksikan /api/policy-pdf. Kolom ini WAJIB ada: PostgREST menolak
    -- seluruh query bila satu kolom yang di-select tidak ada, sehingga
    -- halaman /kebijakan gagal total kalau kolomnya hilang.
    pdf_path      text,
    is_published  boolean not null default true,
    display_order integer not null default 0,
    updated_at    timestamptz not null default now()
);
alter table public.policies add column if not exists pdf_path text;

-- rag_chunks — korpus asisten (HANYA dokumen kebijakan, §9.3)
create table if not exists public.rag_chunks (
    id          uuid primary key default gen_random_uuid(),
    source_doc  text not null,
    chunk_text  text not null,
    embedding   vector(1536),      -- text-embedding-3-small
    embed_model text default 'text-embedding-3-small',
    created_at  timestamptz not null default now(),
    -- Posisi potongan (0, 1, 2, …) di dokumen asalnya. Potongan disisipkan
    -- per batch sehingga created_at seragam; tanpa kolom ini urutan asli
    -- tidak bisa dipulihkan saat admin membaca isi korpus di /korpus.
    chunk_index integer
);
alter table public.rag_chunks add column if not exists chunk_index integer;

create index if not exists idx_rag_embedding
    on public.rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists rag_chunks_source_doc_idx
    on public.rag_chunks (source_doc);
create index if not exists rag_chunks_source_doc_index_idx
    on public.rag_chunks (source_doc, chunk_index);

-- corpus_documents — daftar dokumen yang membentuk pengetahuan AI,
-- dikelola admin dari halaman /korpus. source_doc adalah kunci yang
-- dipakai rag_chunks.source_doc (untuk unggahan baru nilainya = id::text).
create table if not exists public.corpus_documents (
    id            uuid primary key default gen_random_uuid(),
    nama          text not null,
    jenis         text not null check (jenis in ('md', 'txt', 'pdf', 'kebijakan')),
    source_doc    text not null unique,
    -- Path di bucket policy-docs. NULL untuk jenis 'kebijakan' (sumbernya
    -- tabel policies) dan untuk dokumen warisan tanpa berkas.
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
create index if not exists idx_corpus_documents_policy      on public.corpus_documents (policy_id);
create index if not exists idx_corpus_documents_dibuat_oleh on public.corpus_documents (dibuat_oleh);

drop trigger if exists trg_corpus_documents_updated_at on public.corpus_documents;
create trigger trg_corpus_documents_updated_at
    before update on public.corpus_documents
    for each row execute function public.set_updated_at();

-- Chunk yang pernah masuk tanpa baris corpus_documents (jalur skrip lama)
-- didaftarkan sebagai dokumen warisan supaya terlihat dan bisa dihapus dari
-- /korpus. Di database baru ini tidak melakukan apa-apa.
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

-- chat_* — riwayat percakapan asisten + rating.
-- Admin TIDAK boleh membaca isi chat per-orang (least privilege §9.2);
-- rating hanya keluar sebagai agregat lewat get_chat_feedback_summary.
create table if not exists public.chat_sessions (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    title      text not null default 'Percakapan baru',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_chat_sessions_user on public.chat_sessions (user_id, updated_at desc);

drop trigger if exists trg_chat_sessions_updated_at on public.chat_sessions;
create trigger trg_chat_sessions_updated_at
    before update on public.chat_sessions
    for each row execute function public.set_updated_at();

create table if not exists public.chat_messages (
    id         uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.chat_sessions(id) on delete cascade,
    role       text not null check (role in ('user', 'assistant')),
    content    text not null,
    sources    text[] not null default '{}',
    actions    jsonb,
    created_at timestamptz not null default now()
);
create index if not exists idx_chat_messages_session on public.chat_messages (session_id, created_at);

create table if not exists public.chat_feedback (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    session_id uuid references public.chat_sessions(id) on delete set null,
    stars      int not null check (stars between 1 and 5),
    comment    text,
    created_at timestamptz not null default now()
);
create index if not exists idx_chat_feedback_created on public.chat_feedback (created_at);
create index if not exists idx_chat_feedback_user    on public.chat_feedback (user_id);
create index if not exists idx_chat_feedback_session on public.chat_feedback (session_id);


-- ============================================================
-- 2. HELPER (SECURITY DEFINER — agar policy tidak rekursif ke RLS)
-- ============================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

create or replace function public.can_escalate()
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((select can_escalate from public.users where id = auth.uid()), false);
$$;

-- Pemilik laporan. Varian text dipakai policy storage (segmen path yang
-- bukan UUID tidak boleh melempar galat cast); varian uuid dipakai policy
-- tabel anak. Dipanggil dari policy supaya tidak memicu RLS `reports`
-- berlapis untuk setiap baris.
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
-- 3. RLS
-- ------------------------------------------------------------
-- Pelapor melihat miliknya sendiri. Admin melihat semua laporan, tetapi
-- HANYA lewat view v_reports_admin — tidak ada policy admin pada tabel
-- reports (mencegah reporter_id bocor lewat REST, §9.1). Perubahan status
-- hanya lewat RPC change_report_status. `(select auth.uid())` dipakai
-- supaya dievaluasi sekali per query, bukan per baris.
-- ============================================================
alter table public.users             enable row level security;
alter table public.reports           enable row level security;
alter table public.report_evidence   enable row level security;
alter table public.report_messages   enable row level security;
alter table public.report_status_log enable row level security;
alter table public.policies          enable row level security;
alter table public.rag_chunks        enable row level security;
alter table public.corpus_documents  enable row level security;
alter table public.chat_sessions     enable row level security;
alter table public.chat_messages     enable row level security;
alter table public.chat_feedback     enable row level security;

-- users — baris sendiri saja; tidak ada insert/update dari aplikasi
drop policy if exists users_insert_self on public.users;
drop policy if exists users_select on public.users;
create policy users_select on public.users
    for select to authenticated using (id = (select auth.uid()));

-- reports — pelapor saja; admin lewat view, status lewat RPC
drop policy if exists reports_update_admin on public.reports;
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
    for select to authenticated using (reporter_id = (select auth.uid()));

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
    for insert to authenticated with check (reporter_id = (select auth.uid()));

-- report_evidence
drop policy if exists evidence_select on public.report_evidence;
create policy evidence_select on public.report_evidence
    for select to authenticated
    using (public.is_admin() or public.pemilik_laporan(report_id));

drop policy if exists evidence_insert_own on public.report_evidence;
create policy evidence_insert_own on public.report_evidence
    for insert to authenticated
    with check (public.pemilik_laporan(report_id));

-- report_messages
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

-- report_status_log (tulis hanya lewat RPC)
drop policy if exists statuslog_select on public.report_status_log;
create policy statuslog_select on public.report_status_log
    for select to authenticated
    using (public.is_admin() or public.pemilik_laporan(report_id));

-- policies — karyawan membaca yang terbit; admin melihat draft dan menulis
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

-- rag_chunks — semua pengguna login membaca (dipakai RPC match_rag_chunks);
-- admin menulis/menghapus dari halaman /korpus dengan tokennya sendiri.
-- Ingest ulang = hapus chunk dokumen itu lalu sisipkan yang baru, jadi
-- tidak perlu policy update.
drop policy if exists rag_select_authenticated on public.rag_chunks;
create policy rag_select_authenticated on public.rag_chunks
    for select to authenticated using (auth.role() = 'authenticated');

drop policy if exists rag_admin_insert on public.rag_chunks;
create policy rag_admin_insert on public.rag_chunks
    for insert to authenticated with check (public.is_admin());

drop policy if exists rag_admin_delete on public.rag_chunks;
create policy rag_admin_delete on public.rag_chunks
    for delete to authenticated using (public.is_admin());

-- corpus_documents — hanya admin
drop policy if exists corpus_docs_admin_all on public.corpus_documents;
create policy corpus_docs_admin_all on public.corpus_documents
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- chat_* — pemilik saja. Admin sengaja TIDAK diberi akses baca.
drop policy if exists chat_sessions_select_own on public.chat_sessions;
create policy chat_sessions_select_own on public.chat_sessions
    for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists chat_sessions_insert_own on public.chat_sessions;
create policy chat_sessions_insert_own on public.chat_sessions
    for insert to authenticated with check (user_id = (select auth.uid()));

-- UPDATE wajib WITH CHECK: tanpa itu pemilik bisa memindahkan sesinya ke
-- user_id orang lain.
drop policy if exists chat_sessions_update_own on public.chat_sessions;
create policy chat_sessions_update_own on public.chat_sessions
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists chat_sessions_delete_own on public.chat_sessions;
create policy chat_sessions_delete_own on public.chat_sessions
    for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists chat_messages_select_own on public.chat_messages;
create policy chat_messages_select_own on public.chat_messages
    for select to authenticated using (public.pemilik_sesi_chat(session_id));

drop policy if exists chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own on public.chat_messages
    for insert to authenticated with check (public.pemilik_sesi_chat(session_id));

drop policy if exists chat_messages_delete_own on public.chat_messages;
create policy chat_messages_delete_own on public.chat_messages
    for delete to authenticated using (public.pemilik_sesi_chat(session_id));

drop policy if exists chat_feedback_insert_own on public.chat_feedback;
create policy chat_feedback_insert_own on public.chat_feedback
    for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists chat_feedback_select_own on public.chat_feedback;
create policy chat_feedback_select_own on public.chat_feedback
    for select to authenticated using (user_id = (select auth.uid()));


-- ============================================================
-- 4. v_reports_admin — satu-satunya jalan admin membaca laporan
-- ------------------------------------------------------------
-- Berjalan dengan hak pemilik (security_invoker = false) supaya RLS
-- `reports` yang hanya untuk pelapor tidak menghalangi; klausa WHERE
-- public.is_admin() adalah penjaganya, dan security_barrier memastikan
-- penyaring itu dievaluasi sebelum ekspresi lain.
--
-- reporter_id TIDAK pernah ikut ke view ini. reporter_name/reporter_nik
-- disembunyikan bila laporan anonim ATAU pembacanya tidak ber-can_escalate.
-- Penegakannya harus tetap di SQL, bukan di JSX: pernah terjadi
-- pembatasannya hanya di UI sementara payload REST memuat identitas.
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
-- 5. RPC
-- ============================================================

-- Ubah status + catat audit
create or replace function public.change_report_status(
    p_report_id   uuid,
    p_to_status   text,
    p_note        text default null,
    p_attachments text[] default '{}'
)
returns void language plpgsql security definer set search_path = public as $$
declare
    v_from  text;
    v_final boolean;
begin
    if not public.is_admin() then
        raise exception 'Hanya admin yang boleh mengubah status laporan.';
    end if;
    if p_to_status = 'Ditutup' and coalesce(trim(p_note), '') = '' then
        raise exception 'Status "Ditutup" wajib disertai catatan alasan.';
    end if;

    select status into v_from from public.reports where id = p_report_id;
    if v_from is null then
        raise exception 'Laporan tidak ditemukan.';
    end if;

    v_final := p_to_status in ('Selesai', 'Ditutup');

    update public.reports
       set status      = p_to_status,
           updated_at  = now(),
           resolved_at = case when v_final then now() else null end
     where id = p_report_id;

    insert into public.report_status_log
        (report_id, from_status, to_status, changed_by, note, attachments)
    values
        (p_report_id, v_from, p_to_status, auth.uid(), p_note,
         coalesce(p_attachments, '{}'));
end;
$$;

-- Eskalasi identitas pelapor (hanya can_escalate = true).
-- Prefix '[ESKALASI IDENTITAS] ' dibaca komponen Timeline untuk merender
-- baris audit berwarna amber. JANGAN ubah formatnya.
create or replace function public.reveal_reporter(
    p_report_id uuid,
    p_reason    text
)
returns table (nik text, nama text)
language plpgsql security definer set search_path = public as $$
declare
    v_reporter uuid;
begin
    if not public.can_escalate() then
        raise exception 'Akses ditolak: tidak berwenang membuka identitas pelapor.';
    end if;
    if coalesce(trim(p_reason), '') = '' then
        raise exception 'Alasan eskalasi wajib diisi.';
    end if;

    select reporter_id into v_reporter from public.reports where id = p_report_id;
    if v_reporter is null then raise exception 'Laporan tidak ditemukan.'; end if;

    insert into public.report_status_log (report_id, from_status, to_status, changed_by, note)
    select p_report_id, r.status, r.status, auth.uid(),
           '[ESKALASI IDENTITAS] ' || p_reason
    from public.reports r where r.id = p_report_id;

    return query
        select u.nik, u.nama from public.users u where u.id = v_reporter;
end;
$$;

-- Retrieval korpus asisten. Kolom keluaran eksplisit, jadi penambahan
-- kolom pada rag_chunks tidak mengubah kontraknya.
create or replace function public.match_rag_chunks(
    query_embedding vector(1536),
    match_count     int default 4
)
returns table (id uuid, source_doc text, chunk_text text, similarity float)
language sql stable as $$
    select id, source_doc, chunk_text,
           1 - (embedding <=> query_embedding) as similarity
    from public.rag_chunks
    order by embedding <=> query_embedding
    limit match_count;
$$;

-- Rating asisten — AGREGAT saja, tidak pernah baris individual
create or replace function public.get_chat_feedback_summary(p_start date, p_end date)
returns table (log_date date, stars int, count bigint)
language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then
        raise exception 'Akses ditolak';
    end if;

    return query
        select date(cf.created_at at time zone 'Asia/Jakarta') as log_date,
               cf.stars,
               count(*)::bigint
        from public.chat_feedback cf
        where date(cf.created_at at time zone 'Asia/Jakarta') between p_start and p_end
        group by 1, 2
        order by 1, 2;
end;
$$;


-- ============================================================
-- 6. STORAGE
-- ------------------------------------------------------------
--   rwp-evidence : bukti pelaporan & lampiran percakapan. Path berkas
--                  <report_id>/<uuid>.<ext> (lib/storage.ts), jadi segmen
--                  folder pertama adalah id laporan.
--   policy-docs  : PDF kebijakan + berkas korpus (.md/.txt) yang diunggah
--                  admin dari /korpus.
-- Batas ukuran & tipe di level bucket adalah lapis kedua setelah validasi
-- klien/route (§9.4) — validasi klien bisa dilewati lewat API langsung.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('rwp-evidence', 'rwp-evidence', false),
       ('policy-docs',  'policy-docs',  false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 10485760,          -- 10 MB
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
set file_size_limit = 10485760,          -- 10 MB
    allowed_mime_types = array[
        'application/pdf',
        'text/markdown', 'text/x-markdown', 'text/plain'
    ]
where id = 'policy-docs';

-- rwp-evidence — pemilik laporan atau admin. Admin mengunggah lampiran
-- perubahan status dan balasan percakapan; pelapor mengunggah bukti miliknya.
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

-- policy-docs — semua pengguna login membaca; admin menulis
drop policy if exists "policy_docs_read" on storage.objects;
create policy "policy_docs_read"
on storage.objects for select to authenticated
using (bucket_id = 'policy-docs');

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

-- Selesai. Lanjut ke seeds/ (opsional, hanya untuk demo/pilot).
--
-- Versi migrasi ini TIDAK dicatat dari dalam berkas: `supabase db push`
-- mencatatnya sendiri ke supabase_migrations.schema_migrations, dan
-- pencatatan ganda akan membuat push gagal. Kalau berkas ini dijalankan
-- lewat SQL Editor, lihat supabase/README.md untuk cara mencatatnya agar
-- CLI tidak mengulang.
