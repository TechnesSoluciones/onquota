/**
 * AnalysisResults Component
 * Complete dashboard view for analysis results
 */

'use client'

import { AnalysisResults as AnalysisResultsType } from '@/types/analytics'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { ABCChart } from './ABCChart'
import { TopProductsTable } from './TopProductsTable'
import { DiscountAnalysis } from './DiscountAnalysis'
import { MonthlyTrends } from './MonthlyTrends'
import { format } from 'date-fns'

interface AnalysisResultsProps {
  results: AnalysisResultsType
  jobId: string
  onExportExcel?: () => void
  onExportPDF?: () => void
  isExporting?: boolean
}

export function AnalysisResults({
  results,
  jobId,
  onExportExcel,
  onExportPDF,
  isExporting = false,
}: AnalysisResultsProps) {
  const { summary, abc_classification, top_products, discount_analysis, monthly_trends } = results

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analysis Results</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(summary.date_range.start), 'MMM dd, yyyy')} -{' '}
            {format(new Date(summary.date_range.end), 'MMM dd, yyyy')}
          </p>
        </div>

        <div className="flex gap-2">
          {onExportExcel && (
            <Button
              variant="outline"
              onClick={onExportExcel}
              disabled={isExporting}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          )}
          {onExportPDF && (
            <Button
              variant="outline"
              onClick={onExportPDF}
              disabled={isExporting}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Sales
            </p>
            <p className="text-3xl font-bold">
              ${summary.total_sales.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              Across all products
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Quantity
            </p>
            <p className="text-3xl font-bold">
              {summary.total_quantity.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Units sold
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Unique Products
            </p>
            <p className="text-3xl font-bold">
              {summary.unique_products.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              SKUs analyzed
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Average Ticket
            </p>
            <p className="text-3xl font-bold">
              ${summary.avg_ticket.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </div>
        </Card>
      </div>

      {/* ABC Classification Chart */}
      <ABCChart data={abc_classification} />

      {/* Top Products Table */}
      <TopProductsTable products={top_products} limit={15} />

      {/* Discount Analysis */}
      {discount_analysis && (
        <DiscountAnalysis data={discount_analysis} />
      )}

      {/* Monthly Trends */}
      {monthly_trends && monthly_trends.length > 0 && (
        <MonthlyTrends data={monthly_trends} />
      )}

      {/* Download Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Export Results</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Download the complete analysis in your preferred format
            </p>
          </div>
          <div className="flex gap-2">
            {onExportExcel && (
              <Button onClick={onExportExcel} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
            )}
            {onExportPDF && (
              <Button
                variant="outline"
                onClick={onExportPDF}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
