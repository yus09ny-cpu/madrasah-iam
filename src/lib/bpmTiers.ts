// ─── BPM tier classification (BLE-only reward system) ──────────────────────
// Shared between ZikirKhafiPlayer.tsx (the session screen) and the Rekod
// history/trend view (PintuRezekiPage.tsx) so both use the exact same
// boundaries and colors — no duplicated, potentially drifting definitions.
//
// Ordered high-arousal -> deep-calm. 60/50 mirror ZikirKhafiPlayer.tsx's own
// ZIKIR_RANGE_MAX/TARGET_BPM constants (not imported directly, to avoid a
// cross-import between a page and a session component — but tier 3/4's
// boundary is deliberately kept numerically identical to those).

export type BpmTier = 1 | 2 | 3 | 4 | 5

export function classifyBpmTier(bpm: number): BpmTier {
  if (bpm > 100) return 1
  if (bpm > 80) return 2
  if (bpm > 60) return 3
  if (bpm >= 40) return 4
  return 5
}

export const TIER_META: Record<BpmTier, { key: string; color: string }> = {
  1: { key: 'tier_1', color: '#f87171' }, // Hilang Tumpuan
  2: { key: 'tier_2', color: '#fb923c' }, // Kurang Stabil
  3: { key: 'tier_3', color: '#fbbf24' }, // Menghampiri Tenang
  4: { key: 'tier_4', color: '#34d399' }, // Ketenangan Mendalam
  5: { key: 'tier_5', color: '#a78bfa' }, // Kesedaran Berterusan
}
