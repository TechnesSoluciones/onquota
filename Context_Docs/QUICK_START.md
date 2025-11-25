# Quick Start - Sistema de Autenticación

Guía rápida para empezar a usar el nuevo sistema de autenticación.

## En 5 Minutos

### 1. Proteger una Ruta
```typescript
// app/(dashboard)/admin/page.tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { UserRole } from '@/types/auth'

export default function AdminPage() {
  return (
    <ProtectedRoute requireRoles={[UserRole.ADMIN]}>
      <AdminContent />
    </ProtectedRoute>
  )
}
```

### 2. Verificar Permisos en Componente
```typescript
// components/ApproveButton.tsx
import { useRole } from '@/hooks/useRole'

export function ApproveButton() {
  const { canApproveExpenses } = useRole()

  if (!canApproveExpenses()) return null

  return <button>Aprobar Gasto</button>
}
```

### 3. Acceder a Usuario Autenticado
```typescript
// components/Header.tsx
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header>
      <span>{user?.full_name}</span>
      <button onClick={logout}>Logout</button>
    </header>
  )
}
```

### 4. Usar Contexto Global
```typescript
// components/Profile.tsx
import { useAuthContext } from '@/contexts/AuthContext'

export function Profile() {
  const { user, isAuthenticated } = useAuthContext()

  if (!isAuthenticated) {
    return <p>No autenticado</p>
  }

  return <div>Tu email: {user?.email}</div>
}
```

### 5. Validación Múltiple de Roles
```typescript
// app/(dashboard)/reports/page.tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { UserRole } from '@/types/auth'

export default function ReportsPage() {
  return (
    <ProtectedRoute
      requireRoles={[
        UserRole.ADMIN,
        UserRole.ANALYST,
        UserRole.SUPERVISOR,
      ]}
    >
      <ReportsContent />
    </ProtectedRoute>
  )
}
```

---

## Hooks Disponibles

### useAuth()
Para autenticación básica
```typescript
const {
  user,              // Datos del usuario
  isAuthenticated,   // ¿Está autenticado?
  isLoading,         // ¿Está cargando?
  error,             // Mensaje de error
  login,             // Función login
  register,          // Función register
  logout,            // Función logout
  checkAuth,         // Verificar auth
  refreshUser,       // Actualizar usuario
  clearError,        // Limpiar error
} = useAuth()
```

### useRole()
Para control de acceso por rol
```typescript
const {
  hasRole,              // Verificar rol(es)
  isAdmin,              // ¿Es admin?
  isSalesRep,           // ¿Es sales rep?
  isSupervisor,         // ¿Es supervisor?
  isAnalyst,            // ¿Es analyst?
  canApproveExpenses,   // ¿Puede aprobar?
  canViewAnalytics,     // ¿Puede ver analytics?
  canManageUsers,       // ¿Puede gestionar usuarios?
  currentRole,          // Rol actual
} = useRole()
```

### useAuthContext()
Para acceso al contexto global
```typescript
const {
  user,
  isAuthenticated,
  isLoading,
  error,
  login,
  register,
  logout,
  checkAuth,
  refreshUser,
  clearError,
} = useAuthContext()
```

---

## Componentes Disponibles

### ProtectedRoute
Protege rutas requiriendo autenticación y/o roles
```typescript
<ProtectedRoute
  requireAuth={true}                    // Requiere autenticación
  requireRoles={[UserRole.ADMIN]}       // Requiere rol admin
  redirectTo="/login"                   // Redirige si no auth
  unauthorizedRedirectTo="/dashboard"   // Redirige si sin permisos
  loadingComponent={<Loading />}        // Componente carga custom
>
  {children}
</ProtectedRoute>
```

### AuthProvider
Envolve la app para acceso global
```typescript
// Ya está en /app/layout.tsx
<AuthProvider>
  {children}
</AuthProvider>
```

---

## Roles y Permisos

### Roles Disponibles
```typescript
enum UserRole {
  ADMIN = 'admin'           // Acceso completo
  SALES_REP = 'sales_rep'   // Representante
  SUPERVISOR = 'supervisor' // Supervisor
  ANALYST = 'analyst'       // Analista
}
```

### Matriz de Permisos
| Acción | Admin | Supervisor | Analyst | Sales Rep |
|--------|-------|-----------|---------|-----------|
| Ver Dashboard | ✓ | ✓ | ✓ | ✓ |
| Aprobar | ✓ | ✓ | - | - |
| Analytics | ✓ | ✓ | ✓ | - |
| Usuarios | ✓ | - | - | - |

---

## Flujos Comunes

### Login
```typescript
// components/LoginForm.tsx
import { useAuth } from '@/hooks/useAuth'

export function LoginForm() {
  const { login, isLoading, error } = useAuth()

  const handleSubmit = async (email: string, password: string) => {
    const result = await login({ email, password })
    if (result.success) {
      // Se redirige automáticamente a /dashboard
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      // obtener email y password del form
      handleSubmit(email, password)
    }}>
      {/* form fields */}
      {error && <p>{error}</p>}
    </form>
  )
}
```

### Logout
```typescript
import { useAuth } from '@/hooks/useAuth'

export function LogoutButton() {
  const { logout } = useAuth()

  return (
    <button onClick={logout}>
      Cerrar Sesión
    </button>
  )
}
```

### Condicional por Rol
```typescript
import { useRole } from '@/hooks/useRole'

export function AdminFeatures() {
  const { isAdmin, currentRole } = useRole()

  return (
    <>
      {isAdmin() ? (
        <div>Contenido para admins</div>
      ) : (
        <div>Tu rol: {currentRole}</div>
      )}
    </>
  )
}
```

---

## Documentación Completa

Para más detalles, consulta:

- **Documentación Técnica**
  → `/AUTHENTICATION_IMPLEMENTATION.md`

- **Ejemplos de Código**
  → `/AUTHENTICATION_USAGE_EXAMPLES.md`

- **Diagrama de Arquitectura**
  → `/AUTH_STRUCTURE.txt`

- **Resumen Ejecutivo**
  → `/IMPLEMENTATION_SUMMARY.txt`

---

## Troubleshooting

### Usuario no permanece autenticado después de refresh
- Revisar que localStorage no esté deshabilitado
- Verificar que AuthProvider está en RootLayout
- Revisar console.log para errores de API

### Rutas protegidas no funcionan
- Asegurar que ProtectedRoute está correctamente implementado
- Verificar que middleware.ts está en lugar correcto
- Revisar matcher en middleware config

### useRole retorna falso incorrectamente
- Verificar que user está cargado (isLoading = false)
- Revisar que el rol en la base de datos es correcto
- Asegurar que UserRole enum matches con backend

---

## Checklist de Implementación

- [ ] AuthProvider en RootLayout ✓
- [ ] useAuth hook funcionando
- [ ] useRole hook funcionando
- [ ] ProtectedRoute protegiendo rutas
- [ ] Middleware validando tokens
- [ ] localStorage guardando tokens
- [ ] Logout limpiando estado
- [ ] Refresh manteniendo sesión
- [ ] Roles permitiendo/denegando acceso

---

## Próximas Características

- [ ] Refresh token automático
- [ ] Session timeout
- [ ] 2FA
- [ ] Páginas 401/403 personalizadas

---

**Versión**: 1.0
**Última actualización**: 2025-11-08
