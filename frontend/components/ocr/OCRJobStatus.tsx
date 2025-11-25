/**
 * OCRJobStatus Component
 * Status badge and progress indicator for OCR jobs
 */

'use client'

import { OCRJobStatus as JobStatus } from '@/types/ocr'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface OCRJobStatusProps {
  status: JobStatus
  confidence?: number
  showProgress?: boolean
}

export function OCRJobStatusBadge({ status, confidence, showProgress = false }: OCRJobStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case JobStatus.PENDING:
        return {
          label: 'Pending',
          icon: Clock,
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-700',
        }
      case JobStatus.PROCESSING:
        return {
          label: 'Processing',
          icon: Loader2,
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-700',
          animate: true,
        }
      case JobStatus.COMPLETED:
        return {
          label: 'Completed',
          icon: CheckCircle2,
          variant: 'default' as const,
          className: 'bg-green-100 text-green-700',
        }
      case JobStatus.FAILED:
        return {
          label: 'Failed',
          icon: XCircle,
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-700',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className="space-y-2">
      <Badge variant={config.variant} className={config.className}>
        <Icon className={`mr-1 h-3 w-3 ${config.animate ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>

      {showProgress && status === JobStatus.PROCESSING && (
        <div className="space-y-1">
          <Progress value={undefined} className="h-2" />
          <p className="text-xs text-gray-500">Analyzing receipt...</p>
        </div>
      )}

      {status === JobStatus.COMPLETED && confidence !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Confidence</span>
            <span className="font-medium">{(confidence * 100).toFixed(0)}%</span>
          </div>
          <Progress value={confidence * 100} className="h-2" />
        </div>
      )}
    </div>
  )
}
