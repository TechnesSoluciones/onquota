'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Phone, MapPin } from 'lucide-react'

export default function VisitsPage() {
  const [activeTab, setActiveTab] = useState('visits')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Visitas y Llamadas</h1>
        <p className="text-muted-foreground">
          Gestiona tus visitas a clientes y llamadas telefónicas
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="visits" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Visitas
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Llamadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-center text-muted-foreground">
              Lista de visitas - Próximamente
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Funcionalidad de visitas con GPS en desarrollo
            </p>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-center text-muted-foreground">
              Lista de llamadas - Próximamente
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Funcionalidad de seguimiento de llamadas en desarrollo
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
