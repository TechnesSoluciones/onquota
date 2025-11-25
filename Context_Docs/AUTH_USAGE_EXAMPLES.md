# useAuth Hook - Usage Examples

Ejemplos prácticos de cómo usar el hook `useAuth` en diferentes escenarios.

## 1. Página de Login

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  // Hook proporciona: user, isAuthenticated, isLoading, error, login, logout, checkAuth, refreshUser, clearError
  const { login, isLoading, error, clearError } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    // login() automáticamente redirige a /dashboard si es exitoso
    // error state se actualiza si falla
    await login(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Error global del hook */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Campos del formulario */}
      <input {...register('email')} />
      <input {...register('password')} type="password" />

      {/* Botón con loading state */}
      <button disabled={isLoading}>
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  )
}
```

## 2. Página de Registro

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
  const { register, isLoading, error } = useAuth()

  const { register: formRegister, handleSubmit } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    // register() automáticamente redirige a /dashboard si es exitoso
    const result = await register(data)
    if (!result.success) {
      // error state ya contiene el mensaje
      console.log('Error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Error handling */}
      {error && <ErrorAlert message={error} />}

      {/* Campos de registro */}
      <input {...formRegister('email')} placeholder="email@example.com" />
      <input {...formRegister('password')} type="password" />
      <input {...formRegister('full_name')} placeholder="Tu nombre" />
      <input {...formRegister('company_name')} placeholder="Nombre empresa" />

      <button disabled={isLoading}>
        {isLoading ? 'Registrando...' : 'Crear Cuenta'}
      </button>
    </form>
  )
}
```

## 3. Componente UserMenu (Logout)

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'

export function UserMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  if (!isAuthenticated) return null

  const handleLogout = async () => {
    // logout() automáticamente:
    // 1. Llama API de logout
    // 2. Limpia auth state
    // 3. Redirige a /login
    await logout()
  }

  return (
    <div className="flex items-center gap-4">
      {/* Mostrar info del usuario */}
      {user && (
        <>
          <img src={user.avatar_url} alt={user.full_name} />
          <span>{user.full_name}</span>
          <span className="text-sm text-gray-600">{user.email}</span>
        </>
      )}

      {/* Botón de logout */}
      <button onClick={handleLogout} disabled={isLoading}>
        {isLoading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
      </button>
    </div>
  )
}
```

## 4. Root Layout - Inicializar Autenticación

```typescript
'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function RootLayout({ children }) {
  // checkAuth() verifica que el usuario tenga sesión válida
  const { checkAuth, isLoading } = useAuth()

  useEffect(() => {
    // Ejecutar al montar el componente
    checkAuth()
  }, [])

  // Mostrar loader mientras se verifica autenticación
  if (isLoading) {
    return (
      <html>
        <body>
          <div className="flex items-center justify-center h-screen">
            <div className="spinner" />
            <span>Cargando...</span>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

## 5. Componente Protegido - Requiere Autenticación

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function ProtectedComponent() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    // Si no está autenticado y cargó, redirigir a login
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading])

  // Mientras carga, mostrar spinner
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Si no está autenticado, no mostrar nada (redirigirá)
  if (!isAuthenticated) {
    return null
  }

  // Si llegó aquí, usuario está autenticado
  return (
    <div>
      <h1>Bienvenido, {user?.full_name}</h1>
      <Dashboard user={user} />
    </div>
  )
}
```

## 6. Actualizar Datos del Usuario

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'

export function ProfileUpdateForm() {
  const { user, refreshUser, isLoading } = useAuth()

  const handleUpdateProfile = async (formData) => {
    try {
      // 1. Actualizar en backend
      const response = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        // 2. Refrescar datos del usuario desde API
        const result = await refreshUser()

        if (result.success) {
          // user state se actualizó automáticamente
          console.log('Perfil actualizado:', result.user)
          toast.success('Perfil actualizado correctamente')
        }
      }
    } catch (error) {
      toast.error('Error al actualizar perfil')
    }
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      await handleUpdateProfile(new FormData(e.currentTarget))
    }}>
      <input
        defaultValue={user?.full_name}
        name="full_name"
        placeholder="Tu nombre"
      />
      <input
        defaultValue={user?.phone}
        name="phone"
        placeholder="Tu teléfono"
      />
      <button disabled={isLoading}>
        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </form>
  )
}
```

## 7. Verificar Autenticación en Middleware

```typescript
// middleware.ts o similar

import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/api/client'

export function middleware(request: NextRequest) {
  // Rutas protegidas
  const protectedRoutes = ['/dashboard', '/settings', '/profile']

  const token = getAuthToken()
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Si intenta acceder ruta protegida sin token, redirigir a login
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si está en login/register y tiene token, redirigir a dashboard
  if ((request.nextUrl.pathname.startsWith('/login') ||
       request.nextUrl.pathname.startsWith('/register')) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## 8. Manejo Avanzado de Errores

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function LoginWithErrorHandling() {
  const { login, isLoading, error, clearError } = useAuth()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleLogin = async (email: string, password: string) => {
    // Limpiar errores previos
    clearError()
    setValidationErrors({})

    // Validación local
    if (!email || !password) {
      setValidationErrors({
        email: !email ? 'Email requerido' : '',
        password: !password ? 'Contraseña requerida' : '',
      })
      return
    }

    // Llamar login
    const result = await login({ email, password })

    if (!result.success) {
      // error state ya tiene el mensaje del servidor
      // Mostrar en toast o UI
      console.error('Login falló:', error)
    }
    // Si success, usuario fue redirigido automáticamente
  }

  return (
    <>
      {/* Error global del servidor */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error al iniciar sesión</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <button onClick={clearError}>Descartar</button>
        </Alert>
      )}

      {/* Errores de validación local */}
      {validationErrors.email && (
        <p className="text-red-500 text-sm">{validationErrors.email}</p>
      )}
      {validationErrors.password && (
        <p className="text-red-500 text-sm">{validationErrors.password}</p>
      )}

      <form onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        handleLogin(
          formData.get('email') as string,
          formData.get('password') as string
        )
      }}>
        <input name="email" type="email" />
        <input name="password" type="password" />
        <button disabled={isLoading}>
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>
    </>
  )
}
```

## 9. Context Provider para useAuth (Opcional)

Si necesitas usar el mismo `useAuth` state en múltiples componentes sin props drilling:

```typescript
'use client'

import { createContext, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  }
  return context
}
```

Uso:

```typescript
export default function App({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

// En cualquier componente:
function MyComponent() {
  const { user, isAuthenticated } = useAuthContext()
  return <div>{user?.email}</div>
}
```

## 10. Tipos TypeScript Disponibles

```typescript
import type { UserResponse, LoginRequest, RegisterRequest } from '@/types/auth'
import type { useAuth } from '@/hooks/useAuth'

// Tipo de retorno del hook
type UseAuth = ReturnType<typeof useAuth>

// Tipos de datos
interface User extends UserResponse {
  id: string
  email: string
  full_name: string
  role: UserRole
  // ... más campos
}

// Hacer login type-safe
const loginData: LoginRequest = {
  email: 'user@example.com',
  password: 'secure123',
}

const registerData: RegisterRequest = {
  email: 'user@example.com',
  password: 'secure123',
  full_name: 'John Doe',
  company_name: 'My Company',
  phone: '123456789', // opcional
}
```

## Resumen de APIs Disponibles

| Método | Parámetros | Retorna | Redirect |
|--------|-----------|---------|----------|
| `login()` | `LoginRequest` | `{ success, error? }` | `/dashboard` |
| `register()` | `RegisterRequest` | `{ success, error? }` | `/dashboard` |
| `logout()` | ninguno | Promise<void> | `/login` |
| `checkAuth()` | ninguno | Promise<boolean> | ninguno |
| `refreshUser()` | ninguno | `{ success, user?, error? }` | ninguno |
| `clearError()` | ninguno | void | N/A |

## State Disponible

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `user` | `UserResponse \| null` | Usuario autenticado actual |
| `isAuthenticated` | `boolean` | Si el usuario está autenticado |
| `isLoading` | `boolean` | Si hay operación en curso |
| `error` | `string \| null` | Último mensaje de error |

## Best Practices

1. **Usa `checkAuth()` en el root layout** para verificar sesión al iniciar app
2. **No guardes tokens en state** - déjalos en API client
3. **Usa `clearError()` antes de nuevas operaciones** para limpiar UI
4. **Maneja tanto `error` del hook como errores locales** de validación
5. **Usa error boundaries** alrededor de componentes que usan `useAuth`
6. **No llames a `useAuth()` en múltiples componentes** innecesariamente - usa Context si necesitas compartir
7. **Verifica `isLoading` antes de mostrar datos** - puede ser null durante carga inicial
8. **Usa TypeScript** para type-safety en formularios de login/registro
