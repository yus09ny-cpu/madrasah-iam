import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  gold?: boolean
}

export function Card({ gold, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-[#0d1821] p-5 transition-colors',
        gold
          ? 'border-[#c9a96e30] hover:border-[#c9a96e60]'
          : 'border-[#1e2d40] hover:border-[#2a3d55]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-serif text-lg font-medium text-[#c9a96e]', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-[#e8dcc8]', className)} {...props}>
      {children}
    </div>
  )
}
