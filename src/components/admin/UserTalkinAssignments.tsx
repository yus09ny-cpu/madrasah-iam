import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Assignment = {
  id: string
  user_id: string
  wakil_talkin_id: string
  talkin_status: string
  talkin_start_date: string | null
  talkin_completion_date: string | null
  talkin_sessions_count: number
  talkin_notes: string | null
  amalan_status: string
  admin_notes: string | null
  created_at: string
  user?: { id: string; name: string | null; tier: string } | null
  mentor?: { id: string; name: string; specialization: string | null } | null
}

type Profile = { id: string; name: string | null; tier: string }
type WTOption = { id: string; name: string; current_students: number; max_students: number; availability_status: string; specialization: string | null }

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  active: 'Aktif',
  completed: 'Selesai',
  paused: 'Ditangguh',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-900/20 border-yellow-600/40',
  active: 'text-green-400 bg-green-900/20 border-green-600/40',
  completed: 'text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]',
  paused: 'text-[#8a7a65] bg-[#1e2d40] border-[#2a3d55]',
}

const STATUS_ORDER = ['pending', 'active', 'completed', 'paused'] as const

export default function UserTalkinAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAssign, setShowAssign] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [wakilList, setWakilList] = useState<WTOption[]>([])
  const [assignForm, setAssignForm] = useState({ user_id: '', wakil_talkin_id: '', admin_notes: '' })
  const [saving, setSaving] = useState(false)

  const [showUpdate, setShowUpdate] = useState(false)
  const [updateTarget, setUpdateTarget] = useState<Assignment | null>(null)
  const [updateForm, setUpdateForm] = useState({ talkin_status: '', talkin_notes: '', talkin_sessions_count: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('user_wakil_talkin') as any)
        .select(`*, user:user_id(id, name, tier), mentor:wakil_talkin_id(id, name, specialization)`)
        .order('created_at', { ascending: false })
      if (err) throw err
      setAssignments(data ?? [])
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function openAssign() {
    try {
      const [{ data: p }, { data: w }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('profiles') as any).select('id, name, tier').order('name'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wakil_talkin') as any)
          .select('id, name, current_students, max_students, availability_status, specialization')
          .eq('is_verified', true).eq('status', 'active'),
      ])
      setProfiles(p ?? [])
      setWakilList(w ?? [])
    } catch { /* show empty dropdowns */ }
    setAssignForm({ user_id: '', wakil_talkin_id: '', admin_notes: '' })
    setShowAssign(true)
  }

  async function handleAssign() {
    if (!assignForm.user_id || !assignForm.wakil_talkin_id) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('user_wakil_talkin') as any).insert({
        user_id: assignForm.user_id,
        wakil_talkin_id: assignForm.wakil_talkin_id,
        admin_notes: assignForm.admin_notes || null,
        talkin_status: 'pending',
        amalan_status: 'not_started',
        talkin_sessions_count: 0,
        amalan_weeks_completed: 0,
      })
      if (err) throw err
      const wt = wakilList.find(w => w.id === assignForm.wakil_talkin_id)
      if (wt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('wakil_talkin') as any)
          .update({ current_students: (wt.current_students ?? 0) + 1 })
          .eq('id', wt.id)
      }
      setShowAssign(false)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  function openUpdate(a: Assignment) {
    setUpdateTarget(a)
    setUpdateForm({
      talkin_status: a.talkin_status,
      talkin_notes: a.talkin_notes ?? '',
      talkin_sessions_count: a.talkin_sessions_count,
    })
    setShowUpdate(true)
  }

  async function handleUpdate() {
    if (!updateTarget) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        talkin_status: updateForm.talkin_status,
        talkin_notes: updateForm.talkin_notes || null,
        talkin_sessions_count: updateForm.talkin_sessions_count,
        updated_at: now,
      }
      if (updateForm.talkin_status === 'active' && !updateTarget.talkin_start_date) {
        updates.talkin_start_date = now
      }
      if (updateForm.talkin_status === 'completed' && !updateTarget.talkin_completion_date) {
        updates.talkin_completion_date = now
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('user_wakil_talkin') as any)
        .update(updates).eq('id', updateTarget.id)
      if (err) throw err

      // Aktifkan Amalan TQN pada profil pengguna apabila Talkin selesai
      if (updateForm.talkin_status === 'completed') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('profiles') as any)
          .update({ talqin_completed: true })
          .eq('id', updateTarget.user_id)
      }

      setShowUpdate(false)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal mengemaskini')
    } finally {
      setSaving(false)
    }
  }

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = assignments.filter(a => a.talkin_status === s)
    return acc
  }, {} as Record<string, Assignment[]>)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[#8a7a65] text-xs">{assignments.length} penugasan jumlah</p>
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
          {assignments.length === 0 && (
            <p className="text-center py-6 text-[#8a7a65] text-sm">Tiada penugasan lagi.</p>
          )}
          {STATUS_ORDER.map(status => grouped[status].length > 0 && (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-lg border', STATUS_COLORS[status])}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-[#8a7a65] text-xs">{grouped[status].length} pengguna</span>
              </div>
              {grouped[status].map(a => (
                <div key={a.id} className="bg-[#060d16] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[#e8dcc8] text-sm font-medium">{a.user?.name ?? 'Pengguna'}</p>
                      <p className="text-[#8a7a65] text-xs">Tier: {a.user?.tier ?? '—'} · Mentor: {a.mentor?.name ?? '—'}</p>
                      {a.mentor?.specialization && (
                        <p className="text-[#c9a96e] text-xs">{a.mentor.specialization}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[#8a7a65] text-xs">{a.talkin_sessions_count} sesi</p>
                      {a.talkin_start_date && (
                        <p className="text-[#8a7a65] text-xs">{new Date(a.talkin_start_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  {a.talkin_notes && (
                    <p className="text-[#8a7a65] text-xs bg-[#0d1821] rounded-lg p-2 leading-relaxed">{a.talkin_notes}</p>
                  )}
                  {a.admin_notes && (
                    <p className="text-[#8a7a65] text-xs italic">Nota admin: {a.admin_notes}</p>
                  )}
                  <button onClick={() => openUpdate(a)}
                    className="px-3 py-1.5 text-xs border border-[#c9a96e40] text-[#c9a96e] rounded-lg hover:bg-[#c9a96e10] transition-all">
                    Kemaskini Status
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <button onClick={openAssign}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#c9a96e40] text-[#c9a96e] text-sm hover:bg-[#c9a96e08] transition-colors">
        <Plus size={14} /> Tugaskan Pengguna ke Para Pembimbing
      </button>

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0d1821] border-b border-[#1e2d40] px-5 py-4 flex items-center justify-between">
              <h3 className="text-[#e8dcc8] font-medium text-sm">Tugaskan Pengguna</h3>
              <button onClick={() => setShowAssign(false)} className="text-[#8a7a65] hover:text-[#e8dcc8] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Pilih Pengguna *</label>
                <select value={assignForm.user_id}
                  onChange={e => setAssignForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none">
                  <option value="">-- Pilih pengguna --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name ?? 'Tanpa nama'} ({p.tier})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Pilih Para Pembimbing *</label>
                <select value={assignForm.wakil_talkin_id}
                  onChange={e => setAssignForm(f => ({ ...f, wakil_talkin_id: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none">
                  <option value="">-- Pilih Para Pembimbing --</option>
                  {wakilList.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.current_students}/{w.max_students} ({w.availability_status})
                    </option>
                  ))}
                </select>
                {wakilList.length === 0 && (
                  <p className="text-[#8a7a65] text-xs">Tiada Para Pembimbing disahkan. Tambah dan sahkan dahulu.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Nota untuk Para Pembimbing</label>
                <textarea value={assignForm.admin_notes}
                  onChange={e => setAssignForm(f => ({ ...f, admin_notes: e.target.value }))}
                  rows={3} placeholder="Konteks tentang pengguna ini..."
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none resize-none placeholder:text-[#8a7a65]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAssign(false)}
                  className="flex-1 py-3 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65]">Batal</button>
                <button onClick={handleAssign} disabled={saving || !assignForm.user_id || !assignForm.wakil_talkin_id}
                  className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}>
                  {saving ? 'Menyimpan...' : 'Tugaskan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showUpdate && updateTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0d1821] border-b border-[#1e2d40] px-5 py-4 flex items-center justify-between">
              <h3 className="text-[#e8dcc8] font-medium text-sm">Kemaskini Status Talkin</h3>
              <button onClick={() => setShowUpdate(false)} className="text-[#8a7a65] hover:text-[#e8dcc8] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#060d16] rounded-xl p-3 space-y-0.5">
                <p className="text-[#e8dcc8] text-sm">{updateTarget.user?.name ?? 'Pengguna'}</p>
                <p className="text-[#8a7a65] text-xs">Mentor: {updateTarget.mentor?.name ?? '—'}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Status Baru</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_ORDER.map(s => (
                    <label key={s} className={cn(
                      'flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-xl border transition-all',
                      updateForm.talkin_status === s ? STATUS_COLORS[s] : 'border-[#1e2d40] text-[#8a7a65]'
                    )}>
                      <input type="radio" name="talkin_status" value={s}
                        checked={updateForm.talkin_status === s}
                        onChange={() => setUpdateForm(f => ({ ...f, talkin_status: s }))}
                        className="accent-[#c9a96e]" />
                      <span className="text-sm">{STATUS_LABELS[s]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Bilangan Sesi Selesai</label>
                <input type="number" min={0} value={updateForm.talkin_sessions_count}
                  onChange={e => setUpdateForm(f => ({ ...f, talkin_sessions_count: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Nota Para Pembimbing</label>
                <textarea value={updateForm.talkin_notes}
                  onChange={e => setUpdateForm(f => ({ ...f, talkin_notes: e.target.value }))}
                  rows={3} placeholder="Perkembangan sesi, pemerhatian..."
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none resize-none placeholder:text-[#8a7a65]" />
              </div>
              {updateForm.talkin_status === 'completed' && (
                <div className="bg-[#c9a96e10] border border-[#c9a96e30] rounded-xl p-3">
                  <p className="text-[#c9a96e] text-xs">✓ Status "Selesai" akan aktifkan Amalan TQN pada sidebar pengguna dan set tarikh penyiapan Talkin secara automatik.</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowUpdate(false)}
                  className="flex-1 py-3 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65]">Batal</button>
                <button onClick={handleUpdate} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}>
                  {saving ? 'Menyimpan...' : 'Kemaskini'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
