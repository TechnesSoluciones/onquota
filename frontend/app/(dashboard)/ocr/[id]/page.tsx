/**
 * OCR Job Detail Page V2
 * Review and confirm extracted data from a receipt
 * Updated with Design System V2
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { useOCR } from '@/hooks/useOCR'
import { OCRJob, OCRJobStatus } from '@/types/ocr'
import { OCRReview } from '@/components/ocr/OCRReview'
import { OCRJobStatusBadge } from '@/components/ocr/OCRJobStatus'
import { Button, Card, Separator } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'
import { LoadingState } from '@/components/patterns'

export default function OCRJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.id as string
  const { fetchJob, currentJob, isLoading } = useOCR()
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (jobId) {
      fetchJob(jobId)
    }
  }, [jobId, fetchJob])

  const handleConfirmSuccess = () => {
    // Optionally navigate to expenses page to create expense
    // router.push('/expenses/new')
  }

  if (isLoading && !currentJob) {
    return (
      <PageLayout title="Review Receipt" description="Loading job details..." backLink="/ocr">
        <LoadingState message="Loading job details..." />
      </PageLayout>
    )
  }

  if (!currentJob) {
    return (
      <PageLayout title="Job Not Found" description="The requested OCR job could not be found" backLink="/ocr">
        <Card className="p-12 text-center">
          <Icon name="image" className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Job not found</h3>
          <p className="text-muted-foreground mb-4">
            The OCR job you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild leftIcon={<Icon name="arrow_back" />}>
            <Link href="/ocr">
              Back to Jobs
            </Link>
          </Button>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Review Receipt"
      description={`Job ID: ${currentJob.id.slice(0, 8)}... • ${format(new Date(currentJob.created_at), 'MMM dd, yyyy HH:mm')}`}
      backLink="/ocr"
      actions={
        <OCRJobStatusBadge
          status={currentJob.status}
          confidence={currentJob.confidence}
          showProgress={currentJob.status === OCRJobStatus.PROCESSING}
        />
      }
    >
      <Separator />

      {/* Error State */}
      {currentJob.status === OCRJobStatus.FAILED && (
        <Card className="p-6 bg-destructive/10 border-destructive">
          <div className="space-y-2">
            <h3 className="font-semibold text-destructive">Processing Failed</h3>
            <p className="text-sm text-destructive/90">
              {currentJob.error_message || 'An unknown error occurred during processing'}
            </p>
          </div>
        </Card>
      )}

      {/* Processing State */}
      {currentJob.status === OCRJobStatus.PROCESSING && (
        <Card className="p-12 text-center">
          <Icon name="progress_activity" className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Processing Receipt</h3>
          <p className="text-muted-foreground">
            Please wait while we extract data from your receipt...
          </p>
        </Card>
      )}

      {/* Pending State */}
      {currentJob.status === OCRJobStatus.PENDING && (
        <Card className="p-12 text-center">
          <div className="h-12 w-12 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="image" className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Job Queued</h3>
          <p className="text-muted-foreground">
            Your receipt is in the queue and will be processed shortly.
          </p>
        </Card>
      )}

      {/* Main Content - Only show when completed */}
      {currentJob.status === OCRJobStatus.COMPLETED && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Viewer */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Receipt Image</h3>
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              {!imageError ? (
                <img
                  src={currentJob.image_path}
                  alt="Receipt"
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Icon name="image" className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Image not available
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Extracted Data Review */}
          <div className="space-y-6">
            <OCRReview job={currentJob} onConfirm={handleConfirmSuccess} />

            {/* Next Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Next Steps</h3>
              <div className="space-y-2">
                <Button className="w-full" asChild>
                  <Link href="/expenses/new">
                    Create Expense from this Receipt
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild leftIcon={<Icon name="arrow_back" />}>
                  <Link href="/ocr">
                    Back to All Jobs
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
