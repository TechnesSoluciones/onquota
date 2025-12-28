import * as React from 'react'
import { PageLayout, type BreadcrumbItem } from './page-layout'
import { cn } from '@/lib/utils/cn'

export interface DetailLayoutProps {
  /** Page title */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[]
  /** Action buttons/components to show in header */
  actions?: React.ReactNode
  /** Tab navigation */
  tabs?: React.ReactNode
  /** Sidebar content (appears on right) */
  sidebar?: React.ReactNode
  /** Main content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Layout for detail pages with optional sidebar and tabs
 *
 * @example
 * ```tsx
 * <DetailLayout
 *   title="Global Systems"
 *   subtitle="Cliente desde 2023"
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Clientes', href: '/clientes' },
 *     { label: 'Global Systems' }
 *   ]}
 *   actions={
 *     <>
 *       <Button variant="secondary">Editar</Button>
 *       <Button variant="destructive">Eliminar</Button>
 *     </>
 *   }
 *   tabs={<ClienteTabs activeTab="info" />}
 *   sidebar={<ClienteSidebar />}
 * >
 *   <ClienteInfo />
 * </DetailLayout>
 * ```
 */
export function DetailLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  tabs,
  sidebar,
  children,
  className,
}: DetailLayoutProps) {
  return (
    <PageLayout
      title={title}
      description={subtitle}
      breadcrumbs={breadcrumbs}
      actions={actions}
      className={className}
    >
      <div className="space-y-6">
        {/* Tabs Navigation */}
        {tabs && (
          <div className="border-b border-neutral-200 dark:border-neutral-800">
            {tabs}
          </div>
        )}

        {/* Content Grid */}
        <div className={cn('grid gap-6', sidebar && 'lg:grid-cols-[1fr_320px]')}>
          {/* Main Content */}
          <div className="space-y-6">{children}</div>

          {/* Sidebar */}
          {sidebar && (
            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">{sidebar}</aside>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

/**
 * Detail card component for use in DetailLayout
 */
export function DetailCard({
  title,
  children,
  actions,
  className,
}: {
  title?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-surface-dark',
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * Detail field component for displaying label-value pairs
 */
export function DetailField({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="text-sm text-neutral-900 dark:text-white">{value}</dd>
    </div>
  )
}
