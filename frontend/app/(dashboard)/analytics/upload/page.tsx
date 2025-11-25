/**
 * Analytics Upload Page
 * Upload sales data for analysis
 */

'use client'

import { useRouter } from 'next/navigation'
import { FileUploadZone } from '@/components/analytics/FileUploadZone'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Package,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

export default function AnalyticsUploadPage() {
  const router = useRouter()

  const handleUploadSuccess = (jobId: string) => {
    // Navigate to the results page
    router.push(`/analytics/${jobId}`)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/analytics">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Sales Data</h1>
          <p className="text-muted-foreground mt-1">
            Upload your sales file to generate ABC analysis and insights
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <FileUploadZone onUploadSuccess={handleUploadSuccess} />

          {/* Data Requirements */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">File Requirements</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Your Excel or CSV file should include the following columns:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <span className="font-medium text-foreground">
                        Product Code/SKU
                      </span>{' '}
                      - Unique identifier for each product
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Product Name
                      </span>{' '}
                      - Description of the product
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Quantity Sold
                      </span>{' '}
                      - Number of units sold
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Unit Price
                      </span>{' '}
                      - Price per unit
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Total Sales
                      </span>{' '}
                      - Total revenue (optional if qty × price provided)
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Date</span> -
                      Transaction date (optional, for trend analysis)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">What You'll Get</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">ABC Classification</p>
                  <p className="text-xs text-muted-foreground">
                    Categorize products by sales contribution
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Sales Trends</p>
                  <p className="text-xs text-muted-foreground">
                    Monthly performance analysis
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Top Products</p>
                  <p className="text-xs text-muted-foreground">
                    Best performers by revenue and volume
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <FileSpreadsheet className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Export Reports</p>
                  <p className="text-xs text-muted-foreground">
                    Download results as Excel or PDF
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">ABC Analysis</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <span className="font-semibold">Category A:</span> Top 20% of
                products generating 80% of sales
              </p>
              <p>
                <span className="font-semibold">Category B:</span> Next 30% of
                products generating 15% of sales
              </p>
              <p>
                <span className="font-semibold">Category C:</span> Remaining 50% of
                products generating 5% of sales
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download our sample template to see the expected format.
            </p>
            <Button variant="outline" className="w-full" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download Sample Template
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
