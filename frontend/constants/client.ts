import { ClientStatus, ClientType, Industry } from '@/types/client'

/**
 * Client Status Labels (Spanish)
 */
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  [ClientStatus.LEAD]: 'Lead',
  [ClientStatus.PROSPECT]: 'Prospecto',
  [ClientStatus.ACTIVE]: 'Activo',
  [ClientStatus.INACTIVE]: 'Inactivo',
  [ClientStatus.LOST]: 'Perdido',
}

/**
 * Client Status Colors (for badges)
 */
export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  [ClientStatus.LEAD]: 'border-blue-500 text-blue-700 bg-blue-50',
  [ClientStatus.PROSPECT]: 'border-purple-500 text-purple-700 bg-purple-50',
  [ClientStatus.ACTIVE]: 'border-green-500 text-green-700 bg-green-50',
  [ClientStatus.INACTIVE]: 'border-gray-500 text-gray-700 bg-gray-50',
  [ClientStatus.LOST]: 'border-red-500 text-red-700 bg-red-50',
}

/**
 * Client Type Labels (Spanish)
 */
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  [ClientType.INDIVIDUAL]: 'Individual',
  [ClientType.COMPANY]: 'Empresa',
}

/**
 * Industry Labels (Spanish)
 */
export const INDUSTRY_LABELS: Record<Industry, string> = {
  [Industry.TECHNOLOGY]: 'Tecnología',
  [Industry.FINANCE]: 'Finanzas',
  [Industry.HEALTHCARE]: 'Salud',
  [Industry.RETAIL]: 'Retail',
  [Industry.MANUFACTURING]: 'Manufactura',
  [Industry.EDUCATION]: 'Educación',
  [Industry.REAL_ESTATE]: 'Bienes Raíces',
  [Industry.HOSPITALITY]: 'Hospitalidad',
  [Industry.TRANSPORTATION]: 'Transporte',
  [Industry.AGRICULTURE]: 'Agricultura',
  [Industry.CONSTRUCTION]: 'Construcción',
  [Industry.ENTERTAINMENT]: 'Entretenimiento',
  [Industry.CONSULTING]: 'Consultoría',
  [Industry.OTHER]: 'Otro',
}

/**
 * Lead Sources
 */
export const LEAD_SOURCES = [
  'Website',
  'Referencia',
  'Redes Sociales',
  'Email Marketing',
  'Publicidad',
  'Evento',
  'Llamada en Frío',
  'Partner',
  'Otro',
] as const

/**
 * Preferred Languages
 */
export const PREFERRED_LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
] as const

/**
 * Preferred Currencies
 */
export const PREFERRED_CURRENCIES = [
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'USD', label: 'USD - Dólar Americano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'BRL', label: 'BRL - Real Brasileño' },
] as const
