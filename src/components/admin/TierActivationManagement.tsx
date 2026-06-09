import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type ReadyUser = {
  id: string
  user_id: string
  talkin_completion_date: string | null
  amalan_completion_date: string | null
  pro_unlocked_at: string | null
  user?: { id: string; name: string | null; tier: string } | null
  mentor?: { name: string } | null
}

type ProProfile = { id: string; name: string | null; tier: string; created_at: string }

const PRO_FEATURES = [
  'Akses majlis Zikir live harian (5x waktu solat)',
  'Amalan Jiwa lanjutan',
  'Sesi 1-on-1 dengan Wakil Talkin',
  'Penjejakan perkembangan terperinci',
  'Panduan peribadi dari Mursyid',
]

export default function TierActivationManagement() {
  const [readyUsers, setReadyUsers] = useState<ReadyUser[]>([])
  const [alreadyPro, setAlreadyPro] = useState<ProProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showUnlock, setShowUnlock] = useState(false)
  const [unlockTarget, setUnlockTarget] = useState<ReadyUser | null>(null)
  const [unlockNotes, setUnlockNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: ready, error: e1 }, { data: pro }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('user_wakil_talkin') as any)
          .select(`*, user:user_id(id, name, tier), mentor:wakil_talkin_id(id, name)`)
          .eq('talkin_status', 'completed')
          .eq('amalan_status', 'completed')
          .is('pro_unlocked_at', null),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('profiles') as any)
          .select('id, name, tier, created_at')
          .in('tier', ['pro', 'family'])
          .order('created_at', { ascending: false }),
      ])
      if (e1) throw e1
      setReadyUsers(ready ?? [])
      setAlreadyPro(pro ?? [])
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openUnlock(r: ReadyUser) {
    setUnlockTarget(r)
    setUnlockNotes('')
    setShowUnlock(true)
  }

  async function handleUnlock() {
    if (!unlockTarget) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e1 } = await (supabase.from('profiles') as any)
        .update({ tier: 'pro', updated_at: now })
        .eq('id', unlockTarget.user_id)
      if (e1) throw e1
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateErr } = await (supabase.from('user_wakil_talkin') as any)
        .update({ pro_unlocked_at: now, admin_notes: unlockNotes || null, updated_at: now })
        .eq('id', unlockTarget.id)
      if (updateErr) throw updateErr
      setShowUnlock(false)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal membuka kunci tier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[#8a7a65] text-xs">{readyUsers.length} sedia dibuka kunci Pro</p>
        <button onClick={load} className="p-2 text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <p className="text-center py-8 text-[#8a7a65] text-sm">Memuatkan...</p>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 text-center space-y-1">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-[#8a7a65] text-xs">Jalankan SQL migration di Supabase dashboard dahulu.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Ready to unlock */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-lg border text-yellow-400 bg-yellow-900/20 border-yellow-600/40">
                Sedia Dibuka Kunci Pro
              </span>
              <span className="text-[#8a7a65] text-xs">{readyUsers.length} pengguna</span>
            </div>
            {readyUsers.length === 0 ? (
              <div className="text-center py-6 text-[#8a7a65] text-sm bg-[#060d16] border border-[#1e2d40] rounded-2xl">
                Tiada pengguna sedia untuk dinaik taraf.
              </div>
            ) : readyUsers.map(r => (
              <div key={r.id} className="bg-[#060d16] border border-[#c9a96e20] rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[#e8dcc8] font-medium text-sm">{r.user?.name ?? 'Pengguna'}</p>
                    <p className="text-[#8a7a65] text-xs">Tier semasa: {r.user?.tier ?? 'free'}</p>
                  </div>
                  <Star size={16} className="text-[#c9a96e]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0d1821] rounded-xl p-2.5">
                    <p className="text-green-400 text-xs font-medium">✓ Talkin Selesai</p>
                    {r.talkin_completion_date && (
                      <p className="text-[#8a7a65] text-xs mt-0.5">
                        {new Date(r.talkin_completion_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="bg-[#0d1821] rounded-xl p-2.5">
                    <p className="text-green-400 text-xs font-medium">✓ Amalan Selesai</p>
                    {r.amalan_completion_date && (
                      <p className="text-[#8a7a65] text-xs mt-0.5">
                        {new Date(r.amalan_completion_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openUnlock(r)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}
                >
                  ✦ Buka Kunci Pro
                </button>
              </div>
            ))}
          </div>

          {/* Already Pro */}
          {alreadyPro.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-lg border text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]">
                  Sudah Pro
                </span>
                <span className="text-[#8a7a65] text-xs">{alreadyPro.length} pengguna</span>
              </div>
              {alreadyPro.map(p => (
                <div key={p.id} className="bg-[#060d16] border border-[#1e2d40] rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[#e8dcc8] text-sm">{p.name ?? 'Pengguna'}</p>
                    <p className="text-[#8a7a65] text-xs">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-lg border',
                    p.tier === 'family'
                      ? 'text-violet-400 bg-violet-900/20 border-violet-600/40'
                      : 'text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]'
                  )}>
                    {p.tier === 'family' ? '✦ Keluarga' : '✦ Pro'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unlock Pro Modal */}
      {showUnlock && unlockTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md">
            <div className="sticky top-0 bg-[#0d1821] border-b border-[#1e2d40] px-5 py-4 flex items-center justify-between">
              <h3 className="text-[#e8dcc8] font-medium text-sm">Buka Kunci Tier Pro</h3>
              <button onClick={() => setShowUnlock(false)} className="text-[#8a7a65] hover:text-[#e8dcc8] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#060d16] rounded-xl p-4 space-y-2">
                <p className="text-[#c9a96e] font-medium text-sm">{unlockTarget.user?.name ?? 'Pengguna'}</p>
                <p className="text-[#8a7a65] text-xs">
                  {unlockTarget.user?.tier ?? 'free'} → <span className="text-[#c9a96e]">Pro</span>
                </p>
                <div className="h-px bg-[#1e2d40]" />
                <p className="text-green-400 text-xs">
                  ✓ Talkin selesai — {unlockTarget.talkin_completion_date
                    ? new Date(unlockTarget.talkin_completion_date).toLocaleDateString() : '—'}
                </p>
                <p className="text-green-400 text-xs">
                  ✓ Amalan Jiwa selesai — {unlockTarget.amalan_completion_date
                    ? new Date(unlockTarget.amalan_completion_date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="bg-[#060d16] border border-[#c9a96e20] rounded-xl p-3 space-y-1">
                <p className="text-[#c9a96e] text-xs font-medium mb-1.5">Ciri Pro yang Dibuka:</p>
                {PRO_FEATURES.map(f => (
                  <p key={f} className="text-[#8a7a65] text-xs">✓ {f}</p>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Nota Admin (pilihan)</label>
                <textarea
                  value={unlockNotes}
                  onChange={e => setUnlockNotes(e.target.value)}
                  rows={2}
                  placeholder="Nota tentang perjalanan pengguna..."
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none resize-none placeholder:text-[#8a7a65]"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowUnlock(false)}
                  className="flex-1 py-3 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65]">Batal</button>
                <button onClick={handleUnlock} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}>
                  {saving ? 'Menyimpan...' : '✦ Konfirmasi Buka Kunci'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
