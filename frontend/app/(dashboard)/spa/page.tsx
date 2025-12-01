'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { SPAFilters } from '@/components/spa/SPAFilters'
import { SPATable } from '@/components/spa/SPATable'
import { SPAStats } from '@/components/spa/SPAStats'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useSPAs, useSPAStats } from '@/hooks/useSPAs'
import { Upload, Download } from 'lucide-react'
import Link from 'next/link'
import type { SPASearchParams } from '@/types/spa'

const DEFAULT_FILTERS: SPASearchParams = {
  page: 1,
  limit: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
}

export default function SPAPage() {
  const [filters, setFilters] = useState<SPASearchParams>(DEFAULT_FILTERS)
  const { spas, total, page, limit, pages, loading, fetchSPAs, deleteSPAById, exportToFile } = useSPAs(filters)
  const { stats, loading: statsLoading } = useSPAStats()

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters: Partial<SPASearchParams>) => {
    const updated = { ...filters, ...newFilters, page: 1 }
    setFilters(updated)
    fetchSPAs(updated)
  }, [filters, fetchSPAs])

  /**
   * Clear filters
   */
  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    fetchSPAs(DEFAULT_FILTERS)
  }, [fetchSPAs])

  /**
   * Handle pagination
   */
  const handlePageChange = useCallback((newPage: number) => {
    const updated = { ...filters, page: newPage }
    setFilters(updated)
    fetchSPAs(updated)
  }, [filters, fetchSPAs])

  /**
   * Handle delete
   */
  const handleDelete = useCallback(async (id: string) => {
    const success = await deleteSPAById(id)
    if (success) {
      // Refetch to update the list
      fetchSPAs(filters)
    }
  }, [deleteSPAById, fetchSPAs, filters])

  /**
   * Handle export
   */
  const handleExport = useCallback(async () => {
    await exportToFile(undefined, filters.is_active || false)
  }, [exportToFile, filters.is_active])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SPAs</h1>
          <p className="text-muted-foreground">
            Gestiona los Special Price Agreements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button asChild>
            <Link href="/spa/upload">
              <Upload className="h-4 w-4 mr-2" />
              Cargar archivo
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <SPAStats stats={stats} loading={statsLoading} />

      {/* Filters */}
      <SPAFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Table */}
      <SPATable spas={spas} loading={loading} onDelete={handleDelete} />

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total} registros
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && handlePageChange(page - 1)}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {[...Array(Math.min(5, pages))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => page < pages && handlePageChange(page + 1)}
                  className={page >= pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
