import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KhafiSessionResult {
  durationMin: number       // target duration (0 = ∞)
  actualSec: number         // actual elapsed seconds
  preBpm: number | null     // BPM before session
  postBpm: number | null    // BPM after (null = skipped)
  avgBpm: number            // average during session
  beatCount: number         // total beats
  coherence: number         // 0–1
  consistency: number       // 0–1
}

interface Props {
  onSessionDone: (result: KhafiSessionResult) => void
  onCancel: () => void
}

type Phase = 'idle' | 'tapping' | 'running' | 'post_measure' | 'summary'

const SESSION_OPTIONS = [5, 10, 20, 0] as const  // 0 = ∞

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

// ─── Coherence (RMSSD-derived) ───────────────────────────────────────────────

function computeCoherence(intervals: number[]): number {
  if (intervals.length < 4) return 0
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  let sq = 0
  for (let i = 1; i < intervals.length; i++) {
    const d = intervals[i] - intervals[i - 1]
    sq += d * d
  }
  const rmssd = Math.sqrt(sq / (intervals.length - 1))
  return Math.max(0, Math.min(1, 1 - rmssd / mean / 0.15))
}

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
  const [postBpm, setPostBpm] = useState<number | null>(null)
  const [coherence, setCoherence] = useState(0)

  const tapsRef = useRef<number[]>([])
  const phaseRef = useRef<'Allah' | 'Hu'>('Allah')
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const smootherRef = useRef(new BpmSmoother())
  const intervalMsRef = useRef<number>(1000)
  const beatIntervalsRef = useRef<number[]>([])
  const bpmSumRef = useRef(0)
  const bpmSamplesRef = useRef(0)
  const lastTapRef = useRef(0)

  const isInfinity = sessionMin === 0

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
      if (computed >= 40 && computed <= 60) setTapBpm(computed)
    }
    if ('vibrate' in navigator) navigator.vibrate(8)
  }, [])

  // ── Start session ──────────────────────────────────────────────────

  function startSession(initialBpm: number) {
    smootherRef.current = new BpmSmoother()
    smootherRef.current.add(initialBpm)
    setBpm(initialBpm)
    setPreBpm(initialBpm)
    setPostBpm(null)
    setCoherence(0)
    beatIntervalsRef.current = []
    bpmSumRef.current = initialBpm
    bpmSamplesRef.current = 1
    intervalMsRef.current = 60000 / initialBpm
    phaseRef.current = 'Allah'
    setBeatCount(0)
    setRemaining(sessionMin * 60)
    setElapsed(0)
    startedAtRef.current = performance.now()
    setPhase('running')
  }

  // ── Beat loop ──────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'running') return
    let cancelled = false
    const scheduleNext = () => {
      if (cancelled) return
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return
        const isAllah = phaseRef.current === 'Allah'
        isAllah ? fireAllah() : fireHu()
        beatIntervalsRef.current.push(intervalMsRef.current)
        setCurrentLabel(phaseRef.current)
        setBeatCount(c => c + 1)
        setPulse(isAllah ? 1 : 0.55)
        window.setTimeout(() => setPulse(0), isAllah ? 220 : 320)
        phaseRef.current = isAllah ? 'Hu' : 'Allah'
        scheduleNext()
      }, intervalMsRef.current)
    }
    scheduleNext()
    return () => { cancelled = true; if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [phase])

  // ── Countdown / elapsed ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const elapsedSec = (performance.now() - startedAtRef.current) / 1000
      setElapsed(elapsedSec)
      setConsistency(smootherRef.current.consistency())
      if (!isInfinity) {
        const left = Math.max(0, sessionMin * 60 - elapsedSec)
        setRemaining(left)
        if (left <= 0) finalizeSession()
      }
    }, 250)
    return () => window.clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionMin, isInfinity])

  // ── Live BPM drift (simulate slight variation) ─────────────────────

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const drift = (Math.random() - 0.5) * 4
      const newBpm = smootherRef.current.add(bpm + drift)
      intervalMsRef.current = 60000 / newBpm
      bpmSumRef.current += newBpm
      bpmSamplesRef.current += 1
      setBpm(Number(newBpm.toFixed(1)))
    }, 3000)
    return () => window.clearInterval(id)
  }, [phase, bpm])

  // ── Finalize ───────────────────────────────────────────────────────

  function finalizeSession() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    const c = computeCoherence(beatIntervalsRef.current)
    setCoherence(c)
    tapsRef.current = []
    setTapCount(0)
    setTapBpm(null)
    setPhase('post_measure')
  }

  function skipPostMeasure() { commitAndShow(null) }
  function confirmPostMeasure() { if (tapBpm) commitAndShow(tapBpm) }

  function commitAndShow(postValue: number | null) {
    const avg = bpmSamplesRef.current > 0 ? bpmSumRef.current / bpmSamplesRef.current : bpm
    setPostBpm(postValue)
    setBpm(Number(avg.toFixed(1)))
    setPhase('summary')
  }

  function handleSelesai() {
    const avg = bpmSamplesRef.current > 0 ? bpmSumRef.current / bpmSamplesRef.current : bpm
    onSessionDone({
      durationMin: sessionMin,
      actualSec: Math.round(elapsed),
      preBpm,
      postBpm,
      avgBpm: Number(avg.toFixed(1)),
      beatCount,
      coherence,
      consistency,
    })
  }

  function repeatSession() {
    startSession(preBpm ?? 60)
  }

  function resetAll() {
    setPhase('idle')
    setBeatCount(0)
    setTapBpm(null)
    setCurrentLabel('')
    setPulse(0)
    setPreBpm(null)
    setPostBpm(null)
    setCoherence(0)
    setElapsed(0)
  }

  // ── Orb animation ──────────────────────────────────────────────────

  const orbScale = 0.85 + pulse * 0.35
  const orbOpacity = 0.5 + pulse * 0.5

  const mmss = useMemo(() => {
    const s = isInfinity ? Math.floor(elapsed) : Math.ceil(remaining)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }, [remaining, elapsed, isInfinity])

  const bpmDelta = preBpm !== null && postBpm !== null ? postBpm - preBpm : null

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

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => { tapsRef.current = []; setTapCount(0); setTapBpm(null); setPhase('tapping') }}
            className="w-full py-3.5 rounded-2xl border border-[#a78bfa50] text-sm tracking-[0.2em] uppercase text-[#a78bfa] hover:bg-[#a78bfa10] transition-colors"
          >
            {t('amalan.khafi_player.mula_btn')}
          </button>
          <button onClick={onCancel} className="text-[#8a7a65] text-xs hover:text-[#e8dcc8] transition-colors">
            ← {t('umum.kembali')}
          </button>
        </div>
      </div>
    )
  }

  // ── TAPPING ───────────────────────────────────────────────────────────
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
            onClick={() => setTapBpm(prev => Math.max(40, (prev ?? 60) - 1))}
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
            onClick={() => setTapBpm(prev => Math.min(60, (prev ?? 60) + 1))}
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
        <div className="text-center">
          <p className="text-[#8a7a65] text-[10px] uppercase tracking-[0.4em] font-mono">
            {isInfinity ? `${mmss} ${t('amalan.khafi_player.berlalu')}` : mmss}
          </p>
        </div>

        {/* Animated Orb — tap anywhere to add count */}
        <button
          className="flex-1 flex items-center justify-center w-full"
          onClick={() => { /* orb tap — no action, just visual */ }}
          aria-hidden="true"
          tabIndex={-1}
        >
          <div
            className="rounded-full transition-all ease-out pointer-events-none"
            style={{
              width: 260, height: 260,
              transform: `scale(${orbScale})`,
              opacity: orbOpacity,
              background: currentLabel === 'Allah'
                ? 'radial-gradient(circle at center, rgba(201,169,110,0.9), rgba(201,169,110,0.1) 55%, rgba(0,0,0,0) 75%)'
                : 'radial-gradient(circle at center, rgba(167,139,250,0.7), rgba(167,139,250,0.1) 55%, rgba(0,0,0,0) 75%)',
              filter: 'blur(0.5px)',
              willChange: 'transform, opacity',
              transitionDuration: '150ms',
            }}
          />
        </button>

        {/* Stats + End button */}
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
            <span>{bpm.toFixed(0)} bpm</span>
            <span>{beatCount} {t('amalan.khafi_player.ketukan').toLowerCase()}</span>
            <span>{(consistency * 100).toFixed(0)}%</span>
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

  // ── POST MEASURE ──────────────────────────────────────────────────────
  if (phase === 'post_measure') {
    const ready = tapBpm !== null
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4 text-center">
        <p className="text-[#a78bfa] text-[10px] uppercase tracking-[0.4em]">
          {t('amalan.khafi_player.rehat')}
        </p>
        <p className="text-[#8a7a65] text-xs max-w-xs leading-relaxed">
          {t('amalan.khafi_player.rehat_arahan')}
        </p>

        <div className="flex items-center gap-5">
          <button onClick={() => setTapBpm(prev => Math.max(40, (prev ?? 60) - 1))}
            className="w-10 h-10 rounded-full border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#a78bfa30] transition-all flex items-center justify-center text-xl select-none">
            −
          </button>
          <button onClick={handleTap}
            className="relative rounded-full border border-[#a78bfa20] hover:border-[#a78bfa40] active:scale-95 transition-all select-none"
            style={{
              width: 160, height: 160,
              background: 'radial-gradient(circle at center, rgba(167,139,250,0.06), rgba(0,0,0,0) 70%)',
            }}>
            <span className="text-4xl font-light text-[#e8dcc8]">{tapBpm ?? '—'}</span>
            <span className="block mt-1 text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
              {tapBpm ? 'bpm' : t('amalan.khafi_player.ketuk_tap')}
            </span>
          </button>
          <button onClick={() => setTapBpm(prev => Math.min(60, (prev ?? 60) + 1))}
            className="w-10 h-10 rounded-full border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#a78bfa30] transition-all flex items-center justify-center text-xl select-none">
            +
          </button>
        </div>

        <p className="text-[#8a7a65] text-xs">
          {tapCount < 2
            ? t('amalan.khafi_player.ketuk_min')
            : t('amalan.khafi_player.ketuk_stabil', { n: tapCount })}
        </p>

        <div className="flex gap-3">
          <button onClick={skipPostMeasure}
            className="px-5 py-2 text-xs tracking-widest uppercase text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
            {t('amalan.khafi_player.langkau')}
          </button>
          <button disabled={!ready} onClick={confirmPostMeasure}
            className="px-7 py-2.5 rounded-full border border-[#a78bfa50] text-xs tracking-[0.2em] uppercase text-[#a78bfa] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#a78bfa10] transition-colors">
            {t('amalan.khafi_player.simpan')}
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

      {/* Pre / Post BPM */}
      {preBpm !== null && (
        <div className="flex items-end gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-5xl font-light text-[#e8dcc8]">{preBpm}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
              {t('amalan.khafi_player.sebelum')}
            </span>
          </div>
          <div className="pb-3 text-[#8a7a65] text-2xl font-light">→</div>
          <div className="flex flex-col items-center gap-1">
            <span className={cn('text-5xl font-light', bpmDelta !== null && bpmDelta < 0 ? 'text-[#4ade80]' : 'text-[#e8dcc8]')}>
              {postBpm ?? '—'}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a7a65]">
              {t('amalan.khafi_player.selepas')}
            </span>
          </div>
        </div>
      )}

      {bpmDelta !== null && (
        <p className={cn('text-xs tracking-wide', bpmDelta < 0 ? 'text-[#4ade80]' : 'text-[#8a7a65]')}>
          {bpmDelta < 0
            ? t('amalan.khafi_player.lebih_tenang', { n: Math.abs(bpmDelta) })
            : bpmDelta === 0
            ? t('amalan.khafi_player.stabil')
            : `↑ ${bpmDelta} bpm`}
        </p>
      )}

      {/* Coherence Ring */}
      <CoherenceRing value={coherence} label={t('amalan.khafi_player.koheren')} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: t('amalan.khafi_player.ketukan'), value: beatCount.toString() },
          { label: t('amalan.khafi_player.purata_bpm'), value: bpm.toFixed(0) },
          { label: t('amalan.khafi_player.konsistensi'), value: `${(consistency * 100).toFixed(0)}%` },
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
          className="w-full py-3.5 rounded-2xl font-semibold text-sm text-[#060d16] hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' }}
        >
          {t('amalan.khafi_player.selesai_btn')}
        </button>
        <button onClick={repeatSession}
          className="px-6 py-2.5 rounded-full border border-[#a78bfa40] text-xs tracking-[0.2em] uppercase text-[#a78bfa] hover:bg-[#a78bfa10] transition-colors">
          {t('amalan.khafi_player.ulangi')}
        </button>
      </div>
    </div>
  )
}
