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
      afterCheckpoint: string
      whenOptionId: string
      lines: string[]
    }
  | {
      kind: 'chapterEnd'
      id: string
      options: { id: string; label: string; action: 'next-chapter' | 'exit' | 'save-and-exit' }[]
    }

export type ChapterId = 'pembukaan' | 'bab_1'

export interface ChapterMeta {
  id: string
  order: number
  title: string
  subtitle: string
  status: 'available' | 'coming_soon'
}

export const CHAPTER_META: ChapterMeta[] = [
  { id: 'pembukaan', order: 1, title: 'Bab Pembukaan', subtitle: 'Mencari hati bersama', status: 'available' },
  { id: 'bab_1', order: 2, title: 'Bab 1: Hakikat Hati', subtitle: 'Hati sebagai pusat kesedaran', status: 'available' },
  { id: 'bab_2', order: 3, title: 'Bab 2', subtitle: 'Akan datang', status: 'coming_soon' },
  { id: 'bab_3', order: 4, title: 'Bab 3', subtitle: 'Akan datang', status: 'coming_soon' },
]

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
}
