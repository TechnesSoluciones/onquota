'use client'

import { useState, memo, useMemo, useCallback } from 'react'
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

/**
 * Memoized row component for individual SPA entries
 */
const SPATableRow = memo(function SPATableRow({
  spa,
  onDeleteClick,
}: {
  spa: SPAAgreement
  onDeleteClick?: (id: string) => void
}) {
  // Memoize status badge computation
  const statusBadge = useMemo(() => {
    if (spa.status === 'active') {
      return <Badge className="bg-green-500">Activo</Badge>
    } else if (spa.status === 'pending') {
      return <Badge className="bg-blue-500">Pendiente</Badge>
    } else {
      return <Badge variant="secondary">Expirado</Badge>
    }
  }, [spa.status])

  // Memoize formatted list price
  const formattedListPrice = useMemo(
    () => formatCurrency(Number(spa.list_price)),
    [spa.list_price]
  )

  // Memoize formatted net price
  const formattedNetPrice = useMemo(
    () => formatCurrency(Number(spa.app_net_price)),
    [spa.app_net_price]
  )

  // Memoize formatted discount
  const formattedDiscount = useMemo(
    () => `${Number(spa.discount_percent).toFixed(2)}%`,
    [spa.discount_percent]
  )

  // Memoize formatted start date
  const formattedStartDate = useMemo(
    () => formatDate(spa.start_date),
    [spa.start_date]
  )

  // Memoize formatted end date
  const formattedEndDate = useMemo(
    () => formatDate(spa.end_date),
    [spa.end_date]
  )

  return (
    <TableRow>
      <TableCell className="font-medium">{spa.bpid}</TableCell>
      <TableCell>{spa.ship_to_name}</TableCell>
      <TableCell className="font-mono text-sm">
        {spa.article_number}
      </TableCell>
      <TableCell className="max-w-xs truncate">
        {spa.article_description || '-'}
      </TableCell>
      <TableCell className="text-right">
        {formattedListPrice}
      </TableCell>
      <TableCell className="text-right">
        {formattedNetPrice}
      </TableCell>
      <TableCell className="text-right font-semibold text-green-600">
        {formattedDiscount}
      </TableCell>
      <TableCell className="text-sm">
        <div>{formattedStartDate}</div>
        <div className="text-muted-foreground">
          {formattedEndDate}
        </div>
      </TableCell>
      <TableCell>{statusBadge}</TableCell>
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
          {onDeleteClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteClick(spa.id)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})

SPATableRow.displayName = 'SPATableRow'

export const SPATable = memo(function SPATable({ spas, loading, onDelete }: SPATableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Memoize delete click handler
  const handleDeleteClick = useCallback((id: string) => {
    setDeleteId(id)
  }, [])

  // Memoize delete confirm handler
  const handleDeleteConfirm = useCallback(async () => {
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
  }, [deleteId, onDelete])

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
                <SPATableRow
                  key={spa.id}
                  spa={spa}
                  onDeleteClick={onDelete ? handleDeleteClick : undefined}
                />
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
})

SPATable.displayName = 'SPATable'
