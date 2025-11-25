'use client'

/**
 * Opportunity Detail Page
 * Detailed view of a single opportunity
 */

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  Edit,
  Trash2,
  Building2,
  FileText,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { EditOpportunityModal } from '@/components/opportunities/EditOpportunityModal'
import { useSingleOpportunity } from '@/hooks/useOpportunities'
import { STAGE_CONFIG } from '@/types/opportunities'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { opportunity, loading, remove } = useSingleOpportunity(id)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this opportunity?')) {
      const success = await remove()
      if (success) {
        router.push('/opportunities')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Loading opportunity...</p>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            Opportunity not found
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push('/opportunities')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunities
          </Button>
        </div>
      </div>
    )
  }

  const stageConfig = STAGE_CONFIG[opportunity.stage]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/opportunities')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {opportunity.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  className={`${stageConfig.bgColor} ${stageConfig.color} border-0`}
                >
                  {stageConfig.label}
                </Badge>
                <span className="text-sm text-gray-600">
                  Created {format(new Date(opportunity.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Estimated Value
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      opportunity.estimated_value,
                      opportunity.currency
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-green-100 p-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Probability
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {opportunity.probability}%
                  </p>
                  <Progress
                    value={opportunity.probability}
                    className="mt-2 h-2"
                  />
                </div>
                <div className="rounded-lg bg-purple-100 p-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Expected Close
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {opportunity.expected_close_date
                      ? format(
                          new Date(opportunity.expected_close_date),
                          'MMM d, yyyy'
                        )
                      : 'Not set'}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-100 p-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Details */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Opportunity Details
              </h2>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Client</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {opportunity.client_name}
                    </p>
                  </div>
                </div>

                {opportunity.sales_rep_name && (
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">
                        Sales Representative
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {opportunity.sales_rep_name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(
                        new Date(opportunity.updated_at),
                        'MMM d, yyyy h:mm a'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Right Column */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Additional Information
              </h2>
              <Separator className="my-4" />
              <div className="space-y-4">
                {opportunity.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Description
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {opportunity.description}
                    </p>
                  </div>
                )}

                {opportunity.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Notes</p>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {opportunity.notes}
                    </p>
                  </div>
                )}

                {!opportunity.description && !opportunity.notes && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <FileText className="h-5 w-5" />
                    <p className="text-sm">No additional information</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditOpportunityModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        opportunity={opportunity}
        onSuccess={() => {
          // Refetch is handled by useSingleOpportunity hook
        }}
      />
    </div>
  )
}
