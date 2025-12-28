/**
 * OCR Jobs List Page V2
 * Main page for viewing and managing OCR jobs
 * Updated with Design System V2
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReceiptUpload } from '@/components/ocr/ReceiptUpload'
import { OCRJobList } from '@/components/ocr/OCRJobList'
import { Card, Separator } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'

export default function OCRPage() {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = (jobId: string) => {
    // Refresh the job list
    setRefreshKey((prev) => prev + 1)

    // Optionally navigate to the job detail page
    // router.push(`/ocr/${jobId}`)
  }

  return (
    <PageLayout
      title="OCR Service"
      description="Upload receipts and extract data automatically with AI-powered OCR"
    >
      <Separator />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Icon name="image" className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Processed
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Icon name="check_circle" className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Success Rate
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Icon name="trending_up" className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Avg Confidence
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <Icon name="error" className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Failed Jobs
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upload Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upload New Receipt</h2>
        <ReceiptUpload onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Jobs List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
        <OCRJobList key={refreshKey} />
      </div>
    </PageLayout>
  )
}
