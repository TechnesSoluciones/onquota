/**
 * Analytics Results Page V2
 * View detailed analysis results for a specific job
 * Updated with Design System V2
 */

'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAnalytics } from '@/hooks/useAnalytics'
import { AnalysisResults } from '@/components/analytics/AnalysisResults'
import { AnalysisStatus } from '@/types/analytics'
import { Button, Card, Separator, Badge } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'
import { LoadingState } from '@/components/patterns'

const STATUS_CONFIG = {
  [AnalysisStatus.PENDING]: {
    label: 'Pending',
    iconName: 'schedule',
    className: 'bg-gray-100 text-gray-700',
  },
  [AnalysisStatus.PROCESSING]: {
    label: 'Processing',
    iconName: 'progress_activity',
    className: 'bg-blue-100 text-blue-700',
  },
  [AnalysisStatus.COMPLETED]: {
    label: 'Completed',
    iconName: 'check_circle',
    className: 'bg-green-100 text-green-700',
  },
  [AnalysisStatus.FAILED]: {
    label: 'Failed',
    iconName: 'error',
    className: 'bg-red-100 text-red-700',
  },
}

export default function AnalyticsResultsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.id as string
  const { fetchJob, currentJob, isLoading, exportExcel, exportPDF } = useAnalytics()

  useEffect(() => {
    if (jobId) {
      fetchJob(jobId)
    }
  }, [jobId, fetchJob])

  const handleExportExcel = async () => {
    if (currentJob?.file_name) {
      const fileName = currentJob.file_name.replace(/\.[^/.]+$/, '')
      await exportExcel(jobId, fileName)
    }
  }

  const handleExportPDF = async () => {
    if (currentJob?.file_name) {
      const fileName = currentJob.file_name.replace(/\.[^/.]+$/, '')
      await exportPDF(jobId, fileName)
    }
  }

  if (isLoading && !currentJob) {
    return (
      <PageLayout title="Analysis Results" description="Loading analysis details..." backLink="/analytics">
        <LoadingState message="Loading analysis..." />
      </PageLayout>
    )
  }

  if (!currentJob) {
    return (
      <PageLayout title="Analysis Not Found" description="The requested analysis could not be found" backLink="/analytics">
        <Card className="p-12 text-center">
          <Icon name="description" className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analysis not found</h3>
          <p className="text-muted-foreground mb-4">
            The analysis you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild leftIcon={<Icon name="arrow_back" />}>
            <Link href="/analytics">
              Back to Analytics
            </Link>
          </Button>
        </Card>
      </PageLayout>
    )
  }

  const statusIconName = STATUS_CONFIG[currentJob.status].iconName

  return (
    <PageLayout
      title={currentJob.file_name}
      description={`Analysis ID: ${currentJob.id.slice(0, 8)}...`}
      backLink="/analytics"
      actions={
        <Badge className={STATUS_CONFIG[currentJob.status].className}>
          <Icon
            name={statusIconName}
            className={`mr-1 h-3 w-3 ${currentJob.status === AnalysisStatus.PROCESSING ? 'animate-spin' : ''}`}
          />
          {STATUS_CONFIG[currentJob.status].label}
        </Badge>
      }
    >
      <Separator />

      {/* Error State */}
      {currentJob.status === AnalysisStatus.FAILED && (
        <Card className="p-6 bg-destructive/10 border-destructive">
          <div className="flex items-start gap-3">
            <Icon name="error" className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-destructive">Analysis Failed</h3>
              <p className="text-sm text-destructive/90">
                {currentJob.error_message || 'An unknown error occurred during processing'}
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/analytics/upload">
                    Try Again
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/analytics">
                    Back to Analytics
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Processing State */}
      {currentJob.status === AnalysisStatus.PROCESSING && (
        <Card className="p-12 text-center">
          <Icon name="progress_activity" className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Processing Sales Data</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Please wait while we analyze your sales data and generate insights. This
            may take a few minutes depending on the file size.
          </p>
          <div className="mt-6 space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-3/4" />
            </div>
            <p className="text-sm text-muted-foreground">
              Calculating ABC classification and trends...
            </p>
          </div>
        </Card>
      )}

      {/* Pending State */}
      {currentJob.status === AnalysisStatus.PENDING && (
        <Card className="p-12 text-center">
          <div className="h-12 w-12 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="schedule" className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Job Queued</h3>
          <p className="text-muted-foreground">
            Your analysis is in the queue and will be processed shortly.
          </p>
        </Card>
      )}

      {/* Results - Only show when completed */}
      {currentJob.status === AnalysisStatus.COMPLETED && currentJob.results && (
        <AnalysisResults
          results={currentJob.results}
          jobId={jobId}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          isExporting={isLoading}
        />
      )}
    </PageLayout>
  )
}
