import * as React from 'react'
import { PageLayout, type BreadcrumbItem } from './page-layout'
import { Button } from '@/components/ui-v2'
import { cn } from '@/lib/utils/cn'

export interface FormLayoutProps {
  /** Page title */
  title: string
  /** Optional page description */
  description?: string
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[]
  /** Form submission handler */
  onSubmit: (e: React.FormEvent) => void
  /** Cancel handler */
  onCancel?: () => void
  /** Submit button label */
  submitLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Loading state */
  isLoading?: boolean
  /** Main form content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Max width for form */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

const maxWidthClasses = {
  sm: 'max-w-xl',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}

/**
 * Layout for form pages with automatic footer actions
 *
 * @example
 * ```tsx
 * <FormLayout
 *   title="Nuevo Cliente"
 *   description="Completa la información del cliente"
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Clientes', href: '/clientes' },
 *     { label: 'Nuevo' }
 *   ]}
 *   onSubmit={handleSubmit}
 *   onCancel={() => router.back()}
 *   isLoading={isCreating}
 * >
 *   <ClienteForm />
 * </FormLayout>
 * ```
 */
export function FormLayout({
  title,
  description,
  breadcrumbs,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  isLoading,
  children,
  className,
  maxWidth = 'lg',
}: FormLayoutProps) {
  return (
    <PageLayout title={title} description={description} breadcrumbs={breadcrumbs}>
      <form onSubmit={onSubmit} className={cn('mx-auto space-y-6', maxWidthClasses[maxWidth], className)}>
        {/* Form Content */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-surface-dark">
          {children}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-surface-dark">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" isLoading={isLoading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </PageLayout>
  )
}

/**
 * Form section component for grouping related fields
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  )
}

/**
 * Form field wrapper component
 */
export function FormField({
  label,
  required,
  error,
  helperText,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  helperText?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-neutral-900 dark:text-white">
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
      )}
    </div>
  )
}
