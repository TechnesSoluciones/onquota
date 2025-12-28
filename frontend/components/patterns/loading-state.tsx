import * as React from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Loading spinner component
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <svg
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Full page loading state
 *
 * @example
 * ```tsx
 * <LoadingState />
 * <LoadingState message="Cargando clientes..." />
 * ```
 */
export function LoadingState({
  message = 'Cargando...',
  className,
}: {
  message?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center gap-4',
        className
      )}
    >
      <LoadingSpinner size="lg" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </div>
  )
}

/**
 * Skeleton loader for content placeholders
 *
 * @example
 * ```tsx
 * <Skeleton className="h-8 w-48" />
 * <Skeleton className="h-32 w-full rounded-lg" />
 * ```
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800',
        className
      )}
    />
  )
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Card skeleton loader
 */
export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-surface-dark">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
