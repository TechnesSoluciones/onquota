import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageLayoutProps {
  /** Page title */
  title: string
  /** Optional page description */
  description?: string
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[]
  /** Action buttons/components to show in header */
  actions?: React.ReactNode
  /** Main content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Content container max width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
}

/**
 * Page layout component with header, breadcrumbs, and content area
 *
 * @example
 * ```tsx
 * <PageLayout
 *   title="Clientes"
 *   description="Gestiona tus clientes y prospectos"
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Clientes' }
 *   ]}
 *   actions={<Button>Nuevo Cliente</Button>}
 * >
 *   <ClientesList />
 * </PageLayout>
 * ```
 */
export function PageLayout({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
  maxWidth = 'full',
}: PageLayoutProps) {
  return (
    <div className={cn('flex min-h-full flex-col', className)}>
      <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', maxWidthClasses[maxWidth])}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-2 text-neutral-400 dark:text-neutral-600">/</span>
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="font-medium text-neutral-500 hover:text-primary dark:text-neutral-400 dark:hover:text-primary"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span
                      className="font-semibold text-neutral-900 dark:text-white"
                      aria-current="page"
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-base text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex shrink-0 items-center gap-3">
              {actions}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}

/**
 * Page content section component
 * Use to create distinct sections within a page
 */
export function PageSection({
  title,
  description,
  children,
  className,
  actions,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
