'use client'

/**
 * UserMenu Component
 * Dropdown menu with user info, role badge, and actions
 * Integrates with useAuth hook for authentication management
 */

import { useAuth } from '@/hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Settings, LogOut, Shield } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { UserRole } from '@/types/auth'

/**
 * Role labels for display
 * Synced with: backend UserRole enum
 */
const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.SALES_REP]: 'Representante de Ventas',
  [UserRole.SUPERVISOR]: 'Supervisor',
  [UserRole.ANALYST]: 'Analista',
}

/**
 * Role badge colors for visual distinction
 */
const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-purple-100 text-purple-800',
  [UserRole.SALES_REP]: 'bg-blue-100 text-blue-800',
  [UserRole.SUPERVISOR]: 'bg-green-100 text-green-800',
  [UserRole.ANALYST]: 'bg-orange-100 text-orange-800',
}

export default function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  const initials = getInitials(user.full_name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="outline-none">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
            <AvatarFallback className="bg-blue-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">
              {user.full_name}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <svg
            className="w-4 h-4 text-gray-500 hidden sm:block"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* User Info Section */}
        <DropdownMenuLabel>
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-gray-900">{user.full_name}</p>
              <p className="text-sm text-gray-500 font-normal">{user.email}</p>
            </div>
            <Badge
              className={`${ROLE_COLORS[user.role]} border-0 text-xs font-medium`}
              variant="secondary"
            >
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Profile Menu Item */}
        <DropdownMenuItem
          className="cursor-pointer"
          asChild
        >
          <a href="/dashboard/profile" className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            <span>Mi Perfil</span>
          </a>
        </DropdownMenuItem>

        {/* Settings Menu Item */}
        <DropdownMenuItem
          className="cursor-pointer"
          asChild
        >
          <a href="/dashboard/settings" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            <span>Configuración</span>
          </a>
        </DropdownMenuItem>

        {/* Admin Panel - Only for Admins */}
        {user.role === UserRole.ADMIN && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              asChild
            >
              <a href="/admin" className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                <span>Administración</span>
              </a>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Logout Menu Item */}
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
