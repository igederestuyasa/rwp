---
doc_id: panduan-admin
---
# Panduan Aplikasi RWP Hutama Karya untuk Admin

Dokumen ini menjelaskan fitur aplikasi RWP Hutama Karya dari sisi admin RWP dan
admin superior di Divisi Human Capital.

## Peran admin

- **Admin RWP** menangani laporan: membaca laporan yang masuk, mengubah status,
  menambahkan catatan dan lampiran, membalas percakapan pelapor, dan mengelola
  pengetahuan asisten di menu Korpus AI. Admin RWP **tidak** melihat identitas
  pelapor, baik laporan anonim maupun bukan.
- **Admin Superior** memiliki semua kemampuan admin RWP, ditambah melihat identitas
  pelapor non-anonim, membuka identitas pelapor anonim lewat eskalasi yang
  tercatat, dan mengunduh laporan periodik.

Admin tidak dapat membuat laporan. Halaman Lapor Insiden mengarahkan admin kembali
ke Dashboard.

## Menu untuk admin

- **Dashboard**: ringkasan angka dan grafik.
- **Daftar Laporan**: seluruh laporan RWP dan halaman detailnya.
- **Sahabat RWP**: asisten AI, sama seperti yang dipakai karyawan.
- **Korpus AI**: mengelola dokumen yang dipelajari asisten.
- **Pengaturan** dan **Bantuan**.

## Dashboard

Dashboard menampilkan jumlah total laporan, jumlah laporan anonim, jumlah laporan
per status, tren laporan masuk per periode, sebaran kategori insiden, dan ringkasan
penilaian pengguna terhadap asisten. Kotak status dapat diklik untuk membuka Daftar
Laporan yang sudah tersaring.

Admin superior juga melihat tombol **unduh laporan periodik**: pilih rentang bulan,
lalu unduh sebagai PDF atau Excel. Isinya rekap agregat dan detail laporan tanpa
identitas pelapor.

## Daftar Laporan

Menu **Daftar Laporan** memuat seluruh laporan dengan pencarian, penyaring status,
dan penyaring tanggal. Arahkan kursor ke sebuah baris untuk melihat ringkasannya di
panel kanan, lalu buka untuk masuk ke halaman detail.

## Halaman detail laporan

Halaman detail memuat kronologi, bukti, Riwayat Status, dan percakapan dengan
pelapor. Identitas pelapor tidak tampil untuk admin RWP. Untuk admin superior, nama
dan NIK tampil hanya bila pelapor tidak memilih anonim.

### Mengubah status

Perubahan status berjalan dua tahap: isi status baru beserta catatan dan lampiran
bila perlu, tinjau ringkasannya, lalu konfirmasi. Alur status yang diizinkan:

- Diterima menjadi Sedang Ditinjau, atau Ditutup.
- Sedang Ditinjau menjadi Tindak Lanjut, atau Ditutup.
- Tindak Lanjut menjadi Selesai, atau Ditutup.
- Selesai dan Ditutup adalah status akhir.

Status **Ditutup wajib disertai alasan**, dan alasan itu terbaca oleh pelapor di
Riwayat Status laporannya. Setiap perubahan status tercatat di Riwayat Status
beserta siapa yang mengubah dan kapan.

### Membuka kembali laporan

Laporan yang sudah Selesai atau Ditutup dapat dibuka kembali. Alasan wajib diisi dan
tercatat di Riwayat Status dengan penanda "Dibuka kembali". Setelah dibuka kembali,
laporan kembali ke status Sedang Ditinjau dan tanggal penyelesaiannya dikosongkan.

### Percakapan dengan pelapor

Kolom percakapan di halaman detail dipakai untuk bertanya atau memberi kabar kepada
pelapor. Pesan boleh disertai lampiran. Percakapan berjalan tanpa admin perlu tahu
identitas pelapor, dan pelapor mendapat notifikasi saat ada balasan.

### Eskalasi identitas

Bila penanganan benar-benar menuntut identitas pelapor anonim, hanya **admin
superior** yang dapat membukanya. Alasan wajib dituliskan. Pembukaan ini dicatat di
Riwayat Status dengan penanda eskalasi identitas, dan catatan itu **terlihat oleh
pelapor**. Ini keputusan transparansi yang disengaja.

## Korpus AI: mengelola pengetahuan asisten

Menu **Korpus AI** adalah tempat admin mengelola dokumen yang dipelajari Sahabat
RWP, tanpa perlu bantuan teknis. Korpus hanya boleh berisi dokumen kebijakan dan
panduan. **Jangan pernah mengunggah isi laporan atau data pelapor** ke korpus.

### Mengunggah dokumen

Pilih atau seret berkas **.md** atau **.txt**, maksimal 10 MB, ke kotak unggah.
Setelah tersimpan, dokumen otomatis diproses: teksnya dipecah menjadi potongan,
tiap potongan diubah menjadi representasi yang dipahami asisten, lalu disimpan.
Progresnya tampil per potongan. Pemrosesan berjalan bertahap, jadi jangan tutup
halaman sampai statusnya Selesai.

Tulislah dokumen dengan judul dan sub-judul yang rapi (satu judul untuk satu
topik). Pemecahan potongan mengikuti judul, sehingga dokumen yang terstruktur
menghasilkan jawaban yang lebih tepat.

### Mengirim isi kebijakan ke korpus

Di bagian **Dari halaman Kebijakan**, kebijakan yang sudah terbit dapat dikirim ke
korpus dengan satu tombol. Dengan begitu, jawaban asisten selalu sama dengan
handbook yang dibaca karyawan di menu Kebijakan RWP.

### Membaca isi korpus

Klik sebuah dokumen atau tekan **Lihat isi** untuk membaca:

- **Teks asli**: dokumen sumber sebagaimana diunggah.
- **Potongan**: teks persis seperti yang dibaca asisten saat menjawab, lengkap
  dengan penanda judul dan bagiannya. Tampilan ini berguna untuk memahami mengapa
  asisten menjawab dengan cara tertentu.

### Memproses ulang dan menghapus

Dokumen yang gagal atau berubah dapat diproses ulang. Dokumen yang tidak lagi
relevan dapat dihapus, dan asisten berhenti memakainya seketika. Dokumen bertanda
**Warisan** berasal dari proses lama di luar aplikasi: isinya tetap dipakai, tetapi
tidak dapat diproses ulang karena berkas aslinya tidak tersimpan; dokumen seperti
ini hanya dapat dihapus.

### Status dokumen

- **Menunggu**: sudah diunggah, belum diproses.
- **Diproses**: sedang dipecah dan disematkan.
- **Selesai**: siap dipakai asisten.
- **Gagal**: pemrosesan gagal, alasannya tampil di panel detail. Coba proses lagi
  atau hapus dokumen.

## Notifikasi untuk admin

Ikon lonceng menampilkan notifikasi saat ada laporan baru masuk dan saat pelapor
mengirim pesan baru. Preferensi notifikasi diatur di menu Pengaturan.

## Pengaturan

Sama seperti karyawan: tema terang atau gelap, preferensi notifikasi (termasuk
notifikasi laporan baru untuk admin), dan ganti kata sandi.
