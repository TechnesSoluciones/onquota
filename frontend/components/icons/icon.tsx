'use client'

import { cn } from '@/lib/utils/cn'

/**
 * Common Material Icon names used in the application
 * Add more as needed
 */
export type IconName =
  // Navigation
  | 'dashboard'
  | 'grid_view'
  | 'groups'
  | 'person'
  | 'business'
  | 'monetization_on'
  | 'inventory_2'
  | 'bar_chart'
  | 'settings'
  | 'menu'
  | 'close'
  | 'arrow_back'
  | 'arrow_forward'
  | 'expand_more'
  | 'expand_less'
  | 'chevron_left'
  | 'chevron_right'
  // Actions
  | 'add'
  | 'edit'
  | 'delete'
  | 'save'
  | 'cancel'
  | 'search'
  | 'filter_alt'
  | 'download'
  | 'upload'
  | 'refresh'
  | 'more_vert'
  | 'more_horiz'
  // Communication
  | 'mail'
  | 'call'
  | 'notifications'
  | 'chat'
  | 'send'
  // Content
  | 'description'
  | 'folder'
  | 'file_copy'
  | 'attach_file'
  | 'image'
  | 'video_library'
  // Status
  | 'check'
  | 'check_circle'
  | 'error'
  | 'warning'
  | 'info'
  | 'help'
  | 'schedule'
  | 'event'
  | 'calendar_today'
  // Finance
  | 'payments'
  | 'receipt'
  | 'trending_up'
  | 'trending_down'
  | 'account_balance'
  // Other
  | 'visibility'
  | 'visibility_off'
  | 'lock'
  | 'lock_open'
  | 'location_on'
  | 'star'
  | 'favorite'
  | 'share'
  | 'print'
  | 'hub'
  | 'assignment_late'
  | 'person_add'
  | 'add_call'
  | 'domain'
  | 'inventory'

export interface IconProps {
  /** Material Icon name */
  name: IconName | string
  /** Additional CSS classes */
  className?: string
  /** Icon size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Whether to use filled variant */
  filled?: boolean
  /** Custom font variation weight */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  /** ARIA label for accessibility */
  'aria-label'?: string
}

const sizeClasses = {
  xs: 'text-base',  // 16px
  sm: 'text-lg',    // 18px
  md: 'text-xl',    // 20px
  lg: 'text-2xl',   // 24px
  xl: 'text-3xl',   // 30px
}

/**
 * Material Icons component with TypeScript support
 *
 * @example
 * ```tsx
 * <Icon name="dashboard" />
 * <Icon name="add" filled size="lg" className="text-primary" />
 * <Icon name="notifications" aria-label="View notifications" />
 * ```
 */
export function Icon({
  name,
  className,
  size = 'md',
  filled = false,
  weight = 400,
  'aria-label': ariaLabel,
}: IconProps) {
  return (
    <span
      className={cn(
        'material-symbols-outlined',
        filled && 'filled',
        sizeClasses[size],
        className
      )}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    >
      {name}
    </span>
  )
}

// Convenience exports for commonly used icons
export const DashboardIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="dashboard" {...props} />
)

export const PersonIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="person" {...props} />
)

export const SettingsIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="settings" {...props} />
)

export const AddIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="add" {...props} />
)

export const SearchIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="search" {...props} />
)

export const CloseIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="close" {...props} />
)

export const NotificationsIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="notifications" {...props} />
)
