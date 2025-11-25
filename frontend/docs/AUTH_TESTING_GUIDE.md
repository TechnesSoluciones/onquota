# Guía de Testing - Páginas de Auth

## Setup

### Requisitos
- Node.js 18+
- npm 8+
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### Instalación
```bash
cd /Users/josegomez/Documents/Code/OnQuota/frontend
npm install
```

### Ejecutar en desarrollo
```bash
npm run dev
# http://localhost:3000
```

## Testing Manual

### 1. Página de Login

#### URL
```
http://localhost:3000/login
```

#### Test Cases

**1.1 - UI Layout**
- [ ] Card con título "Iniciar Sesión"
- [ ] Descripción visible
- [ ] Dos inputs (email y password)
- [ ] Botón submit
- [ ] Link "Olvidaste tu contraseña?"
- [ ] Link "Regístrate aquí"
- [ ] Logo visible en mobile

**1.2 - Validación Email**
```
Input vacío → "El email es requerido"
"invalid" → "Email inválido"
"test@example.com" → ✓ Válido
```

**1.3 - Validación Contraseña**
```
Input vacío → "La contraseña es requerida"
"short" → "La contraseña debe tener al menos 8 caracteres"
"12345678" → ✓ Válido (mínimo 8)
```

**1.4 - Submit Button**
- [ ] Disabled si hay errores de validación
- [ ] Enabled si form es válido
- [ ] Muestra spinner durante envío
- [ ] Texto cambia a "Iniciando sesión..."

**1.5 - Error Handling**
- Credenciales inválidas → Mostrar mensaje de error
- Error del servidor → Mostrar mensaje genérico
- Mensaje desaparece al cambiar inputs

**1.6 - Navegación**
- [ ] Click "Olvidaste tu contraseña?" → /forgot-password
- [ ] Click "Regístrate aquí" → /register

**1.7 - Responsive**
- Mobile (320px): Card centrada, logo visible
- Tablet (768px): Layout correcto
- Desktop (1920px): Layout con branding a la izquierda

### 2. Página de Registro

#### URL
```
http://localhost:3000/register
```

#### Test Cases

**2.1 - UI Layout**
- [ ] Card con título "Crear Cuenta"
- [ ] Descripción visible
- [ ] Tres secciones organizadas:
  - Información de la Empresa
  - Información Personal
  - Seguridad
- [ ] Botón submit
- [ ] Links de términos y privacidad
- [ ] Link "Inicia sesión aquí"

**2.2 - Validación Empresa**
```
company_name vacío → "El nombre de la empresa es requerido"
company_name "A" → "El nombre debe tener al menos 2 caracteres"
company_name "Mi Empresa S.A." → ✓ Válido

domain vacío → ✓ Válido (opcional)
domain "invalid domain" → "Dominio inválido (ej: empresa.com)"
domain "empresa.com" → ✓ Válido
```

**2.3 - Validación Personal**
```
full_name vacío → "El nombre completo es requerido"
full_name "A" → "El nombre debe tener al menos 2 caracteres"
full_name "Juan Pérez" → ✓ Válido

email vacío → "El email es requerido"
email "invalid" → "Email inválido"
email "test@example.com" → ✓ Válido

phone vacío → ✓ Válido (opcional)
phone "invalid" → "Teléfono inválido"
phone "+56912345678" → ✓ Válido
```

**2.4 - Validación Seguridad**
```
password vacío → "La contraseña es requerida"
password "abc123" → "La contraseña debe tener al menos 8 caracteres"
password "abcdefgh" → "Debe contener mayúscula, minúscula y número"
password "Abcdefgh1" → ✓ Válido

confirmPassword vacío → "Confirma tu contraseña"
confirmPassword "Different" → "Las contraseñas no coinciden"
confirmPassword "Abcdefgh1" (igual a password) → ✓ Válido
```

**2.5 - Submit Button**
- [ ] Disabled si hay errores
- [ ] Enabled solo si todos los campos son válidos
- [ ] Muestra spinner durante envío
- [ ] Texto cambia a "Creando cuenta..."

**2.6 - Error Handling**
- Email ya existe → Mostrar mensaje de error
- Error del servidor → Mostrar mensaje genérico
- Mensaje desaparece al cambiar inputs

**2.7 - Navegación**
- [ ] Click "Términos de Servicio" → /terms
- [ ] Click "Política de Privacidad" → /privacy
- [ ] Click "Inicia sesión aquí" → /login

**2.8 - Responsive**
- Mobile: Todos los campos en una columna
- Desktop: Layout óptimo

### 3. Layout Auth

**URL:** Visible en /login y /register

#### Test Cases

**3.1 - Desktop (1024px+)**
- [ ] Branding panel en la izquierda (50% ancho)
- [ ] Gradiente azul a índigo
- [ ] Logo OnQuota visible
- [ ] Features visibles
- [ ] Copyright en footer
- [ ] Form panel en la derecha (50% ancho)

**3.2 - Tablet (768px - 1023px)**
- [ ] Branding panel oculto (hidden lg:)
- [ ] Form centrado
- [ ] Mobile logo visible
- [ ] Responsive correcto

**3.3 - Mobile (320px - 767px)**
- [ ] Logo OnQuota centrado
- [ ] Card centrada con padding
- [ ] Todos los elementos visibles
- [ ] Scroll funciona correctamente

### 4. Validación Zod

#### Test Cases

**4.1 - Type Inference**
```typescript
// LoginFormData debe tener:
type LoginFormData = {
  email: string
  password: string
}

// RegisterFormData debe tener:
type RegisterFormData = {
  company_name: string
  domain?: string
  email: string
  password: string
  confirmPassword: string
  full_name: string
  phone?: string
}
```

**4.2 - Schema Parsing**
```typescript
// Login válido
loginSchema.parse({
  email: "test@example.com",
  password: "Password123"
}) // ✓ Success

// Login inválido
loginSchema.parse({
  email: "invalid",
  password: "short"
}) // ✗ ZodError
```

## Testing Automatizado (Recomendado)

### Setup Jest + React Testing Library
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

### Ejemplo de Test para Login
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
  })

  it('validates email field', async () => {
    render(<LoginPage />)
    const emailInput = screen.getByPlaceholderText('tu@email.com')

    await userEvent.type(emailInput, 'invalid')
    await userEvent.tab()

    expect(screen.getByText('Email inválido')).toBeInTheDocument()
  })

  it('validates password field', async () => {
    render(<LoginPage />)
    const passwordInput = screen.getByPlaceholderText('••••••••')

    await userEvent.type(passwordInput, 'short')
    await userEvent.tab()

    expect(screen.getByText(/al menos 8 caracteres/)).toBeInTheDocument()
  })
})
```

## Testing en Navegadores

### Chrome DevTools
1. Abrir DevTools (F12)
2. Pestaña "Network" para ver API calls
3. Pestaña "Console" para ver errores
4. Pestaña "Application" para ver localStorage

### React DevTools
1. Instalar extensión de React DevTools
2. Inspeccionar componentes
3. Verificar props y state

### Performance
1. DevTools → Lighthouse
2. Ejecutar audit
3. Verificar:
   - Performance > 90
   - Accessibility > 90
   - Best Practices > 90

## Casos Edge Cases

### Login
- [ ] Email con espacios → Debe trimear
- [ ] Email mayúsculas → Debe convertir a minúsculas
- [ ] Contraseña con caracteres especiales → Debe aceptar
- [ ] Submit sin rellenar campos → Debe mostrar errores
- [ ] Submit repetido rápido → Debe debounce

### Registro
- [ ] Email duplicado → Error desde API
- [ ] Dominio sin TLD → Validación falla
- [ ] Teléfono con espacios/guiones → Debe aceptar
- [ ] Contraseña en confirmPassword → Debe detectar diferencia
- [ ] Nombre de empresa con números → Debe aceptar

## Checklist Pre-Producción

### Funcionalidad
- [ ] Login funciona correctamente
- [ ] Registro funciona correctamente
- [ ] Validación funciona en todos los navegadores
- [ ] Mensajes de error son claros
- [ ] Links navegan a páginas correctas

### UI/UX
- [ ] Diseño responsive en todos los tamaños
- [ ] Loading states visibles
- [ ] Colores con suficiente contraste
- [ ] Placeholders descriptivos
- [ ] Labels visibles y asociados

### Accesibilidad
- [ ] Keyboard navigation funciona
- [ ] Tab order es correcto
- [ ] Screen readers leen el contenido
- [ ] Focus states visibles
- [ ] Campos requeridos indicados

### Performance
- [ ] Bundle size razonable
- [ ] Carga rápida (< 3s)
- [ ] Sin errores de TypeScript
- [ ] Sin warnings en console
- [ ] Validación rápida en cliente

### Seguridad
- [ ] Contraseñas no se loguean
- [ ] No hay info sensible en errores
- [ ] HTTPS está habilitado
- [ ] CORS configurado correctamente

## Debugging

### Error Común: "Email inválido después de lo que parecía válido"
```typescript
// Cause: toLowerCase() en schema
// Solution: Asegurarse que el backend acepta emails en minúsculas
```

### Error Común: "Las contraseñas no coinciden pero son iguales"
```typescript
// Cause: Espacios al inicio/final
// Solution: .trim() antes de comparar
```

### Error Común: "Teléfono rechazado pero el formato parece correcto"
```typescript
// Cause: Regex muy restrictiva
// Solution: Revisar regex en lib/validations/auth.ts
```

## Reportar Bugs

Al reportar bugs, incluir:
1. URL donde ocurre el problema
2. Pasos para reproducir
3. Resultado esperado vs actual
4. Screenshot o video
5. Navegador y versión
6. Console errors (si aplica)

## Recursos

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Accessibility Guidelines](https://www.w3.org/WAI/test-evaluate/)
