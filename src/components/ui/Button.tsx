import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            primary: 'bg-[#c9a96e] text-[#060d16] hover:bg-[#e2c89a] active:bg-[#a07840]',
            secondary: 'bg-[#1a2535] text-[#e8dcc8] border border-[#1e2d40] hover:border-[#c9a96e40] hover:text-[#c9a96e]',
            ghost: 'text-[#8a7a65] hover:text-[#e8dcc8] hover:bg-[#1a2535]',
            danger: 'bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50',
          }[variant],
          {
            sm: 'text-xs px-3 py-1.5',
            md: 'text-sm px-4 py-2.5',
            lg: 'text-base px-6 py-3',
          }[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="mr-2 h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export default Button
