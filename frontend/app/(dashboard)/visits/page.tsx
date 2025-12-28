/**
 * Visits and Calls Page V2
 * Manage client visits and phone calls
 * Updated with Design System V2
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'
import { useVisits, useCalls } from '@/hooks/useVisitsEnhanced'
import { useSeedDefaultTopics } from '@/hooks/useVisitTopics'
import { formatDateTime, formatDate } from '@/lib/utils'

export default function VisitsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('visits')
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: '',
    location: ''
  })

  // Visits data
  const { data: visitsData, isLoading: visitsLoading, refetch: refetchVisits } = useVisits({
    status: filters.status || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    page: 1,
    page_size: 20
  })

  // Calls data
  const { data: callsData, isLoading: callsLoading, refetch: refetchCalls } = useCalls({
    status: filters.status || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    page: 1,
    page_size: 20
  })

  // Seed default topics mutation
  const seedTopics = useSeedDefaultTopics()

  const handleSeedTopics = async () => {
    if (confirm('¿Deseas crear los temas de visita predefinidos?')) {
      await seedTopics.mutateAsync()
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any; icon: string }> = {
      completed: { label: 'Completada', variant: 'default', icon: 'check_circle' },
      scheduled: { label: 'Programada', variant: 'secondary', icon: 'event' },
      in_progress: { label: 'En progreso', variant: 'default', icon: 'schedule' },
      cancelled: { label: 'Cancelada', variant: 'destructive', icon: 'cancel' },
    }

    const config = statusMap[status] || { label: status, variant: 'secondary', icon: 'error' }

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon name={config.icon} className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <PageLayout
      title="Visitas y Llamadas"
      description="Gestiona tus visitas a clientes y llamadas telefónicas"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedTopics}
            disabled={seedTopics.isPending}
            leftIcon={seedTopics.isPending ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="auto_awesome" />}
          >
            {seedTopics.isPending ? 'Creando...' : 'Crear Temas Predefinidos'}
          </Button>
          <Button
            onClick={() => router.push('/visits/new')}
            leftIcon={<Icon name="add" />}
          >
            Nueva Visita
          </Button>
        </div>
      }
    >

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon name="filter_list" className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Programada</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                type="text"
                placeholder="Ciudad, país..."
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha fin</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({ status: '', start_date: '', end_date: '', location: '' })}
            >
              Limpiar
            </Button>
            <Button
              onClick={() => activeTab === 'visits' ? refetchVisits() : refetchCalls()}
              leftIcon={<Icon name="filter_list" />}
            >
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="visits" className="flex items-center gap-2">
            <Icon name="place" className="h-4 w-4" />
            Visitas {visitsData?.total ? `(${visitsData.total})` : ''}
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Icon name="phone" className="h-4 w-4" />
            Llamadas {callsData?.total ? `(${callsData.total})` : ''}
          </TabsTrigger>
        </TabsList>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-4 mt-6">
          {visitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="progress_activity" className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : visitsData && visitsData.items.length > 0 ? (
            <div className="grid gap-4">
              {visitsData.items.map((visit) => (
                <Card key={visit.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{visit.title}</h3>
                            {visit.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {visit.description}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(visit.status)}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Icon name="business" className="h-4 w-4 text-muted-foreground" />
                            <span>{visit.client?.name || 'Sin cliente'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Icon name="event" className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDateTime(visit.visit_date)}</span>
                          </div>

                          {visit.contact_person_name && (
                            <div className="flex items-center gap-2">
                              <Icon name="person" className="h-4 w-4 text-muted-foreground" />
                              <span>{visit.contact_person_name}</span>
                            </div>
                          )}

                          {visit.duration_minutes && (
                            <div className="flex items-center gap-2">
                              <Icon name="schedule" className="h-4 w-4 text-muted-foreground" />
                              <span>{visit.duration_minutes} min</span>
                            </div>
                          )}
                        </div>

                        {/* Location */}
                        {(visit.location || visit.address) && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Icon name="place" className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{visit.location || visit.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/visits/${visit.id}`}>Ver detalles</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon name="place" className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No hay visitas registradas</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comienza registrando tu primera visita a un cliente
                </p>
                <Button
                  onClick={() => router.push('/visits/new')}
                  leftIcon={<Icon name="add" />}
                >
                  Nueva Visita
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls" className="space-y-4 mt-6">
          {callsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="progress_activity" className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : callsData && callsData.items.length > 0 ? (
            <div className="grid gap-4">
              {callsData.items.map((call) => (
                <Card key={call.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{call.title || 'Llamada sin título'}</h3>
                            {call.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {call.notes}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(call.status)}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Icon name="business" className="h-4 w-4 text-muted-foreground" />
                            <span>{call.client?.name || 'Sin cliente'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Icon name="event" className="h-4 w-4 text-muted-foreground" />
                            <span>{call.call_date ? formatDateTime(call.call_date) : 'Sin fecha'}</span>
                          </div>

                          {call.duration_minutes && (
                            <div className="flex items-center gap-2">
                              <Icon name="schedule" className="h-4 w-4 text-muted-foreground" />
                              <span>{call.duration_minutes} min</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/calls/${call.id}`}>Ver detalles</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon name="phone" className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No hay llamadas registradas</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comienza registrando tu primera llamada a un cliente
                </p>
                <Button
                  onClick={() => router.push('/calls/new')}
                  leftIcon={<Icon name="add" />}
                >
                  Nueva Llamada
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
