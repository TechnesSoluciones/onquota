import { SaleStatus } from '@/types/quote'

/**
 * Human-readable labels for sale statuses
 */
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  [SaleStatus.DRAFT]: 'Borrador',
  [SaleStatus.SENT]: 'Enviada',
  [SaleStatus.ACCEPTED]: 'Aceptada',
  [SaleStatus.REJECTED]: 'Rechazada',
  [SaleStatus.EXPIRED]: 'Expirada',
}

/**
 * Tailwind CSS classes for sale status badges
 */
export const SALE_STATUS_COLORS: Record<SaleStatus, string> = {
  [SaleStatus.DRAFT]: 'border-gray-500 text-gray-700 bg-gray-50',
  [SaleStatus.SENT]: 'border-blue-500 text-blue-700 bg-blue-50',
  [SaleStatus.ACCEPTED]: 'border-green-500 text-green-700 bg-green-50',
  [SaleStatus.REJECTED]: 'border-red-500 text-red-700 bg-red-50',
  [SaleStatus.EXPIRED]: 'border-orange-500 text-orange-700 bg-orange-50',
}

/**
 * Default currency for quotes
 */
export const DEFAULT_CURRENCY = 'USD'

/**
 * Available currencies for quotes
 */
export const CURRENCIES = [
  { value: 'USD', label: 'USD - Dólar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'DOP', label: 'DOP - Peso Dominicano' },
]
