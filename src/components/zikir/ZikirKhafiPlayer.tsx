import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useWakeLock } from '@/hooks/useWakeLock'
import WakeLockBadge from '@/components/zikir/WakeLockBadge'
import { useHeartRateMonitor, type HeartRateReading } from '@/hooks/useHeartRateMonitor'
import { useAudioPulse } from '@/hooks/useAudioPulse'
import BleStatusBadge from '@/components/zikir/BleStatusBadge'
import GuidedOrb from '@/components/zikir/GuidedOrb'
import { classifyBpmTier, TIER_META, type BpmTier } from '@/lib/bpmTiers'
import {
  computeSmoothedWave,
  bpmReadingsToBeats,
  type TimestampedBeat,
  type TimestampedBpm,
} from '@/lib/smoothedHeartWave'
import { computeCoherence } from '@/lib/hrvCoherence'
import { useGuidanceAudio } from '@/hooks/useGuidanceAudio'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KhafiSessionResult {
  durationMin: number       // target duration (0 = ∞)
  actualSec: number         // actual elapsed seconds
  preBpm: number | null     // BPM at session start
  finalBpm: number | null   // true tracked BPM at the exact moment the session ended
  avgBpm: number            // average during session
  beatCount: number         // total beats
  sessionMode: 'tap' | 'ble'
  // Only ever populated for a BLE-connected session (real R-R data) — a
  // tap-tempo session's beat timing is a synthetic pacing curve, not a
  // measurement, so computing either here would fabricate a number that
  // merely looks like a biometric reading. See ZikirKhafiPlayer's
  // firePulseTick(isReal) and the summary-screen mode gating.
  coherence: number | null  // 0–1
  consistency: number | null // 0–1
  dominantTier: BpmTier | null
  deepestTier: BpmTier | null
}

interface Props {
  onSessionDone: (result: KhafiSessionResult) => Promise<void>
  onCancel: () => void
}

type Phase = 'idle' | 'connecting' | 'tapping' | 'running' | 'summary'
type SessionMode = 'tap' | 'ble'

const SESSION_OPTIONS = [5, 10, 20, 0] as const  // 0 = ∞

// Tap-detected BPM is accepted across a natural physiological range (not
// clamped to the Zikir Khafi target) — the pacing guide brings it down
// gradually during the session instead of forcing an immediate jump.
const TAP_MIN = 30
const TAP_MAX = 200
const ZIKIR_RANGE_MAX = 60
const TARGET_BPM = 50

// Natural entrainment pace: ~2.5 BPM/min, bounded so extreme starting BPMs
// don't produce absurdly long or short pacing windows.
const PACING_RATE_BPM_PER_MIN = 2.5
const MIN_DECAY_MIN = 3
const MAX_DECAY_MIN = 20

// Hard physiological bounds for a raw BLE reading — outside this range it's
// a sensor artifact (motion, poor contact, a glitched packet), never a real
// beat. Discarded outright (not smoothed), same bounds already established
// for the admin research page's handleHrReading.
const PHYSIO_BPM_MIN = 30
const PHYSIO_BPM_MAX = 220

// How often a bpm sample is recorded into bpmHistory for the summary graph.
const BPM_SAMPLE_INTERVAL_MS = 2500

interface TierBreakdown {
  pct: Record<BpmTier, number>   // 0-100 per tier, sums to ~100
  dominant: BpmTier              // most readings spent — the headline badge
  bestReached: BpmTier           // deepest tier ever touched — sub-text
}

// Built from raw, per-reading tier counts (post-validity-filter, PRE the
// heavy display EMA) — not the smoothed bpmHistory used for the graph.
// BpmSmoother's damping (deliberately slow for jumps >15 BPM, tuned for
// gentle haptic pacing) can otherwise quietly wash out a genuine brief dip
// before it ever counts toward an achievement, undermining the badge's
// whole point the same way over-smoothed coherence did earlier.
function computeTierBreakdown(counts: Record<BpmTier, number>, bestReached: BpmTier): TierBreakdown | null {
  const total = ([1, 2, 3, 4, 5] as BpmTier[]).reduce((s, tier) => s + counts[tier], 0)
  if (total === 0) return null
  const pct = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<BpmTier, number>
  let dominant: BpmTier = 1
  ;([1, 2, 3, 4, 5] as BpmTier[]).forEach(tier => {
    pct[tier] = Math.round((counts[tier] / total) * 100)
    if (counts[tier] > counts[dominant]) dominant = tier
  })
  return { pct, dominant, bestReached }
}

function estimateDecayMin(startBpm: number): number {
  if (startBpm <= ZIKIR_RANGE_MAX) return 0
  const raw = (startBpm - TARGET_BPM) / PACING_RATE_BPM_PER_MIN
  return Math.min(MAX_DECAY_MIN, Math.max(MIN_DECAY_MIN, Math.round(raw)))
}

// ─── BPM Smoother (median + adaptive EMA) ────────────────────────────────────

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

  consistency(): number {
    if (this.window.length < 3) return 1
    const mean = this.window.reduce((a, b) => a + b, 0) / this.window.length
    const variance = this.window.reduce((a, b) => a + (b - mean) ** 2, 0) / this.window.length
    return Math.max(0, 1 - Math.min(1, Math.sqrt(variance) / mean))
  }
}

// computeCoherence — moved to src/lib/hrvCoherence.ts (2026-07) so this file
// and AdminZikirKhafiDevPage.tsx share one formula instead of two copies
// that can silently drift apart.

// ─── Haptic ──────────────────────────────────────────────────────────────────

function fireAllah() {
  if ('vibrate' in navigator) navigator.vibrate(35)
}
function fireHu() {
  if ('vibrate' in navigator) navigator.vibrate([12, 30, 18, 40, 10])
}

// ─── CoherenceRing ───────────────────────────────────────────────────────────

function CoherenceRing({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value))
  const r = 52
  const c = 2 * Math.PI * r
  const dash = c * pct
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="3" />
      <circle cx="70" cy="70" r={r} fill="none"
        stroke="rgba(167,139,250,0.85)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="74" textAnchor="middle" fontSize="22" fontWeight="200" fill="rgba(232,220,200,0.95)">
        {(pct * 100).toFixed(0)}
      </text>
      <text x="70" y="92" textAnchor="middle" fontSize="8" letterSpacing="3" fill="rgba(167,139,250,0.6)">
        {label}
      </text>
    </svg>
  )
}

// ─── BpmHistoryGraph ───────────────────────────────────────────────────────
// Static post-session line chart from bpmHistory. BLE mode colors each
// segment by its BPM tier (ties the graph visually to the tier badge below
// it); tap mode is a single purple line — it's the pacing target's own
// decline curve, not sensor data, so no per-point variance to color by.

function BpmHistoryGraph({ history, mode }: { history: { t: number; bpm: number }[]; mode: SessionMode }) {
  if (history.length < 2) return null
  const width = 280
  const height = 110
  const padX = 6
  const padY = 14
  const bpms = history.map(h => h.bpm)
  const minBpm = Math.min(...bpms, TARGET_BPM) - 4
  const maxBpm = Math.max(...bpms) + 4
  const maxT = Math.max(1, history[history.length - 1].t)
  const x = (t: number) => padX + (t / maxT) * (width - padX * 2)
  const y = (bpm: number) => height - padY - ((bpm - minBpm) / Math.max(1, maxBpm - minBpm)) * (height - padY * 2)
  const refY = y(ZIKIR_RANGE_MAX)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs">
      {/* Reference line at the Zikir Khafi range ceiling */}
      <line x1={padX} x2={width - padX} y1={refY} y2={refY} stroke="#8a7a6540" strokeDasharray="3 3" />
      {mode === 'ble'
        ? history.slice(1).map((pt, i) => {
            const prev = history[i]
            const color = TIER_META[classifyBpmTier(pt.bpm)].color
            return (
              <line key={pt.t} x1={x(prev.t)} y1={y(prev.bpm)} x2={x(pt.t)} y2={y(pt.bpm)}
                stroke={color} strokeWidth={2} strokeLinecap="round" />
            )
          })
        : (
          <polyline
            points={history.map(pt => `${x(pt.t)},${y(pt.bpm)}`).join(' ')}
            fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
        )}
    </svg>
  )
}

// ─── SmoothedWaveChart ───────────────────────────────────────────────────────
// "Gelombang Licin" — HeartMath-style resample + low-pass summary chart,
// BLE mode only (replaces BpmHistoryGraph for a BLE-mode session; tap mode
// keeps BpmHistoryGraph unchanged since it has no genuine R-R/BPM stream to
// draw from — see firePulseTick's isReal gating). DISPLAY ONLY: reads its
// own rrBeats/bpmSamples props (rawRrBeatSamplesRef/rawBpmSamplesRef), never
// beatIntervalsRef — computeCoherence()'s input is untouched by this chart.
// No raw-tachogram toggle here on purpose: tap-per-beat jaggedness has no
// value for a lay TQN user and stays exclusive to the admin research tool.

function SmoothedWaveChart({ rrBeats, bpmSamples }: { rrBeats: TimestampedBeat[]; bpmSamples: TimestampedBpm[] }) {
  const usingBpmOnly = rrBeats.length < 2
  const source = usingBpmOnly ? bpmReadingsToBeats(bpmSamples) : rrBeats
  const wave = computeSmoothedWave(source)
  if (wave.length < 2) return null

  const width = 280
  const height = 110
  const padX = 6
  const padY = 14
  const bpms = wave.map(p => p.bpm)
  const minBpm = Math.min(...bpms, TARGET_BPM) - 4
  const maxBpm = Math.max(...bpms) + 4
  const maxT = Math.max(0.001, wave[wave.length - 1].tSec)
  const x = (t: number) => padX + (t / maxT) * (width - padX * 2)
  const y = (bpm: number) => height - padY - ((bpm - minBpm) / Math.max(1, maxBpm - minBpm)) * (height - padY * 2)
  const refY = y(ZIKIR_RANGE_MAX)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs">
        <line x1={padX} x2={width - padX} y1={refY} y2={refY} stroke="#8a7a6540" strokeDasharray="3 3" />
        {wave.slice(1).map((pt, i) => {
          const prev = wave[i]
          // Unstable segments (motion artifact / signal gap — see
          // computeSmoothedWave) always render red regardless of tier,
          // same safeguard used on the admin monitor: a jittery stretch
          // must never be smoothed into a falsely calm-looking curve.
          const color = pt.unstable ? '#ef4444' : TIER_META[classifyBpmTier(pt.bpm)].color
          return (
            <line key={pt.tSec} x1={x(prev.tSec)} y1={y(prev.bpm)} x2={x(pt.tSec)} y2={y(pt.bpm)}
              stroke={color} strokeWidth={pt.unstable ? 1.5 : 2} strokeLinecap="round" />
          )
        })}
      </svg>
      {usingBpmOnly && (
        <p className="text-[9px] text-[#8a7a65] italic tracking-wide">
          Anggaran dari BPM sahaja — bukan data HRV
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ZikirKhafiPlayer({ onSessionDone, onCancel }: Props) {
  const { t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('idle')
  const [sessionMin, setSessionMin] = useState(10)
  const [bpm, setBpm] = useState(60)
  const [beatCount, setBeatCount] = useState(0)
  const [currentLabel, setCurrentLabel] = useState<'Allah' | 'Hu' | ''>('')
  const [pulse, setPulse] = useState(0)
  const [tapBpm, setTapBpm] = useState<number | null>(null)
  const [tapCount, setTapCount] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [consistency, setConsistency] = useState(1)
  const [preBpm, setPreBpm] = useState<number | null>(null)
  const [coherence, setCoherence] = useState(0)
  const [selesaiLoading, setSelesaiLoading] = useState(false)
  const [sessionMode, setSessionMode] = useState<SessionMode>('tap')
  const wakeLock = useWakeLock()
  const audioPulse = useAudioPulse()
  const guidanceAudio = useGuidanceAudio()

  const tapsRef = useRef<number[]>([])
  const phaseRef = useRef<'Allah' | 'Hu'>('Allah')
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const smootherRef = useRef(new BpmSmoother())
  const intervalMsRef = useRef<number>(1000)
  const beatIntervalsRef = useRef<number[]>([])
  // Timestamped mirror of genuine beats, for the "Gelombang Licin" resample+
  // smooth summary chart (see src/lib/smoothedHeartWave.ts) — a SEPARATE
  // array from beatIntervalsRef, never read by computeCoherence(). Only
  // ever populated in BLE mode (mirrors beatIntervalsRef's own isReal
  // gating in firePulseTick below). Capped generously (not the tight
  // rolling window used on the live admin monitor) since this powers a
  // one-shot POST-SESSION chart that needs the whole session's beats, not
  // just a recent scrolling slice — ~4000 beats covers well over an hour
  // of continuous ~1Hz beats, more than any bounded session option needs,
  // while still bounding worst-case memory for the ∞ session option.
  const rawRrBeatSamplesRef = useRef<TimestampedBeat[]>([])
  // Raw BPM-only fallback source (e.g. CYCPLUS-style straps that never send
  // real R-R, so rawRrBeatSamplesRef stays empty all session) — powers the
  // summary chart only when there are no genuine R-R beats to draw from;
  // must never be presented as HRV-derived.
  const rawBpmSamplesRef = useRef<TimestampedBpm[]>([])
  const bpmSumRef = useRef(0)
  const bpmSamplesRef = useRef(0)
  const lastTapRef = useRef(0)
  const decayMsRef = useRef(0)
  const bpmRef = useRef(60)
  // FIFO of genuine device R-R intervals (ms) awaiting a scheduled pulse —
  // refilled by handleHrReading, drained by the BLE pulse scheduler.
  const rrQueueRef = useRef<number[]>([])
  const hrBpmRef = useRef<number | null>(null)
  // Snapshot of the tracked BPM at the exact moment the running phase ends —
  // `bpm` state itself gets overwritten to the session average right after
  // (see finalizeSession), so the summary's start->end decline needs its own
  // stable value rather than reading live `bpm` state.
  const finalBpmRef = useRef<number | null>(null)
  // Full-session BPM trace (post-filter, post-smoothing), sampled every
  // BPM_SAMPLE_INTERVAL_MS regardless of mode — powers the summary graph
  // only. Deliberately NOT used for tier classification (see below) — the
  // display smoothing is tuned for gentle haptic pacing, not for judging
  // whether a genuine dip counts as an achievement.
  const bpmHistoryRef = useRef<{ t: number; bpm: number }[]>([])
  // Per-reading tier tallies from the RAW BLE value (post-filter, before
  // BpmSmoother) — every genuine reading counts here, so a brief real dip
  // that the display EMA hasn't caught up to yet still registers.
  const rawTierCountsRef = useRef<Record<BpmTier, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const bestReachedTierRef = useRef<BpmTier>(1)

  const isInfinity = sessionMin === 0

  useEffect(() => { bpmRef.current = bpm }, [bpm])

  // ── Tap Tempo ──────────────────────────────────────────────────────

  const handleTap = useCallback(() => {
    const now = performance.now()
    if (now - lastTapRef.current < 250) return  // debounce
    lastTapRef.current = now
    const taps = tapsRef.current
    if (taps.length && now - taps[taps.length - 1] > 3000) tapsRef.current = []
    tapsRef.current.push(now)
    if (tapsRef.current.length > 8) tapsRef.current.shift()
    setTapCount(tapsRef.current.length)
    if (tapsRef.current.length >= 2) {
      const diffs: number[] = []
      for (let i = 1; i < tapsRef.current.length; i++) {
        diffs.push(tapsRef.current[i] - tapsRef.current[i - 1])
      }
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
      const computed = Math.round(60000 / avg)
      if (computed >= TAP_MIN && computed <= TAP_MAX) setTapBpm(computed)
    }
    if ('vibrate' in navigator) navigator.vibrate(8)
  }, [])

  // ── BLE device (optional alternative to tap-tempo) ─────────────────

  // Not wrapped with [] deps — needs fresh `phase`/`sessionMode` each call,
  // and useHeartRateMonitor re-captures this into a ref every render anyway
  // (see onReadingRef in useHeartRateMonitor.ts), so identity churn here is
  // harmless — it never tears down or reopens the BLE connection.
  const handleHrReading = useCallback((reading: HeartRateReading) => {
    // Hard physiological gate — a raw reading outside this range is a
    // sensor artifact (motion, poor contact, a glitched BLE packet), never
    // a real beat. Discarded outright, not smoothed: the last valid
    // smoothed value simply holds until a plausible reading arrives.
    if (reading.bpm < PHYSIO_BPM_MIN || reading.bpm > PHYSIO_BPM_MAX) {
      console.warn('[ZikirKhafiPlayer] discarding out-of-range BPM reading:', reading.bpm)
      return
    }
    hrBpmRef.current = reading.bpm
    if (reading.rrIntervalsMs.length) {
      rrQueueRef.current = [...rrQueueRef.current, ...reading.rrIntervalsMs].slice(-16)
    }
    // Drive bpm/smoother/average directly from real readings — the
    // synthetic pacing-decay effect is skipped entirely in BLE mode (see
    // the running-phase effects below).
    if (phase === 'running' && sessionMode === 'ble') {
      // BPM-only fallback source for the summary chart (see
      // rawBpmSamplesRef declaration) — fed every reading regardless of
      // whether this packet carried real R-R, since it's only ever
      // consulted when rawRrBeatSamplesRef ends up empty for the whole
      // session (a device that never sends R-R at all).
      rawBpmSamplesRef.current = [
        ...rawBpmSamplesRef.current,
        { tMs: performance.now(), bpm: reading.bpm },
      ].slice(-4000)

      // Tier tally from the raw reading, before smoothing touches it — every
      // genuine reading counts toward the achievement, not just whatever the
      // damped display value happens to be at each 2.5s sample tick.
      const rawTier = classifyBpmTier(reading.bpm)
      rawTierCountsRef.current[rawTier] += 1
      if (rawTier > bestReachedTierRef.current) bestReachedTierRef.current = rawTier

      const smoothed = smootherRef.current.add(reading.bpm)
      bpmSumRef.current += reading.bpm
      bpmSamplesRef.current += 1
      setBpm(Number(smoothed.toFixed(1)))
    }
  }, [phase, sessionMode])

  // A dropped BLE connection mid-session doesn't pause or prompt to
  // reconnect here (unlike the admin research tool, where preserving a
  // continuous real dataset matters) — it silently falls back to
  // tap-tempo-equivalent pacing so the practice session itself is never
  // interrupted, and the summary honestly reflects only the mode that was
  // actually active by the time the session ended.
  const handleUnexpectedDisconnect = useCallback(() => {
    setSessionMode('tap')
  }, [])

  const hr = useHeartRateMonitor({ onReading: handleHrReading, onUnexpectedDisconnect: handleUnexpectedDisconnect })

  async function handleConnectBle() {
    if (hr.state === 'connecting') return
    setSessionMode('ble')
    setPhase('connecting')
    await hr.connect()
  }

  // Resolve the 'connecting' handshake once hr.state settles — watching
  // state via effect (not chaining off the connect() promise) so a user who
  // backs out before it resolves doesn't get bounced by a stale callback.
  useEffect(() => {
    if (phase !== 'connecting') return
    if (hr.state === 'connected') { setPhase('tapping'); return }
    if (hr.state === 'disconnected' || hr.state === 'unsupported') setPhase('idle')
  }, [phase, hr.state])

  // ── Start session ──────────────────────────────────────────────────

  function startSession(initialBpm: number) {
    // Must run synchronously here, inside the same click handler that
    // called startSession — this is the one gesture-covered entry point
    // shared by both modes' "Mula Sesi" buttons and repeatSession().
    audioPulse.init()
    guidanceAudio.start()
    smootherRef.current = new BpmSmoother()
    smootherRef.current.add(initialBpm)
    setBpm(initialBpm)
    setPreBpm(initialBpm)
    setCoherence(0)
    beatIntervalsRef.current = []
    rawRrBeatSamplesRef.current = []
    rawBpmSamplesRef.current = []
    rrQueueRef.current = []
    finalBpmRef.current = null
    bpmHistoryRef.current = [{ t: 0, bpm: initialBpm }]
    rawTierCountsRef.current = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    bestReachedTierRef.current = classifyBpmTier(initialBpm)
    bpmSumRef.current = initialBpm
    bpmSamplesRef.current = 1
    intervalMsRef.current = 60000 / initialBpm
    phaseRef.current = 'Allah'
    decayMsRef.current = estimateDecayMin(initialBpm) * 60 * 1000
    setBeatCount(0)
    setRemaining(sessionMin * 60)
    setElapsed(0)
    startedAtRef.current = performance.now()
    setPhase('running')
    wakeLock.request()
  }

  // ── Pulse tick — single shared trigger for haptic + orb + audio, so all
  // three sensory cues stay perfectly in sync regardless of which scheduler
  // (tap-mode metronome or BLE-mode real-beat queue) is driving them.
  // isReal=false intervals (synthetic pacing) never feed beatIntervalsRef —
  // that's what stops a "looks precise but isn't measured" figure from
  // being computed at all, the same failure mode fixed on the admin page.
  function firePulseTick(intervalMs: number, isReal: boolean) {
    const isAllah = phaseRef.current === 'Allah'
    isAllah ? fireAllah() : fireHu()
    // Guidance narration and the pulse tone never compete for attention —
    // pause the tone's audio (haptic + orb keep pulsing normally) while
    // narration has the floor. See useGuidanceAudio.ts. Reads the ref (not
    // the isNarrating state) because firePulseTick is captured once by the
    // beat-scheduling effect below (deps [phase, sessionMode]) and re-runs
    // for the whole session — a plain state read here would freeze at
    // whatever isNarrating was at session start.
    if (!guidanceAudio.isNarratingRef.current) audioPulse.play()
    if (isReal) {
      beatIntervalsRef.current.push(intervalMs)
      // Sibling push — same isReal gate as beatIntervalsRef above, just
      // mirrored with a timestamp for the resample+smooth summary chart.
      rawRrBeatSamplesRef.current = [
        ...rawRrBeatSamplesRef.current,
        { tMs: performance.now(), rrMs: intervalMs },
      ].slice(-4000)
    }
    setCurrentLabel(phaseRef.current)
    setBeatCount(c => c + 1)
    setPulse(isAllah ? 1 : 0.55)
    window.setTimeout(() => setPulse(0), isAllah ? 220 : 320)
    phaseRef.current = isAllah ? 'Hu' : 'Allah'
  }

  // ── Beat loop — tap-tempo mode (smooth metronome on the pacing target) ──

  useEffect(() => {
    if (phase !== 'running' || sessionMode !== 'tap') return
    let cancelled = false
    const scheduleNext = () => {
      if (cancelled) return
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return
        // Not a real per-beat measurement (it's the synthetic pacing
        // interval) — see firePulseTick's isReal contract above.
        firePulseTick(intervalMsRef.current, false)
        scheduleNext()
      }, intervalMsRef.current)
    }
    scheduleNext()
    return () => { cancelled = true; if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [phase, sessionMode])

  // ── Beat loop — BLE mode (organic timing from queued real R-R intervals) ─

  useEffect(() => {
    if (phase !== 'running' || sessionMode !== 'ble') return
    let cancelled = false
    const scheduleNextBle = () => {
      if (cancelled) return
      const queue = rrQueueRef.current
      const hasReal = queue.length > 0
      const ms = hasReal ? queue.shift()! : 60000 / (hrBpmRef.current || TARGET_BPM)
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return
        firePulseTick(ms, hasReal)
        scheduleNextBle()
      }, ms)
    }
    scheduleNextBle()
    return () => { cancelled = true; if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [phase, sessionMode])

  // ── Countdown / elapsed ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const elapsedSec = (performance.now() - startedAtRef.current) / 1000
      setElapsed(elapsedSec)
      setConsistency(smootherRef.current.consistency())
      guidanceAudio.onElapsedTick(elapsedSec)
      if (!isInfinity) {
        const left = Math.max(0, sessionMin * 60 - elapsedSec)
        setRemaining(left)
        if (left <= 0) finalizeSession()
      }
    }, 250)
    return () => window.clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionMin, isInfinity])

  // ── Pacing guide — gradual linear decay from the real starting BPM down to
  // TARGET_BPM over decayMsRef (entrainment: guide first, heart follows).
  // If the starting BPM is already within the Zikir Khafi range, decayMsRef
  // is 0 and the pacing simply holds steady — no forced drop.
  // Tap-tempo mode only — BLE mode drives bpm/smoother from real readings
  // in handleHrReading instead (see above).
  useEffect(() => {
    if (phase !== 'running' || sessionMode !== 'tap') return
    const startBpm = preBpm ?? bpm
    const decayMs = decayMsRef.current
    const id = window.setInterval(() => {
      if (decayMs <= 0) return
      const elapsedMs = performance.now() - startedAtRef.current
      const progress = Math.min(1, elapsedMs / decayMs)
      const pacingTarget = startBpm - (startBpm - TARGET_BPM) * progress
      const clamped = Math.max(TARGET_BPM, pacingTarget)
      const smoothed = smootherRef.current.add(clamped)
      intervalMsRef.current = 60000 / smoothed
      bpmSumRef.current += smoothed
      bpmSamplesRef.current += 1
      setBpm(Number(smoothed.toFixed(1)))
    }, 2000)
    return () => window.clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionMode])

  // ── BPM history sampler — mode-agnostic (reads bpmRef, whichever
  // scheduler is driving it), so the summary graph works the same way
  // regardless of tap-tempo or BLE mode.
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const elapsedSec = Math.round((performance.now() - startedAtRef.current) / 1000)
      bpmHistoryRef.current = [...bpmHistoryRef.current, { t: elapsedSec, bpm: bpmRef.current }]
    }, BPM_SAMPLE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [phase])

  // ── Finalize ───────────────────────────────────────────────────────

  // Goes straight to 'summary' — no more manual post-session pulse tap. That
  // screen predated continuous bpmHistory recording; finalBpmRef already
  // captures an accurate, automatic end-of-session BPM, so asking the user
  // to tap again afterward added friction with no remaining data value.
  function finalizeSession() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    // bpmRef, not bpm state — this can run from a countdown-effect closure
    // that predates the latest bpm update (effect deps don't include bpm),
    // so only the ref is guaranteed current.
    finalBpmRef.current = bpmRef.current
    guidanceAudio.stop()
    const c = computeCoherence(beatIntervalsRef.current)
    setCoherence(c)
    const avg = bpmSamplesRef.current > 0 ? bpmSumRef.current / bpmSamplesRef.current : bpm
    setBpm(Number(avg.toFixed(1)))
    tapsRef.current = []
    setTapCount(0)
    setTapBpm(null)
    setPhase('summary')
    wakeLock.release()
  }

  async function handleSelesai() {
    if (selesaiLoading) return
    const avg = bpmSamplesRef.current > 0 ? bpmSumRef.current / bpmSamplesRef.current : bpm
    setSelesaiLoading(true)
    try {
      await onSessionDone({
        durationMin: sessionMin,
        actualSec: Math.round(elapsed),
        preBpm,
        finalBpm: finalBpmRef.current,
        avgBpm: Number(avg.toFixed(1)),
        beatCount,
        sessionMode,
        // Only meaningful for a BLE session (real R-R data) — never send a
        // tap-tempo-derived value, since it was never a real measurement.
        coherence: sessionMode === 'ble' ? coherence : null,
        consistency: sessionMode === 'ble' ? consistency : null,
        dominantTier: sessionMode === 'ble' ? tierBreakdown?.dominant ?? null : null,
        deepestTier: sessionMode === 'ble' ? tierBreakdown?.bestReached ?? null : null,
      })
    } finally {
      setSelesaiLoading(false)
    }
  }

  function repeatSession() {
    startSession(preBpm ?? 60)
  }

  function resetAll() {
    guidanceAudio.stop()
    if (sessionMode === 'ble') hr.disconnect()
    setSessionMode('tap')
    setPhase('idle')
    setBeatCount(0)
    setTapBpm(null)
    setCurrentLabel('')
    setPulse(0)
    setPreBpm(null)
    setCoherence(0)
    setElapsed(0)
    wakeLock.release()
  }

  const mmss = useMemo(() => {
    const s = isInfinity ? Math.floor(elapsed) : Math.ceil(remaining)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }, [remaining, elapsed, isInfinity])

  // Uses finalBpmRef (the real tracked end-of-session value) instead of a
  // manually re-tapped post-session BPM — that extra tap was removed since
  // finalBpmRef already captures this automatically, in both modes.
  // Rounded — subtracting two "clean" floats (e.g. 75 - 70.4) can still land
  // on a JS binary floating-point artifact like 4.599999999999994, and an
  // unrounded value would also make the ===0 "steady" check nearly unreachable.
  const bpmDelta = preBpm !== null && finalBpmRef.current !== null ? Math.round(finalBpmRef.current - preBpm) : null

  const isPacingDown = preBpm !== null && preBpm > ZIKIR_RANGE_MAX
  const pacingProgress = isPacingDown && preBpm !== null
    ? Math.max(0, Math.min(1, (preBpm - bpm) / (preBpm - TARGET_BPM)))
    : 1
  const inZikirRange = bpm <= ZIKIR_RANGE_MAX
  const crossedZikirRange = isPacingDown && finalBpmRef.current !== null && finalBpmRef.current <= ZIKIR_RANGE_MAX
  // Only meaningful once the running phase has actually ended — bpmHistoryRef
  // stops changing at that point, so this is stable for the summary render.
  const tierBreakdown = phase === 'summary'
    ? computeTierBreakdown(rawTierCountsRef.current, bestReachedTierRef.current)
    : null

  // ── Render ─────────────────────────────────────────────────────────

  // ── IDLE ─────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-8 py-8 px-4 text-center">
        <div className="space-y-2">
          <p className="font-serif text-[#a78bfa] text-xl tracking-[0.15em]">Zikir Khafi</p>
          <p className="text-[#8a7a65] text-xs leading-relaxed max-w-xs">
            Zikir senyap diselaraskan dengan degupan jantung anda. Setiap detak bergilir antara{' '}
            <em className="not-italic text-[#c9a96e]">Allah</em> dan{' '}
            <em className="not-italic text-[#a78bfa]">Hu</em>,
            dirasai melalui haptik lembut.
          </p>
        </div>

        {/* Session length */}
        <div className="space-y-3 w-full max-w-xs">
          <p className="text-[#8a7a65] text-[10px] uppercase tracking-[0.3em]">
            {t('amalan.khafi_player.tempoh')}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SESSION_OPTIONS.map(m => (
              <button key={m} onClick={() => setSessionMin(m)}
                className={cn('py-3 rounded-xl border text-sm font-medium transition-all',
                  sessionMin === m
                    ? 'border-[#a78bfa60] bg-[#a78bfa15] text-[#a78bfa]'
                    : 'border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8]')}>
                {m === 0 ? '∞' : `${m}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Soft audio pulse toggle */}
        <div className="flex items-center justify-between w-full max-w-xs px-1">
          <span className="text-[#8a7a65] text-xs">{t('amalan.khafi_player.audio_label')}</span>
          <button
            onClick={() => audioPulse.setEnabled(!audioPulse.enabled)}
            disabled={!audioPulse.isSupported}
            className={cn('w-11 h-6 rounded-full relative transition-all disabled:opacity-30',
              audioPulse.enabled ? 'bg-[#a78bfa]' : 'bg-[#1e2d40]')}
          >
            <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
              audioPulse.enabled ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>

        {/* Spoken guidance narration — independent of the pulse tone above */}
        <div className="flex items-center justify-between w-full max-w-xs px-1">
          <span className="text-[#8a7a65] text-xs">{t('amalan.khafi_player.bimbingan_label')}</span>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0d1821] border border-[#1e2d40]">
            {([
              ['off', 'bimbingan_tutup'],
              ['first3min', 'bimbingan_3min'],
              ['full', 'bimbingan_penuh'],
            ] as const).map(([m, key]) => (
              <button
                key={m}
                onClick={() => guidanceAudio.setMode(m)}
                disabled={!guidanceAudio.isAvailable}
                className={cn('px-2.5 py-1 rounded-md text-[10px] transition-colors disabled:opacity-30',
                  guidanceAudio.mode === m ? 'bg-[#a78bfa] text-[#060d16] font-medium' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}
              >
                {t(`amalan.khafi_player.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => { tapsRef.current = []; setTapCount(0); setTapBpm(null); setSessionMode('tap'); setPhase('tapping') }}
            className="w-full py-3.5 rounded-2xl border border-[#a78bfa50] text-sm tracking-[0.2em] uppercase text-[#a78bfa] hover:bg-[#a78bfa10] transition-colors"
          >
            {t('amalan.khafi_player.mula_btn')}
          </button>
          {hr.state !== 'unsupported' && (
            <button
              onClick={handleConnectBle}
              className="w-full py-3.5 rounded-2xl border border-emerald-500/50 text-sm tracking-[0.2em] uppercase text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              🫀 {t('amalan.khafi_player.mula_ble_btn')}
            </button>
          )}
          <button onClick={onCancel} className="text-[#8a7a65] text-xs hover:text-[#e8dcc8] transition-colors">
            ← {t('umum.kembali')}
          </button>
        </div>
      </div>
    )
  }

  // ── CONNECTING ─────────────────────────────────────────────────────────
  if (phase === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-6 py-16 px-4 text-center">
        <div className="w-10 h-10 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-[#8a7a65] text-xs uppercase tracking-[0.3em]">
          {t('amalan.khafi_player.ble_menyambung')}
        </p>
        <button onClick={() => setPhase('idle')} className="text-[#8a7a65] text-xs hover:text-[#e8dcc8] transition-colors">
          {t('umum.batal')}
        </button>
      </div>
    )
  }

  // ── TAPPING (BLE-ready branch) ──────────────────────────────────────
  if (phase === 'tapping' && sessionMode === 'ble') {
    const ready = hr.bpm !== null
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4 text-center">
        <p className="text-[#8a7a65] text-[10px] uppercase tracking-[0.3em]">
          {t('amalan.khafi_player.ble_sedia')}
        </p>

        <div className="flex flex-col items-center gap-2 py-8 px-10 rounded-3xl border border-emerald-500/40"
          style={{ background: 'radial-gradient(circle at center, rgba(16,185,129,0.08), rgba(16,185,129,0) 70%)' }}>
          <BleStatusBadge state={hr.state} />
          <span className="text-5xl font-light text-[#e8dcc8]">{hr.bpm ?? '—'}</span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
            {hr.deviceName ?? 'bpm'}
          </span>
        </div>

        {hr.bpm !== null && (
          <p className={cn('text-xs max-w-xs leading-relaxed', hr.bpm > ZIKIR_RANGE_MAX ? 'text-[#a78bfa]' : 'text-[#4ade80]')}>
            {hr.bpm > ZIKIR_RANGE_MAX
              ? t('amalan.khafi_player.pacing_intro', { bpm: hr.bpm, min: estimateDecayMin(hr.bpm) })
              : t('amalan.khafi_player.pacing_ready')}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={resetAll} className="px-5 py-2 text-xs tracking-widest uppercase text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
            {t('umum.batal')}
          </button>
          <button
            onClick={() => { hr.disconnect(); setSessionMode('tap'); tapsRef.current = []; setTapCount(0); setTapBpm(null) }}
            className="text-[10px] uppercase tracking-widest text-[#8a7a65] hover:text-[#e8dcc8] underline transition-colors"
          >
            {t('amalan.khafi_player.ble_guna_tap')}
          </button>
          <button
            disabled={!ready}
            onClick={() => hr.bpm && startSession(hr.bpm)}
            className="px-7 py-2.5 rounded-full border border-emerald-500/50 text-xs tracking-[0.2em] uppercase text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-500/10 transition-colors"
          >
            {t('amalan.khafi_player.mula_sesi')}
          </button>
        </div>
      </div>
    )
  }

  // ── TAPPING (manual tap-tempo branch) ───────────────────────────────
  if (phase === 'tapping') {
    const ready = tapBpm !== null
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4 text-center">
        <p className="text-[#8a7a65] text-[10px] uppercase tracking-[0.3em]">
          {t('amalan.khafi_player.ketuk_arahan')}
        </p>

        {/* Tap circle + ±1 buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => setTapBpm(prev => Math.max(TAP_MIN, (prev ?? 60) - 1))}
            className="w-10 h-10 rounded-full border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#a78bfa30] transition-all flex items-center justify-center text-xl select-none"
          >−</button>

          <button
            onClick={handleTap}
            className="relative rounded-full border border-[#a78bfa30] hover:border-[#a78bfa60] active:scale-95 transition-all select-none"
            style={{
              width: 200, height: 200,
              background: 'radial-gradient(circle at center, rgba(167,139,250,0.08), rgba(167,139,250,0) 70%)',
            }}
          >
            <span className="text-5xl font-light text-[#e8dcc8]">{tapBpm ?? '—'}</span>
            <span className="block mt-2 text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
              {tapBpm ? 'bpm' : t('amalan.khafi_player.ketuk_tap')}
            </span>
          </button>

          <button
            onClick={() => setTapBpm(prev => Math.min(TAP_MAX, (prev ?? 60) + 1))}
            className="w-10 h-10 rounded-full border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#a78bfa30] transition-all flex items-center justify-center text-xl select-none"
          >+</button>
        </div>

        <p className="text-[#8a7a65] text-xs">
          {tapCount < 2
            ? t('amalan.khafi_player.ketuk_min')
            : tapCount < 5
            ? t('amalan.khafi_player.ketuk_terus', { n: tapCount })
            : t('amalan.khafi_player.ketuk_stabil', { n: tapCount })}
        </p>

        {tapBpm !== null && (
          <p className={cn('text-xs max-w-xs leading-relaxed', tapBpm > ZIKIR_RANGE_MAX ? 'text-[#a78bfa]' : 'text-[#4ade80]')}>
            {tapBpm > ZIKIR_RANGE_MAX
              ? t('amalan.khafi_player.pacing_intro', { bpm: tapBpm, min: estimateDecayMin(tapBpm) })
              : t('amalan.khafi_player.pacing_ready')}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={resetAll} className="px-5 py-2 text-xs tracking-widest uppercase text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
            {t('umum.batal')}
          </button>
          <button
            disabled={!ready}
            onClick={() => tapBpm && startSession(tapBpm)}
            className="px-7 py-2.5 rounded-full border border-[#a78bfa50] text-xs tracking-[0.2em] uppercase text-[#a78bfa] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#a78bfa10] transition-colors"
          >
            {t('amalan.khafi_player.mula_sesi')}
          </button>
        </div>
      </div>
    )
  }

  // ── RUNNING ───────────────────────────────────────────────────────────
  if (phase === 'running') {
    return (
      <div className="relative min-h-[70dvh] flex flex-col items-center justify-between py-10 select-none">
        {/* Timer top */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[#8a7a65] text-[10px] uppercase tracking-[0.4em] font-mono">
              {isInfinity ? `${mmss} ${t('amalan.khafi_player.berlalu')}` : mmss}
            </p>
            <WakeLockBadge status={wakeLock.status} />
            {sessionMode === 'ble' && <BleStatusBadge state={hr.state} />}
          </div>

          {/* Pacing guide — only shown when starting BPM was above the Zikir Khafi range */}
          {isPacingDown && preBpm !== null && (
            <div className="w-full max-w-[220px] flex flex-col items-center gap-1.5">
              <p className="text-[9px] uppercase tracking-[0.25em] text-[#8a7a65]">
                {t('amalan.khafi_player.pacing_progress', { start: preBpm, target: TARGET_BPM })}
              </p>
              <div className="w-full h-1 bg-[#1e2d40] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#a78bfa] transition-all duration-700"
                  style={{ width: `${pacingProgress * 100}%` }}
                />
              </div>
              {inZikirRange && (
                <p className="text-[10px] text-[#4ade80]">{t('amalan.khafi_player.pacing_in_range')}</p>
              )}
            </div>
          )}
        </div>

        {/* Animated Orb — tap anywhere to add count */}
        <button
          className="flex-1 flex items-center justify-center w-full"
          onClick={() => { /* orb tap — no action, just visual */ }}
          aria-hidden="true"
          tabIndex={-1}
        >
          <GuidedOrb pulse={pulse} label={currentLabel} />
        </button>

        {/* Stats + End button */}
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
            <span>{bpm.toFixed(0)} bpm</span>
            <span>{beatCount} {t('amalan.khafi_player.ketukan').toLowerCase()}</span>
            {/* Same BLE-only gate as the summary screen — this was the
                exact live figure that first surfaced the synthetic-100%
                issue, so it can't stay ungated here while summary is fixed. */}
            {sessionMode === 'ble' && <span>{(consistency * 100).toFixed(0)}%</span>}
          </div>
          <button
            onClick={finalizeSession}
            className="text-[10px] uppercase tracking-[0.4em] text-[#8a7a65] hover:text-[#e8dcc8] transition-colors"
          >
            {t('amalan.khafi_player.tamat')}
          </button>
        </div>
      </div>
    )
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 text-center max-w-xs mx-auto">
      <p className="text-[#a78bfa] text-[10px] uppercase tracking-[0.4em]">
        {t('amalan.khafi_player.selesai_tajuk')}
      </p>

      {/* BPM decline — primary metric, honestly derived in BOTH modes (a
          real detected beat or a real tap, never the synthetic curve) */}
      {preBpm !== null && finalBpmRef.current !== null && (
        <div className="space-y-2">
          <div className="flex items-end gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-light text-[#e8dcc8]">{preBpm}</span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
                {t('amalan.khafi_player.mula_bpm')}
              </span>
            </div>
            <div className="pb-3 text-[#8a7a65] text-2xl font-light">→</div>
            <div className="flex flex-col items-center gap-1">
              <span className={cn('text-5xl font-light', crossedZikirRange ? 'text-[#4ade80]' : 'text-[#e8dcc8]')}>
                {Math.round(finalBpmRef.current)}
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
                {t('amalan.khafi_player.akhir_bpm')}
              </span>
            </div>
          </div>
          {isPacingDown ? (
            <p className={cn('text-xs tracking-wide', crossedZikirRange ? 'text-[#4ade80]' : 'text-[#8a7a65]')}>
              {crossedZikirRange ? `✓ ${t('amalan.khafi_player.pacing_selesai')}` : t('amalan.khafi_player.pacing_belum')}
            </p>
          ) : (
            <>
              <p className="text-[#4ade80] text-xs tracking-wide">{t('amalan.khafi_player.pacing_ready')}</p>
              {/* Already started in range — pacing_ready covers the range
                  itself, this adds whether it settled further during the
                  session (using finalBpm, not a manually re-tapped value). */}
              {bpmDelta !== null && (
                <p className={cn('text-xs tracking-wide', bpmDelta < 0 ? 'text-[#4ade80]' : 'text-[#8a7a65]')}>
                  {bpmDelta < 0
                    ? t('amalan.khafi_player.lebih_tenang', { n: Math.abs(bpmDelta) })
                    : bpmDelta === 0
                    ? t('amalan.khafi_player.stabil')
                    : `↑ ${bpmDelta} bpm`}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Summary chart — BLE mode gets the "Gelombang Licin" resample+smooth
          wave (real R-R/BPM stream to draw from); tap mode keeps the
          existing BpmHistoryGraph pacing curve unchanged, since tap-tempo
          never has genuine per-beat data (see firePulseTick's isReal gate). */}
      {sessionMode === 'ble'
        ? (rawRrBeatSamplesRef.current.length >= 2 || rawBpmSamplesRef.current.length >= 2) && (
            <SmoothedWaveChart rrBeats={rawRrBeatSamplesRef.current} bpmSamples={rawBpmSamplesRef.current} />
          )
        : bpmHistoryRef.current.length >= 2 && (
            <BpmHistoryGraph history={bpmHistoryRef.current} mode={sessionMode} />
          )}

      {sessionMode === 'ble' && tierBreakdown ? (
        // Tier badges — BLE-only, deliberately: a value-add exclusive to
        // users with a real device, not shown for tap-tempo since the
        // underlying data isn't genuine biological measurement.
        <div className="space-y-2 w-full">
          <div className="inline-flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border"
            style={{ borderColor: TIER_META[tierBreakdown.dominant].color + '60', background: TIER_META[tierBreakdown.dominant].color + '15' }}>
            <span className="text-sm font-medium" style={{ color: TIER_META[tierBreakdown.dominant].color }}>
              {t(`amalan.khafi_player.${TIER_META[tierBreakdown.dominant].key}`)}
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#8a7a65]">
              {t('amalan.khafi_player.tahap_dominan')}
            </span>
          </div>
          {tierBreakdown.bestReached > tierBreakdown.dominant && (
            <p className="text-[10px] text-[#8a7a65]">
              {t('amalan.khafi_player.tahap_terdalam', { tier: t(`amalan.khafi_player.${TIER_META[tierBreakdown.bestReached].key}`) })}
            </p>
          )}
          {/* Compact time-in-tier breakdown */}
          <div className="flex w-full h-1.5 rounded-full overflow-hidden">
            {([1, 2, 3, 4, 5] as BpmTier[]).filter(tier => tierBreakdown.pct[tier] > 0).map(tier => (
              <div key={tier} style={{ width: `${tierBreakdown.pct[tier]}%`, background: TIER_META[tier].color }} />
            ))}
          </div>
        </div>
      ) : sessionMode === 'tap' ? (
        <p className="text-[#8a7a65] text-xs leading-relaxed max-w-xs">
          {t('amalan.khafi_player.ble_upsell')}
        </p>
      ) : null}

      {/* Coherence/consistency — BLE-connected sessions only, where they're
          finally computed from genuine R-R data instead of a synthetic
          pacing curve (see firePulseTick's isReal contract). */}
      {sessionMode === 'ble' && (
        <>
          <CoherenceRing value={coherence} label={t('amalan.khafi_player.koheren')} />
          <div className="flex items-center gap-2 text-emerald-400/70 text-[10px] uppercase tracking-[0.3em]">
            🫀 {t('amalan.khafi_player.ble_data_sebenar')}
          </div>
        </>
      )}

      {/* Stats */}
      <div className={cn('grid gap-6', sessionMode === 'ble' ? 'grid-cols-3' : 'grid-cols-2')}>
        {[
          { label: t('amalan.khafi_player.ketukan'), value: beatCount.toString() },
          { label: t('amalan.khafi_player.purata_bpm'), value: bpm.toFixed(0) },
          ...(sessionMode === 'ble'
            ? [{ label: t('amalan.khafi_player.konsistensi'), value: `${(consistency * 100).toFixed(0)}%` }]
            : []),
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-2">
            <span className="text-3xl font-light text-[#e8dcc8]">{s.value}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 w-full mt-2">
        <button
          onClick={handleSelesai}
          disabled={selesaiLoading}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm text-[#060d16] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)', minHeight: 52 }}
        >
          {selesaiLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#060d16] border-t-transparent rounded-full animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            t('amalan.khafi_player.selesai_btn')
          )}
        </button>
        <button onClick={repeatSession}
          className="px-6 py-2.5 rounded-full border border-[#a78bfa40] text-xs tracking-[0.2em] uppercase text-[#a78bfa] hover:bg-[#a78bfa10] transition-colors">
          {t('amalan.khafi_player.ulangi')}
        </button>
      </div>
    </div>
  )
}
