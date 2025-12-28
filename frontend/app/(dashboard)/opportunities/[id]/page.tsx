'use client'

/**
 * Opportunity Detail Page V2
 * Detailed view of a single opportunity
 * Updated with Design System V2
 */

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, Card, Badge, Progress } from '@/components/ui-v2'
import { Icon } from '@/components/icons'
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
          <Icon name="refresh" className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-600 mx-auto" />
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Loading opportunity...</p>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Icon name="error" className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Opportunity not found
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push('/opportunities')}
            leftIcon={<Icon name="arrow_back" size="sm" />}
          >
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
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/opportunities')}
            >
              <Icon name="arrow_back" size="sm" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {opportunity.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  className={`${stageConfig.bgColor} ${stageConfig.color} border-0`}
                >
                  {stageConfig.label}
                </Badge>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Created {format(new Date(opportunity.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setEditModalOpen(true)} leftIcon={<Icon name="edit" size="sm" />}>
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete} leftIcon={<Icon name="delete" size="sm" />}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Estimated Value
                  </p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(
                      opportunity.estimated_value,
                      opportunity.currency
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-success/10 p-3">
                  <Icon name="payments" className="h-5 w-5 text-success" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Probability
                  </p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {opportunity.probability}%
                  </p>
                  <Progress
                    value={opportunity.probability}
                    className="mt-2 h-2"
                  />
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon name="trending_up" className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Expected Close
                  </p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {opportunity.expected_close_date
                      ? format(
                          new Date(opportunity.expected_close_date),
                          'MMM d, yyyy'
                        )
                      : 'Not set'}
                  </p>
                </div>
                <div className="rounded-lg bg-info/10 p-3">
                  <Icon name="calendar_month" className="h-5 w-5 text-info" />
                </div>
              </div>
            </Card>
          </div>

          {/* Details */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Opportunity Details
              </h2>
              <div className="border-t border-neutral-200 dark:border-neutral-800 my-4" />
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Icon name="business" className="mt-0.5 h-5 w-5 text-neutral-400 dark:text-neutral-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Client</p>
                    <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                      {opportunity.client_name}
                    </p>
                  </div>
                </div>

                {opportunity.sales_rep_name && (
                  <div className="flex items-start gap-3">
                    <Icon name="person" className="mt-0.5 h-5 w-5 text-neutral-400 dark:text-neutral-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Sales Representative
                      </p>
                      <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                        {opportunity.sales_rep_name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Icon name="schedule" className="mt-0.5 h-5 w-5 text-neutral-400 dark:text-neutral-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
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
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Additional Information
              </h2>
              <div className="border-t border-neutral-200 dark:border-neutral-800 my-4" />
              <div className="space-y-4">
                {opportunity.description && (
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Description
                    </p>
                    <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                      {opportunity.description}
                    </p>
                  </div>
                )}

                {opportunity.notes && (
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Notes</p>
                    <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
                      {opportunity.notes}
                    </p>
                  </div>
                )}

                {!opportunity.description && !opportunity.notes && (
                  <div className="flex items-center gap-3 text-neutral-400 dark:text-neutral-600">
                    <Icon name="description" className="h-5 w-5" />
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
