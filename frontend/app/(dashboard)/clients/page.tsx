'use client'

import { useState } from 'react'
import { useClients } from '@/hooks/useClients'
import { ClientFilters } from '@/components/clients/ClientFilters'
import { CreateClientModal } from '@/components/clients/CreateClientModal'
import { EditClientModal } from '@/components/clients/EditClientModal'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, AlertCircle, Edit, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
} from '@/constants/client'
import type { ClientResponse } from '@/types/client'
import Link from 'next/link'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tu cartera de clientes y prospectos
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <ClientFilters
        filters={filters}
        onFilterChange={updateFilters}
        onClear={clearFilters}
      />

      {/* Lista de Clientes */}
      <div className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error al cargar clientes</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron clientes</p>
            {Object.keys(filters).length > 0 && (
              <Button
                variant="link"
                onClick={clearFilters}
                className="mt-2"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <div className="font-medium text-slate-900">{client.name}</div>
                          {client.tax_id && (
                            <div className="text-muted-foreground text-xs">
                              NIT: {client.tax_id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {CLIENT_TYPE_LABELS[client.client_type]}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          {client.email && (
                            <div className="text-slate-900">{client.email}</div>
                          )}
                          {client.phone && (
                            <div className="text-muted-foreground text-xs">
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={CLIENT_STATUS_COLORS[client.status]}
                        >
                          {CLIENT_STATUS_LABELS[client.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2 flex justify-end">
                        <Link href={`/clients/${client.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client)
                            setEditModalOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {clients.length === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1} a{' '}
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
                  >
                    Anterior
                  </Button>
                  <span className="text-sm whitespace-nowrap">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
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
    </div>
  )
}
