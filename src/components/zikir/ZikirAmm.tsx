import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

// ─── Data ─────────────────────────────────────────────────────────────────────

const AYAT_LIST = [
  { arabic: 'وَلَذِكْرُ اللَّهِ أَكْبَرُ', translation: 'Dan sesungguhnya zikir kepada Allah adalah yang paling agung', source: 'Al-Ankabut: 45' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي', translation: 'Maka ingatlah kepada-Ku, nescaya Aku ingat kepadamu, dan bersyukurlah', source: 'Al-Baqarah: 152' },
  { arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', translation: 'Ketahuilah, hanya dengan mengingati Allah hati menjadi tenang', source: "Ar-Ra'd: 28" },
]

const ZIKIR_LIST = [
  { id: 'tasbih',   name: 'Tasbih',    arabic: 'سُبْحَانَ اللَّهِ',             rumi: 'Subhanallah',             meaning: 'Maha Suci Allah',                         target: 33,  hex: '#34d399', tabClass: 'text-emerald-400 border-emerald-500/50 bg-emerald-900/20', ringHex: '#34d39930' },
  { id: 'tahmid',   name: 'Tahmid',    arabic: 'اَلْحَمْدُ لِلَّهِ',            rumi: 'Alhamdulillah',           meaning: 'Segala puji bagi Allah',                  target: 33,  hex: '#fbbf24', tabClass: 'text-amber-400 border-amber-500/50 bg-amber-900/20',   ringHex: '#fbbf2430' },
  { id: 'takbir',   name: 'Takbir',    arabic: 'اللَّهُ أَكْبَرُ',              rumi: 'Allahu Akbar',            meaning: 'Allah Maha Besar',                        target: 34,  hex: '#f87171', tabClass: 'text-rose-400 border-rose-500/50 bg-rose-900/20',     ringHex: '#f8717130' },
  { id: 'tahlil',   name: 'Tahlil',    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',   rumi: 'La ilaha illallah',       meaning: 'Tiada tuhan melainkan Allah',              target: 100, hex: '#60a5fa', tabClass: 'text-blue-400 border-blue-500/50 bg-blue-900/20',      ringHex: '#60a5fa30' },
  { id: 'selawat',  name: 'Selawat',   arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', rumi: "Allahumma Solli 'ala Muhammad", meaning: 'Ya Allah, selawatlah ke atas Nabi Muhammad ﷺ', target: 100, hex: '#c9a96e', tabClass: 'text-[#c9a96e] border-[#c9a96e50] bg-[#c9a96e15]',  ringHex: '#c9a96e30' },
  { id: 'istighfar',name: 'Istighfar', arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ', rumi: "Astaghfirullahal 'Azim", meaning: 'Aku pohon ampun kepada Allah Yang Maha Agung', target: 100, hex: '#a78bfa', tabClass: 'text-violet-400 border-violet-500/50 bg-violet-900/20', ringHex: '#a78bfa30' },
]

const STORAGE_KEY_PREFIX = 'madrasah-zikir-am'

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getTodayKey() {
  return `${STORAGE_KEY_PREFIX}-${format(new Date(), 'yyyy-MM-dd')}`
}

function loadTodayCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(getTodayKey())
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function persistCounts(counts: Record<string, number>) {
  try { localStorage.setItem(getTodayKey(), JSON.stringify(counts)) } catch { /* ignore */ }
}

// ─── Daily Chart ─────────────────────────────────────────────────────────────

function DailyChart({ counts }: { counts: Record<string, number> }) {
  const { t } = useTranslation()
  const done = ZIKIR_LIST.filter(z => (counts[z.id] ?? 0) >= z.target).length

  return (
    <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#e8dcc8]">📊 {t('zikir.graf')}</p>
        <p className="text-xs" style={{ color: done === 6 ? '#4ade80' : '#c9a96e' }}>
          {done}/6 {done === 6 ? `✓ ${t('zikir.selesai')}` : t('umum.selesai').toLowerCase()}
        </p>
      </div>
      <div className="space-y-2">
        {ZIKIR_LIST.map(z => {
          const cnt = counts[z.id] ?? 0
          const pct = Math.min((cnt / z.target) * 100, 100)
          const complete = cnt >= z.target
          return (
            <div key={z.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#8a7a65]">{z.rumi}</span>
                <span style={{ color: complete ? '#4ade80' : z.hex }}>
                  {cnt}/{z.target}{complete ? ' ✓' : ` (${Math.round(pct)}%)`}
                </span>
              </div>
              <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: complete ? '#4ade80' : z.hex }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ZikirAmm() {
  const { t } = useTranslation()
  const [ayatIdx, setAyatIdx] = useState(0)
  const [activeId, setActiveId] = useState(ZIKIR_LIST[0].id)
  const [counts, setCounts] = useState<Record<string, number>>(loadTodayCounts)
  const [flash, setFlash] = useState(false)

  // Rotate ayat every 5s
  useEffect(() => {
    const t = setInterval(() => setAyatIdx(i => (i + 1) % AYAT_LIST.length), 5000)
    return () => clearInterval(t)
  }, [])

  const active = ZIKIR_LIST.find(z => z.id === activeId)!
  const count = counts[activeId] ?? 0
  const isDone = count >= active.target
  const progress = Math.min((count / active.target) * 100, 100)
  const allDone = ZIKIR_LIST.every(z => (counts[z.id] ?? 0) >= z.target)

  const handleTap = useCallback(() => {
    if (isDone) return
    setCounts(prev => {
      const next = { ...prev, [activeId]: (prev[activeId] ?? 0) + 1 }
      persistCounts(next)
      return next
    })
    setFlash(true)
    setTimeout(() => setFlash(false), 90)
  }, [activeId, isDone])

  function handleReset() {
    setCounts(prev => {
      const next = { ...prev, [activeId]: 0 }
      persistCounts(next)
      return next
    })
  }

  const ayat = AYAT_LIST[ayatIdx]

  return (
    <div className="space-y-4">

      {/* Daily Chart */}
      <DailyChart counts={counts} />

      {/* Ayat Banner */}
      <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-2xl p-5 text-center transition-all duration-700">
        <p className="font-serif text-[#c9a96e] text-lg leading-loose" dir="rtl">{ayat.arabic}</p>
        <p className="text-[#8a7a65] text-xs mt-2 leading-relaxed italic">"{ayat.translation}"</p>
        <p className="text-[#c9a96e60] text-xs mt-1">— {ayat.source}</p>
      </div>

      {/* Zikir Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ZIKIR_LIST.map(z => {
          const done = (counts[z.id] ?? 0) >= z.target
          return (
            <button key={z.id} onClick={() => setActiveId(z.id)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                activeId === z.id ? z.tabClass : 'border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8]'
              )}>
              {done ? '✓ ' : ''}{z.name}
            </button>
          )
        })}
      </div>

      {/* Panduan Khusyuk */}
      <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl px-4 py-3 text-center">
        <p className="text-[#c9a96e] text-xs font-serif leading-relaxed">
          ✦ Lafazkan dengan khusyuk — hayati makna setiap kalimah. Hadirkan hati bersama lidah.
        </p>
      </div>

      {/* Counter Card */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-6 text-center space-y-4">

        {/* Arabic + info */}
        <div>
          <p className="font-serif leading-loose" style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)', color: active.hex, direction: 'rtl' }}>
            {active.arabic}
          </p>
          <p className="text-[#e8dcc8] text-sm mt-1">{active.rumi}</p>
          <p className="text-[#8a7a65] text-xs">{active.meaning}</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#8a7a65]">{t('audit_jiwa.kemajuan')}</span>
            <span className="font-medium" style={{ color: active.hex }}>{count} / {active.target}</span>
          </div>
          <div className="h-2 bg-[#1e2d40] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: active.hex }} />
          </div>
        </div>

        {/* Done or Tap */}
        {isDone ? (
          <div className="py-2 space-y-1">
            <CheckCircle2 size={36} className="mx-auto" style={{ color: active.hex }} />
            <p className="font-serif text-lg" style={{ color: active.hex }}>{t('zikir.selesai')}</p>
            <p className="text-[#8a7a65] text-sm">{active.name} {t('umum.selesai').toLowerCase()}</p>
          </div>
        ) : (
          <button
            onClick={handleTap}
            className={cn(
              'w-44 h-44 rounded-full mx-auto flex flex-col items-center justify-center',
              'border-4 select-none transition-transform duration-75',
              'hover:scale-105 active:scale-95',
              flash ? 'scale-95 brightness-125' : ''
            )}
            style={{ borderColor: active.ringHex, backgroundColor: active.ringHex }}
          >
            <span className="text-5xl font-bold text-[#e8dcc8] leading-none">{count}</span>
            <span className="text-xs mt-2 tracking-widest uppercase" style={{ color: active.hex }}>{t('zikir.ketuk')}</span>
          </button>
        )}

        {/* Reset */}
        {count > 0 && (
          <div className="flex justify-center">
            <button onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#1e2d40] rounded-xl text-xs text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors">
              <RotateCcw size={13} />
              {t('zikir.set_semula')}
            </button>
          </div>
        )}
      </div>

      {/* All done */}
      {allDone && (
        <div className="bg-[#0d1821] border border-[#c9a96e30] rounded-2xl p-5 text-center space-y-1">
          <p className="font-serif text-[#c9a96e] text-xl">مَاشَاءَ اللَّهُ</p>
          <p className="text-[#e8dcc8] text-sm">Tahniah! Kesemua 6 zikir selesai hari ini.</p>
          <p className="text-[#8a7a65] text-xs">Semoga Allah menerima amalan anda. Amin.</p>
        </div>
      )}

      {/* Soft nudge — Pro */}
      <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-4 text-center space-y-1.5">
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          Ingin lihat perjalanan zikir anda dari semasa ke semasa?
        </p>
        <p className="text-[#8a7a65] text-xs leading-relaxed">
          Versi Pro menyimpan setiap titik perjalanan anda — streak, trend, dan rekod seumur hidup.
        </p>
        <button className="text-[#c9a96e] text-xs hover:underline transition-colors">
          ✦ Perjalanan ini ada lebih dalam...
        </button>
      </div>

    </div>
  )
}
