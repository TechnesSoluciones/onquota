'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/alert-dialog'
import { Eye, Trash2, Download } from 'lucide-react'
import type { SPAAgreement } from '@/types/spa'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface SPATableProps {
  spas: SPAAgreement[]
  loading?: boolean
  onDelete?: (id: string) => Promise<void>
}

export function SPATable({ spas, loading, onDelete }: SPATableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!deleteId || !onDelete) return

    setDeleting(true)
    try {
      await onDelete(deleteId)
      setDeleteId(null)
    } catch (error) {
      console.error('Error deleting SPA:', error)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (spa: SPAAgreement) => {
    if (spa.status === 'active') {
      return <Badge className="bg-green-500">Activo</Badge>
    } else if (spa.status === 'pending') {
      return <Badge className="bg-blue-500">Pendiente</Badge>
    } else {
      return <Badge variant="secondary">Expirado</Badge>
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (spas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-muted-foreground">No se encontraron SPAs</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BPID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Artículo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Precio Lista</TableHead>
                <TableHead className="text-right">Precio Neto</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spas.map((spa) => (
                <TableRow key={spa.id}>
                  <TableCell className="font-medium">{spa.bpid}</TableCell>
                  <TableCell>{spa.ship_to_name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {spa.article_number}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {spa.article_description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(spa.list_price))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(spa.app_net_price))}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {Number(spa.discount_percent).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{formatDate(spa.start_date)}</div>
                    <div className="text-muted-foreground">
                      {formatDate(spa.end_date)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(spa)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/spa/${spa.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(spa.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el SPA permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
