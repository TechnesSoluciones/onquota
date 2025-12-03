# Usage Examples - Admin Panel Components

Ejemplos de cómo usar los componentes del panel de administración en páginas de Next.js.

---

## Página de Usuarios

**Ubicación:** `app/(dashboard)/admin/users/page.tsx`

```typescript
'use client'

import { UsersList } from '@/components/settings'

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto py-6">
      <UsersList />
    </div>
  )
}
```

**Nota:** UsersList ya incluye UserFormDialog internamente, no necesitas pasarlo como prop.

---

## Página de Configuración

**Ubicación:** `app/(dashboard)/admin/settings/page.tsx`

```typescript
'use client'

import { SettingsForm } from '@/components/settings'

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Administra la información y preferencias de tu organización
        </p>
      </div>

      <SettingsForm />
    </div>
  )
}
```

---

## Página de Logs de Auditoría

**Ubicación:** `app/(dashboard)/admin/audit-logs/page.tsx`

```typescript
'use client'

import { AuditLogsTable } from '@/components/settings'

export default function AdminAuditLogsPage() {
  return (
    <div className="container mx-auto py-6">
      <AuditLogsTable />
    </div>
  )
}
```

---

## Dashboard de Admin (con Stats)

**Ubicación:** `app/(dashboard)/admin/page.tsx`

```typescript
'use client'

import { StatsCards } from '@/components/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Settings, FileText } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona usuarios, configuración y monitorea la actividad del sistema
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Crear, editar y administrar usuarios del sistema
              </p>
              <Button asChild className="w-full">
                <Link href="/admin/users">Ir a Usuarios</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ajustar preferencias y configuración del tenant
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/settings">Ir a Configuración</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs de Auditoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Revisar el registro de actividades del sistema
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/audit-logs">Ver Logs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

---

## Uso del UserFormDialog de forma standalone

Si necesitas usar el UserFormDialog fuera de UsersList:

```typescript
'use client'

import { useState } from 'react'
import { UserFormDialog } from '@/components/settings'
import { Button } from '@/components/ui/button'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { Plus } from 'lucide-react'

export default function MyCustomPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { createUser, updateUser, refresh } = useAdminUsers()

  return (
    <div>
      <Button onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Crear Usuario
      </Button>

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        createUser={createUser}
        updateUser={updateUser}
        onSuccess={() => {
          setDialogOpen(false)
          refresh()
        }}
      />
    </div>
  )
}
```

Para modo edición:

```typescript
const [selectedUser, setSelectedUser] = useState<AdminUserResponse | null>(null)

<UserFormDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  mode="edit"
  user={selectedUser}
  createUser={createUser}
  updateUser={updateUser}
  onSuccess={() => {
    setDialogOpen(false)
    refresh()
  }}
/>
```

---

## Layout del Admin Panel

**Ubicación:** `app/(dashboard)/admin/layout.tsx`

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types/auth'
import { redirect } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()

  // Redirect if not admin
  if (!isLoading && (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN))) {
    redirect('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    )
  }

  const getCurrentTab = () => {
    if (pathname.includes('/admin/users')) return 'users'
    if (pathname.includes('/admin/settings')) return 'settings'
    if (pathname.includes('/admin/audit-logs')) return 'audit-logs'
    return 'dashboard'
  }

  return (
    <div className="space-y-6">
      {/* Header with badge */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Shield className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">
            Acceso exclusivo para administradores
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={getCurrentTab()} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <Link href="/admin">
            <TabsTrigger value="dashboard" className="w-full">
              Dashboard
            </TabsTrigger>
          </Link>
          <Link href="/admin/users">
            <TabsTrigger value="users" className="w-full">
              Usuarios
            </TabsTrigger>
          </Link>
          <Link href="/admin/settings">
            <TabsTrigger value="settings" className="w-full">
              Configuración
            </TabsTrigger>
          </Link>
          <Link href="/admin/audit-logs">
            <TabsTrigger value="audit-logs" className="w-full">
              Logs
            </TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>

      {/* Content */}
      <div>{children}</div>
    </div>
  )
}
```

---

## Middleware de Autorización

**Ubicación:** `middleware.ts` (agregar al existente)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('access_token')

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Decode token and check role (simplified - use proper JWT decode in production)
    // For now, rely on backend validation
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    // ... otros matchers
  ],
}
```

---

## Sidebar Navigation (agregar link)

**Ubicación:** `components/layout/Sidebar.tsx` (agregar al existente)

```typescript
import { Shield } from 'lucide-react'

// Dentro del componente Sidebar, agregar:

{user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN ? (
  <SidebarItem
    icon={<Shield className="h-5 w-5" />}
    label="Admin Panel"
    href="/admin"
    active={pathname.startsWith('/admin')}
  />
) : null}
```

---

## Prueba Rápida

Para probar todos los componentes en desarrollo:

**Ubicación:** `app/(dashboard)/admin/test/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import {
  UserFormDialog,
  SettingsForm,
  AuditLogsTable,
  StatsCards
} from '@/components/settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAdminUsers } from '@/hooks/useAdminUsers'

export default function AdminTestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { createUser, updateUser } = useAdminUsers()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Components Test</h1>

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="form">User Form</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <StatsCards />
        </TabsContent>

        <TabsContent value="form">
          <Button onClick={() => setDialogOpen(true)}>
            Abrir UserFormDialog
          </Button>
          <UserFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            mode="create"
            createUser={createUser}
            updateUser={updateUser}
            onSuccess={() => setDialogOpen(false)}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsForm />
        </TabsContent>

        <TabsContent value="logs">
          <AuditLogsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## Tips de Implementación

### 1. Permisos en el Backend
Asegúrate de que el backend valide el rol del usuario en cada endpoint de `/api/v1/admin/*`:

```python
@router.get("/users")
async def get_users(
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    # ...
```

### 2. Logging de Auditoría
Los audit logs se crean automáticamente en el backend. No necesitas llamar manualmente a la API de logs.

### 3. Rate Limiting
Los endpoints de admin deberían tener rate limiting más restrictivo:

```python
@router.get("/users", dependencies=[Depends(rate_limit("10/minute"))])
```

### 4. Caché
Considera cachear las stats para evitar queries pesadas:

```typescript
// En el hook useSystemStats
const { stats } = useSystemStats()
// Actualizar cada 5 minutos en lugar de cada render
```

### 5. Responsive Design
Todos los componentes ya son responsive, pero considera:
- En móvil, ocultar columnas menos importantes en tablas
- Usar drawer en lugar de dialog en pantallas pequeñas
- Stack cards verticalmente en móvil

---

## Troubleshooting

### Error: "Cannot find module '@/components/settings'"
Asegúrate de que el archivo `index.ts` existe y exporta todos los componentes.

### Error: "Insufficient permissions"
Verifica que el usuario tenga rol ADMIN o SUPER_ADMIN. Puedes cambiar el rol en la DB temporalmente:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

### Los stats no cargan
Verifica que el endpoint `/api/v1/admin/stats` responda correctamente:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/admin/stats
```

### UserFormDialog no se cierra después de crear
Asegúrate de que estás llamando a `onSuccess` en el callback:

```typescript
onSuccess={() => {
  setDialogOpen(false)
  refresh() // Opcional: actualizar la lista
}}
```

---

**Última actualización:** 2 de diciembre de 2025
