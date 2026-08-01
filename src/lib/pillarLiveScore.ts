import type { PillarKey, PillarScores } from '@/lib/pillars'

// ─── Live pillar adjustment ─────────────────────────────────────────────────
// Skor pillar paparan = baseline (dari audit_jiwa_entries terkini) + pelarasan
// "hidup" dikira dari aktiviti releven (solat/zikir/muhasabah) sejak tarikh
// baseline itu, dengan decay kalau tiada aktiviti. Baseline kekal punca
// kebenaran utama — layer ni cuma nuansa jangka-pendek (clamp ±1.5 mata).

export const LIVE_WINDOW_DAYS = 14
const INCREMENT_PER_ACTIVE_DAY = 0.12
const DECAY_PER_INACTIVE_DAY = 0.08
const MAX_ADJUSTMENT = 1.5

export type ActivityType = 'solat' | 'zikir' | 'muhasabah'

interface ActivityWeight {
  primary: PillarKey
  secondary?: PillarKey
}

export const ACTIVITY_PILLAR_MAP: Record<ActivityType, ActivityWeight> = {
  solat: { primary: 'ruh', secondary: 'raga' },
  zikir: { primary: 'ruh', secondary: 'hati' },
  muhasabah: { primary: 'akal', secondary: 'hati' },
}

/** Set tarikh ('yyyy-MM-dd') yang aktif bagi setiap jenis aktiviti. */
export type ActivityDatesByType = Record<ActivityType, Set<string>>

/**
 * Kira pelarasan (delta, bukan skor akhir) untuk setiap pillar, bagi setiap
 * hari dalam tetingkap [baselineDate+1, today], dihadkan maksimum
 * LIVE_WINDOW_DAYS hari lihat-belakang dari hari ini.
 */
export function computeLiveAdjustment(
  activityDatesByType: ActivityDatesByType,
  windowDates: string[], // senarai tarikh 'yyyy-MM-dd' dalam tetingkap, susunan bebas
): PillarScores {
  const adjustment: PillarScores = { raga: 0, hati: 0, akal: 0, ruh: 0 }

  for (const date of windowDates) {
    // Wajaran tertinggi (utama=1.0 / sekunder=0.5) yang tercapai pillar ni pada hari ni
    const dayWeightByPillar: Partial<Record<PillarKey, number>> = {}

    for (const type of Object.keys(ACTIVITY_PILLAR_MAP) as ActivityType[]) {
      if (!activityDatesByType[type].has(date)) continue
      const { primary, secondary } = ACTIVITY_PILLAR_MAP[type]
      dayWeightByPillar[primary] = Math.max(dayWeightByPillar[primary] ?? 0, 1.0)
      if (secondary) {
        dayWeightByPillar[secondary] = Math.max(dayWeightByPillar[secondary] ?? 0, 0.5)
      }
    }

    for (const pillar of ['raga', 'hati', 'akal', 'ruh'] as PillarKey[]) {
      const weight = dayWeightByPillar[pillar]
      if (weight) {
        adjustment[pillar] += INCREMENT_PER_ACTIVE_DAY * weight
      } else {
        adjustment[pillar] -= DECAY_PER_INACTIVE_DAY
      }
    }
  }

  for (const pillar of ['raga', 'hati', 'akal', 'ruh'] as PillarKey[]) {
    adjustment[pillar] = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, adjustment[pillar]))
  }

  return adjustment
}

export function applyLiveAdjustment(baseline: PillarScores, adjustment: PillarScores): PillarScores {
  const result = {} as PillarScores
  for (const pillar of ['raga', 'hati', 'akal', 'ruh'] as PillarKey[]) {
    result[pillar] = Math.round(Math.max(0, Math.min(10, baseline[pillar] + adjustment[pillar])) * 10) / 10
  }
  return result
}
