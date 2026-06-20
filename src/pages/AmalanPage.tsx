import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle2, ChevronDown, ChevronUp, Flame, Volume2, VolumeX,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
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
  { id: 'khataman',  label: 'Khataman',  arabic: 'الخَتْم',  soon: true },
  { id: 'manakiban', label: 'Manakiban', arabic: 'المَنَاقِب', soon: true },
  { id: 'inabah',    label: 'Inabah',    arabic: 'الإِنَابَة', soon: true },
  { id: 'ziarah',    label: 'Ziarah',    arabic: 'الزِّيَارَة', soon: true },
]

// ─── Constants ─────────────────────────────────────────────────────────────────


const AYAT_LIST = [
  { arab: 'وَلَذِكْرُ اللَّهِ أَكْبَرُ', tr: '"Dan sesungguhnya zikir kepada Allah adalah yang paling agung"', src: 'Al-Ankabut: 45' },
  { arab: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', tr: '"Ketahuilah, hanya dengan mengingati Allah hati menjadi tenang"', src: "Ar-Ra'd: 28" },
  { arab: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي', tr: '"Ingatlah Aku, nescaya Aku ingat kepadamu"', src: 'Al-Baqarah: 152' },
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
  const steps = [
    { id: 1, label: 'Bacaan', color: '#c9a96e' },
    { id: 2, label: 'Jahar',  color: '#60a5fa' },
    { id: 3, label: 'Doa',   color: '#c9a96e' },
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
            <p className="text-[8px]" style={{ color: n >= s.id ? s.color : '#8a7a65' }}>{s.label}</p>
          </div>
          {i < 2 && <div className="w-5 h-px mb-3" style={{ backgroundColor: n > s.id ? '#c9a96e40' : '#1e2d40' }} />}
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

// ─── Fasa 4 — 3× Al-Fatihah ───────────────────────────────────────────────────

function Fasa4({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0)
  const [flash, setFlash] = useState(false)
  const isDone = count >= 3

  const handleTap = () => {
    if (isDone) return
    setCount(c => c + 1)
    setFlash(true)
    setTimeout(() => setFlash(false), 80)
    if ('vibrate' in navigator) navigator.vibrate(20)
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="font-serif text-[#4ade80] text-xl">3× Al-Fatihah</p>
        <p className="text-[#8a7a65] text-sm">Bacaan penutup sebelum Zikir Khafi</p>
      </div>

      <div className="bg-[#0d1821] border border-[#4ade8020] rounded-2xl p-5 space-y-3">
        <p className="text-[#4ade80] text-xs font-medium uppercase tracking-wider">سُورَةُ الفَاتِحَة</p>
        <p className="font-serif text-[#c9a96e] leading-loose text-right" dir="rtl"
          style={{ fontSize: 18, lineHeight: 2.4 }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿١﴾ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿٢﴾ الرَّحْمَٰنِ الرَّحِيمِ ﴿٣﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map(n => (
          <div key={n} className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-200',
            count >= n
              ? 'border-[#4ade80] bg-[#4ade8030] text-[#4ade80]'
              : 'border-[#1e2d40] text-[#8a7a65]'
          )}>
            {count >= n ? '✓' : n}
          </div>
        ))}
      </div>

      {isDone ? (
        <div className="space-y-4 text-center bg-[#0d1821] border border-[#4ade8030] rounded-2xl p-6">
          <p className="font-serif text-[#4ade80] text-2xl">Alhamdulillah ✦</p>
          <p className="text-[#8a7a65] text-sm">3 bacaan Al-Fatihah selesai</p>
          <button onClick={onDone}
            className="w-full py-4 bg-[#4ade80] text-[#060d16] font-semibold rounded-2xl hover:opacity-90 transition-opacity">
            Teruskan ke Zikir Khafi →
          </button>
        </div>
      ) : (
        <button onClick={handleTap}
          className={cn(
            'w-full rounded-2xl select-none font-serif text-[#4ade80] transition-all duration-75',
            flash ? 'scale-[0.97] bg-[#4ade8025]' : 'hover:bg-[#4ade8008] active:scale-[0.97]'
          )}
          style={{ height: 72, border: '2px solid #4ade80', fontSize: 18 }}>
          ✓ Selesai bacaan ke-{count + 1} ({count}/3)
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
          jaharCount > 0 && { label: 'Bacaan Pembuka', value: 'Selesai', color: '#c9a96e' },
          jaharCount > 0 && { label: 'Zikir Jahar', value: `${jaharCount}x (target: ${jaharTarget})`, color: '#60a5fa' },
          jaharCount > 0 && { label: 'Doa', value: 'Selesai', color: '#c9a96e' },
          { label: '3 Fatihah', value: 'Selesai', color: '#4ade80' },
          { label: 'Zikir Khafi', value: khafiMins > 0 ? `${khafiMins} minit` : 'Selesai', color: '#a78bfa' },
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

// ─── Khafi Section (Iframe + Refleksi Interaktif AI) ──────────────────────────

const REFLEKSI_SOALAN = [
  {
    id: 'fokus',
    soalan: 'Bagaimana tahap fokus anda semasa berzikir tadi?',
    pilihan: [
      'Sangat fokus — hati hadir sepenuhnya',
      'Agak fokus — kadang-kadang menumpang',
      'Kurang fokus — banyak fikiran lain',
      'Tidak fokus langsung',
    ],
  },
  {
    id: 'ganggu',
    soalan: 'Apa yang mengganggu fokus anda semasa berzikir?',
    pilihan: [
      'Fikiran tentang kerja / urusan dunia',
      'Perasaan tidak tenang atau resah',
      'Tidak tahu sebabnya',
      'Tiada gangguan',
    ],
  },
  {
    id: 'rasa',
    soalan: 'Bagaimana perasaan anda selepas selesai berzikir?',
    pilihan: [
      'Tenang dan damai ✦',
      'Biasa sahaja',
      'Masih berasa berat / gelisah',
    ],
  },
]

function KhafiSection({ userTier, onBack, onComplete }: {
  userTier: string
  onBack: () => void
  onComplete: (khafiMins: number) => void
}) {
  const [subPhase, setSubPhase] = useState<'pembuka' | 'berzikir' | 'refleksi' | 'ai_done'>('pembuka')
  const startRef = useRef(Date.now())
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [pembukaan, setPembukaan] = useState<AmalanItem[]>([])

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
        if (data?.length > 0) setPembukaan(data.filter(d => d.aktif !== false))
      })
      .catch(() => {})
  }, [])

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
      setAiReply('Maaf, tidak dapat menyambung ke AI. Sila cuba lagi.')
      setSubPhase('ai_done')
    } finally {
      setLoading(false)
    }
  }

  function handleSelesai() {
    const khafiMins = Math.round((Date.now() - startRef.current) / 60000)
    onComplete(khafiMins)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#8a7a65] text-sm hover:text-[#e8dcc8] transition-colors">
          &larr; Kembali
        </button>
        <p className="font-serif text-[#a78bfa] text-sm">Zikir Khafi</p>
        <div className="w-16" />
      </div>

      {/* Sub-phase: pembuka (bacaan dari Supabase + 3× Al-Fatihah) */}
      {subPhase === 'pembuka' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="font-serif text-[#a78bfa] text-lg">Bacaan Pembuka Zikir Khafi</p>
            <p className="text-[#8a7a65] text-xs">Baca sebelum memulakan zikir hati</p>
          </div>

          {/* Kandungan dari Supabase (Nine isi jenis=zikir_khafi) */}
          {pembukaan.length > 0 && (
            <div className="space-y-3">
              {pembukaan.map(item => <BacaanCard key={item.id} item={item} accent="#a78bfa" />)}
            </div>
          )}

          {/* 3× Al-Fatihah (sentiasa ada) */}
          <Fasa4 onDone={() => {
            startRef.current = Date.now()
            setSubPhase('berzikir')
          }} />
        </div>
      )}

      {/* Iframe — hanya tunjuk selepas pembuka selesai */}
      {subPhase !== 'pembuka' && (
        <div className="rounded-2xl overflow-hidden border border-[#a78bfa30]"
          style={{ height: 'calc(100dvh - 360px)', minHeight: '380px' }}>
          <iframe
            src="https://zikirkhafi.lovable.app"
            title="Zikir Khafi"
            className="w-full h-full border-0"
            allow="vibrate; autoplay"
            loading="lazy"
          />
        </div>
      )}

      {/* Sub-phase: berzikir */}
      {subPhase === 'berzikir' && (
        <button onClick={() => setSubPhase('refleksi')}
          className="w-full py-3.5 bg-[#a78bfa] text-[#060d16] font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
          ✓ Sudah Berzikir — Mulakan Refleksi
        </button>
      )}

      {/* Sub-phase: refleksi */}
      {subPhase === 'refleksi' && (
        <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-5 space-y-5">
          <div>
            <p className="text-[#a78bfa] font-serif text-base">✦ Refleksi Diri</p>
            <p className="text-[#8a7a65] text-xs mt-1">Luangkan sejenak untuk muhasabah pengalaman zikir anda.</p>
          </div>

          {REFLEKSI_SOALAN.map(s => (
            <div key={s.id} className="space-y-2">
              <p className="text-[#e8dcc8] text-sm leading-relaxed">{s.soalan}</p>
              <div className="space-y-1.5">
                {s.pilihan.map(p => (
                  <button key={p} onClick={() => setAnswers(prev => ({ ...prev, [s.id]: p }))}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all',
                      answers[s.id] === p
                        ? 'border-[#a78bfa] bg-[#a78bfa15] text-[#a78bfa]'
                        : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                    )}>
                    {p}
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
                Menganalisis...
              </>
            ) : 'Hantar Refleksi →'}
          </button>
        </div>
      )}

      {/* Sub-phase: ai_done */}
      {subPhase === 'ai_done' && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-5 space-y-3">
            <p className="text-[#a78bfa] text-xs font-medium uppercase tracking-wider">Tindak Balas Pembimbing ✦</p>
            <p className="text-[#e8dcc8] text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{aiReply}</p>
          </div>
          <button onClick={handleSelesai}
            className="w-full py-4 font-semibold rounded-2xl text-[#060d16] hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' }}>
            ✦ Selesai Sesi Hari Ini
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onStartJahar, onStartKhafi, user }: { onStartJahar: () => void; onStartKhafi: () => void; user: { id: string } | null }) {
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

      {/* Two independent entry cards */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-[#c9a96e] uppercase tracking-wider px-1">Pilih Amalan</p>
        <button onClick={onStartJahar}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-[#60a5fa30] bg-[#60a5fa08] hover:bg-[#60a5fa12] hover:border-[#60a5fa50] transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-[#60a5fa15] border border-[#60a5fa30] flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🔵</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#60a5fa] font-serif text-base font-medium">Zikir Jahar</p>
            <p className="text-[#8a7a65] text-xs mt-0.5">Bacaan Pembuka, Zikir Berlafaz, Doa</p>
            <p className="text-[#60a5fa60] text-xs mt-1">Jumlah: {stats.totalJahar.toLocaleString()}x</p>
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
            <p className="text-[#8a7a65] text-xs mt-0.5">Zikir hati — sync degupan jantung</p>
            <p className="text-[#a78bfa60] text-xs mt-1">
              {stats.totalKhafiMins >= 60
                ? `${Math.floor(stats.totalKhafiMins / 60)}j ${stats.totalKhafiMins % 60}m`
                : `${stats.totalKhafiMins} min`} terkumpul
            </p>
          </div>
          <span className="text-[#a78bfa] text-lg">›</span>
        </button>
      </div>
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

      <div className="flex items-center justify-center gap-2 py-4 text-[#8a7a65]">
        <span className="text-xs">📖 Log kehadiran & rakaman khataman</span>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1e2d40] border border-[#2a3d55]">Akan Datang</span>
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
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isTalqin = user?.talqin_completed === true

  const [activeTab, setActiveTab] = useState<AmalanTab>('zikir')
  const [phase, setPhase] = useState<SessionPhase>('dashboard')
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

  function handleDoaDone() {
    // Selesai Jahar — auto-navigate terus ke Zikir Khafi sebagai sambungan amalan
    setPhase('khafi')
  }

  function handleKhafiComplete(mins: number) {
    setKhafiMins(mins)
    saveSession({
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

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-3xl text-[#c9a96e] leading-none">الأَمَل</p>
          <h1 className="font-serif text-xl text-[#e8dcc8] mt-1">Amalan TQN</h1>
          <p className="text-[#8a7a65] text-xs">Tazkiyatun Nafs — Penyucian Jiwa</p>
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
            Memuatkan kandungan dari Supabase...
          </div>
        )}


        {phase === 'dashboard' && (
          <Dashboard onStartJahar={() => setPhase(1)} onStartKhafi={() => setPhase('khafi')} user={user} />
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
