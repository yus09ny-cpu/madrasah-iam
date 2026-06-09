import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Assignment = {
  id: string
  user_id: string
  talkin_completion_date: string | null
  talkin_notes: string | null
  amalan_status: string
  amalan_start_date: string | null
  amalan_completion_date: string | null
  amalan_weeks_completed: number
  amalan_notes: string | null
  user?: { name: string | null; tier: string } | null
  mentor?: { name: string } | null
}

export default function AmalanJiwaStatus() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showStart, setShowStart] = useState(false)
  const [startTarget, setStartTarget] = useState<Assignment | null>(null)
  const [startNotes, setStartNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('user_wakil_talkin') as any)
        .select(`*, user:user_id(id, name, tier), mentor:wakil_talkin_id(id, name)`)
        .eq('talkin_status', 'completed')
        .order('talkin_completion_date', { ascending: false })
      if (err) throw err
      setAssignments(data ?? [])
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openStart(a: Assignment) {
    setStartTarget(a)
    setStartNotes('')
    setShowStart(true)
  }

  async function handleStartAmalan() {
    if (!startTarget) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.from('user_wakil_talkin') as any)
        .update({
          amalan_status: 'in_progress',
          amalan_start_date: new Date().toISOString(),
          amalan_notes: startNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', startTarget.id)
      if (err) throw err
      setShowStart(false)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkComplete(a: Assignment) {
    if (!confirm(`Tandakan Amalan Jiwa ${a.user?.name ?? 'pengguna ini'} sebagai SELESAI?`)) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('user_wakil_talkin') as any)
        .update({
          amalan_status: 'completed',
          amalan_completion_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', a.id)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message)
    }
  }

  const notStarted = assignments.filter(a => a.amalan_status === 'not_started')
  const inProgress = assignments.filter(a => a.amalan_status === 'in_progress')
  const completed = assignments.filter(a => a.amalan_status === 'completed')

  const SectionHeader = ({ label, color, count }: { label: string; color: string; count: number }) => (
    <div className="flex items-center gap-2">
      <span className={cn('text-xs px-2 py-0.5 rounded-lg border', color)}>{label}</span>
      <span className="text-[#8a7a65] text-xs">{count} pengguna</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[#8a7a65] text-xs">{assignments.length} pengguna selesai Talkin</p>
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
      ) : assignments.length === 0 ? (
        <p className="text-center py-8 text-[#8a7a65] text-sm">Tiada pengguna yang selesai Talkin lagi.</p>
      ) : (
        <div className="space-y-5">
          {/* Not Started */}
          {notStarted.length > 0 && (
            <div className="space-y-2">
              <SectionHeader label="Belum Mulai" color="text-[#8a7a65] bg-[#1e2d40] border-[#2a3d55]" count={notStarted.length} />
              {notStarted.map(a => (
                <div key={a.id} className="bg-[#060d16] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
                  <div>
                    <p className="text-[#e8dcc8] text-sm font-medium">{a.user?.name ?? 'Pengguna'}</p>
                    <p className="text-[#8a7a65] text-xs">Mentor: {a.mentor?.name ?? '—'}</p>
                    {a.talkin_completion_date && (
                      <p className="text-[#8a7a65] text-xs">
                        Talkin selesai: {new Date(a.talkin_completion_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {a.talkin_notes && (
                    <p className="text-[#8a7a65] text-xs bg-[#0d1821] rounded-lg p-2 leading-relaxed">
                      Nota Talkin: {a.talkin_notes}
                    </p>
                  )}
                  <button onClick={() => openStart(a)}
                    className="px-3 py-1.5 text-xs border border-[#c9a96e40] text-[#c9a96e] rounded-lg hover:bg-[#c9a96e10] transition-all">
                    Mulakan Amalan Jiwa →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* In Progress */}
          {inProgress.length > 0 && (
            <div className="space-y-2">
              <SectionHeader label="Sedang Berjalan" color="text-blue-400 bg-blue-900/20 border-blue-600/40" count={inProgress.length} />
              {inProgress.map(a => (
                <div key={a.id} className="bg-[#060d16] border border-[#1e2d40] rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[#e8dcc8] text-sm font-medium">{a.user?.name ?? 'Pengguna'}</p>
                      <p className="text-[#8a7a65] text-xs">Mentor: {a.mentor?.name ?? '—'}</p>
                      {a.amalan_start_date && (
                        <p className="text-[#8a7a65] text-xs">
                          Mulai: {new Date(a.amalan_start_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <p className="text-[#8a7a65] text-xs">{a.amalan_weeks_completed} minggu</p>
                  </div>
                  {a.amalan_notes && (
                    <p className="text-[#8a7a65] text-xs bg-[#0d1821] rounded-lg p-2 leading-relaxed">{a.amalan_notes}</p>
                  )}
                  <button onClick={() => handleMarkComplete(a)}
                    className="px-3 py-1.5 text-xs border border-green-600/40 text-green-400 rounded-lg hover:bg-green-900/20 transition-all">
                    ✓ Tandakan Selesai
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-2">
              <SectionHeader label="Selesai" color="text-[#c9a96e] bg-[#c9a96e15] border-[#c9a96e30]" count={completed.length} />
              {completed.map(a => (
                <div key={a.id} className="bg-[#060d16] border border-[#1e2d40] rounded-xl px-4 py-3 flex items-center gap-3">
                  <CheckCircle2 size={14} className="text-[#c9a96e] flex-shrink-0" />
                  <div>
                    <p className="text-[#e8dcc8] text-sm">{a.user?.name ?? 'Pengguna'}</p>
                    {a.amalan_completion_date && (
                      <p className="text-[#8a7a65] text-xs">
                        Selesai: {new Date(a.amalan_completion_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start Amalan Modal */}
      {showStart && startTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md">
            <div className="sticky top-0 bg-[#0d1821] border-b border-[#1e2d40] px-5 py-4 flex items-center justify-between">
              <h3 className="text-[#e8dcc8] font-medium text-sm">Mulakan Amalan Jiwa</h3>
              <button onClick={() => setShowStart(false)} className="text-[#8a7a65] hover:text-[#e8dcc8] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#060d16] rounded-xl p-3 space-y-1">
                <p className="text-[#e8dcc8] text-sm">{startTarget.user?.name ?? 'Pengguna'}</p>
                <p className="text-[#8a7a65] text-xs">Mentor Talkin: {startTarget.mentor?.name ?? '—'}</p>
                {startTarget.talkin_notes && (
                  <p className="text-[#8a7a65] text-xs leading-relaxed mt-2 pt-2 border-t border-[#1e2d40]">
                    Nota Talkin: {startTarget.talkin_notes}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Amalan yang Ditetapkan (dari Wakil Talkin)</label>
                <textarea
                  value={startNotes}
                  onChange={e => setStartNotes(e.target.value)}
                  rows={4}
                  placeholder="Contoh: Zikir Jahar: La Ilaha Illallah (7 min, selepas Subuh)&#10;Zikir Khafi: Ya Allah Muraqabah (15 min, sebelum tidur)..."
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none resize-none placeholder:text-[#8a7a65]"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowStart(false)}
                  className="flex-1 py-3 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65]">Batal</button>
                <button onClick={handleStartAmalan} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c9a96e, #a07840)', color: '#060d16' }}>
                  {saving ? 'Menyimpan...' : 'Mulakan Amalan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
