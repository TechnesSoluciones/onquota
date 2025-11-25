/**
 * OCR Jobs List Page
 * Main page for viewing and managing OCR jobs
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReceiptUpload } from '@/components/ocr/ReceiptUpload'
import { OCRJobList } from '@/components/ocr/OCRJobList'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FileImage, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">OCR Service</h1>
        <p className="text-muted-foreground mt-2">
          Upload receipts and extract data automatically with AI-powered OCR
        </p>
      </div>

      <Separator />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <FileImage className="h-6 w-6 text-blue-600" />
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
              <CheckCircle className="h-6 w-6 text-green-600" />
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
              <TrendingUp className="h-6 w-6 text-yellow-600" />
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
              <AlertCircle className="h-6 w-6 text-red-600" />
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
    </div>
  )
}
