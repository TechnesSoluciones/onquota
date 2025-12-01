/**
 * ClientSPAManager Component
 * Manages SPAs (Special Price Agreements) for a specific client
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useClientSPAs } from '@/hooks/useSPAs'
import { formatDate } from '@/lib/utils'
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import type { SPAAgreement } from '@/types/spa'

interface ClientSPAManagerProps {
  clientId: string
  bpid?: string | null
}

export function ClientSPAManager({ clientId, bpid }: ClientSPAManagerProps) {
  const { spas, loading, error, fetch, refetch } = useClientSPAs(clientId, false)
  const [showAll, setShowAll] = useState(false)

  /**
   * Get status badge for SPA
   */
  const getStatusBadge = (spa: SPAAgreement) => {
    const today = new Date()
    const endDate = new Date(spa.end_date)
    const daysUntilExpiry = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (spa.status === 'expired') {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expirado
        </Badge>
      )
    } else if (spa.status === 'pending') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>
      )
    } else if (daysUntilExpiry <= 30) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Por vencer ({daysUntilExpiry}d)
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Activo
        </Badge>
      )
    }
  }

  /**
   * Group SPAs by status
   */
  const activeSPAs = spas.filter((spa) => spa.status === 'active')
  const expiringSPAs = spas.filter((spa) => {
    if (spa.status !== 'active') return false
    const today = new Date()
    const endDate = new Date(spa.end_date)
    const daysUntilExpiry = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry <= 30
  })
  const expiredSPAs = spas.filter((spa) => spa.status === 'expired')

  const displaySPAs = showAll ? spas : spas.slice(0, 5)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SPAs (Special Price Agreements)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SPAs (Special Price Agreements)
          </CardTitle>
          <div className="flex items-center gap-2">
            {bpid && (
              <Badge variant="outline" className="text-xs">
                BPID: {bpid}
              </Badge>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/spa">
                Ver todos los SPAs
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {spas.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {activeSPAs.length}
                </p>
                <p className="text-xs text-green-600">Activos</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">
                  {expiringSPAs.length}
                </p>
                <p className="text-xs text-yellow-600">Por vencer</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">
                  {expiredSPAs.length}
                </p>
                <p className="text-xs text-gray-600">Expirados</p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* SPAs List */}
        {spas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay SPAs asociados a este cliente</p>
            <p className="text-sm mt-1">
              Los SPAs se crean automáticamente al subir archivos en el módulo SPA
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displaySPAs.map((spa) => (
                <div
                  key={spa.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">
                          {spa.article_number}
                        </p>
                        {getStatusBadge(spa)}
                      </div>
                      {spa.article_description && (
                        <p className="text-xs text-muted-foreground">
                          {spa.article_description}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-green-600">
                        {spa.discount_percent.toFixed(2)}% OFF
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${spa.app_net_price.toFixed(2)} / {spa.uom}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Válido: {formatDate(spa.start_date)} - {formatDate(spa.end_date)}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                    >
                      <Link href={`/spa/${spa.id}`}>Ver detalle</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Show More/Less Button */}
            {spas.length > 5 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Mostrar todos ({spas.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
