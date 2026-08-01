// Definisi bersama untuk struktur 4 pillar Audit Jiwa (Raga/Hati/Akal/Ruh).
// Diasingkan dari AuditJiwaPage.tsx supaya komponen lain (mis. PillarLiveStatus,
// usePillarLiveScore) boleh guna semula tanpa circular import balik ke page tu.

export type PillarKey = 'raga' | 'hati' | 'akal' | 'ruh'

export interface PillarScores {
  raga: number
  hati: number
  akal: number
  ruh: number
}

export const PILLAR_CONFIG: Record<PillarKey, { icon: string; border: string; bg: string; text: string }> = {
  raga: { icon: '🫀', border: '#e85d75', bg: '#e85d7518', text: '#e85d75' },
  hati: { icon: '💚', border: '#7dd3a8', bg: '#7dd3a818', text: '#7dd3a8' },
  akal: { icon: '🔮', border: '#a78bfa', bg: '#a78bfa18', text: '#a78bfa' },
  ruh:  { icon: '🕌', border: '#c9a96e', bg: '#c9a96e18', text: '#c9a96e' },
}

export const PILLARS: PillarKey[] = ['raga', 'hati', 'akal', 'ruh']

export function getScoreStatus(score: number): { label: string; color: string } {
  if (score < 4)   return { label: 'kritikal',  color: '#ef4444' }
  if (score < 6)   return { label: 'perhatian', color: '#f97316' }
  if (score < 7.5) return { label: 'stabil',    color: '#eab308' }
  if (score < 9)   return { label: 'baik',      color: '#22c55e' }
  return             { label: 'cemerlang', color: '#10b981' }
}

export function getWeakestPillar(scores: PillarScores): PillarKey {
  return (Object.entries(scores) as [PillarKey, number][])
    .sort(([, a], [, b]) => a - b)[0][0]
}
