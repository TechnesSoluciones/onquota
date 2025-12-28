/**
 * Feature Flags System for Gradual Migration
 *
 * Controls which modules use the new v2 design system.
 * Set to `true` to enable new design for that module.
 *
 * @example
 * ```ts
 * import { FEATURE_FLAGS } from '@/lib/feature-flags'
 *
 * if (FEATURE_FLAGS.NEW_DESIGN.DASHBOARD) {
 *   return <DashboardV2 />
 * }
 * return <DashboardV1 />
 * ```
 */
export const FEATURE_FLAGS = {
  NEW_DESIGN: {
    // Authentication
    LOGIN: process.env.NEXT_PUBLIC_FF_LOGIN === 'true',
    REGISTER: process.env.NEXT_PUBLIC_FF_REGISTER === 'true',
    VERIFY_2FA: process.env.NEXT_PUBLIC_FF_VERIFY_2FA === 'true',

    // Core modules
    DASHBOARD: process.env.NEXT_PUBLIC_FF_DASHBOARD === 'true',
    CLIENTES: process.env.NEXT_PUBLIC_FF_CLIENTES === 'true',
    OPORTUNIDADES: process.env.NEXT_PUBLIC_FF_OPORTUNIDADES === 'true',

    // Sales module
    VENTAS: process.env.NEXT_PUBLIC_FF_VENTAS === 'true',
    COTIZACIONES: process.env.NEXT_PUBLIC_FF_COTIZACIONES === 'true',
    CONTROLES_VENTA: process.env.NEXT_PUBLIC_FF_CONTROLES_VENTA === 'true',
    LINEAS_PRODUCTO: process.env.NEXT_PUBLIC_FF_LINEAS_PRODUCTO === 'true',
    CUOTAS: process.env.NEXT_PUBLIC_FF_CUOTAS === 'true',

    // Other modules
    VISITAS: process.env.NEXT_PUBLIC_FF_VISITAS === 'true',
    GASTOS: process.env.NEXT_PUBLIC_FF_GASTOS === 'true',
    OCR: process.env.NEXT_PUBLIC_FF_OCR === 'true',
    SPA: process.env.NEXT_PUBLIC_FF_SPA === 'true',
    ANALYTICS: process.env.NEXT_PUBLIC_FF_ANALYTICS === 'true',
    ACCOUNTS: process.env.NEXT_PUBLIC_FF_ACCOUNTS === 'true',
    REPORTES: process.env.NEXT_PUBLIC_FF_REPORTES === 'true',
    ALERTAS: process.env.NEXT_PUBLIC_FF_ALERTAS === 'true',
    NOTIFICACIONES: process.env.NEXT_PUBLIC_FF_NOTIFICACIONES === 'true',
    COMPROMISOS: process.env.NEXT_PUBLIC_FF_COMPROMISOS === 'true',

    // Settings
    SETTINGS: process.env.NEXT_PUBLIC_FF_SETTINGS === 'true',
  },
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS.NEW_DESIGN

/**
 * Hook to check if a feature flag is enabled
 *
 * @example
 * ```tsx
 * const isDashboardV2 = useFeatureFlag('DASHBOARD')
 * ```
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS.NEW_DESIGN[flag]
}

/**
 * Get all enabled feature flags
 */
export function getEnabledFlags(): FeatureFlag[] {
  return Object.entries(FEATURE_FLAGS.NEW_DESIGN)
    .filter(([_, enabled]) => enabled)
    .map(([flag]) => flag as FeatureFlag)
}

/**
 * Check if any feature flags are enabled
 */
export function hasAnyFlagEnabled(): boolean {
  return Object.values(FEATURE_FLAGS.NEW_DESIGN).some((enabled) => enabled)
}
