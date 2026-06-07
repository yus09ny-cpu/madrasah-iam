import { useNavigate } from 'react-router-dom'
import { Shield, RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { UserTier } from '@/types'

const TIERS: { value: UserTier; label: string; color: string; active: string }[] = [
  {
    value: 'free',
    label: '👤 Free',
    color: 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]',
    active: 'bg-[#8a7a65]/20 border-[#8a7a65]/60 text-[#8a7a65]',
  },
  {
    value: 'pro',
    label: '✦ Pro',
    color: 'border-[#1e2d40] text-[#8a7a65] hover:border-[#c9a96e40] hover:text-[#c9a96e]',
    active: 'bg-[#c9a96e]/20 border-[#c9a96e]/60 text-[#c9a96e]',
  },
  {
    value: 'family',
    label: '✦ Keluarga',
    color: 'border-[#1e2d40] text-[#8a7a65] hover:border-violet-500/30 hover:text-violet-400',
    active: 'bg-violet-500/20 border-violet-500/60 text-violet-400',
  },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const { user, devModeActive, setDevTier, exitDevMode, setUser } = useAuthStore()

  if (!user) return null

  const currentTier = user.tier
  const originalTier = localStorage.getItem('madrasah-dev-original-tier') ?? currentTier

  function toggleTalqin() {
    if (!user) return
    setUser({ ...user, talqin_jahar: !user.talqin_jahar })
  }

  return (
    <div className="min-h-full px-4 py-8 max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
          <Shield size={18} className="text-[#c9a96e]" />
        </div>
        <div>
          <h1 className="text-[#e8dcc8] font-semibold text-lg">Admin Panel</h1>
          <p className="text-[#8a7a65] text-xs">Kawalan dalaman — hanya untuk pembangunan</p>
        </div>
        {devModeActive && (
          <span className="ml-auto text-[10px] font-mono font-bold text-yellow-400 bg-yellow-900/20 border border-yellow-600/40 px-2 py-1 rounded-lg animate-pulse">
            DEV MODE
          </span>
        )}
      </div>

      {/* Current tier status */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Tier Semasa</p>
        <div className="flex items-center justify-between">
          <p className={cn('text-base font-bold',
            currentTier === 'pro' ? 'text-[#c9a96e]' :
            currentTier === 'family' ? 'text-violet-400' :
            'text-[#8a7a65]')}>
            {currentTier === 'pro' ? '✦ Pro' :
             currentTier === 'family' ? '✦ Keluarga' :
             '👤 Percuma'}
          </p>
          {devModeActive && (
            <p className="text-xs text-yellow-500">
              Asal: <span className="font-semibold">{originalTier}</span>
            </p>
          )}
        </div>
        <div className="text-xs text-[#8a7a65] space-y-0.5">
          <p>Nama: <span className="text-[#e8dcc8]">{user.name ?? '—'}</span></p>
          <p>E-mel: <span className="text-[#e8dcc8]">{user.email ?? '—'}</span></p>
        </div>
      </div>

      {/* Tier switcher */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Tukar Tier (Dev)</p>
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map(tier => (
            <button
              key={tier.value}
              onClick={() => setDevTier(tier.value)}
              className={cn(
                'py-2.5 rounded-xl text-sm font-medium border transition-all',
                currentTier === tier.value ? tier.active : tier.color
              )}
            >
              {tier.label}
            </button>
          ))}
        </div>
        {devModeActive && (
          <button
            onClick={exitDevMode}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs border border-yellow-600/40 text-yellow-500 hover:bg-yellow-900/20 transition-colors"
          >
            <RotateCcw size={12} />
            Kembali ke Tier Asal ({originalTier})
          </button>
        )}
      </div>

      {/* Talqin toggle */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Status Talqin</p>
        <button
          onClick={toggleTalqin}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-medium border transition-all',
            user.talqin_jahar
              ? 'bg-emerald-900/20 border-emerald-600/50 text-emerald-400'
              : 'border-[#1e2d40] text-[#8a7a65] hover:border-emerald-600/30 hover:text-emerald-400'
          )}
        >
          {user.talqin_jahar ? '✓ talqin_jahar: true' : '✗ talqin_jahar: false'}
        </button>
        <p className="text-[#8a7a65] text-[11px] leading-relaxed">
          Mengaktifkan talqin_jahar akan menampilkan menu <span className="text-[#c9a96e]">Amalan TQN</span> dalam navigasi.
        </p>
      </div>

      {/* App info */}
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-2">
        <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Maklumat Aplikasi</p>
        <div className="text-xs text-[#8a7a65] space-y-1 font-mono">
          <p>Versi: <span className="text-[#e8dcc8]">0.1.0-beta</span></p>
          <p>Persekitaran: <span className="text-[#e8dcc8]">{import.meta.env.MODE}</span></p>
          <p>Supabase: <span className="text-[#e8dcc8]">{import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0] ?? '—'}</span></p>
        </div>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors"
      >
        ← Kembali
      </button>
    </div>
  )
}
