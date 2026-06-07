import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="text-sm text-[#8a7a65]">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full bg-[#1a2535] border border-[#1e2d40] rounded-xl px-4 py-2.5 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65]',
          'focus:outline-none focus:border-[#c9a96e60] focus:ring-1 focus:ring-[#c9a96e30]',
          'transition-colors',
          error && 'border-red-500/50',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="text-sm text-[#8a7a65]">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-[#1a2535] border border-[#1e2d40] rounded-xl px-4 py-3 text-sm text-[#e8dcc8] placeholder:text-[#8a7a65]',
          'focus:outline-none focus:border-[#c9a96e60] focus:ring-1 focus:ring-[#c9a96e30]',
          'transition-colors resize-none',
          error && 'border-red-500/50',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
