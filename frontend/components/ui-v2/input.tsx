import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon to show on the left */
  leftIcon?: React.ReactNode
  /** Icon to show on the right */
  rightIcon?: React.ReactNode
  /** Error message to display */
  error?: string
  /** Helper text to display */
  helperText?: string
}

/**
 * Input component with support for icons and error states
 *
 * @example
 * ```tsx
 * <Input placeholder="Enter your name" />
 * <Input leftIcon={<SearchIcon />} placeholder="Search..." />
 * <Input error="This field is required" />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', leftIcon, rightIcon, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-surface-dark dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary dark:disabled:bg-neutral-900',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-error focus:border-error focus:ring-error/50',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
