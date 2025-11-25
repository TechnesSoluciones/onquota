# Implementación de Autenticación y Rutas Protegidas

## Resumen

Se ha implementado un sistema completo de autenticación para Next.js (App Router) que incluye:

1. **Middleware de Next.js** - Protección a nivel de servidor
2. **AuthProvider Context** - Proveedor global de estado de autenticación
3. **ProtectedRoute Component** - Protección de rutas a nivel de cliente
4. **useRole Hook** - Control de acceso basado en roles (RBAC)
5. **useAuth Hook** - Hook de autenticación (existente, mejorado)

## Archivos Implementados

### 1. Middleware (`/middleware.ts`)
**Estado**: Ya existía, optimizado para el sistema actual

Características:
- Protege rutas `/dashboard`, `/settings`, `/profile`, `/analytics`
- Solo permite acceso a `/login` y `/register` sin autenticación
- Redirige tokens al dashboard automáticamente
- Matcher configurado para excluir archivos estáticos

```typescript
// Ejemplo de uso
const PROTECTED_ROUTES = ['/dashboard', '/settings', '/profile', '/analytics']
const AUTH_ROUTES = ['/login', '/register']
```

### 2. AuthProvider Context (`/contexts/AuthContext.tsx`)
**Estado**: Nuevo

Proporciona estado de autenticación global a toda la aplicación.

Características:
- Envuelve toda la aplicación para acceso global al estado
- Inicializa autenticación al montar
- Lazy-loads children hasta que se inicializa auth
- Type-safe con TypeScript

Uso:
```typescript
import { useAuthContext } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthContext()
  // ...
}
```

### 3. useRole Hook (`/hooks/useRole.ts`)
**Estado**: Nuevo

Control de acceso basado en roles (RBAC) simplificado.

Métodos disponibles:
- `hasRole(roles)` - Verifica si el usuario tiene uno o más roles
- `isAdmin()` - Es administrador
- `isSalesRep()` - Es representante de ventas
- `isSupervisor()` - Es supervisor
- `isAnalyst()` - Es analista
- `canApproveExpenses()` - Puede aprobar gastos (admin o supervisor)
- `canViewAnalytics()` - Puede ver análisis (admin, supervisor o analista)
- `canManageUsers()` - Puede gestionar usuarios (solo admin)
- `currentRole` - El rol actual del usuario

Uso:
```typescript
import { useRole } from '@/hooks/useRole'

function AdminPanel() {
  const { isAdmin, canViewAnalytics } = useRole()

  if (!isAdmin()) {
    return <div>No tienes acceso</div>
  }

  return <div>Panel Admin</div>
}
```

### 4. ProtectedRoute Component (`/components/auth/ProtectedRoute.tsx`)
**Estado**: Existente, mejorado con soporte para roles

Protección de rutas a nivel de cliente.

Características:
- Verifica autenticación antes de renderizar
- Soporte para validación de roles
- Redirecciones automáticas
- Loading state personalizable
- Client-side protection para capas adicionales de seguridad

Props:
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean           // true por defecto
  requireRoles?: UserRole[]       // Roles requeridos
  redirectTo?: string             // '/login' por defecto
  unauthorizedRedirectTo?: string // '/dashboard' por defecto
  loadingComponent?: React.ReactNode
}
```

Uso:
```typescript
// Rutas solo autenticadas
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Rutas con validación de rol
<ProtectedRoute requireRoles={[UserRole.ADMIN, UserRole.SUPERVISOR]}>
  <AnalyticsPanel />
</ProtectedRoute>

// Rutas no autenticadas (login/register)
<ProtectedRoute requireAuth={false}>
  <LoginForm />
</ProtectedRoute>
```

### 5. useAuth Hook (`/hooks/useAuth.ts`)
**Estado**: Existente, sin cambios

Hook principal de autenticación que proporciona:
- `user` - Datos del usuario autenticado
- `isAuthenticated` - Estado de autenticación
- `isLoading` - Estado de carga
- `error` - Mensaje de error
- `login(data)` - Login con email y contraseña
- `register(data)` - Registro de nuevo usuario
- `logout()` - Cierre de sesión
- `checkAuth()` - Verificar autenticación actual
- `refreshUser()` - Actualizar datos del usuario
- `clearError()` - Limpiar mensajes de error

### 6. RootLayout Actualizado (`/app/layout.tsx`)
**Estado**: Actualizado

Cambios:
- Agregado `AuthProvider` para envolver toda la aplicación
- Agregado `Toaster` para notificaciones
- Permite acceso global al estado de autenticación

```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 7. Dashboard Layout (`/app/(dashboard)/layout.tsx`)
**Estado**: Ya utiliza ProtectedRoute

El layout ya estaba usando `ProtectedRoute` para proteger todas las páginas del dashboard.

## Flujo de Autenticación

### 1. Nuevo Usuario (Registro)
```
RegisterForm (sin auth)
  ↓
useAuth.register() → API /register
  ↓
Token guardado en localStorage
  ↓
AuthStore actualizado
  ↓
Redirect a /dashboard
  ↓
ProtectedRoute verifica auth ✓
  ↓
Dashboard renderizado
```

### 2. Usuario Existente (Login)
```
LoginForm (sin auth)
  ↓
useAuth.login() → API /login
  ↓
Token guardado en localStorage
  ↓
AuthStore actualizado
  ↓
Redirect a /dashboard
  ↓
ProtectedRoute verifica auth ✓
  ↓
Dashboard renderizado
```

### 3. Acceso a Ruta Protegida
```
Usuario accede a /dashboard
  ↓
Middleware verifica token en cookie/localStorage
  ↓
ProtectedRoute verifica auth del lado del cliente
  ↓
Si no autenticado → Redirect a /login
  ↓
Si autenticado → Renderizar página
```

### 4. Validación de Rol
```
Ruta requiere rol ADMIN
  ↓
ProtectedRoute.requireRoles = [UserRole.ADMIN]
  ↓
useRole().hasRole(UserRole.ADMIN) verifica
  ↓
Si no tiene rol → Redirect a unauthorizedRedirectTo
  ↓
Si tiene rol → Renderizar página
```

## Enumeración de Roles

```typescript
enum UserRole {
  ADMIN = 'admin'                 // Acceso completo
  SALES_REP = 'sales_rep'         // Representante de ventas
  SUPERVISOR = 'supervisor'       // Supervisor de equipo
  ANALYST = 'analyst'             // Analista de datos
}
```

## Permisos por Rol

| Permiso | Admin | Supervisor | Analyst | Sales Rep |
|---------|-------|-----------|---------|-----------|
| Ver Dashboard | ✓ | ✓ | ✓ | ✓ |
| Aprobar Gastos | ✓ | ✓ | - | - |
| Ver Análisis | ✓ | ✓ | ✓ | - |
| Gestionar Usuarios | ✓ | - | - | - |

## Ejemplos de Uso

### Ejemplo 1: Página con Validación de Rol
```typescript
// app/(dashboard)/analytics/page.tsx
'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types/auth'

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requireRoles={[UserRole.ADMIN, UserRole.ANALYST]}>
      <AnalyticsContent />
    </ProtectedRoute>
  )
}

function AnalyticsContent() {
  const { isAdmin, currentRole } = useRole()

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <p>Tu rol: {currentRole}</p>
      {isAdmin() && <AdminSection />}
    </div>
  )
}
```

### Ejemplo 2: Componente con Lógica Basada en Rol
```typescript
// components/Header.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'

export function Header() {
  const { user, logout } = useAuth()
  const { isAdmin, canManageUsers } = useRole()

  return (
    <header>
      <h1>Welcome, {user?.full_name}</h1>
      {canManageUsers() && <a href="/admin/users">Manage Users</a>}
      {isAdmin() && <a href="/admin/settings">Settings</a>}
      <button onClick={logout}>Logout</button>
    </header>
  )
}
```

### Ejemplo 3: Página sin Autenticación
```typescript
// app/(auth)/login/page.tsx
'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginForm } from '@/components/forms/LoginForm'

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <LoginForm />
    </ProtectedRoute>
  )
}
```

## Seguridad

### Autenticación Multinivel

1. **Middleware (Servidor)** - Primera línea de defensa
2. **ProtectedRoute (Cliente)** - Segunda línea de defensa
3. **useRole Hook** - Control granular de permisos

### Token Storage
- Access Token: localStorage (accedible desde JavaScript)
- Refresh Token: localStorage (sincronizado con API)
- Validación en cada API request vía axios interceptors

### Best Practices Implementadas

1. **No renderizar datos sensibles** - ProtectedRoute evita exposición
2. **Validación en ambos lados** - Cliente + Servidor
3. **Redirecciones automáticas** - Sin acceso a rutas protegidas
4. **Type-safety** - TypeScript para prevenir errores
5. **Error handling** - Manejo de errores en toda la cadena

## Verificación de la Implementación

### Checklist
- [x] Middleware funciona correctamente
- [x] AuthProvider envuelve toda la aplicación
- [x] ProtectedRoute protege rutas
- [x] useRole hook proporciona RBAC
- [x] RootLayout actualizado con AuthProvider
- [x] Dashboard layout usa ProtectedRoute
- [x] No hay errores de TypeScript
- [x] Código sigue eslint rules
- [x] Documentación completa

### Testing Manual

1. **Sin autenticación**:
   - Acceder a /dashboard → Redirect a /login ✓

2. **Con autenticación**:
   - Acceder a /login → Redirect a /dashboard ✓
   - Acceder a /dashboard → Renderizar página ✓

3. **Con rol incorrecto**:
   - Ruta requiere ADMIN, usuario es SALES_REP → Redirect ✓

4. **Logout**:
   - Click logout → Redirect a /login, token limpiado ✓

## Próximos Pasos

1. Implementar endpoints específicos por rol en el backend
2. Agregar validación de permisos en API calls
3. Implementar refresh token logic
4. Agregar sesión timeout
5. Implementar 2FA si es requerido

## Referencias

- Documentación de Next.js Middleware: https://nextjs.org/docs/advanced-features/middleware
- React Context API: https://react.dev/reference/react/useContext
- TypeScript Enums: https://www.typescriptlang.org/docs/handbook/enums.html
