import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GUIDANCE_AUDIO_BUCKET, GUIDANCE_AUDIO_PATH } from '@/config/zikirGuidanceAudio'

const STORAGE_KEY = 'madrasah_khafi_guidance_mode'
const FIRST3MIN_CUTOFF_SEC = 180
const FADE_OUT_MS = 2500
const FADE_STEP_MS = 100

export type GuidanceMode = 'off' | 'first3min' | 'full'

function loadMode(): GuidanceMode {
  if (typeof window === 'undefined') return 'first3min'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'off' || stored === 'first3min' || stored === 'full' ? stored : 'first3min'
}

// ─── Hook ────────────────────────────────────────────────────────────────
// Spoken orientation narration — a separate, independent playback layer
// from useAudioPulse.ts (the wordless per-beat tone), which this hook never
// imports from or modifies. See src/config/zikirGuidanceAudio.ts for how to
// swap the recording.
//
// start() MUST be called synchronously inside the same user-gesture handler
// that starts a session (same constraint/reasoning as useAudioPulse's
// init() — the <audio> element itself is created earlier on mount so that
// start()'s play() call can happen synchronously in the gesture).

export function useGuidanceAudio() {
  const [mode, setModeState] = useState<GuidanceMode>(loadMode)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isNarrating, setIsNarrating] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadedRef = useRef(false)
  const fadeTimerRef = useRef<number | null>(null)
  // Mirrors isNarrating for callers that read it from inside a long-lived
  // setTimeout/setInterval closure (the beat scheduler in
  // ZikirKhafiPlayer.tsx/AdminZikirKhafiDevPage.tsx) that isn't re-created
  // when narration starts/stops mid-session — same reasoning as this
  // codebase's other *Ref mirrors of frequently-changing state (bpmRef,
  // coherenceRef, phaseRef, etc.). Always read isNarratingRef.current from
  // inside such a closure, not the isNarrating state value.
  const isNarratingRef = useRef(false)
  const setNarrating = useCallback((next: boolean) => {
    isNarratingRef.current = next
    setIsNarrating(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.storage.from(GUIDANCE_AUDIO_BUCKET).createSignedUrl(GUIDANCE_AUDIO_PATH, 3600)
      .then(({ data }) => {
        if (cancelled || !data?.signedUrl) return
        const audio = new Audio(data.signedUrl)
        audio.preload = 'auto'
        audioRef.current = audio
        setIsAvailable(true)
      }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearInterval(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
  }, [])

  const setMode = useCallback((next: GuidanceMode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch (err) {
      console.error('[useGuidanceAudio] failed to persist preference:', err)
    }
  }, [])

  const start = useCallback(() => {
    const audio = audioRef.current
    if (mode === 'off' || !audio) return
    clearFadeTimer()
    fadedRef.current = false
    try {
      audio.currentTime = 0
      audio.loop = mode === 'full'
      audio.volume = 1
      audio.play().catch(err => console.error('[useGuidanceAudio] play failed:', err))
      setNarrating(true)
    } catch (err) {
      console.error('[useGuidanceAudio] start failed:', err)
    }
  }, [mode, clearFadeTimer])

  const onElapsedTick = useCallback((elapsedSec: number) => {
    if (mode !== 'first3min' || fadedRef.current) return
    const audio = audioRef.current
    if (!audio || audio.paused) return
    if (elapsedSec < FIRST3MIN_CUTOFF_SEC) return
    fadedRef.current = true
    const steps = Math.max(1, Math.round(FADE_OUT_MS / FADE_STEP_MS))
    const startVolume = audio.volume
    let step = 0
    clearFadeTimer()
    fadeTimerRef.current = window.setInterval(() => {
      step += 1
      const next = Math.max(0, startVolume * (1 - step / steps))
      audio.volume = next
      if (step >= steps) {
        clearFadeTimer()
        audio.pause()
        setNarrating(false)
      }
    }, FADE_STEP_MS)
  }, [mode, clearFadeTimer])

  const stop = useCallback(() => {
    clearFadeTimer()
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.volume = 1
    }
    fadedRef.current = false
    setNarrating(false)
  }, [clearFadeTimer])

  useEffect(() => {
    return () => {
      clearFadeTimer()
      const audio = audioRef.current
      if (audio) audio.pause()
    }
  }, [clearFadeTimer])

  return { isAvailable, mode, setMode, isNarrating, isNarratingRef, start, onElapsedTick, stop }
}
