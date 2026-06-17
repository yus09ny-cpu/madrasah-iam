import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, Crown, Shield, Users, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { AdminRole, UserTier } from '@/types'
import { useAuthStore } from '@/store/authStore'

type ProfileRow = {
  id: string
  name: string | null
  tier: UserTier
  role: AdminRole | null
  talqin_completed: boolean | null
  created_at: string
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  master_admin: { label: 'Master Admin', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-600/40' },
  super_admin: { label: 'Super Admin', color: 'text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]' },
  wakil_talkin: { label: 'Para Pembimbing', color: 'text-blue-400 bg-blue-900/20 border-blue-600/40' },
  user: { label: 'Pengguna', color: 'text-[#8a7a65] bg-[#1e2d40] border-[#2a3d55]' },
}

const TIER_LABELS: Record<UserTier, { label: string; color: string }> = {
  free: { label: 'Free', color: 'text-[#8a7a65] bg-[#1e2d40] border-[#2a3d55]' },
  pro: { label: '✦ Pro', color: 'text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]' },
  family: { label: '✦ Keluarga', color: 'text-violet-400 bg-violet-900/20 border-violet-600/40' },
}

const ALL_TIERS: UserTier[] = ['free', 'pro', 'family']

export default function UserManagement() {
  const { user: currentUser, setUser } = useAuthStore()
  const isMasterAdmin = currentUser?.role === 'master_admin'

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')

  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showTierModal, setShowTierModal] = useState(false)
  const [target, setTarget] = useState<ProfileRow | null>(null)
  const [selectedRole, setSelectedRole] = useState<AdminRole>('user')
  const [selectedTier, setSelectedTier] = useState<UserTier>('free')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('profiles') as any)
        .select('id, name, tier, role, talqin_completed, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      setProfiles(data ?? [])
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Gagal memuatkan pengguna')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const superAdminCount = profiles.filter(p => p.role === 'super_admin').length
  const talqinActiveCount = profiles.filter(p => p.talqin_completed).length

  function openRoleModal(p: ProfileRow) {
    setTarget(p)
    setSelectedRole((p.role as AdminRole) ?? 'user')
    setShowRoleModal(true)
  }

  function openTierModal(p: ProfileRow) {
    setTarget(p)
    setSelectedTier(p.tier)
    setShowTierModal(true)
  }

  function availableRolesFor(p: ProfileRow): AdminRole[] {
    if (p.role === 'master_admin') return []
    if (isMasterAdmin) {
      const roles: AdminRole[] = ['user', 'wakil_talkin', 'super_admin']
      if (selectedRole === 'super_admin' && p.role !== 'super_admin' && superAdminCount >= 4) {
        return roles.filter(r => r !== 'super_admin')
      }
      return roles
    }
    return ['user', 'wakil_talkin']
  }

  async function handleSaveRole() {
    if (!target) return
    if (selectedRole === 'super_admin' && target.role !== 'super_admin' && superAdminCount >= 4) {
      alert('Had maksimum Super Admin (4 orang) telah dicapai.')
      return
    }
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('profiles') as any)
        .update({ role: selectedRole })
        .eq('id', target.id)
      if (err) throw err
      if (target.id === currentUser?.id && currentUser) {
        setUser({ ...currentUser, role: selectedRole })
      }
      setShowRoleModal(false)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal menyimpan peranan')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTier() {
    if (!target) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('profiles') as any)
        .update({ tier: selectedTier })
        .eq('id', target.id)
      if (err) throw err
      if (target.id === currentUser?.id && currentUser) {
        setUser({ ...currentUser, tier: selectedTier })
      }
      setShowTierModal(false)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal menyimpan tier')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleTalqin(p: ProfileRow) {
    const next = !p.talqin_completed
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('profiles') as any)
        .update({ talqin_completed: next })
        .eq('id', p.id)
      if (err) throw err
      setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, talqin_completed: next } : x))
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal mengemas kini Amalan TQN')
    }
  }

  const filtered = profiles.filter(p => {
    const matchSearch = !search || (p.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || (p.role ?? 'user') === filterRole
    return matchSearch && matchRole
  })

  const roleDisplay = (role: string | null) => {
    const r = ROLE_LABELS[role ?? 'user'] ?? ROLE_LABELS['user']
    return <span className={cn('text-xs px-1.5 py-0.5 rounded-md border', r.color)}>{r.label}</span>
  }

  const tierDisplay = (tier: UserTier) => {
    const t = TIER_LABELS[tier] ?? TIER_LABELS['free']
    return <span className={cn('text-xs px-1.5 py-0.5 rounded-md border', t.color)}>{t.label}</span>
  }

  const roleIcon = (role: string | null) => {
    if (role === 'master_admin') return <Crown size={12} className="text-yellow-400" />
    if (role === 'super_admin') return <Shield size={12} className="text-[#c9a96e]" />
    if (role === 'wakil_talkin') return <Users size={12} className="text-blue-400" />
    return null
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-xl p-3 text-center">
          <p className="text-[#c9a96e] text-base font-semibold">{superAdminCount}<span className="text-[#8a7a65] text-xs">/4</span></p>
          <p className="text-[#8a7a65] text-xs mt-0.5">Super Admin</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-xl p-3 text-center">
          <p className="text-blue-400 text-base font-semibold">{profiles.filter(p => p.role === 'wakil_talkin').length}</p>
          <p className="text-[#8a7a65] text-xs mt-0.5">Para Pembimbing</p>
        </div>
        <div className="bg-[#0d1821] border border-[#c9a96e20] rounded-xl p-3 text-center">
          <p className="text-[#c9a96e] text-base font-semibold">{talqinActiveCount}</p>
          <p className="text-[#8a7a65] text-xs mt-0.5">✦ Amalan</p>
        </div>
        <div className="bg-[#0d1821] border border-[#1e2d40] rounded-xl p-3 text-center">
          <p className="text-[#e8dcc8] text-base font-semibold">{profiles.length}</p>
          <p className="text-[#8a7a65] text-xs mt-0.5">Jumlah</p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7a65]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama pengguna..."
            className="w-full pl-8 pr-3 py-2.5 bg-[#0d1821] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none placeholder:text-[#8a7a65]"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['all', 'master_admin', 'super_admin', 'wakil_talkin', 'user'].map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border transition-all whitespace-nowrap flex-shrink-0',
                filterRole === r
                  ? 'bg-[#c9a96e20] border-[#c9a96e40] text-[#c9a96e]'
                  : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]'
              )}
            >
              {r === 'all' ? 'Semua' : ROLE_LABELS[r]?.label ?? r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[#8a7a65] text-xs">{filtered.length} pengguna</p>
        <button onClick={load} className="p-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-[#8a7a65] text-sm">Memuatkan...</p>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-[#8a7a65] text-sm">Tiada pengguna dijumpai.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const isSelf = p.id === currentUser?.id
            const isMaster = p.role === 'master_admin'
            const canChangeRole = isMasterAdmin && !isSelf && !isMaster
            const canChangeTier = isMasterAdmin || !isSelf
            const canToggleTalqin = isMasterAdmin || (currentUser?.role === 'super_admin' && !isMaster)

            return (
              <div key={p.id} className={cn(
                'bg-[#060d16] border rounded-2xl p-4 space-y-3',
                isSelf ? 'border-[#c9a96e30]' : 'border-[#1e2d40]'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {roleIcon(p.role)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[#e8dcc8] text-sm font-medium truncate">{p.name ?? '—'}</p>
                        {isSelf && <span className="text-[10px] text-[#c9a96e] border border-[#c9a96e30] px-1 rounded">Anda</span>}
                        {p.talqin_completed && (
                          <span className="text-[10px] text-[#c9a96e] border border-[#c9a96e30] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Star size={8} className="fill-[#c9a96e]" /> TQN
                          </span>
                        )}
                      </div>
                      <p className="text-[#8a7a65] text-xs">
                        {new Date(p.created_at).toLocaleDateString('ms-MY')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {roleDisplay(p.role)}
                    {tierDisplay(p.tier)}
                  </div>
                </div>

                {(canChangeRole || canChangeTier || canToggleTalqin) && (
                  <div className="flex gap-2 flex-wrap">
                    {canChangeRole && (
                      <button
                        onClick={() => openRoleModal(p)}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-[#1e2d40] text-[#8a7a65] hover:border-[#c9a96e40] hover:text-[#c9a96e] transition-all"
                      >
                        Tukar Peranan
                      </button>
                    )}
                    {canChangeTier && (
                      <button
                        onClick={() => openTierModal(p)}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-[#1e2d40] text-[#8a7a65] hover:border-[#c9a96e40] hover:text-[#c9a96e] transition-all"
                      >
                        Tukar Tier
                      </button>
                    )}
                    {canToggleTalqin && (
                      <button
                        onClick={() => handleToggleTalqin(p)}
                        className={cn(
                          'flex-1 py-1.5 text-xs rounded-lg border transition-all flex items-center justify-center gap-1',
                          p.talqin_completed
                            ? 'border-[#c9a96e40] text-[#c9a96e] bg-[#c9a96e10] hover:bg-transparent'
                            : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#c9a96e40] hover:text-[#c9a96e]'
                        )}
                      >
                        <Star size={10} className={p.talqin_completed ? 'fill-[#c9a96e]' : ''} />
                        {p.talqin_completed ? 'Amalan TQN Aktif' : 'Aktifkan Amalan TQN'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && target && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md">
            <div className="border-b border-[#1e2d40] px-5 py-4 flex items-center justify-between">
              <h3 className="text-[#e8dcc8] font-medium text-sm">Tukar Peranan</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-[#8a7a65] hover:text-[#e8dcc8] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#060d16] rounded-xl p-3">
                <p className="text-[#e8dcc8] text-sm">{target.name ?? '—'}</p>
                <p className="text-[#8a7a65] text-xs mt-0.5">Peranan semasa: {ROLE_LABELS[target.role ?? 'user']?.label}</p>
              </div>

              {superAdminCount >= 4 && selectedRole === 'super_admin' && target.role !== 'super_admin' && (
                <div className="bg-yellow-900/20 border border-yellow-600/40 rounded-xl p-3">
                  <p className="text-yellow-400 text-xs">Had Super Admin (4/4) telah dicapai. Turunkan peranan seorang Super Admin dahulu.</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[#8a7a65] text-xs">Pilih Peranan Baru</p>
                {availableRolesFor(target).map(role => {
                  const isDisabled = role === 'super_admin' && target.role !== 'super_admin' && superAdminCount >= 4
                  return (
                    <button
                      key={role}
                      onClick={() => !isDisabled && setSelectedRole(role)}
                      disabled={isDisabled}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all disabled:opacity-40',
                        selectedRole === role
                          ? 'bg-[#c9a96e20] border-[#c9a96e40] text-[#c9a96e]'
                          : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                      )}
                    >
                      <span>{ROLE_LABELS[role]?.label}</span>
                      {selectedRole === role && <span className="text-xs">✓</span>}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowRoleModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65]">Batal</button>
                <button onClick={handleSaveRole} disabled={saving || selectedRole === (target.role ?? 'user')}
                  className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && target && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md">
            <div className="border-b border-[#1e2d40] px-5 py-4 flex items-center justify-between">
              <h3 className="text-[#e8dcc8] font-medium text-sm">Tukar Tier Pengguna</h3>
              <button onClick={() => setShowTierModal(false)} className="text-[#8a7a65] hover:text-[#e8dcc8] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#060d16] rounded-xl p-3">
                <p className="text-[#e8dcc8] text-sm">{target.name ?? '—'}</p>
                <p className="text-[#8a7a65] text-xs mt-0.5">Tier semasa: {TIER_LABELS[target.tier]?.label}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[#8a7a65] text-xs">Pilih Tier Baru</p>
                {ALL_TIERS.map(tier => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all',
                      selectedTier === tier
                        ? 'bg-[#c9a96e20] border-[#c9a96e40] text-[#c9a96e]'
                        : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55] hover:text-[#e8dcc8]'
                    )}
                  >
                    <div className="text-left">
                      <p>{TIER_LABELS[tier]?.label}</p>
                      <p className="text-xs opacity-60 mt-0.5">
                        {tier === 'free' ? 'Akses asas' : tier === 'pro' ? 'Akses penuh + Para Pembimbing' : 'Akses keluarga'}
                      </p>
                    </div>
                    {selectedTier === tier && <span className="text-xs text-[#c9a96e]">✓</span>}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowTierModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65]">Batal</button>
                <button onClick={handleSaveTier} disabled={saving || selectedTier === target.tier}
                  className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
