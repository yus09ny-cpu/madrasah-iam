import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, Square, Trash2, Play, Pause, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react'
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from '@/lib/audioStorage'
import { cn } from '@/lib/utils'

const MAX_SECS = 300 // 5 minit

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

interface AudioRecorderProps {
  questionId: string
  textValue: string
  onTextChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
}

export default function AudioRecorder({
  questionId,
  textValue,
  onTextChange,
  placeholder = 'Tulis atau rakam suara anda...',
  disabled = false,
  rows = 4,
}: AudioRecorderProps) {
  const [mode, setMode] = useState<'text' | 'audio'>('text')
  const [state, setState] = useState<'idle' | 'requesting' | 'recording' | 'recorded'>('idle')
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [savedMeta, setSavedMeta] = useState(false)
  const [bars, setBars] = useState<number[]>(Array(22).fill(10))
  const [error, setError] = useState('')

  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)

  // Load existing recording
  useEffect(() => {
    getAudioBlob(questionId).then(blob => {
      if (blob) {
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('recorded')
        setMode('audio')
        setSavedMeta(true)
      }
    })
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }
  }, [questionId])

  async function startRecording() {
    setError('')
    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mr = new MediaRecorder(stream)
      mrRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('recorded')
        setSavedMeta(false)
      }
      mr.start()
      setState('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= MAX_SECS - 1) { stopRecording(); return d }
          return d + 1
        })
      }, 1000)

      waveRef.current = setInterval(() => {
        setBars(Array.from({ length: 22 }, () => 8 + Math.random() * 84))
      }, 80)

    } catch {
      setState('idle')
      setError('Tidak dapat akses mikrofon. Sila benarkan akses.')
    }
  }

  const stopRecording = useCallback(() => {
    mrRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    if (waveRef.current) clearInterval(waveRef.current)
    setBars(Array(22).fill(10))
  }, [])

  function discardRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    blobRef.current = null
    setState('idle')
    setDuration(0)
    setSavedMeta(false)
    deleteAudioBlob(questionId)
  }

  async function saveRecording() {
    if (!blobRef.current) return
    await saveAudioBlob(questionId, blobRef.current)
    setSavedMeta(true)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      {!disabled && (
        <div className="flex gap-2 items-center">
          <div className="flex bg-[#060d16] rounded-xl p-0.5 gap-0.5 border border-[#1e2d40]">
            <button onClick={() => setMode('text')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                mode === 'text' ? 'bg-[#1e2d40] text-[#e8dcc8]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
              ✍️ Tulis
            </button>
            <button onClick={() => setMode('audio')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                mode === 'audio' ? 'bg-[#a78bfa20] text-[#a78bfa]' : 'text-[#8a7a65] hover:text-[#e8dcc8]')}>
              🎙️ Rakam Suara
            </button>
          </div>
          {mode === 'audio' && (
            <p className="text-[#8a7a65] text-[10px] flex items-center gap-1">
              🔒 Tersimpan dalam peranti anda sahaja
            </p>
          )}
        </div>
      )}

      {/* Text mode */}
      {mode === 'text' && (
        <textarea
          value={textValue}
          onChange={e => onTextChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#c9a96e50] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        />
      )}

      {/* Audio mode */}
      {mode === 'audio' && (
        <div className="bg-[#060d16] border border-[#a78bfa30] rounded-2xl p-4 space-y-4">

          {/* State: Idle */}
          {state === 'idle' && (
            <div className="text-center space-y-3">
              <p className="text-[#8a7a65] text-xs leading-relaxed">
                "Tiada siapa yang mendengar kecuali Allah dan diri anda sendiri. Bercakaplah dengan jujur."
              </p>
              <button onClick={startRecording}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#a78bfa20] border border-[#a78bfa40] text-[#a78bfa] rounded-xl text-sm font-medium hover:bg-[#a78bfa30] transition-colors">
                <Mic size={16} />
                Mula Merakam
              </button>
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
          )}

          {/* State: Requesting */}
          {state === 'requesting' && (
            <div className="text-center space-y-2 py-2">
              <Loader2 size={24} className="text-[#a78bfa] animate-spin mx-auto" />
              <p className="text-[#8a7a65] text-xs">Meminta akses mikrofon...</p>
            </div>
          )}

          {/* State: Recording */}
          {state === 'recording' && (
            <div className="space-y-3">
              {/* Waveform */}
              <div className="flex items-center justify-center gap-0.5 h-12">
                {bars.map((h, i) => (
                  <div key={i} className="w-1 rounded-full transition-all duration-75"
                    style={{ height: `${h}%`, backgroundColor: '#a78bfa', opacity: 0.7 + (h / 100) * 0.3 }} />
                ))}
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[#a78bfa] font-mono text-lg font-bold">{formatTime(duration)}</span>
                </div>
                <span className="text-[#8a7a65] text-xs">Maks: {formatTime(MAX_SECS)}</span>
              </div>

              {/* Progress */}
              <div className="h-1 bg-[#1e2d40] rounded-full overflow-hidden">
                <div className="h-full bg-[#a78bfa] rounded-full transition-all duration-1000"
                  style={{ width: `${(duration / MAX_SECS) * 100}%` }} />
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <button onClick={() => { stopRecording(); setState('idle') }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[#1e2d40] rounded-xl text-xs text-[#8a7a65] hover:text-red-400 hover:border-red-900/40 transition-colors">
                  <Trash2 size={13} />
                  Buang
                </button>
                <button onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#a78bfa] text-[#060d16] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  <Square size={14} />
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* State: Recorded */}
          {state === 'recorded' && audioUrl && (
            <div className="space-y-3">
              {/* Hidden audio element */}
              <audio ref={audioRef} src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)} />

              {/* Player */}
              <div className="flex items-center gap-3 bg-[#0d1821] rounded-xl p-3">
                <button onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-[#a78bfa] flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0">
                  {isPlaying ? <Pause size={15} className="text-[#060d16]" /> : <Play size={15} className="text-[#060d16]" />}
                </button>
                <div className="flex-1">
                  <div className="h-1.5 bg-[#1e2d40] rounded-full">
                    <div className="h-full bg-[#a78bfa] rounded-full w-0" />
                  </div>
                </div>
                <span className="text-[#8a7a65] text-xs font-mono flex-shrink-0">{formatTime(duration)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={discardRecording}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[#1e2d40] rounded-xl text-xs text-[#8a7a65] hover:text-red-400 hover:border-red-900/40 transition-colors">
                  <RotateCcw size={13} />
                  Rakam Semula
                </button>
                {savedMeta ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                    <CheckCircle2 size={13} />
                    Tersimpan
                  </div>
                ) : (
                  <button onClick={saveRecording}
                    className="flex-1 py-2 bg-[#a78bfa] text-[#060d16] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
                    ✓ Simpan Rakaman
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
