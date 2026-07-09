/**
 * PROTOTYPE / SIMULASI SEPARA
 *
 * - Tap detection: sebenar (timestamp-based)
 * - Progressive pacing: sebenar (scheduleNext + linear BPM decay)
 * - Web Bluetooth (Magene H64 / GATT heart_rate): sebenar, via useHeartRateMonitor
 * - BLE hex log: bytes literal dari characteristic.value setiap notification GATT
 *   0x2A37 sebenar (bukan reconstruction) — hanya muncul semasa peranti BLE
 *   disambung, bukan semasa tap-tempo (tiada packet BLE sebenar untuk itu)
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
import { format } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import { useHeartRateMonitor, type HeartRateReading } from '@/hooks/useHeartRateMonitor'
import { useWakeLock } from '@/hooks/useWakeLock'
import { supabase } from '@/lib/supabase'
import ZikirKhafiPlayer from '@/components/zikir/ZikirKhafiPlayer'
import WakeLockBadge from '@/components/zikir/WakeLockBadge'
import HrvSessionsReview from '@/components/admin/HrvSessionsReview'

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
// Callers must only pass genuinely measured intervals (device R-R or real tap
// timestamps) — a BPM-derived pseudo-interval has near-zero variance and will
// falsely saturate this at a suspiciously clean 1.0 (100%).
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
// computeRmssdMs — raw RMSSD in ms (not normalized), for saved experiment rows
// ---------------------------------------------------------------------------
function computeRmssdMs(intervalsMs: number[]): number {
  if (intervalsMs.length < 2) return 0
  let sq = 0
  for (let i = 1; i < intervalsMs.length; i++) {
    const d = intervalsMs[i] - intervalsMs[i - 1]
    sq += d * d
  }
  return Math.sqrt(sq / (intervalsMs.length - 1))
}

// ---------------------------------------------------------------------------
// computeConsistency — 0–100%, low variance in raw BPM samples = high score
// (sama formula seperti ZikirKhafiPlayer's BpmSmoother.consistency())
// ---------------------------------------------------------------------------
function computeConsistency(samples: number[]): number {
  if (samples.length < 3) return 100
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length
  return Math.round(Math.max(0, 1 - Math.min(1, Math.sqrt(variance) / mean)) * 100)
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

// Some budget HR straps set the GATT R-R-present flag but internally derive
// the "R-R" field from their own averaged BPM rather than true beat-to-beat
// detection — same failure mode as a BPM-derived fallback, just baked into
// the device firmware, so it still arrives as genuine reading.rrIntervalsMs.
// Real beat-to-beat R-R (at 1/1024s = ~0.977ms resolution) essentially never
// repeats the exact same rounded-ms value this many times in a row — treat a
// streak this long as a device-level fake, not a software bug on our side.
const DUPLICATE_RR_STREAK_THRESHOLD = 5

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface PendingSave {
  device_name: string
  device_id: string | null
  duration_seconds: number
  start_bpm: number
  end_bpm: number
  avg_bpm: number
  min_bpm: number
  max_bpm: number
  rmssd: number
  coherence_score: number
  consistency_score: number
  beat_count: number
  stage_achieved: number
  pacing_start_bpm: number
  pacing_end_bpm: number
  used_real_rr: boolean
  rr_suspect: boolean
}

function ZikirKhafiSimulator({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore()
  const [viewMode, setViewMode] = useState<'monitor' | 'review'>('monitor')

  // ── Tap calibration state ──
  const [tapBpm, setTapBpm] = useState<number | null>(null)
  const [, setBpm] = useState(60)              // smoothed tap BPM (dipapar via bpmRef)
  const [coherence, setCoherence] = useState<number | null>(0)
  const [currentRr, setCurrentRr] = useState(0)
  const [tapCount, setTapCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  // 'real' = genuine R-R (device GATT or real tap timestamps), 'fallback' =
  // BLE connected but device sent no R-R this packet (BPM-derived estimate
  // only), 'suspect' = device claims real R-R but is repeating the same value
  // (likely device-derived-from-BPM, see DUPLICATE_RR_STREAK_THRESHOLD) —
  // only 'real' should ever be presented to the user as genuine HRV data.
  const [rrSource, setRrSource] = useState<'real' | 'fallback' | 'suspect' | null>(null)

  // ── Session state ──
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('idle')
  const [sessionMin, setSessionMin] = useState<5 | 10 | 20>(10)
  const [remaining, setRemaining] = useState(0)
  const [pacingBpm, setPacingBpm] = useState(60)     // current pacing BPM (decreasing)

  // ── Experiment save state (hrv_sessions) ──
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [sessionNotes, setSessionNotes] = useState('')

  // ── Session-aggregate refs (real device readings only, for hrv_sessions) ──
  const minBpmRef = useRef<number | null>(null)
  const maxBpmRef = useRef<number | null>(null)
  const bpmSumRef = useRef(0)
  const bpmSamplesRef = useRef(0)
  const sessionBpmSamplesRef = useRef<number[]>([])
  const sessionRrRef = useRef<number[]>([])
  const maxStageRef = useRef(1)
  const sessionUsedDeviceRef = useRef(false)
  const sessionUsedRealRrRef = useRef(false)
  const sessionRrSuspectRef = useRef(false)
  const beatCountRef = useRef(0)

  // ── Tap refs (animation loop) ──
  const tapsRef = useRef<number[]>([])
  const intervalsRef = useRef<number[]>([])
  const smootherRef = useRef(new BpmSmoother())
  const bpmRef = useRef(60)
  const rrRef = useRef(1000)
  const coherenceRef = useRef<number | null>(0)
  const rrSourceRef = useRef<'real' | 'fallback' | 'suspect' | null>(null)
  // Rolling history of genuinely-measured intervals (device R-R or real tap
  // diffs) for the tachogram canvas — a BPM-derived fallback value is never
  // pushed here, so the plot never fabricates a beat-to-beat shape.
  const rrHistoryRef = useRef<number[]>([])
  // Duplicate-R-R detector (device-level fake-real-R-R, see DUPLICATE_RR_STREAK_THRESHOLD)
  const lastRealRrValueRef = useRef<number | null>(null)
  const duplicateRrStreakRef = useRef(0)

  // ── Session refs ──
  const phaseRef = useRef<'Allah' | 'Hu'>('Allah')
  const intervalMsRef = useRef(1200)  // 60000/50 = 1200ms default
  const startedAtRef = useRef(0)
  const startBpmRef = useRef(60)
  const timerRef = useRef<number | null>(null)
  const sessionPhaseRef = useRef<SessionPhase>('idle')

  // ── Canvas refs (waveform only) ──
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Signal quality (dry electrode detection) ──
  const [noSignal, setNoSignal] = useState(false)
  // Driven by the device's own GATT Sensor Contact Status bit (spec-reported,
  // not inferred) — chest straps with poor/dry electrode contact routinely
  // double-count beats (T-wave oversensing / motion artifact), which reads as
  // an implausibly high but internally "consistent" BPM + R-R pair.
  const [poorContact, setPoorContact] = useState(false)
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
    setPoorContact(reading.sensorContact === 'not_detected')

    const smoothed = Math.round(smootherRef.current.add(reading.bpm))
    setTapBpm(reading.bpm)
    setBpm(smoothed)
    bpmRef.current = smoothed

    const hasRealRr = reading.rrIntervalsMs.length > 0

    let isSuspect = false
    if (hasRealRr) {
      // Check every R-R value in this packet against the last one seen —
      // a device faking R-R from its own averaged BPM tends to repeat the
      // exact same rounded-ms value many times in a row.
      for (const raw of reading.rrIntervalsMs) {
        const rounded = Math.round(raw)
        if (lastRealRrValueRef.current === rounded) {
          duplicateRrStreakRef.current += 1
        } else {
          duplicateRrStreakRef.current = 1
          lastRealRrValueRef.current = rounded
        }
      }
      if (duplicateRrStreakRef.current >= DUPLICATE_RR_STREAK_THRESHOLD) isSuspect = true
    } else {
      duplicateRrStreakRef.current = 0
      lastRealRrValueRef.current = null
    }

    rrSourceRef.current = hasRealRr ? (isSuspect ? 'suspect' : 'real') : 'fallback'
    setRrSource(rrSourceRef.current)

    // Log the literal bytes this notification arrived with — genuine wire
    // data (reading.rawBytes, from characteristic.value), not a reconstruction
    // built from already-processed BPM/RR. This is the only trustworthy way
    // to prove/inspect a device repeating identical packets.
    {
      const hex = reading.rawBytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
      const ts = new Date().toLocaleTimeString()
      const decoded = hasRealRr ? `HR=${reading.bpm}bpm, RR=${Math.round(reading.rrIntervalsMs[reading.rrIntervalsMs.length - 1])}ms` : `HR=${reading.bpm}bpm, no R-R in packet`
      const warn = isSuspect ? '⚠️ ' : ''
      setLogs(prev => [`${warn}[${ts}] RX: ${hex} (Decoded: ${decoded})`, ...prev].slice(0, 5))
    }

    let coh: number | null
    if (hasRealRr) {
      // Device sends real R-R intervals — use them for RMSSD coherence and
      // the tachogram history (even when flagged 'suspect': we plot what the
      // device actually reported, the warning label is what changes, not the
      // data itself).
      intervalsRef.current = [...intervalsRef.current, ...reading.rrIntervalsMs].slice(-7)
      rrHistoryRef.current = [...rrHistoryRef.current, ...reading.rrIntervalsMs].slice(-40)
      const rr = Math.round(reading.rrIntervalsMs[reading.rrIntervalsMs.length - 1])
      rrRef.current = rr
      setCurrentRr(rr)
      // 'suspect' R-R collapses RMSSD to ~0 the same way the BPM-derived
      // fallback does — never surface that as a numeric coherence score.
      coh = isSuspect ? null : Math.round(computeCoherence(intervalsRef.current) * 100)
    } else {
      // No R-R in this packet (common on budget straps / dropped notification)
      // — show a BPM-derived pseudo-interval for reference only. It must
      // NEVER feed computeCoherence (near-zero variance would falsely
      // saturate coherence at 100%) or the tachogram history (it would draw
      // a fabricated beat-to-beat shape). Break the real-R-R streak so a
      // later real reading starts its coherence window clean.
      const rr = Math.round(60000 / smoothed)
      rrRef.current = rr
      setCurrentRr(rr)
      intervalsRef.current = []
      coh = null
    }
    coherenceRef.current = coh
    setCoherence(coh)

    // Accumulate real-device stats for the running session only — this is
    // what distinguishes an "experiment" row from tap-tempo calibration.
    if (sessionPhaseRef.current === 'running') {
      sessionUsedDeviceRef.current = true
      if (hasRealRr) sessionUsedRealRrRef.current = true
      if (isSuspect) sessionRrSuspectRef.current = true
      bpmSumRef.current += reading.bpm
      bpmSamplesRef.current += 1
      sessionBpmSamplesRef.current = [...sessionBpmSamplesRef.current, reading.bpm].slice(-1000)
      minBpmRef.current = minBpmRef.current === null ? reading.bpm : Math.min(minBpmRef.current, reading.bpm)
      maxBpmRef.current = maxBpmRef.current === null ? reading.bpm : Math.max(maxBpmRef.current, reading.bpm)
      if (hasRealRr) sessionRrRef.current = [...sessionRrRef.current, ...reading.rrIntervalsMs].slice(-1000)
      if (coh !== null) {
        const stage = coh >= 86 ? 3 : coh >= 71 ? 2 : 1
        maxStageRef.current = Math.max(maxStageRef.current, stage)
      }
    }
  }, [])

  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false)
  const handleUnexpectedDisconnect = useCallback(() => {
    console.warn('[H64] gattserverdisconnected — unexpected drop, showing warning banner')
    setShowDisconnectWarning(true)
    // The device has stopped sending anything — clear rrSource immediately so
    // the UI never keeps showing a stale 'real'/'suspect' label (or plotting
    // the last tachogram) as if data is still flowing while disconnected.
    rrSourceRef.current = null
    setRrSource(null)
  }, [])

  const hr = useHeartRateMonitor({ onReading: handleHrReading, onUnexpectedDisconnect: handleUnexpectedDisconnect })

  // Reset the signal-quality clock on a fresh connect, then poll for silence.
  useEffect(() => {
    if (hr.state !== 'connected') { setNoSignal(false); return }
    lastValidReadingRef.current = performance.now()
    // Fresh connect — reset the duplicate-R-R detector so a previous
    // device's streak doesn't bleed into this one.
    duplicateRrStreakRef.current = 0
    lastRealRrValueRef.current = null
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
  // Screen Wake Lock — keep the display on for the duration of a running
  // session (tap-tempo or BLE) so the screen doesn't sleep/dim mid-zikir.
  // ---------------------------------------------------------------------------
  const wakeLock = useWakeLock()

  // ---------------------------------------------------------------------------
  // BLE auto-reconnect on visibilitychange — BLE-mode only. A wake lock keeps
  // the screen on but does NOT guarantee the BLE link itself survives the tab
  // being backgrounded (OS may still tear down the radio). Gated on
  // sessionUsedDeviceRef (this session actually received real device readings)
  // rather than hr.state alone or rrSource — a tap-tempo-only session also
  // reports rrSource 'real' and would otherwise falsely trigger this.
  // ---------------------------------------------------------------------------
  const [reconnecting, setReconnecting] = useState(false)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (sessionPhaseRef.current !== 'running') return
      if (!sessionUsedDeviceRef.current) return  // tap-tempo-only session — no device to reconnect
      if (hr.state === 'connected' || hr.state === 'connecting' || hr.state === 'unsupported') return
      console.warn('[H64] tab visible again mid-session with BLE disconnected — attempting reconnect')
      setReconnecting(true)
      hr.reconnect().then(success => {
        // Only dismiss the persistent disconnect banner once actually back
        // online — a failed attempt leaves it up, since we're still disconnected.
        if (success) setShowDisconnectWarning(false)
      }).finally(() => setReconnecting(false))
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [hr.state, hr.reconnect])

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
      // Real tap-to-tap timings — genuine intervals, safe for the tachogram.
      rrHistoryRef.current = [...rrHistoryRef.current, ...diffs.slice(-1)].slice(-40)
      rrSourceRef.current = 'real'
      setRrSource('real')

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
    rrHistoryRef.current = []
    smootherRef.current.reset()
    setTapBpm(null)
    setTapCount(0)
    setBpm(60)
    setCoherence(0)
    setCurrentRr(0)
    bpmRef.current = 60
    rrRef.current = 1000
    coherenceRef.current = 0
    rrSourceRef.current = null
    setRrSource(null)
    duplicateRrStreakRef.current = 0
    lastRealRrValueRef.current = null
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
    setPendingSave(null)
    setSaveResult('idle')
    setSessionNotes('')
    minBpmRef.current = null
    maxBpmRef.current = null
    bpmSumRef.current = 0
    bpmSamplesRef.current = 0
    sessionBpmSamplesRef.current = []
    sessionRrRef.current = []
    maxStageRef.current = 1
    sessionUsedDeviceRef.current = false
    sessionUsedRealRrRef.current = false
    sessionRrSuspectRef.current = false
    beatCountRef.current = 0
    setSessionPhase('running')
    wakeLock.request()
  }, [canStart, sessionMin, wakeLock.request])

  const stopSession = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setSessionPhase('idle')
    wakeLock.release()

    // Only offer to save when the session actually received real Magene H64
    // readings — tap-tempo-only calibration never produces an hrv_sessions row.
    if (sessionUsedDeviceRef.current && bpmSamplesRef.current > 0) {
      setPendingSave({
        device_name: hr.deviceName ?? 'Magene H64',
        device_id: hr.deviceId,
        duration_seconds: Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000)),
        start_bpm: startBpmRef.current,
        end_bpm: bpmRef.current,
        avg_bpm: Number((bpmSumRef.current / bpmSamplesRef.current).toFixed(1)),
        min_bpm: minBpmRef.current ?? bpmRef.current,
        max_bpm: maxBpmRef.current ?? bpmRef.current,
        rmssd: Number(computeRmssdMs(sessionRrRef.current).toFixed(1)),
        coherence_score: Math.round(computeCoherence(sessionRrRef.current) * 100),
        consistency_score: computeConsistency(sessionBpmSamplesRef.current),
        beat_count: beatCountRef.current,
        stage_achieved: maxStageRef.current,
        pacing_start_bpm: startBpmRef.current,
        pacing_end_bpm: pacingBpm,
        used_real_rr: sessionUsedRealRrRef.current,
        rr_suspect: sessionRrSuspectRef.current,
      })
    }
  }, [hr.deviceName, hr.deviceId, pacingBpm, wakeLock.release])

  // ---------------------------------------------------------------------------
  // hrv_sessions save — admin-only real-device experiment data
  // ---------------------------------------------------------------------------
  const handleSaveSession = useCallback(async () => {
    if (!pendingSave || !user || saving) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { error } = await db.from('hrv_sessions').insert({
        user_id: user.id,
        session_date: format(new Date(), 'yyyy-MM-dd'),
        notes: sessionNotes.trim() || null,
        ...pendingSave,
      })
      if (error) throw error
      setSaveResult('success')
      window.setTimeout(() => { setPendingSave(null); setSaveResult('idle'); setSessionNotes('') }, 2000)
    } catch (err) {
      console.error('[hrv_sessions] save error:', err)
      setSaveResult('error')
    } finally {
      setSaving(false)
    }
  }, [pendingSave, user, saving, sessionNotes])

  const handleDiscardSession = useCallback(() => {
    setPendingSave(null)
    setSessionNotes('')
    setSaveResult('idle')
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

        beatCountRef.current += 1
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
  // Canvas rAF — real tachogram plotted from rrHistoryRef (genuinely measured
  // device R-R or real tap intervals). When the current source is 'fallback'
  // (BLE connected but device sent no R-R this packet) we deliberately do NOT
  // draw a fabricated waveform — a flat, dim placeholder line is shown
  // instead, so nobody mistakes it for real HRV data.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animationFrameId: number

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
      const width = canvas.width / (window.devicePixelRatio || 1)
      const height = canvas.height / (window.devicePixelRatio || 1)
      const cy = height / 2
      const padY = 24

      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke()

      const coh = coherenceRef.current
      const history = rrHistoryRef.current
      const source = rrSourceRef.current
      const isPlottable = (source === 'real' || source === 'suspect') && history.length >= 2

      if (!isPlottable) {
        // No genuine interval data to plot right now — flat/dim line, not a
        // fabricated shape.
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke()
      } else {
        const values = history.slice(-40)
        const min = Math.min(...values)
        const max = Math.max(...values)
        const range = Math.max(1, max - min)
        const stepX = values.length > 1 ? width / (values.length - 1) : width

        ctx.beginPath()
        ctx.lineWidth = 3
        // 'suspect' always renders in red regardless of the (unreliable) coherence
        // number — this is what actually happened on the wire, flagged as fishy.
        ctx.strokeStyle = source === 'suspect' ? '#ef4444' : coh === null ? '#6b7280' : coh >= 86 ? '#f59e0b' : coh >= 71 ? '#10b981' : '#3b82f6'
        ctx.lineJoin = 'round'

        values.forEach((v, i) => {
          const norm = (v - min) / range
          const y = height - padY - norm * (height - padY * 2)
          const x = i * stepX
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.stroke()

        // Beat markers so individual R-R points are visible (genuine tachogram, not a curve fit).
        ctx.fillStyle = ctx.strokeStyle as string
        values.forEach((v, i) => {
          const norm = (v - min) / range
          const y = height - padY - norm * (height - padY * 2)
          const x = i * stepX
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill()
        })
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
                <WakeLockBadge status={wakeLock.status} />
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Live Monitor / Review toggle */}
      <div className="border-b border-gray-800 bg-gray-950/60 px-6 py-3">
        <div className="max-w-7xl mx-auto flex gap-2">
          <button
            onClick={() => setViewMode('monitor')}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
              viewMode === 'monitor' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            🫀 Live Monitor
          </button>
          <button
            onClick={() => setViewMode('review')}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
              viewMode === 'review' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            📊 Review
          </button>
        </div>
      </div>

      {viewMode === 'review' && user && <HrvSessionsReview userId={user.id} />}

      {viewMode === 'monitor' && (
      <>
      {/* Reconnect toast — BLE-mode only, shown while auto-reconnect (visibilitychange) is in flight */}
      {reconnecting && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-amber-300 text-xs shadow-lg">
          🔄 Sensor terputus, menyambung semula...
        </div>
      )}

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
                {hr.state === 'connected' && !noSignal && poorContact && (
                  <div className="py-2 px-4 rounded-xl border border-red-500/40 bg-red-500/10 text-[11px] text-red-300 text-center">
                    ⚠️ H64 melaporkan hubungan elektrod lemah — BPM/R-R mungkin double-count (T-wave/artifak). Ketatkan strap &amp; lembapkan elektrod.
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

            {/* Pending experiment save — real Magene H64 session just stopped */}
            {!isRunning && pendingSave && (
              <div className="w-full space-y-3 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
                <p className="text-sm text-purple-300 font-medium">📊 Sesi eksperimen selesai — simpan data?</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-400">
                  <div>BPM: <span className="text-gray-200">{pendingSave.start_bpm} → {pendingSave.end_bpm}</span></div>
                  <div>Purata: <span className="text-gray-200">{pendingSave.avg_bpm} BPM</span></div>
                  <div>Min/Max: <span className="text-gray-200">{pendingSave.min_bpm}–{pendingSave.max_bpm} BPM</span></div>
                  <div>RMSSD: <span className="text-gray-200">{pendingSave.rmssd} ms</span></div>
                  <div>Coherence: <span className="text-gray-200">{pendingSave.coherence_score}%</span></div>
                  <div>Konsistensi: <span className="text-gray-200">{pendingSave.consistency_score}%</span></div>
                  <div>Ketukan: <span className="text-gray-200">{pendingSave.beat_count}</span></div>
                  <div>Stage tertinggi: <span className="text-gray-200">{pendingSave.stage_achieved}</span></div>
                  <div>Pacing: <span className="text-gray-200">{pendingSave.pacing_start_bpm} → {pendingSave.pacing_end_bpm}</span></div>
                  <div>Tempoh: <span className="text-gray-200">{formatTime(pendingSave.duration_seconds)}</span></div>
                  <div className="col-span-2">Peranti: <span className="text-gray-200">{pendingSave.device_name}</span>{pendingSave.device_id && <span className="text-gray-600"> ({pendingSave.device_id})</span>}</div>
                  <div className="col-span-2">
                    Sumber R-R: <span className={!pendingSave.used_real_rr ? 'text-amber-400' : pendingSave.rr_suspect ? 'text-red-400' : 'text-emerald-400'}>
                      {!pendingSave.used_real_rr
                        ? 'Tiada R-R sebenar diterima'
                        : pendingSave.rr_suspect
                        ? '⚠️ Disyaki tetap/berulang (device)'
                        : 'Sebenar (device R-R)'}
                    </span>
                  </div>
                </div>
                {saveResult !== 'success' && (
                  <textarea
                    value={sessionNotes}
                    onChange={e => setSessionNotes(e.target.value)}
                    placeholder="Nota (pilihan) — cth: elektrod lembap, subjek duduk tenang..."
                    rows={2}
                    className="w-full text-xs bg-gray-950/50 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                )}
                {saveResult === 'error' && (
                  <p className="text-xs text-red-400">Gagal simpan — semak console &amp; pastikan table hrv_sessions wujud.</p>
                )}
                {saveResult === 'success' ? (
                  <p className="text-xs text-emerald-400">✓ Disimpan ke hrv_sessions</p>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleDiscardSession} className="flex-1 py-2 rounded-lg text-xs border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                      Buang
                    </button>
                    <button
                      onClick={handleSaveSession}
                      disabled={saving}
                      className="flex-1 py-2 rounded-lg text-xs border border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan Sesi Eksperimen'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Session duration + Start/Stop */}
            <div className="w-full space-y-3">
              {!isRunning && !pendingSave && canStart && (
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

              {!isRunning && !pendingSave ? (
                <button
                  onClick={startSession}
                  disabled={!canStart}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all ${canStart ? 'border-emerald-600/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-gray-800 text-gray-600 cursor-not-allowed'}`}
                >
                  <Play size={14} />
                  {canStart ? `Mulakan Sesi (${sessionMin} min)` : 'Tap sekurang-kurang 3x untuk mula'}
                </button>
              ) : isRunning ? (
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
              ) : null}
            </div>

          </div>

          {/* BLE LOG */}
          <div className="zk-glass rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-medium text-emerald-400 mb-1 flex items-center gap-2">
                <span className="font-mono text-sm">&lt;/&gt;</span>
                Data Sensor (Live)
              </h2>
              <p className="text-xs text-gray-400 mb-1">Bytes literal dari setiap notification GATT peranti — bukan reconstruction.</p>
              <p className="text-[10px] text-gray-600 font-mono">Format: GATT 0x2A37 standard · Flags · HR · R-R · hanya semasa BLE disambung</p>
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
              <span className={`text-3xl font-bold ${coherence !== null && coherence >= 71 ? 'text-emerald-400' : coherence !== null && coherence > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                {coherence !== null ? `${coherence}%` : '—'}
              </span>
              <span className={`text-[10px] block mt-1 ${rrSource === 'suspect' ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                {hr.state === 'connected'
                  ? rrSource === 'real'
                    ? 'RMSSD sebenar'
                    : rrSource === 'suspect'
                    ? '⚠️ R-R disyaki tetap (device)'
                    : 'Tiada R-R sebenar — anggaran BPM'
                  : rrSource === 'real' ? 'RMSSD tap sebenar' : 'Simulasi'}
              </span>
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
                <p className={`text-xs ${rrSource === 'suspect' ? 'text-red-400' : 'text-gray-400'}`}>
                  {!tapBpm
                    ? 'Tap nadi anda untuk aktifkan waveform'
                    : rrSource === 'real'
                    ? (hr.state === 'connected' ? 'Tachogram R-R sebenar dari peranti' : 'Tachogram dari tap sebenar (kalibrasi)')
                    : rrSource === 'suspect'
                    ? '⚠️ R-R kelihatan tetap/berulang — kemungkinan bukan bacaan sebenar'
                    : 'Peranti tidak hantar R-R sebenar — tiada visualisasi ditunjukkan'}
                </p>
              </div>
              {/* Label dalaman — jangan tunjuk pengguna awam */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                (coherence ?? 0) >= 86 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : (coherence ?? 0) >= 71 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              }`}>
                {coherence === null ? 'Coherence tidak tersedia' : coherence >= 86 ? 'Stage 3: Kesedaran Berterusan' : coherence >= 71 ? 'Stage 2: Zikir Beresonans' : 'Stage 1: Zikir Hati'}
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
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${(coherence ?? 0) >= 86 ? 'bg-amber-500' : (coherence ?? 0) >= 71 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
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
                { stage: 1, label: 'Usaha Sedar / Zikir Hati', range: 'Coherence < 71%', active: (coherence ?? 0) < 71, color: 'blue' },
                { stage: 2, label: 'Zikir Beresonans', range: 'Coherence 71%–85%', active: (coherence ?? 0) >= 71 && (coherence ?? 0) < 86, color: 'emerald' },
                { stage: 3, label: 'Kesedaran Berterusan', range: 'Coherence > 85%', active: (coherence ?? 0) >= 86, color: 'amber' },
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

      {/* ── SIMULASI ZIKIR KHAFI (komponen TQN sebenar, dari tab Amalan) ── */}
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-6 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#a78bfa30]" />
          <span className="text-xs uppercase tracking-[0.3em] text-[#a78bfa] font-medium whitespace-nowrap">
            Simulasi Zikir Khafi
          </span>
          <div className="flex-1 h-px bg-[#a78bfa30]" />
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(167,139,250,0.15)' }}>
          <ZikirKhafiPlayer
            onSessionDone={async () => { /* dev simulation — sengaja tidak disimpan ke Supabase */ }}
            onCancel={() => {}}
          />
        </div>
        <p className="text-center text-[10px] text-yellow-500/70 mt-3">
          ⚠️ Data simulasi tidak disimpan
        </p>
      </div>
      </>
      )}

      <footer className="border-t border-gray-800 bg-gray-950/60 p-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <p>Tap detection: timestamp-based · BpmSmoother: median+EMA · scheduleNext: setTimeout recursive · Pacing: linear decay → 50 BPM</p>
          <p className="text-yellow-500/60 font-medium">PROTOTYPE · Master Admin Only · Madrasah I AM Dev</p>
        </div>
      </footer>
    </div>
  )
}
