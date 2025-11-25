'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Trophy } from 'lucide-react'
import type { TopClientsData } from '@/types/dashboard'

interface TopClientsWidgetProps {
  data: TopClientsData
}

/**
 * Top Clients Widget
 * Displays ranked list of best clients
 */
export function TopClientsWidget({ data }: TopClientsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Clientes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Los {data.clients.length} mejores clientes por ingresos
        </p>
      </CardHeader>
      <CardContent>
        {data.clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay datos disponibles
          </p>
        ) : (
          <div className="space-y-4">
            {data.clients.map((client, index) => (
              <div
                key={client.client_id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-100 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{client.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.quote_count} cotización{client.quote_count !== 1 && 'es'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {formatCurrency(client.total_revenue)}
                  </p>
                  {client.last_quote_date && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(client.last_quote_date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
