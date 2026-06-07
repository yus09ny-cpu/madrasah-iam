import { useState } from 'react'
import { ChevronDown, ChevronUp, Lock, MessageCircle, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

// ─── Data ─────────────────────────────────────────────────────────────────────

const SYARIAT_OPENING = {
  arabic: 'وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
  translation: 'Dirikanlah solat — sesungguhnya solat mencegah dari perbuatan keji dan mungkar',
  source: 'Al-Ankabut: 45',
}

const RUKUN_DATA = [
  {
    id: 'takbir',
    name: 'Takbiratul Ihram',
    arabic: 'اللَّهُ أَكْبَرُ',
    icon: '🙌',
    simbolik: 'Tangan diangkat — melepaskan dunia. Kamu masuk ke hadrat Allah. Allah lebih besar dari semua yang ada dalam fikiran kamu. Pada saat takbir, masa dan ruang berhenti — hanya kamu dan Dia.',
    implikasi: 'Bila anxiety menyerang, bila masalah terasa besar — ingat takbir ini. Allahu Akbar. Allah lebih besar dari semua itu. Lepaskan. Dalam setiap keputusan hidup yang sukar, bertanyalah: "Apakah ini lebih besar dari Allah?"',
    soalan: 'Apa yang paling sukar kamu "lepaskan" ketika bertakbir — dan apa yang ia beritahu tentang kamu?',
    iam_prompt: 'Pengguna sedang merenungi simbolik Takbiratul Ihram — momen melepaskan dunia dan masuk ke hadrat Allah. Tanya soalan yang mendalam tentang apa yang sukar dilepaskan dalam hidup mereka.',
  },
  {
    id: 'qiyam',
    name: 'Qiyam',
    arabic: 'قِيَام',
    icon: '🧍',
    simbolik: 'Berdiri teguh di hadapan Allah. Ini adalah posisi seorang hamba yang berani — hadir sepenuhnya dengan seluruh diri. Pandang ke tempat sujud, teguhkan hati.',
    implikasi: 'Dalam hidup — berdirilah dengan prinsip. Jangan tunduk kepada tekanan yang bertentangan dengan nilai. Kamu sudah belajar berdiri di hadapan Allah — bawa itu ke setiap keputusan hidup. Kekuatan berdiri tidak datang dari ego, tetapi dari keyakinan kepada Allah.',
    soalan: 'Di mana dalam hidup kamu perlu lebih "berdiri teguh" — dan apa yang menghalang kamu?',
    iam_prompt: 'Pengguna sedang merenungi simbolik Qiyam — berdiri teguh di hadapan Allah. Bantu mereka menghubungkan makna berdiri teguh dalam solat dengan keteguhan prinsip dalam kehidupan.',
  },
  {
    id: 'ruku',
    name: "Ruku'",
    arabic: 'رُكُوع',
    icon: '🫳',
    simbolik: "Tunduk kepada Allah — mengakui kebesaran-Nya dan kekecilan diri. Ini bukan kelemahan — ini kekuatan tertinggi. Orang yang boleh tunduk adalah orang yang benar-benar kuat.",
    implikasi: "Pemimpin yang benar tahu bila perlu merendah — mendengar, memahami, berkhidmat. Merendah diri kepada manusia adalah sifat orang yang kuat. Kebodohan yang paling besar adalah tidak tahu bila perlu merendah.",
    soalan: "Kepada siapa dalam hidup kamu perlu lebih merendah diri — dan mengapa susah?",
    iam_prompt: "Pengguna sedang merenungi simbolik Ruku' — tunduk dan merendah. Bantu mereka merenung tentang kerendahan hati dalam hubungan dan kehidupan mereka.",
  },
  {
    id: 'itidal',
    name: "I'tidal",
    arabic: 'اعْتِدَال',
    icon: '🧎',
    simbolik: "Bangkit semula selepas tunduk. Allah mendengar pujian hamba-Nya. Selepas merendah — berdiri semula. Ini adalah keseimbangan — tawazun.",
    implikasi: "Kehidupan adalah kitaran — tunduk dan bangkit, jatuh dan bangun. Setiap kali kamu bangkit dari ruku', ingat: kamu boleh bangkit dari apa jua dalam hidup. Allah mendengar. Allah membalas.",
    soalan: "Apa dalam hidup kamu yang perlu 'dibangkitkan' semula — dan apa yang menghalang kebangkitan itu?",
    iam_prompt: "Pengguna sedang merenungi simbolik I'tidal — bangkit selepas merendah. Bantu mereka merenung tentang kebangkitan dan keseimbangan dalam kehidupan mereka.",
  },
  {
    id: 'sujud',
    name: 'Sujud',
    arabic: 'سُجُود',
    icon: '🙇',
    simbolik: 'Titik paling dekat dengan Allah. Dahi — tempat kebanggaan manusia — diletakkan ke bumi. Ego hancur. Hati naik ke langit. Di sinilah masa berhenti dan rahmat turun.',
    implikasi: 'Dalam kelemahan ada kekuatan terbesar. Bila kamu sujud, kamu di kedudukan paling tinggi — paling dekat Allah. Jangan takut untuk jatuh — sujud adalah penaik darjat, bukan penghinaan. Doa yang paling makbul adalah ketika sujud.',
    soalan: 'Dalam kelemahan apa kamu sebenarnya paling kuat — dan pernahkah kamu sedar tentang itu?',
    iam_prompt: 'Pengguna sedang merenungi simbolik Sujud — titik paling dekat dengan Allah, ego hancur. Bantu mereka merenung tentang kekuatan dalam kelemahan dan momen terdekat mereka dengan Allah.',
  },
  {
    id: 'duduk',
    name: 'Duduk Antara Dua Sujud',
    arabic: 'جُلُوس',
    icon: '🧘',
    simbolik: 'Memohon antara dua kerendahan. Rabbighfirli — Ya Tuhan ampunkan aku. Masa antara — jeda untuk memohon dan mengaudit jiwa. Ini adalah momen paling manusiawi dalam solat.',
    implikasi: 'Dalam hidup ada masa-masa antara — antara satu cabaran ke cabaran lain. Jangan bazirkan masa itu. Gunakan untuk audit jiwa dan memohon. Jeda itu bukan kekosongan — ia adalah ruang untuk Allah masuk.',
    soalan: 'Apa yang kamu biasanya pohon dalam jeda-jeda kehidupan kamu — dan adakah ia cukup jujur?',
    iam_prompt: 'Pengguna sedang merenungi simbolik duduk antara dua sujud — jeda untuk memohon. Bantu mereka merenung tentang doa-doa yang paling dalam hati mereka.',
  },
  {
    id: 'tahiyat',
    name: 'Tahiyat',
    arabic: 'تَحِيَّات',
    icon: '🤝',
    simbolik: 'Persaksian dan salam. Kamu memberi salam kepada Nabi, diri sendiri dan semua hamba Allah. Ini adalah ikatan ummah — kamu tidak bersolat sendirian.',
    implikasi: 'Dalam setiap solat kamu bersalam dengan seluruh ummah Islam di dunia — orang yang kamu kenal dan tidak kenal. Kamu tidak bersendirian dalam perjalanan ini. Ummah adalah keluarga besar yang bersolat bersama.',
    soalan: 'Bagaimana kamu dapat memperkuat ikatan dengan ummah di sekeliling kamu — mulai dari yang paling dekat?',
    iam_prompt: 'Pengguna sedang merenungi simbolik Tahiyat — ikatan dengan ummah dan persaksian. Bantu mereka merenung tentang tanggungjawab kepada komuniti dan hubungan dengan sesama.',
  },
  {
    id: 'salam',
    name: 'Salam',
    arabic: 'السَّلَام',
    icon: '👋',
    simbolik: 'Kembali ke dunia dengan membawa cahaya solat. Salam ke kanan dan kiri — tanggungjawab kepada manusia dimulakan semula. Kamu keluar bukan sebagai orang yang sama.',
    implikasi: 'Selepas solat kamu bukan manusia yang sama. Kamu keluar membawa amanah. Salam ke kanan kiri — janji kepada manusia di sekeliling kamu. Bawa cahaya itu ke setiap langkah, setiap perkataan, setiap keputusan.',
    soalan: 'Dari solat tadi — satu cahaya apa yang kamu bawa keluar — dan bagaimana kamu akan jaga cahaya itu sehingga solat seterusnya?',
    iam_prompt: 'Pengguna sedang merenungi simbolik Salam — kembali ke dunia membawa cahaya solat. Bantu mereka merenung tentang bagaimana solat mengubah mereka dan cahaya apa yang mereka bawa.',
  },
]

const TAREKAT_DATA = [
  { rukun: 'Takbiratul Ihram', maqam: 'Fana dari Selain Allah', arabic: 'فَنَاء', penerangan: 'Fana bermaksud lenyapnya kesedaran tentang selain Allah dalam hati. Apabila bertakbir dengan hati yang hadir, dunia dan segala isinya lenyap sejenak. Hanya ada Allah dan hamba. Ini bukan ilusi — ini adalah hakikat yang tersembunyi di sebalik takbir.' },
  { rukun: 'Qiyam', maqam: 'Wukuf — Hadir dalam Kehadiran', arabic: 'وُقُوف', penerangan: 'Wukuf adalah berdiri dengan kesedaran penuh bahawa kamu di hadapan Allah. Seperti wukuf di Arafah — hadir dengan seluruh kemanusiaan kamu. Tidak ada masa lalu atau masa depan — hanya saat ini, di hadapan-Nya.' },
  { rukun: "Ruku'", maqam: "Tawadu' Hakiki — Merendah yang Sebenar", arabic: 'تَوَاضُع', penerangan: "Bukan sekadar tunduk jasad — tapi lenyapnya rasa kebesaran diri dari hati. Merasai betapa kecil diri di hadapan Keagungan Allah yang Tidak Terhingga. Ini adalah maqam yang membersihkan ego dari akarnya." },
  { rukun: "I'tidal", maqam: "Tawazun — Keseimbangan Batin", arabic: 'تَوَازُن', penerangan: "Bangkit dengan kesedaran penuh. Sami'Allahu liman hamidah — Allah mendengar mereka yang memuji-Nya. Maqam ini mengajar bahawa selepas setiap kerendahan, ada kebangkitan. Keseimbangan adalah anugerah bagi mereka yang berjalan di jalan Allah." },
  { rukun: 'Sujud', maqam: "Fana' fi Allah — Lebur dalam Allah", arabic: 'فَنَاء فِي اللَّه', penerangan: 'Ini adalah maqam tertinggi dalam solat — lebur dalam Allah, ego tiada. Dahi di bumi, hati di langit. Inilah mengapa Rasulullah ﷺ bersabda sujud adalah waktu paling dekat dengan Allah. Di sini tirai antara hamba dan Tuhan paling nipis.' },
  { rukun: 'Duduk', maqam: 'Munaajaat — Berbisik dengan Allah', arabic: 'مُنَاجَاة', penerangan: 'Maqam berbisik dengan Allah. Rabbighfirli — ucapan yang lahir dari hati yang hancur dan berharap. Dalam maqam ini, hamba menyadari keperluannya yang mutlak kepada Allah. Setiap permohonan adalah pengakuan kelemahan yang indah.' },
  { rukun: 'Tahiyat', maqam: "Jam'iyyah — Penyatuan Spiritual", arabic: "جَمْعِيَّة", penerangan: "Maqam penyatuan — di mana hamba, Nabi dan Allah bersatu dalam satu momen suci. Memberi salam kepada Nabi adalah bukan sekadar ucapan — ia adalah keterkaitan roh dengan roh. Jam'iyyah adalah ketika hati tidak lagi berpecah-pecah." },
  { rukun: 'Salam', maqam: "Baqa' billah — Kekal Bersama Allah", arabic: "بَقَاء بِاللَّه", penerangan: "Kembali ke dunia tapi dengan kesedaran kekal tentang Allah. Hidup bersama Allah, bergerak dengan izin-Nya, berkata dengan hikmah-Nya. Baqa' bukan bererti keluar dari dunia — ia bererti membawa Allah ke dalam dunia." },
]

// ─── IAM Modal ────────────────────────────────────────────────────────────────

function IAMModal({ rukun, isPro, onClose }: {
  rukun: typeof RUKUN_DATA[0]
  isPro: boolean
  onClose: () => void
}) {
  const question = rukun.name === 'Sujud'
    ? 'Sujud adalah momen paling dekat dengan Allah. Apa yang biasanya ada dalam hati kamu semasa sujud — dan apakah ia jujur?'
    : rukun.name === 'Takbiratul Ihram'
    ? 'Ketika mengangkat tangan bertakbir — apa yang kamu cuba lepaskan? Apakah masih ada yang tersangkut?'
    : rukun.soalan

  // ── FREE: Motivate upgrade ─────────────────────────────────
  if (!isPro) {
    return (
      <div className="fixed inset-0 bg-[#060d16]/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e2d40]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
                <span className="text-sm">🌙</span>
              </div>
              <div>
                <p className="font-serif text-[#c9a96e] text-sm">I AM — {rukun.name}</p>
                <p className="text-[#8a7a65] text-xs">Rakan Rohani Digital</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Preview soalan — teaser */}
            <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#c9a96e15] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">🌙</span>
                </div>
                <p className="text-[#e8dcc8] text-sm leading-relaxed">
                  "{question}"
                </p>
              </div>
            </div>

            {/* Motivate */}
            <div className="space-y-3 text-center">
              <p className="text-[#8a7a65] text-sm leading-relaxed">
                Soalan ini hanya permulaan. I AM Interaktif akan menemani anda merenung lebih dalam — mendengar, memahami, dan membimbing perjalanan rohani anda secara peribadi.
              </p>

              <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4">
                <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                  وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ
                </p>
                <p className="text-[#8a7a65] text-xs mt-2 italic leading-relaxed">
                  "Sesiapa yang bertakwa kepada Allah, nescaya Dia akan membuka jalan keluar baginya dan memberi rezeki dari arah yang tidak disangka-sangka."
                </p>
                <p className="text-[#c9a96e60] text-xs mt-1">— At-Talaq: 2-3</p>
              </div>

              <p className="text-[#8a7a65] text-xs leading-relaxed">
                Perjalanan rohani yang lebih dalam menanti anda. I AM Interaktif adalah rakan yang menemani setiap langkah — pada setiap rukun, setiap solat, setiap hari.
              </p>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <button className="w-full py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
                ✦ Buka I AM Interaktif — Perjalanan Lebih Dalam
              </button>
              <button onClick={onClose}
                className="w-full py-2.5 text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
                Teruskan renungan sendiri
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── PRO: Full reflection experience ────────────────────────
  return <IAMProModal rukun={rukun} question={question} onClose={onClose} />
}

function IAMProModal({ rukun, question, onClose }: {
  rukun: typeof RUKUN_DATA[0]
  question: string
  onClose: () => void
}) {
  const [answer, setAnswer] = useState(() => {
    try { return localStorage.getItem(`iam-refleksi-${rukun.id}`) ?? '' } catch { return '' }
  })
  const [saved, setSaved] = useState(false)

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
              <p className="font-serif text-[#c9a96e] text-sm">Renungan — {rukun.name}</p>
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
            <p className="text-[#8a7a65] text-xs">Jawapan dan renungan saya:</p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Tulis renungan jujur anda di sini — tiada yang menghakimi, hanya Allah yang mengetahui..."
              rows={4}
              className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl p-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
            />
          </div>

          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-[#1e2d40] rounded-xl text-sm text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors">
              Tutup
            </button>
            <button onClick={handleSave} disabled={!answer.trim()}
              className="flex-1 py-2.5 bg-[#1e2d40] hover:bg-[#2a3d55] rounded-xl text-sm text-[#e8dcc8] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {saved
                ? <><CheckCircle2 size={14} className="text-emerald-400" /> Tersimpan</>
                : 'Simpan Renungan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Syariat Panel ────────────────────────────────────────────────────────────

function SyariatPanel({ onIAM, isPro }: { onIAM: (r: typeof RUKUN_DATA[0]) => void; isPro: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Ayat pembuka */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 text-center space-y-2">
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
          {SYARIAT_OPENING.arabic}
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">
          "{SYARIAT_OPENING.translation}"
        </p>
        <p className="text-[#c9a96e60] text-xs">— {SYARIAT_OPENING.source}</p>
      </div>

      {/* Penerangan ringkas */}
      <div className="bg-[#060d16] border border-[#1e2d40] rounded-xl p-4">
        <p className="text-[#8a7a65] text-sm leading-relaxed text-center">
          Solat bukan sekadar gerakan. Ia adalah <span className="text-[#c9a96e] font-medium">SILAH</span> — tali hubungan langsung antara hamba dengan Allah. Setiap pergerakan membawa makna mendalam untuk kehidupan anda.
        </p>
      </div>

      {/* 8 Rukun Solat */}
      <div className="space-y-2">
        {RUKUN_DATA.map((rukun) => {
          const isOpen = expanded === rukun.id
          return (
            <div key={rukun.id}
              className={cn('bg-[#0d1821] border rounded-2xl overflow-hidden transition-all duration-200',
                isOpen ? 'border-[#c9a96e40]' : 'border-[#1e2d40]')}>
              {/* Card header */}
              <button onClick={() => setExpanded(isOpen ? null : rukun.id)}
                className="w-full flex items-center gap-4 p-4 text-left">
                <span className="text-2xl flex-shrink-0">{rukun.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-[#c9a96e] text-sm leading-none mb-1">{rukun.arabic}</p>
                  <p className="text-[#e8dcc8] text-sm font-medium">{rukun.name}</p>
                </div>
                {isOpen
                  ? <ChevronUp size={16} className="text-[#8a7a65] flex-shrink-0" />
                  : <ChevronDown size={16} className="text-[#8a7a65] flex-shrink-0" />}
              </button>

              {/* Card expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Simbolik */}
                  <div className="space-y-1.5">
                    <p className="text-[#c9a96e] text-xs font-medium uppercase tracking-wider">✦ Simbolik</p>
                    <p className="text-[#e8dcc8] text-sm leading-relaxed">{rukun.simbolik}</p>
                  </div>

                  {/* Implikasi Harian */}
                  <div className="bg-[#060d16] border border-[#1e2d40] rounded-xl p-3 space-y-1.5">
                    <p className="text-[#8a7a65] text-xs font-medium uppercase tracking-wider">Implikasi Harian</p>
                    <p className="text-[#e8dcc8] text-sm leading-relaxed">{rukun.implikasi}</p>
                  </div>

                  {/* Soalan Refleksi */}
                  <div className="bg-[#c9a96e08] border border-[#c9a96e20] rounded-xl p-3 space-y-1">
                    <p className="text-[#c9a96e] text-xs font-medium">💭 Soalan Refleksi</p>
                    <p className="text-[#e8dcc8] text-sm leading-relaxed italic">"{rukun.soalan}"</p>
                  </div>

                  {/* IAM Button */}
                  <button onClick={() => onIAM(rukun)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#c9a96e30] rounded-xl text-xs hover:bg-[#c9a96e10] transition-colors"
                    style={{ color: isPro ? '#c9a96e' : '#8a7a65' }}>
                    <MessageCircle size={13} />
                    {isPro ? 'Tanya I AM tentang ini' : '💬 Tanya I AM — Buka Pro'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Soalan penutup */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 text-center space-y-2">
        <p className="text-[#c9a96e] text-sm font-medium">💭 Renungan Selepas Membaca</p>
        <p className="text-[#e8dcc8] text-sm italic leading-relaxed">
          "Dari semua rukun solat — yang mana satu paling banyak berbicara kepada kehidupan kamu sekarang?"
        </p>
      </div>
    </div>
  )
}

// ─── Tarekat Panel ────────────────────────────────────────────────────────────

function TarekatPanel({ isPro }: { isPro: boolean; isTarekatUnlocked?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!isPro) {
    return (
      <div className="space-y-4">
        <div className="bg-[#0d1821] border border-[#60a5fa20] rounded-2xl p-6 text-center space-y-4">
          <Lock size={28} className="text-[#60a5fa] mx-auto" />
          <div>
            <p className="font-serif text-[#60a5fa] text-xl">Solat Tarekat</p>
            <p className="font-serif text-[#8a7a65] text-sm mt-1" dir="rtl">مَقَام الإِيمَان</p>
          </div>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Dimensi Solat Tarekat membuka makna batin setiap rukun — perjalanan rohani yang lebih dalam dari sekadar gerakan.
          </p>
          <div className="bg-[#060d16] border border-[#60a5fa15] rounded-xl p-4 text-center">
            <p className="font-serif text-[#60a5fa] text-base leading-loose" dir="rtl">
              يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">
              "Allah meninggikan orang yang beriman dan berilmu beberapa darjat" — Al-Mujadilah: 11
            </p>
          </div>
          <button className="w-full py-3 bg-[#60a5fa] text-[#060d16] font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
            ✦ Langkah ini ada lebih dalam...
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
        <p className="text-[#8a7a65] text-xs mt-1 italic">"Solat adalah mi'raj (pendakian) orang beriman"</p>
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
                  <p className="font-serif text-[#60a5fa] text-sm">{item.arabic} — {item.maqam}</p>
                  <p className="text-[#8a7a65] text-xs">{item.rukun}</p>
                </div>
                {isOpen ? <ChevronUp size={15} className="text-[#8a7a65]" /> : <ChevronDown size={15} className="text-[#8a7a65]" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <p className="text-[#e8dcc8] text-sm leading-relaxed">{item.penerangan}</p>
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

function HakikatPanel({ user }: { user: User | null }) {
  const isActivated = user?.solat_hakikat_unlocked === true

  if (isActivated) {
    return (
      <div className="space-y-4">
        <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-6 text-center space-y-3">
          <p className="font-serif text-[#a78bfa] text-2xl" dir="rtl">إِلَٰهِي أَنْتَ مَقْصُودِي</p>
          <p className="text-[#8a7a65] text-sm italic">"Ya Allah, Engkaulah Tujuanku"</p>
          <div className="h-px bg-[#1e2d40]" />
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Dimensi Hakikat anda sedang disediakan oleh Nine.
            <br />InsyaAllah, perjalanan ini akan diteruskan tidak lama lagi.
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
          <p className="font-serif text-[#a78bfa] text-xl">Solat Hakikat</p>
          <p className="font-serif text-[#8a7a65] text-sm mt-1" dir="rtl">مَقَام الإِحْسَان</p>
        </div>
        <div className="bg-[#060d16] border border-[#a78bfa15] rounded-xl p-4 space-y-3">
          <p className="font-serif text-[#a78bfa] text-base leading-loose" dir="rtl">
            إِلَٰهِي أَنْتَ مَقْصُودِي وَرِضَاكَ مَطْلُوبِي
          </p>
          <p className="text-[#8a7a65] text-xs italic leading-relaxed">
            "Ya Allah, Engkaulah Tujuanku dan keredhaan-Mu yang aku cari"
          </p>
        </div>
        <p className="text-[#8a7a65] text-sm leading-relaxed">
          Dimensi Hakikat adalah dimensi tertinggi — mengapa manusia dihadirkan di dunia dan apa hubungannya dengan solat.
        </p>
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          Ini tidak boleh diajar melalui teks. Ia perlu dibuka melalui pertemuan langsung dengan Nine.
        </p>
        <button className="w-full py-3 bg-[#a78bfa15] border border-[#a78bfa40] text-[#a78bfa] font-medium rounded-xl text-sm hover:bg-[#a78bfa25] transition-colors">
          ✦ Hubungi Madrasah I AM
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
  const [panel, setPanel] = useState<DimensiPanel>('syariat')
  const [iamRukun, setIamRukun] = useState<typeof RUKUN_DATA[0] | null>(null)

  const isTarekatUnlocked = user?.solat_tarekat_unlocked === true || isPro

  const PANEL_TABS = [
    { id: 'syariat' as const, label: 'Syariat', arabic: 'الشَّرِيعَة', color: '#c9a96e', available: true },
    { id: 'tarekat' as const, label: 'Tarekat', arabic: 'الطَّرِيقَة', color: '#60a5fa', available: isPro },
    { id: 'hakikat' as const, label: 'Hakikat', arabic: 'الْحَقِيقَة', color: '#a78bfa', available: false },
  ]

  return (
    <div className="space-y-4">
      {/* Opening */}
      <div className="text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-2xl leading-none">أَسْرَار الصَّلَاة</p>
        <p className="text-[#8a7a65] text-sm">Rahsia & Dimensi Solat</p>
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
        <TarekatPanel isPro={isPro} isTarekatUnlocked={isTarekatUnlocked} />
      )}
      {panel === 'hakikat' && (
        <HakikatPanel user={user} />
      )}

      {/* IAM Modal */}
      {iamRukun && (
        <IAMModal rukun={iamRukun} isPro={isPro} onClose={() => setIamRukun(null)} />
      )}
    </div>
  )
}
