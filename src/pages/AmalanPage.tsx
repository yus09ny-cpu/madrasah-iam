import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2, ChevronDown, ChevronUp, Flame, Volume2, VolumeX, Settings, RotateCcw, X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import ZikirKhafiPlayer, { type KhafiSessionResult } from '@/components/zikir/ZikirKhafiPlayer'
import KhafiHistoryPanel from '@/components/zikir/KhafiHistoryPanel'
import KhatamanDzikirTQN from '@/components/zikir/KhatamanDzikirTQN'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { sendIAMMessage } from '@/lib/iam-chat'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AmalanItem {
  id: string
  jenis: string
  urutan: number
  tajuk?: string
  arab?: string
  rumi?: string
  terjemahan?: string
  ulangan?: number
  catatan?: string
  aktif?: boolean
}

type SessionPhase = 'dashboard' | 1 | 2 | 3 | 'done' | 'khafi'
type AmalanTab = 'zikir' | 'khataman' | 'manakiban' | 'inabah' | 'ziarah'

const AMALAN_TABS: { id: AmalanTab; label: string; arabic: string; soon?: boolean }[] = [
  { id: 'zikir',     label: 'Zikir',     arabic: 'الذِّكْر'     },
  { id: 'khataman',  label: 'Khataman',  arabic: 'الخَتْم'  },
  { id: 'manakiban', label: 'Manakiban', arabic: 'المَنَاقِب', soon: true },
  { id: 'inabah',    label: 'Inabah',    arabic: 'الإِنَابَة', soon: true },
  { id: 'ziarah',    label: 'Ziarah',    arabic: 'الزِّيَارَة', soon: true },
]

// ─── Constants ─────────────────────────────────────────────────────────────────


const AYAT_LIST = [
  { arab: 'وَلَذِكْرُ اللَّهِ أَكْبَرُ', trKey: 'amalan.ayat_ankabut_trans', src: 'Al-Ankabut: 45' },
  { arab: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', trKey: 'amalan.ayat_rad_trans', src: "Ar-Ra'd: 28" },
  { arab: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي', trKey: 'amalan.ayat_baqarah_trans', src: 'Al-Baqarah: 152' },
]

const REFLEKSI_KHAFI_SYSTEM_PROMPT = `Anda adalah pembimbing rohani Thariqah Qadiriyah Naqsyabandiyah (TQN) yang membantu murid merefleksi pengalaman Zikir Khafi mereka.

Murid baru selesai sesi Zikir Khafi (zikir hati — "Allah" dalam qalbu). Mereka menjawab soalan refleksi mengenai kualiti fokus semasa berzikir.

ARAHAN RESPONS:
1. Mulakan dengan mengakui secara empatik apa yang mereka kongsi
2. Jelaskan bahawa gangguan atau kurang fokus dalam Zikir Khafi sering berhubung kait dengan ketidakistiqamahan dalam Zikir Jahar — kerana Zikir Jahar (La ilaha illallah berlafaz) berfungsi sebagai perisai dan pembersih hati daripada was-was luar
3. Sebut: Allah berfirman dalam Surah Al-A'raf: 17 bahawa syaitan berjanji memasuki hati manusia dari segala penjuru — dan Zikir Jahar yang istiqamah adalah benteng pertama yang menghalang kemasukan ini
4. Hubungkan: apabila benteng Jahar tidak kukuh, was-was lebih mudah mengganggu sewaktu Zikir Khafi yang lebih dalam. Ini bukan kelemahan, tapi tanda perlu memperkukuh asas
5. Akhiri dengan SATU soalan balik: "Bagaimana amalan Zikir Jahar anda hari-hari ini? Sejauh mana anda mengamalkannya dengan istiqamah dan penuh penghayatan?"

PENTING:
- Hanya guna dalil yang disahkan: Quran, hadith sahih (Bukhari/Muslim/Ahmad/dll), atau Miftahus Shudur (Abah Anom)
- JANGAN nisbahkan kata-kata kepada seseorang secara samar atau tidak pasti
- Bahasa Melayu Malaysia yang halus — LARANG kata Indonesia: butuh, gimana, banget, nggak, udah, dong, kayak, karena, bisa, besok, setelah, terjadi, dirasakan, agar, pelan-pelan, langsung, lewat, meskipun, selalu, bahwa
- GUNA: perlukan, bagaimana, sangat, tidak, sudah, sahaja, kerana, boleh, bila, esok, selepas, berlaku, dirasai, supaya, perlahan-lahan, terus, melalui, walaupun, sentiasa, bahawa
- Format prosa, 2-3 perenggan pendek. Maksimum 150 patah perkataan`

// ─── Phase Progress Bar ────────────────────────────────────────────────────────

function PhaseBar({ phase }: { phase: SessionPhase }) {
  const { t } = useTranslation()
  const steps = [
    { id: 1, labelKey: 'amalan.fasa_bacaan', color: '#c9a96e' },
    { id: 2, labelKey: 'amalan.fasa_jahar',  color: '#60a5fa' },
    { id: 3, labelKey: 'amalan.fasa_doa',    color: '#c9a96e' },
  ]
  const n = phase === 'done' || phase === 'khafi' ? 4 : typeof phase === 'number' ? phase : 0

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                backgroundColor: n > s.id ? s.color + '40' : n === s.id ? s.color + '30' : '#1e2d40',
                border: `2px solid ${n >= s.id ? s.color : '#1e2d40'}`,
                color: n >= s.id ? s.color : '#8a7a65',
              }}>
              {n > s.id ? '✓' : s.id}
            </div>
            <p className="text-[8px]" style={{ color: n >= s.id ? s.color : '#8a7a65' }}>{t(s.labelKey as any)}</p>
          </div>
          {i < 2 && <div className="w-5 h-px mb-3" style={{ backgroundColor: n > s.id ? '#c9a96e40' : '#1e2d40' }} />}
        </div>
      ))}
    </div>
  )
}

// ─── Bacaan Card ───────────────────────────────────────────────────────────────

function BacaanCard({ item, accent = '#c9a96e' }: { item: AmalanItem; accent?: string }) {
  const { t } = useTranslation()
  return (
    <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
      {item.tajuk && (
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: accent }}>{item.tajuk}</p>
      )}
      {item.arab && (
        <p className="text-right leading-loose" dir="rtl"
          style={{ color: accent, fontFamily: '"Lora", serif', fontSize: 20, lineHeight: 2.2 }}>
          {item.arab}
        </p>
      )}
      {item.rumi && <p className="text-[#8a7a65] text-xs italic">{item.rumi}</p>}
      {item.terjemahan && <p className="text-[#e8dcc8] text-xs leading-relaxed">{item.terjemahan}</p>}
      {item.ulangan && item.ulangan > 1 && (
        <p className="text-xs" style={{ color: accent + 'cc' }}>{t('amalan.ulangan_label', { count: item.ulangan })}</p>
      )}
    </div>
  )
}

// ─── Fasa 1 — Bacaan Pembuka ───────────────────────────────────────────────────

function Fasa1({ items, onDone }: { items: AmalanItem[]; onDone: () => void }) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-serif text-[#c9a96e] text-xl">{t('amalan.fasa1_tajuk')}</p>
        <p className="text-[#8a7a65] text-sm mt-0.5">{t('amalan.fasa1_sub')}</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 text-center space-y-2">
          <p className="text-[#8a7a65] text-sm">{t('amalan.fasa1_empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => <BacaanCard key={item.id} item={item} />)}
        </div>
      )}

      <button onClick={() => setConfirmed(v => !v)}
        className="w-full flex items-center gap-3 p-4 bg-[#0d1821] border border-[#1e2d40] rounded-xl hover:border-[#c9a96e30] transition-colors">
        <div className={cn('w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all',
          confirmed ? 'border-[#c9a96e] bg-[#c9a96e]' : 'border-[#2a3d55]')}>
          {confirmed && <CheckCircle2 size={12} className="text-[#060d16]" />}
        </div>
        <span className="text-sm text-[#e8dcc8]">{t('amalan.fasa1_confirmed')}</span>
      </button>

      <button onClick={onDone} disabled={!confirmed}
        className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {t('amalan.fasa1_btn')}
      </button>
    </div>
  )
}

// ─── Fasa 2 — Zikir Jahar ─────────────────────────────────────────────────────

const TARGETS_CONFIG = [
  { value: 165, label: '165x' },
  { value: 200, label: '200x' },
  { value: 300, label: '300x' },
  { value: 500, label: '500x' },
  { value: Infinity, label: '∞' },
]

function loadJaharTarget(): number {
  const raw = localStorage.getItem('amalan_jahar_target')
  if (raw === 'Infinity') return Infinity
  const n = parseInt(raw ?? '165')
  return isNaN(n) ? 165 : n
}

function Fasa2({ item, onDone }: { item: AmalanItem | null; onDone: (count: number, target: number) => void }) {
  const { t } = useTranslation()
  const [target, setTarget] = useState(loadJaharTarget)
  const [count, setCount] = useState(0)
  const [flash, setFlash] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [audioOn, setAudioOn] = useState(false)
  const [audioAvail, setAudioAvail] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const videoFetchedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastTapRef = useRef<number>(0)

  const isInfinity = target === Infinity
  const isDone = !isInfinity && count >= target
  const progress = isInfinity ? 0 : Math.min((count / target) * 100, 100)
  const RING_R = 100
  const C = 2 * Math.PI * RING_R

  useEffect(() => {
    supabase.storage.from('madrasah-audio').createSignedUrl('zikir-jahar/pemula.mp3', 3600)
      .then(({ data }) => {
        if (data?.signedUrl) {
          audioRef.current = new Audio(data.signedUrl)
          audioRef.current.loop = true
          setAudioAvail(true)
        }
      }).catch(() => {})
  }, [])

  // Technique orientation video — one-time watch, not looped/background
  // like the chant audio above, so it's fetched lazily the first time the
  // Movement Guide panel is opened rather than eagerly on mount.
  useEffect(() => {
    if (!showGuide || videoFetchedRef.current) return
    videoFetchedRef.current = true
    supabase.storage.from('madrasah-audio').createSignedUrl('zikir-jahar/pemula.mp4', 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setVideoUrl(data.signedUrl)
      }).catch(() => {})
  }, [showGuide])

  useEffect(() => {
    if (!audioRef.current) return
    if (audioOn && !isDone) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }, [audioOn, isDone])

  useEffect(() => {
    localStorage.setItem('amalan_jahar_count', String(count))
  }, [count])

  const handleTap = useCallback(() => {
    if (isDone) return
    const now = Date.now()
    if (now - lastTapRef.current < 300) return
    lastTapRef.current = now
    setCount(c => c + 1)
    setFlash(true)
    setTimeout(() => setFlash(false), 90)
    if ('vibrate' in navigator) navigator.vibrate(50)
  }, [isDone])

  function changeTarget(val: number) {
    setTarget(val)
    setCount(0)
    localStorage.setItem('amalan_jahar_target', String(val))
  }

  function handleReset() {
    setCount(0)
    localStorage.removeItem('amalan_jahar_count')
  }

  // ── Done screen ────────────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="space-y-4 text-center bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-6">
        <p className="font-serif text-[#60a5fa] text-2xl">Alhamdulillah ✦</p>
        <p className="text-[#8a7a65] text-sm">{t('amalan.fasa2_kali_selesai', { count })}</p>
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
          سَيِّدُنَا مُحَمَّدٌ رَّسُوْلُ اللّٰهِ
        </p>
        <button onClick={() => onDone(count, target)}
          className="w-full py-4 bg-[#60a5fa] text-[#060d16] font-semibold rounded-2xl hover:opacity-90 transition-opacity">
          {t('amalan.fasa2_btn')}
        </button>
      </div>
    )
  }

  // ── Active counter screen ──────────────────────────────────────────
  return (
    <div className="relative flex flex-col" style={{ minHeight: 'calc(100dvh - 260px)' }}>

      {/* Row: Arabic text + Settings icon */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 text-center">
          <p className="font-serif text-[#60a5fa] leading-loose" style={{ fontSize: 26 }} dir="rtl">
            {item?.arab ?? 'لَا إِلَٰهَ إِلَّا اللَّهُ'}
          </p>
          <p className="text-[#8a7a65] text-xs italic">La ilaha illallah</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="mt-1 w-9 h-9 rounded-xl border border-[#1e2d40] flex items-center justify-center text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors flex-shrink-0"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Progress bar (hidden in ∞ mode) */}
      {!isInfinity ? (
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-[#8a7a65]">{t('amalan.progress_hari_ini')}</span>
            <span className="font-medium text-[#60a5fa]">{count} / {target}</span>
          </div>
          <div className="h-2 bg-[#1e2d40] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#60a5fa] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-center text-[#60a5fa30] text-xs mb-4 tracking-widest">{t('amalan.tanpa_had')}</p>
      )}

      {/* Big tap area — full remaining height */}
      <button
        onClick={handleTap}
        className="flex-1 flex flex-col items-center justify-center select-none relative"
        style={{ minHeight: 260 }}
        aria-label="Tap to zikir"
      >
        {/* Pulse ring on flash */}
        {flash && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full border-2 border-[#60a5fa30] animate-ping" style={{ animationDuration: '0.5s' }} />
          </div>
        )}

        {/* Circle counter */}
        <div className={cn('relative transition-transform duration-75', flash ? 'scale-[0.93]' : 'scale-100')}>
          <svg className="-rotate-90" width="230" height="230" viewBox="0 0 230 230">
            {/* Background ring */}
            <circle cx="115" cy="115" r={RING_R} strokeWidth="8" stroke="#1e2d40" fill="none" />
            {/* Progress ring */}
            {!isInfinity ? (
              <circle cx="115" cy="115" r={RING_R} strokeWidth="8" fill="none"
                stroke={flash ? '#93c5fd' : '#60a5fa'}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress / 100)}
                className="transition-all duration-300"
              />
            ) : (
              <circle cx="115" cy="115" r={RING_R} strokeWidth="3" fill="none"
                stroke={flash ? '#93c5fd' : '#60a5fa40'}
                strokeDasharray="10 14"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn('font-bold font-serif leading-none transition-colors',
                flash ? 'text-[#93c5fd]' : 'text-[#e8dcc8]')}
              style={{ fontSize: 80 }}
            >
              {count}
            </span>
            {!flash && (
              <span className="text-[#60a5fa] text-xs tracking-widest uppercase mt-1">
                {t('zikir.ketuk')}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Bottom buttons */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <button onClick={handleReset} disabled={count === 0}
          className="flex items-center gap-2 px-5 py-2.5 border border-[#1e2d40] rounded-xl text-xs text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <RotateCcw size={13} />
          {t('zikir.set_semula')}
        </button>
        {isInfinity && count > 0 && (
          <button onClick={() => onDone(count, Infinity)}
            className="flex-1 py-2.5 bg-[#60a5fa15] border border-[#60a5fa40] text-[#60a5fa] text-sm font-medium rounded-xl hover:bg-[#60a5fa25] transition-colors">
            {t('amalan.selesai_jahar_btn')}
          </button>
        )}
      </div>

      {/* Settings bottom sheet */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div
            className="bg-[#0d1821] border-t border-x border-[#1e2d40] rounded-t-3xl w-full max-w-md p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-[#e8dcc8] font-medium text-sm">⚙️ {t('amalan.tetapan_jahar')}</p>
              <button onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Target picker */}
            <div className="space-y-2.5">
              <p className="text-[#8a7a65] text-xs uppercase tracking-wider">{t('amalan.bilangan_zikir')}</p>
              <div className="grid grid-cols-5 gap-2">
                {TARGETS_CONFIG.map(cfg => (
                  <button key={cfg.value} onClick={() => { changeTarget(cfg.value); setShowSettings(false) }}
                    className={cn('py-3 rounded-xl border text-sm font-medium transition-all',
                      target === cfg.value
                        ? 'border-[#60a5fa60] bg-[#60a5fa15] text-[#60a5fa]'
                        : 'border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8]')}>
                    {cfg.label}
                  </button>
                ))}
              </div>
              {isInfinity && (
                <p className="text-[#8a7a65] text-xs leading-relaxed">{t('amalan.tanpa_had_desc')}</p>
              )}
            </div>

            {/* Audio toggle */}
            <div className="flex items-center justify-between bg-[#060d16] border border-[#1e2d40] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                {audioOn ? <Volume2 size={14} className="text-[#60a5fa]" /> : <VolumeX size={14} className="text-[#8a7a65]" />}
                <p className="text-sm text-[#e8dcc8]">{t('amalan.audio_panduan')}</p>
              </div>
              {audioAvail ? (
                <button onClick={() => setAudioOn(v => !v)}
                  className={cn('w-11 h-6 rounded-full relative transition-all', audioOn ? 'bg-[#60a5fa]' : 'bg-[#1e2d40]')}>
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', audioOn ? 'left-[22px]' : 'left-0.5')} />
                </button>
              ) : (
                <p className="text-[#8a7a65] text-xs">{t('amalan.belum_tersedia')}</p>
              )}
            </div>

            {/* Movement guide */}
            <div className="bg-[#060d16] border border-[#1e2d40] rounded-xl overflow-hidden">
              <button onClick={() => setShowGuide(v => !v)} className="w-full flex items-center justify-between px-4 py-3">
                <p className="text-[#8a7a65] text-xs">{t('amalan.panduan_gerakan')}</p>
                {showGuide ? <ChevronUp size={14} className="text-[#8a7a65]" /> : <ChevronDown size={14} className="text-[#8a7a65]" />}
              </button>
              {showGuide && (
                <div className="px-4 pb-4 space-y-3">
                  {videoUrl && (
                    <video
                      controls
                      className="w-full rounded-xl bg-black"
                      src={videoUrl}
                    />
                  )}
                  {[
                    { arab: 'لَا', gKey: 'amalan.gerakan_la' },
                    { arab: 'إِلَٰهَ', gKey: 'amalan.gerakan_ilaha' },
                    { arab: 'إِلَّا اللَّهُ', gKey: 'amalan.gerakan_illallah' },
                  ].map(({ arab, gKey }) => (
                    <div key={arab} className="bg-[#0d1821] rounded-xl p-3 space-y-1">
                      <p className="font-serif text-[#60a5fa] text-base text-right" dir="rtl">{arab}</p>
                      <p className="text-[#8a7a65] text-xs">{t(gKey as any)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Doa Zikir Jahar (hardcoded — teks ibadah, tidak dalam locale) ────────────

const DOA_ZIKIR_JAHAR = {
  pembukaan: 'Sayyidunā Muhammadur Rasūlullāhi ﷺ',
  arab: 'بِسْـمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ اَللّٰهُـمَّ صَلِّ عَلٰى سَيِّدِنَا مُحَمَّدٍ وَعَلٰى اٰلِ سَيِّدِنَا مُحَمَّدٍ صَلَاةً تُنْجِيْنَا بِـهَا مِنْ جَمِيْعِ الْأَهْوَالِ وَالْاٰفَاتِ وَتَـقْضٖى لَنَا بِـهَا جَمِيْعَ الْحَاجَاتِ وَتُطَهِّرُنَا بِـهَا مِنْ جَمِيْعِ السَّـيِّاٰتِ وَتَرْفَعُنَا بِـهَا عِنْدَكَ أَعْلَى الدَّرَجَاتِ وَتُبَلِّغُنَا بِـهَا أَقْصَى الْغَـايَاتِ مِنْ جَمِيْعِ الْخَيْرَاتِ فِى الْحَيَاةِ وَبَعْدَ الْمَمَاتِ إِنَّ الَّذِيْنَ يُبَايِعُوْنَكَ إِنَّمَا يُبَايِعُوْنَ اللّٰهَ يَدُ اللّٰهِ فَوْقَ أَيْدِيْهِمْ فَمَنْ نَكَثَ فَإِنَّمَا يَنْكُثُ عَلٰى نَفْسِهٖ ۖوَمَنْ أَوْفٰى بِمَا عَـاهَدَ عَلَيْهُ اللّٰهَ فَسَيُؤْتِيْهِ أَجْرًاعَظِيْمًا',
  rumi: 'Bismillāhir Rahmānir Rahīm. Allāhumma shalli \'alā sayyidinā Muhammadin wa \'alā āli sayyidinā Muhammad shalātan tunjīnā bihā min jamī\'il ahwali wal āfāt wataqdhī lanā bihā jamī\'al hājāt wa tuthahhiru nā bihā min jamī\'is sayyi-āt wa tar fa\'unā bihā \'indaka a\'lad darajāt wa tuballighunā bihā aqshal ghā yā ti min jamī\'il khayrāti filhayāti wa ba\'dal mamāt innalladzīna yubā yi \'ū naka innamā yubā yi \'ū nallāh yadullāhi fawqa aydīhim faman nakatsa fainnamā yangkutsu \'alā nafsih waman aw fā bimā \'ā hada \'alayhullāha fasayu\' tīhi ajran \'azhīmā',
  terjemahan: 'Dengan menyebut nama Allah yang Maha Pemurah lagi Maha Penyayang. Ya Allah, limpahkanlah rahmat kepada junjungan kami Nabi Muhammad dan kepada keluarganya, yang dengan rahmat itu Engkau akan menyelamatkan kami dari semua keadaan yang mendebarkan dan dari semua cobaan, yang dengan rahmat itu Engkau akan membersihkan kami dari semua keburukan dan kesalahan, yang dengan rahmat itu Engkau akan mengangkat kami kepada setinggi-tingginya derajat, yang dengan rahmat itu pula Engkau akan menyampaikan kepada kami semua maksud yang termulia dari semua kebaikan pada waktu hidup dan setelah mati. Bahawasanya orang-orang yang berjanji setia kepada kamu sesungguhnya mereka berjanji setia kepada Allah. Tangan Allah di atas tangan mereka, maka barang siapa yang melanggar janjinya nescaya akibat ia melanggar janji itu akan menimpa dirinya sendiri dan barang siapa menepati janjinya kepada Allah maka Allah akan memberinya pahala yang besar.',
  nota: '(boleh ditambah doa peribadi)',
}

// ─── Fasa 3 — Doa ─────────────────────────────────────────────────────────────

function Fasa3({ onDone }: { items?: AmalanItem[]; onDone: () => void }) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="font-serif text-[#c9a96e] text-xl">{t('amalan.fasa3_tajuk')}</p>
      </div>

      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.25)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🤲</span>
          <p className="text-[#c9a96e] text-sm font-medium">{t('amalan.fasa3_doa_penutup')}</p>
        </div>

        {/* Doa penuh — selalu papar versi ini */}
        <div className="space-y-4">
          <p className="text-[#c9a96e80] text-xs text-center italic leading-relaxed">
            {DOA_ZIKIR_JAHAR.pembukaan}
          </p>
          <p
            className="font-serif text-[#c9a96e] leading-[2.4] text-right"
            dir="rtl"
            style={{ fontSize: 17 }}
          >
            {DOA_ZIKIR_JAHAR.arab}
          </p>
          <p className="text-[#8a7a65] text-[11px] italic leading-relaxed">
            {DOA_ZIKIR_JAHAR.rumi}
          </p>
          <div className="border-t border-[#c9a96e15] pt-3">
            <p className="text-[#e8dcc8] text-xs leading-relaxed">
              {DOA_ZIKIR_JAHAR.terjemahan}
            </p>
          </div>
          <p className="text-[#c9a96e60] text-[11px] text-center italic">
            {DOA_ZIKIR_JAHAR.nota}
          </p>
        </div>
      </div>

      <button onClick={() => setConfirmed(v => !v)}
        className="w-full flex items-center gap-3 p-4 bg-[#0d1821] border border-[#1e2d40] rounded-xl hover:border-[#c9a96e30] transition-colors">
        <div className={cn('w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all',
          confirmed ? 'border-[#c9a96e] bg-[#c9a96e]' : 'border-[#2a3d55]')}>
          {confirmed && <CheckCircle2 size={12} className="text-[#060d16]" />}
        </div>
        <span className="text-sm text-[#e8dcc8]">{t('amalan.fasa3_confirmed')}</span>
      </button>

      <button onClick={onDone} disabled={!confirmed}
        className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {t('amalan.fasa3_btn')}
      </button>
    </div>
  )
}

// ─── Selesai Screen ────────────────────────────────────────────────────────────

function SelesaiScreen({ jaharCount, jaharTarget, khafiMins, onClose }: {
  jaharCount: number; jaharTarget: number; khafiMins: number; onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5"
      style={{ background: 'linear-gradient(180deg, #060d16, #0a1520)', borderRadius: 16, padding: 24 }}>
      <div className="text-center space-y-3">
        <div className="flex justify-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="text-[#c9a96e] text-xl animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>✦</span>
          ))}
        </div>
        <p className="font-serif text-[#c9a96e] text-3xl">Alhamdulillah</p>
      </div>

      <div className="text-center">
        <p className="font-serif text-[#c9a96e] text-xl leading-loose" dir="rtl">
          إِلَٰهِي أَنْتَ مَقْصُودِي
        </p>
        <p className="font-serif text-[#c9a96e] text-xl leading-loose" dir="rtl">
          وَرِضَاكَ مَطْلُوبِي
        </p>
        <p className="text-[#8a7a65] text-xs mt-2 italic">"{t('amalan.selesai_tujuanku')}"</p>
      </div>

      <div className="space-y-2">
        {[
          jaharCount > 0 && { label: t('amalan.label_bacaan_pembuka'), value: t('amalan.label_selesai_stat'), color: '#c9a96e' },
          jaharCount > 0 && { label: t('amalan.fasa2_sub'), value: `${jaharCount}x (target: ${jaharTarget})`, color: '#60a5fa' },
          jaharCount > 0 && { label: t('amalan.label_doa'), value: t('amalan.label_selesai_stat'), color: '#c9a96e' },
          { label: t('amalan.label_fatihah'), value: t('amalan.label_selesai_stat'), color: '#4ade80' },
          { label: t('amalan.label_zikir_khafi'), value: khafiMins > 0 ? t('amalan.label_minit', { count: khafiMins }) : t('amalan.label_selesai_stat'), color: '#a78bfa' },
        ].filter(Boolean).map(item => {
          const { label, value, color } = item as { label: string; value: string; color: string }
          return (
            <div key={label} className="flex items-center gap-3 bg-[#0d1821]/80 rounded-xl px-4 py-3">
              <CheckCircle2 size={16} style={{ color, flexShrink: 0 }} />
              <p className="text-[#e8dcc8] text-sm flex-1">{label}</p>
              <p className="text-sm font-medium" style={{ color }}>{value}</p>
            </div>
          )
        })}
      </div>

      <p className="text-[#8a7a65] text-sm text-center leading-relaxed">
        {t('amalan.selesai_doa')}<br />
        <span className="font-serif text-[#c9a96e] text-lg">Aamiin.</span>
      </p>

      <button onClick={onClose}
        className="w-full py-4 font-semibold rounded-2xl text-[#060d16] hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #c9a96e, #e2c89a)' }}>
        {t('amalan.selesai_btn')}
      </button>
    </div>
  )
}

// ─── Khafi Section (Iframe + Refleksi Interaktif AI) ──────────────────────────

const REFLEKSI_SOALAN = [
  {
    id: 'fokus',
    soalan: 'Bagaimana tahap fokus anda semasa berzikir tadi?',
    soalanKey: 'amalan.refleksi.fokus_soalan',
    pilihan: [
      { value: 'Sangat fokus — hati hadir sepenuhnya', key: 'amalan.refleksi.fokus_1' },
      { value: 'Agak fokus — kadang-kadang menumpang', key: 'amalan.refleksi.fokus_2' },
      { value: 'Kurang fokus — banyak fikiran lain', key: 'amalan.refleksi.fokus_3' },
      { value: 'Tidak fokus langsung', key: 'amalan.refleksi.fokus_4' },
    ],
  },
  {
    id: 'ganggu',
    soalan: 'Apa yang mengganggu fokus anda semasa berzikir?',
    soalanKey: 'amalan.refleksi.ganggu_soalan',
    pilihan: [
      { value: 'Fikiran tentang kerja / urusan dunia', key: 'amalan.refleksi.ganggu_1' },
      { value: 'Perasaan tidak tenang atau resah', key: 'amalan.refleksi.ganggu_2' },
      { value: 'Tidak tahu sebabnya', key: 'amalan.refleksi.ganggu_3' },
      { value: 'Tiada gangguan', key: 'amalan.refleksi.ganggu_4' },
    ],
  },
  {
    id: 'rasa',
    soalan: 'Bagaimana perasaan anda selepas selesai berzikir?',
    soalanKey: 'amalan.refleksi.rasa_soalan',
    pilihan: [
      { value: 'Tenang dan damai ✦', key: 'amalan.refleksi.rasa_1' },
      { value: 'Biasa sahaja', key: 'amalan.refleksi.rasa_2' },
      { value: 'Masih berasa berat / gelisah', key: 'amalan.refleksi.rasa_3' },
    ],
  },
]

function KhafiSection({ userTier, onBack, onComplete }: {
  userTier: string
  onBack: () => void
  onComplete: (khafiMins: number) => void
}) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [subPhase, setSubPhase] = useState<'pembuka' | 'berzikir' | 'refleksi' | 'ai_done'>('pembuka')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [pembukaan, setPembukaan] = useState<AmalanItem[]>([])
  const [pembConfirmed, setPembConfirmed] = useState(false)
  const [showPenutupModal, setShowPenutupModal] = useState(false)
  const sessionResultRef = useRef<KhafiSessionResult | null>(null)

  const allAnswered = REFLEKSI_SOALAN.every(s => answers[s.id])
  const tier = userTier === 'pro' || userTier === 'pro_plus' ? 'pro' : 'free'

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    fetch(
      `${supabaseUrl}/rest/v1/amalan_content?select=*&jenis=eq.zikir_khafi&order=urutan.asc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
      .then(r => r.ok ? r.json() : [])
      .then((data: AmalanItem[]) => {
        const active = (data ?? []).filter(d => d.aktif !== false)
        setPembukaan(active)
      })
      .catch(() => {})
  }, [])

  function goToBerzikir() {
    setSubPhase('berzikir')
  }

  async function handlePlayerDone(result: KhafiSessionResult): Promise<void> {
    sessionResultRef.current = result
    try {
      if (user) {
        const today = format(new Date(), 'yyyy-MM-dd')
        const khafiMins = result.actualSec ? Math.max(1, Math.round(result.actualSec / 60)) : 1
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any

        // Biometric data — silently ignore if table belum wujud. Supabase's
        // query builder is a thenable, not a real Promise, until awaited —
        // chaining .catch() on it directly throws "not a function" instead
        // of catching anything, so this must be a real try/await/catch.
        try {
          await db.from('zikir_khafi_sessions').insert({
            user_id: user.id, session_date: today,
            duration_min: result.durationMin, actual_sec: result.actualSec,
            pre_bpm: result.preBpm, final_bpm: result.finalBpm, avg_bpm: result.avgBpm,
            beat_count: result.beatCount, coherence: result.coherence, consistency: result.consistency,
            session_mode: result.sessionMode, dominant_tier: result.dominantTier, deepest_tier: result.deepestTier,
          })
        } catch { /* table/columns belum wujud — jangan halang amalan_sessions di bawah */ }

        // INSERT khafi_minit — kalau row dah ada (conflict), fallback ke UPDATE
        const { error: insertErr } = await db.from('amalan_sessions').insert({
          user_id: user.id, session_date: today,
          khafi_minit: khafiMins, khafi_selesai: true, sesi_lengkap: true,
        })
        if (insertErr) {
          await db.from('amalan_sessions')
            .update({ khafi_minit: khafiMins, khafi_selesai: true, sesi_lengkap: true })
            .eq('user_id', user.id)
            .eq('session_date', today)
        }
      }
    } catch { /* swallow — modal tetap perlu muncul */ }
    finally {
      setShowPenutupModal(true)
    }
  }

  function goFromBerzikir() {
    setSubPhase('refleksi')
  }

  async function handleSubmitRefleksi() {
    if (!allAnswered || loading) return
    setLoading(true)
    try {
      const userMessage = REFLEKSI_SOALAN
        .map(s => `${s.soalan}\nJawapan: ${answers[s.id]}`)
        .join('\n\n')
      const reply = await sendIAMMessage(
        [{ role: 'user', content: userMessage }],
        tier,
        REFLEKSI_KHAFI_SYSTEM_PROMPT,
        undefined,
        'refleksi_khafi',
      )
      setAiReply(reply)
      setSubPhase('ai_done')
    } catch {
      setAiReply(t('umum.ralat'))
      setSubPhase('ai_done')
    } finally {
      setLoading(false)
    }
  }

  function handleSelesai() {
    const actualSec = sessionResultRef.current?.actualSec
    const khafiMins = actualSec ? Math.max(1, Math.round(actualSec / 60)) : 1
    onComplete(khafiMins)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
          &larr; {t('umum.kembali')}
        </button>
        <p className="font-serif text-[#a78bfa] text-sm">Zikir Khafi</p>
        <div className="w-16" />
      </div>

      {/* Sub-phase: pembuka — Tawajjuh (Supabase jenis=zikir_khafi) */}
      {subPhase === 'pembuka' && (
        <div className="space-y-4">
          {pembukaan.length > 0 ? (
            <div className="space-y-3">
              {pembukaan.map(item => <BacaanCard key={item.id} item={item} accent="#a78bfa" />)}
            </div>
          ) : (
            <div className="bg-[#0d1821] border border-[#a78bfa20] rounded-2xl p-5 text-center space-y-2">
              <p className="font-serif text-[#a78bfa] text-base leading-loose" dir="rtl">أَفْضَلُ الذِّكْرِ مَا خَفِيَ</p>
              <p className="text-[#8a7a65] text-xs italic">"Sebaik-baik zikir ialah yang tersembunyi"</p>
            </div>
          )}

          <button onClick={() => setPembConfirmed(v => !v)}
            className="w-full flex items-center gap-3 p-4 bg-[#0d1821] border border-[#1e2d40] rounded-xl hover:border-[#a78bfa30] transition-colors">
            <div className={cn('w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all',
              pembConfirmed ? 'border-[#a78bfa] bg-[#a78bfa]' : 'border-[#2a3d55]')}>
              {pembConfirmed && <CheckCircle2 size={12} className="text-[#060d16]" />}
            </div>
            <span className="text-sm text-[#e8dcc8]">{t('amalan.khafi_confirmed')}</span>
          </button>

          <button onClick={goToBerzikir} disabled={!pembConfirmed}
            className="w-full py-4 bg-[#a78bfa] text-[#060d16] font-semibold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
            {t('amalan.khafi_btn')}
          </button>
        </div>
      )}

      {/* ZikirKhafiPlayer — gantikan iframe */}
      {subPhase === 'berzikir' && (
        <ZikirKhafiPlayer
          onSessionDone={handlePlayerDone}
          onCancel={onBack}
        />
      )}

      {/* Modal Penutup — Sayyiduna Muhammad ﷺ */}
      {showPenutupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(6,13,22,0.92)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm space-y-6">
            <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-3xl p-8 text-center space-y-5">
              <p className="text-[#a78bfa] text-xs font-medium uppercase tracking-widest">{t('amalan.khafi_penutup')}</p>
              <p className="font-serif leading-loose text-[#c9a96e]"
                dir="rtl" style={{ fontSize: 32, lineHeight: 2 }}>
                سَيِّدُنَا مُحَمَّدٌ ﷺ
              </p>
              <p className="text-[#8a7a65] text-sm italic">Sayyidunā Muḥammad ﷺ</p>
            </div>
            <button
              onClick={() => { setShowPenutupModal(false); goFromBerzikir() }}
              className="w-full py-4 font-semibold rounded-2xl text-[#060d16] hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' }}>
              {t('amalan.khafi_teruskan')}
            </button>
          </div>
        </div>
      )}

      {/* Sub-phase: refleksi */}
      {subPhase === 'refleksi' && (
        <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-5 space-y-5">
          <div>
            <p className="text-[#a78bfa] font-serif text-base">{t('amalan.khafi_refleksi_tajuk')}</p>
            <p className="text-[#8a7a65] text-xs mt-1">{t('amalan.khafi_refleksi_sub')}</p>
          </div>

          {REFLEKSI_SOALAN.map(s => (
            <div key={s.id} className="space-y-2">
              <p className="text-[#e8dcc8] text-sm leading-relaxed">{t(s.soalanKey as any)}</p>
              <div className="space-y-1.5">
                {s.pilihan.map(p => (
                  <button key={p.value} onClick={() => setAnswers(prev => ({ ...prev, [s.id]: p.value }))}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all',
                      answers[s.id] === p.value
                        ? 'border-[#a78bfa] bg-[#a78bfa15] text-[#a78bfa]'
                        : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                    )}>
                    {t(p.key as any)}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button onClick={handleSubmitRefleksi} disabled={!allAnswered || loading}
            className="w-full py-3.5 bg-[#a78bfa] text-[#060d16] font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#060d16] border-t-transparent rounded-full animate-spin" />
                {t('amalan.khafi_menganalisis')}
              </>
            ) : t('amalan.khafi_hantar')}
          </button>
        </div>
      )}

      {/* Sub-phase: ai_done */}
      {subPhase === 'ai_done' && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-5 space-y-3">
            <p className="text-[#a78bfa] text-xs font-medium uppercase tracking-wider">{t('amalan.khafi_balas_tajuk')}</p>
            <p className="text-[#e8dcc8] text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{aiReply}</p>
          </div>
          <button
            onClick={handleSelesai}
            className="w-full py-4 font-semibold rounded-2xl text-[#060d16] hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' }}>
            {t('amalan.khafi_selesai_btn')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onStartJahar, onStartKhafi, user, userTier, onUpgrade, refreshKey }: {
  onStartJahar: () => void
  onStartKhafi: () => void
  user: { id: string } | null
  userTier: string
  onUpgrade: () => void
  refreshKey: number
}) {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ todayDone: false, streak: 0, totalJahar: 0, totalKhafiMins: 0 })
  const ayatIdx = new Date().getDate() % AYAT_LIST.length
  const ayat = AYAT_LIST[ayatIdx]


  useEffect(() => {
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Promise.resolve((supabase.from('amalan_sessions') as any)
        .select('session_date, jahar_kiraan, sesi_lengkap')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(365)
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Promise.resolve((supabase.from('zikir_khafi_sessions') as any)
        .select('session_date, duration_min')
        .eq('user_id', user.id)
      ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(([{ data }, { data: khafiData }]: [{ data: any[] | null }, { data: any[] | null }]) => {
      if (!data) return
      const kd: any[] = khafiData ?? []
      // todayDone: check amalan_sessions OR zikir_khafi_sessions for today (duration_min > 0)
      const todayDone = data.some((d: any) => d.session_date === today && d.sesi_lengkap)
        || kd.some((d: any) => d.session_date === today && (d.duration_min ?? 0) > 0)
      const totalJahar = data.reduce((s: number, d: any) => s + (d.jahar_kiraan ?? 0), 0)
      // all-time total, exclude duration_min=0 (infinity sessions)
      const totalKhafiMins = kd.filter((d: any) => (d.duration_min ?? 0) > 0).reduce((s: number, d: any) => s + d.duration_min, 0)

      // Streak
      const dates = [...new Set(data.map((d: any) => d.session_date as string))].sort((a, b) => a > b ? -1 : 1)
      let streak = 0
      for (let i = 0; i < dates.length; i++) {
        const expected = format(subDays(new Date(), i), 'yyyy-MM-dd')
        if (dates[i] === expected) streak++
        else break
      }
      setStats({ todayDone, streak, totalJahar, totalKhafiMins })
    }).catch(() => {})
  }, [user?.id, refreshKey])

  return (
    <div className="space-y-5">
      {/* Ayat */}
      <div className="bg-[#0d1821] border border-[#c9a96e15] rounded-2xl p-5 text-center space-y-2">
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">{ayat.arab}</p>
        <p className="text-[#8a7a65] text-xs italic">{t(ayat.trKey as any)}</p>
        <p className="text-[#c9a96e60] text-xs">— {ayat.src}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: stats.todayDone ? '✓' : '○',
            label: t('amalan.dashboard_sesi'),
            value: stats.todayDone ? t('amalan.dashboard_selesai') : t('amalan.dashboard_belum'),
            color: stats.todayDone ? 'text-emerald-400' : 'text-[#8a7a65]',
          },
          {
            icon: <Flame size={16} className="text-[#c9a96e]" />,
            label: t('amalan.dashboard_streak'),
            value: t('amalan.dashboard_hari', { count: stats.streak }),
            color: 'text-[#c9a96e]',
          },
          {
            icon: '✦',
            label: t('amalan.dashboard_jumlah_jahar'),
            value: stats.totalJahar.toLocaleString(),
            color: 'text-[#60a5fa]',
          },
          {
            icon: '💜',
            label: t('amalan.dashboard_jumlah_khafi'),
            value: stats.totalKhafiMins >= 60
              ? t('amalan.dashboard_jam_min', { jam: Math.floor(stats.totalKhafiMins / 60), min: stats.totalKhafiMins % 60 })
              : t('amalan.dashboard_min', { count: stats.totalKhafiMins }),
            color: 'text-[#a78bfa]',
          },
        ].map(({ icon, label, value, color }, i) => (
          <div key={i} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5">
              {typeof icon === 'string'
                ? <span className={cn('text-base', color)}>{icon}</span>
                : icon}
              <p className="text-[#8a7a65] text-xs">{label}</p>
            </div>
            <p className={cn('font-bold text-base font-serif', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Two independent entry cards */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider px-1">{t('amalan.pilih_amalan')}</p>
        <button onClick={onStartJahar}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-[#60a5fa30] bg-[#60a5fa08] hover:bg-[#60a5fa12] hover:border-[#60a5fa50] transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-[#60a5fa15] border border-[#60a5fa30] flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🔵</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#60a5fa] font-serif text-base font-medium">Zikir Jahar</p>
            <p className="text-[#8a7a65] text-xs mt-0.5">{t('amalan.jahar_sub')}</p>
            <p className="text-[#60a5fa60] text-xs mt-1">{t('amalan.jahar_jumlah', { count: stats.totalJahar.toLocaleString() })}</p>
          </div>
          <span className="text-[#60a5fa] text-lg">›</span>
        </button>
        <button onClick={onStartKhafi}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-[#a78bfa30] bg-[#a78bfa08] hover:bg-[#a78bfa12] hover:border-[#a78bfa50] transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-[#a78bfa15] border border-[#a78bfa30] flex items-center justify-center flex-shrink-0">
            <span className="text-xl">💜</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#a78bfa] font-serif text-base font-medium">Zikir Khafi</p>
            <p className="text-[#8a7a65] text-xs mt-0.5">{t('amalan.khafi_sub')}</p>
            <p className="text-[#a78bfa60] text-xs mt-1">
              {stats.totalKhafiMins >= 60
                ? t('amalan.dashboard_jam_min', { jam: Math.floor(stats.totalKhafiMins / 60), min: stats.totalKhafiMins % 60 })
                : t('amalan.dashboard_min', { count: stats.totalKhafiMins })} {t('amalan.dashboard_terkumpul')}
            </p>
          </div>
          <span className="text-[#a78bfa] text-lg">›</span>
        </button>
      </div>

      {/* Zikir Khafi history/trend — moved here from Pintu Rezeki's Rekod
          tab so it lives alongside the practice itself, not tucked away on
          the subscription page. */}
      {user && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#a78bfa] uppercase tracking-wider px-1">
            {t('amalan.khafi_player.riwayat_tajuk')}
          </p>
          <KhafiHistoryPanel
            userId={user.id}
            isPro={userTier === 'pro' || userTier === 'pro_plus'}
            onUpgrade={onUpgrade}
          />
        </div>
      )}
    </div>
  )
}

// ─── Khataman Tab ──────────────────────────────────────────────────────────────

function KhatamanTab() {
  const today = new Date().getDay() // 0=Sun,1=Mon,...,4=Thu
  const DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']
  const isRecommended = today === 1 || today === 4 // Mon or Thu

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 py-2">
        <p className="font-serif text-[#c9a96e] text-2xl leading-none" dir="rtl">الخَتْم</p>
        <h2 className="font-serif text-[#e8dcc8] text-lg">Khataman TQN</h2>
        <p className="text-[#8a7a65] text-xs">Makanan Roh — Soul Food</p>
      </div>

      {/* Hari ini indicator */}
      {isRecommended && (
        <div className="bg-[#c9a96e15] border border-[#c9a96e40] rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✦</span>
          <div>
            <p className="text-[#c9a96e] text-sm font-medium">Malam {DAYS[today]} — Malam Khataman</p>
            <p className="text-[#8a7a65] text-xs">Malam yang disyorkan untuk hadir khataman berjemaah</p>
          </div>
        </div>
      )}

      {/* Weekly tracker */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Jadual Minggu Ini</p>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day, i) => {
            const isToday = i === today
            const isRec = i === 1 || i === 4
            return (
              <div key={day} className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-xl border transition-all',
                isToday
                  ? 'border-[#c9a96e] bg-[#c9a96e15]'
                  : isRec
                  ? 'border-[#c9a96e30] bg-[#c9a96e08]'
                  : 'border-[#1e2d40]'
              )}>
                <p className={cn('text-[9px] font-medium', isToday ? 'text-[#c9a96e]' : isRec ? 'text-[#c9a96e80]' : 'text-[#8a7a65]')}>
                  {day.slice(0, 3)}
                </p>
                {isRec && <span className="text-[#c9a96e] text-[10px]">✦</span>}
              </div>
            )
          })}
        </div>
        <p className="text-[#8a7a65] text-xs text-center">✦ = Malam Khataman (Isnin & Khamis disyorkan)</p>
      </div>

      {/* Description */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <p className="text-[#c9a96e] text-sm font-medium">Apakah Khataman TQN?</p>
        <p className="text-[#8a7a65] text-sm leading-relaxed">
          Khataman adalah majlis zikir berjemaah dalam Thariqah Qadiriyah Naqsyabandiyah. Roh-roh para murid berkumpul bersama guru-guru silsilah untuk membaca wird khas — Al-Fatihah, Istigfar, Selawat, dan Zikir bersama.
        </p>
        <div className="space-y-1.5">
          {[
            'Al-Fatihah (hadiah kepada Nabi & silsilah)',
            'Istighfar (100×)',
            'Selawat Nabi (100×)',
            'Zikir Jahar berjemaah (165×+)',
            'Doa Penutup Khataman',
          ].map(item => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-[#c9a96e] text-xs mt-0.5">✦</span>
              <p className="text-[#8a7a65] text-xs">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Jadual Disyorkan</p>
        {[
          { hari: 'Malam Isnin', masa: 'Selepas Maghrib / Isyak', badge: 'Disyorkan' },
          { hari: 'Malam Khamis', masa: 'Selepas Maghrib / Isyak', badge: 'Disyorkan' },
        ].map(s => (
          <div key={s.hari} className="flex items-center justify-between py-2 border-b border-[#1e2d40] last:border-0">
            <div>
              <p className="text-[#e8dcc8] text-sm">{s.hari}</p>
              <p className="text-[#8a7a65] text-xs">{s.masa}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-lg border text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]">{s.badge}</span>
          </div>
        ))}
        <p className="text-[#8a7a65] text-xs pt-1">Minimum 2× seminggu. Boleh hadir setiap malam jika mampu.</p>
      </div>

      {/* Amalan Khataman — bacaan & zikir penuh */}
      <div className="space-y-2 pt-2">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider px-1">Amalan Khataman</p>
        <KhatamanDzikirTQN />
      </div>
    </div>
  )
}

// ─── Manakiban Tab ─────────────────────────────────────────────────────────────

function ManakibanTab() {
  const NEXT_11 = (() => {
    const now = new Date()
    const next = new Date(now)
    // Simple approximation: show as "sekali sebulan"
    next.setDate(11)
    if (next <= now) next.setMonth(next.getMonth() + 1)
    return next.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
  })()

  const MANAKIB_FASAL = [
    { num: '1', title: 'Nasab & Kelahiran', desc: 'Keturunan mulia & tanda-tanda kewalian dari kecil' },
    { num: '2', title: 'Pendidikan & Guru', desc: 'Perjalanan menuntut ilmu & silsilah keilmuan' },
    { num: '3', title: 'Karamah & Kelebihan', desc: 'Keistimewaan yang Allah kurniakan' },
    { num: '4', title: 'Ajaran & Wasiat', desc: 'Warisan ilmu & nasihat untuk umat' },
    { num: '5', title: 'Wafat & Makam', desc: 'Kepulangan ke rahmatullah & tempat berziarah' },
  ]

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 py-2">
        <p className="font-serif text-[#c9a96e] text-2xl leading-none" dir="rtl">المَنَاقِب</p>
        <h2 className="font-serif text-[#e8dcc8] text-lg">Manakiban</h2>
        <p className="text-[#8a7a65] text-xs">Manakib Syeikh Abdul Qadir Al-Jailani r.a.</p>
      </div>

      {/* Who */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-[#c9a96e] text-xl">ع</span>
          </div>
          <div>
            <p className="text-[#e8dcc8] font-medium text-sm">Syeikh Abdul Qadir Al-Jailani r.a.</p>
            <p className="text-[#8a7a65] text-xs">470H – 561H (1077M – 1166M)</p>
            <p className="text-[#c9a96e] text-xs">Al-Ghawts Al-A'zam · Muhyiddin</p>
          </div>
        </div>
        <p className="text-[#8a7a65] text-sm leading-relaxed">
          "Sultannya para wali" — pengasas Thariqah Qadiriyah. Penyambung silsilah TQN kepada Nabi Muhammad ﷺ melalui jalur kerohanian.
        </p>
      </div>

      {/* Fasal */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-1">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider mb-3">Fasal Manakib</p>
        {MANAKIB_FASAL.map(f => (
          <div key={f.num} className="flex items-start gap-3 py-2 border-b border-[#1e2d40] last:border-0">
            <span className="w-6 h-6 rounded-lg bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center text-[#c9a96e] text-xs font-bold flex-shrink-0">{f.num}</span>
            <div>
              <p className="text-[#e8dcc8] text-sm">{f.title}</p>
              <p className="text-[#8a7a65] text-xs">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Jadual</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#e8dcc8] text-sm">Sekali sebulan</p>
            <p className="text-[#8a7a65] text-xs">Biasanya pada 11 Rabiul Awwal atau awal bulan</p>
          </div>
          <span className="text-xs text-[#c9a96e] bg-[#c9a96e15] border border-[#c9a96e30] px-2 py-1 rounded-lg">~{NEXT_11}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 py-4 text-[#8a7a65]">
        <span className="text-xs">📖 Log kehadiran & bacaan Manakib</span>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1e2d40] border border-[#2a3d55]">Akan Datang</span>
      </div>
    </div>
  )
}

// ─── Inabah Tab ────────────────────────────────────────────────────────────────

function InabaTab() {
  const SCHEDULE = [
    { time: '02:00 – 03:30', amalan: 'Tahajjud', sub: 'Solat malam & munajat', color: '#a78bfa' },
    { time: '05:00 – 05:45', amalan: 'Subuh + Wirid', sub: 'Solat Subuh & wirid Subuh panjang', color: '#60a5fa' },
    { time: '06:00 – 07:00', amalan: 'Dhuha', sub: 'Solat Dhuha (4 rakaat)', color: '#fbbf24' },
    { time: '08:00 – 10:00', amalan: 'Mujahadah', sub: 'Tilawah Al-Quran & zikir pagi', color: '#c9a96e' },
    { time: '12:30 – 13:30', amalan: 'Zuhur + Zikir', sub: 'Solat Zuhur & zikir harian', color: '#c9a96e' },
    { time: '15:30 – 16:00', amalan: 'Asar', sub: 'Solat Asar & wirid ringkas', color: '#c9a96e' },
    { time: '18:15 – 19:00', amalan: 'Maghrib + Wirid', sub: 'Solat Maghrib & wirid Maghrib', color: '#f97316' },
    { time: '19:30 – 20:30', amalan: 'Isyak + Zikir Malam', sub: 'Solat Isyak & muhasabah malam', color: '#8b5cf6' },
    { time: '20:30 – 22:00', amalan: 'Khataman (Isnin/Khamis)', sub: 'Zikir berjemaah & doa', color: '#c9a96e' },
  ]

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 py-2">
        <p className="font-serif text-[#c9a96e] text-2xl leading-none" dir="rtl">الإِنَابَة</p>
        <h2 className="font-serif text-[#e8dcc8] text-lg">Program Inabah</h2>
        <p className="text-[#8a7a65] text-xs">Kembali kepada Allah melalui disiplin ibadah harian</p>
      </div>

      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-4 space-y-2">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Apakah Inabah?</p>
        <p className="text-[#8a7a65] text-sm leading-relaxed">
          Program pembersihan jiwa secara total — menggabungkan solat, zikir, mujahadah dan muhasabah dalam jadual harian yang disiplin. Inabah bermaksud "kembali sepenuhnya kepada Allah."
        </p>
        <p className="font-serif text-[#c9a96e] text-sm leading-loose text-center" dir="rtl">وَأَنِيبُوا إِلَىٰ رَبِّكُمْ</p>
        <p className="text-[#8a7a65] text-xs text-center italic">"Dan kembalilah kamu kepada Tuhanmu" — Az-Zumar: 54</p>
      </div>

      {/* Daily Schedule */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-1">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider mb-3">Jadual Harian Lengkap</p>
        {SCHEDULE.map(s => (
          <div key={s.time} className="flex items-start gap-3 py-2.5 border-b border-[#1e2d40] last:border-0">
            <p className="text-[#8a7a65] text-[10px] font-mono w-24 flex-shrink-0 mt-0.5">{s.time}</p>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: s.color }}>{s.amalan}</p>
              <p className="text-[#8a7a65] text-xs">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 py-4 text-[#8a7a65]">
        <span className="text-xs">📅 Pengesanan amalan harian & rekod Inabah</span>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1e2d40] border border-[#2a3d55]">Akan Datang</span>
      </div>
    </div>
  )
}

// ─── Ziarah Tab ────────────────────────────────────────────────────────────────

function ZiarahTab() {
  const WALI_LIST = [
    {
      name: 'Syeikh Abdul Qadir Al-Jailani r.a.',
      location: 'Baghdad, Iraq',
      title: 'Al-Ghawts Al-A\'zam · Pengasas Thariqah Qadiriyah',
      year: '470H – 561H',
    },
    {
      name: 'Syeikh Ahmad Khatib Sambas r.a.',
      location: 'Makkah Al-Mukarramah & Sambas, Kalimantan',
      title: 'Pengasas Thariqah Qadiriyah Naqsyabandiyah',
      year: '1217H – 1289H',
    },
    {
      name: 'Syeikh Tholhah Cirebon r.a.',
      location: 'Cirebon, Jawa Barat',
      title: 'Penyebar TQN di Tanah Jawa',
      year: 'Abad ke-19',
    },
    {
      name: 'Abah Abuya Sepuh r.a.',
      location: 'Suryalaya, Jawa Barat',
      title: 'Mursyid TQN Suryalaya · Pendiri Pondok Pesantren',
      year: '1836M – 1956M',
    },
    {
      name: 'Abah Anom r.a. (KH. A. Shohibul Wafa Tajul Arifin)',
      location: 'Suryalaya, Tasikmalaya, Jawa Barat',
      title: 'Mursyid TQN Suryalaya · Penyebar ke seluruh dunia',
      year: '1915M – 2011M',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1 py-2">
        <p className="font-serif text-[#c9a96e] text-2xl leading-none" dir="rtl">الزِّيَارَة</p>
        <h2 className="font-serif text-[#e8dcc8] text-lg">Ziarah Wali Allah</h2>
        <p className="text-[#8a7a65] text-xs">Mengingati perjalanan mereka membawa manusia kepada Allah</p>
      </div>

      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-4 space-y-2">
        <p className="text-[#8a7a65] text-sm leading-relaxed">
          Ziarah ke makam para wali bukan sekadar melawat — ia menghidupkan semangat, menyambung roh kepada silsilah, dan mengingatkan kita bahawa perjalanan rohani ini nyata dan berterusan.
        </p>
        <p className="font-serif text-[#c9a96e] text-sm leading-loose text-center" dir="rtl">وَكُنتُمْ أَمْوَاتًا فَأَحْيَاكُمْ</p>
        <p className="text-[#8a7a65] text-xs text-center italic">"Kamu dahulunya mati, lalu Dia menghidupkan kamu" — Al-Baqarah: 28</p>
      </div>

      {/* Wali list */}
      <div className="space-y-2">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider px-1">Silsilah Mursyid TQN</p>
        {WALI_LIST.map((w, i) => (
          <div key={i} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[#e8dcc8] text-sm font-medium leading-snug">{w.name}</p>
              <span className="text-[10px] text-[#8a7a65] flex-shrink-0 font-mono mt-0.5">{w.year}</span>
            </div>
            <p className="text-[#c9a96e] text-xs">{w.title}</p>
            <p className="text-[#8a7a65] text-xs flex items-center gap-1">
              <span>🕌</span> {w.location}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 py-4 text-[#8a7a65]">
        <span className="text-xs">🗺️ Log ziarah & panduan perjalanan</span>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1e2d40] border border-[#2a3d55]">Akan Datang</span>
      </div>
    </div>
  )
}

// ─── Main AmalanPage ───────────────────────────────────────────────────────────

export default function AmalanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isTalqin = user?.talqin_completed === true

  const [activeTab, setActiveTab] = useState<AmalanTab>('zikir')
  const [phase, setPhase] = useState<SessionPhase>('dashboard')
  const [dashRefreshKey, setDashRefreshKey] = useState(0)
  const [content, setContent] = useState<AmalanItem[]>([])
  const [contentLoaded, setContentLoaded] = useState(false)
  const [jaharCount, setJaharCount] = useState(0)
  const [jaharTarget, setJaharTarget] = useState(165)
  const [khafiMins, setKhafiMins] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)

        const res = await fetch(
          `${supabaseUrl}/rest/v1/amalan_content?select=*&order=jenis.asc,urutan.asc`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        )
        clearTimeout(timer)

        if (!res.ok) return

        const data: AmalanItem[] = await res.json()
        if (!cancelled && data?.length > 0) {
          setContent(data.filter(d => d.aktif !== false))
        }
      } catch {
        // silently fall back to hardcoded content
      } finally {
        if (!cancelled) setContentLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Content slices
  const bacaanPembuka = content.filter(d => d.jenis === 'zikir_jahar' && d.urutan <= 4)
  const zikirJaharItem = content.find(d => d.jenis === 'zikir_jahar' && d.urutan === 5) ?? null
  const doaItems = content.filter(d => d.jenis === 'zikir_jahar' && d.urutan >= 6)

  async function upsertSession(data: Record<string, unknown>) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const today = format(new Date(), 'yyyy-MM-dd')
    const payload = { user_id: user.id, session_date: today, ...data }
    const { error: insertErr } = await db.from('amalan_sessions').insert(payload)
    if (insertErr) {
      // Row already exists for today — update sahaja
      const { user_id, session_date, ...updates } = payload
      await db.from('amalan_sessions')
        .update(updates)
        .eq('user_id', user_id)
        .eq('session_date', session_date)
    }
  }

  function handleJaharDone(count: number, target: number) {
    setJaharCount(count); setJaharTarget(target)
    setPhase(3)
  }

  function handleDoaDone() {
    // Simpan Jahar segera — tidak tunggu Khafi selesai
    upsertSession({
      bacaan_pembuka: true,
      jahar_kiraan: jaharCount,
      jahar_target: jaharTarget,
      jahar_selesai: true,
      doa_selesai: true,
      sesi_lengkap: false,
    })
    setPhase('khafi')
  }

  function handleKhafiComplete(mins: number) {
    setKhafiMins(mins)
    // Upsert — kemaskini rekod hari yang sama (Jahar mungkin sudah tersimpan lebih awal)
    upsertSession({
      ...(jaharCount > 0 ? {
        bacaan_pembuka: true,
        jahar_kiraan: jaharCount, jahar_target: jaharTarget, jahar_selesai: true,
        doa_selesai: true,
      } : {}),
      fatihah_selesai: true, sesi_lengkap: true, khafi_minit: mins,
    })
    setPhase('done')
  }

  function resetSession() {
    setPhase('dashboard')
    setJaharCount(0); setJaharTarget(165); setKhafiMins(0)
    localStorage.removeItem('amalan_jahar_count')
    setDashRefreshKey(k => k + 1)
  }

  // ── Gate ───────────────────────────────────────────────────────────
  if (!isTalqin) {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
          <span className="font-serif text-[#c9a96e] text-2xl">✦</span>
        </div>
        <div>
          <p className="font-serif text-[#c9a96e] text-2xl">Amalan TQN</p>
          <p className="font-serif text-[#8a7a65] text-sm mt-1" dir="rtl">الطَّرِيقَة القادرية النقشبندية</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm space-y-3">
          <p className="text-[#e8dcc8] text-sm leading-relaxed">{t('amalan.gate_desc')}</p>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ</p>
            <p className="text-[#8a7a65] text-xs mt-1">"Bertanyalah kepada ahli dzikir" — An-Nahl: 43</p>
          </div>
        </div>
        <button onClick={() => navigate('/zikir')}
          className="w-full max-w-sm py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
          {t('amalan.gate_btn')}
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-8">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-3xl text-[#c9a96e] leading-none">الأَمَل</p>
          <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('amalan.tajuk')}</h1>
          <p className="text-[#8a7a65] text-xs">{t('amalan.sub')}</p>
        </div>
        {activeTab === 'zikir' && (phase === 1 || phase === 2 || phase === 3) && (
          <PhaseBar phase={phase} />
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {AMALAN_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-col items-center px-3 py-2 rounded-xl border transition-all whitespace-nowrap flex-shrink-0 min-w-[72px]',
              activeTab === tab.id
                ? 'bg-[#c9a96e20] border-[#c9a96e40] text-[#c9a96e]'
                : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
            )}
          >
            <span className="font-serif text-sm leading-tight" dir="rtl">{tab.arabic}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
            {tab.soon && activeTab !== tab.id && (
              <span className="text-[8px] text-[#8a7a65] mt-0.5">soon</span>
            )}
          </button>
        ))}
      </div>

      {/* Zikir tab — always mounted to preserve session state */}
      <div className={activeTab === 'zikir' ? '' : 'hidden'}>
        {!contentLoaded && phase !== 'dashboard' && (
          <div className="flex items-center gap-2 text-[#8a7a65] text-sm mb-4">
            <div className="w-4 h-4 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
            {t('amalan.memuatkan')}
          </div>
        )}


        {phase === 'dashboard' && (
          <Dashboard
            onStartJahar={() => setPhase(1)}
            onStartKhafi={() => setPhase('khafi')}
            user={user}
            userTier={(user as { tier?: string } | null)?.tier ?? 'free'}
            onUpgrade={() => navigate('/rezeki')}
            refreshKey={dashRefreshKey}
          />
        )}
        {phase === 1 && <Fasa1 items={bacaanPembuka} onDone={() => setPhase(2)} />}
        {phase === 2 && <Fasa2 item={zikirJaharItem} onDone={handleJaharDone} />}
        {phase === 3 && <Fasa3 items={doaItems} onDone={handleDoaDone} />}
        {phase === 'done' && (
          <SelesaiScreen jaharCount={jaharCount} jaharTarget={jaharTarget} khafiMins={khafiMins} onClose={resetSession} />
        )}
        {phase === 'khafi' && (
          <KhafiSection userTier={(user as { tier?: string } | null)?.tier ?? 'free'} onBack={resetSession} onComplete={handleKhafiComplete} />
        )}
      </div>

      {activeTab === 'khataman'  && <KhatamanTab />}
      {activeTab === 'manakiban' && <ManakibanTab />}
      {activeTab === 'inabah'    && <InabaTab />}
      {activeTab === 'ziarah'    && <ZiarahTab />}

    </div>
  )
}
