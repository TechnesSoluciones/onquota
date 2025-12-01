'use client'

/**
 * Sidebar Component
 * Fixed navigation sidebar with active route indicators
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  Users,
  TrendingUp,
  Settings,
  ChevronDown,
  Target,
  Bell,
  MapPin,
  AlertTriangle,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: Array<{
    name: string
    href: string
  }>
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Alertas',
    href: '/alerts',
    icon: AlertTriangle,
  },
  {
    name: 'Oportunidades',
    href: '/opportunities',
    icon: Target,
  },
  {
    name: 'Gastos',
    href: '/expenses',
    icon: Receipt,
    children: [
      { name: 'Nuevo Gasto', href: '/expenses/new' },
      { name: 'Histórico', href: '/expenses' },
      { name: 'Comparación Mensual', href: '/expenses/comparison' },
    ],
  },
  {
    name: 'Clientes',
    href: '/clients',
    icon: Users,
    children: [
      { name: 'Listado de Clientes', href: '/clients' },
      { name: 'Registrar Nuevo Cliente', href: '/clients/new' },
    ],
  },
  {
    name: 'Visitas',
    href: '/visits',
    icon: MapPin,
    children: [
      { name: 'Listado de Visitas', href: '/visits' },
      { name: 'Nueva Visita', href: '/visits/new' },
    ],
  },
  {
    name: 'Compromisos',
    href: '/commitments',
    icon: CheckCircle2,
  },
  {
    name: 'Ventas',
    href: '/sales',
    icon: TrendingUp,
    children: [
      { name: 'Dashboard de Cuotas', href: '/sales/quotas' },
      { name: 'Cotizaciones', href: '/sales/quotations' },
      { name: 'Controles de Venta', href: '/sales/controls' },
      { name: 'Líneas de Producto', href: '/sales/product-lines' },
    ],
  },
  {
    name: 'SPAs',
    href: '/spa',
    icon: FileText,
    children: [
      { name: 'Listado de SPAs', href: '/spa' },
      { name: 'Cargar archivo', href: '/spa/upload' },
    ],
  },
  {
    name: 'Notificaciones',
    href: '/notifications',
    icon: Bell,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  /**
   * Determine if route is active
   * Checks exact match and prefix match for nested routes
   */
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  /**
   * Toggle submenu expansion
   */
  const toggleExpanded = (name: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
  }

  /**
   * Check if item or any child is active
   */
  const isItemOrChildActive = (item: NavItem): boolean => {
    if (isActive(item.href)) {
      return true
    }
    if (item.children) {
      return item.children.some(child => isActive(child.href))
    }
    return false
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <h1 className="text-2xl font-bold">OnQuota</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const itemOrChildActive = isItemOrChildActive(item)
          const isExpanded = expandedItems[item.name] || itemOrChildActive
          const hasChildren = item.children && item.children.length > 0

          return (
            <div key={item.name}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
                    itemOrChildActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
                    active
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && isExpanded && (
                <div className="ml-4 space-y-1 mt-1 border-l border-slate-700 py-1 pl-3">
                  {item.children?.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-200',
                        isActive(child.href)
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      )}
                    >
                      <span>{child.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Settings Footer */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
            isActive('/settings')
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span>Configuración</span>
        </Link>
      </div>
    </div>
  )
}
