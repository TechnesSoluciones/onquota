import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface RadioGroupProps {
  /** Radio options */
  options: RadioOption[]
  /** Name attribute for the radio group */
  name: string
  /** Currently selected value */
  value?: string
  /** Default value */
  defaultValue?: string
  /** Change handler */
  onChange?: (value: string) => void
  /** Error message */
  error?: string
  /** Orientation */
  orientation?: 'vertical' | 'horizontal'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

/**
 * Radio group component for single selection
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   name="plan"
 *   options={[
 *     { value: 'free', label: 'Free Plan' },
 *     { value: 'pro', label: 'Pro Plan', description: 'Best for professionals' },
 *     { value: 'enterprise', label: 'Enterprise' },
 *   ]}
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */
export function RadioGroup({
  options,
  name,
  value,
  defaultValue,
  onChange,
  error,
  orientation = 'vertical',
  size = 'md',
  className,
}: RadioGroupProps) {
  const [selectedValue, setSelectedValue] = React.useState(defaultValue || value || '')

  const handleChange = (optionValue: string) => {
    setSelectedValue(optionValue)
    onChange?.(optionValue)
  }

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'flex gap-4',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
      >
        {options.map((option) => {
          const radioId = `${name}-${option.value}`
          const isChecked = selectedValue === option.value

          return (
            <div key={option.value} className="flex items-start gap-3">
              <div className="relative flex items-center">
                <input
                  type="radio"
                  id={radioId}
                  name={name}
                  value={option.value}
                  checked={isChecked}
                  disabled={option.disabled}
                  onChange={() => handleChange(option.value)}
                  className={cn(
                    'peer appearance-none rounded-full border-2 border-neutral-300 bg-white transition-all hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 checked:border-primary disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-surface-dark dark:hover:border-neutral-600 dark:disabled:bg-neutral-900',
                    sizeClasses[size],
                    error && 'border-error focus:ring-error/50'
                  )}
                />
                <div
                  className={cn(
                    'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity peer-checked:opacity-100',
                    size === 'sm' && 'h-2 w-2',
                    size === 'md' && 'h-2.5 w-2.5',
                    size === 'lg' && 'h-3 w-3'
                  )}
                />
              </div>
              <label
                htmlFor={radioId}
                className={cn(
                  'cursor-pointer select-none',
                  option.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <div className="text-sm font-medium text-neutral-900 dark:text-white">
                  {option.label}
                </div>
                {option.description && (
                  <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {option.description}
                  </div>
                )}
              </label>
            </div>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  )
}
