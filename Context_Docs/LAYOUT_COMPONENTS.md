# Dashboard Layout Components

Documentación de los componentes de layout del dashboard de OnQuota.

## Estructura de Componentes

### 1. Sidebar Component
**Ubicación:** `/frontend/components/layout/Sidebar.tsx`

Barra de navegación lateral fija con acceso a todas las secciones principales.

**Características:**
- Navegación a 6 módulos principales: Dashboard, Gastos, Clientes, Ventas, Transporte, Reportes
- Indicador visual de ruta activa con fondo diferenciado
- Sección de Configuración en el pie
- Ancho fijo de 256px (w-64)
- Fondo oscuro (slate-900) con texto blanco
- Responsive y con scroll en rutas adicionales

**Props:** Ninguno (usa `usePathname()` para determinar la ruta activa)

**Uso:**
```tsx
import { Sidebar } from '@/components/layout/Sidebar'

<Sidebar />
```

---

### 2. Header Component
**Ubicación:** `/frontend/components/layout/Header.tsx`

Encabezado sticky en la parte superior con notificaciones y menú de usuario.

**Características:**
- Altura fija de 64px (h-16)
- Posicionamiento sticky (z-10)
- Botón de notificaciones con badge
- Integración del componente UserMenu
- Sombra sutil y borde inferior

**Props:**
- `title?: string` - Título/sección mostrada en el header (default: "Dashboard")

**Uso:**
```tsx
import { Header } from '@/components/layout/Header'

<Header title="Gastos" />
```

---

### 3. UserMenu Component
**Ubicación:** `/frontend/components/layout/UserMenu.tsx`

Menú dropdown con información del usuario y acciones rápidas.

**Características:**
- Avatar con iniciales de fallback
- Muestra nombre completo y email
- Badge con rol del usuario (color codificado)
- Opciones de menú:
  - Mi Perfil
  - Configuración
  - Administración (solo para admins)
  - Cerrar Sesión
- Utiliza lucide-react para iconos
- Integración con hook `useAuth()`

**Props:** Ninguno (obtiene datos de `useAuth()`)

**Uso:**
```tsx
import UserMenu from '@/components/layout/UserMenu'

<UserMenu />
```

**Roles y Colores:**
- Admin: Púrpura (bg-purple-100 text-purple-800)
- Representante de Ventas: Azul (bg-blue-100 text-blue-800)
- Supervisor: Verde (bg-green-100 text-green-800)
- Analista: Naranja (bg-orange-100 text-orange-800)

---

## Layout Principal

**Ubicación:** `/frontend/app/(dashboard)/layout.tsx`

Estructura principal que envuelve todas las páginas del dashboard.

**Estructura HTML:**
```
<div> (flex h-screen)
  ├─ Sidebar
  └─ <div> (flex flex-col flex-1)
      ├─ Header
      └─ <main> (flex-1 overflow-y-auto)
          └─ {children}
</div>
```

**Características:**
- Usa route group `(dashboard)` para aplicar el layout
- Envuelto en `ProtectedRoute` para protección de rutas
- Altura total de pantalla con scroll solo en contenido principal

---

## Página Dashboard Principal

**Ubicación:** `/frontend/app/(dashboard)/dashboard/page.tsx`

Vista principal del dashboard con métricas KPI.

**Secciones:**
1. **Welcome Section** - Bienvenida y descripción
2. **KPI Metrics Grid** - 4 tarjetas de métricas:
   - Ventas del Mes
   - Cuota Mensual
   - Clientes Nuevos
   - Tasa de Conversión
3. **Feature Cards** - 2 tarjetas informativas:
   - Sistema de Autenticación
   - Navegación Disponible

---

## Integración de Componentes

### Flujo de Enrutamiento
```
/ (root layout)
├─ (auth)/login
├─ (auth)/register
└─ (dashboard)/
   ├─ layout.tsx (Sidebar + Header)
   └─ dashboard/
      └─ page.tsx (KPI Cards)
```

### Hook useAuth
Los componentes UserMenu y Header integran el hook `useAuth()` para:
- Obtener información del usuario autenticado
- Ejecutar logout
- Acceder al rol del usuario

### Estilos Tailwind
Todos los componentes utilizan Tailwind CSS con:
- Colores consistentes (slate, gray, blue, green, red, purple)
- Transiciones suaves
- Responsive design (mobile-first)
- Dark mode ready (con suppressHydrationWarning)

---

## Componentes UI Utilizados (shadcn/ui)

- `Card` - Contenedor de tarjetas
- `CardHeader` - Encabezado de tarjeta
- `CardContent` - Contenido de tarjeta
- `CardTitle` - Título de tarjeta
- `Avatar` - Avatar de usuario
- `AvatarImage` - Imagen del avatar
- `AvatarFallback` - Fallback de avatar
- `Badge` - Badge para roles
- `Button` - Botones
- `DropdownMenu` - Menú dropdown
- `DropdownMenuContent` - Contenido del dropdown
- `DropdownMenuItem` - Item del dropdown
- `DropdownMenuLabel` - Label del dropdown
- `DropdownMenuSeparator` - Separador del dropdown
- `DropdownMenuTrigger` - Trigger del dropdown

---

## Iconos (lucide-react)

### Sidebar Navigation
- `LayoutDashboard` - Dashboard
- `Receipt` - Gastos
- `Users` - Clientes
- `TrendingUp` - Ventas
- `Car` - Transporte
- `FileText` - Reportes
- `Settings` - Configuración

### Header
- `Bell` - Notificaciones

### UserMenu
- `User` - Mi Perfil
- `Settings` - Configuración
- `Shield` - Administración
- `LogOut` - Cerrar Sesión

### Dashboard KPI Cards
- `TrendingUp` - Ventas
- `Target` - Cuota
- `Users` - Clientes
- `BarChart3` - Conversión

---

## Responsive Design

### Breakpoints Tailwind Utilizados
- `md:` - Medium (768px) - Tablets
- `lg:` - Large (1024px) - Desktops
- `sm:hidden` / `hidden sm:block` - Ocultar en móvil/desktop

### Comportamiento Responsive
1. **Sidebar**: Siempre visible (ancho fijo 256px)
2. **Header**: Ancho completo, responsive
3. **Dashboard KPI**:
   - 1 columna en móvil
   - 2 columnas en tablets
   - 4 columnas en desktop
4. **UserMenu**: Avatar + detalles ocultos en móvil

---

## Accesibilidad

### ARIA Labels
- Header: `aria-label="Notificaciones"`
- Button: `asChild` en DropdownMenuTrigger para semántica correcta

### Keyboard Navigation
- Todos los botones y menús son accesibles por teclado
- Focus states definidos

### Color Contrast
- Todos los textos cumplen con WCAG AA
- Badge de rol con colores distinguibles

---

## Customización

### Agregar Nueva Ruta de Navegación

1. Actualizar `Sidebar.tsx`:
```tsx
{
  name: 'Nueva Sección',
  href: '/dashboard/nueva-seccion',
  icon: IconName,
}
```

2. Crear la página en `/app/(dashboard)/nueva-seccion/page.tsx`

### Cambiar Título del Header
```tsx
<Header title="Mi Sección" />
```

### Modificar Colores
- Editar clases Tailwind en componentes
- O crear variables CSS en `globals.css`

---

## Testing

### Rutas Protegidas
Todas las rutas dentro de `(dashboard)` están protegidas por `ProtectedRoute`.

### Estados Simulados
- El header muestra un badge con contador de notificaciones (hardcoded a 3)
- Las métricas KPI son placeholder

---

## Notas de Desarrollo

1. **Cache Metadata**: El layout utiliza metadata estática
2. **Client Components**: Sidebar y Header son 'use client' (interactividad)
3. **Server Components**: Dashboard page es un Server Component
4. **Import Paths**: Todos usan alias `@/` configurado en `tsconfig.json`

---

## Próximos Pasos

1. Implementar real-time notifications
2. Crear páginas para cada módulo (Gastos, Clientes, etc.)
3. Agregar búsqueda global en el header
4. Implementar theme switcher (dark/light mode)
5. Hacer sidebar colapsable en móvil
6. Agregar migajas de pan (breadcrumbs) al header
