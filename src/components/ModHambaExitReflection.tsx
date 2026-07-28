import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useModHamba } from '@/hooks/useModHamba'

// Geseran lembut, bukan sekatan — jawapan apa pun (termasuk kosong/langkau)
// tetap teruskan nyahaktifkan. "Batal" (kekal Mod Hamba aktif) turut disediakan
// supaya jeda ni betul-betul jeda, bukan perangkap ke arah satu keputusan.
export default function ModHambaExitReflection({ onClose, onDone }: {
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const { deactivateWithReflection } = useModHamba()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function proceed(withReason: boolean) {
    if (loading) return
    setLoading(true)
    try {
      await deactivateWithReflection(withReason && reason.trim() ? reason.trim() : null)
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div className="bg-[#0d1821] border border-[#1e2d40] rounded-2xl p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <p className="text-[#e8dcc8] text-sm font-medium leading-relaxed">{t('mod_hamba.keluar_soalan')}</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t('mod_hamba.keluar_placeholder')}
          rows={3}
          className="w-full bg-[#060d16] border border-[#1e2d40] focus:border-[#a78bfa40] rounded-xl px-3.5 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65] outline-none resize-none transition-colors"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={() => proceed(true)}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-medium bg-[#a78bfa20] border border-[#a78bfa50] text-[#a78bfa] hover:bg-[#a78bfa30] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {t('mod_hamba.keluar_teruskan')}
          </button>
          <button
            onClick={() => proceed(false)}
            disabled={loading}
            className="w-full text-[#8a7a65] text-xs text-center py-1 hover:text-[#e8dcc8] transition-colors"
          >
            {t('mod_hamba.keluar_langkau')}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full text-[#8a7a65] text-xs text-center hover:text-[#e8dcc8] transition-colors"
          >
            {t('mod_hamba.keluar_batal')}
          </button>
        </div>
      </div>
    </div>
  )
}
