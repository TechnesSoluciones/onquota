/**
 * Authentication Layout V2
 * Provides a centered, clean design for login and registration pages
 * Updated with Design System V2 - Orange primary color and Material Icons
 */

import { Icon } from '@/components/icons'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-12 text-white flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">OQ</span>
            </div>
            <span className="text-2xl font-bold">OnQuota</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Gestiona tus cuotas de ventas de forma inteligente
          </h1>
          <p className="text-xl text-primary-100 opacity-90">
            Seguimiento en tiempo real, análisis predictivo y gestión eficiente
            de tu equipo de ventas.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="dashboard" size="lg" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Dashboard en Tiempo Real</h3>
              <p className="text-white/80 text-sm">
                Visualiza el progreso de tu equipo al instante
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="insights" size="lg" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Análisis Predictivo</h3>
              <p className="text-white/80 text-sm">
                Predice resultados con IA y toma decisiones informadas
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="group" size="lg" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Gestión de Equipo</h3>
              <p className="text-white/80 text-sm">
                Administra roles, permisos y rendimiento
              </p>
            </div>
          </div>
        </div>

        <div className="text-sm text-white/60">
          © 2024 OnQuota. Todos los derechos reservados.
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-light dark:bg-dark">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">OQ</span>
            </div>
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">OnQuota</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
