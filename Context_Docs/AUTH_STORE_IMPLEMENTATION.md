# Auth Store Implementation with Zustand

Implementación completa del Auth Store con Zustand y hook `useAuth` personalizado para el sistema de autenticación de OnQuota.

## Archivos Creados/Modificados

### 1. Store: `/store/authStore.ts`
**Estado**: Implementado ✅

Store global de autenticación usando Zustand con middleware `persist`.

#### Estado (AuthState)
```typescript
interface AuthState {
  user: UserResponse | null              // Datos del usuario autenticado
  isAuthenticated: boolean                // Flag de autenticación
  isLoading: boolean                      // Estado de carga durante operaciones

  // Actions
  setAuth: (user, accessToken, refreshToken, tenantId) => void
  setUser: (user) => void
  clearAuth: () => void
  setLoading: (loading) => void
}
```

#### Características Principales

**1. Persistencia con Zustand**
- Usa middleware `persist` para guardar estado en localStorage
- Solo persiste `user` e `isAuthenticated` (no los tokens)
- Los tokens se manejan via API client helpers

**2. Integración con API Client**
- `setAuth()` llama a `setAuthState()` helper del client.ts
  - Guarda tokens en localStorage
  - Configura headers de axios automáticamente
  - Guarda tenant_id para multi-tenancy

- `clearAuth()` llama a `clearAuth()` helper del client.ts
  - Limpia localStorage completamente
  - Resetea headers de axios

**3. Tipo-Safe**
- Interfaz TypeScript completa
- Sin tipos `any` excepto en catch blocks (estándar)
- Sincronización automática con client.ts

#### Uso
```typescript
import { useAuthStore } from '@/store/authStore'

// En un componente
const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
```

---

### 2. Hook: `/hooks/useAuth.ts`
**Estado**: Implementado ✅

Hook personalizado que encapsula toda la lógica de autenticación.

#### Valores Retornados

**State**
```typescript
user: UserResponse | null              // Usuario actual
isAuthenticated: boolean                // Si está autenticado
isLoading: boolean                      // Si hay operación en curso
error: string | null                    // Mensaje de error último
```

**Methods**
```typescript
login(data: LoginRequest)               // Inicia sesión y redirige
register(data: RegisterRequest)         // Registra nuevo usuario
logout()                                // Cierra sesión y redirige
checkAuth()                             // Verifica sesión (devuelve boolean)
refreshUser()                           // Actualiza datos del usuario
clearError()                            // Limpia mensaje de error
```

#### Flujo de Autenticación

**Login**
1. Valida datos (email, password)
2. Llama API de login → obtiene tokens
3. Llama API /me → obtiene datos del usuario
4. Guarda en store (que a su vez sincroniza con API client)
5. Redirige automáticamente a `/dashboard`
6. Retorna `{ success: true }` o `{ success: false, error }`

**Register**
1. Valida datos (email, password, company_name, etc)
2. Llama API de registro → obtiene tokens
3. Llama API /me → obtiene datos del usuario
4. Guarda en store
5. Redirige a `/dashboard`

**Logout**
1. Llama API de logout (mejor práctica)
2. Limpia auth state en store
3. Redirige a `/login`

**CheckAuth**
1. Útil para inicializar la app
2. Verifica que el usuario aún tenga sesión válida
3. Si fallan, limpia todo y devuelve false

#### Manejo de Errores

Todos los métodos incluyen try-catch-finally:
- Capturan `err.detail` (respuesta API)
- Fallback a `err.message` o mensaje por defecto
- Guardan en `error` state
- Loguean a console.error para debugging

#### Tipo-Safe
```typescript
// Login
const result = await login({ email: 'user@example.com', password: 'xxx' })
if (result.success) {
  // Usuario redirigido automáticamente
} else {
  console.log(result.error)
}

// State typing automático
const { user, isAuthenticated } = useAuth()
if (user) {
  console.log(user.email)  // TypeScript sabe que no es null
}
```

---

## Integración con API Client (`/lib/api/client.ts`)

### Helpers Utilizados

**`setAuthState(accessToken, refreshToken, tenantId)`**
- Guarda tokens en localStorage
- Configura header `Authorization: Bearer {token}`
- Configura header `X-Tenant-ID: {tenantId}`

**`clearAuth()`**
- Remueve todos los tokens de localStorage
- Limpia headers de axios

### Flujo de Sincronización

```
useAuth.login()
    ↓
authApi.login()  → obtiene tokens
authApi.me()     → obtiene usuario
    ↓
store.setAuth(user, token1, token2, tenantId)
    ↓
setAuthState()   → persiste en client
    ↓
localStorage ← tokens
axios.headers ← Authorization, X-Tenant-ID
```

---

## Integración con Tipos (`/types/auth.ts`)

**Tipos Utilizados**:
- `UserResponse`: Datos del usuario autenticado
- `LoginRequest`: email + password
- `RegisterRequest`: email + password + full_name + company_name
- `TokenResponse`: access_token + refresh_token

Todos sincronizados con backend Pydantic schemas.

---

## Integración con API Service (`/lib/api/auth.ts`)

**Endpoints Utilizados**:
- `authApi.login(data)` → `POST /api/v1/auth/login`
- `authApi.register(data)` → `POST /api/v1/auth/register`
- `authApi.me()` → `GET /api/v1/auth/me`
- `authApi.logout()` → `POST /api/v1/auth/logout`

---

## Componentes que Usan useAuth

### Login Page: `/app/(auth)/login/page.tsx`
- Simplificado para usar error del hook
- Redirige automáticamente (no necesita manual redirect)
- Validación con react-hook-form + zod

### Ejemplo de Uso
```typescript
export default function LoginPage() {
  const { login, isLoading, error } = useAuth()

  const onSubmit = async (data: LoginFormData) => {
    await login(data)
    // Redirige automáticamente si success
    // error state disponible para mostrar mensaje
  }

  return (
    <>
      {error && <div className="error">{error}</div>}
      {/* form */}
    </>
  )
}
```

---

## Patrones de Uso

### 1. En Página de Login
```typescript
const { login, isLoading, error } = useAuth()

const onSubmit = async (formData) => {
  const result = await login(formData)
  // Manejo automático de redirect
}
```

### 2. En Componente Protegido
```typescript
const { user, isAuthenticated } = useAuth()

if (!isAuthenticated) return <Redirect />
return <Dashboard user={user} />
```

### 3. En Root Layout para Inicializar
```typescript
'use client'

export default function RootLayout({ children }) {
  const { checkAuth, isLoading } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [])

  if (isLoading) return <LoadingSpinner />
  return children
}
```

### 4. En UserMenu para Logout
```typescript
const { logout, isLoading } = useAuth()

const handleLogout = async () => {
  await logout()
  // Redirige a /login automáticamente
}

return <button onClick={handleLogout} disabled={isLoading}>Salir</button>
```

### 5. Refrescar Datos del Usuario
```typescript
const { user, refreshUser } = useAuth()

const handleUpdateProfile = async (newData) => {
  // ... actualizar en backend
  const result = await refreshUser()
  // user state se actualiza automáticamente
}
```

---

## Testing Verificado

### TypeScript Compilation
✅ No hay errores TS en archivos auth
✅ Tipos completamente sincronizados
✅ Type-safe en consumidores

### ESLint
✅ Store compila sin warnings
✅ Hook tiene warnings de `any` en catch (estándar en proyecto)
✅ No hay variables no usadas

### Integración
✅ authStore importa de client.ts correctamente
✅ useAuth importa de authStore correctamente
✅ Tipos sincronizados con backend

---

## Persistencia y LocalStorage

### Qué se Persiste (authStore)
```typescript
partialize: (state) => ({
  user: state.user,                    // Usuario actual
  isAuthenticated: state.isAuthenticated  // Flag de autenticación
})
```

### Tokens (NO persisten en store, viven en client.ts)
- `access_token` → localStorage
- `refresh_token` → localStorage
- `tenant_id` → localStorage

### Por qué esta arquitectura
- **Seguridad**: Tokens no en Zustand store (más seguro)
- **Sincronización**: Axios siempre tiene tokens actualizados
- **Persistencia**: Usuario persiste en localStorage (UX)
- **Invalidación**: Tokens se limpian completamente en logout

---

## Flujo Completo de Autenticación

### 1. Usuario no autenticado visita app
```
-> RootLayout checkAuth() llama
-> API /me falla (no hay token)
-> clearAuth() limpia estado
-> usuario redirigido a /login
```

### 2. Usuario inicia sesión
```
-> Login page llama login({ email, password })
-> POST /api/v1/auth/login → tokens
-> GET /api/v1/auth/me → userData
-> store.setAuth(userData, token1, token2, tenantId)
-> setAuthState() guarda en localStorage
-> router.push('/dashboard')
```

### 3. Usuario navega en app autenticado
```
-> setAuthToken() en client mantiene header Authorization
-> setTenantId() en header X-Tenant-ID
-> Todos los requests van con autenticación
-> Si token expira, interceptor automáticamente lo refresca
```

### 4. Usuario cierra sesión
```
-> onClick logout()
-> POST /api/v1/auth/logout (notifica backend)
-> clearAuth() limpia store
-> clearAuth() helper limpia localStorage
-> router.push('/login')
```

---

## Mejoras y Características

1. **Auto-redirect después de login/logout**: No necesita redirigir manualmente
2. **Manejo completo de errores**: Captura y muestra mensajes apropiados
3. **Loading states**: `isLoading` sincronizado en toda la operación
4. **Persistencia selectiva**: Solo persiste lo necesario
5. **Token refresh automático**: Manejado por axios interceptor
6. **Multi-tenant ready**: Cada usuario tied a tenant_id
7. **Type-safe**: Completamente tipado con TypeScript
8. **Separación de responsabilidades**: Store vs API Client vs Hook

---

## Sincronización con Backend

**Tipos sincronizados**:
- UserRole enum (admin, sales_rep, supervisor, analyst)
- UserResponse schema completo
- TokenResponse
- LoginRequest/RegisterRequest

**APIs sincronizadas**:
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/logout
- GET /api/v1/auth/me
- Token refresh automático en interceptor

---

## Checklist de Implementación

- ✅ Auth Store con Zustand creado
- ✅ useAuth hook implementado
- ✅ Integración con setAuthState/clearAuth helpers
- ✅ Persistencia con middleware persist
- ✅ Type-safe completo
- ✅ Manejo de errores robusto
- ✅ Auto-redirect en login/logout
- ✅ checkAuth para inicialización
- ✅ clearError para limpiar mensajes
- ✅ Login page actualizada para usar hook mejorado
- ✅ No hay errores TypeScript
- ✅ ESLint limpio (warnings estándar en catch)

---

## Referencias

- **Store**: `/Users/josegomez/Documents/Code/OnQuota/frontend/store/authStore.ts`
- **Hook**: `/Users/josegomez/Documents/Code/OnQuota/frontend/hooks/useAuth.ts`
- **Types**: `/Users/josegomez/Documents/Code/OnQuota/frontend/types/auth.ts`
- **API Service**: `/Users/josegomez/Documents/Code/OnQuota/frontend/lib/api/auth.ts`
- **API Client**: `/Users/josegomez/Documents/Code/OnQuota/frontend/lib/api/client.ts`
- **Login Page**: `/Users/josegomez/Documents/Code/OnQuota/frontend/app/(auth)/login/page.tsx`
