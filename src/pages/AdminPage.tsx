import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, RotateCcw, Users, BookOpen, Star, Wrench, Crown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { UserTier } from '@/types'
import WakilTalkinDirectory from '@/components/admin/WakilTalkinDirectory'
import UserTalkinAssignments from '@/components/admin/UserTalkinAssignments'
import AmalanJiwaStatus from '@/components/admin/AmalanJiwaStatus'
import TierActivationManagement from '@/components/admin/TierActivationManagement'
import UserManagement from '@/components/admin/UserManagement'

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

type Tab = 'dev' | 'users' | 'wakil_talkin' | 'talkin' | 'amalan' | 'tier'

const TABS: { id: Tab; label: string; icon: React.ElementType; masterOnly?: boolean; devOnly?: boolean }[] = [
  { id: 'dev', label: 'Dev Tools', icon: Wrench, devOnly: true },
  { id: 'users', label: 'Pengguna', icon: Crown },
  { id: 'wakil_talkin', label: 'Wakil Talkin', icon: Users },
  { id: 'talkin', label: 'Talkin', icon: BookOpen },
  { id: 'amalan', label: 'Amalan', icon: BookOpen },
  { id: 'tier', label: 'Tier Unlock', icon: Star },
]

const TAB_TITLES: Record<Tab, { title: string; sub: string }> = {
  dev: { title: 'Dev Tools', sub: 'Kawalan dalaman — hanya untuk pembangunan' },
  users: { title: 'Pengurusan Pengguna', sub: 'Set peranan & tier untuk semua pengguna' },
  wakil_talkin: { title: 'Wakil Talkin Directory', sub: 'Urus senarai Wakil Talkin & status pengesahan' },
  talkin: { title: 'Talkin Assignments', sub: 'Tugaskan pengguna & jejak sesi Talkin' },
  amalan: { title: 'Amalan Jiwa Status', sub: 'Urus latihan Amalan Jiwa selepas Talkin selesai' },
  tier: { title: 'Tier Activation', sub: 'Buka kunci Pro bagi pengguna yang lengkap perjalanan' },
}

function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-600/30 flex items-center justify-center">
        <Shield size={24} className="text-red-400" />
      </div>
      <div className="space-y-2">
        <h1 className="font-serif text-xl text-[#e8dcc8]">Akses Ditolak</h1>
        <p className="text-[#8a7a65] text-sm leading-relaxed max-w-xs">
          Halaman ini hanya untuk pentadbir yang telah diberi kebenaran oleh Master Admin.
        </p>
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-5 py-2.5 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors"
      >
        ← Kembali ke Dashboard
      </button>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { user, devModeActive, setDevTier, exitDevMode } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('users')

  if (!user) return null

  const role = user.role
  const isMasterAdmin = role === 'master_admin'
  const isSuperAdmin = role === 'super_admin'
  const isWakilTalkin = role === 'wakil_talkin'

  const hasAccess = isMasterAdmin || isSuperAdmin || isWakilTalkin
  if (!hasAccess) return <AccessDenied />

  const visibleTabs = TABS.filter(t => {
    if (t.devOnly) return isMasterAdmin
    if (isWakilTalkin) return t.id === 'talkin'
    return true
  })

  const currentTier = user.tier
  const originalTier = localStorage.getItem('madrasah-dev-original-tier') ?? currentTier
  const { title, sub } = TAB_TITLES[activeTab] ?? TAB_TITLES['users']

  const roleLabel = isMasterAdmin ? 'Master Admin' : isSuperAdmin ? 'Super Admin' : 'Wakil Talkin'
  const roleBadgeColor = isMasterAdmin
    ? 'text-yellow-400 bg-yellow-900/20 border-yellow-600/40'
    : isSuperAdmin
    ? 'text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]'
    : 'text-blue-400 bg-blue-900/20 border-blue-600/40'

  return (
    <div className="min-h-full px-4 py-8 max-w-lg mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center">
          {isMasterAdmin ? <Crown size={18} className="text-yellow-400" /> : <Shield size={18} className="text-[#c9a96e]" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[#e8dcc8] font-semibold text-lg">Admin Panel</h1>
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-lg border', roleBadgeColor)}>
              {roleLabel}
            </span>
          </div>
          <p className="text-[#8a7a65] text-xs">{sub}</p>
        </div>
        {devModeActive && (
          <span className="ml-auto text-[10px] font-mono font-bold text-yellow-400 bg-yellow-900/20 border border-yellow-600/40 px-2 py-1 rounded-lg animate-pulse">
            DEV
          </span>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap flex-shrink-0',
                activeTab === tab.id
                  ? 'bg-[#c9a96e20] border-[#c9a96e40] text-[#c9a96e]'
                  : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
              )}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Section title */}
      <div>
        <h2 className="text-[#e8dcc8] font-medium text-base">{title}</h2>
      </div>

      {/* Tab content */}
      {activeTab === 'dev' && (
        <div className="space-y-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-3">
            <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Tier Semasa</p>
            <div className="flex items-center justify-between">
              <p className={cn(
                'text-base font-bold',
                currentTier === 'pro' ? 'text-[#c9a96e]' :
                currentTier === 'family' ? 'text-violet-400' : 'text-[#8a7a65]'
              )}>
                {currentTier === 'pro' ? '✦ Pro' : currentTier === 'family' ? '✦ Keluarga' : '👤 Percuma'}
              </p>
              {devModeActive && (
                <p className="text-xs text-yellow-500">Asal: <span className="font-semibold">{originalTier}</span></p>
              )}
            </div>
            <div className="text-xs text-[#8a7a65] space-y-0.5">
              <p>Nama: <span className="text-[#e8dcc8]">{user.name ?? '—'}</span></p>
              <p>E-mel: <span className="text-[#e8dcc8]">{user.email ?? '—'}</span></p>
              <p>Peranan: <span className="text-yellow-400">{user.role ?? 'user'}</span></p>
            </div>
          </div>

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

          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 space-y-2">
            <p className="text-[#8a7a65] text-xs uppercase tracking-wider">Maklumat Aplikasi</p>
            <div className="text-xs text-[#8a7a65] space-y-1 font-mono">
              <p>Versi: <span className="text-[#e8dcc8]">0.1.0-beta</span></p>
              <p>Persekitaran: <span className="text-[#e8dcc8]">{import.meta.env.MODE}</span></p>
              <p>Supabase: <span className="text-[#e8dcc8]">{import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0] ?? '—'}</span></p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'wakil_talkin' && <WakilTalkinDirectory />}
      {activeTab === 'talkin' && <UserTalkinAssignments />}
      {activeTab === 'amalan' && <AmalanJiwaStatus />}
      {activeTab === 'tier' && <TierActivationManagement />}

      <button
        onClick={() => navigate(-1)}
        className="w-full py-3 rounded-2xl text-sm text-[#8a7a65] border border-[#1e2d40] hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-colors"
      >
        ← Kembali
      </button>
    </div>
  )
}
