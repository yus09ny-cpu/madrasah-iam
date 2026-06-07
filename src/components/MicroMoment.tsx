import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

// ─── Data ─────────────────────────────────────────────────────────────────────

const SITUATIONS = [
  {
    id: 'drive',
    label: 'Sebelum Memandu',
    icon: '🚗',
    niat: 'Perjalanan ini adalah amanah. Nyawa anda dan orang lain adalah titipan Allah. Setiap saat di jalan adalah tanggungjawab.\n\nNiat: Saya akan memandu dengan penuh tanggungjawab — perlahan, sabar, sedar.',
    extraZikir: false,
  },
  {
    id: 'meeting',
    label: 'Sebelum Mesyuarat',
    icon: '💼',
    niat: 'Kata-kata adalah amanah. Apa yang anda ucapkan dalam mesyuarat ini akan memberi kesan — kepada diri anda dan orang lain.\n\nNiat: Saya akan bercakap dengan jujur, mendengar dengan sabar, dan membawa manfaat.',
    extraZikir: false,
  },
  {
    id: 'convo',
    label: 'Sebelum Perbualan Sukar',
    icon: '💬',
    niat: 'Setiap manusia adalah hamba Allah. Dia juga ada hati yang mudah luka — sama seperti anda.\n\nNiat: Saya akan bercakap dengan lembut walaupun hati saya berat. Saya pilih kebenaran dengan kasih sayang.',
    extraZikir: false,
  },
  {
    id: 'decision',
    label: 'Sebelum Keputusan Besar',
    icon: '⚡',
    niat: 'Allah mengetahui apa yang tidak kita ketahui. Kita merancang, Allah yang menentukan yang terbaik.\n\nNiat: Saya serahkan keputusan ini kepada Allah selepas usaha terbaik saya. Tawakkal — bukan pasrah.',
    extraZikir: false,
  },
  {
    id: 'anger',
    label: 'Sebelum Marah',
    icon: '😤',
    niat: 'Kekuatan sebenar bukan pada orang yang kuat memukul — tapi yang mampu menahan marah.\n\nNafas. Allah melihat setiap detik ini. Syaitan menunggu anda untuk bergerak. Pilih sabar.',
    extraZikir: true,
  },
  {
    id: 'sleep',
    label: 'Sebelum Tidur',
    icon: '🌙',
    niat: 'Tidur adalah separuh kematian. Setiap malam anda menyerahkan diri kepada Allah — tidak tahu sama ada akan terjaga atau tidak.\n\nNiat: Saya mati dalam iman. Saya serahkan semua kepada Allah malam ini.',
    extraZikir: false,
  },
]

const ZIKIR_PERISAI = {
  arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
  rumi: "Bismillahi tawakkaltu 'alallah, la hawla wa la quwwata illa billah",
  meaning: 'Dengan nama Allah, aku bertawakkal kepada Allah. Tiada daya dan kekuatan melainkan dari Allah.',
}

const AUZU = {
  arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
  rumi: "A'uzubillahi minash shaytanir rajim",
  meaning: 'Aku berlindung kepada Allah dari syaitan yang direjam.',
}

const CHEAT_ANGER = {
  arabic: 'ثُمَّ لَآتِيَنَّهُم مِّن بَيْنِ أَيْدِيهِمْ وَمِنْ خَلْفِهِمْ وَعَنْ أَيْمَانِهِمْ وَعَن شَمَائِلِهِمْ',
  note: 'Syaitan berjanji datang dari semua penjuru untuk mencuri ketenangan anda. Kemarahan adalah pintunya yang paling mudah. Zikir adalah perisai anda.',
  source: 'Al-A\'raf: 17',
}

type Phase = 'select' | 'nafas' | 'niat' | 'zikir' | 'done'

// ─── Session Component ────────────────────────────────────────────────────────

function MicroSession({
  situation,
  onDone,
  onClose,
}: {
  situation: typeof SITUATIONS[0]
  onDone: () => void
  onClose: () => void
}) {
  const [phase, setPhase] = useState<Phase>('nafas')
  const [seconds, setSeconds] = useState(0)
  const [breathScale, setBreathScale] = useState(0.6)
  const breathPhaseRef = useRef(0) // 0=inhale, 1=hold, 2=exhale
  const PHASES_DURATION = { nafas: 15, niat: 20, zikir: 25 }

  const totalCurrent = PHASES_DURATION[phase as keyof typeof PHASES_DURATION] ?? 0

  useEffect(() => {
    if (phase === 'done') return
    const timer = setInterval(() => {
      setSeconds(s => {
        const next = s + 1
        if (next >= totalCurrent) {
          clearInterval(timer)
          if (phase === 'nafas') { setPhase('niat'); setSeconds(0) }
          else if (phase === 'niat') { setPhase('zikir'); setSeconds(0) }
          else if (phase === 'zikir') { setPhase('done'); onDone() }
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase])

  // Breathing animation for nafas phase
  useEffect(() => {
    if (phase !== 'nafas') return
    const BREATH = [
      { duration: 4000, targetScale: 1.0 },
      { duration: 2000, targetScale: 1.0 },
      { duration: 6000, targetScale: 0.6 },
    ]
    function nextBreath() {
      const cur = BREATH[breathPhaseRef.current]
      setBreathScale(cur.targetScale)
      breathPhaseRef.current = (breathPhaseRef.current + 1) % 3
      return cur.duration
    }
    const d = nextBreath()
    let timer: ReturnType<typeof setTimeout>
    function cycle() { timer = setTimeout(() => { nextBreath(); cycle() }, d) }
    cycle()
    return () => clearTimeout(timer)
  }, [phase])

  const progress = totalCurrent > 0 ? (seconds / totalCurrent) * 100 : 0
  const timeLeft = totalCurrent - seconds

  const phaseColors = { nafas: '#60a5fa', niat: '#c9a96e', zikir: '#a78bfa' }
  const phaseColor = phaseColors[phase as keyof typeof phaseColors] ?? '#c9a96e'

  return (
    <div className="space-y-5">
      {/* Phase indicator */}
      <div className="flex gap-1">
        {(['nafas', 'niat', 'zikir'] as const).map(p => (
          <div key={p} className="flex-1 h-1 rounded-full transition-all"
            style={{ backgroundColor: ['nafas', 'niat', 'zikir'].indexOf(p) <= ['nafas', 'niat', 'zikir'].indexOf(phase as Phase) ? phaseColor : '#1e2d40' }} />
        ))}
      </div>

      {/* Timer */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color: phaseColor }}>
          {phase === 'nafas' ? 'Fasa 1 — Nafas' : phase === 'niat' ? 'Fasa 2 — Niat' : 'Fasa 3 — Zikir Perisai'}
        </span>
        <span className="text-[#8a7a65] font-mono">{timeLeft}s</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-[#1e2d40] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${progress}%`, backgroundColor: phaseColor }} />
      </div>

      {/* Phase content */}
      {phase === 'nafas' && (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full transition-all duration-[4000ms] ease-in-out"
              style={{ backgroundColor: '#60a5fa15', transform: `scale(${breathScale * 1.1})` }} />
            <div className="absolute inset-6 rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out"
              style={{ backgroundColor: '#60a5fa10', border: '2px solid #60a5fa30', transform: `scale(${breathScale})` }}>
              <p className="text-[#60a5fa] text-xs text-center leading-tight">
                {breathPhaseRef.current === 0 ? 'Tarik...' : breathPhaseRef.current === 1 ? 'Tahan...' : 'Hembus...'}
              </p>
            </div>
          </div>
          <p className="text-[#8a7a65] text-sm text-center">Lepaskan semua tekanan. Hadirkan diri sepenuhnya.</p>
        </div>
      )}

      {phase === 'niat' && (
        <div className="space-y-3">
          <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl p-4">
            <p className="text-[#e8dcc8] text-sm leading-relaxed whitespace-pre-line">{situation.niat}</p>
          </div>
          {situation.id === 'anger' && (
            <div className="bg-[#060d16] border border-red-900/30 rounded-xl p-3 space-y-1.5">
              <p className="font-serif text-red-400 text-xs leading-loose text-right" dir="rtl">{CHEAT_ANGER.arabic}</p>
              <p className="text-[#8a7a65] text-xs leading-relaxed">{CHEAT_ANGER.note}</p>
              <p className="text-red-500/50 text-xs">— {CHEAT_ANGER.source}</p>
            </div>
          )}
        </div>
      )}

      {phase === 'zikir' && (
        <div className="space-y-3 text-center">
          {situation.extraZikir && (
            <div className="bg-[#060d16] border border-[#a78bfa20] rounded-xl p-3">
              <p className="font-serif text-[#a78bfa] text-sm leading-loose" dir="rtl">{AUZU.arabic}</p>
              <p className="text-[#8a7a65] text-xs mt-1 italic">{AUZU.meaning}</p>
            </div>
          )}
          <div className="bg-[#060d16] border border-[#a78bfa30] rounded-xl p-4 space-y-2">
            <p className="font-serif text-[#a78bfa] text-base leading-loose" dir="rtl">
              {ZIKIR_PERISAI.arabic}
            </p>
            <p className="text-[#8a7a65] text-xs italic">{ZIKIR_PERISAI.rumi}</p>
            <p className="text-[#8a7a65] text-xs leading-relaxed">{ZIKIR_PERISAI.meaning}</p>
          </div>
          <p className="text-[#8a7a65] text-xs">Ulangi dengan hati yang hadir...</p>
        </div>
      )}

      {phase === 'done' && (
        <div className="text-center space-y-3 py-2">
          <p className="text-3xl">✦</p>
          <p className="font-serif text-[#c9a96e] text-xl">Anda sudah bersedia.</p>
          <p className="text-[#8a7a65] text-sm">Bismillah — bergeraklah dengan nama Allah.</p>
          <button onClick={onClose}
            className="w-full py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors mt-2">
            Tutup & Bergerak
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main MicroMoment ─────────────────────────────────────────────────────────

export default function MicroMoment() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<typeof SITUATIONS[0] | null>(null)

  async function handleDone() {
    if (!user) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('micro_moments') as any).insert({
        user_id: user.id,
        situation: selected?.id ?? 'unknown',
        completed: true,
        duration_seconds: 60,
      })
    } catch { /* table not yet created */ }
  }

  function handleClose() {
    setOpen(false)
    setSelected(null)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 md:bottom-20 right-16 z-[99] w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-[#c9a96e30] transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #c9a96e, #e2c89a)' }}
        title="Satu Minit Sebelum Bergerak"
      >
        <span className="text-[#060d16] font-serif text-xl leading-none select-none">✦</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 bg-[#060d16]/85 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e2d40]">
              <div>
                <p className="font-serif text-[#c9a96e] text-base">✦ Satu Minit Sebelum Bergerak</p>
                <p className="text-[#8a7a65] text-xs mt-0.5">Hadirkan diri. Tetapkan niat.</p>
              </div>
              <button onClick={handleClose} className="text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {/* Situation selection */}
              {!selected && (
                <div className="space-y-3">
                  <p className="text-[#8a7a65] text-xs text-center">Pilih situasi anda sekarang:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SITUATIONS.map(s => (
                      <button key={s.id} onClick={() => setSelected(s)}
                        className="flex items-center gap-2.5 p-3 bg-[#060d16] border border-[#1e2d40] rounded-xl text-left hover:border-[#c9a96e40] hover:bg-[#c9a96e08] transition-all">
                        <span className="text-xl flex-shrink-0">{s.icon}</span>
                        <span className="text-[#e8dcc8] text-xs font-medium leading-snug">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3 text-center">
                    <p className="font-serif text-[#c9a96e] text-xs leading-loose" dir="rtl">
                      يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ
                    </p>
                    <p className="text-[#8a7a65] text-[10px] mt-1">— Al-Hasyr: 18</p>
                  </div>
                </div>
              )}

              {/* Session */}
              {selected && (
                <MicroSession
                  situation={selected}
                  onDone={handleDone}
                  onClose={handleClose}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
