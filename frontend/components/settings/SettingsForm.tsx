'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAdminSettings } from '@/hooks/useAdminSettings'
import type { SettingsFormData } from '@/types/admin'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, X, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Validation schema
const settingsFormSchema = z.object({
  company_name: z.string().min(2, 'Nombre muy corto'),
  domain: z.string().optional(),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  currency: z.string().optional(),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

// Timezone options
const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Lima', label: 'Lima (PET)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

// Date format options
const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY (31-Dec-2024)' },
]

// Currency options
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - Dólar Estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - Libra Esterlina' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'PEN', label: 'PEN - Sol Peruano' },
  { value: 'BRL', label: 'BRL - Real Brasileño' },
  { value: 'ARS', label: 'ARS - Peso Argentino' },
  { value: 'CLP', label: 'CLP - Peso Chileno' },
]

/**
 * SettingsForm Component
 * Form for managing tenant settings
 *
 * Features:
 * - Load and update tenant settings
 * - Logo URL with preview
 * - Timezone, date format, and currency selection
 * - Loading states and error handling
 * - Toast notifications
 */
export function SettingsForm() {
  const { toast } = useToast()
  const { settings, isLoading, error, updateSettings, refresh } = useAdminSettings()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    watch,
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      company_name: '',
      domain: '',
      logo_url: '',
      timezone: 'UTC',
      date_format: 'DD/MM/YYYY',
      currency: 'USD',
    },
  })

  const logoUrl = watch('logo_url')

  // Load settings when component mounts or settings change
  useEffect(() => {
    if (settings) {
      reset({
        company_name: settings.company_name,
        domain: settings.domain || '',
        logo_url: settings.logo_url || '',
        timezone: settings.timezone || 'UTC',
        date_format: settings.date_format || 'DD/MM/YYYY',
        currency: settings.currency || 'USD',
      })
    }
  }, [settings, reset])

  // Track changes
  useEffect(() => {
    setHasChanges(isDirty)
  }, [isDirty])

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setIsSubmitting(true)

      await updateSettings({
        company_name: data.company_name,
        domain: data.domain || null,
        logo_url: data.logo_url || null,
        timezone: data.timezone || null,
        date_format: data.date_format || null,
        currency: data.currency || null,
      })

      toast({
        title: 'Éxito',
        description: 'Configuración actualizada correctamente',
      })

      setHasChanges(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.detail || 'No se pudo actualizar la configuración',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (settings) {
      reset({
        company_name: settings.company_name,
        domain: settings.domain || '',
        logo_url: settings.logo_url || '',
        timezone: settings.timezone || 'UTC',
        date_format: settings.date_format || 'DD/MM/YYYY',
        currency: settings.currency || 'USD',
      })
      setHasChanges(false)
    }
  }

  if (isLoading && !settings) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error al cargar configuración</p>
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="mt-2"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración General</CardTitle>
        <CardDescription>
          Administra la información y preferencias de tu organización
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Company Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Información de la Empresa
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="company_name">Nombre de la Empresa *</Label>
                <Input
                  id="company_name"
                  {...register('company_name')}
                  placeholder="Acme Corporation"
                  disabled={isSubmitting}
                />
                {errors.company_name && (
                  <p className="text-sm text-red-600">{errors.company_name.message}</p>
                )}
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="domain">Dominio</Label>
                <Input
                  id="domain"
                  {...register('domain')}
                  placeholder="acme.com"
                  disabled={isSubmitting}
                />
                {errors.domain && (
                  <p className="text-sm text-red-600">{errors.domain.message}</p>
                )}
              </div>

              {/* Logo URL */}
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input
                  id="logo_url"
                  {...register('logo_url')}
                  placeholder="https://example.com/logo.png"
                  disabled={isSubmitting}
                />
                {errors.logo_url && (
                  <p className="text-sm text-red-600">{errors.logo_url.message}</p>
                )}
              </div>

              {/* Logo Preview */}
              {logoUrl && (
                <div className="col-span-2 space-y-2">
                  <Label>Vista Previa del Logo</Label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
                    <Avatar className="h-16 w-16 rounded-none">
                      <AvatarImage src={logoUrl} alt="Logo preview" />
                      <AvatarFallback className="rounded-none bg-slate-200">
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground">
                      Asegúrate de que la URL sea accesible públicamente
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Regional Preferences Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Preferencias Regionales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona Horaria</Label>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Seleccionar zona horaria" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Date Format */}
              <div className="space-y-2">
                <Label htmlFor="date_format">Formato de Fecha</Label>
                <Controller
                  name="date_format"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="date_format">
                        <SelectValue placeholder="Seleccionar formato" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMAT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Currency */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* System Information (Read-only) */}
          {settings && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Información del Sistema
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Plan de Suscripción</p>
                  <p className="font-medium">{settings.subscription_plan}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="font-medium">
                    {settings.is_active ? (
                      <span className="text-green-600">Activo</span>
                    ) : (
                      <span className="text-red-600">Inactivo</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Creado</p>
                  <p className="font-medium">
                    {new Date(settings.created_at).toLocaleDateString('es', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última Actualización</p>
                  <p className="font-medium">
                    {new Date(settings.updated_at).toLocaleDateString('es', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t bg-slate-50/50 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges || isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={!hasChanges || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!isSubmitting && <Save className="h-4 w-4 mr-2" />}
            Guardar Cambios
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
