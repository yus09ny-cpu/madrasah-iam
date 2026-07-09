import type { HeartRateMonitorState } from '@/hooks/useHeartRateMonitor'

// Small non-intrusive "real device data" indicator, meant to sit next to a
// session timer or device readout. Emerald matches the existing "real BLE
// connected" convention (AdminZikirKhafiDevPage.tsx) rather than inventing a
// new color — purple is already this feature's pervasive base brand color,
// used whether the session is real or simulated, so it can't double as a
// "this is real" marker without conflicting with itself.
//
// Deliberately only renders for 'connected' — the caller only mounts this
// while sessionMode === 'ble', and a mid-session disconnect silently demotes
// sessionMode back to 'tap' (see ZikirKhafiPlayer's onUnexpectedDisconnect),
// which un-mounts this badge rather than needing it to show its own
// disconnected/reconnecting state.
export default function BleStatusBadge({ state }: { state: HeartRateMonitorState }) {
  if (state !== 'connected') return null
  return (
    <span
      title="Data BPM sebenar dari peranti Bluetooth"
      className="text-[10px] text-emerald-400/80 inline-flex items-center gap-0.5"
      aria-label="Peranti BLE tersambung"
    >
      🫀 BLE
    </span>
  )
}
