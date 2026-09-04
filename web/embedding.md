# Embedding & Retrieval Best Practices for HR SOP / Policy RAG

## Tujuan

Dokumen ini berisi praktik terbaik untuk membangun sistem Retrieval-Augmented Generation (RAG) berbasis SOP, kebijakan, dan dokumen Human Resources agar menghasilkan retrieval yang akurat, konsisten, dan mudah dipelihara.

> **Catatan revisi (2026-06-07):** Bagian "10. Similarity Threshold" telah dikoreksi
> berdasarkan pengukuran empiris pada implementasi nyata (text-embedding-3-small +
> pgvector cosine). Angka threshold lama (0.70-0.80) terbukti TIDAK berlaku untuk
> kasus query pendek vs chunk prosa, dan akan memfilter habis semua hasil relevan.
> Lihat penjelasan lengkap di bagian tersebut.

---

# Prinsip Utama

Dalam sistem RAG, kualitas retrieval lebih banyak ditentukan oleh:

- Struktur corpus
- Chunking strategy
- Metadata design
- Retrieval pipeline

dibandingkan oleh model embedding itu sendiri.

Urutan prioritas optimasi yang direkomendasikan:

1. Chunking berdasarkan heading/section
2. Metadata yang terstruktur
3. Hybrid Search (BM25 + Embedding)
4. Reranking
5. Similarity threshold tuning (**WAJIB dikalibrasi dari data, bukan dari angka umum**)
6. Penggantian embedding model

---

# 1. Struktur Dokumen Sebelum Embedding

## Hindari

Melakukan embedding langsung terhadap PDF atau dokumen utuh tanpa struktur, lalu dipecah hanya berdasarkan jumlah karakter.

Contoh yang dihindari:

```
KEBIJAKAN CUTI
1. Tujuan
2. Ruang Lingkup
3. Definisi
4. Cuti Tahunan
5. Cuti Melahirkan
6. Cuti Sakit
7. Prosedur Pengajuan
```

Lalu dipecah secara otomatis berdasarkan jumlah karakter (mis. potong tiap 1000 karakter). Cara ini membuat satu chunk bisa memuat beberapa topik berbeda, atau memotong satu topik di tengah.

## Disarankan

Pisahkan berdasarkan topik atau heading.

```
### Chunk A — Cuti Tahunan
### Chunk B — Cuti Melahirkan
### Chunk C — Cuti Sakit
### Chunk D — Prosedur Pengajuan
```

**Prinsip: satu chunk = satu topik.**

---

# 2. Metadata yang Direkomendasikan

Setiap chunk sebaiknya memiliki metadata standar.

```json
{
  "document_type": "SOP",
  "department": "HR",
  "category": "Leave Management",
  "sub_category": "Annual Leave",
  "version": "3.0",
  "status": "active",
  "effective_date": "2025-01-01",
  "source": "SOP-HR-001"
}
```

Metadata memungkinkan filtering sebelum semantic search dilakukan.

Contoh:

```
User Query: "Bagaimana cara mengajukan cuti tahunan?"
Filter: category = Leave Management
→ baru dilakukan vector search
```

---

# 3. Hierarchical Chunking

Untuk SOP dan policy, gunakan struktur parent-child.

- **Parent:** SOP Cuti Karyawan
- **Child:** Hak Cuti Tahunan, Cuti Melahirkan, Cuti Sakit, Alur Persetujuan

Strategi retrieval:

```
Search Child Chunk
↓
Retrieve Parent Context
↓
Send to LLM
```

Pendekatan ini banyak digunakan pada sistem enterprise knowledge base. Untuk corpus kecil (pilot), pendekatan ini sering belum diperlukan.

---

# 4. Sertakan Judul Dalam Chunk

## Kurang Optimal

```
Karyawan berhak mendapatkan cuti tahunan sebanyak...
```

## Direkomendasikan

```
Title: SOP Cuti Tahunan
Section: Hak Cuti Tahunan

Karyawan berhak mendapatkan cuti tahunan sebanyak...
```

Judul dan nama section membantu embedding memahami konteks dokumen. Ini penting terutama untuk chunk yang berada di TENGAH dokumen — tanpa judul, chunk "yatim" kehilangan konteks dan skor relevansinya turun.

---

# 5. Tambahkan Keywords atau Synonyms

User dapat menggunakan istilah yang berbeda untuk topik yang sama.

```json
{
  "keywords": ["cuti tahunan", "annual leave", "leave", "izin cuti", "jatah cuti"]
}
```

Selain sebagai metadata, sinonim juga bisa ditulis langsung sebagai teks dalam chunk (mis. dokumen glosarium). Untuk retrieval berbasis embedding, menanam sinonim dalam teks sama efektifnya dengan metadata keywords, karena ikut ter-embed.

---

# 6. Gunakan Heading-Aware Chunking

## Hindari

```
1000 characters, overlap 200
```

sebagai SATU-SATUNYA strategi chunking.

## Gunakan

Pemecahan berdasarkan: BAB, Pasal, Heading, Section, Subsection, Policy Area.

Karena struktur SOP biasanya sudah merepresentasikan konteks yang jelas. Boleh tetap menerapkan batas maksimum karakter sebagai pengaman, tapi titik potong utama harus mengikuti heading — bukan sekadar hitungan karakter.

---

# 7. Kelola Versi Dokumen

Policy HR sering mengalami perubahan. Tambahkan metadata:

```json
{ "version": "4.0", "status": "active" }
```

Saat retrieval, filter `status = active` sehingga dokumen lama tidak muncul dalam jawaban.

---

# 8. Hybrid Search

Untuk dokumen HR, pertimbangkan kombinasi BM25 + Embedding Search.

Alasan: embedding sering kurang efektif untuk pencarian exact-match seperti kode dokumen (mis. `HK-HR-014`, `FRM-HR-021`), sedangkan BM25 sangat baik untuk keyword exact match.

```
User Query → Hybrid Search (BM25 + Embedding) → Top Results → LLM
```

**Kapan diperlukan:** terutama saat user sering mencari berdasarkan nomor/kode dokumen, atau corpus sudah besar. Untuk corpus kecil tanpa kebutuhan exact-code lookup, embedding murni biasanya sudah cukup.

---

# 9. Tambahkan Reranker Untuk Corpus Besar

Jika ukuran corpus > 500 SOP ATAU > 10.000 chunk, tambahkan reranking.

```
Embedding Search → Top 20 → Reranker → Top 5 → LLM
```

Reranker biasanya memberikan peningkatan kualitas retrieval yang signifikan. **Untuk corpus kecil (di bawah angka di atas), reranker umumnya belum sepadan dengan tambahan kompleksitas & latensi.**

---

# 10. Similarity Threshold (DIKOREKSI)

> ⚠️ **KOREKSI PENTING.** Versi sebelumnya dokumen ini merekomendasikan threshold
> 0.70-0.80 dan menyebut 0.45 "terlalu permisif". Ini TERBUKTI SALAH untuk kasus
> umum RAG policy. Penjelasannya di bawah.

## Mengapa angka 0.70-0.80 menyesatkan

Tabel interpretasi similarity yang sering beredar:

```
>0.90        Hampir identik
0.85 - 0.90  Sangat relevan
0.80 - 0.85  Relevan
0.70 - 0.80  Masih baik untuk RAG
<0.50        Berpotensi banyak noise
```

Tabel ini hanya valid saat membandingkan **dua teks dengan panjang dan gaya yang mirip** (mis. kalimat vs kalimat). Pada RAG policy, yang dibandingkan adalah:

```
Query user  : "cuti berapa hari?"          (pendek, gaya tanya)
Chunk dokumen: "Karyawan berhak atas 12..." (panjang, gaya prosa formal)
```

Asimetri panjang & gaya ini **menurunkan nilai cosine similarity secara sistematis**, walaupun maknanya sangat relevan. Akibatnya skor "relevan" pada RAG policy nyata umumnya jatuh di rentang **0.40-0.65**, BUKAN 0.70-0.90.

## Bukti empiris (text-embedding-3-small + pgvector cosine)

Pengukuran pada corpus policy/aplikasi HR nyata (~90 chunk), similarity = `1 - cosine_distance`:

```
Query RELEVAN  → terendah ~0.40 · rata-rata ~0.55 · TERTINGGI ~0.64
Query NOISE    → terendah ~0.26 · rata-rata ~0.29 · tertinggi ~0.34
```

Artinya: jika threshold di-set 0.70 sesuai rekomendasi lama, **100% hasil relevan ikut terbuang** dan sistem menjadi buta total.

## Rekomendasi yang benar

1. **JANGAN pakai angka threshold dari tabel umum.** Angka itu tergantung metrik jarak (cosine vs dot vs L2), normalisasi embedding, model, dan asimetri panjang query↔chunk.
2. **Kalibrasi dari data.** Jalankan sekumpulan query relevan + query noise, catat distribusi skor top-1, lalu set threshold di **titik tengah antara noise tertinggi dan relevan terendah**.
3. Pada contoh di atas, titik tengah ≈ **0.37** (antara noise ~0.34 dan relevan ~0.40).
4. Top-K = 5 sampai 10 tetap masuk akal.
5. Ulangi kalibrasi setiap kali corpus, model embedding, atau strategi chunking berubah.

> Intinya: threshold adalah parameter yang **diukur**, bukan **dihafal**.

---

# 11. Evaluasi Retrieval

Jangan hanya mengevaluasi jawaban LLM — evaluasi juga retrieval-nya.

Contoh benchmark:

```
Query              Expected Document
Cuti Tahunan       SOP Cuti Tahunan
Cuti Sakit         SOP Cuti Sakit
Medical Claim      SOP Medical Benefit
Perjalanan Dinas   SOP Business Travel
```

Metrik yang direkomendasikan: Recall@5, Recall@10, Mean Reciprocal Rank (MRR).

Target utama: dokumen yang benar harus ditemukan SEBELUM LLM menghasilkan jawaban.

Bentuk paling sederhana dari evaluasi ini: script diagnostik yang mencetak top-K chunk + skor similarity untuk sekumpulan query uji (relevan & noise). Ini sekaligus menjadi alat kalibrasi threshold di bagian 10.

---

# Arsitektur yang Direkomendasikan

```
User Query
↓
Metadata Filter        (opsional, saat corpus besar)
↓
Hybrid Search          (BM25 + Embedding; embedding murni cukup utk corpus kecil)
↓
Top 20
↓
Reranker               (opsional, hanya untuk corpus besar)
↓
Top 5
↓
Similarity Threshold   (dikalibrasi dari data — bukan angka umum)
↓
LLM
↓
Final Answer
```

---

# Kesimpulan

Retrieval yang baik berasal dari corpus yang terstruktur dengan baik.

Fokus utama, berurutan:

1. Chunking berdasarkan section (1 chunk = 1 topik)
2. Sertakan judul/section di tiap chunk
3. Metadata yang lengkap
4. Hybrid search & reranking (saat skala menuntut)
5. **Evaluasi retrieval + kalibrasi threshold dari data**

Sebelum mempertimbangkan upgrade embedding model. Dan ingat: **angka similarity threshold harus diukur dari data Anda sendiri, bukan disalin dari tabel umum.**
