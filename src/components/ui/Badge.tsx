import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'green' | 'muted' | 'pro' | 'family'
}

export default function Badge({ variant = 'muted', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          gold: 'bg-[#c9a96e20] text-[#c9a96e] border border-[#c9a96e30]',
          green: 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50',
          muted: 'bg-[#1a2535] text-[#8a7a65] border border-[#1e2d40]',
          pro: 'bg-violet-900/30 text-violet-400 border border-violet-900/50',
          family: 'bg-blue-900/30 text-blue-400 border border-blue-900/50',
        }[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
