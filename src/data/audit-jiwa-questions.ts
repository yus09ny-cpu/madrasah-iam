// ─── Audit Jiwa — Bank Soalan ─────────────────────────────────────────────────
// Setiap soalan bertujuan mendedahkan syaitan ATAU nafsu dalam kehidupan
// pengguna, membawa mereka kepada Zikir Jahar dan Zikir Khafi sebagai ubat.

export interface AuditQuestion {
  id: string
  soalan: string
  tujuan: 'dedah_syaitan' | 'dedah_nafsu' | 'tunjuk_jalan'
  ikutan?: string
  ubat: 'zikir_jahar' | 'zikir_khafi' | 'zikir_jahar_khafi'
}

// ─── Kumpulan A — Dedah Syaitan (20 soalan) ──────────────────────────────────

export const KUMPULAN_A: AuditQuestion[] = [
  {
    id: 'a1',
    soalan: 'Semasa solat tadi — pada saat mana fikiran mula melayang kepada perkara lain?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang muncul dalam fikiran pada saat itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a2',
    soalan: 'Apakah perkara pertama yang anda fikirkan selepas salam solat tadi?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Adakah perkara itu lebih penting dari Allah pada masa itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a3',
    soalan: "Adakah ada bisikan 'solat cepat siap, ada kerja lain' semasa solat tadi?",
    tujuan: 'dedah_syaitan',
    ikutan: 'Bisikan itu — datang dari mana?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a4',
    soalan: "Berapa kali anda perlu 'tarik balik' fikiran kepada solat dalam rakaat tadi?",
    tujuan: 'dedah_syaitan',
    ikutan: 'Apakah yang sentiasa menarik fikiran anda ketika itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a5',
    soalan: 'Adakah anda rasa diperhatikan oleh Allah sepanjang solat tadi?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Jika ya — mengapa masih ada gangguan fikiran?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a6',
    soalan: 'Apakah yang paling mudah mencuri kehadiran hati anda dalam solat?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Sudah berapa lama perkara itu menganggu anda?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a7',
    soalan: 'Adakah pernah dalam solat tadi anda lupa berapa rakaat yang telah dilakukan?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang sedang anda fikirkan ketika itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a8',
    soalan: "Bayangkan syaitan berkata: 'Selesaikan solat cepat-cepat.' Adakah anda dengar suara itu dalam solat tadi?",
    tujuan: 'dedah_syaitan',
    ikutan: 'Bagaimana suara itu terasa — halus atau kuat?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a9',
    soalan: 'Adakah ada perasaan berat untuk bangkit solat sebelum tadi?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang membuatkan ia terasa berat?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a10',
    soalan: "Selepas solat — adakah anda rasa sesuatu 'terlepas' atau 'tidak lengkap'?",
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang terasa tidak lengkap itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a11',
    soalan: 'Dalam solat tadi — adakah anda sedar bila tepat-tepat hati mula melayang?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Bagaimana rasanya ketika sedar hati sudah jauh?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a12',
    soalan: 'Apakah mimpi atau rancangan masa depan yang muncul dalam solat tadi?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Dari mana datang fikiran itu pada masa solat?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a13',
    soalan: "Adakah ada saat dalam solat tadi yang anda rasa 'tersangat jauh' dari Allah?",
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang berlaku pada saat itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a14',
    soalan: 'Bilakah kali terakhir anda solat tanpa sebarang gangguan fikiran langsung?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang berbeza ketika itu berbanding hari ini?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a15',
    soalan: 'Adakah telefon atau notifikasi terlintas dalam fikiran semasa solat tadi?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Betapa kuatnya tarikan itu dalam solat?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a16',
    soalan: 'Selepas salam — berapa saat sebelum anda ambil telefon?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang mendorong anda berbuat demikian dengan segera?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a17',
    soalan: 'Adakah ada suara dalam kepala yang berkata solat anda tidak diterima atau tidak cukup baik?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Dari mana datang suara itu — dan adakah anda percayainya?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a18',
    soalan: 'Tergesa-gesa dalam solat — untuk perkara apa?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apakah yang lebih utama dari Allah pada masa itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a19',
    soalan: 'Adakah ada saat dalam solat tadi yang anda rasa Allah sangat dekat?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa yang berlaku selepas saat yang indah itu?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a20',
    soalan: 'Jika syaitan ada KPI untuk ganggu solat anda — berjayakah dia hari ini?',
    tujuan: 'dedah_syaitan',
    ikutan: 'Apa strateginya yang paling berkesan terhadap anda?',
    ubat: 'zikir_jahar',
  },
]

// ─── Kumpulan B — Dedah Nafsu (20 soalan) ────────────────────────────────────

export const KUMPULAN_B: AuditQuestion[] = [
  {
    id: 'b1',
    soalan: "Adakah ada sebahagian diri yang 'tidak mahu' solat sebelum tadi?",
    tujuan: 'dedah_nafsu',
    ikutan: 'Apa alasan yang nafsu beri kepada anda ketika itu?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b2',
    soalan: 'Solat tadi — sekadar gugur kewajipan atau benar-benar ingin berjumpa Allah?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Jujur — yang mana lebih tepat menggambarkan solat anda?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b3',
    soalan: 'Adakah anda puas dengan kualiti solat tadi?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Jika puas — adakah itu tanda kejayaan atau tanda nafsu yang mudah berpuas hati?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b4',
    soalan: 'Berapa kali hari ini anda lebih utamakan keinginan diri daripada perintah Allah?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Siapa yang menang lebih banyak hari ini — anda atau nafsu anda?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b5',
    soalan: 'Adakah solat Subuh tadi dengan penuh sedar atau sekadar menunaikan?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Apa bezanya bagi anda antara dua keadaan itu?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b6',
    soalan: 'Apakah yang lebih anda rindukan — rehat atau solat — sebelum solat tadi?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Itu adalah jawapan nafsu. Apa jawapan jiwa anda?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b7',
    soalan: 'Adakah anda solat kerana takut dosa atau kerana cinta kepada Allah?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Mana lebih kuat dalam hati ketika solat tadi?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b8',
    soalan: 'Selepas solat — adakah anda berasa lebih baik atau sama sahaja?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Jika sama sahaja — apa yang mungkin menghalang solat daripada memberi kesan?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b9',
    soalan: 'Bilakah terakhir kali anda menangis dalam solat atau rasa sangat sebak?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Apa yang berbeza ketika itu berbanding solat hari ini?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b10',
    soalan: "Adakah ada rasa bangga selepas solat — 'alhamdulillah saya dah solat'?",
    tujuan: 'dedah_nafsu',
    ikutan: 'Rasa bangga itu — dari jiwa yang bersyukur atau dari nafsu yang merasa cukup?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b11',
    soalan: 'Apakah perkara yang paling anda suka lakukan selepas solat?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Adakah ia membawa anda lebih dekat atau lebih jauh dari Allah?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b12',
    soalan: 'Adakah anda solat dengan cara yang sama seperti 10 tahun lepas?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Jika ya — apakah yang berubah dalam hati berbanding solat anda dahulu?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b13',
    soalan: 'Nafsu sentiasa ajak kepada kejahatan — kata Allah dalam Surah Yusuf. Hari ini nafsu mengajak anda kepada apa?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Berapa kali anda dengar ajakannya — dan berapa kali anda menurut?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b14',
    soalan: 'Adakah solat mengubah cara anda layani orang lain selepas ini?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Jika tidak — mengapa solat belum memberi kesan kepada tingkah laku?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b15',
    soalan: 'Apakah yang nafsu anda paling tidak suka dari amalan solat?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Itulah sebenarnya yang paling penting untuk dijaga — mengapa?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b16',
    soalan: 'Adakah anda lebih mudah buat perkara yang disukai nafsu berbanding yang diperintah Allah?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Beri satu contoh yang berlaku hari ini.',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b17',
    soalan: 'Selepas solat — berapa cepat anda kembali kepada kebiasaan lama?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Apa yang menarik anda kembali begitu pantas?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b18',
    soalan: 'Adakah ada perkara yang anda tahu salah tapi tetap buat hari ini?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Siapa yang menang dalam perlawanan itu — kesedaran anda atau nafsu anda?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b19',
    soalan: 'Jika nafsu adalah musuh dalam diri — apakah senjatanya yang paling berkesan terhadap anda?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Bilakah ia paling kuat — pagi, petang, atau malam?',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b20',
    soalan: 'Allah kata nafsu sentiasa ajak kepada kejahatan. Hari ini — kejahatan apa yang nafsu ajak?',
    tujuan: 'dedah_nafsu',
    ikutan: 'Adakah anda sedar ketika itu sedang berlaku atau sedar selepas?',
    ubat: 'zikir_khafi',
  },
]

// ─── Kumpulan C — Tunjuk Jalan Keluar (10 soalan) ────────────────────────────

export const KUMPULAN_C: AuditQuestion[] = [
  {
    id: 'c1',
    soalan: 'Bayangkan ada benteng yang menutup semua pintu masuk syaitan. Adakah anda ingin tahu benteng itu?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apa yang menghalang anda daripada mencarinya selama ini?',
    ubat: 'zikir_jahar',
  },
  {
    id: 'c2',
    soalan: 'Para wali Allah mengamalkan zikir khusus untuk menghalang syaitan dari luar dan nafsu dari dalam. Adakah anda ingin tahu zikir itu?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apakah yang anda harapkan berubah jika anda mengamalkannya?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c3',
    soalan: 'Jika ada ubat untuk dua penyakit yang menghalang misi anda di dunia — adakah anda ingin tahu ubat itu?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apakah yang membuat anda yakin atau ragu tentang ubat itu?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c4',
    soalan: 'Allah berfirman zikir adalah pekerjaan yang paling agung. Pernahkah anda tanya mengapa?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apa jawapan yang anda dapat selama ini?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c5',
    soalan: 'Adakah anda pernah rasa solat yang benar-benar tenang — tiada gangguan syaitan, tiada pujukan nafsu?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Mahu rasa itu menjadi pengalaman setiap solat?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c6',
    soalan: 'Jika anda boleh tambah satu amalan sahaja dalam hidup yang memberi kesan paling besar — apakah ia?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apakah yang menghalang anda daripada mengamalkannya sekarang?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c7',
    soalan: 'Apakah satu perubahan terbesar yang anda mahu lihat dalam solat anda dalam 30 hari akan datang?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apa langkah pertama yang anda rasa perlu diambil?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c8',
    soalan: 'Nabi s.a.w. berkata: "Bagi setiap sesuatu ada pembersihnya, dan pembersih hati adalah zikrullah." Apakah makna ini bagi anda?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Bila terakhir kali anda benar-benar membersihkan hati?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c9',
    soalan: 'Jika jiwa anda boleh bercakap — apakah yang ia akan minta daripada anda hari ini?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apakah yang menghalang anda daripada memberikannya?',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c10',
    soalan: 'Apakah satu perkara tentang hubungan anda dengan Allah yang anda mahu perbaiki paling segera?',
    tujuan: 'tunjuk_jalan',
    ikutan: 'Apakah halangan terbesar yang perlu diatasi?',
    ubat: 'zikir_jahar_khafi',
  },
]

export const ALL_AUDIT_QUESTIONS = [...KUMPULAN_A, ...KUMPULAN_B, ...KUMPULAN_C]

// ─── Selection Logic ──────────────────────────────────────────────────────────

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.abs(Math.floor(Math.sin(seed * 9301 + i * 49297) * 233280)) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function selectAuditQuestions(
  dayCount: number,
  mood: number,
  isPro: boolean
): AuditQuestion[] {
  const count = isPro ? 3 : 2

  let pool: AuditQuestion[]

  if (dayCount <= 7) {
    // Minggu 1: dedah syaitan dahulu
    pool = mood <= 2
      ? KUMPULAN_A.slice(0, 12)        // soalan lebih lembut
      : KUMPULAN_A
  } else if (dayCount <= 14) {
    // Minggu 2: masuk nafsu
    pool = mood <= 2
      ? [...KUMPULAN_A.slice(0, 8), ...KUMPULAN_B.slice(0, 8)]
      : [...KUMPULAN_A.slice(8), ...KUMPULAN_B.slice(0, 12)]
  } else {
    // Minggu 3+: tunjuk jalan
    const setiap7hari = dayCount % 7 === 0
    const moodTinggi = mood >= 4
    if (setiap7hari || moodTinggi) {
      pool = [...KUMPULAN_B.slice(10), ...KUMPULAN_C]
    } else {
      pool = [...KUMPULAN_A.slice(15), ...KUMPULAN_B.slice(0, 12), ...KUMPULAN_C.slice(0, 3)]
    }
  }

  const shuffled = shuffle(pool, dayCount)
  return shuffled.slice(0, count)
}
