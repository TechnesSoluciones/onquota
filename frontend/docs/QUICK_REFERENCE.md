# Quick Reference - Autenticación OnQuota

Guía rápida para copy-paste y referencia rápida.

## Imports

```typescript
// Hook
import { useAuth } from '@/hooks/useAuth'

// Validaciones
import { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from '@/lib/validations/auth'

// Tipos
import type { UserResponse, LoginRequest, RegisterRequest, TokenResponse } from '@/types/auth'

// Componentes
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
```

---

## Hook useAuth

```typescript
const {
  user,              // UserResponse | null
  isAuthenticated,   // boolean
  isLoading,         // boolean
  error,             // string | null
  login,             // (data: LoginRequest) => Promise<{ success: boolean; error?: string }>
  register,          // (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>
  logout,            // () => Promise<void>
  checkAuth,         // () => Promise<boolean>
  refreshUser,       // () => Promise<{ success: boolean; user?: UserResponse; error?: string }>
} = useAuth()
```

---

## Validación Schemas

### Login Schema
```typescript
loginSchema.parse({
  email: 'user@example.com',
  password: 'Password123'  // min 8 chars
})
```

### Register Schema
```typescript
registerSchema.parse({
  company_name: 'Mi Empresa',      // min 2, max 100
  domain: 'empresa.com',            // optional, must be valid domain
  email: 'user@example.com',        // must be valid email
  password: 'Password123',          // min 8, uppercase, lowercase, number
  confirmPassword: 'Password123',   // must match password
  full_name: 'Juan Pérez',          // min 2, max 100
  phone: '+56912345678'             // optional, must be valid phone
})
```

---

## Form Template - Login

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data)
    if (result.success) {
      router.push('/dashboard')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar Sesión</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && <div className="bg-red-50 p-3 text-red-600">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register('email')} disabled={isLoading} />
            {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" {...register('password')} disabled={isLoading} />
            {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
```

---

## Componente Protegido

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedComponent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) return <div>Cargando...</div>
  if (!isAuthenticated) return null

  return <>{children}</>
}

// Uso
export default function Dashboard() {
  return (
    <ProtectedComponent>
      <h1>Dashboard</h1>
    </ProtectedComponent>
  )
}
```

---

## Navbar con Auth

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAuth()

  if (!isAuthenticated) {
    return (
      <nav className="flex gap-4">
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </nav>
    )
  }

  return (
    <nav className="flex justify-between items-center">
      <span>Hola, {user?.full_name}</span>
      <button onClick={() => logout()} disabled={isLoading}>
        Logout
      </button>
    </nav>
  )
}
```

---

## Acceso a Estado desde Zustand

```typescript
import { useAuthStore } from '@/store/authStore'

// En componente
const { user, isAuthenticated } = useAuthStore()

// Subscripción
useAuthStore.subscribe((state) => {
  console.log('User changed:', state.user)
})

// Getter directo
const user = useAuthStore.getState().user
```

---

## Validación Manual

```typescript
// Validar datos
try {
  const data = loginSchema.parse(formData)
  // data es válido
} catch (error) {
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.log(err.path, err.message)
    })
  }
}

// Type inference
type LoginData = z.infer<typeof loginSchema>
// LoginData = { email: string; password: string }
```

---

## Errores Comunes

### Error: "Cannot find module '@/hooks/useAuth'"
**Solución:** Verificar que el archivo existe en `/hooks/useAuth.ts`

### Error: "Expected { after 'if' condition"
**Solución:** Agregar llaves en if statements: `if (!val) { return true }`

### Error: "The schema type is not assignable"
**Solución:** Usar `z.infer<typeof schema>` para inferir tipos

### Error: "isLoading nunca es false"
**Solución:** Asegurar que try-finally siempre ejecute `setLoading(false)`

---

## URLs Importantes

| URL | Propósito |
|-----|-----------|
| `/login` | Página de login |
| `/register` | Página de registro |
| `/dashboard` | Dashboard (protegido) |
| `/forgot-password` | Recuperar contraseña |
| `/terms` | Términos y condiciones |
| `/privacy` | Política de privacidad |

---

## Tipos TypeScript

```typescript
// Usuario autenticado
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

// Datos de login
type LoginRequest = {
  email: string
  password: string
}

// Datos de registro
type RegisterRequest = {
  company_name: string
  domain?: string | null
  email: string
  password: string
  full_name: string
  phone?: string | null
}

// Respuesta de tokens
type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}
```

---

## Tailwind Classes Útiles

```typescript
// Spinner
<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

// Error message
<div className="p-3 rounded-lg bg-red-50 border border-red-200">
  <p className="text-sm text-red-600">{error}</p>
</div>

// Loading button
<button disabled={isLoading} className="opacity-50 cursor-not-allowed">
  {isLoading ? 'Loading...' : 'Submit'}
</button>

// Indicador de requerido
<span className="text-red-500">*</span>

// Link
<a href="#" className="text-blue-600 hover:text-blue-700 hover:underline">
  Link
</a>
```

---

## Testing

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

it('shows validation error', async () => {
  render(<LoginPage />)
  const input = screen.getByPlaceholderText('tu@email.com')

  await userEvent.type(input, 'invalid')
  await userEvent.tab()

  expect(screen.getByText('Email inválido')).toBeInTheDocument()
})
```

---

## Debugging

```typescript
// En consola
const { user, isAuthenticated, isLoading } = useAuth()
console.log({ user, isAuthenticated, isLoading })

// DevTools
useAuthStore.subscribe((state) => {
  console.log('Auth changed:', state)
})

// Network tab
// Ver requests a /auth/login y /auth/register

// Storage
localStorage.getItem('access_token')
localStorage.getItem('refresh_token')
```

---

## Checklist antes de commit

- [ ] Validación Zod correcta
- [ ] Hook useAuth usado correctamente
- [ ] Inputs tienen labels
- [ ] Error messages visibles
- [ ] Loading state funciona
- [ ] Responsive design verificado
- [ ] No hay console.logs innecesarios
- [ ] TypeScript compila sin errores
- [ ] Accesibilidad básica (labels, autocomplete)

---

## Performance Tips

```typescript
// Memoizar componente
const LoginForm = React.memo(LoginFormComponent)

// Lazy load
const LoginPage = dynamic(() => import('./login'), {
  loading: () => <Spinner />
})

// Evitar re-renders
const { isLoading } = useAuth()  // Solo traer lo que necesitas
```

---

## Seguridad Quick Tips

- Nunca loguear contraseñas
- Siempre usar HTTPS en producción
- Validar en cliente Y servidor
- Usar tokens con expiración
- Implementar refresh token
- Limpiar tokens en logout
- No exponer errores específicos

---

## Atajos Git

```bash
# Ver cambios en auth
git log --oneline -- app/\(auth\)/

# Diff de validaciones
git diff lib/validations/auth.ts

# Revertir cambios
git checkout -- app/\(auth\)/login/page.tsx
```

---

## npm Commands

```bash
# Instalar dependencias
npm install

# Dev server
npm run dev

# Build
npm run build

# Start production
npm start

# Linting
npm run lint
```

---

## Links Útiles

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Validator](https://zod.dev/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Versionado

**Última actualización:** 2024
**Versión documentación:** 1.0.0
**Status:** ✓ Producción

---

**Tip:** Usa Ctrl+F (Cmd+F) para buscar en esta página
