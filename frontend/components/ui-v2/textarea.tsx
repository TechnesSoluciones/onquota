import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error message */
  error?: string
  /** Helper text */
  helperText?: string
  /** Show character count */
  showCount?: boolean
  /** Maximum character count */
  maxLength?: number
}

/**
 * Textarea component with error states and character count
 *
 * @example
 * ```tsx
 * <Textarea placeholder="Enter description" />
 * <Textarea error="This field is required" />
 * <Textarea showCount maxLength={500} />
 * ```
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, showCount, maxLength, value, ...props }, ref) => {
    const [count, setCount] = React.useState(0)

    React.useEffect(() => {
      if (typeof value === 'string') {
        setCount(value.length)
      }
    }, [value])

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[120px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-surface-dark dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary dark:disabled:bg-neutral-900',
            error && 'border-error focus:border-error focus:ring-error/50',
            className
          )}
          maxLength={maxLength}
          value={value}
          onChange={(e) => {
            setCount(e.target.value.length)
            props.onChange?.(e)
          }}
          {...props}
        />
        <div className="mt-1 flex items-center justify-between">
          <div className="flex-1">
            {error && <p className="text-xs text-error">{error}</p>}
            {!error && helperText && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
            )}
          </div>
          {showCount && maxLength && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {count} / {maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
