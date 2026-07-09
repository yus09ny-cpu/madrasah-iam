import type { WakeLockStatus } from '@/hooks/useWakeLock'

// Small non-intrusive indicator of screen wake-lock status, meant to sit next
// to a session timer. 'active' is the only reassuring state — both
// 'unsupported' (feature missing) and 'released' (request failed, e.g. denied
// permission, or the OS silently revoked it) mean the screen can still sleep,
// so both surface the same "you may need to disable auto-lock manually" hint.
export default function WakeLockBadge({ status }: { status: WakeLockStatus }) {
  if (status === 'active') {
    return (
      <span title="Skrin akan kekal aktif sepanjang sesi" className="text-[10px] text-emerald-400/70" aria-label="Wake lock aktif">
        🔒
      </span>
    )
  }
  if (status === 'unsupported' || status === 'released') {
    const title =
      status === 'unsupported'
        ? 'Pelayar ini tidak menyokong skrin sentiasa aktif — sila lumpuhkan auto-lock telefon secara manual'
        : 'Skrin sentiasa aktif tidak dapat diaktifkan buat masa ini — sila lumpuhkan auto-lock telefon secara manual'
    return (
      <span title={title} className="text-[10px] text-amber-400/70" aria-label="Wake lock tidak aktif">
        🔓
      </span>
    )
  }
  return null
}
