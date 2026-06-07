import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2, Circle, Lock, X, Loader2,
  RefreshCw, ChevronDown, ChevronUp, Bell, MapPin, TrendingUp, Moon,
} from 'lucide-react'
import DimensiSolat from '@/components/solat/DimensiSolat'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { useTodaySolat, useUpdateSolat } from '@/hooks/useSolat'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import {
  getPrayerStatus,
  formatCountdown,
  formatTimeUntil,
  requestNotificationPermission,
  type PrayerStatus,
} from '@/lib/prayerTimes'
import ProgressRing from '@/components/ui/ProgressRing'
import { cn } from '@/lib/utils'
import type { PrayerRecord } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRAYER_META: Record<string, { arabic: string; emoji: string; time: string }> = {
  Subuh:   { arabic: 'الصُّبْح',   emoji: '🌅', time: 'Sebelum matahari terbit' },
  Zohor:   { arabic: 'الظُّهْر',   emoji: '☀️', time: 'Tengah hari' },
  Asar:    { arabic: 'الْعَصْر',   emoji: '🌤️', time: 'Petang' },
  Maghrib: { arabic: 'الْمَغْرِب', emoji: '🌆', time: 'Selepas matahari terbenam' },
  Isyak:   { arabic: 'الْعِشَاء',  emoji: '🌙', time: 'Malam' },
}

const DEFAULT_PRAYERS: PrayerRecord[] = [
  { name: 'Subuh',   completed: false, on_time: false },
  { name: 'Zohor',   completed: false, on_time: false },
  { name: 'Asar',    completed: false, on_time: false },
  { name: 'Maghrib', completed: false, on_time: false },
  { name: 'Isyak',   completed: false, on_time: false },
]

const CHECKLIST_ITEMS = [
  'Bangun sebelum azan atau tepat pada waktunya',
  'Basuh muka dan segar semula',
  'Sempurnakan wuduk dengan tenang',
  'Hadirkan hati — solat ini dikira pahalanya',
  'Niat kerana Allah, bukan kerana kebiasaan',
]

const QUALITY_OPTIONS = [
  { value: 1, emoji: '😔', label: 'Lalai' },
  { value: 2, emoji: '😕', label: 'Kurang' },
  { value: 3, emoji: '😐', label: 'Sederhana' },
  { value: 4, emoji: '🙂', label: 'Khusyuk' },
  { value: 5, emoji: '😊', label: 'Sangat Khusyuk' },
]

const AYATUL_KURSI = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ'
const DOA_SOLAT = 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ'

// Free refleksi
const FREE_MOOD = [
  { value: 1, emoji: '😔', label: 'Sangat lalai' },
  { value: 2, emoji: '😐', label: 'Kurang hadir' },
  { value: 3, emoji: '🙂', label: 'Sederhana' },
  { value: 4, emoji: '😊', label: 'Cukup hadir' },
  { value: 5, emoji: '🌟', label: 'Sangat khusyuk' },
]
const FREE_CHIPS = ['Khusyuk', 'Tergesa', 'Lalai', 'Tenang', 'Berat', 'Bersyukur', 'Mengantuk', 'Hadir']

// Pro refleksi
const PRO_HALANGAN = ['Fikiran melayang', 'Tergesa-gesa', 'Mengantuk', 'Gangguan luar', 'Tidak faham bacaan', 'Tiada halangan']

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, minutesUntil }: { status: PrayerStatus; minutesUntil?: number }) {
  const { t } = useTranslation()
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-[#c9a96e] bg-[#c9a96e15] border border-[#c9a96e30] px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e] animate-pulse" />
        {t('solat.waktu_sekarang')}
      </span>
    )
  }
  if (status === 'done') {
    return (
      <span className="text-xs font-medium text-emerald-400 bg-emerald-900/20 border border-emerald-500/30 px-2.5 py-1 rounded-full">
        ✓ Alhamdulillah
      </span>
    )
  }
  if (status === 'missed') {
    return (
      <span className="text-xs font-medium text-orange-400 bg-orange-900/20 border border-orange-500/30 px-2.5 py-1 rounded-full">
        ⚠️ {t('solat.terlajak')}
      </span>
    )
  }
  if (minutesUntil !== undefined) {
    return (
      <span className="text-xs text-[#8a7a65]">
        {t('solat.dalam')} {formatTimeUntil(minutesUntil * 60 * 1000)}
      </span>
    )
  }
  return null
}

// ─── Save with timeout — never block the UI ───────────────────────────────────

async function saveWithTimeout(fn: () => Promise<void>) {
  try {
    await Promise.race([
      fn(),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ])
  } catch { /* silently continue — table may not exist or network slow */ }
}

// ─── Solat Flow (per prayer) ──────────────────────────────────────────────────

type SolatPhase = 'main' | 'refleksi' | 'wirid' | 'done'

interface SolatFlowProps {
  prayer: PrayerRecord
  status: PrayerStatus
  prayers: PrayerRecord[]
  onSave: (updated: PrayerRecord[]) => Promise<void>
  isSubuh: boolean
  isPro: boolean
}

function SolatFlow({ prayer, status, prayers, onSave, isSubuh, isPro }: SolatFlowProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [phase, setPhase] = useState<SolatPhase>(prayer.completed ? 'done' : 'main')
  const [marking, setMarking] = useState(false)
  const [checklist, setChecklist] = useState<boolean[]>(prayer.checklist ?? [false, false, false, false, false])
  const [quality, setQuality] = useState(prayer.quality ?? 0)
  const [khusyuk, setKhusyuk] = useState(prayer.khusyuk_percent ?? 70)
  const [wiridCounts, setWiridCounts] = useState({ tasbih: 0, tahmid: 0, takbir: 0 })
  const [wiridChecked, setWiridChecked] = useState({ ayat: false, doa: false })
  const [showAyat, setShowAyat] = useState(false)
  const [showDoa, setShowDoa] = useState(false)
  const [freeHadir, setFreeHadir] = useState(0)
  const [freePerkataan, setFreePerkataan] = useState('')
  const [proHalangan, setProHalangan] = useState<string[]>([])
  const [proFahm, setProFahm] = useState('')
  const [proSyukur, setProSyukur] = useState('')
  const [proTaubat, setProTaubat] = useState('')
  const [proTaubatCerita, setProTaubatCerita] = useState('')
  const [proAzam, setProAzam] = useState('')

  const prayerName = prayer.name
  const isMissedQada = status === 'missed' && !prayer.completed

  function updatePrayer(extra: Partial<PrayerRecord>) {
    return prayers.map(p => p.name === prayerName ? { ...p, ...extra } : p)
  }

  async function handleMarkDone() {
    setMarking(true)
    await saveWithTimeout(() => onSave(updatePrayer({ completed: true, on_time: status === 'active', quality, checklist })))
    setMarking(false)
    setPhase('refleksi')
  }

  function handleFreeRefleksi() {
    try {
      const key = `madrasah-refleksi-free-${format(new Date(), 'yyyy-MM-dd')}-${prayerName}`
      localStorage.setItem(key, JSON.stringify({ hadir: freeHadir, perkataan: freePerkataan }))
    } catch { /* ignore */ }
    if (isSubuh) setPhase('wirid')
    else setPhase('done')
  }

  async function handleProRefleksi() {
    setMarking(true)
    await saveWithTimeout(() => onSave(updatePrayer({ khusyuk_percent: khusyuk, azam: proAzam })))
    setMarking(false)
    if (isSubuh) setPhase('wirid')
    else setPhase('done')
  }

  async function handleWirid() {
    setMarking(true)
    await saveWithTimeout(() => onSave(updatePrayer({ wirid_done: true })))
    setMarking(false)
    setPhase('done')
  }

  const increment = useCallback((key: keyof typeof wiridCounts, target: number) => {
    setWiridCounts(prev => ({ ...prev, [key]: Math.min(prev[key] + 1, target) }))
  }, [])

  // ── Main Phase ─────────────────────────────────────────────────

  if (phase === 'main') {
    const isActive = status === 'active' || isMissedQada
    return (
      <div className="space-y-4 pt-2">
        {isMissedQada && (
          <div className="px-4 py-3 bg-orange-900/15 border border-orange-500/20 rounded-xl text-center space-y-1">
            <p className="text-xs text-orange-400 font-medium">⚠️ Waktu telah berlalu</p>
            <p className="text-xs text-[#8a7a65]">Solat walaupun terlambat. Allah Maha Pengampun.</p>
          </div>
        )}
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">Persediaan</p>
          {CHECKLIST_ITEMS.map((item, i) => (
            <button key={i} onClick={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
              className="w-full flex items-start gap-3 text-left group">
              <div className={cn(
                'min-w-[18px] min-h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                checklist[i] ? 'border-[#c9a96e] bg-[#c9a96e]' : 'border-[#2a3d55] group-hover:border-[#c9a96e60]'
              )}>
                {checklist[i] && <CheckCircle2 size={11} className="text-[#060d16]" />}
              </div>
              <p className={cn('text-sm leading-snug', checklist[i] ? 'text-[#c9a96e] line-through opacity-70' : 'text-[#e8dcc8]')}>
                {item}
              </p>
            </button>
          ))}
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
          <p className="text-sm text-[#e8dcc8]">Kualiti niat solat ini</p>
          <div className="flex gap-2">
            {QUALITY_OPTIONS.map(q => (
              <button key={q.value} onClick={() => setQuality(q.value)}
                className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all',
                  quality === q.value ? 'border-[#c9a96e] bg-[#c9a96e15]' : 'border-[#1e2d40] hover:border-[#2a3d55]')}>
                <span className="text-lg">{q.emoji}</span>
                <span className="text-[9px] text-[#8a7a65]">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleMarkDone} disabled={marking || quality === 0 || !isActive}
          className={cn('w-full py-4 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2',
            isActive
              ? 'bg-[#c9a96e] text-[#060d16] hover:bg-[#e2c89a] disabled:opacity-50 disabled:cursor-not-allowed'
              : 'bg-[#1e2d40] text-[#8a7a65] cursor-not-allowed')}>
          {marking ? <Loader2 size={16} className="animate-spin" /> : null}
          {isMissedQada ? `✓ Rekod ${prayerName} (Qada)` : `✓ ${t('solat.tandakan')} ${prayerName}`}
        </button>
        {quality === 0 && isActive && <p className="text-center text-[#8a7a65] text-xs -mt-2">Pilih kualiti niat dahulu</p>}
      </div>
    )
  }

  // ── Refleksi Phase ─────────────────────────────────────────────

  if (phase === 'refleksi') {
    const taClass = "w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl p-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"

    if (!isPro) {
      return (
        <div className="space-y-4 pt-2">
          <div className="text-center">
            <p className="font-serif text-[#c9a96e] text-xl">Alhamdulillah ✓</p>
            <p className="text-[#8a7a65] text-sm mt-1">Audit Jiwa Selepas Solat</p>
            <p className="text-[#8a7a65] text-xs">Sejenak bersama diri sendiri</p>
          </div>
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
            <p className="text-sm text-[#e8dcc8]">Hati saya hadir bersama Allah dalam solat tadi?</p>
            <div className="flex gap-2">
              {FREE_MOOD.map(m => (
                <button key={m.value} onClick={() => setFreeHadir(m.value)}
                  className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all',
                    freeHadir === m.value ? 'border-[#c9a96e] bg-[#c9a96e15]' : 'border-[#1e2d40] hover:border-[#2a3d55]')}>
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[9px] text-[#8a7a65] text-center leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
            <p className="text-sm text-[#e8dcc8]">Satu perkataan untuk solat tadi:</p>
            <div className="flex flex-wrap gap-2">
              {FREE_CHIPS.map(chip => (
                <button key={chip} onClick={() => setFreePerkataan(chip)}
                  className={cn('px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                    freePerkataan === chip ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleFreeRefleksi} disabled={freeHadir === 0 || !freePerkataan}
            className="w-full py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubuh ? t('solat.seterusnya_wirid') : t('solat.simpan')}
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-4 pt-2">
        <div className="text-center">
          <p className="font-serif text-[#c9a96e] text-xl">Alhamdulillah ✓</p>
          <p className="text-[#8a7a65] text-sm mt-1">6 Dimensi Refleksi Rohani</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْحُضُور</p>
            <p className="text-[#8a7a65] text-xs">— Kehadiran Hati</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">Berapa % hati saya benar-benar hadir bersama Allah?</p>
          <div className="flex items-center gap-4">
            <input type="range" min={10} max={100} step={10} value={khusyuk}
              onChange={e => setKhusyuk(Number(e.target.value))} className="flex-1 accent-[#c9a96e]" />
            <span className="text-[#c9a96e] font-bold text-lg w-14 text-right">{khusyuk}%</span>
          </div>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْخُشُوع</p>
            <p className="text-[#8a7a65] text-xs">— Khusyuk</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">Apakah yang menghalang khusyuk saya?</p>
          <div className="flex flex-wrap gap-2">
            {PRO_HALANGAN.map(h => (
              <button key={h} onClick={() => setProHalangan(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])}
                className={cn('px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                  proHalangan.includes(h) ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
                {h}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْفَهْم</p>
            <p className="text-[#8a7a65] text-xs">— Kefahaman</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">Ayat atau bacaan yang paling saya hayati:</p>
          <textarea value={proFahm} onChange={e => setProFahm(e.target.value)}
            placeholder="Contoh: Surah Al-Fatihah — 'Iyyaka na'budu'..." rows={2} className={taClass} />
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلشُّكْر</p>
            <p className="text-[#8a7a65] text-xs">— Syukur</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">Satu nikmat Allah yang terlintas dalam solat tadi:</p>
          <textarea value={proSyukur} onChange={e => setProSyukur(e.target.value)}
            placeholder="Nikmat yang anda sedar semasa solat..." rows={2} className={taClass} />
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلتَّوْبَة</p>
            <p className="text-[#8a7a65] text-xs">— Taubat</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">Adakah ada perkara yang perlu saya betulkan dengan Allah?</p>
          <div className="flex gap-2">
            {[{ id: 'ya', label: 'Ya, ada' }, { id: 'insya', label: 'Insya-Allah baik' }, { id: 'berfikir', label: 'Masih berfikir' }].map(opt => (
              <button key={opt.id} onClick={() => setProTaubat(opt.id)}
                className={cn('flex-1 py-2 rounded-xl border text-xs transition-all',
                  proTaubat === opt.id ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
                {opt.label}
              </button>
            ))}
          </div>
          {proTaubat === 'ya' && (
            <textarea value={proTaubatCerita} onChange={e => setProTaubatCerita(e.target.value)}
              placeholder="Ceritakan dengan jujur kepada Allah..." rows={2} className={taClass} />
          )}
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْعَزْم</p>
            <p className="text-[#8a7a65] text-xs">— Azam</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">Satu perkara yang akan saya bawa dari solat ini:</p>
          <textarea value={proAzam} onChange={e => setProAzam(e.target.value)}
            placeholder="Azam yang konkrit dari solat ini..." rows={2} className={taClass} />
        </div>
        <button onClick={handleProRefleksi} disabled={marking}
          className="w-full py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {marking ? <Loader2 size={16} className="animate-spin" /> : null}
          {isSubuh ? t('solat.seterusnya_wirid') : t('solat.simpan_refleksi')}
        </button>
      </div>
    )
  }

  // ── Wirid Phase ────────────────────────────────────────────────

  if (phase === 'wirid') {
    const wiridList = [
      { key: 'tasbih' as const, arabic: 'سُبْحَانَ اللَّهِ', rumi: 'Subhanallah', target: 33 },
      { key: 'tahmid' as const, arabic: 'اَلْحَمْدُ لِلَّهِ', rumi: 'Alhamdulillah', target: 33 },
      { key: 'takbir' as const, arabic: 'اللَّهُ أَكْبَرُ', rumi: 'Allahu Akbar', target: 34 },
    ]
    const wiridAllDone = wiridList.every(w => wiridCounts[w.key] >= w.target)
    const canFinish = wiridAllDone && wiridChecked.ayat && wiridChecked.doa

    return (
      <div className="space-y-3 pt-2">
        <p className="text-xs text-center text-[#8a7a65] uppercase tracking-wider">{t('solat.wirid_subuh')}</p>
        {wiridList.map(w => {
          const cnt = wiridCounts[w.key]
          const done = cnt >= w.target
          return (
            <div key={w.key} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-serif text-[#c9a96e] text-base" dir="rtl">{w.arabic}</p>
                  <p className="text-[#8a7a65] text-xs">{w.rumi}</p>
                </div>
                <p className="text-[#c9a96e] font-bold text-xl">{cnt}<span className="text-[#8a7a65] text-sm font-normal">/{w.target}</span></p>
              </div>
              <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[#c9a96e] rounded-full transition-all" style={{ width: `${Math.min((cnt / w.target) * 100, 100)}%` }} />
              </div>
              {done ? (
                <p className="text-center text-[#c9a96e] text-sm">✓ Selesai</p>
              ) : (
                <button onClick={() => increment(w.key, w.target)}
                  className="w-full py-3 border border-[#c9a96e30] bg-[#c9a96e10] text-[#c9a96e] rounded-xl text-sm font-medium hover:bg-[#c9a96e20] active:scale-95 transition-all">
                  Ketuk
                </button>
              )}
            </div>
          )
        })}
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl overflow-hidden">
          <button onClick={() => setShowAyat(!showAyat)} className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                wiridChecked.ayat ? 'border-[#c9a96e] bg-[#c9a96e]' : 'border-[#2a3d55]')}>
                {wiridChecked.ayat && <CheckCircle2 size={11} className="text-[#060d16]" />}
              </div>
              <div className="text-left">
                <p className="text-[#e8dcc8] text-sm font-medium">Ayatul Kursi</p>
                <p className="text-[#8a7a65] text-xs">Al-Baqarah: 255</p>
              </div>
            </div>
            {showAyat ? <ChevronUp size={15} className="text-[#8a7a65]" /> : <ChevronDown size={15} className="text-[#8a7a65]" />}
          </button>
          {showAyat && (
            <div className="px-4 pb-4 space-y-3">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose text-right" dir="rtl">{AYATUL_KURSI}</p>
              <button onClick={() => setWiridChecked(p => ({ ...p, ayat: !p.ayat }))}
                className="w-full py-2.5 border border-[#c9a96e40] bg-[#c9a96e10] text-[#c9a96e] rounded-xl text-sm hover:bg-[#c9a96e20] transition-colors">
                {wiridChecked.ayat ? t('solat.selesai_dibaca') : t('solat.tandakan_selesai_baca')}
              </button>
            </div>
          )}
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl overflow-hidden">
          <button onClick={() => setShowDoa(!showDoa)} className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                wiridChecked.doa ? 'border-[#c9a96e] bg-[#c9a96e]' : 'border-[#2a3d55]')}>
                {wiridChecked.doa && <CheckCircle2 size={11} className="text-[#060d16]" />}
              </div>
              <p className="text-[#e8dcc8] text-sm font-medium">Doa Selepas Solat</p>
            </div>
            {showDoa ? <ChevronUp size={15} className="text-[#8a7a65]" /> : <ChevronDown size={15} className="text-[#8a7a65]" />}
          </button>
          {showDoa && (
            <div className="px-4 pb-4 space-y-3">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose text-right" dir="rtl">{DOA_SOLAT}</p>
              <p className="text-[#8a7a65] text-xs text-center italic">Ya Allah, Engkaulah As-Salam dan daripada-Mu keselamatan...</p>
              <button onClick={() => setWiridChecked(p => ({ ...p, doa: !p.doa }))}
                className="w-full py-2.5 border border-[#c9a96e40] bg-[#c9a96e10] text-[#c9a96e] rounded-xl text-sm hover:bg-[#c9a96e20] transition-colors">
                {wiridChecked.doa ? t('umum.selesai') : t('solat.tandakan_selesai_baca')}
              </button>
            </div>
          )}
        </div>
        <button onClick={handleWirid} disabled={marking || !canFinish}
          className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {marking ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('solat.selesai_wirid')}
        </button>
      </div>
    )
  }

  // ── Done Phase ─────────────────────────────────────────────────

  return (
    <div className="pt-2 space-y-3">
      <div className="bg-[#0d1821] border border-emerald-500/20 rounded-2xl p-5 text-center space-y-2">
        <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
        <p className="font-serif text-emerald-400 text-lg">Alhamdulillah</p>
        <p className="text-[#8a7a65] text-sm">
          {prayerName} {prayer.wirid_done ? '+ wirid ' : ''}selesai.
          {prayer.khusyuk_percent ? ` Kehadiran hati: ${prayer.khusyuk_percent}%` : ''}
        </p>
      </div>
      {!isPro && (
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3 text-center">
          <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
            وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ
          </p>
          <p className="text-[#8a7a65] text-xs italic leading-relaxed">
            "Hendaklah setiap diri melihat apa yang telah dipersiapkan untuk hari esok"
          </p>
          <p className="text-[#c9a96e60] text-xs">— Al-Hasyr: 18</p>
          <div className="h-px bg-[#1e2d40]" />
          <p className="text-[#8a7a65] text-xs leading-relaxed">
            Anda sudah mengaudit jiwa. Audit Jiwa yang Allah maksudkan adalah lebih mendalam — merangkumi hati, fikiran, lisan dan perbuatan.
          </p>
          <button onClick={() => navigate('/muhasabah')}
            className="w-full py-2.5 bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium rounded-xl hover:bg-[#c9a96e25] transition-colors">
            ✦ Buka Audit Jiwa Penuh
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Muhasabah Malam Tab ──────────────────────────────────────────────────────

function MuhasabahMalamTab({ prayers }: { prayers: PrayerRecord[] }) {
  const { user } = useAuthStore()
  const completedCount = prayers.filter(p => p.completed).length
  const [solatRating, setSolatRating] = useState(completedCount)
  const [answers, setAnswers] = useState({ best: '', weak: '', syukur: '', azam: '', doa: '' })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const answerList = [
        { question_id: 101, question: 'Jumlah solat hari ini', answer: String(solatRating) },
        { question_id: 102, question: 'Solat terbaik — mengapa?', answer: answers.best },
        { question_id: 103, question: 'Titik lemah dalam solat', answer: answers.weak },
        { question_id: 104, question: 'Syukur hari ini', answer: answers.syukur },
        { question_id: 105, question: 'Azam solat esok', answer: answers.azam },
        { question_id: 106, question: 'Doa malam', answer: answers.doa },
      ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('muhasabah_entries') as any)
        .insert({ user_id: user.id, date: today, answers: answerList, mood: 3 })
    } catch { /* table not yet created */ }
    setSaved(true)
    setSaving(false)
  }

  const taClass = "w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors disabled:opacity-60"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Moon size={18} className="text-[#c9a96e]" />
        <p className="font-serif text-[#c9a96e] text-lg">Audit Jiwa Malam</p>
      </div>
      <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
          حَاسِبُوا أَنْفُسَكُمْ قَبْلَ أَنْ تُحَاسَبُوا
        </p>
        <p className="text-[#8a7a65] text-xs italic">"Hisablah dirimu sebelum kamu dihisab" — Umar al-Khattab r.a.</p>
      </div>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <p className="text-sm text-[#e8dcc8]">1. Berapa waktu solat yang saya tunaikan hari ini?</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setSolatRating(n)}
              className={cn('flex-1 py-3 rounded-xl border text-sm font-bold transition-all',
                solatRating >= n ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
              {n}
            </button>
          ))}
        </div>
        <p className="text-[#8a7a65] text-xs text-center">waktu solat</p>
      </div>
      {[
        { key: 'best' as const, q: '2. Solat terbaik hari ini — mengapa ia lebih baik?', ph: 'Ceritakan pengalaman solat terbaik anda...' },
        { key: 'weak' as const, q: '3. Apakah titik lemah dalam solat saya hari ini?', ph: 'Jujurlah dengan diri sendiri...' },
        { key: 'syukur' as const, q: '4. Apa yang saya syukuri hari ini?', ph: 'Nikmat Allah yang anda rasai hari ini...' },
        { key: 'azam' as const, q: '5. Azam saya untuk solat yang lebih baik esok:', ph: 'Komitmen konkrit untuk esok...' },
        { key: 'doa' as const, q: '6. Doa malam saya:', ph: 'Apa yang ingin anda pohon kepada Allah malam ini...' },
      ].map(({ key, q, ph }) => (
        <div key={key} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <p className="text-sm text-[#e8dcc8]">{q}</p>
          <textarea value={answers[key]} onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={ph} rows={2} disabled={saved} className={taClass} />
        </div>
      ))}
      <div className="bg-[#060d16] border border-[#c9a96e15] rounded-2xl p-4 text-center space-y-2">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
          رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">
          "Ya Tuhanku, jadikanlah aku dan anak cucuku orang-orang yang mendirikan solat. Ya Tuhan kami, perkenankanlah doaku."
        </p>
        <p className="text-[#c9a96e60] text-xs">— Ibrahim: 40</p>
      </div>
      {saved ? (
        <div className="flex items-center justify-center gap-2 py-4 border border-[#c9a96e30] rounded-2xl">
          <CheckCircle2 size={18} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-serif text-sm">Audit Jiwa malam tersimpan. Selamat berehat.</p>
        </div>
      ) : (
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Simpan Audit Jiwa Malam
        </button>
      )}
    </div>
  )
}

// ─── Main SolatPage ───────────────────────────────────────────────────────────

export default function SolatPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isPro = user?.tier === 'pro' || user?.tier === 'family'

  // ── MAIN TAB ───────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<'harian' | 'dimensi'>('harian')
  // ──────────────────────────────────────────────────────────────

  const { data: entry, isFetching } = useTodaySolat()
  const { mutateAsync: update } = useUpdateSolat()
  const {
    loading: timesLoading,
    windows,
    currentWindow,
    nextWindow,
    msUntilNext,
    locationLabel,
    refreshLocation,
  } = usePrayerTimes()

  const [solatTab, setSolatTab] = useState<'tracker' | 'sebelum' | 'malam' | 'rekod'>('tracker')
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null)
  const [showUpgradeFor, setShowUpgradeFor] = useState<string | null>(null)
  const [notifGranted, setNotifGranted] = useState(false)

  const prayers: PrayerRecord[] = Array.isArray(entry?.prayers)
    ? (entry.prayers as PrayerRecord[])
    : DEFAULT_PRAYERS

  const completedCount = prayers.filter(p => p.completed).length

  async function handleSavePrayers(updated: PrayerRecord[]) {
    await update(updated)
  }

  async function handleRequestNotif() {
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
  }

  const countdown = formatCountdown(msUntilNext)

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-3xl text-[#c9a96e] leading-none">الصَّلاة</p>
          <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">Tracker Solat</h1>
        </div>
        {isFetching && <RefreshCw size={15} className="text-[#8a7a65] animate-spin mt-2" />}
      </div>

      {/* Main tab: Solat Harian vs Dimensi Solat */}
      <div className="flex bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1 gap-1">
        <button onClick={() => setMainTab('harian')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            mainTab === 'harian' ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          🕌 Solat Harian
        </button>
        <button onClick={() => setMainTab('dimensi')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            mainTab === 'dimensi' ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          📖 Dimensi Solat
        </button>
      </div>

      {/* Dimensi Solat content */}
      {mainTab === 'dimensi' && (
        <DimensiSolat isPro={isPro} user={user} />
      )}

      {/* ── SOLAT HARIAN CONTENT ── */}
      {mainTab === 'harian' && <>

      {/* Pro Tab Bar */}
      {isPro && (
        <div className="flex gap-1 bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1 overflow-x-auto">
          {([
            { id: 'tracker', label: 'Tracker', icon: '🕌' },
            { id: 'sebelum', label: 'Sebelum', icon: '📋' },
            { id: 'malam',   label: 'Malam',   icon: '🌙' },
            { id: 'rekod',   label: 'Rekod',   icon: '📊' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setSolatTab(t.id)}
              className={cn('flex-1 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center justify-center gap-1',
                solatTab === t.id ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      )}

      {/* Location + Notification */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#8a7a65]">
          <MapPin size={12} />
          <span>{locationLabel}</span>
          <button onClick={refreshLocation} className="text-[#c9a96e] hover:underline">Kemas kini</button>
        </div>
        <div className="ml-auto">
          {!notifGranted && 'Notification' in window && (
            <button onClick={handleRequestNotif}
              className="flex items-center gap-1.5 text-xs text-[#8a7a65] hover:text-[#c9a96e] transition-colors">
              <Bell size={12} />
              Aktif notifikasi
            </button>
          )}
        </div>
      </div>

      {/* Countdown Card */}
      {(!isPro || solatTab === 'tracker') && (
        timesLoading ? (
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 flex items-center gap-3">
            <Loader2 size={18} className="text-[#c9a96e] animate-spin" />
            <p className="text-[#8a7a65] text-sm">Mendapatkan waktu solat...</p>
          </div>
        ) : currentWindow ? (
          <div className="bg-[#0d1821] border border-[#c9a96e40] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c9a96e] animate-pulse" />
              <p className="text-[#c9a96e] text-xs font-medium uppercase tracking-wider">{t('solat.waktu_sekarang')}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-[#e8dcc8] text-2xl">
                  {PRAYER_META[currentWindow.prayer]?.emoji} {currentWindow.prayer}
                </p>
                <p className="text-[#8a7a65] text-sm">{currentWindow.time12}</p>
              </div>
              {nextWindow && (
                <div className="text-right">
                  <p className="text-[#8a7a65] text-xs">Seterusnya: {nextWindow.prayer}</p>
                  <p className="font-mono text-[#c9a96e] text-sm">{countdown.h}:{countdown.m}:{countdown.s}</p>
                </div>
              )}
            </div>
          </div>
        ) : nextWindow ? (
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
            <p className="text-[#8a7a65] text-xs uppercase tracking-wider">{t('solat.waktu_seterusnya')}</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-serif text-[#e8dcc8] text-2xl">
                  {PRAYER_META[nextWindow.prayer]?.emoji} {nextWindow.prayer}
                </p>
                <p className="text-[#c9a96e] text-base">{nextWindow.time12}</p>
              </div>
              <div className="flex items-end gap-2">
                {[{ val: countdown.h, label: 'jam' }, { val: countdown.m, label: 'min' }, { val: countdown.s, label: 'saat' }].map(({ val, label }) => (
                  <div key={label} className="text-center">
                    <p className="font-mono text-[#c9a96e] text-3xl font-bold leading-none">{val}</p>
                    <p className="text-[#8a7a65] text-xs mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null
      )}

      {/* Progress Ring */}
      {(!isPro || solatTab === 'tracker') && (
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 flex items-center gap-5">
          <ProgressRing
            progress={(completedCount / 5) * 100}
            size={80} strokeWidth={6}
            label={`${completedCount}/5`}
            sublabel="Waktu"
          />
          <div className="flex-1">
            <p className="text-[#e8dcc8] font-medium text-sm">
              {completedCount === 5
                ? t('solat.semua_selesai')
                : currentWindow
                ? `Waktu ${currentWindow.prayer} sekarang. ${completedCount} dari 5 selesai.`
                : `${completedCount} dari 5 waktu selesai hari ini.`}
            </p>
            {!isPro && (
              <p className="text-[#8a7a65] text-xs mt-1">Free: Subuh aktif sepenuhnya. Lain memerlukan Pro.</p>
            )}
            {isPro && (
              <div className="flex gap-1.5 mt-2.5">
                {prayers.map(p => (
                  <div key={p.name} className={cn('flex-1 h-1 rounded-full transition-all', p.completed ? 'bg-[#c9a96e]' : 'bg-[#1e2d40]')} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tracker Tab ───────────────────────────────────────── */}
      {(!isPro || solatTab === 'tracker') && (
        <div className="space-y-3">
          {prayers.map(prayer => {
            const meta = PRAYER_META[prayer.name]
            const win = windows.find(w => w.prayer === prayer.name)
            const status: PrayerStatus = prayer.completed
              ? 'done'
              : win
              ? getPrayerStatus(win, prayer.completed, new Date())
              : 'waiting'

            const isLocked = !isPro && prayer.name !== 'Subuh'
            const isExpanded = expandedPrayer === prayer.name
            const msUntil = win && status === 'waiting' ? win.start.getTime() - Date.now() : 0

            const borderClass =
              status === 'active' ? 'border-[#c9a96e50]' :
              status === 'done'   ? 'border-emerald-500/30' :
              status === 'missed' ? 'border-orange-500/20' :
              'border-[#1e2d40]'

            return (
              <div key={prayer.name}>
                <button
                  onClick={() => {
                    if (isLocked) { setShowUpgradeFor(prayer.name); return }
                    if (status === 'waiting') return
                    setExpandedPrayer(isExpanded ? null : prayer.name)
                  }}
                  className={cn(
                    'w-full bg-[#0d1821] border rounded-2xl p-4 flex items-center gap-4 transition-all text-left',
                    borderClass,
                    status === 'waiting' && !isLocked ? 'opacity-50 cursor-not-allowed' : '',
                    status === 'active' && !isLocked ? 'shadow-[0_0_20px_#c9a96e15]' : '',
                  )}
                >
                  <span className="text-2xl flex-shrink-0">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-serif text-[#c9a96e] text-sm">{meta.arabic}</p>
                      {win && <span className="text-[#8a7a65] text-xs">{win.time12}</span>}
                    </div>
                    <p className={cn('font-medium',
                      status === 'done' ? 'text-emerald-400' :
                      status === 'active' ? 'text-[#c9a96e]' :
                      'text-[#e8dcc8]')}>
                      {t(`solat.${prayer.name.toLowerCase()}`)}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={status} minutesUntil={msUntil > 0 ? Math.floor(msUntil / 60000) : undefined} />
                    </div>
                    {status === 'missed' && !prayer.completed && (
                      <p className="text-[#8a7a65] text-xs mt-1">Solat walaupun terlambat. Allah Maha Pengampun.</p>
                    )}
                  </div>
                  {isLocked ? (
                    <Lock size={20} className="text-[#2a3d55] flex-shrink-0" />
                  ) : status === 'done' ? (
                    <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                  ) : status === 'waiting' ? (
                    <Circle size={24} className="text-[#1e2d40] flex-shrink-0" />
                  ) : (
                    <div className={cn('flex-shrink-0 transition-transform', isExpanded ? 'rotate-180' : '')}>
                      <ChevronDown size={18} className="text-[#8a7a65]" />
                    </div>
                  )}
                </button>

                {isExpanded && !isLocked && (
                  <div className="mt-2 bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4">
                    <SolatFlow
                      prayer={prayer}
                      status={status}
                      prayers={prayers}
                      onSave={handleSavePrayers}
                      isSubuh={prayer.name === 'Subuh'}
                      isPro={isPro}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Soft upgrade nudge */}
      {(!isPro || solatTab === 'tracker') && prayers.find(p => p.name === 'Subuh')?.completed && !isPro && (
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3">
          <p className="text-[#c9a96e] font-medium text-sm text-center">✦ Subuh sudah sempurna hari ini.</p>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
              وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">"Solat adalah kewajipan yang ditentukan waktunya" — An-Nisa: 103</p>
          </div>
          <button className="w-full py-3 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
            ✦ Pintu seterusnya menanti anda...
          </button>
        </div>
      )}

      {/* ── Sebelum Solat Tab (Pro) ─────────────────────────────── */}
      {isPro && solatTab === 'sebelum' && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-[#e8dcc8]">📋 Senarai Semak Sebelum Solat</p>
            {[
              'Perbaharui niat — untuk Allah semata-mata',
              'Wuduk sempurna dan sempurna',
              'Pakaian bersih, aurat tertutup',
              'Tempat solat bersih',
              'Arah kiblat betul',
              'Hadirkan hati — tarik nafas, ucap: "Ya Allah, aku hadir di hadapan-Mu"',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#c9a96e30] flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#c9a96e10]">
                  <span className="text-[#c9a96e] text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-[#e8dcc8] text-sm leading-snug">{item}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">✦</span>
              <p className="text-[#c9a96e] font-serif text-base">5 Kunci Khusyuk</p>
            </div>
            {[
              { num: '١', tip: 'Bayangkan ini solat terakhir — setiap rakaat mungkin perpisahan.' },
              { num: '٢', tip: 'Pandang tempat sujud — jangan benarkan mata mengembara.' },
              { num: '٣', tip: 'Perlahan dalam setiap pergerakan — tuma\'ninah itu wajib.' },
              { num: '٤', tip: 'Fahami bacaan — bukan sekadar lafaz, tapi penghayatan.' },
              { num: '٥', tip: 'Rasa Allah memerhati — sembah Allah seolah-olah kamu melihat-Nya.' },
            ].map(({ num, tip }) => (
              <div key={num} className="flex items-start gap-3">
                <span className="font-serif text-[#c9a96e] text-base flex-shrink-0 w-5 text-center">{num}</span>
                <p className="text-[#8a7a65] text-sm leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-2xl p-4 text-center">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
              قَدْ أَفْلَحَ الْمُؤْمِنُونَ ۙ الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">
              "Sesungguhnya berjayalah orang-orang yang beriman — yang khusyuk dalam solatnya."
            </p>
            <p className="text-[#c9a96e60] text-xs mt-1">— Al-Mukminun: 1-2</p>
          </div>
        </div>
      )}

      {/* ── Muhasabah Malam Tab (Pro) ─────────────────────────────── */}
      {isPro && solatTab === 'malam' && <MuhasabahMalamTab prayers={prayers} />}

      {/* ── Rekod Tab (Pro) ───────────────────────────────────────── */}
      {isPro && solatTab === 'rekod' && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#c9a96e]" />
              <p className="text-sm font-medium text-[#e8dcc8]">Statistik Hari Ini</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Selesai', value: `${completedCount}/5`, color: 'text-[#c9a96e]' },
                { label: 'Kehadiran', value: prayers.find(p => p.khusyuk_percent)?.khusyuk_percent ? `${prayers.find(p => p.khusyuk_percent)?.khusyuk_percent}%` : '—', color: 'text-emerald-400' },
                { label: 'Wirid', value: prayers.some(p => p.wirid_done) ? '✓' : '—', color: 'text-violet-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#060d16] rounded-xl p-3 text-center">
                  <p className={`font-bold text-xl font-serif ${color}`}>{value}</p>
                  <p className="text-[#8a7a65] text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Moon size={16} className="text-[#8a7a65]" />
              <p className="text-sm font-medium text-[#e8dcc8]">Status 5 Waktu</p>
            </div>
            <div className="space-y-2">
              {prayers.map(p => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-lg w-8">{PRAYER_META[p.name]?.emoji}</span>
                  <p className="text-sm text-[#e8dcc8] flex-1">{p.name}</p>
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full',
                    p.completed ? 'bg-emerald-900/20 text-emerald-400' : 'bg-[#1e2d40] text-[#8a7a65]')}>
                    {p.completed ? '✓ Selesai' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 text-center space-y-2">
            <p className="text-[#8a7a65] text-xs">Analitik rekod 90 hari akan hadir</p>
            <p className="text-[#c9a96e] text-xs">InsyaAllah — sedang disiapkan</p>
          </div>
        </div>
      )}

      </> /* end Solat Harian */ }

      {/* Upgrade Modal — always rendered */}
      {showUpgradeFor && (
        <div className="fixed inset-0 bg-[#060d16]/85 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
            <button onClick={() => setShowUpgradeFor(null)} className="absolute top-4 right-4 text-[#8a7a65] hover:text-[#e8dcc8]">
              <X size={18} />
            </button>
            {currentWindow && (
              <p className="text-[#e8dcc8] text-sm text-center">
                {PRAYER_META[currentWindow.prayer]?.emoji} Waktu {showUpgradeFor} telah/akan tiba.
              </p>
            )}
            <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
              </p>
              <p className="text-[#8a7a65] text-xs mt-2 italic">"Solat adalah kewajipan yang ditentukan waktunya ke atas orang-orang beriman" — An-Nisa: 103</p>
            </div>
            <p className="text-[#8a7a65] text-sm text-center leading-relaxed">
              Jangan biarkan waktu ini berlalu. Lengkapkan 5 waktu anda.
            </p>
            <div className="space-y-2">
              <button className="w-full py-3 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
                ✦ Pintu seterusnya menanti anda...
              </button>
              <button onClick={() => setShowUpgradeFor(null)}
                className="w-full py-2.5 text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
                Teruskan dengan Subuh sahaja
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
