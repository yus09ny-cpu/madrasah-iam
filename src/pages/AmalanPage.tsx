import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle2, Play, Square, ChevronDown, ChevronUp, Flame, Volume2, VolumeX,
} from 'lucide-react'
import { HeartZikir } from '@/components/HeartZikir'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'

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

type SessionPhase = 'dashboard' | 1 | 2 | 3 | '4a' | '4b' | '4c' | 'done'

// ─── Constants ─────────────────────────────────────────────────────────────────

// Fallback Al-Fatihah — hanya dipakai jika DB tiada teks
const FATIHAH_FALLBACK = `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
الرَّحْمَٰنِ الرَّحِيمِ
مَالِكِ يَوْمِ الدِّينِ
إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ
اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ
صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ
غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ`

// Fallback labels — hanya jika items dari DB kosong
const FATIHAH_FALLBACK_LABELS = [
  { num: 'الفاتحة الأولى', label: 'Fatihah Pertama', to: 'Junjungan Besar Nabi Muhammad s.a.w.' },
  { num: 'الفاتحة الثانية', label: 'Fatihah Kedua', to: 'Guru-guru Silsilah TQN hingga Abah Anom r.a.' },
  { num: 'الفاتحة الثالثة', label: 'Fatihah Ketiga', to: 'Semua Muslimin dan Muslimat' },
]

const BREATH_PHASES = [
  { label: 'Tarik Nafas', sub: 'Hadirkan Allah', secs: 4, color: '#a78bfa', rgb: '167,139,250', rScale: 1.0 },
  { label: 'Tahan', sub: "Hati sebut 'Allah'", secs: 2, color: '#c9a96e', rgb: '201,169,110', rScale: 1.0 },
  { label: 'Hembus Nafas', sub: 'Ikut degupan jantung', secs: 6, color: '#4ade80', rgb: '74,222,128', rScale: 0.55 },
]

const AYAT_LIST = [
  { arab: 'وَلَذِكْرُ اللَّهِ أَكْبَرُ', tr: '"Dan sesungguhnya zikir kepada Allah adalah yang paling agung"', src: 'Al-Ankabut: 45' },
  { arab: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', tr: '"Ketahuilah, hanya dengan mengingati Allah hati menjadi tenang"', src: "Ar-Ra'd: 28" },
  { arab: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي', tr: '"Ingatlah Aku, nescaya Aku ingat kepadamu"', src: 'Al-Baqarah: 152' },
]

// ─── Phase Progress Bar ────────────────────────────────────────────────────────

function PhaseBar({ phase }: { phase: SessionPhase }) {
  const steps = [
    { id: 1, label: 'Bacaan', color: '#c9a96e' },
    { id: 2, label: 'Jahar',  color: '#60a5fa' },
    { id: 3, label: 'Doa',   color: '#c9a96e' },
    { id: 4, label: 'Khafi', color: '#a78bfa' },
  ]
  const n = phase === 'done' ? 5 : typeof phase === 'number' ? phase : phase === '4a' || phase === '4b' || phase === '4c' ? 4 : 0

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
            <p className="text-[8px]" style={{ color: n >= s.id ? s.color : '#8a7a65' }}>{s.label}</p>
          </div>
          {i < 3 && <div className="w-5 h-px mb-3" style={{ backgroundColor: n > s.id ? '#c9a96e40' : '#1e2d40' }} />}
        </div>
      ))}
    </div>
  )
}

// ─── Bacaan Card ───────────────────────────────────────────────────────────────

function BacaanCard({ item, accent = '#c9a96e' }: { item: AmalanItem; accent?: string }) {
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
        <p className="text-xs" style={{ color: accent + 'cc' }}>Ulangan: {item.ulangan}×</p>
      )}
    </div>
  )
}

// ─── Fasa 1 — Bacaan Pembuka ───────────────────────────────────────────────────

function Fasa1({ items, onDone }: { items: AmalanItem[]; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-serif text-[#c9a96e] text-xl">Bacaan Pembuka</p>
        <p className="text-[#8a7a65] text-sm mt-0.5">Sebelum memulakan Zikir Jahar</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 text-center space-y-2">
          <p className="text-[#8a7a65] text-sm">Bacaan belum diisi.</p>
          <p className="text-[#8a7a65] text-xs italic">Nine boleh isi melalui Supabase → amalan_content (jenis: zikir_jahar, urutan 1-4)</p>
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
        <span className="text-sm text-[#e8dcc8]">Saya telah selesai membaca semua bacaan pembuka</span>
      </button>

      <button onClick={onDone} disabled={!confirmed}
        className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        Mulakan Zikir Jahar →
      </button>
    </div>
  )
}

// ─── Fasa 2 — Zikir Jahar ─────────────────────────────────────────────────────

function Fasa2({ item, onDone }: { item: AmalanItem | null; onDone: (count: number, target: number) => void }) {
  const TARGETS = [165, 200, 300, 500]
  const savedTarget = parseInt(localStorage.getItem('amalan_jahar_target') ?? '165') || 165
  const [target, setTarget] = useState(savedTarget)
  const [count, setCount] = useState(0)
  const [flash, setFlash] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [audioOn, setAudioOn] = useState(false)
  const [audioAvail, setAudioAvail] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isDone = count >= target
  const progress = target > 0 ? Math.min((count / target) * 100, 100) : 0
  const C = 2 * Math.PI * 80

  // Try to load audio
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

  useEffect(() => {
    if (!audioRef.current) return
    if (audioOn && !isDone) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }, [audioOn, isDone])

  // Save progress
  useEffect(() => {
    localStorage.setItem('amalan_jahar_count', String(count))
  }, [count])

  const handleTap = useCallback(() => {
    if (isDone) return
    setCount(c => c + 1)
    setFlash(true)
    setTimeout(() => setFlash(false), 80)
    if ('vibrate' in navigator) navigator.vibrate(30)
  }, [isDone])

  function changeTarget(t: number) {
    setTarget(t)
    setCount(0)
    localStorage.setItem('amalan_jahar_target', String(t))
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        {item?.arab && (
          <p className="font-serif text-[#60a5fa] leading-none" style={{ fontSize: 28 }} dir="rtl">{item.arab}</p>
        )}
        <p className="text-[#8a7a65] text-sm">Zikir Jahar</p>
      </div>

      {/* Target */}
      {!isDone && (
        <div className="flex gap-2">
          {TARGETS.map(t => (
            <button key={t} onClick={() => changeTarget(t)}
              className={cn('flex-1 py-2 rounded-xl border text-xs font-medium transition-all',
                target === t ? 'border-[#60a5fa50] bg-[#60a5fa15] text-[#60a5fa]' : 'border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8]')}>
              {t}x
            </button>
          ))}
        </div>
      )}

      {/* Progress Ring */}
      <div className="flex items-center justify-center py-2">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 176 176">
            <circle cx="88" cy="88" r="80" strokeWidth="8" stroke="#1e2d40" fill="none" />
            <circle cx="88" cy="88" r="80" strokeWidth="8" fill="none"
              stroke={isDone ? '#4ade80' : '#60a5fa'}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress / 100)}
              className="transition-all duration-300" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={cn('font-serif font-bold transition-all duration-75',
              flash ? 'scale-125' : 'scale-100',
              isDone ? 'text-[#4ade80]' : flash ? 'text-[#60a5fa]' : 'text-[#c9a96e]')}
              style={{ fontSize: 64 }}>
              {count}
            </p>
            <p className="text-[#8a7a65] text-xs">/ {target}</p>
          </div>
        </div>
      </div>

      {/* Audio toggle */}
      <div className="flex items-center justify-between bg-[#0d1821] border border-[#1e2d40] rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          {audioOn ? <Volume2 size={14} className="text-[#60a5fa]" /> : <VolumeX size={14} className="text-[#8a7a65]" />}
          <p className="text-sm text-[#e8dcc8]">Audio Panduan</p>
        </div>
        {audioAvail ? (
          <button onClick={() => setAudioOn(v => !v)}
            className={cn('w-11 h-6 rounded-full relative transition-all', audioOn ? 'bg-[#60a5fa]' : 'bg-[#1e2d40]')}>
            <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', audioOn ? 'left-[22px]' : 'left-0.5')} />
          </button>
        ) : (
          <p className="text-[#8a7a65] text-xs">Belum tersedia</p>
        )}
      </div>

      {/* Panduan gerakan */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-xl overflow-hidden">
        <button onClick={() => setShowGuide(v => !v)} className="w-full flex items-center justify-between px-4 py-3">
          <p className="text-[#8a7a65] text-xs">📖 Panduan Gerakan</p>
          {showGuide ? <ChevronUp size={14} className="text-[#8a7a65]" /> : <ChevronDown size={14} className="text-[#8a7a65]" />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 space-y-3">
            {[
              { arab: 'لَا', g: 'Dari bawah pusat naik ke kepala' },
              { arab: 'إِلَٰهَ', g: 'Dari susu kanan atas ke susu kanan bawah' },
              { arab: 'إِلَّا اللَّهُ', g: 'Dari susu kiri atas ke jantung dengan hentakan yang menggegarkan' },
            ].map(({ arab, g }) => (
              <div key={arab} className="bg-[#060d16] rounded-xl p-3 space-y-1">
                <p className="font-serif text-[#60a5fa] text-base text-right" dir="rtl">{arab}</p>
                <p className="text-[#8a7a65] text-xs">{g}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Done */}
      {isDone ? (
        <div className="space-y-4 text-center bg-[#0d1821] border border-[#60a5fa30] rounded-2xl p-6">
          <p className="font-serif text-[#60a5fa] text-2xl">Alhamdulillah ✦</p>
          <p className="text-[#8a7a65] text-sm">{count} kali selesai</p>
          <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">
            سَيِّدُنَا مُحَمَّدٌ رَّسُوْلُ اللّٰهِ
          </p>
          <button onClick={() => onDone(count, target)}
            className="w-full py-4 bg-[#60a5fa] text-[#060d16] font-semibold rounded-2xl hover:opacity-90 transition-opacity">
            Teruskan ke Doa →
          </button>
        </div>
      ) : (
        <button onClick={handleTap}
          className={cn('w-full rounded-2xl select-none font-serif text-[#60a5fa] transition-all duration-75',
            flash ? 'scale-[0.97] bg-[#60a5fa25]' : 'hover:bg-[#60a5fa08] active:scale-[0.97]')}
          style={{ height: 80, border: '2px solid #60a5fa', fontSize: 24 }}
          dir="rtl">
          لَا إِلَٰهَ إِلَّا اللَّهُ
        </button>
      )}
    </div>
  )
}

// ─── Fasa 3 — Doa ─────────────────────────────────────────────────────────────

function Fasa3({ items, onDone }: { items: AmalanItem[]; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="font-serif text-[#c9a96e] text-xl">Doa Selepas Zikir Jahar</p>
      </div>

      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.25)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🤲</span>
          <p className="text-[#c9a96e] text-sm font-medium">Doa Penutup Zikir Jahar</p>
        </div>

        {items.length === 0 ? (
          <p className="text-[#8a7a65] text-xs italic text-center">Doa belum diisi — Nine boleh isi via Supabase (urutan 6-7)</p>
        ) : (
          items.map((item, i) => (
            <div key={item.id} className={cn('space-y-2', i > 0 && 'border-t border-[#c9a96e20] pt-4')}>
              {item.tajuk && <p className="text-[#c9a96e] text-xs font-medium">{item.tajuk}</p>}
              {item.arab && <p className="font-serif text-[#c9a96e] text-base leading-loose text-right" dir="rtl">{item.arab}</p>}
              {item.rumi && <p className="text-[#8a7a65] text-xs italic">{item.rumi}</p>}
              {item.terjemahan && <p className="text-[#e8dcc8] text-xs leading-relaxed">{item.terjemahan}</p>}
              {item.ulangan && item.ulangan > 1 && <p className="text-[#c9a96e80] text-xs">× {item.ulangan}</p>}
            </div>
          ))
        )}
      </div>

      <button onClick={() => setConfirmed(v => !v)}
        className="w-full flex items-center gap-3 p-4 bg-[#0d1821] border border-[#1e2d40] rounded-xl hover:border-[#c9a96e30] transition-colors">
        <div className={cn('w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all',
          confirmed ? 'border-[#c9a96e] bg-[#c9a96e]' : 'border-[#2a3d55]')}>
          {confirmed && <CheckCircle2 size={12} className="text-[#060d16]" />}
        </div>
        <span className="text-sm text-[#e8dcc8]">Saya telah selesai membaca doa</span>
      </button>

      <button onClick={onDone} disabled={!confirmed}
        className="w-full py-4 bg-[#c9a96e] text-[#060d16] font-semibold rounded-2xl hover:bg-[#e2c89a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        Teruskan ke Fatihah →
      </button>
    </div>
  )
}

// ─── Fasa 4A — 3 Fatihah ──────────────────────────────────────────────────────

function Fasa4A({ items, onDone }: { items: AmalanItem[]; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [checked, setChecked] = useState([false, false, false])

  function markDone() {
    if (checked[step]) return
    setChecked(prev => { const n = [...prev]; n[step] = true; return n })
  }

  const allDone = checked.every(Boolean)

  // Ambil data dari Supabase, fallback ke constant jika kosong
  const item = items[step]
  const fallback = FATIHAH_FALLBACK_LABELS[step]

  // Tajuk (num) — dari DB atau fallback
  const numArab = item?.tajuk || fallback.num
  const numLabel = item?.rumi || fallback.label

  // Penerima — dari DB terjemahan atau fallback
  const recipient = item?.terjemahan || fallback.to

  // Teks Al-Fatihah — dari DB arab atau constant (hanya fallback)
  const fatihahText = (item?.arab && item.arab.length > 30) ? item.arab : FATIHAH_FALLBACK

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-serif text-emerald-400 text-xl">Hadiah Al-Fatihah</p>
        <p className="text-[#8a7a65] text-sm mt-0.5">Sebelum memulakan Zikir Khafi</p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn('rounded-full transition-all',
            i < step ? 'w-3 h-3 bg-emerald-400' :
            i === step ? 'w-3 h-3 bg-emerald-400 ring-2 ring-emerald-400/30' : 'w-2 h-2 bg-[#1e2d40] mt-0.5')} />
        ))}
      </div>

      <div className="bg-[#0d1821] border border-emerald-500/30 rounded-2xl p-5 space-y-4">

        {/* Header dari DB */}
        <div className="text-center space-y-1">
          <p className="font-serif text-emerald-400 text-lg">{numArab}</p>
          <p className="text-[#8a7a65] text-xs">{numLabel}</p>
        </div>

        {/* Penerima dari DB */}
        <div className="bg-[#060d16] border border-emerald-500/20 rounded-xl p-4 text-center space-y-1.5">
          <p className="text-emerald-400 text-xs uppercase tracking-wider">Hadiah kepada:</p>
          <p className="text-[#e8dcc8] text-sm font-medium leading-relaxed">{recipient}</p>
        </div>

        {/* Teks Al-Fatihah — dari DB atau fallback */}
        <div className="bg-[#060d16] rounded-xl p-4 max-h-52 overflow-y-auto">
          <p className="font-serif text-emerald-400 text-base leading-loose text-right whitespace-pre-line" dir="rtl"
            style={{ fontFamily: '"Lora", serif', fontSize: 20, lineHeight: 2.2 }}>
            {fatihahText}
          </p>
        </div>

        {/* Catatan tambahan dari DB jika ada */}
        {item?.catatan && (
          <p className="text-[#8a7a65] text-xs italic text-center">{item.catatan}</p>
        )}

        {/* Checkbox */}
        {!checked[step] ? (
          <button onClick={markDone}
            className="w-full flex items-center gap-3 p-3 bg-[#060d16] border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-colors">
            <div className="w-5 h-5 rounded border-2 border-[#2a3d55] flex-shrink-0" />
            <span className="text-sm text-[#e8dcc8]">Selesai membaca</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-400">Selesai ✓</span>
          </div>
        )}

        {checked[step] && step < 2 && (
          <button onClick={() => setStep(s => s + 1)}
            className="w-full py-3 bg-emerald-600 text-[#060d16] font-semibold rounded-xl text-sm hover:bg-emerald-500 transition-colors">
            Fatihah {step + 2} →
          </button>
        )}
      </div>

      {allDone && (
        <button onClick={onDone}
          className="w-full py-4 bg-emerald-500 text-[#060d16] font-semibold rounded-2xl hover:bg-emerald-400 transition-colors">
          Teruskan ke Bacaan Khafi →
        </button>
      )}
    </div>
  )
}

// ─── Fasa 4B — Bacaan Sebelum Khafi ───────────────────────────────────────────

function Fasa4B({ items, onDone }: { items: AmalanItem[]; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-serif text-[#c9a96e] text-xl">Bacaan Sebelum Zikir Khafi</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 text-center">
          <p className="text-[#8a7a65] text-xs italic">Nine boleh isi melalui Supabase (jenis: zikir_khafi, urutan 4-6)</p>
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
        <span className="text-sm text-[#e8dcc8]">Selesai membaca</span>
      </button>

      <button onClick={onDone} disabled={!confirmed}
        className="w-full py-4 bg-[#a78bfa] text-[#060d16] font-semibold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
        ▶ Mulakan Zikir Khafi
      </button>
    </div>
  )
}

// ─── Fasa 4C — Zikir Khafi ────────────────────────────────────────────────────

function Fasa4C({ item, onDone }: { item: AmalanItem | null; onDone: (mins: number) => void }) {
  const DURATIONS = [5, 10, 15, 20] as const
  const [selectedMins, setSelectedMins] = useState<number>(10)
  const [isRunning, setIsRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(10 * 60)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const selMinsRef = useRef(selectedMins)
  selMinsRef.current = selectedMins

  useEffect(() => {
    if (!isRunning) return
    const iv = setInterval(() => setSecondsLeft(s => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(iv)
  }, [isRunning])

  useEffect(() => {
    if (isRunning && secondsLeft === 0) {
      setIsRunning(false)
      onDoneRef.current(selMinsRef.current)
    }
  }, [secondsLeft, isRunning])

  function start() {
    setSecondsLeft(selectedMins * 60)
    setIsRunning(true)
  }

  function stop() {
    const elapsed = Math.max(1, Math.round((selectedMins * 60 - secondsLeft) / 60))
    setIsRunning(false)
    onDoneRef.current(elapsed)
  }

  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60

  return (
    <div className="space-y-4">
      <div className="text-center">
        {item?.arab ? (
          <p className="font-serif text-[#a78bfa] text-2xl" dir="rtl">{item.arab}</p>
        ) : (
          <p className="font-serif text-[#a78bfa] text-2xl" dir="rtl">اَللَّه</p>
        )}
        <p className="text-[#8a7a65] text-sm mt-0.5">Zikir Khafi — Zikir Hati</p>
      </div>

      {/* Panduan */}
      <div className="bg-[#060d16] border border-[#a78bfa20] rounded-xl px-4 py-3 space-y-1">
        <p className="text-[#8a7a65] text-xs">· Lekatkan lidah ke langit-langit mulut</p>
        <p className="text-[#8a7a65] text-xs">· Hati ikut irama jantung ini: <span className="text-[#a78bfa]">AL</span> · <span className="text-[#c9a96e]">LAH</span> · <span className="text-[#60a5fa]">HU</span> · <span className="text-[#a78bfa]">AL</span> · <span className="text-[#c9a96e]">LAH</span> · <span className="text-[#60a5fa]">HU</span></p>
        <p className="text-[#8a7a65] text-xs">· Hati yang menyebut — bukan lisan</p>
      </div>

      {!isRunning && (
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <button key={d} onClick={() => { setSelectedMins(d); setSecondsLeft(d * 60) }}
              className={cn('flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all',
                selectedMins === d ? 'border-[#a78bfa50] bg-[#a78bfa15] text-[#a78bfa]' : 'border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8]')}>
              {d}m
            </button>
          ))}
        </div>
      )}

      {/* Animasi Jantung AL-LAH-HU */}
      <div className="flex flex-col items-center py-2">
        <HeartZikir isRunning={isRunning} />
        <p className="text-[#8a7a65] font-mono text-2xl tracking-widest mt-3">
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </p>
      </div>

      {isRunning ? (
        <button onClick={stop}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-[#1e2d40] rounded-2xl text-sm text-[#8a7a65] hover:text-red-400 hover:border-red-900/40 transition-colors">
          <Square size={14} />
          Tamatkan Sesi
        </button>
      ) : (
        <button onClick={start}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#a78bfa] text-[#060d16] font-semibold rounded-2xl hover:opacity-90 transition-opacity">
          <Play size={16} />
          Mulakan Zikir Khafi {selectedMins} Minit
        </button>
      )}
    </div>
  )
}

// ─── Selesai Screen ────────────────────────────────────────────────────────────

function SelesaiScreen({ jaharCount, jaharTarget, khafiMins, onClose }: {
  jaharCount: number; jaharTarget: number; khafiMins: number; onClose: () => void
}) {
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
        <p className="text-[#8a7a65] text-xs mt-2 italic">"Ya Allah, Engkaulah tujuanku dan keredhaan-Mu yang aku cari"</p>
      </div>

      <div className="space-y-2">
        {[
          { label: 'Bacaan Pembuka', value: 'Selesai', color: '#c9a96e' },
          { label: 'Zikir Jahar', value: `${jaharCount}x (target: ${jaharTarget})`, color: '#60a5fa' },
          { label: 'Doa', value: 'Selesai', color: '#c9a96e' },
          { label: '3 Fatihah', value: 'Selesai', color: '#4ade80' },
          { label: 'Zikir Khafi', value: `${khafiMins} minit`, color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-3 bg-[#0d1821]/80 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} style={{ color, flexShrink: 0 }} />
            <p className="text-[#e8dcc8] text-sm flex-1">{label}</p>
            <p className="text-sm font-medium" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <p className="text-[#8a7a65] text-sm text-center leading-relaxed">
        Semoga Allah menerima amalan anda hari ini.<br />
        <span className="font-serif text-[#c9a96e] text-lg">Aamiin.</span>
      </p>

      <button onClick={onClose}
        className="w-full py-4 font-semibold rounded-2xl text-[#060d16] hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #c9a96e, #e2c89a)' }}>
        ✦ Selesai
      </button>
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onStart, user }: { onStart: () => void; user: { id: string } | null }) {
  const [stats, setStats] = useState({ todayDone: false, streak: 0, totalJahar: 0, totalKhafiMins: 0 })
  const ayatIdx = new Date().getDate() % AYAT_LIST.length
  const ayat = AYAT_LIST[ayatIdx]

  useEffect(() => {
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise.resolve((supabase.from('amalan_sessions') as any)
      .select('session_date, jahar_kiraan, khafi_minit, sesi_lengkap')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(365)
    ).then(({ data }: { data: any[] | null }) => {
      if (!data) return
      const todayDone = data.some(d => d.session_date === today && d.sesi_lengkap)
      const totalJahar = data.reduce((s: number, d: any) => s + (d.jahar_kiraan ?? 0), 0)
      const totalKhafiMins = data.reduce((s: number, d: any) => s + (d.khafi_minit ?? 0), 0)

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
  }, [user?.id])

  return (
    <div className="space-y-5">
      {/* Ayat */}
      <div className="bg-[#0d1821] border border-[#c9a96e15] rounded-2xl p-5 text-center space-y-2">
        <p className="font-serif text-[#c9a96e] text-base leading-loose" dir="rtl">{ayat.arab}</p>
        <p className="text-[#8a7a65] text-xs italic">{ayat.tr}</p>
        <p className="text-[#c9a96e60] text-xs">— {ayat.src}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: stats.todayDone ? '✓' : '○',
            label: 'Sesi Hari Ini',
            value: stats.todayDone ? 'Selesai' : 'Belum',
            color: stats.todayDone ? 'text-emerald-400' : 'text-[#8a7a65]',
          },
          {
            icon: <Flame size={16} className="text-[#c9a96e]" />,
            label: 'Streak',
            value: `${stats.streak} hari`,
            color: 'text-[#c9a96e]',
          },
          {
            icon: '✦',
            label: 'Jumlah Jahar',
            value: stats.totalJahar.toLocaleString(),
            color: 'text-[#60a5fa]',
          },
          {
            icon: '💜',
            label: 'Jumlah Khafi',
            value: stats.totalKhafiMins >= 60
              ? `${Math.floor(stats.totalKhafiMins / 60)}j ${stats.totalKhafiMins % 60}m`
              : `${stats.totalKhafiMins} min`,
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

      {/* Start button */}
      <button onClick={onStart}
        className="w-full py-5 font-semibold rounded-2xl text-[#060d16] text-lg hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #c9a96e 0%, #e2c89a 100%)' }}>
        ✦ Mulakan Sesi Amalan
      </button>
    </div>
  )
}

// ─── Main AmalanPage ───────────────────────────────────────────────────────────

export default function AmalanPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isTalqin = user?.talqin_jahar === true
  const tabName = user?.gender === 'female' ? 'Ahwat ✦' : 'Ikhwan ✦'

  const [phase, setPhase] = useState<SessionPhase>('dashboard')
  const [content, setContent] = useState<AmalanItem[]>([])
  const [contentLoaded, setContentLoaded] = useState(false)
  const [jaharCount, setJaharCount] = useState(0)
  const [jaharTarget, setJaharTarget] = useState(165)
  const [khafiMins, setKhafiMins] = useState(0)

  const [dbStatus, setDbStatus] = useState<string>('loading')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!cancelled) setDbStatus('loading')

      try {
        // Gunakan fetch terus dengan AbortController (timeout 5s)
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

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          const msg = `HTTP ${res.status}: ${body.slice(0, 100)}`
          if (!cancelled) setDbStatus(msg)
          return
        }

        const data: AmalanItem[] = await res.json()

        if (!cancelled) {
          if (!data || data.length === 0) {
            setDbStatus('empty — 0 rekod (jadual kosong atau tiada)')
          } else {
            setContent(data.filter(d => d.aktif !== false))
            setDbStatus(`ok — ${data.length} rekod`)
          }
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error
            ? (e.name === 'AbortError' ? 'timeout 5s — periksa jadual & RLS' : e.message)
            : String(e)
          setDbStatus(msg)
        }
      } finally {
        if (!cancelled) setContentLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [retryCount])

  // Content slices
  const bacaanPembuka = content.filter(d => d.jenis === 'zikir_jahar' && d.urutan <= 4)
  const zikirJaharItem = content.find(d => d.jenis === 'zikir_jahar' && d.urutan === 5) ?? null
  const doaItems = content.filter(d => d.jenis === 'zikir_jahar' && d.urutan >= 6)
  const fatihahItems = content.filter(d => d.jenis === 'zikir_khafi' && d.urutan <= 3)
  const bacaanKhafiItems = content.filter(d => d.jenis === 'zikir_khafi' && d.urutan >= 4 && d.urutan <= 6)
  const zikirKhafiItem = content.find(d => d.jenis === 'zikir_khafi' && d.urutan === 7) ?? null

  async function saveSession(data: Record<string, unknown>) {
    if (!user) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('amalan_sessions') as any).insert({
        user_id: user.id,
        session_date: format(new Date(), 'yyyy-MM-dd'),
        ...data,
      })
    } catch { /* table not yet created */ }
  }

  function handleJaharDone(count: number, target: number) {
    setJaharCount(count); setJaharTarget(target)
    setPhase(3)
  }

  function handleKhafiDone(mins: number) {
    setKhafiMins(mins)
    saveSession({
      bacaan_pembuka: true,
      jahar_kiraan: jaharCount, jahar_target: jaharTarget, jahar_selesai: true,
      doa_selesai: true,
      fatihah_1: true, fatihah_2: true, fatihah_3: true,
      khafi_minit: mins, khafi_selesai: true, sesi_lengkap: true,
    })
    setPhase('done')
  }

  function resetSession() {
    setPhase('dashboard')
    setJaharCount(0); setJaharTarget(165); setKhafiMins(0)
    localStorage.removeItem('amalan_jahar_count')
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
          <p className="text-[#e8dcc8] text-sm leading-relaxed">Halaman ini untuk peserta yang telah ditalqin Zikir Jahar oleh guru.</p>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ</p>
            <p className="text-[#8a7a65] text-xs mt-1">"Bertanyalah kepada ahli dzikir" — An-Nahl: 43</p>
          </div>
        </div>
        <button onClick={() => navigate('/zikir')}
          className="w-full max-w-sm py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors">
          ✦ Daftar Sesi Talqin
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-serif text-3xl text-[#c9a96e] leading-none">الأَمَل</p>
          <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">{tabName}</h1>
          <p className="text-[#8a7a65] text-xs">Amalan Thariqah Qadiriyah Naqsyabandiyah</p>
        </div>
        {phase !== 'dashboard' && phase !== 'done' && <PhaseBar phase={phase} />}
      </div>

      {!contentLoaded && phase !== 'dashboard' && (
        <div className="flex items-center gap-2 text-[#8a7a65] text-sm">
          <div className="w-4 h-4 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
          Memuatkan kandungan dari Supabase...
        </div>
      )}

      {/* Debug panel */}
      <div className={cn('border rounded-xl px-3 py-2 space-y-1.5',
        dbStatus.startsWith('ok') ? 'border-emerald-600/30 bg-emerald-900/10' : 'border-yellow-600/30 bg-yellow-900/10')}>
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-[10px] font-mono flex-1',
            dbStatus.startsWith('ok') ? 'text-emerald-500' : 'text-yellow-600')}>
            DB: {dbStatus} · dipapar: {content.length}
          </p>
          <button onClick={() => { setContentLoaded(false); setRetryCount(n => n + 1) }}
            className="text-[10px] text-yellow-600 border border-yellow-600/40 rounded px-2 py-0.5 hover:bg-yellow-900/20 flex-shrink-0">
            Retry
          </button>
        </div>
        {!dbStatus.startsWith('ok') && (
          <p className="text-yellow-700 text-[10px]">
            Pastikan jadual <code className="bg-yellow-900/30 px-1 rounded">amalan_content</code> wujud dalam Supabase dan ada policy SELECT.
          </p>
        )}
      </div>

      {phase === 'dashboard' && <Dashboard onStart={() => setPhase(1)} user={user} />}
      {phase === 1 && <Fasa1 items={bacaanPembuka} onDone={() => setPhase(2)} />}
      {phase === 2 && <Fasa2 item={zikirJaharItem} onDone={handleJaharDone} />}
      {phase === 3 && <Fasa3 items={doaItems} onDone={() => setPhase('4a')} />}
      {phase === '4a' && <Fasa4A items={fatihahItems} onDone={() => setPhase('4b')} />}
      {phase === '4b' && <Fasa4B items={bacaanKhafiItems} onDone={() => setPhase('4c')} />}
      {phase === '4c' && <Fasa4C item={zikirKhafiItem} onDone={handleKhafiDone} />}
      {phase === 'done' && (
        <SelesaiScreen jaharCount={jaharCount} jaharTarget={jaharTarget} khafiMins={khafiMins} onClose={resetSession} />
      )}
    </div>
  )
}
