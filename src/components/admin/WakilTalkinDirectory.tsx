import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { WakilTalkinRecord } from '@/types'

const SPECIALIZATIONS = [
  { value: 'beginner', label: 'Beginner Foundation' },
  { value: 'advanced', label: 'Advanced Muraqabah' },
  { value: 'specific_issues', label: 'Specific Issues' },
]

const LANG_OPTIONS = [
  { value: 'bm', label: 'BM (Bahasa Melayu)' },
  { value: 'en', label: 'EN (English)' },
  { value: 'ar', label: 'AR (العربية)' },
  { value: 'id', label: 'BI (Bahasa Indonesia)' },
]

const CONTACT_OPTIONS = [
  { value: 'in_app', label: 'In-app messaging' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'live_events', label: 'Live Zikir events' },
]

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  bio: '',
  specialization: 'beginner',
  languages: [] as string[],
  availability_status: 'available' as 'available' | 'full' | 'on_leave',
  max_students: 20,
  contact_methods: [] as string[],
  status: 'active' as 'active' | 'inactive' | 'suspended',
}

type Filter = 'all' | 'available' | 'full' | 'unverified' | 'inactive'

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Semua',
  available: 'Tersedia',
  full: 'Penuh',
  unverified: 'Belum Disahkan',
  inactive: 'Tidak Aktif',
}

export default function WakilTalkinDirectory() {
  const [records, setRecords] = useState<WakilTalkinRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<WakilTalkinRecord | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase.from('wakil_talkin') as any)
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setRecords(data ?? [])
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Gagal memuatkan data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(r: WakilTalkinRecord) {
    setEditTarget(r)
    setForm({
      name: r.name,
      email: r.email,
      phone: r.phone ?? '',
      bio: r.bio ?? '',
      specialization: r.specialization ?? 'beginner',
      languages: r.languages ? r.languages.split(',') : [],
      availability_status: r.availability_status,
      max_students: r.max_students,
      contact_methods: r.contact_methods ? r.contact_methods.split(',') : [],
      status: r.status,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        bio: form.bio || null,
        specialization: form.specialization,
        languages: form.languages.join(',') || null,
        availability_status: form.availability_status,
        max_students: form.max_students,
        contact_methods: form.contact_methods.join(',') || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      }
      if (editTarget) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase.from('wakil_talkin') as any).update(payload).eq('id', editTarget.id)
        if (err) throw err
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase.from('wakil_talkin') as any)
          .insert({ ...payload, is_verified: false, current_students: 0 })
        if (err) throw err
      }
      setShowModal(false)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wakil_talkin') as any)
        .update({ is_verified: true, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message)
    }
  }

  async function handleToggleSuspend(r: WakilTalkinRecord) {
    const newStatus = r.status === 'suspended' ? 'active' : 'suspended'
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wakil_talkin') as any)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      load()
    } catch (e: unknown) {
      alert((e as Error)?.message)
    }
  }

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'available' ? r.availability_status === 'available' :
      filter === 'full' ? r.availability_status === 'full' :
      filter === 'unverified' ? !r.is_verified :
      r.status !== 'active'
    return matchSearch && matchFilter
  })

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  return (
    <div className="space-y-4">
      {/* Search + refresh */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7a65]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / emel..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm placeholder:text-[#8a7a65] focus:outline-none focus:border-[#c9a96e40]"
          />
        </div>
        <button onClick={load} className="p-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs border transition-all',
              filter === f ? 'bg-[#c9a96e20] border-[#c9a96e40] text-[#c9a96e]' : 'border-[#1e2d40] text-[#8a7a65] hover:border-[#2a3d55]'
            )}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-8 text-[#8a7a65] text-sm">Memuatkan...</p>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 text-center space-y-1">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-[#8a7a65] text-xs">Jalankan SQL migration di Supabase dashboard dahulu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#8a7a65] px-1">{filtered.length} Wakil Talkin</p>
          {filtered.length === 0 && (
            <p className="text-center py-6 text-[#8a7a65] text-sm">Tiada rekod ditemui.</p>
          )}
          {filtered.map(r => (
            <div key={r.id} className="bg-[#060d16] border border-[#1e2d40] rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[#e8dcc8] font-medium text-sm">{r.name}</p>
                    {r.is_verified
                      ? <span className="text-[10px] px-1.5 py-0.5 bg-green-900/30 border border-green-600/40 text-green-400 rounded-md">✓ Disahkan</span>
                      : <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/30 border border-yellow-600/40 text-yellow-400 rounded-md">⚠ Belum Disahkan</span>
                    }
                    {r.status === 'suspended' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-900/30 border border-red-600/40 text-red-400 rounded-md">Digantung</span>
                    )}
                  </div>
                  <p className="text-[#8a7a65] text-xs mt-0.5">{r.email}</p>
                  {r.specialization && (
                    <p className="text-[#c9a96e] text-xs mt-1">
                      {SPECIALIZATIONS.find(s => s.value === r.specialization)?.label ?? r.specialization}
                    </p>
                  )}
                  {r.languages && <p className="text-[#8a7a65] text-xs">{r.languages.toUpperCase()}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[#e8dcc8] text-sm font-medium">{r.current_students}/{r.max_students}</p>
                  <p className={cn(
                    'text-xs',
                    r.availability_status === 'available' ? 'text-green-400' :
                    r.availability_status === 'full' ? 'text-red-400' : 'text-yellow-400'
                  )}>
                    {r.availability_status === 'available' ? 'Tersedia' : r.availability_status === 'full' ? 'Penuh' : 'Cuti'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => openEdit(r)} className="px-3 py-1.5 text-xs border border-[#1e2d40] text-[#8a7a65] rounded-lg hover:text-[#e8dcc8] hover:border-[#2a3d55] transition-all">
                  Edit
                </button>
                {!r.is_verified && (
                  <button onClick={() => handleVerify(r.id)} className="px-3 py-1.5 text-xs border border-green-600/40 text-green-400 rounded-lg hover:bg-green-900/20 transition-all">
                    Sahkan
                  </button>
                )}
                <button
                  onClick={() => handleToggleSuspend(r)}
                  className={cn(
                    'px-3 py-1.5 text-xs border rounded-lg transition-all',
                    r.status === 'suspended'
                      ? 'border-[#c9a96e40] text-[#c9a96e] hover:bg-[#c9a96e10]'
                      : 'border-red-600/40 text-red-400 hover:bg-red-900/20'
                  )}
                >
                  {r.status === 'suspended' ? 'Aktifkan' : 'Gantung'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={openAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#c9a96e40] text-[#c9a96e] text-sm hover:bg-[#c9a96e08] transition-colors"
      >
        <Plus size={14} /> Tambah Wakil Talkin Baru
      </button>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0d1821] border-b border-[#1e2d40] px-5 py-4 flex items-center justify-between">
              <h3 className="text-[#e8dcc8] font-medium text-sm">
                {editTarget ? 'Edit Wakil Talkin' : 'Tambah Wakil Talkin Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#8a7a65] hover:text-[#e8dcc8] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Nama Penuh *', key: 'name', type: 'text' },
                { label: 'Emel *', key: 'email', type: 'email' },
                { label: 'Telefon', key: 'phone', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[#8a7a65] text-xs">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none focus:border-[#c9a96e40]"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none focus:border-[#c9a96e40] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Pengkhususan</label>
                <select
                  value={form.specialization}
                  onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none"
                >
                  {SPECIALIZATIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Bahasa</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LANG_OPTIONS.map(l => (
                    <label key={l.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.languages.includes(l.value)}
                        onChange={() => setForm(f => ({ ...f, languages: toggle(f.languages, l.value) }))}
                        className="accent-[#c9a96e]" />
                      <span className="text-[#8a7a65] text-xs">{l.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[#8a7a65] text-xs">Kaedah Hubungi</label>
                <div className="space-y-1.5">
                  {CONTACT_OPTIONS.map(c => (
                    <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.contact_methods.includes(c.value)}
                        onChange={() => setForm(f => ({ ...f, contact_methods: toggle(f.contact_methods, c.value) }))}
                        className="accent-[#c9a96e]" />
                      <span className="text-[#8a7a65] text-xs">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#8a7a65] text-xs">Maks Murid</label>
                  <input type="number" min={1} max={100} value={form.max_students}
                    onChange={e => setForm(f => ({ ...f, max_students: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#8a7a65] text-xs">Ketersediaan</label>
                  <select value={form.availability_status}
                    onChange={e => setForm(f => ({ ...f, availability_status: e.target.value as typeof form.availability_status }))}
                    className="w-full px-3 py-2.5 bg-[#060d16] border border-[#1e2d40] rounded-xl text-[#e8dcc8] text-sm focus:outline-none">
                    <option value="available">Tersedia</option>
                    <option value="full">Penuh</option>
                    <option value="on_leave">Cuti</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm border border-[#1e2d40] text-[#8a7a65] hover:text-[#e8dcc8] transition-colors">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving || !form.name || !form.email}
                  className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
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
