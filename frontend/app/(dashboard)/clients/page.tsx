'use client'

/**
 * Clients List Page V2
 * Displays all clients with filters, pagination, and CRUD operations
 * Updated with Design System V2
 */

import { useState } from 'react'
import Link from 'next/link'
import { useClients } from '@/hooks/useClients'
import { ClientFilters } from '@/components/clients/ClientFilters'
import { CreateClientModal } from '@/components/clients/CreateClientModal'
import { EditClientModal } from '@/components/clients/EditClientModal'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState, EmptyState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { formatDate } from '@/lib/utils'
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
} from '@/constants/client'
import type { ClientResponse } from '@/types/client'

export default function ClientsPage() {
  const {
    clients,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  } = useClients()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientResponse | null>(null)

  return (
    <PageLayout
      title="Clientes"
      description="Gestiona tu cartera de clientes y prospectos"
      actions={
        <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Icon name="add" />}>
          Nuevo Cliente
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filtros */}
        <ClientFilters
          filters={filters}
          onFilterChange={updateFilters}
          onClear={clearFilters}
        />

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
            <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error">Error al cargar clientes</p>
              <p className="text-sm text-error/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <LoadingState message="Cargando clientes..." />
        ) : clients.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon="person"
            title="No hay clientes"
            description={
              Object.keys(filters).length > 0
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'Comienza agregando tu primer cliente'
            }
            action={
              Object.keys(filters).length > 0
                ? { label: 'Limpiar filtros', onClick: clearFilters }
                : { label: 'Nuevo Cliente', onClick: () => setCreateModalOpen(true) }
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {client.name}
                        </div>
                        {client.tax_id && (
                          <div className="text-neutral-500 dark:text-neutral-400 text-xs">
                            NIT: {client.tax_id}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{CLIENT_TYPE_LABELS[client.client_type]}</TableCell>
                    <TableCell>
                      <div>
                        {client.email && (
                          <div className="text-neutral-900 dark:text-white">{client.email}</div>
                        )}
                        {client.phone && (
                          <div className="text-neutral-500 dark:text-neutral-400 text-xs">
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CLIENT_STATUS_COLORS[client.status]}>
                        {CLIENT_STATUS_LABELS[client.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-500 dark:text-neutral-400">
                      {formatDate(client.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/clients/${client.id}`}>
                            <Icon name="visibility" size="sm" className="mr-2" />
                            Ver
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client)
                            setEditModalOpen(true)
                          }}
                        >
                          <Icon name="edit" size="sm" className="mr-2" />
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Mostrando{' '}
                {clients.length === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1} a{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total)} de{' '}
                {pagination.total} clientes
              </div>
              {pagination.pages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    leftIcon={<Icon name="chevron_left" size="sm" />}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    rightIcon={<Icon name="chevron_right" size="sm" />}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Client Modal */}
      <CreateClientModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => refresh()}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        client={selectedClient}
        onSuccess={() => {
          refresh()
          setSelectedClient(null)
        }}
      />
    </PageLayout>
  )
}
