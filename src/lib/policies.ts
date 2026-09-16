// Kebijakan RWP — konten halaman /kebijakan.
// BUKAN data mock murni: dipakai sebagai data awal mode mock DAN fallback
// saat tabel `policies` di Supabase kosong/belum dimigrasi.

export interface PolicyDoc {
  id: string;
  title: string;
  kategori: string;
  ringkas: string;
  updated: string;
  body: string[];
  /** Konten lengkap dalam format Markdown. Kalau ada, dirender langsung (menggantikan body). */
  markdown?: string;
  /** Path file PDF di Supabase Storage (bucket privat). Kalau ada, ditampilkan sebagai embed (menggantikan markdown/body). */
  pdfPath?: string;
}

export const POLICIES: PolicyDoc[] = [
  {
    id: "rwp", title: "Respectful Workplace Policy (RWP)", kategori: "Hubungan Kerja",
    ringkas: "Handbook kebijakan lingkungan kerja saling menghargai — definisi, jenis pelanggaran, pencegahan, dan cara melapor.",
    updated: "2026-03-01",
    body: [],
    markdown: `## Chapter I: Landasan

### RWP itu apa sih?

> Respectful Workplace Policy (RWP) adalah kebijakan yang mengatur lingkungan kerja yang aman, inklusif, dan bebas dari diskriminasi yang bertujuan untuk melindungi harkat dan martabat karyawan. Sederhananya adalah gimana caranya kita bikin tempat kerja jadi asik dan nyaman buat semua orang. Bayangin tempat kerja yang semua orangnya saling respect, tidak ada bullying, tidak ada diskriminasi, semua orang dihargai latar belakangnya. Nah, itulah yang namanya Respectful Workplace Policy (RWP).

**Dasar hukum:**

1. Undang-Undang RI Nomor 39 Tahun 1999 tentang Hak Asasi Manusia
2. Undang-Undang RI Nomor 8 Tahun 2016 tentang Penyandang Disabilitas
3. Peraturan Menteri Ketenagakerjaan RI Nomor 5 Tahun 2018 tentang K3 Lingkungan Kerja
4. SE Kementerian BUMN Nomor SE-7/MBU/07/2020 tentang Core Values SDM BUMN
5. SE Kementerian BUMN Nomor SE-3/MBU/04/2022 tentang Kebijakan Berperilaku Saling Menghargai di Tempat Kerja
6. Keputusan Direksi PT Hutama Karya (Persero) Nomor 3681/KPTS/199.1/X/2021 tentang Komite Sanksi
7. Prosedur Pedoman Penghargaan dan Sanksi Nomor SP/HC/P/010 tanggal 19 September 2023

### Kenapa sih RWP itu penting?

1. Lingkungan kerja yang asik itu bisa buat karyawan jadi semangat sehingga ide-ide kreatif jadi mudah muncul.
2. Tim jadi solid kalau semua orang saling menghargai, kerjaan juga pasti jadi cepat selesai.
3. Kalau tempat kerjanya nyaman orang jadi betah kerja, nggak pingin pindah-pindah apalagi resign.
4. Kalau perusahaan punya RWP yang bagus dan testimoni orang-orang juga positif otomatis nama perusahaan juga jadi bagus.
5. Untuk kesehatan mental, karena jauh dari stres dan ga ada diskriminasi, karyawan jadi lebih sehat mentalnya. Mereka jadi lebih bahagia dan produktif.

### Gimana caranya mewujudkan Respectful Workplace?

1. **Komunikasi yang baik** — bicara jujur, terbuka, saling dengerin, nggak ada gibah-gibah atau gosip.
2. **Kerja sama tim** — saling bantu, diskusi atau saling tukar pendapat dan jangan ada yang merasa paling jago.
3. **Jangan membedakan** — semua orang itu sama, tidak peduli ras, agama, jenis kelamin, atau lainnya.
4. **Selesaikan masalah dengan baik** — jangan silent treatment atau marah berkepanjangan, harus cari solusi yang terbaik buat semua orang.

### Tujuan kita menciptakan RWP

1. Membangun budaya kerja yang positif dengan mendorong perilaku saling menghormati dan inklusif.
2. Meningkatkan kesadaran tentang pentingnya perilaku saling menghormati di lingkungan kerja.
3. Mencegah atau mengurangi potensi konflik dan masalah hukum dari perilaku tidak hormat.
4. Memperkuat reputasi perusahaan sebagai tempat kerja yang sehat, nyaman, aman dari diskriminasi, dan menjunjung inklusifitas.
5. Meningkatkan kesejahteraan mental dan emosional karyawan.

---

## Chapter II: Definisi - Definisi

### 6 Kategori Pelanggaran RWP

#### Diskriminasi

Suatu perbuatan atau kebijakan yang memperlakukan orang lain atau kelompok secara berbeda dan tidak adil atas dasar karakteristik dari seseorang atau kelompok tersebut, misalnya karena perbedaan agama, warna kulit, gender, disabilitas, dll.

#### Kekerasan

Setiap tindakan, perilaku, atau isyarat — termasuk ancaman untuk melakukan tindakan, paksaan, atau perampasan hak secara sewenang-wenang terhadap orang lain di tempat kerja, baik yang terjadi secara publik maupun privat.

#### Pelecehan

Segala sikap, perkataan, tindakan atau isyarat baik di tempat kerja maupun berbagai media komunikasi yang bertujuan mengintimidasi dan memberikan dampak buruk secara fisik, psikologis/mental, seksual, maupun ekonomi yang membuat seseorang merasa terintimidasi, tersinggung, direndahkan, terhina, atau dipermalukan.

#### Perundungan

Perilaku agresif yang berulang atau berpotensi berulang yang ditujukan kepada seorang individu atau sekelompok individu dan dimaksudkan untuk menyebabkan ketakutan, distress, atau bahaya terhadap kesehatan fisik atau mental.

#### Bias Gender

Prasangka atau perlakuan tidak adil terhadap individu berdasarkan jenis kelamin atau identitas gender mereka, yang dapat memengaruhi keputusan, perlakuan, dan kesempatan dalam berbagai aspek kehidupan, termasuk pendidikan, pekerjaan, dan hubungan sosial.

#### Eksklusivitas

Kondisi atau praktik di mana akses, hak, atau peluang hanya diberikan kepada kelompok tertentu dan tidak terbuka untuk semua pihak. Dalam konteks tempat kerja, eksklusivitas dapat menghambat partisipasi, representasi, dan kontribusi karyawan dari latar belakang yang beragam.

---

## Chapter III: Jenis dan Contoh Pelanggaran

> Pernah gak sih kamu bingung mana yang termasuk pelanggaran RWP dan mana yang bukan? Tenang, kita akan bahas bersama disini dengan contoh kejadian. Yuk, kenali RWP di keseharian kita!

### Diskriminasi: "Sama-Sama Insan Hutama, Kenapa Dibeda-bedakan?"

> Diskriminasi merupakan perlakuan tidak adil atau pembedaan terhadap individu atau kelompok berdasarkan karakteristik tertentu, seperti jenis kelamin, usia, agama, ras, status sosial, jabatan, kepribadian dan latar belakang pendidikan. Contoh di antaranya adalah membedakan dan berlaku tidak baik kepada orang-orang seperti Office Boy, Driver, Tukang Kebun atau karyawan dengan jabatan lain.

**Jenis diskriminasi:** Verbal · Non-Verbal · Digital · Fisik

**Hal yang harus dilakukan:**
1. Memberikan kesempatan yang setara tanpa memandang latar belakang.
2. Menilai kinerja berdasarkan hasil kerja, bukan identitas pribadi.
3. Mendukung rekan kerja yang diperlakukan tidak adil.

### Kekerasan: "Zero Tolerance untuk Kekerasan!"

> Kekerasan adalah tindakan fisik, verbal, atau psikologis yang bersifat mengancam, menyakiti, atau merendahkan martabat seseorang.

**Jenis-jenis kekerasan:** Verbal · Fisik · Digital

**Apa yang harus dilakukan:**
1. Melerai segera setiap bentuk kekerasan yang terlihat jika aman, dan melaporkannya kepada pihak berwenang (atasan, HC/HCBP).
2. Menciptakan lingkungan yang aman di mana setiap karyawan merasa berdaya untuk melaporkan kekerasan tanpa takut.
3. Memberikan dukungan kepada korban, termasuk membantu mereka mengakses sumber daya yang tersedia (misal: konseling).

### Pelecehan

> Pelecehan adalah perilaku yang bersifat menghina, merendahkan, atau melecehkan martabat seseorang, baik secara verbal, non-verbal, maupun fisik dan sering kali bersifat seksual atau berbasis gender, tetapi juga bisa mencakup aspek lain seperti pelecehan terhadap penampilan, agama, atau status sosial.

**Jenis Pelecehan:** Verbal · Non-Verbal · Digital

**Hal yang seharusnya dilakukan:**
1. Menegur secara langsung dan tegas setiap bentuk perilaku pelecehan yang disaksikan, dengan cara yang aman dan profesional.
2. Melaporkan insiden pelecehan kepada atasan, HC/HCBP, atau saluran pelaporan, meskipun bukan korban langsung.
3. Memberikan dukungan empatik kepada korban, memvalidasi perasaan mereka, dan mendampingi mereka dalam proses pelaporan.

### Perundungan (Bullying)

> Perundungan adalah tindakan yang dilakukan secara berulang untuk menyakiti, mempermalukan, atau mengintimidasi seseorang.

**Jenis Perundungan:** Verbal · Non-Verbal · Digital

**Hal yang seharusnya dilakukan:**
1. Menegur orang yang melakukan perundungan.
2. Memberikan edukasi kepada pelaku dan orang-orang di sekitarnya bahwa perbuatannya berpotensi mengarah ke perundungan.
3. Bersikap empati kepada korban (contoh: menanyakan perasaannya, memvalidasi emosinya, menawarkan bantuan).

### Eksklusivitas: "Setiap Orang Adalah Bagian dari Sesuatu yang Besar"

> Eksklusivitas adalah tindakan atau sikap yang menunjukkan pengabaian, pengucilan, penolakan terhadap individu atau kelompok tertentu di tempat kerja. Contoh di antaranya adalah hanya memperlakukan karyawan dengan baik berdasarkan alumni sekolah/kampus yang sama.

**Jenis Eksklusivitas:** Verbal · Non-Verbal · Digital

**Hal yang seharusnya dilakukan:**
1. Menggunakan bahasa yang ramah dan inklusif.
2. Mengakomodasi kebutuhan beragam latar belakang.
3. Menghargai perbedaan budaya, agama, dan identitas.

### Bias Gender: "Capability Never Gender-Based!"

> Bias gender merupakan pandangan atau asumsi yang menggeneralisasi kemampuan, peran, atau tanggung jawab seseorang berdasarkan jenis kelamin mereka. Hal ini sering kali membatasi kesempatan individu untuk berkembang dan berkontribusi secara maksimal di tempat kerja.

**Jenis bias gender:** Verbal · Non-Verbal · Digital

**Hal yang seharusnya dilakukan:**
1. Memberikan kesempatan yang sama bagi semua gender dalam penugasan proyek, promosi, dan pengembangan karir, berdasarkan kualifikasi dan performa.
2. Menghargai dan mengakui kontribusi individu tanpa memandang gender, menghilangkan stereotip peran gender dalam penilaian atau penugasan.
3. Mendukung kebijakan fleksibilitas kerja atau cuti yang mengakomodasi tanggung jawab keluarga.

---

## Chapter IV: Pencegahan, Penanganan dan Pelaporan

### Pencegahan: Membangun Budaya Saling Menghargai

#### Kenali dan Pahami! — Awareness is The Key

> Setiap dari kita memiliki peran penting dalam menciptakan lingkungan kerja yang saling menghargai. Sebagai Insan Hutama, mulailah dari hal-hal kecil:

1. **Berani menyampaikan masukan secara terbuka** — Jika terdapat hal yang kurang berkenan, sampaikan dengan pendekatan konstruktif dan berbasis solusi. Fokus pada situasi atau perilaku spesifik, bukan menyerang pribadi individu.
2. **Pahami batasan pribadi rekan kerja** — Menghormati ruang pribadi setiap individu adalah langkah awal menciptakan lingkungan kerja yang nyaman.
3. **Hormati perbedaan pendapat** — Setiap orang mungkin memiliki pandangan yang berbeda. Dengan menghormati perbedaan ini, kita menunjukkan sikap inklusif dan terbuka.
4. **Biasakan komunikasi yang positif** — Pilih kata-kata yang mendukung, hindari nada atau bahasa yang menyakitkan, dan fokus pada solusi.
5. **Tunjukkan Empati** — Berusaha memahami perspektif dan perasaan rekan kerja, terutama dalam situasi sulit.
6. **Hindari perilaku yang tidak pantas** — Jangan melakukan tindakan yang dapat dianggap sebagai pelecehan, diskriminasi, atau intimidasi.
7. **Jaga kerahasiaan informasi** — Hargai privasi rekan kerja dengan menjaga informasi pribadi atau profesional yang diberikan kepada Anda.
8. **Laporkan jika melihat pelanggaran** — Jika Anda menyaksikan atau mengalami perilaku yang melanggar prinsip RWP, laporkan kepada atasan atau unit terkait tanpa rasa takut. Perusahaan memiliki mekanisme pelaporan yang aman dan rahasia.
9. **Terus belajar dan beradaptasi** — Terus tingkatkan pemahaman Anda tentang keberagaman, inklusi, dan penghormatan terhadap sesama.

#### Peran Pimpinan dalam Pencegahan

> Bagi Insan Hutama yang memiliki jabatan strategis atau memiliki tim di bawahnya, lakukan hal berikut untuk mendorong tim menciptakan lingkungan yang aman dan nyaman:

1. **Berikan Contoh Positif** — Sebagai pimpinan, tunjukkan perilaku yang menghormati semua pihak. Jadilah panutan dalam menerapkan komunikasi yang positif.
2. **Ciptakan Budaya Keterbukaan** — Dorong anggota tim untuk menyampaikan pendapat, ide, atau kekhawatiran mereka tanpa rasa takut.
3. **Pantau dan Kelola Konflik dengan Adil** — Jangan abaikan tanda-tanda konflik dalam tim. Segera cari solusi yang adil dan profesional.
4. **Lakukan Pemantauan Rutin dengan Tim** — Selalu luangkan waktu untuk mengecek kesejahteraan dan kebutuhan anggota tim. Pimpinan Unit Kerja juga wajib melaporkan kasus RWP, baik yang sudah diselesaikan di level Unit Kerja maupun yang memerlukan investigasi lebih lanjut oleh Divisi Human Capital.
5. **Pastikan Kebijakan RWP Dipahami oleh Tim** — Sosialisasikan RWP kepada seluruh anggota tim dan pastikan mereka memahami aturan serta konsekuensinya.
6. **Tindak Lanjut Laporan Secara Serius** — Jika ada laporan terkait pelanggaran RWP, tindaklanjuti dengan cepat dan profesional. Pastikan prosesnya adil, transparan, dan menjaga kerahasiaan pelapor.
7. **Berikan Apresiasi atas Perilaku Positif** — Apresiasi anggota tim yang menunjukkan sikap menghormati sesama dan mempraktikkan komunikasi yang positif.

### Penanganan: Proses yang Tepat untuk Hasil yang Baik

1. Insan Hutama mendapatkan kekerasan/pelanggaran dan/atau melihat potensi pelanggaran.
2. Menyampaikan laporan secara tertulis/langsung kepada atasan, atau melalui menu **Lapor Insiden** di aplikasi RWP Hutama Karya.
3. Laporan yang masuk akan diinvestigasi terlebih dahulu.
4. Untuk setiap laporan pelanggaran RWP yang ditangani tuntas di tingkat Unit Kerja/Proyek/Cabang/Ruas, Pimpinan Unit wajib mengisi formulir pelaporan dan mengirimkannya ke Divisi Human Capital sebagai dokumentasi.

**Komitmen perusahaan:**
- Kerahasiaan Terjamin
- Perlindungan Pelapor
- Pendampingan Profesional
- Investigasi Menyeluruh

**Dukungan yang diberikan oleh Perusahaan:**
- Pendampingan Psikologis
- Advokasi HC
- Perlindungan Kerahasiaan
- Informasi Proses Penanganan

### Pelaporan: Mudah, Aman, dan Terpercaya

> #MentalAmanKerjaNyaman

1. Login ke aplikasi **RWP Hutama Karya**.
2. Buka menu **Lapor Insiden** (tersedia di beranda dan di sidebar kiri).
3. Isi form pelaporan selengkap mungkin: kategori insiden, judul, kronologi, tanggal kejadian, serta lokasi dan pihak terlapor bila diketahui.
4. Deskripsi laporan yang baik memenuhi prinsip **4W + 1H** (What, Where, When, Who, How) dan ditulis sedetail mungkin.
5. Lampirkan bukti pendukung bila ada (gambar, PDF, dokumen, atau rekaman audio — maksimal 10 MB per berkas).
6. Centang **"Laporkan secara anonim"** bila kamu tidak ingin identitasmu terlihat oleh admin.
7. Setelah terkirim kamu menerima **nomor tiket** (format **RWP-TAHUN-NNNN**). Simpan nomor itu, lalu pantau penanganannya lewat menu **Lacak Laporan**.

**Tips praktis:** Dokumentasikan kejadian, simpan bukti yang relevan, catat detail waktu dan tempat, jangan ragu untuk meminta bantuan.

---

## Chapter V: Contoh Kasus Pelanggaran RWP

Kenali pelanggaran RWP melalui skenario nyata berikut. Setiap skenario menggambarkan situasi, jenis pelanggaran, dan tindakan yang seharusnya diambil.

### Diskriminasi

#### Perlakuan Berbeda terhadap Staf Pendukung
Seorang manajer proyek di lapangan secara konsisten menggunakan toilet yang berbeda dari Office Boy (OB) dan driver, dan melarang mereka makan di area yang sama saat istirahat, dengan alasan "beda kelas". Ia juga tidak pernah menyapa atau membalas sapaan dari staf pendukung tersebut.

Ini termasuk pelanggaran RWP kategori **Diskriminasi berbasis jabatan/status sosial**. Setiap karyawan berhak mendapatkan perlakuan yang setara dan bermartabat, tanpa memandang posisi atau jabatannya.

#### Diskriminasi Berbasis Agama dalam Penugasan
Seorang kepala divisi tidak pernah memilih karyawan beragama minoritas untuk memimpin proyek, dengan alasan "klien kita mayoritas X, lebih nyaman kalau yang handle orang X juga". Keputusan ini tidak berdasarkan kompetensi melainkan semata-mata karena agama karyawan.

Ini termasuk pelanggaran RWP kategori **Diskriminasi berbasis agama**. Penugasan dan promosi harus berdasarkan kualifikasi dan kinerja, bukan identitas pribadi.

#### Diskriminasi terhadap Karyawan Penyandang Disabilitas
Seorang karyawan yang menggunakan kursi roda secara konsisten tidak diajak dalam rapat lapangan dengan alasan "medannya susah dijangkau". Padahal rapat tersebut bisa diadakan di ruang yang aksesibel. Akibatnya ia selalu ketinggalan informasi penting dan kariernya stagnan.

Ini termasuk pelanggaran RWP kategori **Diskriminasi terhadap penyandang disabilitas**. Perusahaan wajib mengakomodasi kebutuhan karyawan difabel — sesuaikan lokasi rapat agar dapat diakses semua orang, atau sediakan alternatif yang setara.

#### Diskriminasi Berbasis Suku atau Daerah Asal
Seorang supervisor secara rutin membuat lelucon tentang suku tertentu dan menyebut karyawan dari daerah tersebut dengan julukan stereotip. Ia juga cenderung memberikan penilaian kinerja yang lebih rendah kepada karyawan dari suku tersebut meskipun performanya sama.

Ini termasuk pelanggaran RWP kategori **Diskriminasi berbasis suku/ras**. Penilaian kinerja dan perlakuan sehari-hari harus bebas dari bias etnis. Hentikan segala bentuk stereotip dan lelucon berbasis suku.

### Kekerasan

#### Kekerasan Verbal oleh Atasan di Depan Tim
Seorang manajer membentak karyawannya di depan seluruh tim saat rapat karena laporan harian terlambat. Ia menggunakan kata-kata kasar seperti "bodoh" dan "tidak becus", dan melemparkan dokumen ke meja sambil berteriak. Kejadian ini berulang setiap kali target tidak terpenuhi.

Ini termasuk pelanggaran RWP kategori **Kekerasan Verbal**. Cara menyampaikan kritik tidak boleh merendahkan atau mempermalukan karyawan, apalagi di depan umum. Sampaikan koreksi secara profesional dan privat, fokus pada masalah bukan menyerang pribadi.

#### Ancaman Jabatan sebagai Bentuk Intimidasi
Seorang kepala proyek berkata kepada karyawan yang mengkritik prosedur keselamatannya: "Kalau kamu tidak suka cara kerja saya, saya bisa atur supaya kontrak kamu tidak diperpanjang." Ancaman ini disampaikan secara langsung di luar jam kerja.

Ini termasuk pelanggaran RWP kategori **Kekerasan berupa intimidasi dan ancaman**. Menggunakan posisi jabatan untuk membungkam karyawan adalah bentuk penyalahgunaan wewenang sekaligus kekerasan psikologis. Karyawan yang menerima ancaman seperti ini dapat melaporkan secara anonim melalui menu Lapor Insiden di aplikasi ini.

#### Kekerasan Fisik di Lingkungan Proyek
Seorang mandor mendorong bahu seorang pekerja dengan kasar karena ia dianggap lambat mengerjakan tugasnya, sambil berkata "kalau lambat lagi, rasakan akibatnya." Insiden ini terjadi di area proyek dan disaksikan oleh beberapa pekerja lain.

Ini termasuk pelanggaran RWP kategori **Kekerasan Fisik**. Kontak fisik yang bersifat agresif atau mengancam adalah pelanggaran serius yang dapat berujung sanksi berat. Saksi maupun korban wajib melaporkan segera ke atasan atau HC. Dokumentasikan kejadian (waktu, tempat, saksi).

#### Kekerasan Digital melalui Pesan Pribadi
Seorang karyawan menerima pesan WhatsApp dari rekan kerja senior yang isinya ancaman: "Kalau kamu terus lapor soal itu ke HR, saya pastikan semua orang di kantor tahu rahasia kamu."

Ini termasuk pelanggaran RWP kategori **Kekerasan Digital**. Ancaman melalui media digital tetap merupakan pelanggaran RWP meskipun terjadi di luar jam kerja. Simpan bukti (screenshot), lalu laporkan lewat menu Lapor Insiden.

### Pelecehan

#### Pelecehan Seksual Verbal di Tempat Kerja
Seorang rekan kerja sering membuat komentar tentang penampilan fisik karyawan perempuan seperti "Wah, makin cantik aja" atau "Kalau pakai baju itu, siapa yang bisa fokus kerja?" Komentar disampaikan di depan tim dan membuat korban tidak nyaman.

Ini termasuk pelanggaran RWP kategori **Pelecehan Seksual Verbal**. Komentar tentang tubuh, penampilan, atau daya tarik seksual seseorang yang tidak diinginkan adalah bentuk pelecehan, meskipun disampaikan dengan nada bercanda. Perasaan tidak nyaman korban sudah cukup sebagai dasar pelaporan.

#### Pelecehan Fisik Berupa Sentuhan Tidak Diinginkan
Seorang atasan sering menepuk bahu atau menyentuh punggung bawah karyawan perempuan saat berbicara dengannya, meskipun karyawan tersebut sudah beberapa kali mundur atau menunjukkan ketidaknyamanan. Atasan berdalih ini "hanya kebiasaan".

Ini termasuk pelanggaran RWP kategori **Pelecehan Fisik**. Sentuhan pada area tubuh tertentu tanpa persetujuan eksplisit adalah pelecehan, terlepas dari niat pelaku. Korban berhak menegur tegas dan melaporkan ke HC.

#### Pelecehan Digital melalui Grup Pesan
Seseorang membagikan meme berbau seksual atau foto karyawan lain yang diedit secara tidak pantas ke grup WhatsApp tim. Ia menganggap ini humor biasa, namun beberapa anggota tim merasa sangat tidak nyaman.

Ini termasuk pelanggaran RWP kategori **Pelecehan Digital**. Membagikan konten seksual atau merendahkan melalui media digital — termasuk grup chat internal — adalah bentuk pelecehan. Anggota grup yang merasa tidak nyaman berhak melaporkan ke HC dengan menyertakan screenshot sebagai bukti.

#### Pelecehan Berbasis Penampilan atau Kondisi Fisik
Seorang rekan kerja secara rutin mengomentari berat badan karyawan lain di depan umum: "Eh, makin subur ya? Kurang olahraga nih." Ia menganggap ini perhatian, padahal karyawan yang bersangkutan merasa dipermalukan.

Ini termasuk pelanggaran RWP kategori **Pelecehan berbasis kondisi fisik**. Komentar berulang tentang kondisi fisik seseorang yang tidak diinginkan adalah bentuk pelecehan, bukan perhatian.

### Perundungan

#### Perundungan Verbal Berulang oleh Rekan Satu Tim
Seorang karyawan baru secara konsisten diejek oleh rekan tim seniornya setiap kali ia membuat kesalahan kecil: "Lah, basic gini aja salah. Lulusan mana sih ini?" Kejadian ini berlangsung hampir setiap hari selama dua bulan.

Ini termasuk pelanggaran RWP kategori **Perundungan Verbal**. Kunci perundungan adalah sifat berulang dan bertujuan merendahkan. Berbeda dengan kritik konstruktif, perundungan bertujuan melukai dan mempermalukan. Korban berhak melapor meski merasa belum "separah" yang dibayangkan.

#### Pengucilan Sosial sebagai Bentuk Perundungan
Sebuah tim secara sengaja tidak mengajak satu karyawan tertentu dalam makan siang bersama, tidak menginformasikan jadwal rapat informal, dan tidak merespons pesannya di grup kerja. Ini berlangsung berbulan-bulan hingga karyawan tersebut merasa terisolasi.

Ini termasuk pelanggaran RWP kategori **Perundungan Non-Verbal berupa pengucilan sosial**. Mengasingkan seseorang secara terencana dari aktivitas tim adalah bentuk perundungan meskipun tidak ada kata-kata kasar.

#### Sabotase Pekerjaan sebagai Bentuk Perundungan
Seorang karyawan senior secara diam-diam tidak meneruskan email penting kepada rekan yang tidak disukainya, sehingga rekan tersebut selalu ketinggalan informasi dan terlihat tidak kompeten di mata atasan. Ini dilakukan secara sistematis selama beberapa bulan.

Ini termasuk pelanggaran RWP kategori **Perundungan Non-Verbal berupa sabotase profesional**. Tindakan yang secara sengaja menghambat kinerja atau reputasi seseorang adalah bentuk perundungan yang serius. Korban bisa mengumpulkan bukti dan melapor lewat menu Lapor Insiden.

### Bias Gender

#### Bias Gender dalam Keputusan Promosi
Seorang karyawan perempuan dengan performa dan pengalaman lebih baik tidak dipilih untuk posisi manajer dengan alasan implisit: "Nanti kalau nikah atau hamil, jadi repot." Posisi tersebut diberikan kepada kolega laki-laki yang kualifikasinya lebih rendah.

Ini termasuk pelanggaran RWP kategori **Bias Gender dalam promosi dan karier**. Keputusan karier tidak boleh dipengaruhi oleh asumsi tentang rencana pribadi seseorang berdasarkan gendernya. Proses promosi harus transparan dan berbasis kompetensi.

#### Stereotip Gender dalam Pembagian Tugas
Dalam setiap rapat, karyawan perempuan selalu diminta menyiapkan konsumsi, notulensi, atau dekorasi — meskipun jabatannya setara atau lebih tinggi dari rekan laki-lakinya. Atasan menganggap ini "wajar" karena "perempuan lebih teliti dan rapi".

Ini termasuk pelanggaran RWP kategori **Bias Gender Non-Verbal berupa stereotip peran**. Pembagian tugas berdasarkan asumsi gender, bukan kompetensi atau rotasi yang adil, merupakan bentuk diskriminasi. Tugas administratif rapat harus dirotasi secara adil tanpa memandang gender.

#### Komentar Meremehkan Berbasis Gender
Seorang atasan berkata kepada karyawan laki-laki yang mengajukan cuti ayah (paternity leave): "Laki-laki kok minta cuti bayi? Itu kan urusan istri." Atau kepada karyawan perempuan yang tegas dalam rapat: "Kamu terlalu agresif untuk perempuan."

Ini termasuk pelanggaran RWP kategori **Bias Gender Verbal**. Komentar yang menggunakan gender sebagai tolak ukur perilaku yang "seharusnya" adalah bentuk bias gender yang merendahkan. Komentar seperti ini dapat dilaporkan ke HC.

#### Bias Gender dalam Penugasan Proyek Lapangan
Karyawan perempuan secara konsisten tidak dipertimbangkan untuk penugasan proyek lapangan meskipun memiliki kualifikasi teknis yang sesuai. Atasan berasumsi "perempuan tidak cocok di lapangan" tanpa pernah menanyakan preferensi dan kemampuan mereka.

Ini termasuk pelanggaran RWP kategori **Bias Gender dalam penugasan**. Asumsi bahwa perempuan tidak cocok untuk lingkungan tertentu tanpa dasar objektif adalah bentuk diskriminasi berbasis gender.

### Eksklusivitas

#### Eksklusivitas Berbasis Almamater
Sebuah kelompok karyawan dari universitas yang sama membentuk "komunitas alumni" informal yang secara tidak resmi saling mendukung dalam promosi, proyek prestisius, dan akses informasi. Karyawan dari universitas lain merasa sengaja dikucilkan dari kesempatan tersebut.

Ini termasuk pelanggaran RWP kategori **Eksklusivitas berbasis latar belakang pendidikan**. Ketika ikatan alumni digunakan untuk menciptakan keuntungan profesional yang tidak adil, ini menjadi eksklusivitas yang merugikan. Akses terhadap informasi dan peluang karier harus terbuka setara bagi semua karyawan.

#### Eksklusivitas Berbasis Daerah Asal
Karyawan dari satu daerah tertentu membentuk kelompok informal yang hanya berbicara dalam bahasa daerah mereka saat rapat santai, secara sengaja mengecualikan kolega yang tidak memahami bahasa tersebut. Mereka juga hanya merekomendasikan sesama "orang daerah" untuk posisi tertentu.

Ini termasuk pelanggaran RWP kategori **Eksklusivitas berbasis suku/daerah**. Gunakan Bahasa Indonesia dalam konteks kerja agar semua rekan dapat berpartisipasi setara.

#### Eksklusivitas Senior terhadap Karyawan Baru
Tim senior secara sengaja tidak berbagi pengetahuan kerja, prosedur tidak tertulis, atau akses ke tools penting kepada karyawan baru. Mereka berdalih "dulu kami juga belajar sendiri" dan menganggap ini "proses pembuktian diri" yang wajar.

Ini termasuk pelanggaran RWP kategori **Eksklusivitas berbasis senioritas**. Menahan informasi yang dibutuhkan untuk bekerja secara efektif menghambat pertumbuhan dan inklusivitas organisasi. Knowledge sharing wajib dilakukan secara adil.

#### Eksklusivitas Digital dalam Komunikasi Tim
Sekelompok karyawan membuat grup chat kerja yang hanya beranggotakan "orang-orang tertentu" dan mendiskusikan keputusan tim di sana sebelum rapat resmi, sehingga karyawan di luar grup selalu datang rapat tanpa informasi yang cukup.

Ini termasuk pelanggaran RWP kategori **Eksklusivitas Digital**. Membuat jalur komunikasi paralel yang tidak inklusif untuk keputusan kerja adalah eksklusivitas yang merugikan kolega lain. Diskusi terkait pekerjaan harus dilakukan melalui saluran resmi yang bisa diakses semua anggota tim yang relevan.
`,
  },
];
