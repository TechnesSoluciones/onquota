# Ejemplos de Uso - Hook useAuth

Documentación con ejemplos prácticos del hook `useAuth()` utilizado en las páginas de autenticación.

## API Reference

### Hook useAuth()

```typescript
const {
  // State
  user,              // Usuario autenticado | null
  isAuthenticated,   // boolean
  isLoading,         // boolean (durante peticiones)
  error,             // string | null (último error)

  // Methods
  login,             // (data: LoginRequest) => Promise<{ success: boolean; error?: string }>
  register,          // (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>
  logout,            // () => Promise<void>
  checkAuth,         // () => Promise<boolean>
  refreshUser,       // () => Promise<{ success: boolean; user?: UserResponse; error?: string }>
} = useAuth()
```

## Ejemplos Prácticos

### 1. Página de Login

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    // login() maneja automáticamente los errores
    // Si es exitoso, no hace nada (el AuthStore se actualiza)
    // Si falla, el error está disponible en el estado
    const result = await login(data)

    if (result.success) {
      // Redirigir al dashboard
      router.push('/dashboard')
    }
    // Si falla, el mensaje de error está en `error` y se muestra
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Error global */}
      {error && <div className="bg-red-50">{error}</div>}

      {/* Inputs */}
      <input {...register('email')} />
      <input {...register('password')} type="password" />

      {/* Button */}
      <button disabled={isLoading}>
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  )
}
```

### 2. Página de Registro

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser, isLoading, error } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    // Remover confirmPassword antes de enviar
    const { confirmPassword, ...registerData } = data

    const result = await registerUser(registerData)

    if (result.success) {
      router.push('/dashboard')
    }
    // El error se muestra en `error`
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ... form fields ... */}
      <button disabled={isLoading}>
        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
      </button>
    </form>
  )
}
```

### 3. Proteger Rutas - ProtectedRoute Component

```typescript
'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <div>Cargando...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

// Uso en página
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <h1>Dashboard</h1>
      {/* contenido */}
    </ProtectedRoute>
  )
}
```

### 4. Navbar con Logout

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAuth()

  if (!isAuthenticated) {
    return (
      <nav>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </nav>
    )
  }

  return (
    <nav>
      <span>Hola, {user?.full_name}</span>

      <button onClick={() => logout()} disabled={isLoading}>
        {isLoading ? 'Cerrando sesión...' : 'Logout'}
      </button>
    </nav>
  )
}
```

### 5. Verificar Autenticación en App

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'

export function AuthChecker() {
  const { checkAuth, isLoading } = useAuth()

  useEffect(() => {
    // Verificar si el usuario tiene un token válido
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return <div>Verificando autenticación...</div>
  }

  return null
}

// En layout principal
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthChecker />
        {children}
      </body>
    </html>
  )
}
```

### 6. Refrescar Datos del Usuario

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function UserProfile() {
  const { user, refreshUser, isLoading, error } = useAuth()

  const handleRefresh = async () => {
    const result = await refreshUser()

    if (result.success) {
      console.log('Usuario actualizado:', result.user)
    } else {
      console.error('Error al actualizar:', result.error)
    }
  }

  return (
    <div>
      <h1>{user?.full_name}</h1>
      <p>{user?.email}</p>

      {error && <div className="bg-red-50">{error}</div>}

      <Button onClick={handleRefresh} disabled={isLoading}>
        {isLoading ? 'Actualizando...' : 'Actualizar Perfil'}
      </Button>
    </div>
  )
}
```

### 7. Condicional Rendering por Rol

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types/auth'

interface RoleGuardProps {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { user } = useAuth()

  if (!user) {
    return fallback || <div>No autorizado</div>
  }

  if (!roles.includes(user.role)) {
    return fallback || <div>No tienes permisos</div>
  }

  return <>{children}</>
}

// Uso
export function AdminPanel() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <h1>Panel de Administración</h1>
    </RoleGuard>
  )
}
```

### 8. Hook Personalizado - useRequireAuth

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}

// Uso en componente
export function ProtectedComponent() {
  const { isAuthenticated } = useRequireAuth()

  if (!isAuthenticated) return null

  return <div>Solo usuarios autenticados ven esto</div>
}
```

### 9. Form con manejo de errores avanzado

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'

export function LoginForm() {
  const { login, isLoading, error: authError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    // Limpiar errores previos
    clearErrors()

    const result = await login(data)

    if (!result.success) {
      // Mostrar error global
      setError('root', {
        type: 'manual',
        message: result.error || 'Error desconocido',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Errores de validación */}
      {errors.email && <span>{errors.email.message}</span>}
      {errors.password && <span>{errors.password.message}</span>}

      {/* Error de autenticación */}
      {authError && <div className="bg-red-50">{authError}</div>}

      <input {...register('email')} />
      <input {...register('password')} type="password" />

      <button disabled={isLoading}>
        {isLoading ? 'Iniciando...' : 'Login'}
      </button>
    </form>
  )
}
```

### 10. Integration con Zustand Store

El hook `useAuth()` internamente usa Zustand para state management:

```typescript
// lib/store/authStore.ts
import { create } from 'zustand'
import type { UserResponse } from '@/types/auth'

interface AuthState {
  user: UserResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  accessToken: string | null
  refreshToken: string | null

  setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setUser: (user: UserResponse) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  accessToken: null,
  refreshToken: null,

  setAuth: (user, accessToken, refreshToken) =>
    set({
      user,
      isAuthenticated: true,
      accessToken,
      refreshToken,
    }),

  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setUser: (user) => set({ user }),
}))
```

Acceso directo al store:

```typescript
import { useAuthStore } from '@/store/authStore'

export function MyComponent() {
  const { user, isAuthenticated } = useAuthStore()

  return <div>{user?.full_name}</div>
}
```

## Patrones Comunes

### 1. Loading skeleton mientras se verifica auth

```typescript
const { isLoading } = useAuth()

if (isLoading) {
  return (
    <div className="animate-pulse">
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
  )
}
```

### 2. Mostrar diferentes UIs según auth status

```typescript
const { isAuthenticated } = useAuth()

if (isAuthenticated) {
  return <Dashboard />
} else {
  return <HomePage />
}
```

### 3. Auto-logout si token expiró

```typescript
useEffect(() => {
  if (error && error.includes('token')) {
    logout()
  }
}, [error])
```

## Type Safety

Todos los tipos están correctamente inferidos:

```typescript
// LoginRequest (del hook)
type LoginRequest = {
  email: string
  password: string
}

// RegisterRequest (del hook)
type RegisterRequest = {
  company_name: string
  domain?: string | null
  email: string
  password: string
  full_name: string
  phone?: string | null
}

// User (del hook)
type User = {
  id: string
  tenant_id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  is_verified: boolean
  last_login: string | null
  created_at: string
}
```

## Error Handling

El hook maneja automáticamente:
- Errores de validación
- Errores de API
- Errores de red
- Tokens inválidos/expirados

```typescript
const { error } = useAuth()

// Error está disponible globalmente
if (error) {
  // error es un string con el mensaje
}
```

## Performance Optimization

### Memoización
```typescript
const { isAuthenticated } = useAuth()

const memoizedComponent = useMemo(() => {
  if (!isAuthenticated) return null
  return <Dashboard />
}, [isAuthenticated])
```

### Evitar re-renders innecesarios
```typescript
// Usar el hook solo donde lo necesites
function SmallComponent() {
  const { user } = useAuth()
  return <span>{user?.full_name}</span>
}
```

## Debugging

```typescript
// En consola del navegador
const { user, isAuthenticated, isLoading } = useAuth()
console.log({ user, isAuthenticated, isLoading })

// O directamente desde el store
useAuthStore.subscribe((state) => {
  console.log('Auth state changed:', state)
})
```
