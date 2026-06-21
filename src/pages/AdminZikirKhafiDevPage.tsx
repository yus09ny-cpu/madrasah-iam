/**
 * PROTOTYPE / SIMULASI SEPARA — tap detection adalah sebenar (dikira dari
 * timestamp tap pengguna), tapi BLE hex log dalam panel bawah masih emulasi
 * protokol GATT 0x2A37, bukan sambungan sensor sebenar.
 *
 * BpmSmoother dan computeCoherence diadaptasi dari repo Sahamhalal/zikirkhafi
 * (src/routes/index.tsx). Coherence dikira menggunakan formula RMSSD sebenar,
 * bukan formula slider hardcoded.
 *
 * Label dalaman (Yad Dasht, Sultan-ul-Adhkar, Dhikr-e-Qalbi) adalah istilah
 * tradisi Naqshbandi/Parsi — JANGAN dedahkan kepada pengguna awam sehingga
 * ketepatan dan kesesuaian istilah disahkan oleh Nine.
 *
 * Akses: Master Admin sahaja.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft, FlaskConical, RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

// ---------------------------------------------------------------------------
// BpmSmoother — median window 5 + adaptive EMA (dari zikirkhafi repo)
// ---------------------------------------------------------------------------
class BpmSmoother {
  private window: number[] = []
  private ema: number | null = null
  constructor(private medianWindow = 5, private baseAlpha = 0.2) {}

  add(sample: number): number {
    this.window.push(sample)
    if (this.window.length > this.medianWindow) this.window.shift()
    const sorted = [...this.window].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    if (this.ema === null) { this.ema = median; return this.ema }
    const delta = Math.abs(median - this.ema)
    const alpha = delta > 15 ? this.baseAlpha * 0.3 : this.baseAlpha
    this.ema = alpha * median + (1 - alpha) * this.ema
    return this.ema
  }

  reset() {
    this.window = []
    this.ema = null
  }
}

// ---------------------------------------------------------------------------
// computeCoherence — RMSSD-derived formula (dari zikirkhafi repo)
// Coherence = 0 (chaotic) → 1 (perfectly coherent)
// ---------------------------------------------------------------------------
function computeCoherence(intervalsMs: number[]): number {
  if (intervalsMs.length < 4) return 0
  const mean = intervalsMs.reduce((a, b) => a + b, 0) / intervalsMs.length
  let sq = 0
  for (let i = 1; i < intervalsMs.length; i++) {
    const d = intervalsMs[i] - intervalsMs[i - 1]
    sq += d * d
  }
  const rmssd = Math.sqrt(sq / (intervalsMs.length - 1))
  return Math.max(0, Math.min(1, 1 - rmssd / mean / 0.15))
}

// ---------------------------------------------------------------------------
// Access guard
// ---------------------------------------------------------------------------
function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-600/30 flex items-center justify-center">
        <Shield size={24} className="text-red-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl text-white font-semibold">Akses Ditolak</h1>
        <p className="text-gray-500 text-sm max-w-xs">Halaman ini hanya untuk Master Admin.</p>
      </div>
      <button
        onClick={() => navigate('/admin')}
        className="px-5 py-2.5 rounded-xl text-sm border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 transition-colors"
      >
        ← Kembali ke Admin Panel
      </button>
    </div>
  )
}

export default function AdminZikirKhafiDevPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  if (!user || user.role !== 'master_admin') return <AccessDenied />
  return <ZikirKhafiSimulator onBack={() => navigate('/admin')} />
}

// ---------------------------------------------------------------------------
// Simulator utama
// ---------------------------------------------------------------------------
function ZikirKhafiSimulator({ onBack }: { onBack: () => void }) {
  // --- Tap-derived state ---
  const [tapBpm, setTapBpm] = useState<number | null>(null)   // raw dari tap terakhir
  const [bpm, setBpm] = useState(60)                           // smoothed untuk animasi
  const [coherence, setCoherence] = useState(0)               // 0–100 dari RMSSD
  const [currentRr, setCurrentRr] = useState(0)               // ms dari 60000/bpm
  const [tapCount, setTapCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  // --- Refs untuk animation loop (zero-lag) ---
  const tapsRef = useRef<number[]>([])
  const intervalsRef = useRef<number[]>([])
  const smootherRef = useRef(new BpmSmoother())
  const bpmRef = useRef(60)
  const rrRef = useRef(1000)
  const coherenceRef = useRef(0)

  // --- Canvas refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pacerInnerRef = useRef<HTMLDivElement>(null)
  const pacerOuterRef = useRef<HTMLDivElement>(null)
  const pacerOuterLabelRef = useRef<HTMLSpanElement>(null)
  const heartSvgRef = useRef<SVGSVGElement>(null)

  // Julat sasaran Zikir Khafi
  const inZikirRange = tapBpm !== null && tapBpm >= 40 && tapBpm <= 60

  // ---------------------------------------------------------------------------
  // Tap handler — kira interval antara tap, smooth BPM, compute coherence sebenar
  // ---------------------------------------------------------------------------
  const handleTap = useCallback(() => {
    const now = performance.now()

    // Reset jika gap > 2500ms (pengguna berhenti)
    if (tapsRef.current.length && now - tapsRef.current[tapsRef.current.length - 1] > 2500) {
      tapsRef.current = []
      intervalsRef.current = []
    }

    tapsRef.current.push(now)
    if (tapsRef.current.length > 8) tapsRef.current.shift()
    setTapCount(tapsRef.current.length)

    if (tapsRef.current.length >= 2) {
      const diffs: number[] = []
      for (let i = 1; i < tapsRef.current.length; i++) {
        diffs.push(tapsRef.current[i] - tapsRef.current[i - 1])
      }
      intervalsRef.current = diffs.slice(-7)

      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
      const rawBpm = Math.round(60000 / avg)

      if (rawBpm >= 30 && rawBpm <= 200) {
        const smoothed = Math.round(smootherRef.current.add(rawBpm))
        setTapBpm(rawBpm)
        setBpm(smoothed)
        bpmRef.current = smoothed

        const rr = Math.round(60000 / smoothed)
        rrRef.current = rr
        setCurrentRr(rr)

        const coh = Math.round(computeCoherence(intervalsRef.current) * 100)
        coherenceRef.current = coh
        setCoherence(coh)
      }
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
  }, [])

  // Fine-adjust BPM dengan butang +/-
  const adjustBpm = useCallback((delta: number) => {
    setBpm(prev => {
      const next = Math.max(30, Math.min(200, prev + delta))
      bpmRef.current = next
      const rr = Math.round(60000 / next)
      rrRef.current = rr
      setCurrentRr(rr)
      return next
    })
    setTapBpm(prev => prev !== null ? Math.max(30, Math.min(200, prev + delta)) : prev)
  }, [])

  // Reset semua data tap
  const handleReset = useCallback(() => {
    tapsRef.current = []
    intervalsRef.current = []
    smootherRef.current.reset()
    setTapBpm(null)
    setTapCount(0)
    setBpm(60)
    setCoherence(0)
    setCurrentRr(0)
    bpmRef.current = 60
    rrRef.current = 1000
    coherenceRef.current = 0
  }, [])

  // ---------------------------------------------------------------------------
  // BLE hex log emulasi — kini guna bpmRef/rrRef dari tap sebenar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      if (bpmRef.current === 60 && rrRef.current === 1000) return // belum ada tap
      const flags = 0x16
      const hrByte = bpmRef.current
      const rawRrUnits = Math.round((rrRef.current * 1024.0) / 1000.0)
      const rrByteLow = rawRrUnits & 0xff
      const rrByteHigh = (rawRrUnits >> 8) & 0xff
      const toHex = (v: number) => '0x' + v.toString(16).toUpperCase().padStart(2, '0')
      const timestamp = new Date().toLocaleTimeString()
      const newLog = `[${timestamp}] RX: ${toHex(flags)} ${toHex(hrByte)} ${toHex(rrByteLow)} ${toHex(rrByteHigh)} (Decoded: ${rrRef.current}ms)`
      setLogs(prev => [newLog, ...prev].slice(0, 5))
    }, 1100)
    return () => clearInterval(id)
  }, [])

  // ---------------------------------------------------------------------------
  // Canvas animation — amplitude/jitter kini didorong oleh coherenceRef (bukan slider)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animationFrameId: number
    let phase = 0
    let breathCycle = 0
    let lastBeatTime = performance.now()
    let beatCounter = 0
    let innerScale = 1.0

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const animate = () => {
      phase += 0.05
      const width = canvas.width / (window.devicePixelRatio || 1)
      const height = canvas.height / (window.devicePixelRatio || 1)
      const cy = height / 2

      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke()

      // Amplitude & jitter didorong oleh coherence sebenar dari tap
      const coh = coherenceRef.current               // 0–100
      const amplitude = 8 + (coh / 100) * 49        // rendah bila tiada tap, naik dengan coherence
      const smoothFactor = coh / 100
      const jitterStrength = ((100 - coh) / 100) * 14

      ctx.beginPath()
      ctx.lineWidth = 3
      if (coh >= 86) ctx.strokeStyle = '#f59e0b'
      else if (coh >= 71) ctx.strokeStyle = '#10b981'
      else ctx.strokeStyle = '#3b82f6'
      ctx.lineJoin = 'round'

      for (let i = 0; i < width; i++) {
        const theta = (i / width) * Math.PI * 6 - phase
        let y = cy + Math.sin(theta) * amplitude
        if (jitterStrength > 0) {
          const noise = Math.sin(theta * 7.5 + phase * 3) * jitterStrength * (1.1 - smoothFactor)
          const fine = (Math.random() - 0.5) * ((100 - coh) * 0.15)
          y += noise + fine
        }
        i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y)
      }
      ctx.stroke()

      // Beat pulse — guna bpmRef dari tap
      const now = performance.now()
      const beatInterval = 60000 / bpmRef.current
      if (now - lastBeatTime >= beatInterval) {
        lastBeatTime = now
        beatCounter++
        innerScale = 1.35
        const isOdd = beatCounter % 2 !== 0
        const innerEl = pacerInnerRef.current
        const heartSvg = heartSvgRef.current
        if (innerEl && heartSvg) {
          if (isOdd) {
            innerEl.className = 'absolute w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-75'
            heartSvg.setAttribute('class', 'w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-all duration-75')
          } else {
            innerEl.className = 'absolute w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-75'
            heartSvg.setAttribute('class', 'w-8 h-8 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-75')
          }
        }
      } else {
        innerScale += (0.95 - innerScale) * 0.15
      }
      if (pacerInnerRef.current) pacerInnerRef.current.style.transform = `scale(${innerScale})`

      // Breath pacer
      breathCycle += 0.005
      const breathProgress = (Math.sin(breathCycle) + 1) / 2
      if (pacerOuterRef.current) pacerOuterRef.current.style.transform = `scale(${0.85 + breathProgress * 0.4})`
      if (pacerOuterLabelRef.current && pacerOuterRef.current) {
        if (breathProgress > 0.6) {
          pacerOuterLabelRef.current.textContent = 'Breath State: Habs (Hold)'
          pacerOuterLabelRef.current.className = 'text-xs text-amber-300 font-medium uppercase tracking-widest mb-3 transition-colors duration-300'
          pacerOuterRef.current.className = 'absolute inset-0 rounded-full bg-amber-500/5 border border-amber-500/35 transition-colors duration-500'
        } else {
          pacerOuterLabelRef.current.textContent = 'Breath State: Natural Release'
          pacerOuterLabelRef.current.className = 'text-xs text-emerald-400 font-medium uppercase tracking-widest mb-3 transition-colors duration-300'
          pacerOuterRef.current.className = 'absolute inset-0 rounded-full bg-emerald-500/5 border border-emerald-500/20 transition-colors duration-500'
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', resizeCanvas) }
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden bg-[#0b0f19] text-gray-100 font-sans">
      <style>{`
        .zk-glass { background: rgba(17,24,39,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
        .zk-gold-glow { box-shadow: 0 0 20px rgba(212,163,89,0.12); }
        .zk-scroll::-webkit-scrollbar { width: 6px; }
        .zk-scroll::-webkit-scrollbar-track { background: transparent; }
        .zk-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
        .tap-circle { -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; }
      `}</style>

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Sufi Biofeedback Simulator</h1>
              <p className="text-xs text-gray-400">Naqshbandi Dhikr al-Qalb · Tap-Based HRV Detection</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
              <FlaskConical size={11} />
              PROTOTYPE · DEV ONLY
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
              <span className="w-2 h-2 mr-1.5 bg-emerald-400 rounded-full animate-ping" />
              BLE Emulation Active
            </span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── KIRI: Tap pad + BLE log (5 cols) ── */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Tap-with-your-pulse panel */}
          <div className="zk-glass rounded-2xl p-6 zk-gold-glow flex flex-col items-center gap-5">

            <div className="w-full text-left">
              <h2 className="text-lg font-medium text-amber-300 mb-1">Tap With Your Pulse</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Tap ikut detik nadi anda. Sistem akan detect BPM dan kira Coherence secara sebenar.
                Sasaran: <span className="text-emerald-400 font-semibold">40–60 BPM</span> untuk Zikir Khafi.
              </p>
            </div>

            {/* BPM display + tap circle + +/- */}
            <div className="flex items-center gap-4">
              {/* Kurang */}
              <button
                onClick={() => adjustBpm(-1)}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition text-xl select-none tap-circle"
                aria-label="Kurang BPM"
              >
                −
              </button>

              {/* Bulatan tap utama */}
              <button
                onPointerDown={handleTap}
                className="tap-circle relative rounded-full flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                style={{
                  width: 200,
                  height: 200,
                  background: inZikirRange
                    ? 'radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)'
                    : tapBpm !== null
                    ? 'radial-gradient(circle at center, rgba(245,158,11,0.12), rgba(245,158,11,0) 70%)'
                    : 'radial-gradient(circle at center, rgba(245,235,210,0.08), rgba(245,235,210,0) 70%)',
                  border: inZikirRange
                    ? '1px solid rgba(16,185,129,0.5)'
                    : tapBpm !== null
                    ? '1px solid rgba(245,158,11,0.4)'
                    : '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <span className={`text-4xl font-extralight tracking-widest ${
                  inZikirRange ? 'text-emerald-300' : tapBpm !== null ? 'text-amber-200' : 'text-gray-500'
                }`}>
                  {tapBpm ?? '—'}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
                  {tapBpm ? 'BPM' : 'Tap to detect'}
                </span>
              </button>

              {/* Tambah */}
              <button
                onClick={() => adjustBpm(1)}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition text-xl select-none tap-circle"
                aria-label="Tambah BPM"
              >
                +
              </button>
            </div>

            {/* Tap counter */}
            <p className="text-[11px] text-gray-500 text-center">
              {tapCount < 2
                ? 'Mula tap untuk detect nadi anda...'
                : tapCount < 5
                ? `${tapCount} taps · teruskan untuk bacaan lebih stabil`
                : `${tapCount} taps · bacaan stabil`}
            </p>

            {/* Zone feedback */}
            {tapBpm !== null && (
              <div className={`text-xs font-medium px-4 py-1.5 rounded-full border transition-all ${
                inZikirRange
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : tapBpm < 40
                  ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              }`}>
                {inZikirRange
                  ? '✓ Dalam julat Zikir Khafi (40–60 BPM)'
                  : tapBpm < 40
                  ? `↑ Terlalu perlahan — sasaran 40–60 BPM`
                  : `↓ Terlalu laju — perlahan sedikit`}
              </div>
            )}

            {/* Reset */}
            {tapCount > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                <RotateCcw size={11} />
                Reset tap data
              </button>
            )}

            {/* Divider + heart orb */}
            <div className="w-full pt-4 border-t border-gray-800/60 flex flex-col items-center">
              <span ref={pacerOuterLabelRef} className="text-xs text-amber-200/70 uppercase tracking-widest mb-3">
                Breath State: Habs (Hold)
              </span>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div ref={pacerOuterRef} className="absolute inset-0 rounded-full bg-emerald-500/5 border border-emerald-500/20 transition-transform duration-500 ease-out" />
                <div ref={pacerInnerRef} className={`absolute w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-75 ${
                  inZikirRange
                    ? 'bg-emerald-500/20 border-2 border-emerald-500/60'
                    : 'bg-amber-500/10 border-2 border-amber-500/40'
                }`}>
                  <svg ref={heartSvgRef} className={`w-8 h-8 transition-all duration-200 ${
                    inZikirRange
                      ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                      : 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  }`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              </div>

              <div className="mt-4 flex gap-5 text-[10px] uppercase tracking-wider text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/60" />
                  <span>Beat 1: AL-LLAHHU</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/60" />
                  <span>Beat 2: ALLAH</span>
                </div>
              </div>

              <p className="text-xs text-center text-gray-400 mt-4 max-w-xs italic leading-relaxed">
                Hold your breath (Habs) or release naturally. Keep your lips closed and tongue silent, focusing your entire attention inward on synchronizing with the alternating colored heart glows.
              </p>
            </div>
          </div>

          {/* BLE log — emulasi, kini guna data dari tap sebenar */}
          <div className="zk-glass rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-emerald-400 mb-1 flex items-center gap-2">
                <span className="font-mono text-sm">&lt;/&gt;</span>
                Live Binary GATT Parser (0x2A37)
              </h2>
              <p className="text-xs text-gray-400 mb-1">
                BPM & R-R dikira dari tap sebenar — dikod semula sebagai paket BLE emulasi.
              </p>
              <p className="text-[10px] text-yellow-500/80 font-medium">
                ⚠ Format hex adalah EMULASI — bukan output sensor sebenar
              </p>
            </div>

            <div className="bg-black/60 rounded-xl p-4 font-mono text-xs text-emerald-300/90 border border-emerald-950/40 h-36 flex flex-col gap-1.5 overflow-y-auto zk-scroll">
              <div className="text-gray-500">{'// [Flags] [HR BPM] [R-R low] [R-R high]'}</div>
              {logs.length === 0 ? (
                <div className="text-gray-600 italic">Awaiting tap data...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx}><span className="text-gray-500">[Packet]</span> {log}</div>
                ))
              )}
            </div>

            <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800/80 text-xs space-y-2">
              <div className="font-bold text-gray-300">BLE Stream Breakdown:</div>
              <div className="grid grid-cols-12 gap-1 text-gray-400">
                <div className="col-span-3 text-amber-400 font-semibold">Byte 0 (Flags):</div>
                <div className="col-span-9">R-R presence flag (<code className="bg-gray-900 px-1 py-0.5 rounded">0x10</code>)</div>
                <div className="col-span-3 text-emerald-400 font-semibold">Byte 1 (BPM):</div>
                <div className="col-span-9">Heart beats per minute dari tap.</div>
                <div className="col-span-3 text-blue-400 font-semibold">Bytes 2-3 (R-R):</div>
                <div className="col-span-9">Raw intervals (1/1024s) → milliseconds.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KANAN: HUD metrics, canvas, milestones (7 cols) ── */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* HUD gauges */}
          <div className="grid grid-cols-3 gap-4">
            <div className="zk-glass rounded-2xl p-4 text-center">
              <span className="text-xs text-gray-400 block mb-1">Heart BPM</span>
              <span className={`text-3xl font-bold ${tapBpm ? 'text-white' : 'text-gray-600'}`}>
                {tapBpm ?? '—'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-1">
                {bpm !== tapBpm && tapBpm ? `Smooth: ${bpm}` : 'Dari tap'}
              </span>
            </div>
            <div className="zk-glass rounded-2xl p-4 text-center border-l-2 border-l-emerald-500">
              <span className="text-xs text-gray-400 block mb-1">Coherence Score</span>
              <span className={`text-3xl font-bold ${
                coherence >= 71 ? 'text-emerald-400' : coherence > 0 ? 'text-blue-400' : 'text-gray-600'
              }`}>
                {coherence > 0 ? `${coherence}%` : '—'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-1">RMSSD sebenar</span>
            </div>
            <div className="zk-glass rounded-2xl p-4 text-center">
              <span className="text-xs text-gray-400 block mb-1">R-R Interval</span>
              <span className={`text-2xl font-mono font-bold ${currentRr > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                {currentRr > 0 ? `${currentRr} ms` : '— ms'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-1.5">Beat-to-beat</span>
            </div>
          </div>

          {/* HRV waveform */}
          <div className="zk-glass rounded-2xl p-6 flex flex-col justify-between min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-medium text-white">Live Heart Rhythm Waveform (HRV)</h2>
                <p className="text-xs text-gray-400">
                  {tapBpm
                    ? 'Gelombang didorong oleh data tap sebenar — coherence RMSSD'
                    : 'Tap nadi anda untuk aktifkan waveform'}
                </p>
              </div>
              {/* Label dalaman — jangan tunjuk pengguna awam */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                coherence >= 86
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : coherence >= 71
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              }`}>
                {coherence >= 86
                  ? 'Stage 3: Yad Dasht'
                  : coherence >= 71
                  ? 'Stage 2: Sultan-ul-Adhkar'
                  : 'Stage 1: Dhikr-e-Qalbi'}
              </span>
            </div>

            <div className="relative w-full h-48 bg-black/40 rounded-xl overflow-hidden border border-gray-900">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {!tapBpm && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs text-gray-600 uppercase tracking-widest">Tap nadi anda untuk mula</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
              <span>Chaotic (Low Coherence)</span>
              <div className="flex gap-2 items-center">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  coherence >= 86 ? 'bg-amber-500' : coherence >= 71 ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                <span className="text-[11px]">Dhikr Resonant Wave</span>
              </div>
              <span>Coherent (High Coherence)</span>
            </div>
          </div>

          {/* Spiritual milestones — label dalaman */}
          <div className="zk-glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-amber-200">Sufi Spiritual Progression Milestones</h2>
              <span className="text-[10px] text-yellow-500/70 bg-yellow-900/20 border border-yellow-800/40 px-2 py-0.5 rounded-full">
                Label dalaman — dev only
              </span>
            </div>

            <div className="space-y-4">
              {/* Stage 1 */}
              <div className={`p-3.5 rounded-xl border transition-all duration-300 ${
                coherence < 71
                  ? 'border-blue-500/30 bg-blue-500/10 shadow-lg shadow-blue-500/5'
                  : 'border-gray-800 bg-gray-950/20 opacity-60'
              }`}>
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border ${
                      coherence < 71 ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>1</span>
                    <h3 className={`text-sm font-semibold ${coherence < 71 ? 'text-blue-300' : 'text-gray-300'}`}>
                      Stage 1: Dhikr-e-Qalbi (Conscious Effort)
                    </h3>
                  </div>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">Coherence &lt; 71%</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed pl-7">
                  The mind wanders constantly. You exert conscious effort to lock away your physical voice and focus solely on establishing the alternating silent heart beats.
                </p>
              </div>

              {/* Stage 2 */}
              <div className={`p-3.5 rounded-xl border transition-all duration-300 ${
                coherence >= 71 && coherence < 86
                  ? 'border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-500/5'
                  : 'border-gray-800 bg-gray-950/20 opacity-60'
              }`}>
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border ${
                      coherence >= 71 && coherence < 86 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>2</span>
                    <h3 className={`text-sm font-semibold ${coherence >= 71 && coherence < 86 ? 'text-emerald-300' : 'text-gray-300'}`}>
                      Stage 2: Sultan-ul-Adhkar (Resonating Presence)
                    </h3>
                  </div>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">Coherence 71%–85%</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed pl-7">
                  The practice runs automatically. The heart muscle pulses organically with the dual-color resonance under a highly stabilized nervous system.
                </p>
              </div>

              {/* Stage 3 */}
              <div className={`p-3.5 rounded-xl border transition-all duration-300 ${
                coherence >= 86
                  ? 'border-amber-500/30 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                  : 'border-gray-800 bg-gray-950/20 opacity-60'
              }`}>
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border ${
                      coherence >= 86 ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>3</span>
                    <h3 className={`text-sm font-semibold ${coherence >= 86 ? 'text-amber-300' : 'text-gray-300'}`}>
                      Stage 3: Yad Dasht (Perpetual Connection)
                    </h3>
                  </div>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">Coherence &gt; 85%</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed pl-7">
                  Unbroken contemplation. The inner core remains anchored in a silent, unified divine presence even while your outer body tackles active daily workloads.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950/60 p-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <p>Tap detection: timestamp-based · BpmSmoother: median+EMA · Coherence: RMSSD formula</p>
          <p className="text-yellow-500/60 font-medium">PROTOTYPE · Master Admin Only · Madrasah I AM Dev</p>
        </div>
      </footer>
    </div>
  )
}
