# Architecture Diagram - Autenticación OnQuota

Visualización de la arquitectura y flujos de la autenticación.

## Flujo General de Autenticación

```
┌─────────────────────────────────────────────────────────────────┐
│                     USUARIO FINAL                                │
│               (Browser / Mobile Client)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐      ┌────────▼────────┐
        │  /login        │      │  /register      │
        │  (LoginPage)   │      │  (RegisterPage) │
        └───────┬────────┘      └────────┬────────┘
                │                         │
        ┌───────▼─────────────────────────▼───────┐
        │  React Hook Form + Zod                  │
        │  (Validación en cliente)                │
        │  - Email                                │
        │  - Contraseña                           │
        │  - Dominio (opcional)                   │
        │  - Teléfono (opcional)                  │
        └───────┬─────────────────────────────────┘
                │
        ┌───────▼──────────────────────┐
        │  useAuth() Hook              │
        │  (lib/hooks/useAuth.ts)      │
        │  - login()                   │
        │  - register()                │
        └───────┬──────────────────────┘
                │
        ┌───────▼──────────────────────┐
        │  API Client                  │
        │  (lib/api/client.ts)         │
        │  - Request con Headers       │
        │  - Error Handling            │
        └───────┬──────────────────────┘
                │
        ┌───────▼──────────────────────────────────────┐
        │  Backend API                                 │
        │  (/auth/login, /auth/register)               │
        │  (FastAPI, Django, etc.)                     │
        └───────┬──────────────────────────────────────┘
                │
        ┌───────▼──────────────────────┐
        │  Response (Tokens + User)    │
        │  - access_token              │
        │  - refresh_token             │
        │  - user_data                 │
        └───────┬──────────────────────┘
                │
        ┌───────▼──────────────────────────────┐
        │  Zustand Auth Store                  │
        │  (lib/store/authStore.ts)            │
        │  - user                              │
        │  - isAuthenticated                   │
        │  - tokens                            │
        └───────┬──────────────────────────────┘
                │
        ┌───────▼──────────────────────┐
        │  Redirect to Dashboard       │
        │  /dashboard                  │
        └──────────────────────────────┘
```

## Estructura de Componentes

```
app/(auth)/layout.tsx
│
├── [Desktop] Branding Panel
│   ├── Logo + Brand
│   ├── Features List
│   └── Footer
│
└── [Mobile + Desktop] Form Container
    │
    ├── app/(auth)/login/page.tsx
    │   ├── useForm Hook
    │   │   ├── register
    │   │   ├── handleSubmit
    │   │   └── formState (errors)
    │   │
    │   ├── useAuth Hook
    │   │   ├── login()
    │   │   ├── isLoading
    │   │   └── error
    │   │
    │   └── Components
    │       ├── Card
    │       ├── Input (x2)
    │       ├── Label (x2)
    │       ├── Button
    │       └── Links
    │
    └── app/(auth)/register/page.tsx
        ├── useForm Hook
        │   ├── register (x7 fields)
        │   ├── handleSubmit
        │   └── formState (errors)
        │
        ├── useAuth Hook
        │   ├── register()
        │   ├── isLoading
        │   └── error
        │
        └── Components
            ├── Card
            ├── Input (x7)
            ├── Label (x7)
            ├── Button
            └── Links
```

## Validación Flow

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│  React Hook Form Registration           │
│  {...register('field_name')}            │
│  Captura cambios en tiempo real         │
└────────────┬────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────────┐
    │  Zod Schema Validation                  │
    │  - Tipo correcto                        │
    │  - Longitud válida                      │
    │  - Formato correcto                     │
    │  - Regexes                              │
    │  - Cross-field validation               │
    └────────────┬────────────────────────────┘
             │
        ┌────┴────┐
        │          │
    ✓ Valid   ✗ Invalid
        │          │
        ▼          ▼
    Allow       Show Error
    Submit      Message
```

## Estado Management (Zustand)

```
useAuthStore
│
├── State Variables
│   ├── user: UserResponse | null
│   ├── isAuthenticated: boolean
│   ├── isLoading: boolean
│   ├── accessToken: string | null
│   ├── refreshToken: string | null
│   └── error: string | null
│
└── Actions
    ├── setAuth(user, accessToken, refreshToken)
    ├── clearAuth()
    ├── setLoading(boolean)
    ├── setUser(user)
    └── setError(error)
```

## API Integration Flow

```
Component (Login/Register)
    │
    ├─ Validación Zod ✓
    │
    ▼
useAuth() Hook
    │
    ├─ setLoading(true)
    │
    ▼
authApi.login() o authApi.register()
    │
    ├─ Headers: { Authorization: Bearer ... }
    │ ├─ Content-Type: application/json
    │ └─ CORS Allowed
    │
    ▼
Backend /auth/login endpoint
    │
    ├─ Validación Backend
    ├─ Hash de contraseña
    ├─ Verificación de usuario
    ├─ Generación de tokens JWT
    │
    ▼
Response { access_token, refresh_token, user_id }
    │
    ├─ Status 200 OK
    │
    ▼
useAuth() recibe respuesta
    │
    ├─ Obtiene datos del usuario (authApi.me())
    ├─ Actualiza AuthStore
    ├─ Guarda tokens en localStorage/cookies
    ├─ setLoading(false)
    │
    ▼
Componente redirige a /dashboard
    │
    └─ Success!
```

## Token Management

```
Login Success
    │
    ├─ accessToken (corta duración: 15 min)
    │   ├─ Usada en cada request
    │   ├─ Headers: Authorization: Bearer {token}
    │   └─ Si expira → usar refreshToken
    │
    ├─ refreshToken (larga duración: 7 días)
    │   ├─ Guardada en localStorage
    │   ├─ No usada en requests normales
    │   └─ Usada solo para renovar accessToken
    │
    └─ Storage
        ├─ localStorage.setItem('access_token')
        ├─ localStorage.setItem('refresh_token')
        └─ Persistente entre sesiones
```

## Error Handling Flow

```
Error en Login/Register
    │
    ├─ Validación Zod ✗
    │   └─ Mostrar error en campo específico
    │
    ├─ Error de conexión
    │   └─ "Error de conexión al servidor"
    │
    ├─ Error 401 (Unauthorized)
    │   ├─ Credenciales inválidas
    │   └─ "Credenciales inválidas"
    │
    ├─ Error 409 (Conflict)
    │   ├─ Email ya existe
    │   └─ "Email ya registrado"
    │
    ├─ Error 500 (Server)
    │   ├─ Error interno del servidor
    │   └─ "Error al procesar la solicitud"
    │
    └─ setError(message)
        └─ Mostrar en UI
```

## Responsive Design Flow

```
User Agent
    │
    ├─ Mobile (320px - 767px)
    │   ├─ Hide branding panel (lg:)
    │   ├─ Full width form
    │   ├─ Centered logo
    │   └─ Vertical layout
    │
    ├─ Tablet (768px - 1023px)
    │   ├─ Still hide branding
    │   ├─ Wider form (max-w-md)
    │   └─ Centered
    │
    └─ Desktop (1024px+)
        ├─ Show branding panel (50% width)
        ├─ Show form panel (50% width)
        ├─ Side-by-side layout
        └─ Full height layout
```

## Security Layers

```
Input from User
    │
    ▼ Layer 1: Client-side Validation
    ├─ Zod Schema
    ├─ Email format
    ├─ Password strength
    ├─ Regex validation
    │
    ▼ Layer 2: Input Sanitization
    ├─ trim()
    ├─ toLowerCase()
    ├─ Remove spaces
    │
    ▼ Layer 3: Network Layer
    ├─ HTTPS encrypted
    ├─ CORS validation
    ├─ Content-Type check
    │
    ▼ Layer 4: Server-side Validation
    ├─ Zod/Pydantic validation
    ├─ Database constraints
    ├─ Rate limiting
    │
    ▼ Layer 5: Authentication
    ├─ Password hashing (bcrypt)
    ├─ JWT token generation
    ├─ Signature verification
    │
    ▼ Layer 6: Authorization
    ├─ Role checking
    ├─ Permission validation
    ├─ Scope verification
    │
    └─ Secure Request
```

## Session Lifecycle

```
┌──────────────────────────────────────────────────┐
│              SESSION LIFECYCLE                    │
└──────────────────────────────────────────────────┘

1. User Logs In (POST /auth/login)
   ├─ Validación ✓
   ├─ Tokens generados
   └─ AuthStore actualizado

2. Authenticated Session (Protected Routes)
   ├─ Access Token en headers
   ├─ Auto-check auth en mount
   ├─ Refresh user si expiró token
   └─ Redirigir a login si necesario

3. Token Expiration (15 min)
   ├─ Si access token expiró
   ├─ API retorna 401
   ├─ Automáticamente usa refresh token
   ├─ Obtiene nuevo access token
   └─ Retry original request

4. User Logs Out (Logout)
   ├─ clearAuth() en store
   ├─ localStorage.removeItem('tokens')
   ├─ clearAuthClient()
   ├─ router.push('/login')
   └─ Session finalizada

5. Refresh Token Expirado (7 días)
   ├─ User debe loguerse de nuevo
   ├─ Ambos tokens removidos
   ├─ Redirigir a login
   └─ Nueva sesión necesaria
```

## File Structure

```
app/(auth)/
│
├── layout.tsx
│   ├── Branding Panel (Desktop)
│   └── Form Container
│
├── login/
│   └── page.tsx
│       ├── useForm Hook
│       ├── useAuth Hook
│       ├── Card Component
│       └── Form Fields
│
└── register/
    └── page.tsx
        ├── useForm Hook
        ├── useAuth Hook
        ├── Card Component
        └── Form Fields

lib/
├── validations/
│   └── auth.ts (2 schemas)
│       ├── loginSchema
│       └── registerSchema
│
└── api/
    ├── client.ts (API client)
    ├── auth.ts (Auth endpoints)
    └── ...

hooks/
└── useAuth.ts (5 methods)
    ├── login()
    ├── register()
    ├── logout()
    ├── checkAuth()
    └── refreshUser()

store/
└── authStore.ts (Zustand)
    ├── state
    └── actions

types/
└── auth.ts (TypeScript types)
    ├── User
    ├── LoginRequest
    ├── RegisterRequest
    └── ...
```

## Data Flow Diagram

```
                    ┌──────────────────┐
                    │   User Device    │
                    │   (Browser)      │
                    └────────┬─────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
    ┌───▼────────┐                         ┌─────▼──────┐
    │   Login    │                         │  Register  │
    │   Page     │                         │   Page     │
    └───┬────────┘                         └─────┬──────┘
        │                                       │
    ┌───▼──────────────────────────────────────▼───┐
    │  React Hook Form (Form State)                │
    │  - values                                     │
    │  - errors                                     │
    │  - touched                                    │
    │  - isDirty                                    │
    └───┬────────────────────────────────────────────┘
        │
    ┌───▼─────────────────────────────────────────┐
    │  Zod Validation (Client-side)               │
    │  - Email format                              │
    │  - Password strength                         │
    │  - Cross-field validation                    │
    └───┬─────────────────────────────────────────┘
        │
    ┌───▼──────────────────────────────────────┐
    │  useAuth() Hook                          │
    │  - login/register method                 │
    │  - Error handling                        │
    │  - Loading state                         │
    └───┬──────────────────────────────────────┘
        │
    ┌───▼────────────────────────────────────┐
    │  API Client (axios/fetch)              │
    │  - HTTP request                        │
    │  - Headers                             │
    │  - Error handling                      │
    └───┬────────────────────────────────────┘
        │
        │  ┌─────────────────────────────┐
        │  │  BACKEND SERVER             │
        │  │  (Not in this diagram)      │
        │  └─────────────────────────────┘
        │                │
        ├────────────────┤
        │                │
    ┌───▼──────────┐ ┌──▼────────────┐
    │ Tokens       │ │ User Data     │
    │ - access_token│ │ - id          │
    │ - refresh_token│ │ - email       │
    │              │ │ - full_name   │
    └───┬──────────┘ └──┬────────────┘
        │                │
        └────────┬───────┘
                 │
        ┌────────▼──────────────┐
        │  Zustand Auth Store   │
        │  - setAuth()          │
        │  - setLoading()       │
        │  - setError()         │
        └────────┬──────────────┘
                 │
        ┌────────▼─────────────────┐
        │  localStorage / cookies   │
        │  - access_token           │
        │  - refresh_token          │
        └────────┬─────────────────┘
                 │
        ┌────────▼────────────────┐
        │  Redirect to Dashboard  │
        │  /dashboard             │
        └─────────────────────────┘
```

## Component Hierarchy

```
<AuthLayout>
│
├── <div> Branding Panel (Desktop only)
│   ├── <Logo>
│   ├── <h1> Tagline
│   ├── <Features>
│   │   ├── <Feature 1>
│   │   ├── <Feature 2>
│   │   └── <Feature 3>
│   └── <Copyright>
│
└── <div> Form Container
    ├── <Logo> (Mobile only)
    │
    ├── <Card>  [LoginPage]
    │   ├── <CardHeader>
    │   │   ├── <CardTitle>
    │   │   └── <CardDescription>
    │   │
    │   ├── <form> [onSubmit]
    │   │   ├── <CardContent>
    │   │   │   ├── <Alert> [if error]
    │   │   │   │
    │   │   │   ├── <div> Email Field
    │   │   │   │   ├── <Label>
    │   │   │   │   ├── <Input>
    │   │   │   │   └── <Error Message>
    │   │   │   │
    │   │   │   └── <div> Password Field
    │   │   │       ├── <Label>
    │   │   │       ├── <Link> [forgot-password]
    │   │   │       ├── <Input>
    │   │   │       └── <Error Message>
    │   │   │
    │   │   └── <CardFooter>
    │   │       ├── <Button> [submit]
    │   │       └── <Link> [to register]
    │   │
    │   └── </form>
    │
    └── <Card>  [RegisterPage]
        ├── <CardHeader>
        │
        ├── <form> [onSubmit]
        │   ├── <CardContent>
        │   │   ├── <Section> Company Info
        │   │   │   ├── company_name field
        │   │   │   └── domain field
        │   │   │
        │   │   ├── <Section> Personal Info
        │   │   │   ├── full_name field
        │   │   │   ├── email field
        │   │   │   └── phone field
        │   │   │
        │   │   ├── <Section> Security
        │   │   │   ├── password field
        │   │   │   └── confirmPassword field
        │   │   │
        │   │   └── <Terms> Text
        │   │
        │   └── <CardFooter>
        │       ├── <Button> [submit]
        │       └── <Link> [to login]
        │
        └── </form>
```

---

**Última actualización:** 2024
**Version:** 1.0.0
