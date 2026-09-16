# RWP Hutama Karya — Pitch Deck
> PT Hutama Karya (Persero) · Divisi Human Capital

---

## 1. Opening

**"Kanal resmi yang membuat karyawan berani melapor — dan membuat tim HC bisa menanganinya dengan terukur."**

---

## 2. Masalah (Why)

1. **Tidak ada kanal yang terasa aman.** Melaporkan insiden Respectful Workplace Policy hari ini berjalan lewat jalur informal — obrolan, atasan langsung, pesan pribadi. Tidak ada jaminan kerahasiaan, jadi banyak yang memilih diam.
2. **Karyawan tidak yakin apa yang mereka alami termasuk pelanggaran.** Handbook RWP ada, tetapi tidak dibaca. Batas antara "kritik keras" dan "perundungan" kabur.
3. **Tim HC tidak punya visibilitas.** Tanpa pencatatan terpusat, tidak ada cara mengetahui berapa laporan masuk, seberapa cepat ditangani, atau kategori apa yang paling sering muncul.

> **Akibatnya:** insiden RWP *underreported*, sosialisasi kebijakan tidak merata, dan perusahaan kehilangan sinyal dini soal iklim kerjanya sendiri.

---

## 3. Solusi (What)

**RWP Hutama Karya** — web app internal khusus Respectful Workplace Policy.

| Fungsi | Untuk siapa | Apa yang bisa dilakukan |
|---|---|---|
| **Pelaporan insiden** | Karyawan | Lapor anonim atau teridentifikasi, lampirkan bukti, lacak status, berkomunikasi dengan admin |
| **Kebijakan RWP** | Karyawan | Baca handbook lengkap: definisi, 7 kategori pelanggaran, 21 contoh kasus nyata, sanksi |
| **Sahabat RWP** | Karyawan | Tanya kebijakan dengan bahasa sehari-hari — dijawab AI berdasarkan handbook resmi |
| **Layanan Psikologi** | Karyawan | 6 kanal langsung: careline 24/7, WhatsApp, psikolog internal, Naluri, screening |
| **Dashboard** | Admin HC | Status, tren laporan masuk, sebaran kategori insiden, proporsi anonim, unduh laporan periodik |

---

## 4. Cara Kerja (How)

### Alur karyawan
```
Login → Beranda
  ├── Baca Kebijakan RWP        (memahami dulu)
  ├── Tanya Sahabat RWP          (ragu? tanya tanpa melapor)
  ├── Lapor Insiden              (form + bukti + opsi anonim → nomor tiket)
  ├── Lacak Laporan              (status + riwayat + chat dengan admin)
  └── Layanan Psikologi          (butuh dukungan, belum siap melapor)
```

### Alur admin
```
Login → Dashboard
  └── Daftar Laporan → detail → ubah status (2 tahap, tercatat) → balas pelapor
       └── Admin Superior: eskalasi identitas (wajib beralasan, masuk audit log)
```

### Teknologi
- **Frontend:** Next.js + TypeScript — jalan di browser, tidak perlu instalasi.
- **Backend:** Supabase — database, autentikasi, penyimpanan berkas terenkripsi.
- **AI:** RAG — asisten hanya menjawab dari dokumen kebijakan yang diunggah, tidak mengarang, dan tidak punya akses ke isi laporan siapa pun.

---

## 5. Kenapa orang mau memakainya

### 🔒 Privasi yang dibangun ke dalam sistem, bukan dijanjikan
- Identitas pelapor disimpan **terpisah** dari isi laporan di level database.
- Aturan aksesnya ditegakkan **di database**, bukan sekadar disembunyikan di tampilan.
- Membuka identitas pelapor anonim hanya bisa dilakukan admin berwenang, wajib beralasan, **tercatat di audit log — dan terlihat oleh pelapor**.
- Berkas bukti disimpan di penyimpanan privat, diakses lewat tautan sementara 10 menit.

### 🤖 Menurunkan hambatan sebelum melapor
Banyak orang urung melapor bukan karena takut, tapi karena tidak yakin. Sahabat RWP
menjawab "apakah ini termasuk pelanggaran?" tanpa mengharuskan siapa pun membuka diri
lebih dulu.

### 📊 Data untuk keputusan
Kategori insiden yang paling sering muncul, waktu penanganan rata-rata, proporsi
laporan anonim — semuanya terukur, dan bisa diunduh sebagai PDF/Excel per periode.

---

## 6. Kenapa sekarang

- **RWP bukan opsional** — standar tata kelola menuntut kanal pelaporan yang aman dan teraudit.
- **Biaya operasional sangat rendah** — estimasi AI di bawah Rp400 ribu/bulan untuk 1.000 pertanyaan/hari.
- **Sudah jalan, bukan konsep** — seluruh alur karyawan dan admin bisa didemokan hari ini.

---

## 7. Status & Roadmap

### Sekarang (pilot internal)
- ✅ Alur pelaporan lengkap: anonim, bukti, pelacakan, percakapan
- ✅ Eskalasi identitas yang teraudit dan transparan ke pelapor
- ✅ Handbook RWP + asisten berbasis dokumen resmi
- ✅ Dashboard admin + unduh laporan periodik
- ✅ Dark mode, tampilan mobile

### Setelah pilot
- Deploy ke domain resmi HK
- Integrasi SSO perusahaan
- Notifikasi real-time
- Tinjauan compliance PII & kebijakan retensi data

---

## 8. Penutup

> **Ini bukan kotak pengaduan.**
> Ini infrastruktur kepercayaan: tempat karyawan bisa memahami, bertanya, dan melapor
> tanpa harus mempertaruhkan rasa amannya.

**Yang kami minta:** lampu hijau untuk pilot terbatas → validasi dengan pengguna nyata → iterasi.
