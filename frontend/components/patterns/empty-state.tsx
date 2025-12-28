import * as React from 'react'
import { cn } from '@/lib/utils/cn'
import { Icon, type IconName } from '@/components/icons'
import { Button } from '@/components/ui-v2'

export interface EmptyStateProps {
  /** Icon to display */
  icon?: IconName
  /** Custom icon component */
  customIcon?: React.ReactNode
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Call-to-action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Additional CSS classes */
  className?: string
}

/**
 * Empty state component for displaying when there's no data
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon="folder"
 *   title="No hay clientes"
 *   description="Comienza agregando tu primer cliente"
 *   action={{
 *     label: "Nuevo Cliente",
 *     onClick: () => router.push('/clientes/nuevo')
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  customIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex min-h-[400px] flex-col items-center justify-center p-8 text-center', className)}>
      {/* Icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        {customIcon || (icon && <Icon name={icon} size="xl" className="text-neutral-400" />)}
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mb-6 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
