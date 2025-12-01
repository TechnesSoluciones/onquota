/**
 * ClientLTAManager Component
 * Manages LTA (Long Term Agreement) for a specific client
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { useClientLTA } from '@/hooks/useLTA'
import { formatDateTime } from '@/lib/utils'
import {
  FileText,
  Loader2,
  Edit,
  Trash2,
  Save,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { LTAAgreementCreate, LTAAgreementUpdate } from '@/types/lta'

interface ClientLTAManagerProps {
  clientId: string
  bpid?: string | null
}

// Validation schemas
const ltaCreateSchema = z.object({
  agreement_number: z.string().min(1, 'Número de acuerdo requerido'),
  description: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  bpid: z.string().optional(),
})

const ltaUpdateSchema = z.object({
  agreement_number: z.string().min(1, 'Número de acuerdo requerido').optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
  bpid: z.string().optional(),
})

type LTACreateForm = z.infer<typeof ltaCreateSchema>
type LTAUpdateForm = z.infer<typeof ltaUpdateSchema>

export function ClientLTAManager({ clientId, bpid }: ClientLTAManagerProps) {
  const { lta, loading, error, create, update, deleteLTA, refetch } =
    useClientLTA(clientId)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form for creating LTA
  const createForm = useForm<LTACreateForm>({
    resolver: zodResolver(ltaCreateSchema),
    defaultValues: {
      agreement_number: '',
      description: '',
      notes: '',
      is_active: true,
      bpid: bpid || '',
    },
  })

  // Form for updating LTA
  const updateForm = useForm<LTAUpdateForm>({
    resolver: zodResolver(ltaUpdateSchema),
    defaultValues: {
      agreement_number: lta?.agreement_number || '',
      description: lta?.description || '',
      notes: lta?.notes || '',
      is_active: lta?.is_active ?? true,
      bpid: lta?.bpid || bpid || '',
    },
  })

  // Reset update form when LTA changes
  useState(() => {
    if (lta && isEditing) {
      updateForm.reset({
        agreement_number: lta.agreement_number,
        description: lta.description || '',
        notes: lta.notes || '',
        is_active: lta.is_active,
        bpid: lta.bpid || bpid || '',
      })
    }
  })

  /**
   * Handle create LTA
   */
  const onCreateSubmit = async (data: LTACreateForm) => {
    const success = await create(data)
    if (success) {
      setIsCreating(false)
      createForm.reset()
    }
  }

  /**
   * Handle update LTA
   */
  const onUpdateSubmit = async (data: LTAUpdateForm) => {
    const success = await update(data)
    if (success) {
      setIsEditing(false)
    }
  }

  /**
   * Handle delete LTA
   */
  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este LTA? Esta acción no se puede deshacer.')) {
      return
    }
    const success = await deleteLTA()
    if (success) {
      setIsEditing(false)
    }
  }

  /**
   * Cancel editing
   */
  const cancelEdit = () => {
    setIsEditing(false)
    updateForm.reset({
      agreement_number: lta?.agreement_number || '',
      description: lta?.description || '',
      notes: lta?.notes || '',
      is_active: lta?.is_active ?? true,
      bpid: lta?.bpid || bpid || '',
    })
  }

  /**
   * Cancel creating
   */
  const cancelCreate = () => {
    setIsCreating(false)
    createForm.reset()
  }

  if (loading && !lta && !isCreating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            LTA (Long Term Agreement)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            LTA (Long Term Agreement)
          </CardTitle>
          {lta && !isEditing && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* No LTA - Show create form or empty state */}
        {!lta && !isCreating && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Este cliente no tiene un LTA asignado
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear LTA
            </Button>
          </div>
        )}

        {/* Create form */}
        {isCreating && (
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create_agreement_number">
                Número de Acuerdo *
              </Label>
              <Input
                id="create_agreement_number"
                {...createForm.register('agreement_number')}
                placeholder="Ej: LTA-2025-001"
              />
              {createForm.formState.errors.agreement_number && (
                <p className="text-sm text-red-600">
                  {createForm.formState.errors.agreement_number.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_bpid">BPID (Business Partner ID)</Label>
              <Input
                id="create_bpid"
                {...createForm.register('bpid')}
                placeholder="Ej: BP-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_description">Descripción</Label>
              <Textarea
                id="create_description"
                {...createForm.register('description')}
                placeholder="Descripción del acuerdo..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_notes">Notas Internas</Label>
              <Textarea
                id="create_notes"
                {...createForm.register('notes')}
                placeholder="Notas internas..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="create_is_active"
                checked={createForm.watch('is_active')}
                onCheckedChange={(checked) =>
                  createForm.setValue('is_active', checked as boolean)
                }
              />
              <Label htmlFor="create_is_active" className="cursor-pointer">
                Acuerdo activo
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Crear LTA
              </Button>
              <Button type="button" variant="outline" onClick={cancelCreate}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {/* Display LTA - View mode */}
        {lta && !isEditing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Número de Acuerdo</p>
                <p className="font-medium text-lg">{lta.agreement_number}</p>
              </div>
              <Badge
                variant={lta.is_active ? 'default' : 'secondary'}
                className={
                  lta.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {lta.is_active ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Activo
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactivo
                  </>
                )}
              </Badge>
            </div>

            {lta.bpid && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">BPID</p>
                  <p className="font-medium">{lta.bpid}</p>
                </div>
              </>
            )}

            {lta.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="text-sm whitespace-pre-wrap">{lta.description}</p>
                </div>
              </>
            )}

            {lta.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Notas Internas</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {lta.notes}
                  </p>
                </div>
              </>
            )}

            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Creado</p>
                <p className="font-medium">{formatDateTime(lta.created_at)}</p>
              </div>
              {lta.updated_at && (
                <div>
                  <p className="text-muted-foreground">Última Actualización</p>
                  <p className="font-medium">{formatDateTime(lta.updated_at)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Display LTA - Edit mode */}
        {lta && isEditing && (
          <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="update_agreement_number">
                Número de Acuerdo *
              </Label>
              <Input
                id="update_agreement_number"
                {...updateForm.register('agreement_number')}
                placeholder="Ej: LTA-2025-001"
              />
              {updateForm.formState.errors.agreement_number && (
                <p className="text-sm text-red-600">
                  {updateForm.formState.errors.agreement_number.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="update_bpid">BPID (Business Partner ID)</Label>
              <Input
                id="update_bpid"
                {...updateForm.register('bpid')}
                placeholder="Ej: BP-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="update_description">Descripción</Label>
              <Textarea
                id="update_description"
                {...updateForm.register('description')}
                placeholder="Descripción del acuerdo..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="update_notes">Notas Internas</Label>
              <Textarea
                id="update_notes"
                {...updateForm.register('notes')}
                placeholder="Notas internas..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="update_is_active"
                checked={updateForm.watch('is_active')}
                onCheckedChange={(checked) =>
                  updateForm.setValue('is_active', checked as boolean)
                }
              />
              <Label htmlFor="update_is_active" className="cursor-pointer">
                Acuerdo activo
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
