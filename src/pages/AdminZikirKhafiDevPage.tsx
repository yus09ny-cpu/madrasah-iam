/**
 * PROTOTYPE / SIMULASI SEPARA
 *
 * - Tap detection: sebenar (timestamp-based)
 * - Progressive pacing: sebenar (scheduleNext + linear BPM decay)
 * - Web Bluetooth (Magene H64 / GATT heart_rate): sebenar, via useHeartRateMonitor
 * - BLE hex log: reka bentuk semula GATT 0x2A37 dari bpmRef/rrRef (tap ATAU peranti sebenar)
 * - BpmSmoother + computeCoherence: diadaptasi dari Sahamhalal/zikirkhafi
 * - fireAllah/fireHu + scheduleNext: diadaptasi dari Sahamhalal/zikirkhafi
 *
 * Label dalaman (Yad Dasht, Sultan-ul-Adhkar, Dhikr-e-Qalbi) — istilah
 * Naqshbandi/Parsi, JANGAN dedahkan kepada pengguna awam.
 *
 * Akses: Master Admin sahaja.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft, FlaskConical, RotateCcw, Play, Square } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useHeartRateMonitor, type HeartRateReading } from '@/hooks/useHeartRateMonitor'

// ---------------------------------------------------------------------------
// BpmSmoother — median window 5 + adaptive EMA (zikirkhafi)
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

  reset() { this.window = []; this.ema = null }
}

// ---------------------------------------------------------------------------
// computeCoherence — RMSSD-derived, 0 (chaotic) → 1 (coherent) (zikirkhafi)
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
// Haptic patterns — Allah: single 35ms pulse, Hu: kompleks (zikirkhafi)
// ---------------------------------------------------------------------------
function fireAllah() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(35)
}
function fireHu() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([12, 30, 18, 40, 10])
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
      <button onClick={() => navigate('/admin')} className="px-5 py-2.5 rounded-xl text-sm border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 transition-colors">
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
type SessionPhase = 'idle' | 'running'

const TARGET_BPM = 50  // midpoint of 40–60 Zikir Khafi range
const SESSION_OPTS = [5, 10, 20] as const

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function ZikirKhafiSimulator({ onBack }: { onBack: () => void }) {
  // ── Tap calibration state ──
  const [tapBpm, setTapBpm] = useState<number | null>(null)
  const [, setBpm] = useState(60)              // smoothed tap BPM (dipapar via bpmRef)
  const [coherence, setCoherence] = useState(0)
  const [currentRr, setCurrentRr] = useState(0)
  const [tapCount, setTapCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  // ── Session state ──
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('idle')
  const [sessionMin, setSessionMin] = useState<5 | 10 | 20>(10)
  const [remaining, setRemaining] = useState(0)
  const [pacingBpm, setPacingBpm] = useState(60)     // current pacing BPM (decreasing)
  const [currentLabel, setCurrentLabel] = useState<'Allah' | 'Hu'>('Allah')
  const [pulse, setPulse] = useState(0)               // 0–1, drives heart scale

  // ── Tap refs (animation loop) ──
  const tapsRef = useRef<number[]>([])
  const intervalsRef = useRef<number[]>([])
  const smootherRef = useRef(new BpmSmoother())
  const bpmRef = useRef(60)
  const rrRef = useRef(1000)
  const coherenceRef = useRef(0)

  // ── Session refs ──
  const phaseRef = useRef<'Allah' | 'Hu'>('Allah')
  const intervalMsRef = useRef(1200)  // 60000/50 = 1200ms default
  const startedAtRef = useRef(0)
  const startBpmRef = useRef(60)
  const timerRef = useRef<number | null>(null)
  const sessionPhaseRef = useRef<SessionPhase>('idle')

  // ── Canvas refs (waveform + outer breath ring only) ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pacerOuterRef = useRef<HTMLDivElement>(null)
  const pacerOuterLabelRef = useRef<HTMLSpanElement>(null)

  // ── Signal quality (dry electrode detection) ──
  const [noSignal, setNoSignal] = useState(false)
  const lastValidReadingRef = useRef<number>(0)

  // ---------------------------------------------------------------------------
  // Heart rate monitor (Web Bluetooth) — Magene H64 or any GATT heart_rate device
  // ---------------------------------------------------------------------------
  const handleHrReading = useCallback((reading: HeartRateReading) => {
    console.log('[H64] reading:', reading)
    if (reading.bpm < 30 || reading.bpm > 220) {
      console.warn('[H64] ignoring out-of-range BPM (likely dry electrode / poor contact):', reading.bpm)
      return
    }
    lastValidReadingRef.current = performance.now()
    setNoSignal(false)

    const smoothed = Math.round(smootherRef.current.add(reading.bpm))
    setTapBpm(reading.bpm)
    setBpm(smoothed)
    bpmRef.current = smoothed

    if (reading.rrIntervalsMs.length) {
      // Device sends real R-R intervals — use them for RMSSD coherence.
      intervalsRef.current = [...intervalsRef.current, ...reading.rrIntervalsMs].slice(-7)
      const rr = Math.round(reading.rrIntervalsMs[reading.rrIntervalsMs.length - 1])
      rrRef.current = rr
      setCurrentRr(rr)
    } else {
      // No R-R from the device (common on budget straps) — fall back to a
      // BPM-derived pseudo-interval so the waveform still animates.
      const rr = Math.round(60000 / smoothed)
      intervalsRef.current = [...intervalsRef.current, rr].slice(-7)
      rrRef.current = rr
      setCurrentRr(rr)
    }
    const coh = Math.round(computeCoherence(intervalsRef.current) * 100)
    coherenceRef.current = coh
    setCoherence(coh)
  }, [])

  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false)
  const handleUnexpectedDisconnect = useCallback(() => {
    console.warn('[H64] gattserverdisconnected — unexpected drop, showing warning banner')
    setShowDisconnectWarning(true)
  }, [])

  const hr = useHeartRateMonitor({ onReading: handleHrReading, onUnexpectedDisconnect: handleUnexpectedDisconnect })

  // Reset the signal-quality clock on a fresh connect, then poll for silence.
  useEffect(() => {
    if (hr.state !== 'connected') { setNoSignal(false); return }
    lastValidReadingRef.current = performance.now()
    const id = window.setInterval(() => {
      if (performance.now() - lastValidReadingRef.current > 6000) {
        setNoSignal(true)
        console.warn('[H64] no valid reading for 6s — check electrode contact')
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [hr.state])

  const inZikirRange = tapBpm !== null && tapBpm >= 40 && tapBpm <= 60
  const canStart = tapCount >= 3 || hr.state === 'connected'

  // Keep sessionPhaseRef in sync for use inside closures
  useEffect(() => { sessionPhaseRef.current = sessionPhase }, [sessionPhase])

  // ---------------------------------------------------------------------------
  // Tap handler — timestamp intervals → smooth BPM → RMSSD coherence
  // ---------------------------------------------------------------------------
  const handleTap = useCallback(() => {
    const now = performance.now()
    if (tapsRef.current.length && now - tapsRef.current[tapsRef.current.length - 1] > 2500) {
      tapsRef.current = []
      intervalsRef.current = []
    }
    tapsRef.current.push(now)
    if (tapsRef.current.length > 8) tapsRef.current.shift()
    setTapCount(tapsRef.current.length)

    if (tapsRef.current.length >= 2) {
      const diffs: number[] = []
      for (let i = 1; i < tapsRef.current.length; i++) diffs.push(tapsRef.current[i] - tapsRef.current[i - 1])
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
  // Session control
  // ---------------------------------------------------------------------------
  const startSession = useCallback(() => {
    if (!canStart) return
    startBpmRef.current = bpmRef.current
    startedAtRef.current = performance.now()
    intervalMsRef.current = 60000 / bpmRef.current
    phaseRef.current = 'Allah'
    setRemaining(sessionMin * 60)
    setPacingBpm(bpmRef.current)
    setCurrentLabel('Allah')
    setPulse(0)
    setSessionPhase('running')
  }, [canStart, sessionMin])

  const stopSession = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setSessionPhase('idle')
    setPulse(0)
  }, [])

  // ---------------------------------------------------------------------------
  // scheduleNext — setTimeout recursive, tepat ikut intervalMsRef (zikirkhafi)
  // Berjalan semasa sessionPhase === 'running'
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sessionPhase !== 'running') return

    let cancelled = false

    const scheduleNext = () => {
      if (cancelled) return
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return
        const isAllah = phaseRef.current === 'Allah'
        if (isAllah) fireAllah()
        else fireHu()

        setCurrentLabel(phaseRef.current)
        const pulseVal = isAllah ? 1 : 0.55
        setPulse(pulseVal)
        window.setTimeout(() => { if (!cancelled) setPulse(0) }, isAllah ? 220 : 320)

        phaseRef.current = isAllah ? 'Hu' : 'Allah'
        scheduleNext()
      }, intervalMsRef.current)
    }

    scheduleNext()

    return () => {
      cancelled = true
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [sessionPhase])

  // ---------------------------------------------------------------------------
  // Progressive BPM deceleration — linear dari startBpm → TARGET_BPM
  // Update intervalMsRef setiap 3s semasa sesi berjalan
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sessionPhase !== 'running') return
    const totalDurationMs = sessionMin * 60 * 1000

    const id = window.setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current
      const progress = Math.min(1, elapsed / totalDurationMs)
      const startBpm = startBpmRef.current

      // Jika BPM calibrasi sudah dalam julat atau lebih rendah, kekal di TARGET
      const from = Math.max(startBpm, TARGET_BPM)
      const newPacing = from - (from - TARGET_BPM) * progress
      const clamped = Math.max(TARGET_BPM, newPacing)

      intervalMsRef.current = 60000 / clamped
      setPacingBpm(Math.round(clamped))
    }, 3000)

    return () => window.clearInterval(id)
  }, [sessionPhase, sessionMin])

  // ---------------------------------------------------------------------------
  // Countdown timer — update setiap 250ms
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sessionPhase !== 'running') return
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - startedAtRef.current) / 1000
      const left = Math.max(0, sessionMin * 60 - elapsed)
      setRemaining(left)
      if (left <= 0) stopSession()
    }, 250)
    return () => window.clearInterval(id)
  }, [sessionPhase, sessionMin, stopSession])

  // ---------------------------------------------------------------------------
  // BLE hex log emulasi — guna bpmRef/rrRef dari tap sebenar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      if (bpmRef.current === 60 && rrRef.current === 1000) return
      const flags = 0x16
      const hrByte = bpmRef.current
      const rawRrUnits = Math.round((rrRef.current * 1024.0) / 1000.0)
      const rrByteLow = rawRrUnits & 0xff
      const rrByteHigh = (rawRrUnits >> 8) & 0xff
      const toHex = (v: number) => '0x' + v.toString(16).toUpperCase().padStart(2, '0')
      const ts = new Date().toLocaleTimeString()
      setLogs(prev => [`[${ts}] RX: ${toHex(flags)} ${toHex(hrByte)} ${toHex(rrByteLow)} ${toHex(rrByteHigh)} (Decoded: ${rrRef.current}ms)`, ...prev].slice(0, 5))
    }, 1100)
    return () => clearInterval(id)
  }, [])

  // ---------------------------------------------------------------------------
  // Canvas rAF — waveform HRV + outer breath ring sahaja (tiada beat pulse)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animationFrameId: number
    let phase = 0
    let breathCycle = 0

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

      const coh = coherenceRef.current
      const amplitude = 8 + (coh / 100) * 49
      const smoothFactor = coh / 100
      const jitterStrength = ((100 - coh) / 100) * 14

      ctx.beginPath()
      ctx.lineWidth = 3
      ctx.strokeStyle = coh >= 86 ? '#f59e0b' : coh >= 71 ? '#10b981' : '#3b82f6'
      ctx.lineJoin = 'round'

      for (let i = 0; i < width; i++) {
        const theta = (i / width) * Math.PI * 6 - phase
        let y = cy + Math.sin(theta) * amplitude
        if (jitterStrength > 0) {
          y += Math.sin(theta * 7.5 + phase * 3) * jitterStrength * (1.1 - smoothFactor)
          y += (Math.random() - 0.5) * ((100 - coh) * 0.15)
        }
        i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y)
      }
      ctx.stroke()

      // Outer breath ring — oscillates perlahan (~3 nafas/min)
      breathCycle += 0.005
      const breathProgress = (Math.sin(breathCycle) + 1) / 2
      if (pacerOuterRef.current) pacerOuterRef.current.style.transform = `scale(${0.85 + breathProgress * 0.4})`
      if (pacerOuterLabelRef.current && pacerOuterRef.current) {
        if (breathProgress > 0.6) {
          pacerOuterLabelRef.current.textContent = 'Keadaan Nafas: Tahan Nafas'
          pacerOuterLabelRef.current.className = 'text-xs text-amber-300 font-medium uppercase tracking-widest mb-3 transition-colors duration-300'
          pacerOuterRef.current.className = 'absolute inset-0 rounded-full bg-amber-500/5 border border-amber-500/35 transition-colors duration-500'
        } else {
          pacerOuterLabelRef.current.textContent = 'Keadaan Nafas: Lepas Semula'
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
  const isRunning = sessionPhase === 'running'
  const heartColor = isRunning
    ? currentLabel === 'Allah' ? 'amber' : 'emerald'
    : inZikirRange ? 'emerald' : 'amber'

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden bg-[#0b0f19] text-gray-100 font-sans">
      <style>{`
        .zk-glass { background: rgba(17,24,39,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
        .zk-gold-glow { box-shadow: 0 0 20px rgba(212,163,89,0.12); }
        .zk-scroll::-webkit-scrollbar { width: 6px; }
        .zk-scroll::-webkit-scrollbar-track { background: transparent; }
        .zk-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
        .tap-btn { -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; }
      `}</style>

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={isRunning ? stopSession : onBack} className="p-2 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Pemantau Degupan Zikir</h1>
              <p className="text-xs text-gray-400">Tazkiyatun Nafs · Pemantauan HRV & Degupan Zikir</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
              <FlaskConical size={11} />
              PROTOTYPE · DEV ONLY
            </span>
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                Sesi Aktif · {formatTime(remaining)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Prominent BLE disconnect warning — visible regardless of running state */}
      {showDisconnectWarning && (
        <div className="border-b border-red-800/50 bg-red-950/40 px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-red-300 text-center sm:text-left">
              ⚠️ Magene H64 terputus! Data BPM sekarang dari tap-tempo (bukan sebenar)
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowDisconnectWarning(false); hr.connect() }}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-red-400/50 text-red-200 hover:bg-red-500/10 transition-colors whitespace-nowrap"
              >
                🔄 Sambung Semula
              </button>
              <button
                onClick={() => setShowDisconnectWarning(false)}
                className="text-[11px] text-red-400/70 hover:text-red-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── KIRI: Tap calibration + pacing orb + BLE log ── */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* TAP CALIBRATION PANEL */}
          <div className="zk-glass rounded-2xl p-6 zk-gold-glow flex flex-col items-center gap-5">
            <div className="w-full text-left">
              <h2 className="text-lg font-medium text-amber-300 mb-1">
                {isRunning ? 'Sesi Aktif' : hr.state === 'connected' ? 'Peranti BPM Disambung' : 'Tap With Your Pulse'}
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                {isRunning
                  ? <>Pacing turun perlahan dari <span className="text-amber-300">{startBpmRef.current} BPM</span> → <span className="text-emerald-400">50 BPM</span> dalam {sessionMin} minit.</>
                  : hr.state === 'connected'
                  ? <>Menerima BPM &amp; R-R interval sebenar dari <span className="text-emerald-400">{hr.deviceName}</span>.</>
                  : <>Tap ikut detik nadi anda. Sasaran: <span className="text-emerald-400 font-semibold">40–60 BPM</span> untuk Zikir Khafi.</>
                }
              </p>
            </div>

            {/* Connect Magene H64 (Web Bluetooth) — sembunyikan semasa sesi berjalan */}
            {!isRunning && hr.state !== 'unsupported' && (
              <div className="w-full space-y-2">
                {hr.state === 'connected' ? (
                  <div className="flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10">
                    <span className="text-xs text-emerald-300">🫀 {hr.deviceName} — {hr.bpm ?? '—'} BPM</span>
                    <button onClick={hr.disconnect} className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors">
                      Putus
                    </button>
                  </div>
                ) : null}
                {hr.state === 'connected' && noSignal && (
                  <div className="py-2 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-300 text-center">
                    ⚠️ Tiada isyarat — pastikan elektrod lembap &amp; rapat ke kulit
                  </div>
                )}
                {hr.state !== 'connected' && (
                  <button
                    onClick={hr.connect}
                    disabled={hr.state === 'connecting'}
                    className="w-full py-2.5 rounded-xl border border-emerald-600/40 text-xs tracking-widest uppercase text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
                  >
                    {hr.state === 'connecting' ? 'Mencari peranti...' : '🫀 Sambung Peranti BPM'}
                  </button>
                )}
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Web Bluetooth hanya berfungsi dalam Chrome browser. Untuk iOS, gunakan app pihak ketiga.
                </p>
              </div>
            )}

            {/* Tap circle + +/- (sembunyikan semasa sesi berjalan atau bila peranti disambung) */}
            {!isRunning && hr.state !== 'connected' && (
              <>
                <div className="flex items-center gap-4">
                  <button onClick={() => adjustBpm(-1)} className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition text-xl select-none tap-btn" aria-label="Kurang BPM">−</button>
                  <button
                    onPointerDown={handleTap}
                    className="tap-btn relative rounded-full flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                    style={{
                      width: 200, height: 200,
                      background: inZikirRange
                        ? 'radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)'
                        : tapBpm !== null
                        ? 'radial-gradient(circle at center, rgba(245,158,11,0.12), rgba(245,158,11,0) 70%)'
                        : 'radial-gradient(circle at center, rgba(245,235,210,0.08), rgba(245,235,210,0) 70%)',
                      border: inZikirRange ? '1px solid rgba(16,185,129,0.5)' : tapBpm !== null ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <span className={`text-4xl font-extralight tracking-widest ${inZikirRange ? 'text-emerald-300' : tapBpm !== null ? 'text-amber-200' : 'text-gray-500'}`}>
                      {tapBpm ?? '—'}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500">{tapBpm ? 'BPM' : 'Tap to detect'}</span>
                  </button>
                  <button onClick={() => adjustBpm(1)} className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition text-xl select-none tap-btn" aria-label="Tambah BPM">+</button>
                </div>

                <p className="text-[11px] text-gray-500 text-center">
                  {tapCount < 2 ? 'Mula tap untuk detect nadi anda...' : tapCount < 5 ? `${tapCount} taps · teruskan untuk bacaan lebih stabil` : `${tapCount} taps · bacaan stabil`}
                </p>

                {tapBpm !== null && (
                  <div className={`text-xs font-medium px-4 py-1.5 rounded-full border ${inZikirRange ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : tapBpm < 40 ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30'}`}>
                    {inZikirRange ? '✓ Dalam julat Zikir Khafi (40–60 BPM)' : tapBpm < 40 ? '↑ Terlalu perlahan — sasaran 40–60 BPM' : '↓ Terlalu laju — perlahan sedikit'}
                  </div>
                )}

                {tapCount > 0 && (
                  <button onClick={handleReset} className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
                    <RotateCcw size={11} /> Reset tap data
                  </button>
                )}
              </>
            )}

            {/* Session duration + Start/Stop */}
            <div className="w-full space-y-3">
              {!isRunning && canStart && (
                <div className="flex gap-2 justify-center">
                  {SESSION_OPTS.map(min => (
                    <button
                      key={min}
                      onClick={() => setSessionMin(min as 5 | 10 | 20)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${sessionMin === min ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              )}

              {!isRunning ? (
                <button
                  onClick={startSession}
                  disabled={!canStart}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all ${canStart ? 'border-emerald-600/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-gray-800 text-gray-600 cursor-not-allowed'}`}
                >
                  <Play size={14} />
                  {canStart ? `Mulakan Sesi (${sessionMin} min)` : 'Tap sekurang-kurang 3x untuk mula'}
                </button>
              ) : (
                <div className="space-y-2">
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/60 transition-all duration-1000"
                      style={{ width: `${Math.max(0, 100 - (remaining / (sessionMin * 60)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Masa tinggal: <span className="text-white font-mono">{formatTime(remaining)}</span></span>
                    <span>Pacing: <span className={pacingBpm <= 60 ? 'text-emerald-400' : 'text-amber-400'}>{pacingBpm} BPM</span></span>
                  </div>
                  <button onClick={stopSession} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-colors">
                    <Square size={12} /> Henti Sesi
                  </button>
                </div>
              )}
            </div>

            {/* Divider + Heart Orb (Allah/Hu pacing visual) */}
            <div className="w-full pt-4 border-t border-gray-800/60 flex flex-col items-center">
              <span ref={pacerOuterLabelRef} className="text-xs text-amber-200/70 uppercase tracking-widest mb-3">
                Keadaan Nafas: Tahan Nafas
              </span>

              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Outer breath ring — dipacu oleh canvas rAF */}
                <div ref={pacerOuterRef} className="absolute inset-0 rounded-full bg-emerald-500/5 border border-emerald-500/20 transition-transform duration-500 ease-out" />

                {/* Inner heart orb — dipacu oleh scheduleNext() React state */}
                <div
                  className={`absolute w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-75 ${
                    heartColor === 'amber'
                      ? 'bg-amber-500/20 border-2 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                      : 'bg-emerald-500/20 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  }`}
                  style={{ transform: `scale(${1 + pulse * 0.35})` }}
                >
                  <svg
                    className={`w-8 h-8 transition-all duration-150 ${
                      heartColor === 'amber'
                        ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                        : 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                    }`}
                    fill="currentColor" viewBox="0 0 24 24"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              </div>

              {/* Allah/Hu label — aktif semasa sesi */}
              {isRunning && (
                <div className={`mt-3 text-lg font-light tracking-[0.3em] uppercase transition-all duration-150 ${
                  currentLabel === 'Allah' ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  {currentLabel}
                </div>
              )}

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
                Tahan nafas atau lepaskan secara semula jadi. Tutup bibir, diam lisan — fokus sepenuh hati menyelaraskan diri dengan glow jantung yang berganti warna.
              </p>
            </div>
          </div>

          {/* BLE LOG */}
          <div className="zk-glass rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-emerald-400 mb-1 flex items-center gap-2">
                <span className="font-mono text-sm">&lt;/&gt;</span>
                Data Sensor (Live)
              </h2>
              <p className="text-xs text-gray-400 mb-1">BPM & R-R Interval dikira daripada data degupan nadi sebenar.</p>
              <p className="text-[10px] text-gray-600 font-mono">Format: GATT 0x2A37 standard · Flags · HR · R-R</p>
            </div>
            <div className="bg-black/60 rounded-xl p-4 font-mono text-xs text-emerald-300/90 border border-emerald-950/40 h-36 flex flex-col gap-1.5 overflow-y-auto zk-scroll">
              <div className="text-gray-500">{'// [Flags] [HR BPM] [R-R low] [R-R high]'}</div>
              {logs.length === 0
                ? <div className="text-gray-600 italic">Menunggu data degupan nadi...</div>
                : logs.map((log, idx) => <div key={idx}><span className="text-gray-500">[Packet]</span> {log}</div>)
              }
            </div>
            <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800/80 text-xs space-y-2">
              <div className="font-bold text-gray-300">BLE Stream Breakdown:</div>
              <div className="grid grid-cols-12 gap-1 text-gray-400">
                <div className="col-span-3 text-amber-400 font-semibold">Byte 0 (Flags):</div>
                <div className="col-span-9">R-R presence flag (<code className="bg-gray-900 px-1 py-0.5 rounded">0x10</code>)</div>
                <div className="col-span-3 text-emerald-400 font-semibold">Byte 1 (BPM):</div>
                <div className="col-span-9">Degupan jantung per minit.</div>
                <div className="col-span-3 text-blue-400 font-semibold">Bytes 2-3 (R-R):</div>
                <div className="col-span-9">Raw intervals (1/1024s) → milliseconds.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KANAN: HUD metrics, canvas, milestones ── */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* HUD gauges */}
          <div className="grid grid-cols-3 gap-4">
            <div className="zk-glass rounded-2xl p-4 text-center">
              <span className="text-xs text-gray-400 block mb-1">Heart BPM</span>
              <span className={`text-3xl font-bold ${tapBpm ? 'text-white' : 'text-gray-600'}`}>{tapBpm ?? '—'}</span>
              <span className={`text-[10px] block mt-1 font-medium ${hr.state === 'connected' ? 'text-emerald-400' : 'text-gray-500'}`}>
                {isRunning
                  ? `Pacing: ${pacingBpm}`
                  : hr.state === 'connected' ? `🫀 BLE sebenar — ${hr.deviceName}` : '⌨️ Tap-tempo (simulasi)'}
              </span>
            </div>
            <div className="zk-glass rounded-2xl p-4 text-center border-l-2 border-l-emerald-500">
              <span className="text-xs text-gray-400 block mb-1">Coherence Score</span>
              <span className={`text-3xl font-bold ${coherence >= 71 ? 'text-emerald-400' : coherence > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                {coherence > 0 ? `${coherence}%` : '—'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-1">{hr.state === 'connected' ? 'RMSSD sebenar' : 'Simulasi'}</span>
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
                  {tapBpm ? 'Gelombang dari coherence RMSSD tap sebenar' : 'Tap nadi anda untuk aktifkan waveform'}
                </p>
              </div>
              {/* Label dalaman — jangan tunjuk pengguna awam */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                coherence >= 86 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : coherence >= 71 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              }`}>
                {coherence >= 86 ? 'Stage 3: Kesedaran Berterusan' : coherence >= 71 ? 'Stage 2: Zikir Beresonans' : 'Stage 1: Zikir Hati'}
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
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${coherence >= 86 ? 'bg-amber-500' : coherence >= 71 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span className="text-[11px]">Dhikr Resonant Wave</span>
              </div>
              <span>Coherent (High Coherence)</span>
            </div>
          </div>

          {/* Spiritual milestones — label dalaman */}
          <div className="zk-glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-amber-200">Peringkat Kemajuan Zikir</h2>
              <span className="text-[10px] text-yellow-500/70 bg-yellow-900/20 border border-yellow-800/40 px-2 py-0.5 rounded-full">Label dalaman — dev only</span>
            </div>
            <div className="space-y-4">
              {[
                { stage: 1, label: 'Usaha Sedar / Zikir Hati', range: 'Coherence < 71%', active: coherence < 71, color: 'blue' },
                { stage: 2, label: 'Zikir Beresonans', range: 'Coherence 71%–85%', active: coherence >= 71 && coherence < 86, color: 'emerald' },
                { stage: 3, label: 'Kesedaran Berterusan', range: 'Coherence > 85%', active: coherence >= 86, color: 'amber' },
              ].map(({ stage, label, range, active, color }) => (
                <div key={stage} className={`p-3.5 rounded-xl border transition-all duration-300 ${
                  active
                    ? `border-${color}-500/30 bg-${color}-500/10 shadow-lg shadow-${color}-500/5`
                    : 'border-gray-800 bg-gray-950/20 opacity-60'
                }`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border ${
                        active ? `bg-${color}-500/20 border-${color}-500/50 text-${color}-300` : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>{stage}</span>
                      <h3 className={`text-sm font-semibold ${active ? `text-${color}-300` : 'text-gray-300'}`}>Stage {stage}: {label}</h3>
                    </div>
                    <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{range}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 bg-gray-950/60 p-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <p>Tap detection: timestamp-based · BpmSmoother: median+EMA · scheduleNext: setTimeout recursive · Pacing: linear decay → 50 BPM</p>
          <p className="text-yellow-500/60 font-medium">PROTOTYPE · Master Admin Only · Madrasah I AM Dev</p>
        </div>
      </footer>
    </div>
  )
}
