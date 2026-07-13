// Satu-satunya tempat threshold/peratusan program rujukan ditakrifkan —
// digunakan oleh api/*.ts (server) dan src/pages/*.tsx (client) supaya
// tak bersepah/perlu ubah banyak fail bila nak tuning nilai ni nanti.

export const REFERRAL_TIERS = [
  { minActive: 10, discountPct: 100, labelKey: 'rujukan.tahap.seratus' },
  { minActive: 5, discountPct: 50, labelKey: 'rujukan.tahap.lima_puluh' },
  { minActive: 3, discountPct: 20, labelKey: 'rujukan.tahap.dua_puluh' },
] as const // menurun — padanan pertama (threshold tertinggi dicapai) menang

export type ReferralTier = (typeof REFERRAL_TIERS)[number]

export function getReferralTier(activeCount: number): ReferralTier | null {
  return REFERRAL_TIERS.find(t => activeCount >= t.minActive) ?? null
}

// Threshold PALING RENDAH — untuk kira "berapa lagi rujukan aktif diperlukan
// untuk tahap seterusnya" dalam UI progress.
export function getNextReferralTier(activeCount: number): ReferralTier | null {
  const remaining = [...REFERRAL_TIERS].reverse().find(t => activeCount < t.minActive)
  return remaining ?? null
}

export const REFERRAL_CODE_PREFIX = 'AJ-'
