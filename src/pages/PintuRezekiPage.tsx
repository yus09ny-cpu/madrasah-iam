import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2, Check, Lock, ArrowLeft, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { sendIAMMessage } from '@/lib/iam-chat'
import { PINTU_REZEKI_SYSTEM_PROMPT, FORMAT_CONTROL } from '@/lib/systemPrompts'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'pintu' | 'audit' | 'amalan' | 'rekod'
type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string }
type AuditPhase = 'sedar' | 'jaga' | 'kembalikan'
type AuditScreen = 'opening' | 'question' | 'ai-loading' | 'ai-response' | 'infak' | 'complete'

interface DayData {
  amalan: Record<string, boolean>
}

interface SifatAuditRecord {
  sedar?: { answers: string[]; aiResponse: string; completedAt: string }
  jaga?: { answers: string[]; completedAt: string }
  kembalikan?: { infak: string; completedAt: string }
}
type AuditData = Record<string, SifatAuditRecord>

// ─── Data: Sifat ──────────────────────────────────────────────────────────────

const SIFAT_MAANI = [
  { id: 'qudrat', arabic: 'اَلْقُدْرَةُ', name: 'QUDRAT', fullName: 'Maha Berkuasa', asma: 'Al-Qadir', color: '#d4a017',
    cermin: 'Bila usaha anda tidak membuahkan hasil — itu cermin Qudrat Allah yang mengatasi semua kuasa manusia.',
    ayat: 'وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', ref: 'Al-Baqarah: 284' },
  { id: 'iradah', arabic: 'اَلْإِرَادَةُ', name: 'IRADAH', fullName: 'Maha Berkehendak', asma: 'Al-Murid', color: '#a78bfa',
    cermin: 'Rancangan anda tidak menjadi — bukan tanda anda gagal. Itu tanda Iradah Allah berbeza dan lebih tinggi.',
    ayat: 'إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَن يَقُولَ لَهُ كُن فَيَكُونُ', ref: 'Yasin: 82' },
  { id: 'ilmu', arabic: 'اَلْعِلْمُ', name: 'ILMU', fullName: 'Maha Mengetahui', asma: 'Al-Alim', color: '#60a5fa',
    cermin: 'Allah tahu keperluan anda sebelum anda tahu sendiri. Rezeki yang lambat mungkin kerana Allah tahu masa yang lebih baik.',
    ayat: 'وَعِندَهُ مَفَاتِحُ الْغَيْبِ لَا يَعْلَمُهَا إِلَّا هُوَ', ref: 'Al-Anam: 59' },
  { id: 'hayat', arabic: 'اَلْحَيَاةُ', name: 'HAYAT', fullName: 'Maha Hidup', asma: 'Al-Hayy', color: '#4ade80',
    cermin: 'Selagi ada nafas — ada rezeki. Kerana rezeki mengikut hayat yang Allah pinjamkan.',
    ayat: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', ref: 'Al-Baqarah: 255' },
  { id: 'sama', arabic: 'اَلسَّمْعُ', name: "SAMA'", fullName: 'Maha Mendengar', asma: "As-Sami'", color: '#fbbf24',
    cermin: 'Setiap doa tentang rezeki yang anda ucapkan — Allah dengar semuanya. Walaupun bisikan hati.',
    ayat: 'سَمِعْنَا وَأَطَعْنَا', ref: 'Al-Baqarah: 285' },
  { id: 'basar', arabic: 'اَلْبَصَرُ', name: 'BASAR', fullName: 'Maha Melihat', asma: 'Al-Basir', color: '#2dd4bf',
    cermin: 'Allah melihat setiap usaha anda — walaupun tidak dilihat manusia. Tidak ada usaha yang sia-sia di sisi-Nya.',
    ayat: 'وَاللَّهُ بَصِيرٌ بِمَا تَعْمَلُونَ', ref: 'Al-Baqarah: 265' },
  { id: 'kalam', arabic: 'اَلْكَلَامُ', name: 'KALAM', fullName: 'Maha Berkata-kata', asma: 'Al-Mutakallim', color: '#f43f5e',
    cermin: 'Allah telah berkata dalam Al-Quran — Dia AKAN beri rezeki. Kalam Allah tidak pernah berdusta.',
    ayat: 'وَمَا مِن دَآبَّةٍ فِى الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا', ref: 'Hud: 6' },
]

// ─── Data: Audit Questions ────────────────────────────────────────────────────

const AUDIT_QUESTIONS_SEDAR: Record<string, string[]> = {
  qudrat: [
    'Di mana anda paling rasa tidak berkuasa dalam hidup anda sekarang?',
    'Apakah yang anda masih cuba kawal — yang sebenarnya di luar kuasa anda?',
    'Ceritakan satu pengalaman di mana rancangan anda gagal sepenuhnya. Apa yang Allah tunjukkan?',
    'Qudrat Allah itu tidak terbatas. Di mana anda rasa paling lemah sebagai manusia?',
    'Kalau Allah ambil kembali pinjaman Qudrat ini malam ini — apa yang tidak lagi boleh anda lakukan?',
  ],
  iradah: [
    'Fikirkan satu keputusan besar dalam hidup anda yang tidak berjalan seperti yang anda rancang. Apa yang anda pelajari?',
    'Di mana dalam hidup anda, kehendak anda paling banyak bercanggah dengan kehendak Allah?',
    'Apakah yang paling anda mahukan sekarang — dan adakah ia selaras dengan apa yang Allah mahu untuk anda?',
    'Iradah manusia ada hadnya. Di mana anda paling sukar menerima bahawa Allah yang menentukan?',
    'Kalau anda boleh ubah satu keputusan yang pernah anda buat — yang mana satu dan mengapa?',
  ],
  ilmu: [
    'Ilmu apa yang anda ada sekarang yang paling tidak anda gunakan dengan betul?',
    'Di mana dalam hidup anda, kejahilan anda pernah menyebabkan kerosakan?',
    'Allah pegang kunci semua yang tersembunyi. Apa yang anda paling ingin tahu tentang masa depan anda?',
    'Ilmu yang paling bernilai dalam hidup anda — dari mana datangnya dan apa kesannya?',
    'Kalau ilmu anda diambil semula sekarang — perkara apa yang paling anda takut tidak tahu?',
  ],
  hayat: [
    'Fikirkan satu orang yang anda sayangi yang telah pergi — atau satu masa anda hampir kehilangan nyawa sendiri. Apa yang anda rasa ketika itu?',
    'Nyawa anda hari ini — apa yang anda lakukan dengannya? Adakah ia digunakan untuk perkara yang akan kekal selepas anda tiada?',
    'Kalau Allah ambil kembali pinjaman Hayat ini malam ini — apakah yang tidak sempat anda selesaikan?',
    'Siapa dalam hidup anda yang belum tahu betapa anda menghargai mereka?',
    'Setiap nafas adalah pinjaman dari Allah. Berapa banyak nafas anda hari ini digunakan untuk mengingati-Nya?',
  ],
  sama: [
    'Siapa dalam hidup anda yang paling memerlukan untuk didengar — tapi anda gagal mendengar mereka?',
    'Apakah doa yang paling kerap anda ulang dalam hati — yang anda rasa tidak didengar?',
    'Allah mendengar setiap bisikan hati. Adakah anda percaya ini sepenuhnya — atau ada keraguan?',
    'Pendengaran anda — adakah lebih banyak digunakan untuk mendengar perkara bermanfaat atau sia-sia?',
    "Kalau pendengaran anda diambil semula sekarang — suara siapa yang paling anda mahu dengar buat kali terakhir?",
  ],
  basar: [
    'Allah melihat setiap usaha anda walaupun tidak dilihat manusia. Apa usaha terbaik anda yang paling tidak dihargai?',
    'Di mana dalam hidup anda, anda telah "buta" kepada keperluan orang lain yang ada di hadapan anda?',
    'Penglihatan anda — lebih banyak digunakan untuk melihat nikmat atau kekurangan?',
    'Apakah yang anda "lihat" dalam hidup anda sekarang yang orang lain tidak nampak?',
    'Kalau penglihatan anda diambil semula sekarang — pemandangan apa yang paling anda mahu lihat buat kali terakhir?',
  ],
  kalam: [
    'Kata-kata apa yang pernah anda ucapkan yang paling banyak memberi kesan — baik atau buruk?',
    'Di mana dalam hidup anda, kata-kata anda pernah menyebabkan luka yang masih belum sembuh?',
    'Kalam Allah tidak pernah berdusta — Dia berjanji memberi rezeki kepada setiap makhluk. Janji Allah yang mana paling sukar anda percaya?',
    'Kalam anda hari ini — lebih banyak digunakan untuk memberi atau mengambil?',
    'Kalau kalam anda diambil semula sekarang — satu kata terakhir yang anda mahu ucapkan kepada siapa?',
  ],
}

function getJagaQuestions(sifatName: string): string[] {
  return [
    `Sifat ${sifatName} yang Allah pinjamkan kepada anda — adakah anda gunakannya sesuai dengan amanah?`,
    `Di mana anda rasa paling gagal dalam menjaga amanah sifat ${sifatName} ini?`,
    `Apa yang perlu anda ubah dalam cara anda menggunakan pinjaman ${sifatName} ini?`,
  ]
}

const KEMBALIKAN_INFAK: Record<string, { text: string; placeholder: string }> = {
  qudrat: { text: 'Gunakan kuasa anda untuk membantu yang lemah. Satu tindakan hari ini.', placeholder: 'Satu tindakan...' },
  iradah: { text: 'Arahkan kehendak anda untuk kebaikan orang lain. Satu niat hari ini.', placeholder: 'Satu niat...' },
  ilmu: { text: 'Ajar satu perkara yang anda tahu kepada orang lain. Ilmu yang dikongsi — berkembang.', placeholder: 'Apa yang akan dikongsi...' },
  hayat: { text: 'Hidupkan orang lain dengan kehadiran anda. Siapa yang perlukan anda hari ini?', placeholder: 'Nama seseorang...' },
  sama: { text: 'Dengar seseorang yang tidak didengar hari ini. Siapa itu?', placeholder: 'Nama seseorang...' },
  basar: { text: 'Lihat keperluan yang tidak dilihat orang lain. Apa yang anda nampak?', placeholder: 'Pemerhatian anda...' },
  kalam: { text: 'Ucapkan kata yang memberi — bukan yang mengambil. Satu kata baik hari ini.', placeholder: 'Kata yang akan anda ucapkan...' },
}

const SITUASI = [
  { id: 'kewangan', emoji: '💼', label: 'Kewangan', question: 'Beritahu saya lebih lanjut — apa yang paling memberat dalam kewangan anda sekarang?' },
  { id: 'pekerjaan', emoji: '🏢', label: 'Pekerjaan', question: 'Ceritakan — apakah yang paling menekan dalam situasi pekerjaan anda?' },
  { id: 'keluarga', emoji: '👨‍👩‍👧', label: 'Keluarga', question: 'Kongsi dengan saya — apakah beban tentang keluarga yang paling berat di hati anda?' },
  { id: 'hutang', emoji: '😰', label: 'Hutang', question: 'Saya faham hutang itu berat. Boleh cerita — sudah berapa lama anda menanggung beban ini?' },
  { id: 'perniagaan', emoji: '🌱', label: 'Perniagaan', question: 'Beritahu saya lebih lanjut — apakah cabaran dalam perniagaan yang paling memberat anda?' },
  { id: 'lain', emoji: '💭', label: 'Lain-lain', question: 'Ceritakan kepada saya — apakah yang paling memberat fikiran anda tentang rezeki sekarang?' },
]

const AMALAN_LIST = [
  { id: 'ya_razzaq', icon: '✦', label: 'Zikir Ya Razzaq × 100', sub: 'Mengakui kuasa Allah sebagai Pemberi Rezeki', sifat: 'Qudrat', color: '#d4a017' },
  { id: 'tawakkal', icon: '🤲', label: 'Doa Tawakkal', sub: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ — Cukuplah Allah', sifat: 'Iradah', color: '#a78bfa' },
  { id: 'al_waqiah', icon: '📖', label: 'Baca Surah Al-Waqiah', sub: 'Surah yang menarik rezeki — HR Ibnu Masud', sifat: 'Ilmu', color: '#60a5fa' },
  { id: 'sedekah', icon: '💧', label: 'Sedekah walaupun sedikit', sub: '"Sedekah tidak mengurangi harta" — HR Muslim', sifat: 'Hayat', color: '#4ade80' },
  { id: 'istighfar', icon: '🙏', label: 'Istighfar × 100', sub: 'Mohon ampun — Allah buka pintu rezeki (Nuh: 10-11)', sifat: "Sama'", color: '#fbbf24' },
  { id: 'dhuha', icon: '🌅', label: 'Solat Dhuha', sub: 'Solat yang mendatangkan rezeki — HR Abu Hurairah', sifat: 'Basar', color: '#2dd4bf' },
  { id: 'zikir_pagi', icon: '📿', label: 'Zikir Pagi Petang', sub: '"Rezeki mengikut zikir" — Miftahus Shudur', sifat: 'Kalam', color: '#f43f5e' },
]

// ─── Storage ──────────────────────────────────────────────────────────────────

const AUDIT_KEY = 'madrasah_audit_v1'

function loadAuditData(): AuditData {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) ?? '{}') } catch { return {} }
}

function saveAuditData(data: AuditData) {
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

function getDayKey(date?: Date) {
  return `madrasah_rezeki_${format(date ?? new Date(), 'yyyy-MM-dd')}`
}

function loadDay(date?: Date): DayData {
  try {
    const raw = localStorage.getItem(getDayKey(date))
    return raw ? JSON.parse(raw) as DayData : { amalan: {} }
  } catch { return { amalan: {} } }
}

function saveDay(data: DayData, date?: Date) {
  try { localStorage.setItem(getDayKey(date), JSON.stringify(data)) } catch { /* ignore */ }
}

function isAllAudited(data: AuditData): boolean {
  return SIFAT_MAANI.every(s => {
    const rec = data[s.id]
    return rec?.sedar && rec?.jaga && rec?.kembalikan
  })
}

// ─── Skrin Kesedaran Akhir ────────────────────────────────────────────────────

const KESADARAN_DELAYS = [2000, 2000, 2000, 2000, 2000, 2000, 3000, 3000, 3000, 2000, 2000, 0]

function KesadaranScreen({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= KESADARAN_DELAYS.length - 1) return
    const delay = KESADARAN_DELAYS[step]
    if (!delay) return
    const t = setTimeout(() => setStep(s => s + 1), delay)
    return () => clearTimeout(t)
  }, [step])

  const sifatNames = ['Qudrat', 'Iradah', 'Ilmu', 'Hayat', "Sama'", 'Basar', 'Kalam']
  const sifatColors = ['#d4a017', '#a78bfa', '#60a5fa', '#4ade80', '#fbbf24', '#2dd4bf', '#f43f5e']

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-8 text-center overflow-y-auto py-12">
      <div className="space-y-5 max-w-xs w-full">
        {/* Sifat items — appear one by one */}
        {sifatNames.map((name, i) => (
          <p
            key={name}
            className="font-serif text-base transition-all duration-1000"
            style={{
              color: sifatColors[i],
              opacity: step >= i ? 1 : 0,
              transform: step >= i ? 'translateY(0)' : 'translateY(8px)',
            }}
          >
            {name} — bukan milik anda{' '}
            {step >= i && <span style={{ color: '#4ade80' }}>✓</span>}
          </p>
        ))}

        {/* Al-Baqarah 284 */}
        <div
          className="transition-all duration-1000 space-y-1"
          style={{ opacity: step >= 7 ? 1 : 0, transform: step >= 7 ? 'translateY(0)' : 'translateY(8px)' }}
        >
          <p className="font-serif text-[#c9a96e] text-lg leading-loose" dir="rtl">
            لِّلَّهِ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ
          </p>
        </div>

        {/* La Ilaha Illallah */}
        <p
          className="font-serif text-white text-2xl leading-loose transition-all duration-1000"
          style={{ opacity: step >= 8 ? 1 : 0, transform: step >= 8 ? 'translateY(0)' : 'translateY(8px)' }}
          dir="rtl"
        >
          لَا إِلَٰهَ إِلَّا اللَّهُ
        </p>

        {/* "Tiada yang ada" */}
        <p
          className="text-[#e8dcc8] text-sm leading-relaxed transition-all duration-1000"
          style={{ opacity: step >= 9 ? 1 : 0, transform: step >= 9 ? 'translateY(0)' : 'translateY(8px)' }}
        >
          Tiada yang ada — hanya tinggal Allah.
        </p>

        {/* Al-Baqarah 3 */}
        <div
          className="space-y-1.5 transition-all duration-1000"
          style={{ opacity: step >= 10 ? 1 : 0, transform: step >= 10 ? 'translateY(0)' : 'translateY(8px)' }}
        >
          <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
            وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ
          </p>
          <p className="text-[#8a7a65] text-xs italic">
            "Dan mereka membelanjakan sebahagian dari rezeki yang Kami berikan" — Al-Baqarah: 3
          </p>
        </div>

        {/* Final message + button */}
        <div
          className="space-y-5 transition-all duration-1000"
          style={{ opacity: step >= 11 ? 1 : 0, transform: step >= 11 ? 'translateY(0)' : 'translateY(8px)' }}
        >
          <p className="text-[#e8dcc8] text-sm leading-relaxed">
            Kerana mereka sedar — ia bukan milik mereka. InsyaAllah.
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-[#c9a96e20] border border-[#c9a96e60] text-[#c9a96e] rounded-2xl font-serif text-lg font-medium hover:bg-[#c9a96e30] transition-colors"
          >
            ✦ Alhamdulillah
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Audit Flow ───────────────────────────────────────────────────────────────

interface AuditFlowProps {
  sifat: typeof SIFAT_MAANI[0]
  isPro: boolean
  existing: SifatAuditRecord | undefined
  onComplete: (record: SifatAuditRecord) => void
  onClose: () => void
}

function AuditFlow({ sifat, isPro, existing, onComplete, onClose }: AuditFlowProps) {
  const { t } = useTranslation()
  const tier = isPro ? 'pro' : 'free'
  const maxSedarQ = isPro ? 5 : 2

  const sedarQuestions = (AUDIT_QUESTIONS_SEDAR[sifat.id] ?? []).slice(0, maxSedarQ)
  const jagaQuestions = getJagaQuestions(sifat.name)
  const kembalikanData = KEMBALIKAN_INFAK[sifat.id]

  const [phase, setPhase] = useState<AuditPhase>('sedar')
  const [screen, setScreen] = useState<AuditScreen>('opening')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [jagaAnswers, setJagaAnswers] = useState<string[]>([])
  const [currentJaga, setCurrentJaga] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [infakText, setInfakText] = useState('')
  const [record, setRecord] = useState<SifatAuditRecord>(existing ?? {})

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentQ = phase === 'sedar' ? sedarQuestions[qIndex] : jagaQuestions[qIndex]
  const totalQ = phase === 'sedar' ? sedarQuestions.length : jagaQuestions.length

  function nextSedarQ() {
    const newAnswers = [...answers, currentAnswer]
    setAnswers(newAnswers)
    setCurrentAnswer('')

    if (qIndex + 1 < sedarQuestions.length) {
      setQIndex(q => q + 1)
    } else {
      // All sedar questions done — call AI
      callAI(newAnswers, 'sedar')
    }
  }

  function nextJagaQ() {
    const newJaga = [...jagaAnswers, currentJaga]
    setJagaAnswers(newJaga)
    setCurrentJaga('')

    if (qIndex + 1 < jagaQuestions.length) {
      setQIndex(q => q + 1)
    } else {
      // Jaga done — save and go to kembalikan
      const updated: SifatAuditRecord = {
        ...record,
        jaga: { answers: newJaga, completedAt: new Date().toISOString() },
      }
      setRecord(updated)
      setPhase('kembalikan')
      setScreen('infak')
    }
  }

  async function callAI(ans: string[], ph: AuditPhase) {
    setScreen('ai-loading')

    const phaseLabel = ph === 'sedar' ? 'SEDAR — Menyedari Pinjaman' : 'JAGA — Menjaga Amanah'
    const questions = ph === 'sedar' ? sedarQuestions : jagaQuestions

    const systemPrompt = `Kamu adalah panduan rohani untuk Sistem Audit Sifat Allah dalam Madrasah I AM.

${FORMAT_CONTROL}

Fasa: ${phaseLabel}
Sifat diaudit: ${sifat.arabic} — ${sifat.name} (${sifat.fullName})
Cermin: "${sifat.cermin}"
Dalil: ${sifat.ayat} (${sifat.ref})

Jawapan pengguna:
${questions.map((q, i) => `S${i + 1}: ${q}\nJ: ${ans[i] || '(tidak dijawab)'}`).join('\n\n')}

CARA MENJAWAB:
1. Hargai kejujuran pengguna dengan empati yang tulus
2. Hubungkan pengalaman mereka dengan sifat ${sifat.name} sebagai pinjaman Allah
3. Sertakan dalil: ${sifat.ayat} (${sifat.ref})
4. Bantu mereka melihat pengalaman ini sebagai cermin mengenal Allah
5. Ikut had panjang dalam ARAHAN FORMAT di atas — JANGAN tulis 3-4 perenggan
6. Jangan sebut "AI" — kamu adalah "I AM"
7. Bahasa Melayu yang lembut`

    try {
      const DEFAULT = `Jazakallah khair atas kejujuran anda dalam audit sifat ${sifat.name} ini.\n\n${sifat.cermin}\n\n${sifat.ayat}\n— ${sifat.ref}\n\nAllah meminjamkan sifat ini kepada anda sebagai amanah. Setiap pengalaman yang anda kongsikan adalah langkah mengenal-Nya dengan lebih dekat. Dan Allah sudah berikan bentengnya — melalui Zikir Jahar dan Zikir Khafi.`
      const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve(DEFAULT), 30000))
      const aiPromise = sendIAMMessage(
        [{ role: 'user', content: `Audit ${sifat.name} selesai. Berikan refleksi rohani.` }],
        tier,
        systemPrompt,
        undefined,
        'pintu_rezeki_reflection'
      ).catch(() => DEFAULT)

      const reply = await Promise.race([aiPromise, timeoutPromise])
      setAiResponse(reply)

      const now = new Date().toISOString()
      const updated: SifatAuditRecord = {
        ...record,
        sedar: { answers: ans, aiResponse: reply, completedAt: now },
      }
      setRecord(updated)

      setScreen('ai-response')
    } catch {
      setAiResponse('Maaf, berlaku ralat. Sila cuba sekali lagi.')
      setScreen('ai-response')
    }
  }

  function afterAIResponse() {
    if (!isPro) {
      // Free — show upgrade CTA (handled in ai-response screen)
      return
    }
    // Pro — go to Jaga phase
    setPhase('jaga')
    setQIndex(0)
    setJagaAnswers([])
    setCurrentJaga('')
    setScreen('question')
  }

  function finishKembalikan() {
    const updated: SifatAuditRecord = {
      ...record,
      kembalikan: { infak: infakText, completedAt: new Date().toISOString() },
    }
    setRecord(updated)
    onComplete(updated)
    setScreen('complete')
  }

  // ── Opening screen
  if (screen === 'opening') {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        <button onClick={onClose} className="flex items-center gap-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors text-sm">
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="text-center space-y-4 py-4">
          <p className="font-serif text-4xl" style={{ color: sifat.color }} dir="rtl">{sifat.arabic}</p>
          <p className="font-serif text-[#e8dcc8] text-lg">{sifat.name}</p>
          <p className="text-[#8a7a65] text-sm">{sifat.asma} — {sifat.fullName}</p>
        </div>

        <div className="bg-[#060d16] border rounded-2xl p-4 space-y-3" style={{ borderColor: sifat.color + '30' }}>
          <p className="font-serif text-sm leading-loose text-right" style={{ color: sifat.color }} dir="rtl">
            {sifat.ayat}
          </p>
          <p className="text-[#8a7a65] text-xs text-right">— {sifat.ref}</p>
        </div>

        <p className="text-[#e8dcc8] text-sm leading-relaxed text-center italic">
          "{sifat.cermin}"
        </p>

        <p className="text-[#8a7a65] text-xs text-center leading-relaxed">
          {isPro
            ? `Audit ini ada 3 fasa: Sedar, Jaga, Kembalikan. ${maxSedarQ} soalan dalam Fasa Pertama.`
            : `Audit Hayat — Fasa Sedar. ${maxSedarQ} soalan sahaja.`}
        </p>

        <button
          onClick={() => setScreen('question')}
          className="w-full py-4 rounded-2xl font-medium text-sm transition-all"
          style={{ backgroundColor: sifat.color + '20', borderWidth: 1, borderColor: sifat.color + '50', color: sifat.color }}
        >
          {t('pintu_rezeki.mulakan')} →
        </button>
      </div>
    )
  }

  // ── Question screen (Sedar or Jaga)
  if (screen === 'question') {
    const isJaga = phase === 'jaga'
    const val = isJaga ? currentJaga : currentAnswer
    const setVal = isJaga ? setCurrentJaga : setCurrentAnswer

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <p className="text-[#8a7a65] text-xs">
                {isJaga ? 'Fasa 2 — JAGA' : 'Fasa 1 — SEDAR'} · {sifat.name}
              </p>
              <div className="mt-1 h-1 bg-[#1e2d40] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${((qIndex + 1) / totalQ) * 100}%`, backgroundColor: sifat.color }}
                />
              </div>
            </div>
            <p className="text-[#8a7a65] text-xs">{qIndex + 1}/{totalQ}</p>
          </div>

          <p className="text-[#e8dcc8] text-base leading-relaxed font-medium">
            {currentQ}
          </p>

          <textarea
            ref={textareaRef}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Tulis jawapan anda dengan jujur..."
            rows={6}
            className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e40] rounded-2xl px-4 py-3.5 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
          />
        </div>

        <div className="px-5 py-4 border-t border-[#1e2d40] flex-shrink-0">
          <button
            onClick={isJaga ? nextJagaQ : nextSedarQ}
            disabled={!val.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: val.trim() ? sifat.color : '#1e2d40', color: val.trim() ? '#060d16' : '#8a7a65' }}
          >
            {qIndex + 1 === totalQ
              ? (isJaga ? 'Teruskan →' : 'Lihat Panduan I AM →')
              : 'Seterusnya →'}
          </button>
        </div>
      </div>
    )
  }

  // ── AI Loading
  if (screen === 'ai-loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5">
        <Loader2 size={28} className="animate-spin" style={{ color: sifat.color }} />
        <p className="text-[#8a7a65] text-sm text-center">I AM sedang merenungi jawapan anda...</p>
      </div>
    )
  }

  // ── AI Response
  if (screen === 'ai-response') {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: sifat.color + '20' }}>
            <span className="text-sm">🗝️</span>
          </div>
          <p className="text-sm font-medium" style={{ color: sifat.color }}>Refleksi dari I AM</p>
        </div>

        <div className="markdown-content bg-[#0d1821] border border-[#1e2d40] rounded-2xl px-4 py-4 text-[#e8dcc8] text-sm leading-relaxed">
          <ReactMarkdown>{aiResponse}</ReactMarkdown>
        </div>

        {!isPro ? (
          // Free — upgrade CTA
          <div className="space-y-3">
            <div className="bg-[#060d16] border border-[#c9a96e20] rounded-2xl p-4 space-y-3">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose text-center" dir="rtl">
                وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ
              </p>
              <p className="text-[#8a7a65] text-xs text-center italic leading-relaxed">
                Ini hanyalah 1 dari 7 amanah yang Allah pinjamkan. Ada 6 lagi menunggu untuk diaudit.
              </p>
              <div className="space-y-1 pt-1">
                {['Qudrat', 'Iradah', 'Ilmu', "Sama'", 'Basar', 'Kalam'].map(n => (
                  <p key={n} className="text-[#8a7a65] text-xs text-center">· {n}</p>
                ))}
              </div>
            </div>
            <a
              href={`https://wa.me/60182119135?text=${encodeURIComponent('Assalamualaikum, saya ingin upgrade ke Pro untuk akses Audit Penuh 7 Sifat Maani. Terima kasih.')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-medium bg-[#c9a96e20] border border-[#c9a96e50] text-[#c9a96e] hover:bg-[#c9a96e30] transition-colors"
            >
              ✦ Buka Audit Penuh — RM14.90/bulan
            </a>
            <button onClick={onClose} className="w-full text-[#8a7a65] text-xs text-center py-2 hover:text-[#e8dcc8] transition-colors">
              Atau teruskan dengan Hayat sahaja
            </button>
          </div>
        ) : (
          // Pro — continue to Jaga
          <button
            onClick={afterAIResponse}
            className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all"
            style={{ backgroundColor: sifat.color + '20', borderWidth: 1, borderColor: sifat.color + '40', color: sifat.color }}
          >
            Teruskan ke Fasa Jaga →
          </button>
        )}
      </div>
    )
  }

  // ── Infak (Kembalikan)
  if (screen === 'infak') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="flex items-center gap-2 text-[#8a7a65] text-xs">
            <span>Fasa 3 — KEMBALIKAN</span>
            <span>·</span>
            <span style={{ color: sifat.color }}>{sifat.name}</span>
          </div>

          <div className="text-center space-y-2 py-2">
            <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
              وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ
            </p>
            <p className="text-[#8a7a65] text-xs italic">"Dan mereka membelanjakan dari rezeki yang Kami berikan" — Al-Baqarah: 3</p>
          </div>

          <div className="bg-[#060d16] border rounded-2xl p-4 space-y-3" style={{ borderColor: sifat.color + '30' }}>
            <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Infak {sifat.name}</p>
            <p className="text-[#e8dcc8] text-sm leading-relaxed">{kembalikanData?.text}</p>
          </div>

          <textarea
            value={infakText}
            onChange={e => setInfakText(e.target.value)}
            placeholder={kembalikanData?.placeholder ?? 'Tulis komitmen anda...'}
            rows={4}
            className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e40] rounded-2xl px-4 py-3.5 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
          />
        </div>

        <div className="px-5 py-4 border-t border-[#1e2d40] flex-shrink-0">
          <button
            onClick={finishKembalikan}
            disabled={!infakText.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: infakText.trim() ? sifat.color : '#1e2d40', color: infakText.trim() ? '#060d16' : '#8a7a65' }}
          >
            Selesai Audit {sifat.name} ✓
          </button>
        </div>
      </div>
    )
  }

  // ── Complete
  if (screen === 'complete') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: sifat.color + '20' }}>
          <Check size={28} style={{ color: sifat.color }} strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <p className="font-serif text-[#c9a96e] text-lg">Audit {sifat.name} Selesai</p>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Anda telah menyedari, menjaga, dan berkomitmen untuk mengembalikan pinjaman {sifat.fullName}.
          </p>
        </div>
        <div className="bg-[#060d16] border border-[#c9a96e20] rounded-2xl p-4 space-y-1.5 w-full">
          <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">{sifat.ayat}</p>
          <p className="text-[#8a7a65] text-xs">— {sifat.ref}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-[#c9a96e20] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e30] transition-colors"
        >
          Kembali ke Senarai Sifat
        </button>
      </div>
    )
  }

  return null
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────

function AuditTab({ isPro }: { isPro: boolean }) {
  const [auditData, setAuditData] = useState<AuditData>(loadAuditData)
  const [selected, setSelected] = useState<typeof SIFAT_MAANI[0] | null>(null)
  const [lockedSifat, setLockedSifat] = useState<typeof SIFAT_MAANI[0] | null>(null)
  const [showKesadaran, setShowKesadaran] = useState(false)

  function handleComplete(sifatId: string, record: SifatAuditRecord) {
    const updated = { ...auditData, [sifatId]: record }
    setAuditData(updated)
    saveAuditData(updated)
    setSelected(null)
    if (isPro && isAllAudited(updated) && !localStorage.getItem('madrasah_kesadaran_seen')) {
      setShowKesadaran(true)
    }
  }

  const auditedCount = SIFAT_MAANI.filter(s => {
    const r = auditData[s.id]
    return isPro ? (r?.sedar && r?.jaga && r?.kembalikan) : r?.sedar
  }).length

  if (showKesadaran) {
    return (
      <KesadaranScreen
        onClose={() => {
          setShowKesadaran(false)
          localStorage.setItem('madrasah_kesadaran_seen', '1')
        }}
      />
    )
  }

  if (selected) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <AuditFlow
          sifat={selected}
          isPro={isPro}
          existing={auditData[selected.id]}
          onComplete={(rec) => handleComplete(selected.id, rec)}
          onClose={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="font-serif text-[#c9a96e] font-medium">Audit 7 Amanah Allah</p>
        <p className="text-[#8a7a65] text-xs">
          {isPro ? `${auditedCount}/7 sifat telah diaudit` : 'Audit percuma: HAYAT sahaja'}
        </p>
      </div>

      {/* 7 Sifat grid */}
      <div className="grid grid-cols-2 gap-3">
        {SIFAT_MAANI.map(sifat => {
          const isHayat = sifat.id === 'hayat'
          const isUnlocked = isPro || isHayat
          const rec = auditData[sifat.id]
          const isFullyDone = isPro
            ? (rec?.sedar && rec?.jaga && rec?.kembalikan)
            : rec?.sedar

          return (
            <button
              key={sifat.id}
              onClick={() => {
                if (isUnlocked) setSelected(sifat)
                else setLockedSifat(sifat)
              }}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center',
                isUnlocked
                  ? 'bg-[#0d1821] hover:border-opacity-70'
                  : 'bg-[#0d1821] opacity-50'
              )}
              style={{ borderColor: isUnlocked ? sifat.color + '40' : '#1e2d40' }}
            >
              {/* Completion badge */}
              {isFullyDone && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: sifat.color }}
                >
                  <Check size={11} className="text-[#060d16]" strokeWidth={3} />
                </div>
              )}

              <p className="font-serif text-xl" style={{ color: isUnlocked ? sifat.color : '#8a7a65' }} dir="rtl">
                {sifat.arabic}
              </p>
              <p className="text-[#e8dcc8] text-xs font-medium">{sifat.name}</p>

              {isUnlocked ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: sifat.color, backgroundColor: sifat.color + '15' }}>
                  {isFullyDone ? '✓ Selesai' : isHayat && !isPro ? '✦ Aktif' : 'Audit →'}
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <Lock size={10} className="text-[#8a7a65]" />
                  <span className="text-[#8a7a65] text-[10px]">Pro</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Free user note */}
      {!isPro && (
        <p className="text-[#8a7a65] text-xs text-center leading-relaxed">
          Anda sedang mengaudit 1 dari 7 amanah Allah.{' '}
          <a
            href={`https://wa.me/60182119135?text=${encodeURIComponent('Saya ingin upgrade ke Pro untuk akses Audit Penuh 7 Sifat Maani.')}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[#c9a96e] underline"
          >
            Buka semua audit dengan Pro.
          </a>
        </p>
      )}

      {/* Locked sifat modal */}
      {lockedSifat && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={() => setLockedSifat(null)}>
          <div
            className="w-full bg-[#0d1821] border-t border-[#1e2d40] rounded-t-3xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
                وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ
              </p>
              <p className="text-[#e8dcc8] text-sm leading-relaxed">
                Allah mengajar kita untuk membelanjakan dari pinjaman-Nya.
                Tapi sebelum membelanja — kita perlu <strong>SEDAR</strong> apa yang kita pegang.
              </p>
              <p className="text-[#8a7a65] text-xs leading-relaxed">
                Audit {lockedSifat.name} menunggu. Setiap audit membawa anda selangkah lebih dekat kepada{' '}
                <span className="font-serif text-[#c9a96e]">لَا إِلَٰهَ إِلَّا اللَّهُ</span>{' '}
                yang difahami dengan hati — bukan sekadar di mulut.
              </p>
            </div>
            <a
              href={`https://wa.me/60182119135?text=${encodeURIComponent('Saya ingin upgrade ke Pro untuk akses Audit Penuh 7 Sifat Maani.')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-medium bg-[#c9a96e20] border border-[#c9a96e50] text-[#c9a96e] hover:bg-[#c9a96e30] transition-colors"
            >
              ✦ Buka Audit Penuh
            </a>
            <button onClick={() => setLockedSifat(null)} className="w-full text-[#8a7a65] text-xs text-center py-1">
              Perjalanan ini ada lebih dalam...
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Link CTA Detection ─────────────────────────────────────────────────────

const LINK_CTA_MAP: Record<string, { route: string; label: string }> = {
  '/zikir': { route: '/zikir', label: 'Buka Tab Zikir Am' },
  '/zikir-am': { route: '/zikir', label: 'Buka Tab Zikir Am' },
  '/zikir-khas': { route: '/zikir?tab=khas', label: 'Buka Tab Zikir Khas' },
}
const LINK_MARKER_REGEX = /\[LINK:(\/[\w-]+)\]/

function getLinkCTA(content: string): { route: string; label: string } | null {
  const match = content.match(LINK_MARKER_REGEX)
  return match ? LINK_CTA_MAP[match[1]] ?? null : null
}

// ─── Choice Buttons Detection ───────────────────────────────────────────────

const CHOICE_MARKER_REGEX = /\[CHOICE:(.+?)\|(.+?)\]/

function getChoiceOptions(content: string): [string, string] | null {
  const match = content.match(CHOICE_MARKER_REGEX)
  return match ? [match[1].trim(), match[2].trim()] : null
}

function stripMarkers(content: string): string {
  return content.replace(LINK_MARKER_REGEX, '').replace(CHOICE_MARKER_REGEX, '')
}

function LinkCTACard({ route, label }: { route: string; label: string }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(route)}
      className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[#c9a96e30] bg-[#c9a96e08] hover:bg-[#c9a96e15] transition-all group mt-2"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-lg">📿</span>
        <span className="text-[#e8dcc8] text-sm font-medium">{label}</span>
      </div>
      <ExternalLink size={13} className="text-[#8a7a65] group-hover:text-[#c9a96e] transition-colors" />
    </button>
  )
}

function ChoiceButtons({ options, onSelect }: { options: [string, string]; onSelect: (label: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        onClick={() => onSelect(options[0])}
        className="px-4 py-2 rounded-xl border border-[#c9a96e30] bg-[#c9a96e15] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-all"
      >
        ✦ {options[0]}
      </button>
      <button
        onClick={() => onSelect(options[1])}
        className="px-4 py-2 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm font-medium hover:border-[#c9a96e30] hover:text-[#e8dcc8] transition-all"
      >
        {options[1]}
      </button>
    </div>
  )
}

// ─── Free Tier Restrictions ────────────────────────────────────────────────────

const FREE_UNLOCKED_CATEGORIES = ['kewangan', 'perniagaan']
const MAX_FREE_MESSAGES = 3

const UPGRADE_MSG = `Assalamualaikum, saya dari app Madrasah I AM.

Saya ingin maklumat lanjut tentang upgrade ke Pro untuk akses penuh Tab Pintu Rezeki.

Terima kasih.`

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const WA_LINK = `https://wa.me/60182119135?text=${encodeURIComponent(UPGRADE_MSG)}`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-medium text-sm">Kategori Pro</p>
        </div>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">
          Kategori ini khusus untuk pengguna Pro. Upgrade untuk akses Pekerjaan, Keluarga, Hutang, dan Lain-lain.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#1e2d40] text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
            Tutup
          </button>
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm text-center font-medium hover:bg-[#c9a96e25] transition-colors">
            Upgrade ke Pro
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Pintu Tab (AI Chat) ──────────────────────────────────────────────────────

function PintuTab() {
  const { user } = useAuthStore()
  const tier = user?.tier ?? 'free'
  const isPro = tier === 'pro' || tier === 'family'
  const [selectedSituasi, setSelectedSituasi] = useState<string | null>(null)
  const [phase, setPhase] = useState<'select' | 'chat'>('select')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  function selectSituasi(id: string) {
    if (!isPro && !FREE_UNLOCKED_CATEGORIES.includes(id)) {
      setShowUpgradeModal(true)
      return
    }
    const s = SITUASI.find(s => s.id === id)!
    setSelectedSituasi(id)
    setMessages([{ id: 'ai-open', role: 'assistant', content: s.question }])
    setPhase('chat')
  }

  const realMsgCount = messages.filter(m => m.id !== 'ai-open').length
  const isMsgLimitReached = !isPro && FREE_UNLOCKED_CATEGORIES.includes(selectedSituasi ?? '') && realMsgCount >= MAX_FREE_MESSAGES

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isTyping || isMsgLimitReached) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const situasiLabel = SITUASI.find(s => s.id === selectedSituasi)?.label ?? ''
    const isFirst = messages.filter(m => m.role === 'user').length === 0
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)
    try {
      const history = [...messages, { ...userMsg, content: isFirst ? `[Situasi: ${situasiLabel}] ${content}` : content }]
        .filter(m => m.id !== 'ai-open').slice(-8)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const reply = await sendIAMMessage(history, tier, PINTU_REZEKI_SYSTEM_PROMPT, undefined, 'pintu_rezeki_chat')
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Maaf, berlaku ralat. Sila cuba sekali lagi.' }])
    } finally { setIsTyping(false) }
  }, [input, isTyping, isMsgLimitReached, messages, selectedSituasi, tier])

  if (phase === 'select') {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="text-center py-5 space-y-3 bg-[#0d1821] border border-[#1e2d40] rounded-2xl px-5">
          <p className="font-serif text-[#c9a96e] text-4xl" dir="rtl">اَلرَّزَّاقُ</p>
          <p className="text-[#8a7a65] text-sm">Ar-Razzaq — Allah Maha Pemberi Rezeki</p>
          <div className="bg-[#060d16] rounded-xl p-3.5">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose text-right" dir="rtl">
              وَمَا مِن دَآبَّةٍ فِى الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">"Tidak ada satu pun makhluk melainkan Allah yang menanggung rezekinya" — Hud: 6</p>
          </div>
        </div>
        <div>
          <p className="text-[#e8dcc8] text-sm font-medium text-center mb-4">Apa yang paling memberat fikiran anda tentang rezeki hari ini?</p>
          <div className="grid grid-cols-2 gap-3">
            {SITUASI.map(s => {
              const locked = !isPro && !FREE_UNLOCKED_CATEGORIES.includes(s.id)
              return (
                <button key={s.id} onClick={() => selectSituasi(s.id)}
                  className="relative flex flex-col items-center gap-2 p-4 bg-[#0d1821] border border-[#1e2d40] rounded-2xl hover:border-[#c9a96e40] hover:bg-[#c9a96e08] transition-all">
                  {locked && <Lock size={12} className="absolute top-2.5 right-2.5 text-[#8a7a65]" />}
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-[#8a7a65] text-sm">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {selectedSituasi && (
          <div className="flex justify-center">
            <button onClick={() => { setPhase('select'); setSelectedSituasi(null); setMessages([]) }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#c9a96e10] border border-[#c9a96e30] rounded-full text-xs text-[#c9a96e] hover:bg-[#c9a96e20] transition-colors">
              <span>{SITUASI.find(s => s.id === selectedSituasi)?.emoji}</span>
              <span>{SITUASI.find(s => s.id === selectedSituasi)?.label}</span>
              <span className="text-[#8a7a65]">· tukar</span>
            </button>
          </div>
        )}
        {messages.map((msg, idx) => {
          const linkCTA = msg.role === 'assistant' ? getLinkCTA(msg.content) : null
          const choiceOptions = msg.role === 'assistant' && idx === messages.length - 1 && !isTyping ? getChoiceOptions(msg.content) : null
          return (
          <div key={msg.id} className={cn(msg.role === 'user' ? 'flex justify-end' : 'flex flex-col gap-1')}>
            <div className={cn(msg.role === 'user' ? 'flex justify-end' : 'flex gap-2.5 items-start')}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm">🗝️</span>
                </div>
              )}
              <div className={cn('markdown-content max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user' ? 'bg-[#c9a96e20] border border-[#c9a96e30] text-[#e8dcc8] rounded-br-sm' : 'bg-[#0d1821] border border-[#1e2d40] text-[#e8dcc8] rounded-bl-sm')}>
                <ReactMarkdown>{msg.role === 'assistant' ? stripMarkers(msg.content) : msg.content}</ReactMarkdown>
              </div>
            </div>
            {/* LinkCTACard — muncul di bawah mesej assistant yang arah ke tab lain */}
            {linkCTA && (
              <div className="pl-9">
                <LinkCTACard route={linkCTA.route} label={linkCTA.label} />
              </div>
            )}
            {/* ChoiceButtons — muncul selepas ajakan Langkah 6 (turning point) */}
            {choiceOptions && (
              <div className="pl-9">
                <ChoiceButtons options={choiceOptions} onSelect={(label) => sendMessage(label)} />
              </div>
            )}
          </div>
          )
        })}
        {isTyping && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm">🗝️</span>
            </div>
            <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#8a7a65] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-5 py-4 border-t border-[#1e2d40] flex-shrink-0">
        {isMsgLimitReached ? (
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-[#c9a96e]" />
              <p className="text-[#c9a96e] font-medium text-sm">Had 3 mesej percuma selesai</p>
            </div>
            <p className="text-[#8a7a65] text-xs leading-relaxed">
              Anda telah mencapai had 3 mesej percuma untuk Pintu Rezeki. Upgrade ke Pro untuk teruskan perbualan dan akses semua kategori.
            </p>
            <a href={`https://wa.me/60182119135?text=${encodeURIComponent(UPGRADE_MSG)}`} target="_blank" rel="noopener noreferrer"
              className="block w-full py-2.5 text-center rounded-xl bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium hover:bg-[#c9a96e25] transition-colors">
              Upgrade ke Pro
            </a>
          </div>
        ) : (
          <div className="flex gap-3 items-end">
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px` }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ceritakan situasi anda..." rows={1}
              className="flex-1 bg-[#0d1821] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-2xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
              style={{ maxHeight: '120px' }} />
            <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ backgroundColor: input.trim() && !isTyping ? '#c9a96e' : '#1e2d40' }}>
              {isTyping ? <Loader2 size={16} className="animate-spin" style={{ color: '#8a7a65' }} />
                : <Send size={16} style={{ color: input.trim() ? '#060d16' : '#8a7a65' }} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Amalan Tab ───────────────────────────────────────────────────────────────

function AmalanTab() {
  const [dayData, setDayData] = useState<DayData>(loadDay())
  const doneCount = Object.values(dayData.amalan).filter(Boolean).length
  const progress = (doneCount / AMALAN_LIST.length) * 100

  function toggleAmalan(id: string) {
    setDayData(prev => {
      const updated: DayData = { amalan: { ...prev.amalan, [id]: !prev.amalan[id] } }
      saveDay(updated)
      return updated
    })
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[#e8dcc8] text-sm font-medium">Amalan Hari Ini</p>
          <p className="text-[#c9a96e] text-sm font-medium">{doneCount}/{AMALAN_LIST.length}</p>
        </div>
        <div className="h-2 bg-[#1e2d40] rounded-full overflow-hidden">
          <div className="h-full bg-[#c9a96e] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[#8a7a65] text-xs text-center">
          {doneCount === 0 ? 'Mulakan amalan hari ini' : doneCount === AMALAN_LIST.length ? '✦ MasyaAllah — semua amalan selesai' : `${AMALAN_LIST.length - doneCount} amalan lagi`}
        </p>
      </div>
      <div className="space-y-2">
        {AMALAN_LIST.map(amalan => {
          const done = dayData.amalan[amalan.id] ?? false
          return (
            <button key={amalan.id} onClick={() => toggleAmalan(amalan.id)}
              className={cn('w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left',
                done ? 'border-[#c9a96e30] bg-[#c9a96e08]' : 'border-[#1e2d40] bg-[#0d1821] hover:border-[#c9a96e20]')}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all"
                style={done ? { backgroundColor: amalan.color, borderColor: amalan.color } : { borderColor: '#1e2d40' }}>
                {done && <Check size={13} className="text-[#060d16]" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{amalan.icon}</span>
                  <p className={cn('text-sm font-medium', done ? 'text-[#8a7a65] line-through' : 'text-[#e8dcc8]')}>{amalan.label}</p>
                </div>
                <p className="text-[#8a7a65] text-xs mt-0.5 truncate">{amalan.sub}</p>
              </div>
              <div className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium"
                style={{ color: amalan.color, backgroundColor: amalan.color + '15' }}>{amalan.sifat}</div>
            </button>
          )
        })}
      </div>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 text-center space-y-2">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا</p>
        <p className="text-[#8a7a65] text-xs italic">"Allah tidak membebani seseorang melainkan sesuai kesanggupannya" — Al-Baqarah: 286</p>
      </div>
    </div>
  )
}

// ─── Rekod Tab ────────────────────────────────────────────────────────────────

function RekodTab({ isPro }: { isPro: boolean }) {
  if (!isPro) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
          <Lock size={24} className="text-[#c9a96e]" />
        </div>
        <div className="space-y-2">
          <p className="font-serif text-[#c9a96e] font-medium">Rekod & Analitik</p>
          <p className="text-[#8a7a65] text-sm leading-relaxed">
            Jejak perjalanan audit 90 hari, streak, dan semua infak yang telah dilakukan.
          </p>
        </div>
        <div className="bg-[#060d16] border border-[#c9a96e20] rounded-2xl p-4 space-y-2">
          <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
            لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا
          </p>
          <p className="text-[#8a7a65] text-xs italic">"Allah tidak membebani melainkan sesuai kesanggupan" — Al-Baqarah: 286</p>
        </div>
        <a
          href={`https://wa.me/60182119135?text=${encodeURIComponent('Saya ingin upgrade ke Pro untuk akses Rekod & Analitik Pintu Rezeki.')}`}
          target="_blank" rel="noopener noreferrer"
          className="w-full py-3.5 rounded-2xl text-sm font-medium bg-[#c9a96e20] border border-[#c9a96e50] text-[#c9a96e] hover:bg-[#c9a96e30] transition-colors text-center block"
        >
          ✦ Buka Rekod Penuh — Pro
        </a>
      </div>
    )
  }

  const auditData = loadAuditData()
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const data = loadDay(date)
    return {
      label: format(date, 'dd/MM'),
      isToday: i === 6,
      amalanDone: Object.values(data.amalan).filter(Boolean).length,
      hasActivity: Object.values(data.amalan).some(Boolean),
    }
  })

  let streak = 0
  for (let i = 6; i >= 0; i--) {
    if (weekData[i].hasActivity) streak++
    else break
  }

  const auditedSifat = SIFAT_MAANI.filter(s => auditData[s.id]?.sedar)
  const fullyDone = SIFAT_MAANI.filter(s => auditData[s.id]?.sedar && auditData[s.id]?.jaga && auditData[s.id]?.kembalikan)
  const totalAmalan = weekData.reduce((sum, d) => sum + d.amalanDone, 0)

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: streak, label: 'Hari Berturut' },
          { value: auditedSifat.length, label: 'Sifat Diaudit' },
          { value: totalAmalan, label: 'Amalan 7 Hari' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-3.5 text-center">
            <p className="text-[#c9a96e] text-2xl font-bold">{s.value}</p>
            <p className="text-[#8a7a65] text-[10px] mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-[#e8dcc8] text-sm font-medium">Amalan 7 Hari</p>
        <div className="flex items-end gap-1.5 h-20">
          {weekData.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
              <div className="w-full flex-1 flex items-end">
                <div className="w-full rounded-t transition-all duration-500"
                  style={{ height: `${Math.max((day.amalanDone / 7) * 100, day.hasActivity ? 6 : 0)}%`, minHeight: day.hasActivity ? '3px' : '0', backgroundColor: day.isToday ? '#c9a96e' : day.hasActivity ? '#c9a96e45' : '#1e2d40' }} />
              </div>
              <p className="text-[9px]" style={{ color: day.isToday ? '#c9a96e' : '#8a7a65' }}>{day.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-[#e8dcc8] text-sm font-medium">Status Audit</p>
        <div className="space-y-2">
          {SIFAT_MAANI.map(sifat => {
            const rec = auditData[sifat.id]
            const phases = [rec?.sedar ? 1 : 0, rec?.jaga ? 1 : 0, rec?.kembalikan ? 1 : 0]
            const done = phases.reduce((a, b) => a + b, 0)
            return (
              <div key={sifat.id} className="flex items-center gap-3">
                <p className="text-xs w-16 flex-shrink-0" style={{ color: sifat.color }}>{sifat.name}</p>
                <div className="flex-1 h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(done / 3) * 100}%`, backgroundColor: sifat.color }} />
                </div>
                <p className="text-[#8a7a65] text-xs w-8 text-right">{done}/3</p>
              </div>
            )
          })}
        </div>
      </div>

      {fullyDone.length > 0 && (
        <div className="bg-[#060d16] border border-[#c9a96e20] rounded-2xl p-4 text-center space-y-2">
          <p className="text-[#c9a96e] text-xs">Sejak bergabung, anda telah mengaudit</p>
          <p className="text-[#c9a96e] text-2xl font-bold">{fullyDone.length}</p>
          <p className="text-[#8a7a65] text-xs">amanah Allah secara penuh</p>
        </div>
      )}

      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 text-center space-y-3">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا</p>
        <p className="text-[#8a7a65] text-xs italic">"Allah tidak membebani seseorang melainkan sesuai kesanggupannya" — Al-Baqarah: 286</p>
        <p className="text-[#e8dcc8] text-sm leading-relaxed">Rezeki anda sudah diukur dengan tepat oleh Allah. Tugas anda — mengenal-Nya melalui setiap perjalanan rezeki.</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'pintu', label: '🗝️ Pintu' },
  { id: 'audit', label: '📋 Audit' },
  { id: 'amalan', label: '📿 Amalan' },
  { id: 'rekod', label: '📊 Rekod' },
]

export default function PintuRezekiPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isPro = user?.tier === 'pro' || user?.tier === 'family'
  const [subTab, setSubTab] = useState<SubTab>('pintu')

  return (
    <div className="flex flex-col max-w-2xl mx-auto h-[calc(100vh-80px)] md:h-screen overflow-hidden">
      <div className="px-5 md:px-8 py-4 border-b border-[#1e2d40] flex-shrink-0 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
          <span className="text-lg">🗝️</span>
        </div>
        <div>
          <p className="font-serif text-[#c9a96e] font-medium">{t('pintu_rezeki.tajuk')}</p>
          <p className="text-[#8a7a65] text-xs">{t('pintu_rezeki.sub')}</p>
        </div>
        {isPro && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#c9a96e20] text-[#c9a96e] border border-[#c9a96e30]">✦ Pro</span>}
      </div>

      <div className="flex border-b border-[#1e2d40] flex-shrink-0">
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)}
            className={cn('flex-1 py-2.5 text-xs font-medium transition-all',
              subTab === tab.id ? 'text-[#c9a96e] border-b-2 border-[#c9a96e]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'pintu' && <PintuTab />}
      {subTab === 'audit' && <AuditTab isPro={isPro} />}
      {subTab === 'amalan' && <AmalanTab />}
      {subTab === 'rekod' && <RekodTab isPro={isPro} />}
    </div>
  )
}
