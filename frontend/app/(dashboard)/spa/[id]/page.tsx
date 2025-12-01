'use client'

import { useRouter } from 'next/navigation'
import { useSingleSPA } from '@/hooks/useSPAs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Trash2, User } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SPADetailPageProps {
  params: {
    id: string
  }
}

export default function SPADetailPage({ params }: SPADetailPageProps) {
  const router = useRouter()
  const { spa, loading, deleteSPAById } = useSingleSPA(params.id)

  const handleDelete = async () => {
    const success = await deleteSPAById()
    if (success) {
      router.push('/spa')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
          <div className="h-8 flex-1 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!spa) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/spa">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">SPA no encontrado</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = () => {
    if (spa.status === 'active') {
      return <Badge className="bg-green-500">Activo</Badge>
    } else if (spa.status === 'pending') {
      return <Badge className="bg-blue-500">Pendiente</Badge>
    } else {
      return <Badge variant="secondary">Expirado</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/spa">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {spa.article_number}
              </h1>
              {getStatusBadge()}
            </div>
            <p className="text-muted-foreground">{spa.article_description || 'Sin descripción'}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el SPA permanentemente. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">BPID</p>
              <p className="text-lg font-semibold">{spa.bpid}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ship To Name</p>
              <p className="text-lg">{spa.ship_to_name}</p>
            </div>
            {spa.client_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre del Cliente</p>
                <p className="text-lg">{spa.client_name}</p>
              </div>
            )}
            {spa.client_email && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email del Cliente</p>
                <p className="text-lg">{spa.client_email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Número de Artículo</p>
              <p className="text-lg font-mono font-semibold">{spa.article_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Descripción</p>
              <p className="text-lg">{spa.article_description || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unidad de Medida</p>
              <p className="text-lg">{spa.uom}</p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Precios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Precio de Lista</p>
              <p className="text-2xl font-bold">{formatCurrency(Number(spa.list_price))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Precio Neto Aplicado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(Number(spa.app_net_price))}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Descuento</p>
              <p className="text-3xl font-bold text-orange-600">
                {Number(spa.discount_percent).toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Validity Info */}
        <Card>
          <CardHeader>
            <CardTitle>Vigencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de Inicio</p>
              <p className="text-lg font-semibold">{formatDate(spa.start_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de Fin</p>
              <p className="text-lg font-semibold">{formatDate(spa.end_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estado Actual</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Actualmente Vigente</p>
              <p className="text-lg">
                {spa.is_currently_valid ? (
                  <Badge className="bg-green-500">Sí</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Batch ID</p>
              <p className="text-sm font-mono">{spa.batch_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Creado</p>
              <p className="text-sm">{formatDate(spa.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID del SPA</p>
              <p className="text-sm font-mono">{spa.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
