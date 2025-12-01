/**
 * AnalyticsDashboard Component
 * Comprehensive analytics dashboard that integrates all chart components
 * Features date range filtering, export functionality, and responsive layout
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  Download,
  RefreshCw,
  Calendar,
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ABCChart } from './ABCChart'
import { DiscountAnalysis } from './DiscountAnalysis'
import { MonthlyTrends } from './MonthlyTrends'
import { TopProductsTable } from './TopProductsTable'
import type { AnalysisResults } from '@/types/analytics'
import { cn } from '@/lib/utils'

interface AnalyticsDashboardProps {
  analysisId: string
  onExport?: (format: 'excel' | 'pdf') => void
  onRefresh?: () => void
  initialData?: AnalysisResults | null
  loading?: boolean
  error?: string | null
}

export function AnalyticsDashboard({
  analysisId,
  onExport,
  onRefresh,
  initialData = null,
  loading = false,
  error = null,
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalysisResults | null>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null)

  /**
   * Update data when initialData changes
   */
  useEffect(() => {
    if (initialData) {
      setData(initialData)
    }
  }, [initialData])

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return

    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh, isRefreshing])

  /**
   * Handle export
   */
  const handleExport = useCallback(
    async (format: 'excel' | 'pdf') => {
      if (!onExport || isExporting) return

      setIsExporting(format)
      try {
        await onExport(format)
      } finally {
        setIsExporting(null)
      }
    },
    [onExport, isExporting]
  )

  /**
   * Render loading state
   */
  if (loading && !data) {
    return <AnalyticsDashboardLoading />
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Error loading analytics
          </h3>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          {onRefresh && (
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </Card>
    )
  }

  /**
   * Render empty state
   */
  if (!data) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No analytics data available
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Upload a sales file to generate analytics insights.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analysis ID: <span className="font-mono">{analysisId.slice(0, 8)}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')}
              />
              Refresh
            </Button>
          )}

          {/* Export Dropdown */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={isExporting !== null}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${data.summary.total_sales.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {data.summary.total_quantity.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Ticket</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${data.summary.avg_ticket.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-2">
              <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Products</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {data.summary.unique_products.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-2">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Date Range */}
      {data.summary.date_range && (
        <Card className="p-4">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              Analysis Period:{' '}
              <span className="font-medium text-gray-900">
                {format(new Date(data.summary.date_range.start), 'MMM dd, yyyy')}
              </span>{' '}
              to{' '}
              <span className="font-medium text-gray-900">
                {format(new Date(data.summary.date_range.end), 'MMM dd, yyyy')}
              </span>
            </span>
          </div>
        </Card>
      )}

      {/* Charts Grid - 2 columns on desktop, 1 on mobile */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ABC Classification Chart */}
        {data.abc_classification && data.abc_classification.length > 0 && (
          <ABCChart data={data.abc_classification} />
        )}

        {/* Discount Analysis */}
        {data.discount_analysis && (
          <DiscountAnalysis data={data.discount_analysis} />
        )}
      </div>

      {/* Monthly Trends - Full Width */}
      {data.monthly_trends && data.monthly_trends.length > 0 && (
        <MonthlyTrends data={data.monthly_trends} />
      )}

      {/* Top Products Table - Full Width */}
      {data.top_products && data.top_products.length > 0 && (
        <TopProductsTable data={data.top_products} />
      )}
    </div>
  )
}

/**
 * Loading skeleton component
 */
function AnalyticsDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Summary Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </Card>
        ))}
      </div>

      {/* Date Range Skeleton */}
      <Card className="p-4">
        <Skeleton className="mx-auto h-5 w-64" />
      </Card>

      {/* Charts Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="mb-4 h-6 w-32" />
            <Skeleton className="h-[300px] w-full" />
          </Card>
        ))}
      </div>

      {/* Monthly Trends Skeleton */}
      <Card className="p-6">
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="h-[350px] w-full" />
      </Card>

      {/* Table Skeleton */}
      <Card className="p-6">
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="h-[400px] w-full" />
      </Card>
    </div>
  )
}
