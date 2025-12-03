'use client'

import { useState } from 'react'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import type { AuditLogResponse } from '@/types/admin'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  AlertCircle,
  Filter,
  Copy,
  CheckCircle2,
  FileText,
  User,
  Calendar,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

// Action color mapping
const ACTION_COLORS: Record<string, string> = {
  'user.created': 'bg-green-100 text-green-800 border-green-200',
  'user.updated': 'bg-blue-100 text-blue-800 border-blue-200',
  'user.deleted': 'bg-red-100 text-red-800 border-red-200',
  'tenant.settings_updated': 'bg-orange-100 text-orange-800 border-orange-200',
  'auth.login': 'bg-gray-100 text-gray-800 border-gray-200',
  'auth.logout': 'bg-gray-100 text-gray-800 border-gray-200',
  'client.created': 'bg-green-100 text-green-800 border-green-200',
  'client.updated': 'bg-blue-100 text-blue-800 border-blue-200',
  'client.deleted': 'bg-red-100 text-red-800 border-red-200',
  'sale.created': 'bg-green-100 text-green-800 border-green-200',
  'sale.updated': 'bg-blue-100 text-blue-800 border-blue-200',
  'expense.created': 'bg-green-100 text-green-800 border-green-200',
  'expense.updated': 'bg-blue-100 text-blue-800 border-blue-200',
}

// Common actions for filtering
const COMMON_ACTIONS = [
  { value: 'user.created', label: 'Usuario Creado' },
  { value: 'user.updated', label: 'Usuario Actualizado' },
  { value: 'user.deleted', label: 'Usuario Eliminado' },
  { value: 'tenant.settings_updated', label: 'Configuración Actualizada' },
  { value: 'auth.login', label: 'Inicio de Sesión' },
  { value: 'auth.logout', label: 'Cierre de Sesión' },
  { value: 'client.created', label: 'Cliente Creado' },
  { value: 'client.updated', label: 'Cliente Actualizado' },
  { value: 'sale.created', label: 'Venta Creada' },
  { value: 'expense.created', label: 'Gasto Creado' },
]

// Resource types for filtering
const RESOURCE_TYPES = [
  { value: 'user', label: 'Usuario' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'client', label: 'Cliente' },
  { value: 'sale', label: 'Venta' },
  { value: 'expense', label: 'Gasto' },
  { value: 'opportunity', label: 'Oportunidad' },
  { value: 'visit', label: 'Visita' },
]

/**
 * AuditLogsTable Component
 * Table for displaying audit logs with filtering and pagination
 *
 * Features:
 * - Advanced filtering (action, resource type, date range, search)
 * - Paginated results
 * - View changes dialog with JSON formatting
 * - Copy to clipboard functionality
 * - Color-coded action badges
 */
export function AuditLogsTable() {
  const { toast } = useToast()
  const {
    logs,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
  } = useAuditLogs()

  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null)
  const [changesDialogOpen, setChangesDialogOpen] = useState(false)
  const [copiedChanges, setCopiedChanges] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchInput || null })
  }

  const handleOpenChanges = (log: AuditLogResponse) => {
    setSelectedLog(log)
    setChangesDialogOpen(true)
    setCopiedChanges(false)
  }

  const handleCopyChanges = async () => {
    if (!selectedLog) return

    try {
      const changesJson = JSON.stringify(selectedLog.changes, null, 2)
      await navigator.clipboard.writeText(changesJson)
      setCopiedChanges(true)
      toast({
        title: 'Copiado',
        description: 'Cambios copiados al portapapeles',
      })
      setTimeout(() => setCopiedChanges(false), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles',
        variant: 'destructive',
      })
    }
  }

  const getActionColor = (action: string): string => {
    return ACTION_COLORS[action] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatActionLabel = (action: string): string => {
    const parts = action.split('.')
    if (parts.length === 2) {
      const [resource, actionType] = parts
      const actionLabels: Record<string, string> = {
        created: 'Creado',
        updated: 'Actualizado',
        deleted: 'Eliminado',
        login: 'Login',
        logout: 'Logout',
        settings_updated: 'Config. Actualizada',
      }
      return `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${
        actionLabels[actionType] || actionType
      }`
    }
    return action
  }

  const hasActiveFilters =
    filters.action ||
    filters.resource_type ||
    filters.start_date ||
    filters.end_date ||
    filters.search

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Logs de Auditoría</h2>
          <p className="text-sm text-muted-foreground">
            Registro de todas las acciones realizadas en el sistema
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              {/* Action Filter */}
              <div className="space-y-2">
                <Label>Acción</Label>
                <Select
                  value={filters.action || 'all'}
                  onValueChange={(value) =>
                    updateFilters({ action: value === 'all' ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    {COMMON_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource Type Filter */}
              <div className="space-y-2">
                <Label>Tipo de Recurso</Label>
                <Select
                  value={filters.resource_type || 'all'}
                  onValueChange={(value) =>
                    updateFilters({ resource_type: value === 'all' ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Fecha Desde</Label>
                <Input
                  type="date"
                  value={filters.start_date || ''}
                  onChange={(e) =>
                    updateFilters({ start_date: e.target.value || null })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Hasta</Label>
                <Input
                  type="date"
                  value={filters.end_date || ''}
                  onChange={(e) =>
                    updateFilters({ end_date: e.target.value || null })
                  }
                />
              </div>
            </div>
          )}
        </form>

        {hasActiveFilters && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pagination.total} logs encontrados
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error al cargar logs</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron logs</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Acción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Recurso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(log.created_at)}
                        </div>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {log.user_name || 'Sistema'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.user_email || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={getActionColor(log.action)}
                        >
                          {formatActionLabel(log.action)}
                        </Badge>
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-slate-900">
                            {log.resource_type}
                          </div>
                          {log.resource_id && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {log.resource_id.slice(0, 8)}...
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-md truncate">
                        {log.description || '-'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {Object.keys(log.changes || {}).length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenChanges(log)}
                          >
                            Ver Cambios
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando{' '}
                  {logs.length === 0
                    ? 0
                    : (pagination.page - 1) * pagination.page_size + 1}{' '}
                  a {Math.min(pagination.page * pagination.page_size, pagination.total)}{' '}
                  de {pagination.total} logs
                </div>
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
                    Página {pagination.page} de {pagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.total_pages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Changes Dialog */}
      <Dialog open={changesDialogOpen} onOpenChange={setChangesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalles de Cambios</DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <>
                  <span className="font-medium">{formatActionLabel(selectedLog.action)}</span>
                  {' • '}
                  {formatDateTime(selectedLog.created_at)}
                  {selectedLog.user_name && ` • Por ${selectedLog.user_name}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Copy Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyChanges}
                disabled={copiedChanges}
              >
                {copiedChanges ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar JSON
                  </>
                )}
              </Button>
            </div>

            {/* JSON Display */}
            <div className="relative">
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-[50vh] overflow-y-auto">
                {selectedLog &&
                  JSON.stringify(selectedLog.changes, null, 2)}
              </pre>
            </div>

            {/* Additional Info */}
            {selectedLog && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="font-medium">{selectedLog.ip_address || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User Agent</p>
                  <p className="font-medium truncate" title={selectedLog.user_agent || '-'}>
                    {selectedLog.user_agent || '-'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
