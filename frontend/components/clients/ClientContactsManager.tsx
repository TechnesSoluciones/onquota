'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useClientContacts, useCreateClientContact, useUpdateClientContact, useDeleteClientContact } from '@/hooks/useClientContacts'
import type { ClientContact, ClientContactCreate, ClientContactUpdate } from '@/types/client'

interface ClientContactsManagerProps {
  clientId: string | null
  readonly?: boolean
}

export function ClientContactsManager({ clientId, readonly = false }: ClientContactsManagerProps) {
  const { data, loading, refetch } = useClientContacts(clientId)
  const { createContact, loading: creating } = useCreateClientContact()
  const { updateContact, loading: updating } = useUpdateClientContact()
  const { deleteContact, loading: deleting } = useDeleteClientContact()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null)
  const [formData, setFormData] = useState<ClientContactCreate>({
    name: '',
    email: null,
    phone: null,
    position: null,
    is_primary: false,
    is_active: true,
  })

  const handleOpenDialog = (contact?: ClientContact) => {
    if (contact) {
      setEditingContact(contact)
      setFormData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        is_primary: contact.is_primary,
        is_active: contact.is_active,
      })
    } else {
      setEditingContact(null)
      setFormData({
        name: '',
        email: null,
        phone: null,
        position: null,
        is_primary: false,
        is_active: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    try {
      if (editingContact) {
        await updateContact(clientId, editingContact.id, formData as ClientContactUpdate)
      } else {
        await createContact(clientId, formData)
      }
      setDialogOpen(false)
      refetch()
    } catch (error) {
      console.error('Error saving contact:', error)
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!clientId || !confirm('¿Está seguro de eliminar este contacto?')) return

    try {
      await deleteContact(clientId, contactId)
      refetch()
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  if (!clientId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Guarde el cliente primero para agregar contactos</p>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Cargando contactos...</div>
  }

  const contacts = data?.items || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Empleados / Contactos</h3>
        {!readonly && (
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Contacto
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No hay contactos registrados</p>
          {!readonly && (
            <Button
              variant="link"
              onClick={() => handleOpenDialog()}
              className="mt-2"
            >
              Agregar primer contacto
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              {!readonly && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {contact.is_primary && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    {contact.name}
                  </div>
                </TableCell>
                <TableCell>{contact.position || '-'}</TableCell>
                <TableCell>{contact.email || '-'}</TableCell>
                <TableCell>{contact.phone || '-'}</TableCell>
                <TableCell>
                  {contact.is_active ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </TableCell>
                {!readonly && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
            </DialogTitle>
            <DialogDescription>
              Complete la información del empleado/contacto
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="position">Puesto</Label>
              <Input
                id="position"
                value={formData.position || ''}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value || null })
                }
                placeholder="Ej: Gerente de Compras"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value || null })
                }
                placeholder="ejemplo@empresa.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value || null })
                }
                placeholder="+1234567890"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary: checked as boolean })
                }
              />
              <Label htmlFor="is_primary" className="cursor-pointer">
                Contacto principal
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked as boolean })
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Activo
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {creating || updating ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
