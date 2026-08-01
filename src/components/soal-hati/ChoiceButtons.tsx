import { cn } from '@/lib/utils'

// Pola butang pilihan dikongsi — diekstrak daripada corak yang berulang secara
// tak bersandar antara ScaleSelector (AuditJiwaPage.tsx), REFLEKSI_SOALAN
// (AmalanPage.tsx) dan MOD_HAMBA_REFLECTION_OPTIONS (ZikirKhafiPlayer.tsx).

export interface ChoiceButtonOption {
  id: string
  label: string
}

export function ChoiceButtons({
  options,
  selectedId,
  onSelect,
  disabled,
  accent = '#7dd3a8',
}: {
  options: ChoiceButtonOption[]
  selectedId?: string | null
  onSelect: (id: string) => void
  disabled?: boolean
  accent?: string
}) {
  return (
    <div className="space-y-1.5">
      {options.map(opt => {
        const selected = selectedId === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            disabled={disabled}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
            style={
              selected
                ? { borderColor: accent, backgroundColor: `${accent}15`, color: accent }
                : { borderColor: '#1e2d40', color: '#8a7a65' }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
