import { useEffect, useRef, useState } from 'react'

// Irama: AL(800ms) - LAH(400ms) - HU(400ms) - Jeda(600ms) = 2200ms/kitaran
const RHYTHM = [
  { suku: 'AL',  arab: 'اَل',   ms: 800, scale: 1.35, opacity: 1.0,  color: '#a78bfa', glow: '167,139,250' },
  { suku: 'LAH', arab: 'لَاه',  ms: 400, scale: 1.15, opacity: 0.85, color: '#c9a96e', glow: '201,169,110' },
  { suku: 'HU',  arab: 'هُو',   ms: 400, scale: 1.0,  opacity: 0.7,  color: '#60a5fa', glow: '96,165,250'  },
  { suku: '',    arab: 'اللَّه', ms: 600, scale: 0.88, opacity: 0.4,  color: '#a78bfa', glow: '167,139,250' },
] as const

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

interface Props {
  isRunning: boolean
}

export function HeartbeatZikir({ isRunning }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const phase = RHYTHM[phaseIdx]
  const nextPhase = RHYTHM[(phaseIdx + 1) % RHYTHM.length]

  // Lerp scale dan opacity dalam fasa semasa menggunakan RAF
  useEffect(() => {
    if (!isRunning) {
      setProgress(0)
      return
    }
    startRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const p = Math.min(elapsed / phase.ms, 1)
      setProgress(easeInOut(p))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phaseIdx, isRunning])

  // Cycle fasa mengikut ms setiap fasa
  useEffect(() => {
    if (!isRunning) {
      setPhaseIdx(0)
      setProgress(0)
      return
    }
    timeoutRef.current = setTimeout(() => {
      setPhaseIdx(i => (i + 1) % RHYTHM.length)
      setProgress(0)
    }, phase.ms)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [phaseIdx, isRunning])

  // Nilai semasa berdasarkan interpolasi fasa → fasa seterusnya
  const curScale   = phase.scale   + (nextPhase.scale   - phase.scale)   * progress
  const curOpacity = phase.opacity + (nextPhase.opacity - phase.opacity) * progress
  const curColor   = phase.color
  const curGlow    = phase.glow

  const size = 220 // px

  return (
    <div className="flex flex-col items-center gap-4">

      {/* ── Bulatan Degupan ───────────────────────────────────────────── */}
      <div style={{ width: size, height: size, position: 'relative' }} className="flex items-center justify-center">

        {/* Glow luar — paling besar */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${curGlow},${curOpacity * 0.18}) 0%, rgba(${curGlow},0) 70%)`,
          transform: `scale(${isRunning ? curScale * 1.6 : 0.7})`,
          transition: 'transform 0.15s ease-out',
          pointerEvents: 'none',
        }} />

        {/* Cincin tengah */}
        <div style={{
          position: 'absolute',
          inset: '12%',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${curGlow},${curOpacity * 0.12}) 0%, rgba(${curGlow},${curOpacity * 0.3}) 50%, rgba(${curGlow},0) 100%)`,
          transform: `scale(${isRunning ? curScale * 1.25 : 0.6})`,
          transition: 'transform 0.12s ease-out',
          pointerEvents: 'none',
        }} />

        {/* Bulatan utama */}
        <div style={{
          position: 'absolute',
          inset: '22%',
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, rgba(${curGlow},${curOpacity * 0.85}) 0%, rgba(${curGlow},${curOpacity * 0.5}) 50%, rgba(${curGlow},${curOpacity * 0.15}) 100%)`,
          border: `1.5px solid rgba(${curGlow},${curOpacity * 0.7})`,
          transform: `scale(${isRunning ? curScale : 0.65})`,
          transition: 'transform 0.12s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isRunning
            ? `0 0 ${20 * curOpacity}px rgba(${curGlow},${curOpacity * 0.5}), inset 0 0 ${10 * curOpacity}px rgba(${curGlow},${curOpacity * 0.2})`
            : 'none',
        }}>
          {/* Teks Arab di tengah */}
          <p
            dir="rtl"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: isRunning ? `${Math.round(size * 0.15 * curScale)}px` : `${size * 0.13}px`,
              color: isRunning ? curColor : '#a78bfa',
              opacity: isRunning ? curOpacity : 0.5,
              transition: 'opacity 0.2s ease',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {isRunning ? phase.arab : 'اللَّهُ'}
          </p>
        </div>
      </div>

      {/* ── Teks Suku Kata ───────────────────────────────────────────── */}
      <div className="flex items-center gap-4 h-8">
        {(['AL', 'LAH', 'HU'] as const).map(suku => {
          const isActive = isRunning && phase.suku === suku
          const colors = { AL: '#a78bfa', LAH: '#c9a96e', HU: '#60a5fa' }
          return (
            <span
              key={suku}
              style={{
                fontFamily: "'Lora', serif",
                fontSize: isActive ? '20px' : '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? colors[suku] : '#3a2e4a',
                opacity: isRunning ? (isActive ? 1 : 0.3) : 0.25,
                transition: 'all 0.15s ease',
                letterSpacing: '1px',
              }}
            >
              {suku}
            </span>
          )
        })}
      </div>

      {/* ── Gelombang Degupan (ECG-style) ───────────────────────────── */}
      {isRunning && (
        <HeartWave phaseIdx={phaseIdx} color={curColor} opacity={curOpacity} />
      )}
    </div>
  )
}

// ─── ECG-style heartwave SVG ──────────────────────────────────────────────────

function HeartWave({ phaseIdx, color, opacity }: { phaseIdx: number; color: string; opacity: number }) {
  const isActive = phaseIdx === 0 // AL = degupan

  const path = isActive
    ? 'M0,15 L25,15 L32,2 L39,28 L46,2 L53,15 L80,15'   // spike pada AL
    : 'M0,15 L25,15 L35,12 L45,15 L80,15'                // gelombang lembut

  return (
    <svg width="80" height="30" viewBox="0 0 80 30" style={{ opacity: opacity * 0.7 }}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'all 0.3s ease' }}
      />
    </svg>
  )
}
