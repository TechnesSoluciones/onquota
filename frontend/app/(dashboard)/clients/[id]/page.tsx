'use client'

/**
 * Client Detail Page V2
 * Displays detailed information about a client
 * Updated with Design System V2
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { clientsApi } from '@/lib/api/clients'
import type { ClientResponse } from '@/types/client'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
  INDUSTRY_LABELS
} from '@/constants/client'
import { ClientSPAManager } from '@/components/clients/ClientSPAManager'
import { ClientLTAManager } from '@/components/clients/ClientLTAManager'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [client, setClient] = useState<ClientResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadClient = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await clientsApi.getClient(params.id as string)
      setClient(data)
    } catch (err: any) {
      setError(err?.detail || 'Error al cargar el cliente')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadClient()
  }, [loadClient])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setIsDeleting(true)
      await clientsApi.deleteClient(params.id as string)
      router.push('/clients')
    } catch (err: any) {
      alert(err?.detail || 'Error al eliminar el cliente')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout title="Perfil del Cliente" description="Cargando información...">
        <LoadingState message="Cargando información del cliente..." />
      </PageLayout>
    )
  }

  if (error || !client) {
    return (
      <PageLayout title="Perfil del Cliente" description="Error al cargar">
        <div className="text-center py-12">
          <Icon name="error" className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-error mb-4">{error || 'Cliente no encontrado'}</p>
          <Button asChild>
            <Link href="/clients">Volver a Clientes</Link>
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={client.name}
      description={`${CLIENT_TYPE_LABELS[client.client_type]}${client.tax_id ? ` • NIT: ${client.tax_id}` : ''}`}
      breadcrumbs={[
        { label: 'Clientes', href: '/clients' },
        { label: client.name }
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clients/${client.id}/edit`}>
              <Icon name="edit" size="sm" className="mr-2" />
              Editar
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            <Icon name="delete" size="sm" className="mr-2" />
            Eliminar
          </Button>
        </div>
      }
    >

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Principal */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{client.name}</CardTitle>
                <div className="mt-2">
                  <Badge className={CLIENT_STATUS_COLORS[client.status]}>
                    {CLIENT_STATUS_LABELS[client.status]}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información de Contacto */}
            <div>
              <h3 className="font-semibold mb-3">Información de Contacto</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {client.email && (
                  <div className="flex items-start gap-3">
                    <Icon name="mail" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Email</p>
                      <a href={`mailto:${client.email}`} className="font-medium hover:underline text-primary">
                        {client.email}
                      </a>
                    </div>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-start gap-3">
                    <Icon name="phone" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Teléfono</p>
                      <a href={`tel:${client.phone}`} className="font-medium hover:underline text-primary">
                        {client.phone}
                      </a>
                    </div>
                  </div>
                )}

                {client.mobile && (
                  <div className="flex items-start gap-3">
                    <Icon name="smartphone" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Móvil</p>
                      <a href={`tel:${client.mobile}`} className="font-medium hover:underline text-primary">
                        {client.mobile}
                      </a>
                    </div>
                  </div>
                )}

                {client.website && (
                  <div className="flex items-start gap-3">
                    <Icon name="language" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Sitio Web</p>
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline text-primary"
                      >
                        {client.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800" />

            {/* Dirección */}
            {(client.address_line1 || client.city) && (
              <>
                <div>
                  <h3 className="font-semibold mb-3">Dirección</h3>
                  <div className="flex items-start gap-3">
                    <Icon name="location_on" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      {client.address_line1 && <p className="font-medium">{client.address_line1}</p>}
                      {client.address_line2 && <p className="text-neutral-500 dark:text-neutral-400">{client.address_line2}</p>}
                      <p className="text-neutral-500 dark:text-neutral-400">
                        {[client.city, client.state, client.postal_code, client.country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-neutral-200 dark:border-neutral-800" />
              </>
            )}

            {/* Información de Negocio */}
            <div>
              <h3 className="font-semibold mb-3">Información de Negocio</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {client.industry && (
                  <div className="flex items-start gap-3">
                    <Icon name="business_center" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Industria</p>
                      <p className="font-medium">{INDUSTRY_LABELS[client.industry]}</p>
                    </div>
                  </div>
                )}

                {client.lead_source && (
                  <div className="flex items-start gap-3">
                    <Icon name="label" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Fuente del Lead</p>
                      <p className="font-medium">{client.lead_source}</p>
                    </div>
                  </div>
                )}

                {client.first_contact_date && (
                  <div className="flex items-start gap-3">
                    <Icon name="event" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Primer Contacto</p>
                      <p className="font-medium">{formatDate(client.first_contact_date)}</p>
                    </div>
                  </div>
                )}

                {client.conversion_date && (
                  <div className="flex items-start gap-3">
                    <Icon name="event_available" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Fecha de Conversión</p>
                      <p className="font-medium">{formatDate(client.conversion_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Persona de Contacto */}
            {client.contact_person_name && (
              <>
                <div className="border-t border-neutral-200 dark:border-neutral-800" />
                <div>
                  <h3 className="font-semibold mb-3">Persona de Contacto</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Icon name="person" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Nombre</p>
                        <p className="font-medium">{client.contact_person_name}</p>
                      </div>
                    </div>

                    {client.contact_person_email && (
                      <div className="flex items-start gap-3">
                        <Icon name="mail" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Email</p>
                          <a
                            href={`mailto:${client.contact_person_email}`}
                            className="font-medium hover:underline text-primary"
                          >
                            {client.contact_person_email}
                          </a>
                        </div>
                      </div>
                    )}

                    {client.contact_person_phone && (
                      <div className="flex items-start gap-3">
                        <Icon name="phone" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Teléfono</p>
                          <a
                            href={`tel:${client.contact_person_phone}`}
                            className="font-medium hover:underline text-primary"
                          >
                            {client.contact_person_phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Redes Sociales */}
            {(client.linkedin_url || client.twitter_handle) && (
              <>
                <div className="border-t border-neutral-200 dark:border-neutral-800" />
                <div>
                  <h3 className="font-semibold mb-3">Redes Sociales</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {client.linkedin_url && (
                      <div className="flex items-start gap-3">
                        <Icon name="share" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">LinkedIn</p>
                          <a
                            href={client.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline text-primary"
                          >
                            Ver perfil
                          </a>
                        </div>
                      </div>
                    )}

                    {client.twitter_handle && (
                      <div className="flex items-start gap-3">
                        <Icon name="share" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Twitter</p>
                          <p className="font-medium">{client.twitter_handle}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Notas */}
            {client.notes && (
              <>
                <div className="border-t border-neutral-200 dark:border-neutral-800" />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Icon name="description" className="h-5 w-5" />
                    Notas
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{client.notes}</p>
                </div>
              </>
            )}

            {/* Tags */}
            {client.tags && (
              <>
                <div className="border-t border-neutral-200 dark:border-neutral-800" />
                <div>
                  <h3 className="font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {client.tags.split(',').map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Información Adicional */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Idioma Preferido</p>
                <p className="font-medium">{client.preferred_language?.toUpperCase() || 'N/A'}</p>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800" />
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Moneda Preferida</p>
                <p className="font-medium">{client.preferred_currency || 'N/A'}</p>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800" />
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Estado</p>
                <p className="font-medium">{client.is_active ? 'Activo' : 'Inactivo'}</p>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800" />
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Registrado</p>
                <p className="font-medium">{formatDateTime(client.created_at)}</p>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800" />
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Última Actualización</p>
                <p className="font-medium">{formatDateTime(client.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SPA and LTA Management Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* SPA Manager */}
        <ClientSPAManager clientId={client.id} bpid={client.bpid} />

        {/* LTA Manager */}
        <ClientLTAManager clientId={client.id} bpid={client.bpid} />
      </div>
    </PageLayout>
  )
}
