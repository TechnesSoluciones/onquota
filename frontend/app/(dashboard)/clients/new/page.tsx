'use client'

/**
 * New Client Page V2
 * Create a new client using FormLayout
 * Design System V2
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientCreateSchema, type ClientCreateFormData } from '@/lib/validations/client'
import { clientsApi } from '@/lib/api/clients'
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui-v2'
import { FormLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'
import { useToast } from '@/hooks/use-toast'
import {
  CLIENT_TYPE_LABELS,
  CLIENT_STATUS_LABELS,
  INDUSTRY_LABELS,
  LEAD_SOURCES,
  PREFERRED_LANGUAGES,
  PREFERRED_CURRENCIES,
} from '@/constants/client'
import { ClientStatus, ClientType, Industry } from '@/types/client'

export default function NewClientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
  } = useForm<ClientCreateFormData>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: {
      client_type: ClientType.COMPANY,
      status: ClientStatus.LEAD,
      preferred_language: 'es',
      preferred_currency: 'COP',
      is_active: true,
    },
  })

  const clientType = watch('client_type')

  const onSubmit = async (data: ClientCreateFormData) => {
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

      const newClient = await clientsApi.createClient(submitData)

      toast({
        title: 'Éxito',
        description: 'Cliente creado correctamente',
      })

      router.push(`/clients/${newClient.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.detail || error?.message || 'No se pudo crear el cliente',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/clients')
  }

  return (
    <FormLayout
      title="Nuevo Cliente"
      description="Completa la información del cliente. Los campos marcados con * son obligatorios."
      breadcrumbs={[
        { label: 'Clientes', href: '/clients' },
        { label: 'Nuevo' }
      ]}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={handleCancel}
      submitLabel="Crear Cliente"
      isLoading={isLoading}
    >
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
          <TabsTrigger value="business">Negocio</TabsTrigger>
          <TabsTrigger value="additional">Adicional</TabsTrigger>
        </TabsList>

        {/* BÁSICO */}
        <TabsContent value="basic" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Razón Social *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ej: Acme Corporation S.A."
                error={errors.name?.message}
              />
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
                <p className="text-sm text-error">{errors.client_type.message}</p>
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
              {errors.status && (
                <p className="text-sm text-error">{errors.status.message}</p>
              )}
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
              <Label htmlFor="tax_id">NIT/RNC</Label>
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
                helperText="ID para relacionar con marca/SPA. Debe ser único."
              />
            </div>
          </div>
        </TabsContent>

        {/* CONTACTO */}
        <TabsContent value="contact" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="cliente@empresa.com"
                error={errors.email?.message}
                leftIcon={<Icon name="mail" size="sm" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+57 1 234 5678"
                leftIcon={<Icon name="phone" size="sm" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Móvil</Label>
              <Input
                id="mobile"
                {...register('mobile')}
                placeholder="+57 300 123 4567"
                leftIcon={<Icon name="smartphone" size="sm" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                {...register('website')}
                placeholder="https://www.empresa.com"
                error={errors.website?.message}
                leftIcon={<Icon name="language" size="sm" />}
              />
            </div>

            {/* Address Section */}
            <div className="col-span-2 pt-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Icon name="location_on" className="h-5 w-5" />
                Dirección
              </h3>
            </div>

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
                <div className="col-span-2 pt-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Icon name="person" className="h-5 w-5" />
                    Persona de Contacto
                  </h3>
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
                    error={errors.contact_person_email?.message}
                  />
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
        <TabsContent value="business" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-6">
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
                leftIcon={<Icon name="event" size="sm" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conversion_date">Fecha de Conversión</Label>
              <Input
                id="conversion_date"
                type="date"
                {...register('conversion_date')}
                error={errors.conversion_date?.message}
                leftIcon={<Icon name="event_available" size="sm" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_language">Idioma Preferido</Label>
              <Controller
                name="preferred_language"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                  <Select value={field.value} onValueChange={field.onChange}>
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
        <TabsContent value="additional" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                {...register('linkedin_url')}
                placeholder="https://linkedin.com/company/empresa"
                error={errors.linkedin_url?.message}
                leftIcon={<Icon name="share" size="sm" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter_handle">Twitter Handle</Label>
              <Input
                id="twitter_handle"
                {...register('twitter_handle')}
                placeholder="@empresa"
                leftIcon={<Icon name="share" size="sm" />}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="importante, cliente-vip, tecnología"
                helperText="Separa los tags con comas"
                leftIcon={<Icon name="label" size="sm" />}
              />
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
    </FormLayout>
  )
}
