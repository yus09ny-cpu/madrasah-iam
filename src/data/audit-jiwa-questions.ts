// ─── Audit Jiwa — Bank Soalan ─────────────────────────────────────────────────
// Setiap soalan bertujuan mendedahkan syaitan ATAU nafsu dalam kehidupan
// pengguna, membawa mereka kepada Zikir Jahar dan Zikir Khafi sebagai ubat.

export interface AuditQuestion {
  id: string
  soalan: string
  tujuan: 'dedah_syaitan' | 'dedah_nafsu' | 'tunjuk_jalan' | 'untuk_baru' | 'untuk_kembali'
  ikutan?: string
  ubat: 'zikir_jahar' | 'zikir_khafi' | 'zikir_jahar_khafi'
}

// ─── Kumpulan A — Dedah Syaitan (20 soalan) — Ubat: Zikir Jahar ──────────────

export const KUMPULAN_A: AuditQuestion[] = [
  {
    id: 'a1',
    soalan: 'Berapa kali anda perlu tarik kembali fikiran ke dalam solat tadi — dan ke mana ia pergi?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a2',
    soalan: 'Apakah yang syaitan bisikkan kepada anda semasa sujud tadi?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a3',
    soalan: 'Adakah ada suara dalam kepala yang berkata solat anda tidak diterima atau tidak cukup baik?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a4',
    soalan: 'Bila tepat-tepat hati anda mula melayang dalam solat tadi — dan apa yang mencurinya?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a5',
    soalan: 'Apakah mimpi atau rancangan yang muncul dalam kepala anda semasa solat tadi?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a6',
    soalan: 'Selepas salam — berapa saat sebelum anda ambil telefon? Apa yang menarik anda ke sana?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a7',
    soalan: 'Adakah syaitan berjaya dalam solatnya terhadap anda hari ini?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a8',
    soalan: "Berapa rakaat yang anda benar-benar hadir — dan berapa yang anda 'hilang'?",
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a9',
    soalan: 'Apakah satu bisikan yang paling kerap datang semasa anda cuba khusyuk?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a10',
    soalan: 'Jika syaitan ada KPI untuk ganggu solat anda — berapa % dia berjaya hari ini?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a11',
    soalan: 'Apakah berita atau media sosial yang pertama anda lihat pagi tadi — sebelum atau selepas mengingati Allah?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a12',
    soalan: 'Berapa jam hari ini anda habiskan untuk dunia berbanding untuk Allah?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a13',
    soalan: 'Adakah ada perkara yang anda lakukan hari ini yang anda tahu tidak betul — tapi teruskan juga?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a14',
    soalan: 'Bila kali terakhir anda rasa Allah benar-benar memerhati anda — bukan sekadar tahu?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a15',
    soalan: 'Apakah yang menghalang anda dari mengingati Allah sepanjang hari ini?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a16',
    soalan: 'Adakah telefon anda lebih banyak masa dalam tangan anda berbanding Al-Quran minggu ini?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a17',
    soalan: 'Berapa kali hari ini anda teringat Allah secara spontan — bukan sebab waktu solat?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a18',
    soalan: 'Apakah yang paling mudah mencuri kehadiran hati anda dari Allah?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a19',
    soalan: 'Adakah anda rasa lebih takut kepada manusia atau kepada Allah dalam keputusan anda hari ini?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
  {
    id: 'a20',
    soalan: 'Jika rakaman semua fikiran anda hari ini diputarkan — berapa banyak melibatkan Allah?',
    tujuan: 'dedah_syaitan',
    ubat: 'zikir_jahar',
  },
]

// ─── Kumpulan B — Dedah Nafsu (20 soalan) — Ubat: Zikir Khafi ────────────────

export const KUMPULAN_B: AuditQuestion[] = [
  {
    id: 'b1',
    soalan: 'Jujur — solat anda hari ini kerana cinta kepada Allah atau kerana takut dosa?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b2',
    soalan: 'Adakah ada sebahagian diri yang lega apabila solat selesai — bukan kerana khusyuk, tapi kerana sudah habis?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b3',
    soalan: 'Berapa kali anda solat dalam keadaan tergesa-gesa minggu ini — dan untuk apa?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b4',
    soalan: "Nafsu kata 'rehat dulu' — berapa kali anda dengar suara itu sebelum solat tadi?",
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b5',
    soalan: 'Adakah anda puas dengan kualiti solat anda hari ini — dan adakah kepuasan itu datang dari jiwa atau nafsu?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b6',
    soalan: 'Puasa Ramadan — berapa hari selepas Ramadan nafsu anda kembali seperti biasa?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b7',
    soalan: 'Apakah alasan yang paling kerap nafsu beri kepada anda untuk lewatkan solat?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b8',
    soalan: 'Bila kali terakhir anda menangis dalam solat — atau rasa sangat rindu Allah?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b9',
    soalan: 'Adakah ibadah anda hari ini sama seperti 10 tahun lepas — dan jika ya, apa yang itu bermakna?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b10',
    soalan: 'Nabi kata ramai yang berpuasa tapi dapat lapar sahaja. Puasa anda — untuk apa sebenarnya?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b11',
    soalan: 'Apakah yang nafsu anda paling tidak suka dari perintah Allah?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b12',
    soalan: 'Adakah anda lebih mudah melakukan apa yang disukai nafsu berbanding apa yang diperintah Allah?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b13',
    soalan: 'Bila kali terakhir anda pilih keperluan orang lain di atas keperluan anda sendiri dengan ikhlas?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b14',
    soalan: 'Apakah kejahatan yang nafsu ajak anda lakukan hari ini — dan berapa kali anda dengar?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b15',
    soalan: 'Apakah senjata nafsu yang paling berkesan terhadap anda — dan bila ia paling kuat?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b16',
    soalan: "Adakah ada perkara yang anda tahu salah tapi masih buat — kerana nafsu kata 'sekali je'?",
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b17',
    soalan: 'Jika nafsu adalah musuh dalam diri — siapa yang menang lebih banyak dalam hidup anda hari ini?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b18',
    soalan: 'Apakah yang anda rasa bersalah tentang hari ini — yang nafsu cuba buat anda lupa?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b19',
    soalan: 'Bila kali terakhir anda benar-benar melawan nafsu dan menang?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
  {
    id: 'b20',
    soalan: 'Allah kata nafsu sentiasa ajak kepada kejahatan. Hari ini — kejahatan apa yang nafsu ajak — dan anda buat atau tidak?',
    tujuan: 'dedah_nafsu',
    ubat: 'zikir_khafi',
  },
]

// ─── Kumpulan C — Tunjuk Jalan (10 soalan) — Ubat: Zikir Jahar & Khafi ───────

export const KUMPULAN_C: AuditQuestion[] = [
  {
    id: 'c1',
    soalan: 'Adakah anda tahu mengapa La ilaha illallah boleh menutup semua pintu masuk syaitan — dari depan, belakang, kanan dan kiri?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c2',
    soalan: 'Para wali Allah mengamalkan zikir khusus untuk menghalang dua musuh utama manusia. Adakah anda ingin tahu zikir itu?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c3',
    soalan: 'Jika ada satu amalan yang boleh mengubah hati dari dalam — bukan dari luar — adakah anda mahu tahu?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c4',
    soalan: 'Anda tahu nama Allah. Tapi adakah hati anda benar-benar mengenal Allah — atau hanya mengenal tentang Allah?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c5',
    soalan: 'Adakah anda pernah rasa solat yang benar-benar tenang — tiada gangguan syaitan, tiada pujukan nafsu? Mahu rasa itu setiap solat?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c6',
    soalan: 'Allah berfirman zikir adalah pekerjaan yang paling agung. Pernahkah anda tanya mengapa — bukan sekadar terima?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c7',
    soalan: 'Nabi mengajar satu zikir kepada Sayyidina Ali secara rahsia — bukan untuk semua orang. Adakah anda ingin tahu zikir itu?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c8',
    soalan: 'Jika jiwa adalah sebuah rumah yang diserang dari dua arah — adakah anda sudah ada perisai yang lengkap?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c9',
    soalan: 'Ramai yang solat bertahun-tahun tapi hati masih tidak tenang. Adakah anda tahu apa yang masih kurang?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'c10',
    soalan: 'Arab Badwi kata mereka beriman — Allah kata belum. Adakah anda tahu bagaimana iman boleh benar-benar masuk ke dalam hati?',
    tujuan: 'tunjuk_jalan',
    ubat: 'zikir_jahar_khafi',
  },
]

// ─── Kumpulan D — Untuk Yang Baru (7 soalan) — Jiwa yang baru sedar ──────────

export const KUMPULAN_D: AuditQuestion[] = [
  {
    id: 'd1',
    soalan: 'Apakah yang bawa anda ke sini hari ini — jujur?',
    tujuan: 'untuk_baru',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'd2',
    soalan: 'Adakah ada perasaan kosong dalam diri walaupun semua nampak baik dari luar?',
    tujuan: 'untuk_baru',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'd3',
    soalan: 'Bila kali terakhir anda rasa benar-benar damai — bukan sekadar tiada masalah?',
    tujuan: 'untuk_baru',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'd4',
    soalan: 'Apakah yang anda cari yang belum jumpa lagi?',
    tujuan: 'untuk_baru',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'd5',
    soalan: 'Pernahkah anda rasa seperti ada sesuatu yang lebih dalam dari semua ini — tapi tidak tahu apa?',
    tujuan: 'untuk_baru',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'd6',
    soalan: 'Jika boleh tukar satu perkara tentang diri anda hari ini — apakah itu?',
    tujuan: 'untuk_baru',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'd7',
    soalan: 'Adakah anda pernah berbual dengan Allah — bukan sekadar membaca doa yang dihafal?',
    tujuan: 'untuk_baru',
    ubat: 'zikir_jahar_khafi',
  },
]

// ─── Kumpulan E — Untuk Yang Lama (7 soalan) — Yang ingin kembali kepada fitrah

export const KUMPULAN_E: AuditQuestion[] = [
  {
    id: 'e1',
    soalan: 'Anda beragama bertahun-tahun — tapi adakah Allah semakin dekat atau semakin jauh dalam hati anda?',
    tujuan: 'untuk_kembali',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'e2',
    soalan: 'Apakah yang hilang dalam amalan anda sekarang berbanding dulu — dan bilakah ia mula hilang?',
    tujuan: 'untuk_kembali',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'e3',
    soalan: 'Adakah ada masa dalam hidup anda yang hati benar-benar hidup dengan Allah — dan apa yang buat ia berubah?',
    tujuan: 'untuk_kembali',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'e4',
    soalan: 'Jika anda boleh kembali kepada fitrah asal manusia — apakah satu perkara pertama yang akan anda buat?',
    tujuan: 'untuk_kembali',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'e5',
    soalan: 'Anda tahu jalan pulang — tapi apakah yang menghalang anda dari melangkah?',
    tujuan: 'untuk_kembali',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'e6',
    soalan: 'Apakah dosa atau beban yang paling berat anda bawa — yang anda rasa menghalang anda dari Allah?',
    tujuan: 'untuk_kembali',
    ubat: 'zikir_jahar_khafi',
  },
  {
    id: 'e7',
    soalan: 'Adakah anda percaya Allah masih boleh terima anda — walau apa pun yang berlaku?',
    tujuan: 'untuk_kembali',
    ubat: 'zikir_jahar_khafi',
  },
]

export const ALL_AUDIT_QUESTIONS = [...KUMPULAN_A, ...KUMPULAN_B, ...KUMPULAN_C, ...KUMPULAN_D, ...KUMPULAN_E]

// ─── Selection Logic ──────────────────────────────────────────────────────────
//
// Hari 1-7    → Kumpulan D (untuk_baru)     — lembut, tidak menghukum
// Hari 8-14   → Kumpulan A (dedah_syaitan)  — mula sedar serangan luar
// Hari 15-21  → Kumpulan B (dedah_nafsu)    — sedar serangan dari dalam
// Hari 22+    → Kumpulan C (tunjuk_jalan)   — bawa kepada zikir
//
// Mood RENDAH (😔/😕) → Kumpulan D atau E — empati dan harapan, mengatasi tahap semasa
// Mood TINGGI (🙂/😊) → Kumpulan A atau B — cabaran yang lebih dalam
// Setiap 7 hari       → selitkan satu soalan dari Kumpulan C — bina minat Zikir Khas

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
  const moodRendah = mood <= 2
  const moodTinggi = mood >= 4

  let pool: AuditQuestion[]

  if (moodRendah) {
    // Empati dan harapan — diutamakan tidak kira berapa lama pengguna sudah berjalan
    pool = [...KUMPULAN_D, ...KUMPULAN_E]
  } else if (dayCount <= 7) {
    pool = moodTinggi ? [...KUMPULAN_D, ...KUMPULAN_A.slice(0, 10)] : KUMPULAN_D
  } else if (dayCount <= 14) {
    pool = moodTinggi ? [...KUMPULAN_A, ...KUMPULAN_B.slice(0, 8)] : KUMPULAN_A
  } else if (dayCount <= 21) {
    pool = moodTinggi ? [...KUMPULAN_B, ...KUMPULAN_A.slice(10)] : KUMPULAN_B
  } else {
    pool = KUMPULAN_C
  }

  // Setiap 7 hari — selitkan satu soalan dari Kumpulan C untuk bina minat Zikir Khas
  if (dayCount % 7 === 0) {
    pool = [...pool, ...KUMPULAN_C]
  }

  const shuffled = shuffle(pool, dayCount)
  return shuffled.slice(0, count)
}
