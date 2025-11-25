# Ejemplos de Uso - Sistema de Autenticación

## Tabla de Contenidos
1. [Componentes Protegidos](#componentes-protegidos)
2. [Rutas Protegidas](#rutas-protegidas)
3. [Validación de Roles](#validación-de-roles)
4. [Formularios de Autenticación](#formularios-de-autenticación)
5. [Ganchos Personalizados](#ganchos-personalizados)
6. [Context API](#context-api)

---

## Componentes Protegidos

### Componente Simple Protegido

```typescript
// components/DashboardCard.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'

export function DashboardCard() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Cargando...</div>
  }

  if (!user) {
    return <div>No autenticado</div>
  }

  return (
    <div>
      <h2>Bienvenido, {user.full_name}</h2>
      <p>Email: {user.email}</p>
      <p>Rol: {user.role}</p>
    </div>
  )
}
```

### Componente con Control de Rol

```typescript
// components/AdminPanel.tsx
'use client'

import { useRole } from '@/hooks/useRole'

export function AdminPanel() {
  const { isAdmin, currentRole } = useRole()

  if (!isAdmin()) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        Acceso denegado. Tu rol actual es: {currentRole}
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-100">
      <h2>Panel Administrativo</h2>
      {/* Contenido del panel admin */}
    </div>
  )
}
```

### Componente con Múltiples Roles

```typescript
// components/ApprovalForm.tsx
'use client'

import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types/auth'

export function ApprovalForm() {
  const { hasRole } = useRole()

  // Solo admins y supervisores pueden aprobar
  if (!hasRole([UserRole.ADMIN, UserRole.SUPERVISOR])) {
    return <div>No tienes permisos para aprobar</div>
  }

  return (
    <form>
      <h2>Formulario de Aprobación</h2>
      {/* Formulario */}
    </form>
  )
}
```

---

## Rutas Protegidas

### Ruta Básica Protegida

```typescript
// app/(dashboard)/profile/page.tsx
'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Profile } from '@/components/Profile'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  )
}
```

### Ruta con Validación de Rol

```typescript
// app/(dashboard)/admin/users/page.tsx
'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { UserRole } from '@/types/auth'
import { UserManagement } from '@/components/admin/UserManagement'

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requireRoles={[UserRole.ADMIN]}>
      <UserManagement />
    </ProtectedRoute>
  )
}
```

### Ruta con Múltiples Roles

```typescript
// app/(dashboard)/analytics/page.tsx
'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { UserRole } from '@/types/auth'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'

export default function AnalyticsPage() {
  return (
    <ProtectedRoute
      requireRoles={[
        UserRole.ADMIN,
        UserRole.SUPERVISOR,
        UserRole.ANALYST,
      ]}
    >
      <AnalyticsDashboard />
    </ProtectedRoute>
  )
}
```

### Ruta Sin Autenticación (Login/Register)

```typescript
// app/(auth)/login/page.tsx
'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { LoginForm } from '@/components/forms/LoginForm'

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <LoginForm />
    </ProtectedRoute>
  )
}
```

### Ruta con Loading Personalizado

```typescript
// app/(dashboard)/settings/page.tsx
'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Settings } from '@/components/Settings'

const LoadingComponent = (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin mb-4">⏳</div>
      <p>Cargando configuración...</p>
    </div>
  </div>
)

export default function SettingsPage() {
  return (
    <ProtectedRoute loadingComponent={LoadingComponent}>
      <Settings />
    </ProtectedRoute>
  )
}
```

---

## Validación de Roles

### Verificar Rol Único

```typescript
// components/features/ExpenseApproval.tsx
'use client'

import { useRole } from '@/hooks/useRole'

export function ExpenseApproval() {
  const { isSupervisor } = useRole()

  return (
    <div>
      {isSupervisor() ? (
        <button>Aprobar Gasto</button>
      ) : (
        <p>Solo supervisores pueden aprobar gastos</p>
      )}
    </div>
  )
}
```

### Verificar Múltiples Roles

```typescript
// components/features/ReportAccess.tsx
'use client'

import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types/auth'

export function ReportAccess() {
  const { hasRole } = useRole()

  const canViewReports = hasRole([
    UserRole.ADMIN,
    UserRole.ANALYST,
  ])

  return (
    <div>
      {canViewReports ? (
        <a href="/reports">Ver Reportes</a>
      ) : (
        <p>No tienes acceso a reportes</p>
      )}
    </div>
  )
}
```

### Mostrar Información Basada en Rol

```typescript
// components/UserInfo.tsx
'use client'

import { useRole } from '@/hooks/useRole'

export function UserInfo() {
  const { isAdmin, isAnalyst, currentRole, canViewAnalytics } = useRole()

  return (
    <div className="p-4 border rounded">
      <h3>Tu Información</h3>
      <p>Rol: {currentRole}</p>

      <div className="mt-4 space-y-2">
        {isAdmin() && (
          <div className="text-green-600">
            Tienes permisos de administrador
          </div>
        )}
        {isAnalyst() && (
          <div className="text-blue-600">
            Tienes acceso a análisis detallado
          </div>
        )}
        {canViewAnalytics() && (
          <div className="text-purple-600">
            Puedes ver analytics
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Formularios de Autenticación

### Formulario de Login

```typescript
// components/forms/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoginRequest } from '@/types/auth'

export function LoginForm() {
  const { login, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await login({
      email,
      password,
    } as LoginRequest)

    if (!result.success) {
      console.error('Login failed:', result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  )
}
```

### Formulario de Registro

```typescript
// components/forms/RegisterForm.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { RegisterRequest } from '@/types/auth'

export function RegisterForm() {
  const { register, isLoading, error } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    full_name: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await register(formData as RegisterRequest)

    if (!result.success) {
      console.error('Register failed:', result.error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="company_name">Nombre de la Empresa</label>
        <input
          id="company_name"
          name="company_name"
          value={formData.company_name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="full_name">Nombre Completo</label>
        <input
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Registrando...' : 'Registrarse'}
      </button>
    </form>
  )
}
```

---

## Ganchos Personalizados

### Hook para Validación de Sesión

```typescript
// hooks/useSessionCheck.ts
'use client'

import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { useRouter } from 'next/navigation'

export function useSessionCheck() {
  const { isAuthenticated, checkAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      const isValid = await checkAuth()
      if (!isValid) {
        router.push('/login')
      }
    }, 5 * 60 * 1000) // Verificar cada 5 minutos

    return () => clearInterval(interval)
  }, [checkAuth, router])

  return { isAuthenticated }
}
```

### Hook para Permisos Específicos

```typescript
// hooks/usePermission.ts
'use client'

import { useRole } from './useRole'
import { UserRole } from '@/types/auth'

interface UsePermissionOptions {
  requireAdmin?: boolean
  requireRoles?: UserRole[]
}

export function usePermission(options: UsePermissionOptions = {}) {
  const { isAdmin, hasRole } = useRole()

  if (options.requireAdmin) {
    return isAdmin()
  }

  if (options.requireRoles) {
    return hasRole(options.requireRoles)
  }

  return true
}
```

---

## Context API

### Acceder a Autenticación desde Cualquier Lugar

```typescript
// components/Header.tsx
'use client'

import { useAuthContext } from '@/contexts/AuthContext'

export function Header() {
  const { user, logout, isAuthenticated } = useAuthContext()

  if (!isAuthenticated) {
    return (
      <header>
        <a href="/login">Iniciar Sesión</a>
      </header>
    )
  }

  return (
    <header>
      <div>
        <span>Bienvenido, {user?.full_name}</span>
        <button onClick={logout}>Cerrar Sesión</button>
      </div>
    </header>
  )
}
```

### Componente con Error Handling

```typescript
// components/ProtectedContent.tsx
'use client'

import { useAuthContext } from '@/contexts/AuthContext'

export function ProtectedContent() {
  const { user, isLoading, error, clearError } = useAuthContext()

  if (isLoading) {
    return <div>Cargando...</div>
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <button onClick={clearError}>Descartar Error</button>
      </div>
    )
  }

  return (
    <div>
      <h1>Contenido Protegido</h1>
      <p>Usuario: {user?.email}</p>
    </div>
  )
}
```

---

## Patrones Avanzados

### Componente con Fallback

```typescript
// components/ConditionalContent.tsx
'use client'

import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types/auth'

interface ConditionalContentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireRoles?: UserRole[]
}

export function ConditionalContent({
  children,
  fallback,
  requireRoles,
}: ConditionalContentProps) {
  const { hasRole } = useRole()

  if (requireRoles && !hasRole(requireRoles)) {
    return fallback || <div>Acceso denegado</div>
  }

  return <>{children}</>
}

// Uso:
// <ConditionalContent requireRoles={[UserRole.ADMIN]}>
//   <AdminSection />
// </ConditionalContent>
```

### Hook para Logout Automático

```typescript
// hooks/useAutoLogout.ts
'use client'

import { useEffect } from 'react'
import { useAuth } from './useAuth'

const TIMEOUT_MINUTES = 30

export function useAutoLogout() {
  const { logout } = useAuth()

  useEffect(() => {
    let logoutTimer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(logoutTimer)
      logoutTimer = setTimeout(() => {
        logout()
      }, TIMEOUT_MINUTES * 60 * 1000)
    }

    // Escuchar actividad del usuario
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('keydown', resetTimer)

    resetTimer()

    return () => {
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      clearTimeout(logoutTimer)
    }
  }, [logout])
}
```

---

## Testeo

### Test de Componente Protegido

```typescript
// __tests__/AdminPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { AdminPanel } from '@/components/AdminPanel'
import * as authHooks from '@/hooks/useRole'

describe('AdminPanel', () => {
  it('should show access denied for non-admin users', () => {
    jest.spyOn(authHooks, 'useRole').mockReturnValue({
      isAdmin: () => false,
      isSalesRep: () => true,
      currentRole: 'sales_rep',
      // ... otros métodos
    } as any)

    render(<AdminPanel />)
    expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument()
  })

  it('should show admin content for admin users', () => {
    jest.spyOn(authHooks, 'useRole').mockReturnValue({
      isAdmin: () => true,
      currentRole: 'admin',
      // ... otros métodos
    } as any)

    render(<AdminPanel />)
    expect(screen.getByText(/panel administrativo/i)).toBeInTheDocument()
  })
})
```

---

## Conclusión

Este sistema proporciona:
- Autenticación robusta en múltiples niveles
- Control granular de acceso basado en roles
- Type-safety con TypeScript
- Fácil de usar y extensible
- Patrones reutilizables
