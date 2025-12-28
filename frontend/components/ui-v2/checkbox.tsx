import * as React from 'react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/icons'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: string
  /** Error message */
  error?: string
  /** Helper text */
  helperText?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const iconSizes = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
} as const

/**
 * Checkbox component with label and error states
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms and conditions" />
 * <Checkbox label="Subscribe to newsletter" defaultChecked />
 * <Checkbox label="Required field" error="This field is required" />
 * ```
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, size = 'md', id, ...props }, ref) => {
    const generatedId = React.useId()
    const checkboxId = id || generatedId

    return (
      <div className="w-full">
        <div className="flex items-start gap-2">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              id={checkboxId}
              ref={ref}
              className={cn(
                'peer appearance-none rounded border-2 border-neutral-300 bg-white transition-all hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-surface-dark dark:hover:border-neutral-600 dark:checked:bg-primary dark:disabled:bg-neutral-900',
                sizeClasses[size],
                error && 'border-error focus:ring-error/50',
                className
              )}
              {...props}
            />
            <Icon
              name="check"
              size={iconSizes[size]}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            />
          </div>
          {label && (
            <label
              htmlFor={checkboxId}
              className="cursor-pointer select-none text-sm font-medium text-neutral-900 dark:text-white"
            >
              {label}
            </label>
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
Checkbox.displayName = 'Checkbox'

export { Checkbox }
