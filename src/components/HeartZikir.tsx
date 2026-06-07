import { useEffect, useState, useRef } from 'react'

// Irama Al-lah-hu: AL(600ms) → LAH(400ms) → HU(300ms) → ulang
// Seperti degupan: DUB(besar) - dub(sederhana) - du(kecil)
const IRAMA = [
  { suku: 'AL',  ms: 600, scale: 1.25, opacity: 1.0,  color: '#a78bfa' },
  { suku: 'LAH', ms: 400, scale: 1.08, opacity: 0.85, color: '#c9a96e' },
  { suku: 'HU',  ms: 300, scale: 0.92, opacity: 0.7,  color: '#60a5fa' },
]

export function HeartZikir({ isRunning }: { isRunning: boolean }) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [scale, setScale] = useState(1)
  const [color, setColor] = useState('#a78bfa')
  const [activeSuku, setActiveSuku] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const aliveRef = useRef(false)

  useEffect(() => {
    if (!isRunning) {
      clearTimeout(timerRef.current)
      aliveRef.current = false
      setScale(1)
      setActiveSuku('')
      setColor('#a78bfa')
      setPhaseIdx(0)
      return
    }

    aliveRef.current = true
    let current = 0

    const runPhase = () => {
      if (!aliveRef.current) return
      const p = IRAMA[current]
      setPhaseIdx(current)
      setColor(p.color)
      setActiveSuku(p.suku)
      setScale(p.scale)
      timerRef.current = setTimeout(() => {
        current = (current + 1) % IRAMA.length
        runPhase()
      }, p.ms)
    }

    runPhase()
    return () => {
      aliveRef.current = false
      clearTimeout(timerRef.current)
    }
  }, [isRunning])

  const size = 140

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>

      {/* ── Jantung SVG ── */}
      <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Glow radial */}
        <div style={{
          position: 'absolute',
          width: `${size * scale * 1.4}px`,
          height: `${size * scale * 1.4}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
          transition: 'all 0.12s ease-out',
          filter: 'blur(18px)',
          pointerEvents: 'none',
        }} />

        {/* SVG jantung */}
        <svg
          width={`${size * scale}`}
          height={`${size * scale}`}
          viewBox="0 0 100 90"
          style={{
            transition: 'all 0.12s ease-out',
            filter: `drop-shadow(0 0 ${Math.round(10 * scale)}px ${color}CC)`,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <defs>
            <radialGradient id="hzGrad" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </radialGradient>
          </defs>
          <path
            d="M50 85 C50 85 5 55 5 28 C5 12 18 2 32 2 C40 2 47 6 50 12 C53 6 60 2 68 2 C82 2 95 12 95 28 C95 55 50 85 50 85Z"
            fill="url(#hzGrad)"
            opacity={isRunning ? 0.92 : 0.35}
            style={{ transition: 'opacity 0.2s ease' }}
          />
          {/* Teks اللَّه */}
          <text
            x="50" y="44"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="17"
            fontFamily="'Lora', Georgia, serif"
            fill="white"
            opacity={isRunning ? 0.95 : 0.5}
          >
            اللَّه
          </text>
        </svg>

        {/* Suku kata aktif — bawah jantung */}
        {isRunning && activeSuku && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            fontSize: '12px',
            color,
            fontWeight: 700,
            letterSpacing: '3px',
            transition: 'color 0.12s',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {activeSuku}
          </div>
        )}
      </div>

      {/* ── Irama teks ── */}
      {isRunning ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
          {IRAMA.map((p, i) => {
            const active = activeSuku === p.suku
            return (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontSize: active ? '17px' : '11px',
                  color: active ? p.color : '#3a2e4a',
                  fontWeight: active ? 700 : 400,
                  transition: 'all 0.1s ease',
                  fontFamily: 'system-ui, sans-serif',
                  letterSpacing: '1px',
                }}>
                  {p.suku}
                </span>
                {i < IRAMA.length - 1 && (
                  <span style={{ color: '#3a2e4a', fontSize: '10px' }}>·</span>
                )}
              </span>
            )
          })}
        </div>
      ) : (
        <div style={{ height: '24px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#4a3a26', fontSize: '11px', letterSpacing: '3px', fontFamily: 'system-ui' }}>
            AL · LAH · HU
          </span>
        </div>
      )}

      {/* ── Gelombang ECG ── */}
      <ECGWave color={color} scale={scale} isRunning={isRunning} />
    </div>
  )
}

// ─── ECG Wave ─────────────────────────────────────────────────────────────────

function ECGWave({ color, scale, isRunning }: { color: string; scale: number; isRunning: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const offsetRef = useRef(0)
  const colorRef = useRef(color)
  const scaleRef = useRef(scale)

  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { scaleRef.current = scale }, [scale])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!isRunning) {
      cancelAnimationFrame(animRef.current)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      ctx.beginPath()
      ctx.strokeStyle = colorRef.current + '90'
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'

      for (let x = 0; x < w; x++) {
        const t = ((x + offsetRef.current) / w) * Math.PI * 6
        let y = h / 2
        const mod = t % (Math.PI * 2)

        if (mod < 0.3) {
          // P wave
          y -= Math.sin(mod * 10) * 7
        } else if (mod > 1.3 && mod < 1.55) {
          // QRS spike (degupan)
          y -= Math.sin((mod - 1.3) * 37.7) * (28 * Math.max(0.6, scaleRef.current - 0.3))
        } else if (mod > 2.0 && mod < 2.5) {
          // T wave
          y -= Math.sin((mod - 2.0) * 6.3) * 10
        }

        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }

      ctx.stroke()
      offsetRef.current += 2.5
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [isRunning])

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={56}
      style={{ opacity: isRunning ? 0.65 : 0, maxWidth: '100%', transition: 'opacity 0.3s' }}
    />
  )
}
