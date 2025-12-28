import * as React from 'react'
import { PageLayout, type BreadcrumbItem } from './page-layout'
import { cn } from '@/lib/utils/cn'

export interface ListLayoutProps {
  /** Page title */
  title: string
  /** Optional page description */
  description?: string
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[]
  /** Action buttons/components to show in header */
  actions?: React.ReactNode
  /** Stats/KPI cards to show above filters */
  stats?: React.ReactNode
  /** Filter components */
  filters?: React.ReactNode
  /** Main list/table content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Layout for list/table pages with optional stats and filters
 *
 * @example
 * ```tsx
 * <ListLayout
 *   title="Clientes"
 *   description="Gestiona tus clientes"
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Clientes' }
 *   ]}
 *   actions={<Button>Nuevo Cliente</Button>}
 *   stats={
 *     <>
 *       <StatsCard title="Total" value="1,248" />
 *       <StatsCard title="Activos" value="856" />
 *     </>
 *   }
 *   filters={<FilterBar />}
 * >
 *   <ClienteTable />
 * </ListLayout>
 * ```
 */
export function ListLayout({
  title,
  description,
  breadcrumbs,
  actions,
  stats,
  filters,
  children,
  className,
}: ListLayoutProps) {
  return (
    <PageLayout
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={actions}
      className={className}
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats}
          </div>
        )}

        {/* Filters */}
        {filters && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-surface-dark">
            {filters}
          </div>
        )}

        {/* List/Table Content */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
          {children}
        </div>
      </div>
    </PageLayout>
  )
}

/**
 * Stats card component for use in ListLayout
 */
export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className,
}: {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  className?: string
}) {
  const changeColors = {
    positive: 'bg-success-100 text-success-800 dark:bg-success-500/10 dark:text-success-400',
    negative: 'bg-error-100 text-error-800 dark:bg-error-500/10 dark:text-error-400',
    neutral: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-surface-dark',
        className
      )}
    >
      <div className="flex items-start justify-between">
        {icon && <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>}
        {change && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
              changeColors[changeType]
            )}
          >
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
        <h3 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">{value}</h3>
      </div>
    </div>
  )
}
