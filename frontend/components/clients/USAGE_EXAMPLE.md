# Ejemplo de Uso: ClientContactsManager

## Integración en Formulario de Cliente

### Opción 1: En un Modal de Edición de Cliente

```typescript
'use client'

import { useState } from 'react'
import { ClientContactsManager } from '@/components/clients'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function EditClientDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="contacts">Empleados</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            {/* Formulario de información del cliente */}
          </TabsContent>

          <TabsContent value="contacts">
            <ClientContactsManager clientId={clientId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
```

### Opción 2: En Página de Detalle de Cliente

```typescript
'use client'

import { ClientContactsManager } from '@/components/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const clientId = params.id

  return (
    <div className="space-y-6">
      {/* Información del cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Datos del cliente */}
        </CardContent>
      </Card>

      {/* Empleados/Contactos */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados y Contactos</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientContactsManager clientId={clientId} />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Opción 3: Modo Solo Lectura

```typescript
import { ClientContactsManager } from '@/components/clients'

export function ClientPreview({ clientId }: { clientId: string }) {
  return (
    <div>
      <h2>Contactos Registrados</h2>
      <ClientContactsManager 
        clientId={clientId} 
        readonly={true}  // No permite editar/agregar/eliminar
      />
    </div>
  )
}
```

## Validación de Cliente Nuevo

Si estás creando un cliente nuevo, el componente mostrará un mensaje indicando que primero debe guardarse el cliente:

```typescript
'use client'

import { useState } from 'react'
import { ClientContactsManager } from '@/components/clients'
import { Button } from '@/components/ui/button'

export function CreateClientForm() {
  const [clientId, setClientId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveClient = async (formData: any) => {
    setIsSaving(true)
    try {
      const response = await createClient(formData)
      setClientId(response.id) // Ahora ya se puede agregar contactos
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario de cliente */}
      <div>
        {/* ... campos del formulario ... */}
        <Button onClick={handleSaveClient} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar Cliente'}
        </Button>
      </div>

      {/* Sección de contactos (deshabilitada hasta que se guarde el cliente) */}
      <div>
        <ClientContactsManager clientId={clientId} />
        {/* 
          Si clientId es null, mostrará:
          "Guarde el cliente primero para agregar contactos"
        */}
      </div>
    </div>
  )
}
```

## API de Hooks Disponibles

Además del componente completo, puedes usar los hooks individuales:

```typescript
import {
  useClientContacts,
  useClientContact,
  useCreateClientContact,
  useUpdateClientContact,
  useDeleteClientContact
} from '@/hooks/useClientContacts'

// Listar contactos
const { data, loading, error, refetch } = useClientContacts(clientId)

// Obtener un contacto específico
const { data: contact } = useClientContact(clientId, contactId)

// Crear contacto
const { createContact, loading: creating } = useCreateClientContact()
await createContact(clientId, {
  name: 'Juan Pérez',
  email: 'juan@empresa.com',
  phone: '+52 1234567890',
  position: 'Gerente de Compras',
  is_primary: true,
  is_active: true
})

// Actualizar contacto
const { updateContact } = useUpdateClientContact()
await updateContact(clientId, contactId, {
  position: 'Director de Compras'
})

// Eliminar contacto
const { deleteContact } = useDeleteClientContact()
await deleteContact(clientId, contactId)
```

## Campos del Formulario de Contacto

El diálogo de crear/editar incluye:

- **Nombre** (requerido)
- **Puesto** (opcional) - Ej: "Gerente de Compras"
- **Email** (opcional) - Validación de formato email
- **Teléfono** (opcional)
- **Contacto principal** (checkbox) - Solo uno puede ser principal
- **Activo** (checkbox) - Para desactivar sin eliminar

## Características Visuales

- Contactos principales muestran una estrella amarilla ⭐
- Estado activo/inactivo con badges de colores
- Confirmación antes de eliminar
- Estados de carga durante operaciones
- Mensajes de error amigables
