// Skrip "Soal Hati" — dialog interaktif berperingkat (bukan chat bebas).
// Setiap bab ialah jujukan "beat" linear yang dipaparkan berperingkat dengan jeda.
// Reka bentuk sengaja beat-based (bukan JSX terus) supaya bab baharu boleh
// ditambah sebagai data sahaja — tak perlu ubah PacedReveal/SoalHatiPage.

export const NAMA_TOKEN = '{nama_pengguna}'

export function interpolateNama(text: string, nama: string): string {
  return text.split(NAMA_TOKEN).join(nama)
}

export interface ChoiceOption {
  id: string
  label: string
  /** Baris tambahan dipaparkan sejurus selepas pilihan ini dipilih, sebelum beat seterusnya. */
  ackText?: string
  /**
   * Jika true, memilih pilihan ini akan papar semula checkpoint yang sama
   * (bukan maju ke beat seterusnya) — untuk "cuba sekali lagi".
   */
  loopBack?: boolean
}

export type SoalHatiBeat =
  | { kind: 'narration'; id: string; lines: string[]; visual?: string }
  | { kind: 'checkpoint'; id: string; options: ChoiceOption[] }
  | {
      kind: 'gated'
      id: string
      lines: string[]
      // Dua cara nak gate — guna SATU sahaja per beat, bukan campur.
      // (1) afterCheckpoint/whenOptionId — semak SATU checkpoint sahaja
      //     (pattern asal Bab Pembukaan — "gated" pada satu jawapan).
      afterCheckpoint?: string
      whenOptionId?: string
      // (2) when — predicate atas SEMUA jawapan bab ini setakat ini, untuk
      //     logik merentasi berbilang checkpoint (contoh: Bab 3's kiraan
      //     majoriti A/B daripada 4 soalan). Diutamakan jika hadir.
      when?: (answers: Record<string, string>) => boolean
    }
  | {
      kind: 'chapterEnd'
      id: string
      options: {
        id: string
        label: string
        action: 'next-chapter' | 'exit' | 'save-and-exit' | 'goto-amalan' | 'restart'
      }[]
    }

export type ChapterId =
  | 'pembukaan' | 'bab_1' | 'bab_2' | 'bab_3' | 'bab_4'
  | 'bab_5' | 'bab_6' | 'bab_7' | 'bab_8' | 'bab_9'

export interface ChapterMeta {
  id: ChapterId
  order: number
  title: string
  subtitle: string
  status: 'available' | 'coming_soon'
}

export const CHAPTER_META: ChapterMeta[] = [
  { id: 'pembukaan', order: 1, title: 'Bab Pembukaan', subtitle: 'Mencari hati bersama', status: 'available' },
  { id: 'bab_1', order: 2, title: 'Bab 1: Hakikat Hati', subtitle: 'Hati sebagai pusat kesedaran', status: 'available' },
  { id: 'bab_2', order: 3, title: 'Bab 2: Sifat Hati yang Berubah', subtitle: 'Hati sebagai cermin yang sentiasa bergerak', status: 'available' },
  { id: 'bab_3', order: 4, title: 'Bab 3: Cermin & Debu Ego', subtitle: 'Kenal pasti debu yang menutup cermin', status: 'available' },
  { id: 'bab_4', order: 5, title: 'Bab 4: Ilusi Pemilikan', subtitle: 'Kualiti yang kita ada — milik siapa sebenarnya?', status: 'available' },
  { id: 'bab_5', order: 6, title: 'Bab 5: Perangai Ego yang Halus', subtitle: 'Bila ego menyamar sebagai kebajikan', status: 'available' },
  { id: 'bab_6', order: 7, title: 'Bab 6: Taubat & Kepulangan', subtitle: 'Belajar kembali, bukan berputus asa', status: 'available' },
  { id: 'bab_7', order: 8, title: 'Bab 7: Keseimbangan Sifat Ilahi', subtitle: 'Seimbangkan apa yang telah dipelajari', status: 'available' },
  { id: 'bab_8', order: 9, title: 'Bab 8: Amalan Menggilap Cermin', subtitle: 'Tujuh amalan untuk menjernihkan hati', status: 'available' },
  { id: 'bab_9', order: 10, title: 'Bab 9: Cahaya yang Tinggal', subtitle: 'Penutup — rumusan perjalanan sembilan bab', status: 'available' },
]

// Bab 3's resolution branches on a majority-vote across 4 checkpoints
// (soalan_1..soalan_4, each answered 'a' or 'b') — see the 'when' beats
// in bab_3 below.
function bab3JumlahA(answers: Record<string, string>): number {
  return ['soalan_1', 'soalan_2', 'soalan_3', 'soalan_4'].filter(id => answers[id] === 'a').length
}

export const SOAL_HATI_CHAPTERS: Record<ChapterId, SoalHatiBeat[]> = {
  pembukaan: [
    {
      kind: 'narration',
      id: 'salam',
      lines: [
        'Assalamualaikum, {nama_pengguna}.',
        'Semoga hari ini memberikan keberkahan yang paling terbaik sekali buat {nama_pengguna}, dengan sebaik-baiknya.',
        'Mari kita mulakan dengan satu soalan ini: di manakah sebenarnya letaknya hati? Bukan hati yang mengepam darah di dalam dada... tetapi hati nurani yang merasakan, yang merindu, dan yang bolak balik... Di manakah letaknya? Adakah ia benar-benar terkurung di dalam fizikal tubuh kita?',
        'Adakah {nama_pengguna} tahu di mana sebenarnya letak hati nurani {nama_pengguna}?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'tahu_letak',
      options: [
        { id: 'tahu', label: 'Tahu', ackText: 'Baik, jom sahkan bersama.' },
        { id: 'tidak_tahu', label: 'Tidak tahu', ackText: 'Tak mengapa, jom kita cari sama-sama.' },
      ],
    },
    {
      kind: 'narration',
      id: 'cari_bersama',
      visual: '🤚',
      lines: [
        'Mari sama-sama kita cari tempat hati nurani di dalam diri kita.',
        'Cuba letakkan tangan anda di dada kiri. Tepat tiga jari di bawah payudara, di sebalik tulang rusuk.',
        'Sudah jumpa?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'jumpa_dada',
      options: [
        { id: 'ya', label: 'Ya, jumpa' },
        { id: 'belum', label: 'Belum jumpa lagi', ackText: 'Tak mengapa, ambil masa. Cuba rasa sekitar kawasan itu.' },
      ],
    },
    {
      kind: 'narration',
      id: 'tekan_rasa',
      lines: [
        'Tekan perlahan pada titik itu. Adakah anda rasa sedikit ngilu, perit, atau sakit apabila ditekan?',
        'Cuba rasai sendiri.',
      ],
    },
    {
      kind: 'narration',
      id: 'anatomi',
      lines: [
        'Secara anatominya, apa yang saya katakan itu adalah benar. Di situlah letaknya organ fizikal yang tidak pernah berhenti mengepam darah untuk menghidupkan jasad anda.',
        'Tetapi... adakah itu juga letak hati nurani yang sebenarnya?',
      ],
    },
    {
      kind: 'narration',
      id: 'ajakan_pejam',
      lines: [
        'Sekarang, saya ingin ajak {nama_pengguna} melakukan sesuatu yang mungkin belum pernah {nama_pengguna} cuba sebelum ini.',
        'Saya ingin anda pejamkan mata anda seketika, dan bayangkan ini. Anda melihat ke dalam hati anda. Dan bukannya melihat kebimbangan anda, masa lalu, atau ego anda...',
        'Sudah lakukan?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'sudah_pejam',
      options: [
        { id: 'sudah', label: 'Sudah' },
        {
          id: 'belum_cuba_lagi',
          label: 'Belum, cuba sekali lagi',
          ackText: 'Tak mengapa. Ambil masa yang {nama_pengguna} perlukan.',
          loopBack: true,
        },
      ],
    },
    {
      kind: 'gated',
      id: 'cermin_ilahi',
      afterCheckpoint: 'sudah_pejam',
      whenOptionId: 'sudah',
      lines: [
        'Anda melihat Tuhan, memandang kembali kepada anda.',
        'Ini bukan imaginasi. Inilah yang disebut oleh Arif Billah sebagai hati yang menjadi cermin Ilahi.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_pembukaan',
      options: [
        { id: 'teruskan', label: 'Teruskan ke Bab 1', action: 'next-chapter' },
        { id: 'bukan_sekarang', label: 'Bukan sekarang', action: 'exit' },
      ],
    },
  ],

  bab_1: [
    {
      kind: 'narration',
      id: 'apa_terlintas',
      lines: [
        'Apabila {nama_pengguna} dengar perkataan "hati", apa yang pertama terlintas?',
        'Mungkin cinta. Mungkin kesedihan. Mungkin kesepian, atau ketakutan ditolak. Mungkin kesakitan kehilangan seseorang, atau keselesaan apabila diterima.',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'apa_hati_bagimu',
      options: [
        { id: 'emosi', label: 'Perasaan/emosi (cinta, sedih, takut)' },
        { id: 'lebih_dalam', label: 'Sesuatu yang lebih dalam dari sekadar perasaan' },
        { id: 'tak_pasti', label: 'Tak pasti' },
      ],
    },
    {
      kind: 'narration',
      id: 'makna_luas',
      lines: [
        'Itu semua benar. Tapi hati bukan terhad kepada emosi sahaja.',
        'Hati adalah pusat kesedaran. Ia fakulti halus di mana kita boleh menerima makna, mengenali kebenaran, dan menemui tanda-tanda Ilahi.',
        'Mata fizikal {nama_pengguna} melihat bentuk dan warna. Telinga menerima bunyi. Akal menganalisis, membandingkan, membuat kesimpulan. Setiap satu ada fungsinya.',
        'Tapi ada sesuatu yang tak dapat difahami hanya melalui mata atau akal semata.',
      ],
    },
    {
      kind: 'narration',
      id: 'contoh_rasa',
      lines: [
        'Akal mungkin nampak alam ini tersusun rapi. Tapi hati mengalami kekaguman sebelum susunan itu sempat difahami.',
        'Akal mungkin tahu erti rahmat dari kamus. Tapi hati mengenali rahmat apabila ia tiba — melalui sesuatu yang tak mungkin dirancang.',
        'Akal mungkin faham penyerahan diri sebagai konsep. Tapi hati belajar erti penyerahan hanya apabila semua ikhtiar sudah gagal, dan tiada apa lagi tinggal melainkan tawakal.',
        'Pernahkah {nama_pengguna} rasa sesuatu itu "benar" — sebelum sempat akal memprosesnya?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'pernah_rasa_benar',
      options: [
        { id: 'pernah', label: 'Pernah' },
        { id: 'belum_pernah', label: 'Belum pernah' },
        { id: 'tak_pasti', label: 'Tak pasti' },
      ],
    },
    {
      kind: 'narration',
      id: 'akal_hati_bukan_musuh',
      lines: [
        'Ini bukan bermakna akal tidak berguna. Kerohanian yang menolak akal dengan mudah akan menjadi tahyul.',
        'Akal yang jelas melindungi kita daripada tertipu. Hati yang bersih pula melindungi akal daripada keangkuhan.',
        'Masalah bermula apabila akal menyangka — apa yang tak dapat ditakrifkannya, mestilah tidak wujud.',
        '{nama_pengguna} tak dapat mentakrifkan cinta sepenuhnya — tapi {nama_pengguna} kenal kesannya. {nama_pengguna} tak boleh pegang keikhlasan di tangan — tapi {nama_pengguna} boleh rasa bila kata-kata itu kosong, dan bila ia datang dari tempat yang sebenar.',
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab1',
      lines: [
        'Dengan cara yang sama, hati menerima makna yang tak semestinya boleh dikurangkan kepada formula logik semata.',
        'Ini baru permulaan {nama_pengguna} mengenali hati sendiri.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab1',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'tamat', label: 'Tamat untuk hari ini', action: 'exit' },
      ],
    },
  ],

  bab_2: [
    {
      kind: 'narration',
      id: 'qalb_berubah',
      lines: [
        'Perkataan Arab untuk hati — Qalb — datang daripada akar kata yang bermaksud berbolak-balik, berubah.',
        'Pernahkah {nama_pengguna} perasan — dalam sehari sahaja, hati boleh beralih dari tenang kepada resah, dari yakin kepada was-was, tanpa sebab yang jelas?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'kerap_berubah',
      options: [
        { id: 'selalu', label: 'Selalu' },
        { id: 'kadang', label: 'Kadang-kadang' },
        { id: 'jarang', label: 'Jarang' },
      ],
    },
    {
      kind: 'narration',
      id: 'bukan_kelemahan',
      lines: [
        '{nama_pengguna} mungkin anggap sifat berubah ini sebagai kelemahan. Mungkin {nama_pengguna} harap hati boleh kekal tenang selama-lamanya, pasti, sentiasa terinspirasi.',
        'Tapi keupayaan untuk berubah — itu jugalah yang memberi hati keupayaan untuk menerima.',
        'Batu tidak mudah berubah. Tapi batu juga tidak mengenali apa-apa.',
        'Hati yang hidup digerakkan oleh realiti yang sentiasa berubah. Satu saat mengajar melalui keindahan. Saat lain mengajar melalui kehilangan. Satu saat membuka pintu keintiman, saat lain mengajar disiplin dan jarak.',
      ],
    },
    {
      kind: 'narration',
      id: 'peristiwa_cermin',
      lines: [
        'Ramai orang terlepas petunjuk Tuhan kerana mereka jangkakan ia hanya datang melalui keselesaan. Mereka percaya — jika Tuhan dekat, semuanya mesti terasa aman. Jika hidup jadi susah, mereka anggap mereka ditinggalkan.',
        'Padahal, kesukaran mungkin membangkitkan bahagian hati yang selama ini tertidur dalam keselesaan.',
        'Bila kali terakhir sesuatu yang susah menghalang {nama_pengguna} — adakah {nama_pengguna} rasa itu sebagai ditinggalkan, atau mungkin sedang diajar sesuatu?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'rasa_diuji',
      options: [
        { id: 'ditinggalkan', label: 'Rasa macam ditinggalkan' },
        { id: 'diajar', label: 'Rasa macam sedang diajar' },
        { id: 'kedua_dua', label: 'Kedua-duanya, pada masa berbeza' },
      ],
    },
    {
      kind: 'narration',
      id: 'contoh_khusus_b2',
      lines: [
        'Pintu yang tertutup mungkin mendedahkan pergantungan tersembunyi {nama_pengguna} pada persetujuan orang lain.',
        'Pengkhianatan mungkin mendedahkan yang {nama_pengguna} pernah letakkan seseorang sebagai sumber rasa selamat.',
        'Kelewatan mungkin tunjukkan — ibadah {nama_pengguna} diam-diam dibina atas dasar mengharap sesuatu yang diingini, bukan atas dasar redha.',
        'Mana satu paling dekat dengan {nama_pengguna} sekarang?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'paling_dekat_b2',
      options: [
        { id: 'pintu', label: 'Pintu tertutup / persetujuan orang' },
        { id: 'khianat', label: 'Pengkhianatan / rasa selamat' },
        { id: 'lewat', label: 'Kelewatan / harap sesuatu' },
        { id: 'tiada', label: 'Tak satu pun buat masa ini' },
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab2',
      lines: [
        'Peristiwa itu menjadi cermin. Dan melalui cermin itu, {nama_pengguna} melihat apa yang tersembunyi di dalam diri sendiri.',
        'Dalam Bab 1, {nama_pengguna} kenal hati sebagai pusat kesedaran. Sekarang, {nama_pengguna} nampak — hati ini sentiasa bergerak, sentiasa diuji, sentiasa jadi cermin untuk apa yang berlaku di sekeliling.',
        'Persoalan seterusnya bukan "kenapa hati berubah" — tapi "apa yang cermin ini sebenarnya tunjukkan, bila ia diuji dengan dekat?"',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab2',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'tamat', label: 'Tamat untuk hari ini', action: 'exit' },
      ],
    },
  ],

  bab_3: [
    {
      kind: 'narration',
      id: 'situasi_pembuka',
      lines: [
        'Fikirkan satu situasi baru-baru ini yang membuatkan hati {nama_pengguna} terganggu — kecewa, marah, cemburu, atau tidak selesa dengan seseorang/sesuatu.',
        'Situasi ini tentang apa?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'situasi_jenis',
      options: [
        { id: 'pertelingkahan', label: 'Pertelingkahan dengan seseorang' },
        { id: 'kecewa', label: 'Kecewa dengan keputusan/tindakan orang lain' },
        { id: 'tidak_dihargai', label: 'Perasaan tidak dihargai' },
        { id: 'kejayaan_orang', label: 'Melihat kejayaan/kelebihan orang lain' },
        { id: 'umum', label: 'Lain-lain / Umum sahaja' },
      ],
    },
    {
      kind: 'narration',
      id: 'intro_soalan_teras',
      lines: [
        'Sekarang, jawab dengan jujur — empat soalan pendek tentang situasi ini. Tiada jawapan salah, cuma cermin yang cuba tunjuk apa yang sebenar.',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'soalan_1',
      options: [
        { id: 'a', label: 'Keikhlasan — saya rasa terpanggil untuk buat yang betul' },
        { id: 'b', label: 'Kebanggaan — saya rasa terganggu sebab imej/kedudukan saya' },
      ],
    },
    {
      kind: 'checkpoint',
      id: 'soalan_2',
      options: [
        { id: 'a', label: 'Kebijaksanaan — saya nampak dengan jelas apa yang perlu' },
        { id: 'b', label: 'Ketakutan — saya risau sesuatu akan hilang atau berubah' },
      ],
    },
    {
      kind: 'checkpoint',
      id: 'soalan_3',
      options: [
        { id: 'a', label: 'Belas kasihan — saya faham dan boleh maafkan' },
        { id: 'b', label: 'Kelemahan — saya diam sebab takut, bukan sebab reda' },
      ],
    },
    {
      kind: 'checkpoint',
      id: 'soalan_4',
      options: [
        { id: 'a', label: 'Keadilan — saya mahu kebenaran ditegakkan' },
        { id: 'b', label: 'Dendam — saya mahu orang itu rasa apa yang saya rasa' },
      ],
    },
    {
      kind: 'gated',
      id: 'majoriti_a',
      when: answers => bab3JumlahA(answers) >= 3,
      lines: [
        'Cermin hati {nama_pengguna} nampaknya jernih pada situasi ini. Tapi ego kadang menyamar sebagai kebajikan tanpa kita sedar.',
        'Cuba tanya sekali lagi: adakah kejernihan ini sebab {nama_pengguna} memang reda, atau sebab {nama_pengguna} belum diuji dengan cukup dekat?',
      ],
    },
    {
      kind: 'gated',
      id: 'campuran',
      when: answers => bab3JumlahA(answers) === 2,
      lines: [
        'Ini biasa — hati memang berbolak-balik. Yang penting bukan jawapan sempurna, tapi kesediaan {nama_pengguna} berhenti sebentar dan bertanya, seperti yang {nama_pengguna} buat sekarang.',
        'Cuba baca semula soalan yang {nama_pengguna} jawab pilihan kedua. Apa yang sebenarnya cermin itu tunjukkan?',
      ],
    },
    {
      kind: 'gated',
      id: 'majoriti_b',
      when: answers => bab3JumlahA(answers) <= 1,
      lines: [
        'Terima kasih kerana jujur — ini bahagian yang paling sukar. Ingat ini: melihat debu bukanlah bukti bahawa {nama_pengguna} tiada harapan; ia adalah permulaan penyucian.',
        "Tak perlu benci diri sendiri sebab jawapan ini. Cukup bawa balik kepada Allah — Ya Muqallibal Qulub, thabbit qalbi 'ala dinik.",
      ],
    },
    {
      kind: 'narration',
      id: 'resolusi_cermin_logam',
      lines: [
        'Zaman dahulu, cermin bukan diperbuat daripada kaca — ia diperbuat daripada logam yang digilap. Bila berkarat, ia perlu dua peringkat kerja untuk kembali jernih:',
        'Kilat kasar — kain kasar, tenaga kuat, untuk buang karat tebal yang jelas kelihatan.',
        'Kilat halus — kain lembut, gerakan senyap, untuk buang habuk-habuk halus yang tak nampak mata kasar.',
        'Hati {nama_pengguna} macam cermin logam ini. Zikir Jahar ialah kilat kasar — bersuara, untuk buang kelalaian dan hati yang keras. Zikir Khafi ialah kilat halus — senyap dalam diri, untuk buang riya\' dan kebanggaan tersembunyi yang baru {nama_pengguna} kesan sebentar tadi.',
        'Soalan-soalan tadi cuma tunjuk di mana habuknya. Kerja mengilap sebenar — itu zikir.',
        'Nak ke Amalan TQN sekarang?',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab3',
      options: [
        { id: 'mula', label: 'Ya, ke Amalan TQN', action: 'goto-amalan' },
        { id: 'tidak', label: 'Tidak, cukup dulu', action: 'exit' },
      ],
    },
  ],

  bab_4: [
    {
      kind: 'narration',
      id: 'hati_jernih_tanda',
      lines: [
        'Hati yang jernih tak bagi {nama_pengguna} masuk ke intipati Tuhan — tiada makhluk boleh mengandungi Yang Tidak Terhingga.',
        'Tapi hati yang jernih boleh kenal kesan nama-nama Ilahi di sekeliling {nama_pengguna}. Kehidupan bukan koleksi objek rawak — ia medan tanda-tanda.',
        'Keindahan ingatkan Yang Maha Indah. Ilmu ingatkan Yang Maha Mengetahui. Perlindungan ingatkan Al-Hafiz. Pengampunan ingatkan Al-Ghaffar.',
        'Bila {nama_pengguna} nampak sesuatu yang indah, pandai, atau baik pada diri sendiri — pernah tak {nama_pengguna} terfikir, dari mana sebenarnya ia datang?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'terfikir_sumber',
      options: [
        { id: 'selalu', label: 'Selalu terfikir' },
        { id: 'kadang', label: 'Kadang-kadang' },
        { id: 'tak_pernah', label: 'Tak pernah terfikir' },
      ],
    },
    {
      kind: 'narration',
      id: 'analogi_cermin',
      lines: [
        'Cermin tidak memiliki cahaya. Ia boleh pantulkan keindahan yang luar biasa, tapi ia tak pernah memiliki apa yang muncul di dalamnya.',
        'Letak cermin depan taman — ia mengandungi warna-warna bunga, tanpa hasilkan sehelai kelopak pun. Letak depan langit — ia pantulkan biru yang luas, tanpa memiliki langit. Letak depan matahari — ia bersinar dengan cahaya yang bukan miliknya.',
        'Setiap kualiti yang {nama_pengguna} ada — kecerdasan, suara, kekuatan, peluang — semuanya diterima. Bukan dihasilkan sendiri.',
      ],
    },
    {
      kind: 'narration',
      id: 'ego_masuk_campur',
      lines: [
        'Tapi ego lihat kualiti yang diterima ini, dan diam-diam berkata: "Ini milik mutlak saya."',
        '"Saya bijak" — diam-diam bermaksud, kecerdasan saya buktikan saya lebih baik dari orang lain.',
        '"Saya pemurah" — diam-diam tunggu untuk dikagumi.',
        '"Saya sedar rohani" — diam-diam mula pandang rendah orang yang kelihatan kurang berdisiplin.',
        'Mana satu paling dekat dengan {nama_pengguna} sekarang?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'ego_dekat',
      options: [
        { id: 'bijak', label: '"Saya bijak" — nak dianggap lebih baik' },
        { id: 'pemurah', label: '"Saya pemurah" — tunggu dikagumi' },
        { id: 'rohani', label: '"Saya sedar rohani" — pandang rendah orang lain' },
        { id: 'tiada', label: 'Tak satu pun buat masa ini' },
      ],
    },
    {
      kind: 'narration',
      id: 'dua_laluan',
      lines: [
        'Kualiti yang sama boleh bawa {nama_pengguna} ke dua tempat berbeza, bergantung apa yang ia digabungkan dengan.',
        'Pengetahuan + kerendahan hati = panduan. Pengetahuan + kebanggaan = tabir.',
        'Kekayaan + rasa syukur = perkhidmatan. Kekayaan + kepentingan diri = penguasaan.',
        'Kewibawaan + tanggungjawab = perlindungan. Kewibawaan + ego = penindasan.',
        'Masalahnya bukan pada kualiti itu sendiri. Masalahnya ialah hubungan {nama_pengguna} dengannya.',
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab4',
      lines: [
        '{nama_pengguna} tak perlu nafikan kebolehan sendiri — itu bukan kerendahan hati, itu sekadar satu lagi cara menuntut jaminan daripada orang lain.',
        'Kerendahan hati sejati ialah persepsi yang tepat: kenali kualiti itu, tapi tak tuntut ia bebas daripada sumbernya.',
        'Cermin bersinar. Tapi ia tetap tunduk di hadapan cahaya.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab4',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'tamat', label: 'Tamat untuk hari ini', action: 'exit' },
      ],
    },
  ],

  bab_5: [
    {
      kind: 'narration',
      id: 'kerosakan_halus',
      lines: [
        'Ada satu bentuk kerosakan rohani yang paling halus untuk dikesan.',
        'Seseorang mungkin tinggalkan kebanggaan harta — tapi diam-diam kembangkan kebanggaan agama. Berhenti bermegah pasal kekayaan, tapi mula bermegah secara dalaman pasal ibadah sendiri.',
        'Pernah tak {nama_pengguna} rasa — walau sikit — bangga dengan amalan atau kerohanian sendiri, berbanding orang lain?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'pernah_bangga_ibadah',
      options: [
        { id: 'pernah', label: 'Pernah' },
        { id: 'tak_pernah', label: 'Tak pernah' },
        { id: 'tak_pasti', label: 'Tak pasti' },
      ],
    },
    {
      kind: 'narration',
      id: 'bentuk_menyamar',
      lines: [
        'Ada yang berhenti banding harta benda, tapi mula banding keadaan rohani sesama sendiri. Ada yang berhenti cari kekaguman terhadap penampilan, tapi mula cari kekaguman terhadap kerendahan hati sendiri.',
        'Cermin jadi tertutup — oleh debu keinginan untuk diiktiraf sebagai "sudah digilap".',
      ],
    },
    {
      kind: 'narration',
      id: 'ikhlas_kelihatan',
      lines: [
        'Perkembangan rohani yang ikhlas selalunya berlaku secara senyap.',
        '{nama_pengguna} buat kebaikan yang tiada siapa ingat. {nama_pengguna} maafkan seseorang yang tak pernah tahu betapa sukarnya. {nama_pengguna} tahan marah tanpa terima pujian. {nama_pengguna} kekal jujur walaupun tak jujur lebih menguntungkan. {nama_pengguna} berdoa dalam waktu kering, tanpa rasa manis sekalipun.',
        'Bila kali terakhir {nama_pengguna} buat sesuatu yang baik, dan sengaja tak nak sesiapa tahu?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'baik_senyap',
      options: [
        { id: 'baru', label: 'Baru-baru ini' },
        { id: 'lama', label: 'Dah lama tak buat' },
        { id: 'tak_ingat', label: 'Tak ingat pernah buat' },
      ],
    },
    {
      kind: 'narration',
      id: 'dialog_ego_hati',
      lines: [
        'Ego bertanya: "Siapa yang perasan?" Hati jawab: "Orang yang buat perkara itu."',
        'Ego bertanya: "Apa saya dapat?" Hati jawab: "Kebebasan daripada perlu untung."',
        'Ego bertanya: "Adakah ini akan jadikan saya penting?" Hati jawab: "Tujuannya bukan jadi penting — tujuannya jadi telus."',
        'Mana satu soalan Ego yang paling sering {nama_pengguna} dengar dalam hati sendiri?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'soalan_ego_kerap',
      options: [
        { id: 'siapa_perasan', label: '"Siapa yang perasan?"' },
        { id: 'apa_dapat', label: '"Apa saya dapat?"' },
        { id: 'jadi_penting', label: '"Adakah ini jadikan saya penting?"' },
        { id: 'tiada', label: 'Tak satu pun buat masa ini' },
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab5',
      lines: [
        'Ini bukan tentang menghukum diri sebab dengar soalan Ego. Semua orang dengarnya, dari semasa ke semasa.',
        'Yang penting — {nama_pengguna} kenal bila ia bercakap, dan pilih jawapan mana yang {nama_pengguna} ikut.',
        'Tujuan bukan untuk jadi penting. Tujuan untuk jadi telus.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab5',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'tamat', label: 'Tamat untuk hari ini', action: 'exit' },
      ],
    },
  ],

  bab_6: [
    {
      kind: 'narration',
      id: 'debu_menyamar',
      lines: [
        'Debu yang paling berbahaya pada hati bukan yang jelas kelihatan — ketamakan, penipuan, iri hati. Itu mudah dikenali sebab kerosakannya nampak.',
        'Yang paling berbahaya ialah yang menyamar sebagai kebajikan:',
        'Mengawal menyamar sebagai tanggungjawab. Keangkuhan menyamar sebagai keyakinan. Pengecut menyamar sebagai kesabaran. Dendam menyamar sebagai keadilan. Takut kritikan menyamar sebagai kerendahan hati.',
        'Mana satu paling dekat dengan {nama_pengguna} sekarang?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'debu_dekat',
      options: [
        { id: 'mengawal', label: 'Mengawal / tanggungjawab' },
        { id: 'angkuh', label: 'Keangkuhan / keyakinan' },
        { id: 'dendam', label: 'Dendam / keadilan' },
        { id: 'tiada', label: 'Tak satu pun buat masa ini' },
      ],
    },
    {
      kind: 'narration',
      id: 'ego_tafsiran_tengah',
      lines: [
        'Ego bukan sekadar suara lantang yang kata "saya lebih baik". Ia tabiat meletak diri di tengah setiap tafsiran — bertanya pada setiap peristiwa: "Apa maksud ini tentang saya?"',
        'Seseorang tak jawab dengan cepat — ego cipta kisah penolakan. Seseorang tak setuju — ego rasa dihina. Seseorang lain berjaya — ego rasa diri berkurangan.',
        'Pernah tak {nama_pengguna} buat "post-mortem" kecil macam ni dalam kepala — pasal perkara yang sebenarnya tak ada kaitan besar dengan {nama_pengguna}?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'post_mortem_kerap',
      options: [
        { id: 'selalu', label: 'Selalu' },
        { id: 'kadang', label: 'Kadang-kadang' },
        { id: 'jarang', label: 'Jarang' },
      ],
    },
    {
      kind: 'narration',
      id: 'dua_penyesalan',
      lines: [
        'Bila {nama_pengguna} buat silap, ada dua jalan.',
        'Penyesalan yang sihat berkata: "Tindakan ini tak cerminkan apa aku dicipta untuk berkhidmat. Aku akui, aku baiki apa aku boleh, aku minta ampun, dan aku berpaling lagi."',
        'Keputusasaan pula berkata: "Noda aku terlalu besar untuk diampunkan." Ini kelihatan macam rendah diri — tapi sebenarnya ia diam-diam bagi kegagalan {nama_pengguna} kuasa yang lebih besar daripada pengampunan Allah.',
        'Bila {nama_pengguna} buat silap, {nama_pengguna} lebih dekat ke mana?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'jenis_penyesalan',
      options: [
        { id: 'sihat', label: 'Penyesalan sihat — akui, baiki, minta ampun, teruskan' },
        { id: 'putus_asa', label: 'Keputusasaan — rasa noda terlalu besar' },
        { id: 'campuran', label: 'Campuran, bergantung situasi' },
      ],
    },
    {
      kind: 'narration',
      id: 'taubat_kepulangan',
      lines: [
        'Taubat, dalam erti yang paling dalam, ialah satu kepulangan — bukan sekadar takut hukuman.',
        '{nama_pengguna} mungkin perlu berpaling seribu kali. Itu tak menjadikan taubat {nama_pengguna} tak bermakna — setiap kepulangan yang ikhlas melemahkan ilusi bahawa perpisahan itu keadaan kekal {nama_pengguna}.',
        'Benci diri sendiri bukan penyucian — itu satu lagi bentuk obsesi kepada diri sendiri.',
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab6',
      lines: [
        "Ingat doa ini: Ya Muqallibal Qulub, thabbit qalbi 'ala dinik — Wahai Yang membolak-balikkan hati, tetapkanlah hatiku di atas agama-Mu.",
        'Hati yang berpaling seribu kali masih boleh kembali seribu satu kali. Itu bukan kegagalan — itu perjalanan.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab6',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'tamat', label: 'Tamat untuk hari ini', action: 'exit' },
      ],
    },
  ],

  bab_7: [
    {
      kind: 'narration',
      id: 'satu_kualiti_tak_cukup',
      lines: [
        'Kematangan rohani perlukan keseimbangan. Ramai orang pilih satu kualiti sahaja, dan bina seluruh identiti sekelilingnya.',
        'Ada yang hargai kebaikan — tapi jadi tak mampu kata tidak, bertolak ansur dengan manipulasi, anggap ketakutan sendiri sebagai belas kasihan.',
        'Ada yang hargai kebenaran — tapi cakap tanpa hikmah, hina orang, anggap kekerasan sendiri sebagai kejujuran.',
        'Ada yang hargai pengampunan — tapi guna untuk elak sempadan yang sepatutnya perlu.',
        'Ada yang hargai disiplin — tapi jadi tak berbelas kasihan pada kelemahan orang lain.',
        'Mana satu paling {nama_pengguna} cenderung pegang, sampai kadang jadi melampau?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'cenderung_melampau',
      options: [
        { id: 'baik_tak_tegas', label: 'Baik, tapi tak boleh kata tidak' },
        { id: 'benar_kasar', label: 'Benar, tapi kasar' },
        { id: 'pemaaf_elak', label: 'Pemaaf, tapi elak sempadan' },
        { id: 'disiplin_keras', label: 'Disiplin, tapi keras dengan orang lain' },
      ],
    },
    {
      kind: 'narration',
      id: 'cermin_lengkap',
      lines: [
        'Cermin yang lengkap tak hanya cerminkan apa yang selesa.',
        'Rahmat dan keadilan mesti bertemu. Keindahan dan keagungan mesti bertemu. Kelembutan dan ketegasan mesti bertemu.',
        'Satu sahaja, tanpa pasangannya — jadi tak seimbang, walaupun ia sifat yang baik pada asalnya.',
      ],
    },
    {
      kind: 'narration',
      id: 'bila_sifat_sesuai',
      lines: [
        'Kanak-kanak yang ketakutan perlukan kelembutan. Manipulator yang berulang kali perlukan sempadan yang tegas. Kesilapan yang ikhlas perlukan pengampunan. Tindakan penindasan yang disengajakan perlukan tentangan.',
        'Kebijaksanaan ialah letak setiap kualiti pada kedudukannya yang betul.',
        'Situasi {nama_pengguna} yang paling terkini — perlukan kelembutan, atau perlukan ketegasan?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'perlukan_apa',
      options: [
        { id: 'kelembutan', label: 'Perlukan kelembutan' },
        { id: 'ketegasan', label: 'Perlukan ketegasan' },
        { id: 'belum_pasti', label: 'Belum pasti' },
        { id: 'tiada_situasi', label: 'Tiada situasi khusus sekarang' },
      ],
    },
    {
      kind: 'narration',
      id: 'tempat_manifestasi',
      lines: [
        'Manusia tak jadi ilahi melalui sifat-sifat ini. {nama_pengguna} tetap seorang hamba.',
        'Tapi kehambaan capai keindahan apabila {nama_pengguna} jadi tempat manifestasi yang setia untuk apa yang Tuhan kasihi.',
        'Tangan memberi, tapi ingat Pemberi. Lidah cakap benar, tapi ingat hidayah milik Tuhan. Hati tunjuk belas kasihan, tapi tak dakwa diri sebagai sumber belas kasihan itu.',
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab7',
      lines: [
        'Cermin bersinar. Tapi ia tetap tunduk di hadapan cahaya yang bukan miliknya.',
        '{nama_pengguna} sudah kenal hati sebagai pusat kesedaran, sudah nampak ia sentiasa berubah, sudah kesan debu ego di dalamnya, sudah belajar kembali bila jatuh. Sekarang, {nama_pengguna} belajar seimbangkan apa yang dipelajari.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab7',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'tamat', label: 'Tamat untuk hari ini', action: 'exit' },
      ],
    },
  ],

  bab_8: [
    {
      kind: 'narration',
      id: 'pembuka_bab8',
      lines: [
        'Idea hati sebagai cermin itu indah — tapi keindahan tanpa latihan hanya jadi hiburan.',
        'Persoalan sebenar bukan sama ada {nama_pengguna} faham metafora ini. Persoalan sebenar: adakah hidup {nama_pengguna} sedang menggilap hati?',
        'Ada tujuh kerja mengilap. Mari kita lalui satu-satu.',
      ],
    },
    {
      kind: 'narration',
      id: 'dzikir_kesunyian',
      lines: [
        'Ingatan (Dzikir). Hati yang terganggu lupa sumbernya, jadi terhipnotis oleh bentuk. Ingatan kembalikan hati kepada keadaannya yang asal — saat ini tak kosong daripada pengetahuan Tuhan, kesukaran ini tak di luar kesedaran-Nya, rahmat ini tak tiba secara bebas.',
        'Kesunyian. Duduk tanpa segera cari rangsangan. Perhatikan betapa cepat minda cari gangguan. Jangan percaya setiap fikiran hanya kerana ia muncul.',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'perlu_dzikir_kesunyian',
      options: [
        { id: 'dzikir', label: 'Saya lebih perlukan Dzikir' },
        { id: 'kesunyian', label: 'Saya lebih perlukan Kesunyian' },
        { id: 'kedua_dua', label: 'Kedua-duanya' },
      ],
    },
    {
      kind: 'narration',
      id: 'muhasabah_khidmat',
      lines: [
        'Muhasabah. Pada penghujung hari, tanya: di mana rahmat melalui saya hari ini? Di mana kesombongan ganggu? Di mana saya bercakap dengan ikhlas? Di mana saya besar-besarkan sesuatu untuk lindungi imej sendiri?',
        'Khidmat. Cermin yang hanya hadap dirinya sendiri, tak cerminkan apa-apa selain dirinya. Layan seseorang yang tak boleh tingkatkan reputasi {nama_pengguna}. Beri tanpa umumkan jumlahnya. Dengar tanpa sediakan jawapan sendiri dulu.',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'perlu_muhasabah_khidmat',
      options: [
        { id: 'muhasabah', label: 'Saya lebih perlukan Muhasabah' },
        { id: 'khidmat', label: 'Saya lebih perlukan Khidmat' },
        { id: 'kedua_dua', label: 'Kedua-duanya' },
      ],
    },
    {
      kind: 'narration',
      id: 'pengampunan_syukur',
      lines: [
        'Pengampunan. Tak semestinya bermakna berdamai. Ia bermakna {nama_pengguna} berhenti beri makan keinginan untuk kemusnahan orang itu. Kembalikan penghakiman kepada Allah.',
        'Syukur. Syukur ilmu ialah mengajar dan kekal rendah hati. Syukur kekayaan ialah kemurahan dan tanggungjawab. Syukur cinta ialah kesetiaan tanpa memiliki.',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'perlu_pengampunan_syukur',
      options: [
        { id: 'pengampunan', label: 'Saya lebih perlukan Pengampunan' },
        { id: 'syukur', label: 'Saya lebih perlukan Syukur' },
        { id: 'kedua_dua', label: 'Kedua-duanya' },
      ],
    },
    {
      kind: 'narration',
      id: 'tawakkal',
      lines: [
        'Penyerahan (Tawakkal). Bukan pasrah secara pasif — {nama_pengguna} tetap bertindak, merancang, menentang ketidakadilan.',
        'Ia bermakna, selepas bertindak dengan tanggungjawab, {nama_pengguna} lepaskan tuntutan bahawa realiti mesti patuh kepada {nama_pengguna}. Bekerja tanpa jadikan hasil sebagai tuhan. Berdoa tanpa anggap ia satu transaksi yang paksa Allah ikut jadual {nama_pengguna}.',
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab8_soalan',
      lines: [
        'Tujuh amalan ini bukan senarai semak untuk disempurnakan sekali gus. Ia kerja seumur hidup.',
        'Daripada tujuh ini, mana satu paling {nama_pengguna} rasa perlu mula dulu?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'mula_amalan',
      options: [
        { id: 'dzikir', label: 'Dzikir' },
        { id: 'kesunyian', label: 'Kesunyian' },
        { id: 'muhasabah', label: 'Muhasabah' },
        { id: 'khidmat', label: 'Khidmat' },
        { id: 'pengampunan', label: 'Pengampunan' },
        { id: 'syukur', label: 'Syukur' },
        { id: 'tawakkal', label: 'Tawakkal' },
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab8_selepas_pilih',
      lines: [
        '{nama_pengguna} sudah ada Zikir Jahar dan Zikir Khafi dalam app ini — itu tempat mula yang paling konkrit untuk amalan Dzikir. Amalan lain akan disusun sebagai sesi berasingan pada masa akan datang.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab8',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'khafi', label: 'Ke Amalan TQN sekarang', action: 'goto-amalan' },
        { id: 'tamat', label: 'Tamat untuk hari ini', action: 'exit' },
      ],
    },
  ],

  bab_9: [
    {
      kind: 'narration',
      id: 'akan_gagal',
      lines: [
        'Akan ada hari-hari {nama_pengguna} gagal. {nama_pengguna} akan marah selepas baru sahaja bercakap pasal sabar. {nama_pengguna} akan cari kelulusan orang lain, selepas isytihar diri bebas daripada pendapat mereka.',
        'Jangan ubah ketidakkonsistenan ini jadi alasan untuk berhenti. Seorang pencari yang ikhlas mungkin jatuh berulang kali — sambil terus mengembalikan cermin kepada cahaya.',
        'Pernah tak {nama_pengguna} rasa perjalanan rohani sendiri "gagal" sebab buat silap lepas belajar sesuatu yang baru?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'rasa_gagal',
      options: [
        { id: 'pernah', label: 'Pernah' },
        { id: 'tak_pernah', label: 'Tak pernah' },
        { id: 'selalu', label: 'Selalu rasa macam ni' },
      ],
    },
    {
      kind: 'narration',
      id: 'matlamat_sebenar',
      lines: [
        '{nama_pengguna} matlamat bukan untuk cipta imej rohani sempurna untuk dikagumi orang lain. Keinginan untuk kelihatan sempurna — itu sendiri debu.',
        'Matlamat {nama_pengguna} ialah untuk jadi semakin jujur, semakin menerima, dan semakin mampu cerminkan apa yang setiap saat perlukan.',
      ],
    },
    {
      kind: 'narration',
      id: 'apa_maksud_cermin',
      lines: [
        'Bukan Tuhan boleh dikurung jadi imej dalam diri {nama_pengguna}. Bukan {nama_pengguna} jadi ilahi. Bukan setiap keinginan hati {nama_pengguna} jadi suci dengan sendirinya.',
        'Ia bermakna hati jadi bebas daripada pemilikan palsu, kebencian, kesombongan, dan kelalaian — sehingga kesan nama-nama Ilahi boleh muncul melaluinya dengan kurang herotan.',
      ],
    },
    {
      kind: 'narration',
      id: 'bila_orang_jumpa',
      lines: [
        'Bila orang jumpa {nama_pengguna}, apa yang mereka akan jumpa?',
        'Rahmat tanpa kelemahan. Kekuatan tanpa kekejaman. Kebenaran tanpa penghinaan. Ilmu tanpa kesombongan. Seorang manusia yang tak dakwa dirinya cahaya — tapi sudah berhenti sengaja menyekatnya.',
        'Macam mana {nama_pengguna} nak orang rasa, selepas berjumpa dengan {nama_pengguna}?',
      ],
    },
    {
      kind: 'checkpoint',
      id: 'macam_mana_orang_rasa',
      options: [
        { id: 'tenang', label: 'Tenang & selamat' },
        { id: 'dihormati', label: 'Dihormati & didengar' },
        { id: 'harapan', label: 'Diberi harapan' },
        { id: 'semua', label: 'Semua di atas' },
      ],
    },
    {
      kind: 'narration',
      id: 'apa_yang_tinggal',
      lines: [
        'Suatu hari nanti, setiap cermin luaran akan hilang. Wajah akan berubah. Tubuh akan melemah. Harta akan berpindah tangan. Reputasi akan pudar dalam ingatan orang yang juga sedang meninggal dunia.',
        'Apa yang tinggal bukan imej berjaya yang {nama_pengguna} cipta di hadapan dunia. Apa yang tinggal ialah keadaan hati yang {nama_pengguna} bawa melaluinya.',
        'Jadi, jangan layan hati sebagai objek emosi kecil. Ia amanah.',
      ],
    },
    {
      kind: 'narration',
      id: 'penutup_bab9',
      lines: [
        '{nama_pengguna} sudah lalui lapan bab perjalanan ini — kenal hati sebagai pusat kesedaran, nampak ia sentiasa berubah, kesan debu ego di dalamnya, belajar kembali bila jatuh, seimbangkan sifat-sifat yang dipelajari, dan mula amalan-amalan untuk menggilapnya.',
        'Kosongkan hati daripada kebanggaan kilauannya sendiri. Kemudian, putarkan ia ke arah Allah.',
        'Cermin itu tak perlu menangkap Yang Tidak Terhingga. Yang diperlukan hanyalah ia cukup jernih — supaya melalui satu kehidupan {nama_pengguna} yang terbatas, rahmat, kebijaksanaan, keindahan, kesabaran, keadilan, dan cinta — dibenarkan untuk kelihatan.',
      ],
    },
    {
      kind: 'chapterEnd',
      id: 'akhir_bab9',
      options: [
        { id: 'simpan', label: 'Simpan refleksi ini', action: 'save-and-exit' },
        { id: 'semula', label: 'Mula semula dari Bab 1', action: 'restart' },
        { id: 'khafi', label: 'Kembali ke Amalan TQN', action: 'goto-amalan' },
      ],
    },
  ],
}
