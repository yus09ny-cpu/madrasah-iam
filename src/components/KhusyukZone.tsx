import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'madrasah-khusyuk-pref'

function getPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { auto: true, hapticOnly: false }
  } catch { return { auto: true, hapticOnly: false } }
}

export function useKhusyuk() {
  const [active, setActive] = useState(false)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  async function activate() {
    const prefs = getPrefs()
    if (!prefs.auto) return
    setActive(true)
    // Try Screen Wake Lock
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } })
          .wakeLock.request('screen')
        setWakeLock(lock)
      }
    } catch { /* not supported */ }
  }

  function deactivate() {
    setActive(false)
    wakeLock?.release().catch(() => {})
    setWakeLock(null)
  }

  useEffect(() => {
    activate()
    return () => { deactivate() }
  }, [])

  return { active, deactivate }
}

export default function KhusyukZone() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('khusyuk-dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    const prefs = getPrefs()
    if (prefs.auto && !dismissed) {
      const t = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(t)
    }
  }, [dismissed])

  function dismiss() {
    setVisible(false)
    setDismissed(true)
    try { sessionStorage.setItem('khusyuk-dismissed', '1') } catch { /* ignore */ }
  }

  if (!visible) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[300] flex justify-center pointer-events-none px-4 pt-2">
      <div className="flex items-center gap-3 bg-[#0d1821]/95 backdrop-blur-sm border border-[#c9a96e30] rounded-2xl px-4 py-3 shadow-xl pointer-events-auto max-w-sm w-full">
        <span className="text-[#c9a96e] font-serif text-lg flex-shrink-0">✦</span>
        <div className="flex-1 min-w-0">
          <p className="text-[#c9a96e] text-xs font-medium">Zon Khusyuk aktif.</p>
          <p className="text-[#8a7a65] text-[10px] mt-0.5 leading-tight">
            Dunia luar menunggu. Allah ada di sini sekarang.
          </p>
        </div>
        <button onClick={dismiss} className="text-[#8a7a65] hover:text-[#e8dcc8] flex-shrink-0 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Haptic patterns ──────────────────────────────────────────────────────────

export function vibratePattern(type: 'solat' | 'malam' | 'zikir') {
  if (!('vibrate' in navigator)) return
  const patterns = {
    solat:  [100, 50, 100, 50, 300, 50, 100, 50, 100],
    malam:  [100, 50, 300, 50, 100],
    zikir:  [80, 40, 80, 40, 80],
  }
  navigator.vibrate(patterns[type])
}
