-- ============================================================
-- RWP Hutama Karya — Profil pengguna demo
-- ------------------------------------------------------------
-- Jalankan KETIGA, setelah 02_storage.sql.
--
-- PRASYARAT: akun Auth-nya harus sudah dibuat lebih dulu di
-- Supabase Dashboard > Authentication > Users (centang "Auto Confirm User"),
-- dengan email persis seperti di bawah. Skrip ini hanya menautkan profil
-- aplikasi ke akun Auth berdasarkan email.
--
-- Password demo yang dipakai selama ini: Password123!
-- ⚠️ Akun demo BUKAN untuk produksi.
--
-- Tiga peran yang ada di app RWP:
--   karyawan       → melapor & melacak laporannya sendiri
--   admin RWP      → menangani semua laporan, TIDAK bisa membuka identitas
--   admin superior → menangani + berwenang mengeskalasi identitas (teraudit)
-- ============================================================

insert into public.users (id, nik, nama, email, role, sub_role, can_escalate)
select a.id, v.nik, v.nama, v.email, v.role, v.sub_role, v.can_escalate
from (values
    ('EMP001', 'Budi Santoso',  'budi@hutamakarya.co.id',      'karyawan', null,       false),
    ('ADM001', 'Admin RWP',     'admin.rwp@hutamakarya.co.id', 'admin',    'rwp',      false),
    ('ADM002', 'Admin Superior','admin@hutamakarya.co.id',     'admin',    'superior', true)
) as v(nik, nama, email, role, sub_role, can_escalate)
join auth.users a on a.email = v.email
on conflict (id) do nothing;

-- Verifikasi — harus mengembalikan 3 baris.
select nik, nama, email, role, sub_role, can_escalate
from public.users
order by nik;
