'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientUpdateSchema, type ClientUpdateFormData } from '@/lib/validations/client'
import { clientsApi } from '@/lib/api/clients'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import {
  CLIENT_TYPE_LABELS,
  CLIENT_STATUS_LABELS,
  INDUSTRY_LABELS,
  LEAD_SOURCES,
  PREFERRED_LANGUAGES,
  PREFERRED_CURRENCIES,
} from '@/constants/client'
import { ClientStatus, ClientType, Industry, type ClientResponse } from '@/types/client'

interface EditClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientResponse | null
  onSuccess: () => void
}

export function EditClientModal({
  open,
  onOpenChange,
  client,
  onSuccess,
}: EditClientModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<ClientUpdateFormData>({
    resolver: zodResolver(clientUpdateSchema),
  })

  const clientType = watch('client_type')

  // Load client data when modal opens
  useEffect(() => {
    if (open && client) {
      reset({
        name: client.name,
        client_type: client.client_type,
        email: client.email || '',
        phone: client.phone || '',
        mobile: client.mobile || '',
        website: client.website || '',
        address_line1: client.address_line1 || '',
        address_line2: client.address_line2 || '',
        city: client.city || '',
        state: client.state || '',
        postal_code: client.postal_code || '',
        country: client.country || '',
        industry: client.industry || undefined,
        tax_id: client.tax_id || '',
        status: client.status,
        contact_person_name: client.contact_person_name || '',
        contact_person_email: client.contact_person_email || '',
        contact_person_phone: client.contact_person_phone || '',
        notes: client.notes || '',
        tags: client.tags || '',
        lead_source: client.lead_source || '',
        first_contact_date: client.first_contact_date || '',
        conversion_date: client.conversion_date || '',
        linkedin_url: client.linkedin_url || '',
        twitter_handle: client.twitter_handle || '',
        preferred_language: client.preferred_language || 'es',
        preferred_currency: client.preferred_currency || 'COP',
        is_active: client.is_active ?? true,
      })
    }
  }, [open, client, reset])

  const onSubmit = async (data: ClientUpdateFormData) => {
    if (!client) {
      return
    }

    try {
      setIsLoading(true)

      // Convert empty strings to null for optional fields
      const submitData = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        website: data.website || null,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        city: data.city || null,
        state: data.state || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        industry: data.industry || null,
        tax_id: data.tax_id || null,
        contact_person_name: data.contact_person_name || null,
        contact_person_email: data.contact_person_email || null,
        contact_person_phone: data.contact_person_phone || null,
        notes: data.notes || null,
        tags: data.tags || null,
        lead_source: data.lead_source || null,
        first_contact_date: data.first_contact_date || null,
        conversion_date: data.conversion_date || null,
        linkedin_url: data.linkedin_url || null,
        twitter_handle: data.twitter_handle || null,
      }

      await clientsApi.updateClient(client.id, submitData)

      toast({
        title: 'Éxito',
        description: 'Cliente actualizado correctamente',
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.detail || error?.message || 'No se pudo actualizar el cliente',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!client) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifica la información del cliente. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="business">Negocio</TabsTrigger>
              <TabsTrigger value="additional">Adicional</TabsTrigger>
            </TabsList>

            {/* BÁSICO */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Razón Social *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Ej: Acme Corporation S.A."
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_type">Tipo *</Label>
                  <Controller
                    name="client_type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="client_type">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ClientType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {CLIENT_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.client_type && (
                    <p className="text-sm text-red-600">{errors.client_type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado *</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ClientStatus).map((status) => (
                            <SelectItem key={status} value={status}>
                              {CLIENT_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industria</Label>
                  <Controller
                    name="industry"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger id="industry">
                          <SelectValue placeholder="Seleccionar industria" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Industry).map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {INDUSTRY_LABELS[industry]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">RNC</Label>
                  <Input
                    id="tax_id"
                    {...register('tax_id')}
                    placeholder="Ej: 131-12345-6"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bpid">BPID (Business Partner ID)</Label>
                  <Input
                    id="bpid"
                    {...register('bpid')}
                    placeholder="Ej: BP-12345"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID para relacionar con marca/SPA. Debe ser único.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* CONTACTO */}
            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="cliente@empresa.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+57 1 234 5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Móvil</Label>
                  <Input
                    id="mobile"
                    {...register('mobile')}
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    {...register('website')}
                    placeholder="https://www.empresa.com"
                  />
                  {errors.website && (
                    <p className="text-sm text-red-600">{errors.website.message}</p>
                  )}
                </div>

                {/* Address Fields */}
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address_line1">Dirección 1</Label>
                  <Input
                    id="address_line1"
                    {...register('address_line1')}
                    placeholder="Calle 123 #45-67"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address_line2">Dirección 2</Label>
                  <Input
                    id="address_line2"
                    {...register('address_line2')}
                    placeholder="Oficina 801, Torre A"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="Bogotá"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Departamento/Estado</Label>
                  <Input
                    id="state"
                    {...register('state')}
                    placeholder="Cundinamarca"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    {...register('postal_code')}
                    placeholder="110111"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    {...register('country')}
                    placeholder="Colombia"
                  />
                </div>

                {/* Contact Person (for companies) */}
                {clientType === ClientType.COMPANY && (
                  <>
                    <div className="col-span-2 pt-4 border-t">
                      <h4 className="font-medium mb-4">Persona de Contacto</h4>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_person_name">Nombre</Label>
                      <Input
                        id="contact_person_name"
                        {...register('contact_person_name')}
                        placeholder="Juan Pérez"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_person_email">Email</Label>
                      <Input
                        id="contact_person_email"
                        type="email"
                        {...register('contact_person_email')}
                        placeholder="juan.perez@empresa.com"
                      />
                      {errors.contact_person_email && (
                        <p className="text-sm text-red-600">
                          {errors.contact_person_email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_person_phone">Teléfono</Label>
                      <Input
                        id="contact_person_phone"
                        {...register('contact_person_phone')}
                        placeholder="+57 300 123 4567"
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* NEGOCIO */}
            <TabsContent value="business" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_source">Fuente del Lead</Label>
                  <Controller
                    name="lead_source"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger id="lead_source">
                          <SelectValue placeholder="Seleccionar fuente" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_SOURCES.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="first_contact_date">Fecha de Primer Contacto</Label>
                  <Input
                    id="first_contact_date"
                    type="date"
                    {...register('first_contact_date')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conversion_date">Fecha de Conversión</Label>
                  <Input
                    id="conversion_date"
                    type="date"
                    {...register('conversion_date')}
                  />
                  {errors.conversion_date && (
                    <p className="text-sm text-red-600">{errors.conversion_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_language">Idioma Preferido</Label>
                  <Controller
                    name="preferred_language"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || 'es'} onValueChange={field.onChange}>
                        <SelectTrigger id="preferred_language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREFERRED_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_currency">Moneda Preferida</Label>
                  <Controller
                    name="preferred_currency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || 'COP'} onValueChange={field.onChange}>
                        <SelectTrigger id="preferred_currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREFERRED_CURRENCIES.map((curr) => (
                            <SelectItem key={curr.value} value={curr.value}>
                              {curr.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ADICIONAL */}
            <TabsContent value="additional" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    {...register('linkedin_url')}
                    placeholder="https://linkedin.com/company/empresa"
                  />
                  {errors.linkedin_url && (
                    <p className="text-sm text-red-600">{errors.linkedin_url.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter_handle">Twitter Handle</Label>
                  <Input
                    id="twitter_handle"
                    {...register('twitter_handle')}
                    placeholder="@empresa"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    {...register('tags')}
                    placeholder="importante, cliente-vip, tecnología"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separa los tags con comas
                  </p>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    rows={4}
                    placeholder="Información adicional sobre el cliente..."
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Actualizar Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
