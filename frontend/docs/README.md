# Documentación - Módulo de Autenticación

Bienvenido a la documentación completa del módulo de autenticación de OnQuota. Aquí encontrarás toda la información necesaria para entender, usar y mantener las páginas de Login y Registro.

## Índice de Documentación

### 1. [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)
Documentación técnica completa de la implementación.

**Contenido:**
- Estructura de archivos
- Esquemas de validación Zod
- Código completo de páginas
- Hook useAuth
- Flujos de autenticación
- Requisitos y dependencias

**Para:** Desarrolladores que necesitan entender la implementación técnica

---

### 2. [AUTH_SUMMARY.md](./AUTH_SUMMARY.md)
Resumen ejecutivo de cambios realizados.

**Contenido:**
- Overview del proyecto
- Archivos implementados
- Validaciones incluidas
- Estado de compilación
- UI/UX verificado
- Próximos pasos recomendados

**Para:** Gestores de proyecto, leads técnicos, revisores

---

### 3. [AUTH_TESTING_GUIDE.md](./AUTH_TESTING_GUIDE.md)
Guía completa de testing manual y automatizado.

**Contenido:**
- Setup y requisitos
- Test cases para login y registro
- Testing en navegadores
- Edge cases
- Debugging tools
- Checklist pre-producción

**Para:** QA, testers, desarrolladores que hacen testing

---

### 4. [USEAUTH_EXAMPLES.md](./USEAUTH_EXAMPLES.md)
Ejemplos prácticos de uso del hook useAuth.

**Contenido:**
- API reference del hook
- 10+ ejemplos prácticos
- Protección de rutas
- Manejo de roles
- Integration con Zustand
- Patrones comunes
- Type safety

**Para:** Desarrolladores que van a usar el hook en otras páginas

---

### 5. [AUTH_BEST_PRACTICES.md](./AUTH_BEST_PRACTICES.md)
Best practices y troubleshooting.

**Contenido:**
- 10 best practices principales
- 10 problemas comunes y soluciones
- Debugging tools
- Seguridad
- Performance
- Accesibilidad
- Validación

**Para:** Desarrolladores seniors, code reviewers, mantenimiento

---

## Inicio Rápido

### Para desarrolladores nuevos:
1. Leer [AUTH_SUMMARY.md](./AUTH_SUMMARY.md) (5 min)
2. Revisar [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) - Section "Validaciones Zod" (10 min)
3. Revisar [USEAUTH_EXAMPLES.md](./USEAUTH_EXAMPLES.md) - "Ejemplos Prácticos" (15 min)

### Para QA/Testing:
1. Leer [AUTH_TESTING_GUIDE.md](./AUTH_TESTING_GUIDE.md) - "Testing Manual" (30 min)
2. Ejecutar test cases
3. Usar "Checklist Pre-Producción"

### Para código review:
1. Leer [AUTH_SUMMARY.md](./AUTH_SUMMARY.md) (5 min)
2. Revisar cambios específicos en [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)
3. Validar con [AUTH_BEST_PRACTICES.md](./AUTH_BEST_PRACTICES.md)

---

## Estructura del Código

```
frontend/
├── app/(auth)/
│   ├── layout.tsx              # Layout compartido
│   ├── login/
│   │   └── page.tsx            # Página de login
│   └── register/
│       └── page.tsx            # Página de registro
├── lib/
│   ├── validations/
│   │   └── auth.ts             # Esquemas Zod
│   └── api/
│       └── auth.ts             # API client
├── hooks/
│   └── useAuth.ts              # Hook de autenticación
├── types/
│   └── auth.ts                 # Tipos TypeScript
└── docs/                        # Esta carpeta
    ├── AUTH_IMPLEMENTATION.md
    ├── AUTH_SUMMARY.md
    ├── AUTH_TESTING_GUIDE.md
    ├── USEAUTH_EXAMPLES.md
    ├── AUTH_BEST_PRACTICES.md
    └── README.md                # Este archivo
```

---

## Archivos Clave

### app/(auth)/login/page.tsx
```
Líneas: 130
Componentes: Card, Input, Label, Button
Dependencias: React Hook Form, Zod
```

### app/(auth)/register/page.tsx
```
Líneas: 295
Componentes: Card, Input, Label, Button
Campos: 7 (empresa, personal, seguridad)
```

### lib/validations/auth.ts
```
Esquemas: 2 (login, register)
Tipos exportados: 2 (LoginFormData, RegisterFormData)
Validaciones incluidas: Email, contraseña, dominio, teléfono
```

### hooks/useAuth.ts
```
Métodos: 5 (login, register, logout, checkAuth, refreshUser)
State: 4 (user, isAuthenticated, isLoading, error)
```

---

## Validaciones

### Login
- Email: requerido, formato válido
- Contraseña: mínimo 8 caracteres

### Registro
- Empresa: nombre 2-100 caracteres
- Dominio: validación regex (opcional)
- Email: requerido, formato válido
- Contraseña: 8+ chars, mayúscula, minúscula, número
- Confirmación: debe coincidir
- Nombre: 2-100 caracteres
- Teléfono: validación regex (opcional)

---

## Flujo de Usuarios

### Login Flow
```
Usuario
  ↓
Completa formulario
  ↓
Validación Zod (cliente)
  ↓
API Login
  ↓
Obtener datos usuario
  ↓
Actualizar AuthStore
  ↓
Redirigir a /dashboard
```

### Registro Flow
```
Usuario
  ↓
Completa formulario
  ↓
Validación Zod (cliente)
  ↓
API Register
  ↓
Crear tenant + usuario admin
  ↓
Obtener datos usuario
  ↓
Actualizar AuthStore
  ↓
Redirigir a /dashboard
```

---

## Componentes Usados

De shadcn/ui:
- Card (Header, Content, Footer)
- Button
- Input
- Label

Estos están previamente instalados en el proyecto.

---

## Dependencias

```json
{
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.3.3",
  "zod": "^3.x",
  "next": "^14.2.33",
  "zustand": "^4.x"
}
```

---

## State Management

### Zustand Store (lib/store/authStore.ts)
```typescript
useAuthStore = {
  user,
  isAuthenticated,
  isLoading,
  accessToken,
  refreshToken,
  setAuth,
  clearAuth,
  setLoading,
  setUser,
}
```

Acceso:
```typescript
const { user, isAuthenticated } = useAuthStore()
// O a través del hook:
const { user, isAuthenticated } = useAuth()
```

---

## Rutas Protegidas

### Login/Registro (públicas)
- `/login` - Página de login
- `/register` - Página de registro

### Protegidas (requieren auth)
- `/dashboard` - Dashboard principal
- Todas las rutas bajo `/dashboard`

---

## Error Handling

### Errores de Validación
```
Email inválido → "Email inválido"
Contraseña corta → "La contraseña debe tener al menos 8 caracteres"
Contraseñas no coinciden → "Las contraseñas no coinciden"
```

### Errores de API
```
Credenciales inválidas → "Error al iniciar sesión"
Email duplicado → "Email ya existe"
Error servidor → "Error al registrarse"
```

---

## Seguridad

Implementado:
- Contraseñas con requisitos fuertes
- Email normalizado (toLowerCase)
- Confirmación de contraseña
- Validación en cliente Y servidor
- Tokens JWT con expiración
- Mensajes de error genéricos

---

## Performance

- Lazy loading automático con Next.js
- Code splitting por ruta
- Validación en cliente (sin delay)
- Memoización de componentes
- Optimizaciones de Tailwind CSS

---

## Accesibilidad (WCAG)

Implementado:
- Labels correctamente asociados
- Atributos autocomplete
- Indicadores de requerido
- Contraste de colores suficiente
- Focus states visibles
- Error messages descriptivos

---

## Estado de la Implementación

### Completado
- ✓ Páginas de login y registro
- ✓ Validaciones Zod
- ✓ Hook useAuth
- ✓ Layout auth
- ✓ Responsive design
- ✓ Accesibilidad
- ✓ Documentación completa

### Próximos pasos
- [ ] Página /forgot-password
- [ ] Página /terms
- [ ] Página /privacy
- [ ] Verificación de email
- [ ] 2FA (Two-factor authentication)
- [ ] OAuth/SSO

---

## Build & Deploy

### Desarrollo
```bash
npm run dev
# http://localhost:3000/login
```

### Build
```bash
npm run build
# Sin errores
```

### Producción
```bash
npm start
```

---

## Contato & Soporte

Para preguntas o problemas:
1. Revisar [AUTH_BEST_PRACTICES.md](./AUTH_BEST_PRACTICES.md) - "Troubleshooting"
2. Revisar logs de consola
3. Contactar al equipo de desarrollo

---

## Changelog

### v1.0.0 (Inicial)
- Implementación de login y registro
- Validaciones Zod completas
- Hook useAuth funcional
- Documentación completa
- Testing guides
- Best practices

---

## Licencia

Proyecto OnQuota - Derechos reservados

---

**Última actualización:** 2024
**Versión:** 1.0.0
**Status:** Producción

---

## Atajos Rápidos

| Necesito | Ir a |
|----------|------|
| Ver código | [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) |
| Usar el hook | [USEAUTH_EXAMPLES.md](./USEAUTH_EXAMPLES.md) |
| Testear | [AUTH_TESTING_GUIDE.md](./AUTH_TESTING_GUIDE.md) |
| Best practices | [AUTH_BEST_PRACTICES.md](./AUTH_BEST_PRACTICES.md) |
| Overview | [AUTH_SUMMARY.md](./AUTH_SUMMARY.md) |
