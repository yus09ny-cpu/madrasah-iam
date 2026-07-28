import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { useModHamba } from '@/hooks/useModHamba'

// Cadangan lembut sekali sahaja — muncul bila shouldSuggestModHamba() true DAN
// profiles.mod_hamba_suggested_at masih null. markSuggested() dipanggil bila
// kad ni DIPAPARKAN (bukan bila diklik) supaya ia betul-betul tak berulang.
export default function ModHambaSuggestionCard({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation()
  const { markSuggested, activate, logSuggestionResponse } = useModHamba()

  useEffect(() => {
    markSuggested()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTry() {
    logSuggestionResponse(true)
    activate()
    onDismiss()
  }

  function handleDismiss() {
    logSuggestionResponse(false)
    onDismiss()
  }

  return (
    <div className="bg-[#0d1821] border border-[#a78bfa30] rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <Sparkles size={16} className="text-[#a78bfa] flex-shrink-0 mt-0.5" />
        <p className="text-[#e8dcc8] text-xs leading-relaxed">{t('mod_hamba.cadangan_teks')}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleTry}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[#a78bfa20] border border-[#a78bfa50] text-[#a78bfa] hover:bg-[#a78bfa30] transition-colors"
        >
          {t('mod_hamba.cadangan_cuba')}
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[#8a7a65] hover:text-[#e8dcc8] transition-colors"
        >
          {t('mod_hamba.cadangan_tak_sekarang')}
        </button>
      </div>
    </div>
  )
}
