/**
 * TrendIndicator Component
 * Shows trend direction and percentage change with color coding
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  value: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function TrendIndicator({
  value,
  label,
  size = 'md',
  showIcon = true,
  className,
}: TrendIndicatorProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const colorClasses = isPositive
    ? 'text-green-600 dark:text-green-400'
    : isNegative
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-600 dark:text-gray-400'

  const TrendIcon = isPositive
    ? TrendingUp
    : isNegative
    ? TrendingDown
    : Minus

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        sizeClasses[size],
        colorClasses,
        className
      )}
    >
      {showIcon && <TrendIcon className={iconSizeClasses[size]} />}
      <span className="font-medium">
        {isPositive && '+'}
        {value.toFixed(1)}%
      </span>
      {label && (
        <span className="text-muted-foreground ml-1">
          {label}
        </span>
      )}
    </div>
  )
}
