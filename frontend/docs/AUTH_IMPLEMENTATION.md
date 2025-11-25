# Implementación de Login y Registro - OnQuota

Documentación completa de las páginas de autenticación implementadas con React Hook Form y Zod.

## Estructura de Archivos

```
frontend/
├── app/(auth)/
│   ├── layout.tsx           # Layout compartido para auth
│   ├── login/
│   │   └── page.tsx         # Página de login
│   └── register/
│       └── page.tsx         # Página de registro
├── lib/
│   └── validations/
│       └── auth.ts          # Esquemas de validación con Zod
├── hooks/
│   └── useAuth.ts           # Hook personalizado para auth
└── types/
    └── auth.ts              # Tipos de autenticación (sincronizados con backend)
```

## Validaciones Zod (lib/validations/auth.ts)

### Login Schema

```typescript
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>
```

**Validaciones:**
- Email requerido y válido
- Contraseña mínimo 8 caracteres
- Email convertido a minúsculas automáticamente

### Register Schema

```typescript
export const registerSchema = z
  .object({
    company_name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    domain: z.string().optional().refine(
      (val) => {
        if (!val) return true
        return /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(val)
      },
      { message: 'Dominio inválido (ej: empresa.com)' }
    ),
    email: z
      .string()
      .email('Email inválido')
      .toLowerCase(),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Debe contener mayúscula, minúscula y número'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    full_name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    phone: z.string().optional().refine(
      (val) => {
        if (!val) return true
        return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/im.test(val)
      },
      { message: 'Teléfono inválido' }
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
```

**Validaciones:**
- Nombre empresa: 2-100 caracteres
- Dominio: Validación regex de dominio (opcional)
- Email: Requerido y válido
- Contraseña:
  - Mínimo 8 caracteres
  - Al menos una mayúscula
  - Al menos una minúscula
  - Al menos un número
- Confirmación de contraseña: Debe coincidir con password
- Nombre completo: 2-100 caracteres
- Teléfono: Validación regex (opcional)

## Página de Login (app/(auth)/login/page.tsx)

```typescript
'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [error, setError] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    const result = await login(data)

    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Error al iniciar sesión')
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingresa tu email y contraseña para acceder a tu cuenta
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={isLoading}
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Iniciando sesión...</span>
              </div>
            ) : (
              'Iniciar Sesión'
            )}
          </Button>

          <div className="text-sm text-center text-gray-600">
            ¿No tienes una cuenta?{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              Regístrate aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
```

**Características:**
- Validación en tiempo real con React Hook Form
- Mensajes de error específicos
- Loading state con spinner animado
- Link a página de recuperación de contraseña
- Link a página de registro
- Deshabilitación de campos durante el envío

## Página de Registro (app/(auth)/register/page.tsx)

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser, isLoading } = useAuth()
  const [error, setError] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      company_name: '',
      domain: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: '',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setError('')

    // Remove confirmPassword before sending to API
    const { confirmPassword: _confirmPassword, ...registerData } = data

    const result = await registerUser(registerData)

    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Error al registrarse')
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
        <CardDescription>
          Completa el formulario para crear tu cuenta y comenzar
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Company Information Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Información de la Empresa
            </h3>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Nombre de la Empresa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company_name"
                type="text"
                placeholder="Mi Empresa S.A."
                disabled={isLoading}
                {...register('company_name')}
                className={errors.company_name ? 'border-red-500' : ''}
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name.message}</p>
              )}
            </div>

            {/* Domain (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="domain">
                Dominio <span className="text-gray-400">(Opcional)</span>
              </Label>
              <Input
                id="domain"
                type="text"
                placeholder="empresa.com"
                disabled={isLoading}
                {...register('domain')}
                className={errors.domain ? 'border-red-500' : ''}
              />
              {errors.domain && (
                <p className="text-sm text-red-500">{errors.domain.message}</p>
              )}
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Información Personal
            </h3>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Nombre Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Juan Pérez"
                disabled={isLoading}
                {...register('full_name')}
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                disabled={isLoading}
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Teléfono <span className="text-gray-400">(Opcional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+56 9 1234 5678"
                disabled={isLoading}
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-gray-700">Seguridad</h3>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Terms */}
          <div className="pt-2">
            <p className="text-xs text-gray-600">
              Al registrarte, aceptas nuestros{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                Política de Privacidad
              </Link>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creando cuenta...</span>
              </div>
            ) : (
              'Crear Cuenta'
            )}
          </Button>

          <div className="text-sm text-center text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
```

**Características:**
- Formulario en tres secciones: Empresa, Personal, Seguridad
- Validación independiente de campos con mensajes claros
- Remueve confirmPassword antes de enviar al API
- Loading state con spinner animado
- Links de términos y privacidad
- Link a página de login
- Accesibilidad con labels y atributos HTML semánticos

## Layout Auth (app/(auth)/layout.tsx)

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 text-white flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">OQ</span>
            </div>
            <span className="text-2xl font-bold">OnQuota</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Gestiona tus cuotas de ventas de forma inteligente
          </h1>
          <p className="text-xl text-blue-100">
            Seguimiento en tiempo real, análisis predictivo y gestión eficiente
            de tu equipo de ventas.
          </p>
        </div>

        <div className="space-y-6">
          {/* Feature items */}
        </div>

        <div className="text-sm text-blue-200">
          © 2024 OnQuota. Todos los derechos reservados.
        </div>
      </div>

      {/* Right side - Form (mobile y desktop) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">OQ</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">OnQuota</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
```

**Características:**
- Layout responsive con dos columnas (desktop)
- Branding con gradiente atractivo
- Logo y features en la izquierda (desktop)
- Formulario centrado en la derecha
- Mobile: Logo centrado, solo formulario
- Gradientes suaves y profesionales

## Hook useAuth (hooks/useAuth.ts)

El hook proporciona:

```typescript
export const useAuth = () => {
  return {
    // State
    user,              // Usuario actual
    isAuthenticated,   // ¿Está autenticado?
    isLoading,         // ¿Está cargando?

    // Methods
    login,             // Iniciar sesión
    register,          // Registrarse
    logout,            // Cerrar sesión
    checkAuth,         // Verificar autenticación
    refreshUser,       // Actualizar datos del usuario
  }
}
```

## Flujo de Autenticación

### Login
1. Usuario ingresa email y contraseña
2. Validación con Zod en client
3. Envío al API via `useAuth().login()`
4. API retorna tokens
5. Se obtienen datos del usuario
6. Se actualiza AuthStore
7. Se redirige a /dashboard

### Register
1. Usuario completa formulario
2. Validación con Zod (incluye confirmPassword)
3. Se remueve confirmPassword
4. Envío al API via `useAuth().register()`
5. API crea tenant + usuario admin
6. API retorna tokens
7. Se obtienen datos del usuario
8. Se actualiza AuthStore
9. Se redirige a /dashboard

## Requisistos

```json
{
  "dependencies": {
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.3.3",
    "zod": "^3.x",
    "next": "^14.x",
    "zustand": "^4.x"
  }
}
```

## Mejores Prácticas Implementadas

### Validación
- Validación en cliente con Zod
- Mensajes de error claros y específicos
- Validación en tiempo real
- Cross-field validation (confirmPassword)

### UX/UI
- Loading states claros
- Disabled inputs durante operaciones
- Spinner animado
- Error messages prominentes
- Links de navegación entre páginas
- Mobile responsive

### Seguridad
- Contraseña con requisitos fuertes
- Email normalizado (toLowerCase)
- Confirmación de contraseña
- Teléfono y dominio opcionales
- No mostrar errores de API genéricos

### Accesibilidad
- Labels asociados con inputs
- Atributos autoComplete
- Placeholders descriptivos
- Indicadores de campos requeridos
- Contraste de colores suficiente

## Testing

Para probar las páginas:

```bash
# Build
npm run build

# Dev server
npm run dev

# Ir a http://localhost:3000/login
# Ir a http://localhost:3000/register
```

## Cambios Realizados

### Archivo: lib/validations/auth.ts
- Corregido sintaxis en `.refine()` para domain
- Agregado llaves en condition `if (!val)` para cumplir ESLint
- Corregido sintaxis en `.refine()` para phone

### Archivo: app/(auth)/layout.tsx
- Removido import no usado de `Image`

### Archivo: app/(auth)/register/page.tsx
- Cambiado `confirmPassword` por `_confirmPassword` para cumplir ESLint

## Notas

- Las páginas están completamente funcionales
- No hay errores de TypeScript
- Compilación exitosa
- Responsive en mobile y desktop
- Integración lista con API backend
