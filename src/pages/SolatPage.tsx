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

const CHECKLIST_KEYS = [
  'solat.checklist.1',
  'solat.checklist.2',
  'solat.checklist.3',
  'solat.checklist.4',
  'solat.checklist.5',
] as const

const QUALITY_OPTIONS = [
  { value: 1, emoji: '😔', labelKey: 'solat.kualiti_lalai' },
  { value: 2, emoji: '😕', labelKey: 'solat.kualiti_kurang' },
  { value: 3, emoji: '😐', labelKey: 'solat.sederhana' },
  { value: 4, emoji: '🙂', labelKey: 'solat.khusyuk' },
  { value: 5, emoji: '😊', labelKey: 'solat.kualiti_sangat_khusyuk' },
]

const AYATUL_KURSI = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ'
const DOA_SOLAT = 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ'

// Free refleksi
const FREE_MOOD = [
  { value: 1, emoji: '😔', labelKey: 'solat.mood_sangat_lalai' },
  { value: 2, emoji: '😐', labelKey: 'solat.mood_kurang_hadir' },
  { value: 3, emoji: '🙂', labelKey: 'solat.sederhana' },
  { value: 4, emoji: '😊', labelKey: 'solat.mood_cukup_hadir' },
  { value: 5, emoji: '🌟', labelKey: 'solat.mood_sangat_khusyuk' },
]
const FREE_CHIPS = [
  'solat.chip_khusyuk', 'solat.chip_tergesa', 'solat.chip_lalai', 'solat.chip_tenang',
  'solat.chip_berat', 'solat.chip_bersyukur', 'solat.chip_mengantuk', 'solat.chip_hadir',
] as const

// Pro refleksi
const PRO_HALANGAN = [
  'solat.halangan_fikiran', 'solat.halangan_tergesa', 'solat.halangan_mengantuk',
  'solat.halangan_gangguan', 'solat.halangan_faham', 'solat.halangan_tiada',
] as const

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
            <p className="text-xs text-orange-400 font-medium">⚠️ {t('solat.terlajak')}</p>
            <p className="text-xs text-[#8a7a65]">{t('solat.waktu_berlalu_desc')}</p>
          </div>
        )}
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-medium text-[#8a7a65] uppercase tracking-wider">{t('solat.persediaan')}</p>
          {CHECKLIST_KEYS.map((key, i) => (
            <button key={i} onClick={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
              className="w-full flex items-start gap-3 text-left group">
              <div className={cn(
                'min-w-[18px] min-h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                checklist[i] ? 'border-[#c9a96e] bg-[#c9a96e]' : 'border-[#2a3d55] group-hover:border-[#c9a96e60]'
              )}>
                {checklist[i] && <CheckCircle2 size={11} className="text-[#060d16]" />}
              </div>
              <p className={cn('text-sm leading-snug', checklist[i] ? 'text-[#c9a96e] line-through opacity-70' : 'text-[#e8dcc8]')}>
                {t(key)}
              </p>
            </button>
          ))}
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
          <p className="text-sm text-[#e8dcc8]">{t('solat.kualiti_niat')}</p>
          <div className="flex gap-2">
            {QUALITY_OPTIONS.map(q => (
              <button key={q.value} onClick={() => setQuality(q.value)}
                className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all',
                  quality === q.value ? 'border-[#c9a96e] bg-[#c9a96e15]' : 'border-[#1e2d40] hover:border-[#2a3d55]')}>
                <span className="text-lg">{q.emoji}</span>
                <span className="text-[9px] text-[#8a7a65]">{t(q.labelKey)}</span>
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
          {isMissedQada ? t('solat.rekod_qada', { prayer: prayerName }) : `✓ ${t('solat.tandakan')} ${prayerName}`}
        </button>
        {quality === 0 && isActive && <p className="text-center text-[#8a7a65] text-xs -mt-2">{t('solat.pilih_kualiti')}</p>}
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
            <p className="font-serif text-[#c9a96e] text-xl">{t('solat.alhamdulillah_selesai')}</p>
            <p className="text-[#8a7a65] text-sm mt-1">{t('solat.audit_selepas')}</p>
            <p className="text-[#8a7a65] text-xs">{t('solat.sejenak_diri')}</p>
          </div>
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
            <p className="text-sm text-[#e8dcc8]">{t('solat.hadir_soalan')}</p>
            <div className="flex gap-2">
              {FREE_MOOD.map(m => (
                <button key={m.value} onClick={() => setFreeHadir(m.value)}
                  className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all',
                    freeHadir === m.value ? 'border-[#c9a96e] bg-[#c9a96e15]' : 'border-[#1e2d40] hover:border-[#2a3d55]')}>
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[9px] text-[#8a7a65] text-center leading-tight">{t(m.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
            <p className="text-sm text-[#e8dcc8]">{t('solat.perkataan_solat')}</p>
            <div className="flex flex-wrap gap-2">
              {FREE_CHIPS.map(key => (
                <button key={key} onClick={() => setFreePerkataan(key)}
                  className={cn('px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                    freePerkataan === key ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
                  {t(key)}
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
          <p className="font-serif text-[#c9a96e] text-xl">{t('solat.alhamdulillah_selesai')}</p>
          <p className="text-[#8a7a65] text-sm mt-1">{t('solat.6_dimensi')}</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْحُضُور</p>
            <p className="text-[#8a7a65] text-xs">{t('solat.kehadiran_label')}</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">{t('solat.kehadiran_soalan')}</p>
          <div className="flex items-center gap-4">
            <input type="range" min={10} max={100} step={10} value={khusyuk}
              onChange={e => setKhusyuk(Number(e.target.value))} className="flex-1 accent-[#c9a96e]" />
            <span className="text-[#c9a96e] font-bold text-lg w-14 text-right">{khusyuk}%</span>
          </div>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْخُشُوع</p>
            <p className="text-[#8a7a65] text-xs">{t('solat.khusyuk_label')}</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">{t('solat.khusyuk_soalan')}</p>
          <div className="flex flex-wrap gap-2">
            {PRO_HALANGAN.map(key => (
              <button key={key} onClick={() => setProHalangan(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])}
                className={cn('px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                  proHalangan.includes(key) ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
                {t(key)}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْفَهْم</p>
            <p className="text-[#8a7a65] text-xs">{t('solat.kefahaman_label')}</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">{t('solat.kefahaman_soalan')}</p>
          <textarea value={proFahm} onChange={e => setProFahm(e.target.value)}
            placeholder={t('solat.kefahaman_placeholder')} rows={2} className={taClass} />
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلشُّكْر</p>
            <p className="text-[#8a7a65] text-xs">{t('solat.syukur_label')}</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">{t('solat.syukur_soalan')}</p>
          <textarea value={proSyukur} onChange={e => setProSyukur(e.target.value)}
            placeholder={t('solat.syukur_placeholder')} rows={2} className={taClass} />
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلتَّوْبَة</p>
            <p className="text-[#8a7a65] text-xs">{t('solat.taubat_label')}</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">{t('solat.taubat_soalan')}</p>
          <div className="flex gap-2">
            {[{ id: 'ya', key: 'solat.taubat_ya' }, { id: 'insya', key: 'solat.taubat_insya' }, { id: 'berfikir', key: 'solat.taubat_berfikir' }].map(opt => (
              <button key={opt.id} onClick={() => setProTaubat(opt.id)}
                className={cn('flex-1 py-2 rounded-xl border text-xs transition-all',
                  proTaubat === opt.id ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
                {t(opt.key)}
              </button>
            ))}
          </div>
          {proTaubat === 'ya' && (
            <textarea value={proTaubatCerita} onChange={e => setProTaubatCerita(e.target.value)}
              placeholder={t('solat.taubat_placeholder')} rows={2} className={taClass} />
          )}
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[#c9a96e] text-sm">اَلْعَزْم</p>
            <p className="text-[#8a7a65] text-xs">{t('solat.azam_label')}</p>
          </div>
          <p className="text-[#e8dcc8] text-sm">{t('solat.azam_soalan')}</p>
          <textarea value={proAzam} onChange={e => setProAzam(e.target.value)}
            placeholder={t('solat.azam_placeholder')} rows={2} className={taClass} />
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
                <p className="text-center text-[#c9a96e] text-sm">✓ {t('umum.selesai')}</p>
              ) : (
                <button onClick={() => increment(w.key, w.target)}
                  className="w-full py-3 border border-[#c9a96e30] bg-[#c9a96e10] text-[#c9a96e] rounded-xl text-sm font-medium hover:bg-[#c9a96e20] active:scale-95 transition-all">
                  {t('zikir.ketuk')}
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
              <p className="text-[#e8dcc8] text-sm font-medium">{t('solat.doa_tajuk')}</p>
            </div>
            {showDoa ? <ChevronUp size={15} className="text-[#8a7a65]" /> : <ChevronDown size={15} className="text-[#8a7a65]" />}
          </button>
          {showDoa && (
            <div className="px-4 pb-4 space-y-3">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose text-right" dir="rtl">{DOA_SOLAT}</p>
              <p className="text-[#8a7a65] text-xs text-center italic">{t('solat.doa_trans')}</p>
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
          {prayer.wirid_done
            ? t('solat.done_text_wirid', { prayer: prayerName })
            : t('solat.done_text', { prayer: prayerName })}
          {prayer.khusyuk_percent ? ` ${t('solat.kehadiran_hati', { percent: prayer.khusyuk_percent })}` : ''}
        </p>
      </div>
      {!isPro && (
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-3 text-center">
          <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
            وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ
          </p>
          <p className="text-[#8a7a65] text-xs italic leading-relaxed">
            {t('solat.al_hasyr_trans')}
          </p>
          <p className="text-[#c9a96e60] text-xs">— Al-Hasyr: 18</p>
          <div className="h-px bg-[#1e2d40]" />
          <p className="text-[#8a7a65] text-xs leading-relaxed">
            {t('solat.upsell_desc')}
          </p>
          <button onClick={() => navigate('/muhasabah')}
            className="w-full py-2.5 bg-[#c9a96e15] border border-[#c9a96e40] text-[#c9a96e] text-sm font-medium rounded-xl hover:bg-[#c9a96e25] transition-colors">
            {t('solat.upsell_btn')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Muhasabah Malam Tab ──────────────────────────────────────────────────────

function MuhasabahMalamTab({ prayers }: { prayers: PrayerRecord[] }) {
  const { t } = useTranslation()
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
        <p className="font-serif text-[#c9a96e] text-lg">{t('solat.malam_tajuk')}</p>
      </div>
      <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center space-y-1">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
          حَاسِبُوا أَنْفُسَكُمْ قَبْلَ أَنْ تُحَاسَبُوا
        </p>
        <p className="text-[#8a7a65] text-xs italic">{t('solat.hisab_trans')}</p>
      </div>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <p className="text-sm text-[#e8dcc8]">{t('solat.malam_q1')}</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setSolatRating(n)}
              className={cn('flex-1 py-3 rounded-xl border text-sm font-bold transition-all',
                solatRating >= n ? 'border-[#c9a96e] bg-[#c9a96e15] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]')}>
              {n}
            </button>
          ))}
        </div>
        <p className="text-[#8a7a65] text-xs text-center">{t('solat.malam_waktu_solat')}</p>
      </div>
      {[
        { key: 'best' as const, qKey: 'solat.malam_q2', phKey: 'solat.malam_q2_ph' },
        { key: 'weak' as const, qKey: 'solat.malam_q3', phKey: 'solat.malam_q3_ph' },
        { key: 'syukur' as const, qKey: 'solat.malam_q4', phKey: 'solat.malam_q4_ph' },
        { key: 'azam' as const, qKey: 'solat.malam_q5', phKey: 'solat.malam_q5_ph' },
        { key: 'doa' as const, qKey: 'solat.malam_q6', phKey: 'solat.malam_q6_ph' },
      ].map(({ key, qKey, phKey }) => (
        <div key={key} className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
          <p className="text-sm text-[#e8dcc8]">{t(qKey)}</p>
          <textarea value={answers[key]} onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={t(phKey)} rows={2} disabled={saved} className={taClass} />
        </div>
      ))}
      <div className="bg-[#060d16] border border-[#c9a96e15] rounded-2xl p-4 text-center space-y-2">
        <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
          رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ
        </p>
        <p className="text-[#8a7a65] text-xs italic leading-relaxed">
          {t('solat.ibrahim_trans')}
        </p>
        <p className="text-[#c9a96e60] text-xs">— Ibrahim: 40</p>
      </div>
      {saved ? (
        <div className="flex items-center justify-center gap-2 py-4 border border-[#c9a96e30] rounded-2xl">
          <CheckCircle2 size={18} className="text-[#c9a96e]" />
          <p className="text-[#c9a96e] font-serif text-sm">{t('solat.malam_tersimpan')}</p>
        </div>
      ) : (
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {t('solat.malam_simpan')}
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
          <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{t('solat.tracker_tajuk')}</h1>
        </div>
        {isFetching && <RefreshCw size={15} className="text-[#8a7a65] animate-spin mt-2" />}
      </div>

      {/* Main tab: Solat Harian vs Dimensi Solat */}
      <div className="flex bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-1 gap-1">
        <button onClick={() => setMainTab('harian')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            mainTab === 'harian' ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          {t('solat.tab_harian')}
        </button>
        <button onClick={() => setMainTab('dimensi')}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            mainTab === 'dimensi' ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
          {t('solat.tab_dimensi')}
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
            { id: 'tracker', labelKey: 'solat.inner_tracker', icon: '🕌' },
            { id: 'sebelum', labelKey: 'solat.inner_sebelum', icon: '📋' },
            { id: 'malam',   labelKey: 'solat.inner_malam',   icon: '🌙' },
            { id: 'rekod',   labelKey: 'solat.inner_rekod',   icon: '📊' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setSolatTab(tab.id)}
              className={cn('flex-1 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center justify-center gap-1',
                solatTab === tab.id ? 'bg-[#c9a96e] text-[#060d16]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
              <span>{tab.icon}</span>{t(tab.labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* Location + Notification */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#8a7a65]">
          <MapPin size={12} />
          <span>{locationLabel}</span>
          <button onClick={refreshLocation} className="text-[#c9a96e] hover:underline">{t('solat.kemas_kini')}</button>
        </div>
        <div className="ml-auto">
          {!notifGranted && 'Notification' in window && (
            <button onClick={handleRequestNotif}
              className="flex items-center gap-1.5 text-xs text-[#8a7a65] hover:text-[#c9a96e] transition-colors">
              <Bell size={12} />
              {t('solat.aktif_notif')}
            </button>
          )}
        </div>
      </div>

      {/* Countdown Card */}
      {(!isPro || solatTab === 'tracker') && (
        timesLoading ? (
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 flex items-center gap-3">
            <Loader2 size={18} className="text-[#c9a96e] animate-spin" />
            <p className="text-[#8a7a65] text-sm">{t('solat.mendapat_waktu')}</p>
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
                  <p className="text-[#8a7a65] text-xs">{t('solat.seterusnya_prayer', { prayer: t(`solat.${nextWindow.prayer.toLowerCase()}` as any) })}</p>
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
                {[{ val: countdown.h, key: 'solat.jam' }, { val: countdown.m, key: 'solat.min' }, { val: countdown.s, key: 'solat.saat' }].map(({ val, key }) => (
                  <div key={key} className="text-center">
                    <p className="font-mono text-[#c9a96e] text-3xl font-bold leading-none">{val}</p>
                    <p className="text-[#8a7a65] text-xs mt-1">{t(key as any)}</p>
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
            sublabel={t('solat.waktu_sublabel')}
          />
          <div className="flex-1">
            <p className="text-[#e8dcc8] font-medium text-sm">
              {completedCount === 5
                ? t('solat.semua_selesai')
                : currentWindow
                ? t('solat.sekarang_dan_selesai', { prayer: t(`solat.${currentWindow.prayer.toLowerCase()}` as any), count: completedCount })
                : t('solat.selesai_dari_5', { count: completedCount })}
            </p>
            {!isPro && (
              <p className="text-[#8a7a65] text-xs mt-1">{t('solat.free_tier_info')}</p>
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
                      <p className="text-[#8a7a65] text-xs mt-1">{t('solat.waktu_berlalu_desc')}</p>
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
          <p className="text-[#c9a96e] font-medium text-sm text-center">{t('solat.subuh_sempurna')}</p>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
              وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">{t('solat.an_nisa_trans')}</p>
          </div>
          <button className="w-full py-3 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
            {t('solat.pintu_btn')}
          </button>
        </div>
      )}

      {/* ── Sebelum Solat Tab (Pro) ─────────────────────────────── */}
      {isPro && solatTab === 'sebelum' && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-[#e8dcc8]">{t('solat.senarai_semak_tajuk')}</p>
            {(['1','2','3','4','5','6'] as const).map((n, i) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#c9a96e30] flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#c9a96e10]">
                  <span className="text-[#c9a96e] text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-[#e8dcc8] text-sm leading-snug">{t(`solat.sebelum.${n}` as any)}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">✦</span>
              <p className="text-[#c9a96e] font-serif text-base">{t('solat.khusyuk_kunci_tajuk')}</p>
            </div>
            {(['١','٢','٣','٤','٥'] as const).map((num, i) => (
              <div key={num} className="flex items-start gap-3">
                <span className="font-serif text-[#c9a96e] text-base flex-shrink-0 w-5 text-center">{num}</span>
                <p className="text-[#8a7a65] text-sm leading-relaxed">{t(`solat.khusyuk_tip.${i + 1}` as any)}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-2xl p-4 text-center">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
              قَدْ أَفْلَحَ الْمُؤْمِنُونَ ۙ الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ
            </p>
            <p className="text-[#8a7a65] text-xs mt-2 italic">
              {t('solat.mukminun_trans')}
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
              <p className="text-sm font-medium text-[#e8dcc8]">{t('solat.stat_tajuk')}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('solat.stat_selesai'), value: `${completedCount}/5`, color: 'text-[#c9a96e]' },
                { label: t('solat.stat_kehadiran'), value: prayers.find(p => p.khusyuk_percent)?.khusyuk_percent ? `${prayers.find(p => p.khusyuk_percent)?.khusyuk_percent}%` : '—', color: 'text-emerald-400' },
                { label: t('solat.stat_wirid'), value: prayers.some(p => p.wirid_done) ? '✓' : '—', color: 'text-violet-400' },
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
              <p className="text-sm font-medium text-[#e8dcc8]">{t('solat.status_5_tajuk')}</p>
            </div>
            <div className="space-y-2">
              {prayers.map(p => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-lg w-8">{PRAYER_META[p.name]?.emoji}</span>
                  <p className="text-sm text-[#e8dcc8] flex-1">{p.name}</p>
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full',
                    p.completed ? 'bg-emerald-900/20 text-emerald-400' : 'bg-[#1e2d40] text-[#8a7a65]')}>
                    {p.completed ? `✓ ${t('solat.stat_selesai')}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 text-center space-y-2">
            <p className="text-[#8a7a65] text-xs">{t('solat.akan_hadir')}</p>
            <p className="text-[#c9a96e] text-xs">{t('solat.insyaallah_siap')}</p>
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
            {showUpgradeFor && (
              <p className="text-[#e8dcc8] text-sm text-center">
                {PRAYER_META[showUpgradeFor]?.emoji} {t('solat.modal_waktu_tiba', { prayer: t(`solat.${showUpgradeFor.toLowerCase()}` as any) })}
              </p>
            )}
            <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center">
              <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
                وَأَقِمِ الصَّلَاةَ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
              </p>
              <p className="text-[#8a7a65] text-xs mt-2 italic">{t('solat.an_nisa_trans')}</p>
            </div>
            <p className="text-[#8a7a65] text-sm text-center leading-relaxed">
              {t('solat.jangan_biarkan')}
            </p>
            <div className="space-y-2">
              <button className="w-full py-3 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
                {t('solat.pintu_btn')}
              </button>
              <button onClick={() => setShowUpgradeFor(null)}
                className="w-full py-2.5 text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
                {t('solat.teruskan_subuh')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
