# Sistema de Autenticación OnQuota

Sistema completo de autenticación implementado para OnQuota usando Next.js 14, TypeScript, Zustand y shadcn/ui.

## Características

- ✅ Login y registro de usuarios
- ✅ Gestión de tokens JWT con auto-refresh
- ✅ Protección de rutas (middleware + client-side)
- ✅ Validación de formularios con Zod + React Hook Form
- ✅ State management con Zustand
- ✅ UI profesional con shadcn/ui
- ✅ Tests con Jest y React Testing Library
- ✅ TypeScript con tipado completo

## Estructura de Archivos

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx          # Layout para login/register
│   │   ├── login/
│   │   │   └── page.tsx        # Página de login
│   │   └── register/
│   │       └── page.tsx        # Página de registro
│   └── dashboard/
│       └── page.tsx            # Dashboard (ejemplo protegido)
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx  # HOC para proteger rutas
│   ├── layout/
│   │   └── UserMenu.tsx        # Menu de usuario
│   └── ui/                     # Componentes shadcn
├── hooks/
│   └── useAuth.ts              # Hook de autenticación
├── lib/
│   ├── api/
│   │   ├── client.ts           # Cliente Axios con interceptors
│   │   └── auth.ts             # Servicios API de auth
│   └── validations/
│       └── auth.ts             # Schemas Zod
├── store/
│   └── authStore.ts            # Zustand store
├── types/
│   ├── auth.ts                 # Tipos de autenticación
│   └── common.ts               # Tipos comunes
├── __tests__/
│   └── auth/
│       └── login.test.tsx      # Tests de login
└── middleware.ts               # Middleware de Next.js

```

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Instalación de Dependencias

Todas las dependencias ya están en `package.json`:

```bash
npm install
```

## Uso

### Login

```typescript
import { useAuth } from '@/hooks/useAuth'

function LoginForm() {
  const { login, isLoading } = useAuth()

  const handleLogin = async (email: string, password: string) => {
    const result = await login({ email, password })

    if (result.success) {
      // Redirige a dashboard
      router.push('/dashboard')
    } else {
      // Muestra error
      console.error(result.error)
    }
  }
}
```

### Registro

```typescript
import { useAuth } from '@/hooks/useAuth'

function RegisterForm() {
  const { register, isLoading } = useAuth()

  const handleRegister = async (data: RegisterRequest) => {
    const result = await register(data)

    if (result.success) {
      router.push('/dashboard')
    }
  }
}
```

### Proteger Rutas

#### Opción 1: Middleware (Recomendado)

El middleware ya está configurado en `/middleware.ts` y protege automáticamente:
- `/dashboard/*`
- `/settings/*`
- `/profile/*`
- `/analytics/*`

#### Opción 2: Componente ProtectedRoute

```typescript
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Contenido protegido</div>
    </ProtectedRoute>
  )
}
```

### Obtener Usuario Actual

```typescript
import { useAuth } from '@/hooks/useAuth'

function UserProfile() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <div>No autenticado</div>
  }

  return (
    <div>
      <h1>{user.full_name}</h1>
      <p>{user.email}</p>
      <p>Rol: {user.role}</p>
    </div>
  )
}
```

### Logout

```typescript
import { useAuth } from '@/hooks/useAuth'

function LogoutButton() {
  const { logout } = useAuth()

  return (
    <button onClick={logout}>
      Cerrar Sesión
    </button>
  )
}
```

### Llamadas API Autenticadas

El cliente API ya incluye automáticamente el token en todas las peticiones:

```typescript
import apiClient from '@/lib/api/client'

// El token se agrega automáticamente
const response = await apiClient.get('/api/v1/quotas')
```

## Auto-Refresh de Tokens

El sistema implementa refresh automático de tokens:

1. Cuando una petición recibe `401 Unauthorized`
2. El interceptor intenta refrescar el token automáticamente
3. Si el refresh es exitoso, reintenta la petición original
4. Si falla, redirige al login

```typescript
// En lib/api/client.ts
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Intenta refresh automático
      // ...
    }
  }
)
```

## Flujo de Autenticación

### Login Flow

1. Usuario va a `/login`
2. Ingresa email y contraseña
3. Submit → `POST /api/v1/auth/login`
4. Recibe `access_token` y `refresh_token`
5. Llama `GET /api/v1/auth/me` para obtener info del usuario
6. Guarda tokens en localStorage y Zustand store
7. Redirect a `/dashboard`

### Token Refresh Flow

1. Petición API recibe `401`
2. Interceptor detecta error
3. Llama `POST /api/v1/auth/refresh` con `refresh_token`
4. Recibe nuevo `access_token`
5. Actualiza token en storage
6. Reintenta petición original con nuevo token

### Logout Flow

1. Usuario hace click en "Cerrar Sesión"
2. Llama `POST /api/v1/auth/logout` (opcional)
3. Limpia tokens de localStorage
4. Limpia Zustand store
5. Redirect a `/login`

## Validaciones

Las validaciones usan Zod:

### Login

```typescript
{
  email: string (email válido),
  password: string (mínimo 8 caracteres)
}
```

### Registro

```typescript
{
  company_name: string (2-100 caracteres),
  domain?: string (formato dominio),
  email: string (email válido),
  password: string (min 8, mayúscula, minúscula, número),
  confirmPassword: string (debe coincidir),
  full_name: string (2-100 caracteres),
  phone?: string (formato teléfono)
}
```

## Testing

### Ejecutar Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Ejemplo de Test

```typescript
it('submits form with valid data', async () => {
  const mockLogin = jest.fn().mockResolvedValue({ success: true })

  render(<LoginPage />)

  await userEvent.type(emailInput, 'test@example.com')
  await userEvent.type(passwordInput, 'Password123')
  fireEvent.click(submitButton)

  expect(mockLogin).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'Password123',
  })
})
```

## API Backend Esperado

El sistema espera estos endpoints del backend:

### POST /api/v1/auth/register

Request:
```json
{
  "company_name": "Mi Empresa",
  "email": "user@example.com",
  "password": "Password123",
  "full_name": "Juan Pérez"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### POST /api/v1/auth/login

Request:
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### GET /api/v1/auth/me

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Juan Pérez",
  "role": "admin",
  "tenant_id": "uuid",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### POST /api/v1/auth/refresh

Request:
```json
{
  "refresh_token": "eyJ..."
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### POST /api/v1/auth/logout

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "message": "Logged out successfully"
}
```

## Seguridad

- ✅ Passwords nunca se guardan en logs
- ✅ Tokens en localStorage (considera httpOnly cookies para producción)
- ✅ Validación de input con Zod
- ✅ HTTPS en producción (configurar en deployment)
- ✅ Rate limiting (debe implementarse en backend)
- ✅ CORS configurado correctamente

## Mejoras Futuras

- [ ] Implementar cookies httpOnly para tokens
- [ ] 2FA (autenticación de dos factores)
- [ ] Recuperación de contraseña
- [ ] Verificación de email
- [ ] Session timeout warnings
- [ ] Device management
- [ ] Audit logs

## Troubleshooting

### "401 Unauthorized" constante

1. Verifica que el backend esté corriendo en `http://localhost:8000`
2. Revisa que el token se esté guardando correctamente
3. Comprueba la consola del navegador para errores
4. Verifica que el formato del token sea correcto

### Auto-refresh no funciona

1. Verifica que `refresh_token` esté en localStorage
2. Revisa la respuesta del endpoint `/auth/refresh`
3. Comprueba los interceptors en `lib/api/client.ts`

### Redireccionamiento infinito

1. Verifica el middleware en `middleware.ts`
2. Revisa que las rutas estén correctamente configuradas
3. Comprueba que el token no esté expirado

## Soporte

Para problemas o preguntas sobre el sistema de autenticación, contacta al equipo de desarrollo.
