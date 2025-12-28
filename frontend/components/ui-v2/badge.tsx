import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
        primary:
          'bg-primary-100 text-primary-800 ring-1 ring-inset ring-primary-700/10 dark:bg-primary-400/10 dark:text-primary-400 dark:ring-primary-400/20',
        success:
          'bg-success-100 text-success-800 ring-1 ring-inset ring-success-600/20 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20',
        warning:
          'bg-warning-100 text-warning-800 ring-1 ring-inset ring-warning-600/20 dark:bg-warning-400/10 dark:text-warning-400 dark:ring-warning-400/20',
        error:
          'bg-error-100 text-error-800 ring-1 ring-inset ring-error-600/20 dark:bg-error-400/10 dark:text-error-400 dark:ring-error-400/20',
        info:
          'bg-info-100 text-info-800 ring-1 ring-inset ring-info-700/10 dark:bg-info-400/10 dark:text-info-400 dark:ring-info-400/20',
        outline:
          'border border-neutral-300 bg-transparent text-neutral-700 dark:border-neutral-700 dark:text-neutral-300',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional icon to show before text */
  icon?: React.ReactNode
  /** Optional dot indicator */
  dot?: boolean
}

/**
 * Badge component for status indicators and labels
 *
 * @example
 * ```tsx
 * <Badge>Default</Badge>
 * <Badge variant="success">Activo</Badge>
 * <Badge variant="warning" dot>Pendiente</Badge>
 * <Badge variant="error">Error</Badge>
 * ```
 */
function Badge({ className, variant, size, icon, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {icon}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
