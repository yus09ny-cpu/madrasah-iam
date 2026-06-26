import { useState } from 'react'
import { ChevronDown, ChevronUp, Lock, MessageCircle, X, CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

// ─── Types & helpers ──────────────────────────────────────────────────────────

type BL = { bm: string; en: string; id?: string }

function pick(s: BL, lang: string): string {
  return (s as Record<string, string>)[lang] ?? s.bm
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SYARIAT_OPENING = {
  arabic: 'وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
  translation: {
    bm: 'Dirikanlah solat — sesungguhnya solat mencegah dari perbuatan keji dan mungkar',
    en: 'Establish prayer — indeed, prayer prevents indecency and wrongdoing',
  } as BL,
  source: 'Al-Ankabut: 45',
}

interface RukunItem {
  id: string
  name: BL
  arabic: string
  icon: string
  simbolik: BL
  implikasi: BL
  soalan: BL
  iam_prompt: string
}

const RUKUN_DATA: RukunItem[] = [
  {
    id: 'wudhu',
    name: { bm: "Wudhu'", en: "Wudhu' (Ritual Purification)" },
    arabic: 'الوُضُوء',
    icon: '💧',
    simbolik: {
      bm: "Sebelum berdiri di hadapan Allah, kamu perlu bersih — zahir dan batin. Wudhu' zahir membersihkan anggota fizikal dengan air mengikut syariat. Wudhu' batin membersihkan qalbu melalui taubat dan penyucian jiwa (tazkiyatun nafs) — sebagaimana diajarkan dalam Kitab Sirrul Asrar oleh Syeikh Abdul Qadir Al-Jailani. Qalbu adalah pusat penyaksian (mahall al-musyahadah) — ia perlu 'diperbaharui' sentiasa, seperti wudhu' zahir yang batal oleh hadas.",
      en: "Before standing before Allah, you must be clean — outwardly and inwardly. Outer Wudhu' cleanses the physical limbs with water according to syariah. Inner Wudhu' purifies the qalb through repentance and purification of the soul (tazkiyatun nafs) — as taught in Kitab Sirrul Asrar by Syeikh Abdul Qadir Al-Jailani. The qalb is the centre of witnessing (mahall al-musyahadah) — it must be constantly 'renewed', just as outer wudhu' is voided by impurity.",
    },
    implikasi: {
      bm: "Wudhu' zahir batal dengan hadas kecil dan besar. Wudhu' batin 'batal' dengan dosa, kelalaian, dan hati yang jauh dari Allah. Orang yang selalu menjaga wudhu' batin — menjaga qalbunya bersih dengan zikir, taubat, dan muhasabah — sentiasa berada dalam keadaan bersuci di hadapan Allah, walaupun di luar waktu solat.",
      en: "Outer Wudhu' is voided by minor and major impurity. Inner Wudhu' is 'voided' by sin, heedlessness, and a heart distant from Allah. One who constantly maintains inner wudhu' — keeping their qalb pure through dhikr, repentance and muhasabah — is always in a state of purity before Allah, even outside prayer times.",
    },
    soalan: {
      bm: "Apa yang paling kerap 'membatalkan' wudhu' batin kamu — dan apa langkah kamu untuk membaharuinya?",
      en: "What most frequently 'voids' your inner wudhu' — and what is your step to renew it?",
    },
    iam_prompt: "Pengguna sedang merenungi simbolik Wudhu' Zahir dan Batin — bersuci fizikal dan spiritual sebelum solat. Bantu mereka merenung tentang apa yang 'menajiskan' hati mereka dalam kehidupan harian dan bagaimana untuk membersihkannya.",
  },
  {
    id: 'niat',
    name: { bm: 'Niat', en: 'Niat (Intention)' },
    arabic: 'النِّيَّة',
    icon: '🤍',
    simbolik: {
      bm: "Niat itu ada dua — zahir dan batin. Niat Zahir: lafaz yang kamu ucapkan dalam hati — 'Aku berniat solat Subuh/Zohor/... dua/empat rakaat, menghadap kiblat, kerana Allah Ta'ala.' Niat Batin: sesuatu yang jauh lebih dalam. Ia bukan sekadar kata-kata — ia adalah kehendak hati yang paling jujur, yang hanya Allah sahaja yang tahu. Niat batin yang suci murni adalah: إِلَٰهِي أَنْتَ مَقْصُودِي — Ya Allah, Engkaulah tujuanku. Tiada yang aku cari, tiada yang aku tuju — melainkan kembali kepada-Mu semata.",
      en: "Intention has two dimensions — outer and inner. Outer Intention: the declaration you make in your heart — 'I intend to pray Subuh/Zohor/... two/four rakaat, facing the qiblah, for the sake of Allah.' Inner Intention: something far deeper. It is not merely words — it is the most honest desire of the heart, known only to Allah. The truly pure inner intention is: إِلَٰهِي أَنْتَ مَقْصُودِي — O Allah, You are my purpose. There is nothing I seek, nothing I pursue — except to return to You alone.",
    },
    implikasi: {
      bm: "Ramai yang melafaz niat zahir tetapi hati pergi ke tempat lain — ke masalah kerja, ke rancangan hari esok, ke orang yang buat kita sakit hati. Niat batin yang benar-benar 'I AM' — Ilahi Anta Maqsudi — adalah disiplin seumur hidup. Setiap kali kamu berjaya memasuki solat dengan niat yang murni, kamu berdiri bukan sekadar sebagai hamba yang menunaikan kewajipan — kamu berdiri sebagai insan yang benar-benar menghala kepada Tuhan.",
      en: "Many who pronounce the outer intention find their heart drifting elsewhere — to work problems, tomorrow's plans, those who have caused them pain. The inner intention that is truly 'I AM' — Ilahi Anta Maqsudi — is a lifelong discipline. Every time you succeed in entering prayer with a sincere intention, you stand not merely as a servant fulfilling an obligation — you stand as a human being truly oriented towards God.",
    },
    soalan: {
      bm: "Jika kamu jujur — apa yang paling kerap 'bersaing' dengan Allah dalam niat hati kamu ketika memulakan solat?",
      en: "If you are honest — what most often 'competes' with Allah in your heart's intention when you begin prayer?",
    },
    iam_prompt: "Pengguna sedang merenungi Niat Zahir dan Batin dalam solat — khususnya makna 'Ilahi Anta Maqsudi' (I AM) sebagai niat batin yang suci. Bantu mereka merenung tentang kejujuran niat mereka dan apa yang sebenarnya mereka 'tuju' dalam kehidupan.",
  },
  {
    id: 'takbir',
    name: { bm: 'Takbiratul Ihram', en: 'Takbiratul Ihram (Opening Takbir)' },
    arabic: 'اللَّهُ أَكْبَرُ',
    icon: '🙌',
    simbolik: {
      bm: 'Tangan diangkat — melepaskan dunia. Kamu masuk ke hadrat Allah. Allah lebih besar dari semua yang ada dalam fikiran kamu. Pada saat takbir, masa dan ruang berhenti — hanya kamu dan Dia.',
      en: 'Hands raised — releasing the world. You enter the presence of Allah. Allah is greater than everything in your mind. At the moment of takbir, time and space stop — only you and Him.',
    },
    implikasi: {
      bm: 'Bila anxiety menyerang, bila masalah terasa besar — ingat takbir ini. Allahu Akbar. Allah lebih besar dari semua itu. Lepaskan. Dalam setiap keputusan hidup yang sukar, bertanyalah: "Apakah ini lebih besar dari Allah?"',
      en: 'When anxiety strikes, when problems feel overwhelming — remember this takbir. Allahu Akbar. Allah is greater than all of that. Let go. In every difficult life decision, ask yourself: "Is this greater than Allah?"',
    },
    soalan: {
      bm: 'Apa yang paling sukar kamu "lepaskan" ketika bertakbir — dan apa yang ia beritahu tentang kamu?',
      en: 'What is hardest for you to "let go of" when making takbir — and what does that say about you?',
    },
    iam_prompt: 'Pengguna sedang merenungi simbolik Takbiratul Ihram — momen melepaskan dunia dan masuk ke hadrat Allah. Tanya soalan yang mendalam tentang apa yang sukar dilepaskan dalam hidup mereka.',
  },
  {
    id: 'qiyam',
    name: { bm: 'Qiyam', en: 'Qiyam (Standing)' },
    arabic: 'قِيَام',
    icon: '🧍',
    simbolik: {
      bm: 'Berdiri teguh di hadapan Allah. Ini adalah posisi seorang hamba yang berani — hadir sepenuhnya dengan seluruh diri. Pandang ke tempat sujud, teguhkan hati.',
      en: 'Standing firm before Allah. This is the posture of a courageous servant — fully present with your entire being. Gaze at the place of prostration, steady your heart.',
    },
    implikasi: {
      bm: 'Dalam hidup — berdirilah dengan prinsip. Jangan tunduk kepada tekanan yang bertentangan dengan nilai. Kamu sudah belajar berdiri di hadapan Allah — bawa itu ke setiap keputusan hidup. Kekuatan berdiri tidak datang dari ego, tetapi dari keyakinan kepada Allah.',
      en: 'In life — stand firm in your principles. Do not bow to pressures that conflict with your values. You have learned to stand before Allah — bring that into every life decision. The strength to stand does not come from ego, but from trust in Allah.',
    },
    soalan: {
      bm: 'Di mana dalam hidup kamu perlu lebih "berdiri teguh" — dan apa yang menghalang kamu?',
      en: 'Where in your life do you need to "stand firmer" — and what is holding you back?',
    },
    iam_prompt: 'Pengguna sedang merenungi simbolik Qiyam — berdiri teguh di hadapan Allah. Bantu mereka menghubungkan makna berdiri teguh dalam solat dengan keteguhan prinsip dalam kehidupan.',
  },
  {
    id: 'ruku',
    name: { bm: "Ruku'", en: "Ruku' (Bowing)" },
    arabic: 'رُكُوع',
    icon: '🫳',
    simbolik: {
      bm: "Tunduk kepada Allah — mengakui kebesaran-Nya dan kekecilan diri. Ini bukan kelemahan — ini kekuatan tertinggi. Orang yang boleh tunduk adalah orang yang benar-benar kuat.",
      en: "Bowing to Allah — acknowledging His greatness and your own smallness. This is not weakness — this is the highest strength. One who can bow is truly the strong one.",
    },
    implikasi: {
      bm: "Pemimpin yang benar tahu bila perlu merendah — mendengar, memahami, berkhidmat. Merendah diri kepada manusia adalah sifat orang yang kuat. Kebodohan yang paling besar adalah tidak tahu bila perlu merendah.",
      en: "A true leader knows when to lower themselves — to listen, understand, serve. Humbling oneself before others is the trait of the truly strong. The greatest foolishness is not knowing when to humble oneself.",
    },
    soalan: {
      bm: "Kepada siapa dalam hidup kamu perlu lebih merendah diri — dan mengapa susah?",
      en: "Before whom in your life do you need to humble yourself more — and why is it difficult?",
    },
    iam_prompt: "Pengguna sedang merenungi simbolik Ruku' — tunduk dan merendah. Bantu mereka merenung tentang kerendahan hati dalam hubungan dan kehidupan mereka.",
  },
  {
    id: 'itidal',
    name: { bm: "I'tidal", en: "I'tidal (Rising)" },
    arabic: 'اعْتِدَال',
    icon: '🧎',
    simbolik: {
      bm: "Bangkit semula selepas tunduk. Allah mendengar pujian hamba-Nya. Selepas merendah — berdiri semula. Ini adalah keseimbangan — tawazun.",
      en: "Rising again after bowing. Allah hears the praise of His servant. After lowering — stand again. This is balance — tawazun.",
    },
    implikasi: {
      bm: "Kehidupan adalah kitaran — tunduk dan bangkit, jatuh dan bangun. Setiap kali kamu bangkit dari ruku', ingat: kamu boleh bangkit dari apa jua dalam hidup. Allah mendengar. Allah membalas.",
      en: "Life is a cycle — bowing and rising, falling and getting up. Every time you rise from ruku', remember: you can rise from anything in life. Allah hears. Allah responds.",
    },
    soalan: {
      bm: "Apa dalam hidup kamu yang perlu 'dibangkitkan' semula — dan apa yang menghalang kebangkitan itu?",
      en: "What in your life needs to be 'lifted up again' — and what is preventing that rising?",
    },
    iam_prompt: "Pengguna sedang merenungi simbolik I'tidal — bangkit selepas merendah. Bantu mereka merenung tentang kebangkitan dan keseimbangan dalam kehidupan mereka.",
  },
  {
    id: 'sujud',
    name: { bm: 'Sujud', en: 'Sujud (Prostration)' },
    arabic: 'سُجُود',
    icon: '🙇',
    simbolik: {
      bm: 'Titik paling dekat dengan Allah. Dahi — tempat kebanggaan manusia — diletakkan ke bumi. Ego hancur. Hati naik ke langit. Di sinilah masa berhenti dan rahmat turun.',
      en: 'The point closest to Allah. The forehead — the seat of human pride — is placed to the earth. Ego is shattered. Heart ascends to the heavens. This is where time stops and mercy descends.',
    },
    implikasi: {
      bm: 'Dalam kelemahan ada kekuatan terbesar. Bila kamu sujud, kamu di kedudukan paling tinggi — paling dekat Allah. Jangan takut untuk jatuh — sujud adalah penaik darjat, bukan penghinaan. Doa yang paling makbul adalah ketika sujud.',
      en: "In weakness lies the greatest strength. When you prostrate, you are in the highest position — closest to Allah. Do not fear falling — sujud elevates one's station, it is not humiliation. The most answered supplication is during prostration.",
    },
    soalan: {
      bm: 'Dalam kelemahan apa kamu sebenarnya paling kuat — dan pernahkah kamu sedar tentang itu?',
      en: 'In what weakness are you actually strongest — and have you ever truly been aware of that?',
    },
    iam_prompt: 'Pengguna sedang merenungi simbolik Sujud — titik paling dekat dengan Allah, ego hancur. Bantu mereka merenung tentang kekuatan dalam kelemahan dan momen terdekat mereka dengan Allah.',
  },
  {
    id: 'duduk',
    name: { bm: 'Duduk Antara Dua Sujud', en: 'Sitting Between Prostrations' },
    arabic: 'جُلُوس',
    icon: '🧘',
    simbolik: {
      bm: 'Memohon antara dua kerendahan. Rabbighfirli — Ya Tuhan ampunkan aku. Masa antara — jeda untuk memohon dan mengaudit jiwa. Ini adalah momen paling manusiawi dalam solat.',
      en: 'Seeking between two humilities. Rabbighfirli — O Lord, forgive me. The in-between moment — a pause to seek and take stock of the soul. This is the most profoundly human moment in prayer.',
    },
    implikasi: {
      bm: 'Dalam hidup ada masa-masa antara — antara satu cabaran ke cabaran lain. Jangan bazirkan masa itu. Gunakan untuk audit jiwa dan memohon. Jeda itu bukan kekosongan — ia adalah ruang untuk Allah masuk.',
      en: 'In life there are in-between moments — between one challenge and the next. Do not waste them. Use them for self-accounting and seeking. That pause is not emptiness — it is a space for Allah to enter.',
    },
    soalan: {
      bm: 'Apa yang kamu biasanya pohon dalam jeda-jeda kehidupan kamu — dan adakah ia cukup jujur?',
      en: 'What do you usually seek in the pauses of your life — and is it honest enough?',
    },
    iam_prompt: 'Pengguna sedang merenungi simbolik duduk antara dua sujud — jeda untuk memohon. Bantu mereka merenung tentang doa-doa yang paling dalam hati mereka.',
  },
  {
    id: 'tahiyat',
    name: { bm: 'Tahiyat', en: 'Tahiyat (Seated Witnessing)' },
    arabic: 'تَحِيَّات',
    icon: '🤝',
    simbolik: {
      bm: 'Persaksian dan salam. Kamu memberi salam kepada Nabi, diri sendiri dan semua hamba Allah. Ini adalah ikatan ummah — kamu tidak bersolat sendirian.',
      en: 'Witnessing and salutations. You send greetings to the Prophet, yourself and all servants of Allah. This is the bond of ummah — you do not pray alone.',
    },
    implikasi: {
      bm: 'Dalam setiap solat kamu bersalam dengan seluruh ummah Islam di dunia — orang yang kamu kenal dan tidak kenal. Kamu tidak bersendirian dalam perjalanan ini. Ummah adalah keluarga besar yang bersolat bersama.',
      en: 'In every prayer you are connected to the entire Muslim ummah across the world — those you know and those you do not. You are not alone in this journey. The ummah is one great family that prays together.',
    },
    soalan: {
      bm: 'Bagaimana kamu dapat memperkuat ikatan dengan ummah di sekeliling kamu — mulai dari yang paling dekat?',
      en: 'How can you strengthen your bond with the ummah around you — starting from those closest?',
    },
    iam_prompt: 'Pengguna sedang merenungi simbolik Tahiyat — ikatan dengan ummah dan persaksian. Bantu mereka merenung tentang tanggungjawab kepada komuniti dan hubungan dengan sesama.',
  },
  {
    id: 'salam',
    name: { bm: 'Salam', en: 'Salam (Closing Greeting)' },
    arabic: 'السَّلَام',
    icon: '👋',
    simbolik: {
      bm: 'Kembali ke dunia dengan membawa cahaya solat. Salam ke kanan dan kiri — tanggungjawab kepada manusia dimulakan semula. Kamu keluar bukan sebagai orang yang sama.',
      en: 'Returning to the world carrying the light of prayer. Greetings to the right and left — responsibility to others begins again. You leave as someone different.',
    },
    implikasi: {
      bm: 'Selepas solat kamu bukan manusia yang sama. Kamu keluar membawa amanah. Salam ke kanan kiri — janji kepada manusia di sekeliling kamu. Bawa cahaya itu ke setiap langkah, setiap perkataan, setiap keputusan.',
      en: 'After prayer you are not the same person. You leave carrying a trust. Greetings to the right and left — a promise to those around you. Carry that light into every step, every word, every decision.',
    },
    soalan: {
      bm: 'Dari solat tadi — satu cahaya apa yang kamu bawa keluar — dan bagaimana kamu akan jaga cahaya itu sehingga solat seterusnya?',
      en: 'From this prayer — what one light do you carry out — and how will you protect that light until the next prayer?',
    },
    iam_prompt: 'Pengguna sedang merenungi simbolik Salam — kembali ke dunia membawa cahaya solat. Bantu mereka merenung tentang bagaimana solat mengubah mereka dan cahaya apa yang mereka bawa.',
  },
]

interface MaqamItem {
  rukun: string
  maqam: BL
  arabic: string
  penerangan: BL
}

const TAREKAT_DATA: MaqamItem[] = [
  {
    rukun: 'Takbiratul Ihram',
    maqam: { bm: 'Fana dari Selain Allah', en: "Fana' — Annihilation from Other than Allah" },
    arabic: 'فَنَاء',
    penerangan: {
      bm: 'Fana bermaksud lenyapnya kesedaran tentang selain Allah dalam hati. Apabila bertakbir dengan hati yang hadir, dunia dan segala isinya lenyap sejenak. Hanya ada Allah dan hamba. Ini bukan ilusi — ini adalah hakikat yang tersembunyi di sebalik takbir.',
      en: "Fana' means the disappearance of consciousness of anything other than Allah from the heart. When takbir is made with a present heart, the world and all its contents vanish momentarily. There is only Allah and the servant. This is not an illusion — this is the reality hidden behind takbir.",
    },
  },
  {
    rukun: 'Qiyam',
    maqam: { bm: 'Wukuf — Hadir dalam Kehadiran', en: 'Wuquf — Present in the Presence' },
    arabic: 'وُقُوف',
    penerangan: {
      bm: 'Wukuf adalah berdiri dengan kesedaran penuh bahawa kamu di hadapan Allah. Seperti wukuf di Arafah — hadir dengan seluruh kemanusiaan kamu. Tidak ada masa lalu atau masa depan — hanya saat ini, di hadapan-Nya.',
      en: 'Wuquf is standing with full awareness that you are before Allah. Like the standing at Arafah — present with your entire humanity. There is no past or future — only this moment, before Him.',
    },
  },
  {
    rukun: "Ruku'",
    maqam: { bm: "Tawadu' Hakiki — Merendah yang Sebenar", en: "Tawadu' Hakiki — True Humility" },
    arabic: 'تَوَاضُع',
    penerangan: {
      bm: "Bukan sekadar tunduk jasad — tapi lenyapnya rasa kebesaran diri dari hati. Merasai betapa kecil diri di hadapan Keagungan Allah yang Tidak Terhingga. Ini adalah maqam yang membersihkan ego dari akarnya.",
      en: "Not merely the physical bowing of the body — but the disappearance of self-importance from the heart. Feeling how small one is before the Infinite Majesty of Allah. This is the station that uproots ego at its foundation.",
    },
  },
  {
    rukun: "I'tidal",
    maqam: { bm: "Tawazun — Keseimbangan Batin", en: "Tawazun — Inner Balance" },
    arabic: 'تَوَازُن',
    penerangan: {
      bm: "Bangkit dengan kesedaran penuh. Sami'Allahu liman hamidah — Allah mendengar mereka yang memuji-Nya. Maqam ini mengajar bahawa selepas setiap kerendahan, ada kebangkitan. Keseimbangan adalah anugerah bagi mereka yang berjalan di jalan Allah.",
      en: "Rising with full awareness. Sami'Allahu liman hamidah — Allah hears those who praise Him. This station teaches that after every lowering, there is a rising. Balance is a gift for those who walk the path of Allah.",
    },
  },
  {
    rukun: 'Sujud',
    maqam: { bm: "Fana' fi Allah — Lebur dalam Allah", en: "Fana' fi Allah — Dissolved in Allah" },
    arabic: 'فَنَاء فِي اللَّه',
    penerangan: {
      bm: 'Ini adalah maqam tertinggi dalam solat — lebur dalam Allah, ego tiada. Dahi di bumi, hati di langit. Inilah mengapa Rasulullah ﷺ bersabda sujud adalah waktu paling dekat dengan Allah. Di sini tirai antara hamba dan Tuhan paling nipis.',
      en: 'This is the highest station in prayer — dissolved in Allah, ego gone. Forehead on the earth, heart in the heavens. This is why Rasulullah ﷺ said sujud is the time closest to Allah. Here the veil between servant and Lord is thinnest.',
    },
  },
  {
    rukun: 'Duduk',
    maqam: { bm: 'Munaajaat — Berbisik dengan Allah', en: 'Munajaat — Whispering with Allah' },
    arabic: 'مُنَاجَاة',
    penerangan: {
      bm: 'Maqam berbisik dengan Allah. Rabbighfirli — ucapan yang lahir dari hati yang hancur dan berharap. Dalam maqam ini, hamba menyadari keperluannya yang mutlak kepada Allah. Setiap permohonan adalah pengakuan kelemahan yang indah.',
      en: 'The station of whispering with Allah. Rabbighfirli — words that emerge from a shattered and hopeful heart. In this station, the servant recognises their absolute need for Allah. Every supplication is a beautiful acknowledgement of weakness.',
    },
  },
  {
    rukun: 'Tahiyat',
    maqam: { bm: "Jam'iyyah — Penyatuan Spiritual", en: "Jam'iyyah — Spiritual Union" },
    arabic: "جَمْعِيَّة",
    penerangan: {
      bm: "Maqam penyatuan — di mana hamba, Nabi dan Allah bersatu dalam satu momen suci. Memberi salam kepada Nabi adalah bukan sekadar ucapan — ia adalah keterkaitan roh dengan roh. Jam'iyyah adalah ketika hati tidak lagi berpecah-pecah.",
      en: "The station of union — where servant, Prophet and Allah are united in one sacred moment. Sending salutations to the Prophet is not merely words — it is the connection of soul to soul. Jam'iyyah is when the heart is no longer fragmented.",
    },
  },
  {
    rukun: 'Salam',
    maqam: { bm: "Baqa' billah — Kekal Bersama Allah", en: "Baqa' billah — Abiding with Allah" },
    arabic: "بَقَاء بِاللَّه",
    penerangan: {
      bm: "Kembali ke dunia tapi dengan kesedaran kekal tentang Allah. Hidup bersama Allah, bergerak dengan izin-Nya, berkata dengan hikmah-Nya. Baqa' bukan bererti keluar dari dunia — ia bererti membawa Allah ke dalam dunia.",
      en: "Returning to the world but with an abiding awareness of Allah. Living with Allah, moving by His permission, speaking with His wisdom. Baqa' does not mean leaving the world — it means bringing Allah into the world.",
    },
  },
]

// ─── IAM Modal ────────────────────────────────────────────────────────────────

function IAMModal({ rukun, isPro, onClose }: {
  rukun: RukunItem
  isPro: boolean
  onClose: () => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  const SUJUD_Q: BL = {
    bm: 'Sujud adalah momen paling dekat dengan Allah. Apa yang biasanya ada dalam hati kamu semasa sujud — dan apakah ia jujur?',
    en: 'Sujud is the moment closest to Allah. What is usually in your heart during prostration — and is it honest?',
  }
  const TAKBIR_Q: BL = {
    bm: 'Ketika mengangkat tangan bertakbir — apa yang kamu cuba lepaskan? Apakah masih ada yang tersangkut?',
    en: 'When raising your hands for takbir — what are you trying to let go of? Is there still something holding on?',
  }
  const question = pick(
    rukun.id === 'sujud' ? SUJUD_Q : rukun.id === 'takbir' ? TAKBIR_Q : rukun.soalan,
    lang,
  )

  const T = lang === 'en' ? {
    rakan: 'Digital Spiritual Companion',
    intro: 'This question is just the beginning. I AM Interactive will accompany you in deeper reflection — listening, understanding, and personally guiding your spiritual journey.',
    quranTr: '"Whoever is mindful of Allah, He will make a way out for them and provide for them from where they do not expect."',
    desc2: 'A deeper spiritual journey awaits you. I AM Interactive is a companion for every step — for every pillar, every prayer, every day.',
    cta: '✦ Open I AM Interactive — A Deeper Journey',
    teruskan: 'Continue reflecting on your own',
  } : {
    rakan: 'Rakan Rohani Digital',
    intro: 'Soalan ini hanya permulaan. I AM Interaktif akan menemani anda merenung lebih dalam — mendengar, memahami, dan membimbing perjalanan rohani anda secara peribadi.',
    quranTr: '"Sesiapa yang bertakwa kepada Allah, nescaya Dia akan membuka jalan keluar baginya dan memberi rezeki dari arah yang tidak disangka-sangka."',
    desc2: 'Perjalanan rohani yang lebih dalam menanti anda. I AM Interaktif adalah rakan yang menemani setiap langkah — pada setiap rukun, setiap solat, setiap hari.',
    cta: '✦ Buka I AM Interaktif — Perjalanan Lebih Dalam',
    teruskan: 'Teruskan renungan sendiri',
  }

  if (!isPro) {
    return (
      <div className="fixed inset-0 bg-[#060d16]/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e2d40]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
                <span className="text-sm">🌙</span>
              </div>
              <div>
                <p className="font-serif text-[#c9a96e] text-sm">I AM — {pick(rukun.name, lang)}</p>
                <p className="text-[#8a7a65] text-xs">{T.rakan}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#c9a96e15] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">🌙</span>
                </div>
                <p className="text-[#e8dcc8] text-sm leading-relaxed">"{question}"</p>
              </div>
            </div>
            <div className="space-y-3 text-center">
              <p className="text-[#8a7a65] text-sm leading-relaxed">{T.intro}</p>
              <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4">
                <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                  وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ
                </p>
                <p className="text-[#8a7a65] text-xs mt-2 italic leading-relaxed">{T.quranTr}</p>
                <p className="text-[#c9a96e60] text-xs mt-1">— At-Talaq: 2-3</p>
              </div>
              <p className="text-[#8a7a65] text-xs leading-relaxed">{T.desc2}</p>
            </div>
            <div className="space-y-2">
              <button className="w-full py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
                {T.cta}
              </button>
              <button onClick={onClose} className="w-full py-2.5 text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
                {T.teruskan}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <IAMProModal rukun={rukun} question={question} onClose={onClose} />
}

function IAMProModal({ rukun, question, onClose }: {
  rukun: RukunItem
  question: string
  onClose: () => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [answer, setAnswer] = useState(() => {
    try { return localStorage.getItem(`iam-refleksi-${rukun.id}`) ?? '' } catch { return '' }
  })
  const [saved, setSaved] = useState(false)

  const T = lang === 'en' ? {
    header: 'Reflection',
    label: 'My answers and reflections:',
    placeholder: 'Write your honest reflections here — no one judges, only Allah knows...',
    tutup: 'Close',
    simpan: 'Save Reflection',
    tersimpan: 'Saved',
  } : {
    header: 'Renungan',
    label: 'Jawapan dan renungan saya:',
    placeholder: 'Tulis renungan jujur anda di sini — tiada yang menghakimi, hanya Allah yang mengetahui...',
    tutup: 'Tutup',
    simpan: 'Simpan Renungan',
    tersimpan: 'Tersimpan',
  }

  function handleSave() {
    try { localStorage.setItem(`iam-refleksi-${rukun.id}`, answer) } catch { /* ignore */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-[#060d16]/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e2d40]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
              <span className="text-sm">🌙</span>
            </div>
            <div>
              <p className="font-serif text-[#c9a96e] text-sm">{T.header} — {pick(rukun.name, lang)}</p>
              <p className="text-[#8a7a65] text-xs">{rukun.arabic}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-[#c9a96e15] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">🌙</span>
              </div>
              <p className="text-[#e8dcc8] text-sm leading-relaxed italic">"{question}"</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[#8a7a65] text-xs">{T.label}</p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={T.placeholder}
              rows={4}
              className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl p-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
            />
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-[#1e2d40] rounded-xl text-sm text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors">
              {T.tutup}
            </button>
            <button onClick={handleSave} disabled={!answer.trim()}
              className="flex-1 py-2.5 bg-[#1e2d40] hover:bg-[#2a3d55] rounded-xl text-sm text-[#e8dcc8] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {saved
                ? <><CheckCircle2 size={14} className="text-emerald-400" /> {T.tersimpan}</>
                : T.simpan}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

function SolatUpgradeModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [loadingPkg, setLoadingPkg] = useState<'pro' | 'pro_plus' | null>(null)
  const [error, setError] = useState('')

  const T = lang === 'en' ? {
    title: 'Unlock the Faith & Ihsan Dimensions',
    desc: 'Access the inner meaning of every pillar of prayer — a deeper journey of Faith and Ihsan.',
    gagal: 'Payment initiation failed. Please try again.',
    pro: 'Upgrade to Pro — RM19.90/month',
    pro_plus: 'Upgrade to Pro Plus — RM29.90/month',
    tutup: 'Close',
  } : {
    title: 'Buka Dimensi Iman & Ihsan',
    desc: 'Akses makna batin setiap rukun solat — perjalanan Iman dan Ihsan yang lebih dalam.',
    gagal: 'Gagal memulakan pembayaran. Sila cuba lagi.',
    pro: 'Upgrade ke Pro — RM19.90/bulan',
    pro_plus: 'Upgrade ke Pro Plus — RM29.90/bulan',
    tutup: 'Tutup',
  }

  async function handleUpgrade(pkg: 'pro' | 'pro_plus') {
    if (!user) return
    setError('')
    setLoadingPkg(pkg)
    try {
      const res = await fetch('/api/create-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, email: user.email, nama: user.name ?? user.email, package: pkg }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data?.error?.message ?? 'Gagal mencipta bil')
      window.location.href = data.url
    } catch {
      setError(T.gagal)
      setLoadingPkg(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-medium text-sm">{T.title}</p>
        </div>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">{T.desc}</p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="space-y-2">
          <button onClick={() => handleUpgrade('pro')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro' && <Loader2 size={14} className="animate-spin" />}
            {T.pro}
          </button>
          <button onClick={() => handleUpgrade('pro_plus')} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loadingPkg === 'pro_plus' && <Loader2 size={14} className="animate-spin" />}
            {T.pro_plus}
          </button>
          <button onClick={onClose} disabled={loadingPkg !== null}
            className="w-full py-2.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors disabled:opacity-60">
            {T.tutup}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Syariat Panel ────────────────────────────────────────────────────────────

function SyariatPanel({ onIAM, isPro }: { onIAM: (r: RukunItem) => void; isPro: boolean }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [expanded, setExpanded] = useState<string | null>(null)

  const T = lang === 'en' ? {
    openingBefore: 'Prayer is not merely movement. It is a ',
    openingKey: 'ROPE',
    openingAfter: ' — a direct connection between the servant and Allah. Every motion carries profound meaning for your life.',
    simbolik: '✦ Symbolic Meaning',
    implikasi: 'Daily Implication',
    soalan: '💭 Reflection Question',
    iamPro: 'Ask I AM about this',
    iamFree: '💬 Ask I AM — Upgrade to Pro',
    renunganLabel: '💭 Reflection After Reading',
    renunganQ: 'Of all the pillars of prayer — which one speaks most to your life right now?',
  } : {
    openingBefore: 'Solat bukan sekadar gerakan. Ia adalah ',
    openingKey: 'SILAH',
    openingAfter: ' — tali hubungan langsung antara hamba dengan Allah. Setiap pergerakan membawa makna mendalam untuk kehidupan anda.',
    simbolik: '✦ Simbolik',
    implikasi: 'Implikasi Harian',
    soalan: '💭 Soalan Refleksi',
    iamPro: 'Tanya I AM tentang ini',
    iamFree: '💬 Tanya I AM — Buka Pro',
    renunganLabel: '💭 Renungan Selepas Membaca',
    renunganQ: 'Dari semua rukun solat — yang mana satu paling banyak berbicara kepada kehidupan kamu sekarang?',
  }

  return (
    <div className="space-y-4">
      {/* Ayat pembuka */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 text-center space-y-2">
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
          {SYARIAT_OPENING.arabic}
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">
          "{pick(SYARIAT_OPENING.translation, lang)}"
        </p>
        <p className="text-[#c9a96e60] text-xs">— {SYARIAT_OPENING.source}</p>
      </div>

      {/* Penerangan ringkas */}
      <div className="bg-[#060d16] border border-[#1e2d40] rounded-xl p-4">
        <p className="text-[#8a7a65] text-sm leading-relaxed text-center">
          {T.openingBefore}<span className="text-[#c9a96e] font-medium">{T.openingKey}</span>{T.openingAfter}
        </p>
      </div>

      {/* Rukun list */}
      <div className="space-y-2">
        {RUKUN_DATA.map((rukun) => {
          const isOpen = expanded === rukun.id
          return (
            <div key={rukun.id}
              className={cn('bg-[#0d1821] border rounded-2xl overflow-hidden transition-all duration-200',
                isOpen ? 'border-[#c9a96e40]' : 'border-[#1e2d40]')}>
              <button onClick={() => setExpanded(isOpen ? null : rukun.id)}
                className="w-full flex items-center gap-4 p-4 text-left">
                <span className="text-2xl flex-shrink-0">{rukun.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-[#c9a96e] text-sm leading-none mb-1">{rukun.arabic}</p>
                  <p className="text-[#e8dcc8] text-sm font-medium">{pick(rukun.name, lang)}</p>
                </div>
                {isOpen
                  ? <ChevronUp size={16} className="text-[#8a7a65] flex-shrink-0" />
                  : <ChevronDown size={16} className="text-[#8a7a65] flex-shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[#c9a96e] text-xs font-medium uppercase tracking-wider">{T.simbolik}</p>
                    <p className="text-[#e8dcc8] text-sm leading-relaxed">{pick(rukun.simbolik, lang)}</p>
                  </div>
                  <div className="bg-[#060d16] border border-[#1e2d40] rounded-xl p-3 space-y-1.5">
                    <p className="text-[#8a7a65] text-xs font-medium uppercase tracking-wider">{T.implikasi}</p>
                    <p className="text-[#e8dcc8] text-sm leading-relaxed">{pick(rukun.implikasi, lang)}</p>
                  </div>
                  <div className="bg-[#c9a96e08] border border-[#c9a96e20] rounded-xl p-3 space-y-1">
                    <p className="text-[#c9a96e] text-xs font-medium">{T.soalan}</p>
                    <p className="text-[#e8dcc8] text-sm leading-relaxed italic">"{pick(rukun.soalan, lang)}"</p>
                  </div>
                  <button onClick={() => onIAM(rukun)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#c9a96e30] rounded-xl text-xs hover:bg-[#c9a96e10] transition-colors"
                    style={{ color: isPro ? '#c9a96e' : '#8a7a65' }}>
                    <MessageCircle size={13} />
                    {isPro ? T.iamPro : T.iamFree}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Soalan penutup */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 text-center space-y-2">
        <p className="text-[#c9a96e] text-sm font-medium">{T.renunganLabel}</p>
        <p className="text-[#e8dcc8] text-sm italic leading-relaxed">"{T.renunganQ}"</p>
      </div>
    </div>
  )
}

// ─── Tarekat Panel ────────────────────────────────────────────────────────────

function TarekatPanel({ isPro, onUpgrade }: { isPro: boolean; isTarekatUnlocked?: boolean; onUpgrade: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [expanded, setExpanded] = useState<string | null>(null)

  const T = lang === 'en' ? {
    lockedTitle: 'Prayer Rooted in Faith',
    lockedDesc: 'Prayer Rooted in Faith opens the inner meaning of every pillar — a spiritual journey deeper than mere movement.',
    quranTr: '"Allah will elevate those who have believed among you and those who were given knowledge, by degrees."',
    cta: '✦ This step goes deeper...',
    hadithTr: '"Prayer is the mi\'raj (ascension) of the believer"',
  } : {
    lockedTitle: 'Solat Berteraskan Iman',
    lockedDesc: 'Dimensi Solat Berteraskan Iman membuka makna batin setiap rukun — perjalanan rohani yang lebih dalam dari sekadar gerakan.',
    quranTr: '"Allah meninggikan orang yang beriman dan berilmu beberapa darjat"',
    cta: '✦ Langkah ini ada lebih dalam...',
    hadithTr: '"Solat adalah mi\'raj (pendakian) orang beriman"',
  }

  if (!isPro) {
    return (
      <div className="space-y-4">
        <div className="bg-[#0d1821] border border-[#60a5fa20] rounded-2xl p-6 text-center space-y-4">
          <Lock size={28} className="text-[#60a5fa] mx-auto" />
          <div>
            <p className="font-serif text-[#60a5fa] text-xl">{T.lockedTitle}</p>
            <p className="font-serif text-[#8a7a65] text-sm mt-1" dir="rtl">مَقَام الإِيمَان</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">{T.lockedDesc}</p>
          <div className="bg-[#060d16] border border-[#60a5fa15] rounded-xl p-4 text-center">
            <p className="font-serif text-[#60a5fa] text-base leading-loose" dir="rtl">
              يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">
              {T.quranTr} — Al-Mujadilah: 11
            </p>
          </div>
          <button onClick={onUpgrade} className="w-full py-3 bg-[#60a5fa] text-[#060d16] font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
            {T.cta}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#060d16] border border-[#60a5fa20] rounded-xl p-4 text-center">
        <p className="font-serif text-[#60a5fa] text-sm leading-loose" dir="rtl">
          الصَّلَاةُ مِعْرَاجُ الْمُؤْمِنِ
        </p>
        <p className="text-[#8a7a65] text-xs mt-1 italic">{T.hadithTr}</p>
      </div>

      <div className="space-y-2">
        {TAREKAT_DATA.map((item) => {
          const isOpen = expanded === item.rukun
          return (
            <div key={item.rukun}
              className={cn('bg-[#0d1821] border rounded-2xl overflow-hidden transition-all',
                isOpen ? 'border-[#60a5fa40]' : 'border-[#1e2d40]')}>
              <button onClick={() => setExpanded(isOpen ? null : item.rukun)}
                className="w-full flex items-center justify-between p-4 text-left">
                <div>
                  <p className="font-serif text-[#60a5fa] text-sm">{item.arabic} — {pick(item.maqam, lang)}</p>
                  <p className="text-[#8a7a65] text-xs">{item.rukun}</p>
                </div>
                {isOpen ? <ChevronUp size={15} className="text-[#8a7a65]" /> : <ChevronDown size={15} className="text-[#8a7a65]" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <p className="text-[#e8dcc8] text-sm leading-relaxed">{pick(item.penerangan, lang)}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Hakikat Panel ────────────────────────────────────────────────────────────

function HakikatPanel({ user, onUpgrade }: { user: User | null; onUpgrade: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const isActivated = user?.solat_hakikat_unlocked === true

  const T = lang === 'en' ? {
    preparedMsg: 'Your Ihsan Dimension is being prepared by Nine.',
    soonMsg: 'InsyaAllah, this journey will continue very soon.',
    title: 'Prayer Rooted in Ihsan',
    duaTr: '"O Allah, You are my purpose and Your pleasure is what I seek"',
    desc: 'The Ihsan Dimension is the highest dimension — why humanity was brought into the world and its connection with prayer.',
    noText: 'This cannot be taught through text. It must be opened through a direct meeting with Nine.',
    cta: '✦ Open the Ihsan Dimension',
  } : {
    preparedMsg: 'Dimensi Ihsan anda sedang disediakan oleh Nine.',
    soonMsg: 'InsyaAllah, perjalanan ini akan diteruskan tidak lama lagi.',
    title: 'Solat Berteraskan Ihsan',
    duaTr: '"Ya Allah, Engkaulah Tujuanku dan keredhaan-Mu yang aku cari"',
    desc: 'Dimensi Ihsan adalah dimensi tertinggi — mengapa manusia dihadirkan di dunia dan apa hubungannya dengan solat.',
    noText: 'Ini tidak boleh diajar melalui teks. Ia perlu dibuka melalui pertemuan langsung dengan Nine.',
    cta: '✦ Buka Dimensi Ihsan',
  }

  if (isActivated) {
    return (
      <div className="space-y-4">
        <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-6 text-center space-y-3">
          <p className="font-serif text-[#a78bfa] text-2xl" dir="rtl">إِلَٰهِي أَنْتَ مَقْصُودِي</p>
          <p className="text-[#8a7a65] text-sm italic">{T.duaTr.replace(' and Your pleasure is what I seek', '').replace(' dan keredhaan-Mu yang aku cari', '')}</p>
          <div className="h-px bg-[#1e2d40]" />
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            {T.preparedMsg}
            <br />{T.soonMsg}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0d1821] border border-[#a78bfa20] rounded-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#a78bfa10] border border-[#a78bfa20] flex items-center justify-center mx-auto">
          <span className="font-serif text-[#a78bfa] text-xl">✦</span>
        </div>
        <div>
          <p className="font-serif text-[#a78bfa] text-xl">{T.title}</p>
          <p className="font-serif text-[#8a7a65] text-sm mt-1" dir="rtl">مَقَام الإِحْسَان</p>
        </div>
        <div className="bg-[#060d16] border border-[#a78bfa15] rounded-xl p-4 space-y-3">
          <p className="font-serif text-[#a78bfa] text-base leading-loose" dir="rtl">
            إِلَٰهِي أَنْتَ مَقْصُودِي وَرِضَاكَ مَطْلُوبِي
          </p>
          <p className="text-[#8a7a65] text-xs italic leading-relaxed">{T.duaTr}</p>
        </div>
        <p className="text-[#8a7a65] text-sm leading-relaxed">{T.desc}</p>
        <p className="text-[#8a7a65] text-xs leading-relaxed">{T.noText}</p>
        <button onClick={onUpgrade} className="w-full py-3 bg-[#a78bfa15] border border-[#a78bfa40] text-[#a78bfa] font-medium rounded-xl text-sm hover:bg-[#a78bfa25] transition-colors">
          {T.cta}
        </button>
      </div>
    </div>
  )
}

// ─── Main DimensiSolat ────────────────────────────────────────────────────────

type DimensiPanel = 'syariat' | 'tarekat' | 'hakikat'

interface DimensiSolatProps {
  isPro: boolean
  user: User | null
}

export default function DimensiSolat({ isPro, user }: DimensiSolatProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [panel, setPanel] = useState<DimensiPanel>('syariat')
  const [iamRukun, setIamRukun] = useState<RukunItem | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const isTarekatUnlocked = user?.solat_tarekat_unlocked === true || isPro

  const subtitle = lang === 'en' ? 'Secrets & Dimensions of Prayer' : 'Rahsia & Dimensi Solat'

  const PANEL_TABS = [
    { id: 'syariat' as const, label: 'Islam', arabic: 'الإسلام', color: '#c9a96e', available: true },
    { id: 'tarekat' as const, label: 'Iman', arabic: 'الإيمان', color: '#60a5fa', available: isPro },
    { id: 'hakikat' as const, label: 'Ihsan', arabic: 'الإحسان', color: '#a78bfa', available: false },
  ]

  return (
    <div className="space-y-4">
      {/* Opening */}
      <div className="text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-2xl leading-none">أَسْرَار الصَّلَاة</p>
        <p className="text-[#8a7a65] text-sm">{subtitle}</p>
      </div>

      {/* 3 Dimensi tab */}
      <div className="grid grid-cols-3 gap-2">
        {PANEL_TABS.map(tab => (
          <button key={tab.id} onClick={() => setPanel(tab.id)}
            className={cn('flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all',
              panel === tab.id
                ? 'border-opacity-60 bg-opacity-10'
                : 'border-[#1e2d40] bg-[#0d1821] hover:border-opacity-30',
              !tab.available && panel !== tab.id ? 'opacity-60' : ''
            )}
            style={{
              borderColor: panel === tab.id ? tab.color + '60' : undefined,
              backgroundColor: panel === tab.id ? tab.color + '10' : undefined,
            }}>
            {!tab.available && <Lock size={10} style={{ color: tab.color }} />}
            <p className="font-serif text-xs" style={{ color: tab.color }}>{tab.arabic}</p>
            <p className="text-[9px] text-[#8a7a65]">{tab.label}</p>
          </button>
        ))}
      </div>

      {/* Panel content */}
      {panel === 'syariat' && (
        <SyariatPanel onIAM={setIamRukun} isPro={isPro} />
      )}
      {panel === 'tarekat' && (
        <TarekatPanel isPro={isPro} isTarekatUnlocked={isTarekatUnlocked} onUpgrade={() => setShowUpgradeModal(true)} />
      )}
      {panel === 'hakikat' && (
        <HakikatPanel user={user} onUpgrade={() => setShowUpgradeModal(true)} />
      )}

      {/* IAM Modal */}
      {iamRukun && (
        <IAMModal rukun={iamRukun} isPro={isPro} onClose={() => setIamRukun(null)} />
      )}

      {showUpgradeModal && <SolatUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  )
}
