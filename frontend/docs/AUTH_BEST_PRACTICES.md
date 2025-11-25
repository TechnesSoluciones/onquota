# Best Practices y Troubleshooting - Autenticación

Guía de mejores prácticas y solución de problemas comunes en la implementación de autenticación.

## Best Practices

### 1. Validación en Cliente vs Servidor

**DO:**
```typescript
// Validación Zod en cliente (rápida, UX)
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Validación en servidor (seguridad)
@post('/auth/login')
async def login(data: LoginRequest):
    # Validar emails únicos
    # Validar contraseñas hasheadas
    # Validar tokens
```

**DON'T:**
```typescript
// No confiar solo en validación cliente
if (email.includes('@')) {
  // Enviar al API sin validación Zod
}

// No exponer errores específicos del servidor
// "Email existe" → Mejor: "Credenciales inválidas"
```

### 2. Manejo de Contraseñas

**DO:**
```typescript
// Requisitos fuertes
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

// Confirmación en cliente
.refine((data) => data.password === data.confirmPassword)

// Hashing en servidor
bcrypt.hash(password, salt)
```

**DON'T:**
```typescript
// No guardar contraseñas en plain text
localStorage.setItem('password', password) // ✗

// No enviar contraseña vía GET
fetch(`/login?password=${password}`) // ✗

// No validar contraseña solo en cliente
const isValid = password.length > 8 // ✗
```

### 3. Token Management

**DO:**
```typescript
// Access token (corta duración)
localStorage.setItem('access_token', tokens.access_token)

// Refresh token (larga duración)
localStorage.setItem('refresh_token', tokens.refresh_token)

// Headers en API client
headers: {
  'Authorization': `Bearer ${access_token}`
}

// Auto-refresh de tokens
if (401) {
  const newTokens = await refresh()
  setTokens(newTokens)
}
```

**DON'T:**
```typescript
// No guardar tokens en cookies sin secure flag
localStorage.setItem('sensitive_token', token) // Mejor: HttpOnly cookie

// No mostrar tokens en logs
console.log({ token, user }) // ✗

// No olvidar limpiar tokens en logout
// clearAuth() debe remover todos los tokens
```

### 4. Seguridad de Formularios

**DO:**
```typescript
// Sanitizar inputs
const email = data.email.trim().toLowerCase()

// Validar tipos
const schema = z.object({
  email: z.string().email(),
})

// CSRF protection (Next.js incluido)
// SameSite cookies

// Rate limiting (en servidor)
```

**DON'T:**
```typescript
// No usar dangerouslySetInnerHTML con error messages
<div dangerouslySetInnerHTML={{ __html: error }} /> // ✗

// No inyectar input del usuario sin sanitizar
const message = `Error: ${userInput}` // ✗

// No permitir solicitudes sin validación
api.post('/login', anyData) // ✗
```

### 5. Estado de Carga

**DO:**
```typescript
// Deshabilitar inputs durante carga
<input disabled={isLoading} />

// Mostrar feedback visual
{isLoading && <Spinner />}

// Prevenir múltiples submits
<button disabled={isLoading}>
  {isLoading ? 'Cargando...' : 'Submit'}
</button>

// Limpiar estado
await login()
setError(null) // Limpiar antes de nuevo intento
```

**DON'T:**
```typescript
// No permitir múltiples submits
<button>Submit</button> // Sin disabled

// No esconder el loading state
const isLoading = true // Sin mostrar en UI

// No limpiar errores previos
error && <div>{error}</div> // Sin resetear
```

### 6. Error Handling

**DO:**
```typescript
// Error messages genéricos en cliente
if (!result.success) {
  setError('Credenciales inválidas')
}

// Log detallado en servidor
console.error('Login failed:', {
  email,
  reason: error.code,
  timestamp: new Date(),
})

// Retry logic
const result = await loginWithRetry(data, maxAttempts = 3)

// Error boundaries
<ErrorBoundary>
  <LoginPage />
</ErrorBoundary>
```

**DON'T:**
```typescript
// No exponer detalles del error
setError(error.message) // "User not found in DB"

// No ignorar errores
await login() // Sin try-catch

// No hacer crash en error
throw error // Sin boundary

// No loguear contraseñas
console.log({ password, email }) // ✗
```

### 7. Responsive Design

**DO:**
```typescript
// Mobile-first approach
<div className="w-full max-w-md">
  <input className="w-full" /> {/* 100% width en mobile */}
</div>

// Breakpoints
<div className="hidden lg:flex"> {/* Solo desktop */}

// Touch-friendly
<button className="p-4"> {/* 44px minimum */}

// Readable fonts
<input className="text-base" /> {/* No zoom en iOS */}
```

**DON'T:**
```typescript
// No fixed widths
<input style={{ width: '300px' }} /> // ✗

// No tiny touch targets
<button className="p-1" /> // ✗

// No unresponsive fonts
<input className="text-xs" /> // Zoom en iOS
```

### 8. Accesibilidad

**DO:**
```typescript
// Labels asociadas
<label htmlFor="email">Email</label>
<input id="email" />

// Atributos ARIA
<button aria-label="Close dialog">×</button>

// Keyboard navigation
<input autoComplete="email" />
<input autoComplete="current-password" />

// Indicadores de requerido
<label>Email <span aria-label="required">*</span></label>

// Focus visible
button:focus {
  outline: 2px solid blue;
}
```

**DON'T:**
```typescript
// No etiquetas genéricas
<input placeholder="Email" /> // Sin label

// No colores como única indicación
<input style={{ borderColor: isValid ? 'green' : 'red' }} />

// No ocultar requeridos
<input required />
<label>Email</label> // No indicado como requerido

// No traps de keyboard
<div tabIndex={0}> {/* Sin funcionalidad */}
```

### 9. Performance

**DO:**
```typescript
// Lazy load de componentes
const LoginPage = dynamic(() => import('./login'), {
  loading: () => <Spinner />,
})

// Memoizar componentes
const LoginForm = React.memo(LoginFormComponent)

// Validación eficiente
// Zod valida automáticamente sin re-renders innecesarios

// Code splitting
// Next.js automáticamente splitea por ruta

// Cache de Assets
// CDN para imágenes del layout
```

**DON'T:**
```typescript
// No hacer cálculos pesados en render
const isValidEmail = () => {
  // Operación pesada
}

// No pasar objetos nuevos cada render
<Input config={{ error: errors.email }} />

// No hacer muchas validaciones síncronas
Object.keys(fields).forEach(k => validate(k))
```

### 10. Testing

**DO:**
```typescript
// Test de validación
it('rejects invalid email', () => {
  expect(() => loginSchema.parse({ email: 'invalid', password: 'Valid123' }))
    .toThrow()
})

// Test de UI
it('shows error message on invalid login', async () => {
  render(<LoginPage />)
  await userEvent.click(screen.getByText('Iniciar Sesión'))
  expect(screen.getByText('Email inválido')).toBeVisible()
})

// Test de integración
it('logs in user successfully', async () => {
  const { user } = render(<LoginPage />)
  await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'test@example.com')
  // ... más interactions
})

// Test de accesibilidad
import { axe } from 'jest-axe'
const results = await axe(container)
expect(results).toHaveNoViolations()
```

**DON'T:**
```typescript
// No ignorar tests
it.skip('should login', () => {})

// No tests frágiles
expect(getByText('Iniciando sesión...')).toBeInTheDocument()

// No tests sin snapshot updates
// Mantener snapshots actualizados
```

## Troubleshooting

### Problema 1: "Email inválido después de escribir un email válido"

**Causa:** Regex demasiado restrictiva en validación

**Solución:**
```typescript
// ✓ Use Zod's built-in email validator
email: z.string().email('Email inválido')

// No:
email: z.string().regex(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/)
```

### Problema 2: "Submit button se queda disabled después de error"

**Causa:** Estado de isLoading no se resetea correctamente

**Solución:**
```typescript
// En useAuth hook:
const login = async (data) => {
  try {
    setLoading(true)
    // ... API call
  } finally {
    setLoading(false) // Siempre ejecutar
  }
}
```

### Problema 3: "Las contraseñas no coinciden pero son iguales"

**Causa:** Espacios al inicio/final o caso diferente

**Solución:**
```typescript
confirmPassword: z.string()
  .min(1, 'Confirma tu contraseña')
  .refine(
    (val, ctx) => val === ctx.data.password,
    { message: 'Las contraseñas no coinciden' }
  )
```

### Problema 4: "Validación falla en teléfono válido"

**Causa:** Regex del teléfono muy restrictiva

**Solución:**
```typescript
// Usar una regex más permisiva o librería especializada
phone: z.string().optional().refine(
  (val) => {
    if (!val) return true
    // Aceptar muchos formatos: +56912345678, (56)9 1234 5678, etc
    return /^[\d\s\-\(\)\+]+$/.test(val) && val.replace(/\D/g, '').length >= 7
  },
  { message: 'Teléfono inválido' }
)
```

### Problema 5: "Token expirado, pero usuario sigue haciendo requests"

**Causa:** No hay verificación de token o auto-refresh

**Solución:**
```typescript
// En API client:
const apiClient = axios.create(/* ... */)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newTokens = await refreshTokens()
      if (newTokens) {
        // Retry original request
        return apiClient(error.config)
      } else {
        // Logout
        clearAuth()
        router.push('/login')
      }
    }
    throw error
  }
)
```

### Problema 6: "CORS error en login"

**Causa:** Backend no permite requests del frontend

**Solución (en backend):**
```python
# FastAPI example
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Problema 7: "localStorage no persiste entre tabs"

**Causa:** Session storage en lugar de local storage

**Solución:**
```typescript
// Usar localStorage (persiste)
localStorage.setItem('access_token', token)

// No sessionStorage (solo sesión actual)
sessionStorage.setItem('access_token', token) // ✗

// Mejor: HttpOnly cookies (automático en Next.js)
// No accesible desde JavaScript
```

### Problema 8: "Password requirements confuso para usuarios"

**Solución (UX):**
```typescript
export function PasswordRequirements({ password }: { password: string }) {
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasLength = password.length >= 8

  return (
    <div className="space-y-1 text-sm">
      <div className={hasLength ? 'text-green-600' : 'text-gray-600'}>
        ✓ Al menos 8 caracteres
      </div>
      <div className={hasUpper ? 'text-green-600' : 'text-gray-600'}>
        ✓ Una mayúscula
      </div>
      <div className={hasLower ? 'text-green-600' : 'text-gray-600'}>
        ✓ Una minúscula
      </div>
      <div className={hasNumber ? 'text-green-600' : 'text-gray-600'}>
        ✓ Un número
      </div>
    </div>
  )
}
```

### Problema 9: "Validación de dominio rechaza algunos válidos"

**Solución:**
```typescript
// Usar librería especializada
import { isValidDomain } from 'some-domain-validator'

domain: z.string().optional().refine(
  (val) => {
    if (!val) return true
    return isValidDomain(val)
  },
  { message: 'Dominio inválido' }
)

// O simplificar
domain: z.string().optional().refine(
  (val) => !val || val.includes('.'),
  { message: 'Dominio debe contener un punto' }
)
```

### Problema 10: "Spinner no se anima"

**Causa:** Tailwind animate-spin no está habilitado

**Solución (tailwind.config.js):**
```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        spin: 'spin 1s linear infinite',
      },
    },
  },
}

// O usar CSS puro:
<div className="inline-block animate-spin">
  <svg className="w-4 h-4" /* ... */ />
</div>
```

## Debugging Tools

### 1. React DevTools
```
Instalar extensión → Inspeccionar useAuth state
```

### 2. Network Tab
```
DevTools → Network → Ver requests de login
Verificar headers, body, response
```

### 3. Application Storage
```
DevTools → Application → localStorage/sessionStorage
Verificar tokens guardados
```

### 4. Console Logging
```typescript
const { login } = useAuth()
const result = await login(data)
console.log('Login result:', result)
console.log('Current auth store:', useAuthStore.getState())
```

### 5. NextJS Debug
```bash
NODE_DEBUG=* npm run dev  # Verbose logging
```

## Performance Optimization

### Memoización
```typescript
import { useMemo } from 'react'

const AuthChecker = () => {
  const { isAuthenticated } = useAuth()

  const dashboard = useMemo(() => (
    <Dashboard />
  ), [isAuthenticated])

  return dashboard
}
```

### Lazy Loading
```typescript
const LoginPage = dynamic(() => import('./login'), {
  loading: () => <Skeleton />,
})
```

### Debouncing
```typescript
const [email, setEmail] = useState('')
const debouncedValidate = useMemo(
  () => debounce((value) => validateEmail(value), 300),
  []
)
```

## Checklist de Seguridad

- [ ] No hay contraseñas en logs
- [ ] Tokens están en HttpOnly cookies o localStorage
- [ ] CSRF protection habilitada
- [ ] CORS configurado correctamente
- [ ] Rate limiting en API
- [ ] Validación en servidor (no solo cliente)
- [ ] Errores no exponen detalles internos
- [ ] SSL/HTTPS en producción
- [ ] Headers de seguridad configurados
- [ ] Tokens tienen expiración

## Recursos Adicionales

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Web Security Best Practices](https://web.dev/security/)
