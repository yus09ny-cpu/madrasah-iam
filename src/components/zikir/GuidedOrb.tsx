import { cn } from '@/lib/utils'

interface GuidedOrbProps {
  // 0–1, drives scale/opacity — caller owns the pulse timing (haptic/audio
  // cadence differs between tap-tempo and BLE modes), this component only
  // renders the resulting value.
  pulse: number
  label: 'Allah' | 'Hu' | ''
  size?: number
  className?: string
}

// Extracted from ZikirKhafiPlayer.tsx's running-phase orb — pure visual,
// no timing/haptic/audio logic. Callers drive `pulse`/`label` from their own
// beat scheduler (see ZikirKhafiPlayer's firePulseTick).
export default function GuidedOrb({ pulse, label, size = 260, className }: GuidedOrbProps) {
  const scale = 0.85 + pulse * 0.35
  const opacity = 0.5 + pulse * 0.5
  return (
    <div
      className={cn('rounded-full transition-all ease-out pointer-events-none', className)}
      style={{
        width: size,
        height: size,
        transform: `scale(${scale})`,
        opacity,
        background: label === 'Allah'
          ? 'radial-gradient(circle at center, rgba(201,169,110,0.9), rgba(201,169,110,0.1) 55%, rgba(0,0,0,0) 75%)'
          : 'radial-gradient(circle at center, rgba(167,139,250,0.7), rgba(167,139,250,0.1) 55%, rgba(0,0,0,0) 75%)',
        filter: 'blur(0.5px)',
        willChange: 'transform, opacity',
        transitionDuration: '150ms',
      }}
    />
  )
}
