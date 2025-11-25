/**
 * Analytics Results Page
 * View detailed analysis results for a specific job
 */

'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAnalytics } from '@/hooks/useAnalytics'
import { AnalysisResults } from '@/components/analytics/AnalysisResults'
import { AnalysisStatus } from '@/types/analytics'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_CONFIG = {
  [AnalysisStatus.PENDING]: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-gray-100 text-gray-700',
  },
  [AnalysisStatus.PROCESSING]: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-700',
  },
  [AnalysisStatus.COMPLETED]: {
    label: 'Completed',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700',
  },
  [AnalysisStatus.FAILED]: {
    label: 'Failed',
    icon: AlertCircle,
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (!currentJob) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <FileSpreadsheet className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analysis not found</h3>
          <p className="text-muted-foreground mb-4">
            The analysis you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/analytics">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Analytics
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  const StatusIcon = STATUS_CONFIG[currentJob.status].icon

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/analytics">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {currentJob.file_name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Analysis ID: {currentJob.id.slice(0, 8)}...
            </p>
          </div>
        </div>

        <Badge className={STATUS_CONFIG[currentJob.status].className}>
          <StatusIcon
            className={`mr-1 h-3 w-3 ${currentJob.status === AnalysisStatus.PROCESSING ? 'animate-spin' : ''}`}
          />
          {STATUS_CONFIG[currentJob.status].label}
        </Badge>
      </div>

      <Separator />

      {/* Error State */}
      {currentJob.status === AnalysisStatus.FAILED && (
        <Card className="p-6 bg-destructive/10 border-destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
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
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
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
            <Clock className="h-6 w-6 text-blue-600" />
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
    </div>
  )
}
