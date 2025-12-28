'use client'

/**
 * Account Plan Detail Page V2
 * Detailed view of strategic account plan
 * Updated with Design System V2
 */

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { AccountOverview } from '@/components/accounts/AccountOverview'
import { AddMilestoneModal } from '@/components/accounts/AddMilestoneModal'
import { AddSWOTModal } from '@/components/accounts/AddSWOTModal'
import { useAccountPlans } from '@/hooks/useAccountPlans'
import { useRole } from '@/hooks/useRole'
import {
  MilestoneCreateFormData,
  SWOTItemCreateFormData,
} from '@/lib/validations/accounts'
import { Milestone, SWOTCategory } from '@/types/accounts'

export default function AccountPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string

  const {
    selectedPlan,
    stats,
    isLoading,
    error,
    fetchPlan,
    updatePlan,
    deletePlan,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    createSWOTItem,
    deleteSWOTItem,
  } = useAccountPlans()

  const { canEdit, canDelete } = useRole()

  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [showSWOTModal, setShowSWOTModal] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null
  )
  const [swotCategory, setSwotCategory] = useState<SWOTCategory>(
    SWOTCategory.STRENGTH
  )

  // Fetch plan on mount
  useEffect(() => {
    if (planId) {
      fetchPlan(planId).catch((err) => {
        console.error('Error fetching plan:', err)
      })
    }
  }, [planId, fetchPlan])

  const handleEdit = () => {
    // TODO: Implement edit modal or navigate to edit page
    router.push(`/accounts/${planId}/edit`)
  }

  const handleDelete = async () => {
    try {
      await deletePlan(planId)
      router.push('/accounts')
    } catch (err) {
      console.error('Error deleting plan:', err)
    }
  }

  const handleAddMilestone = () => {
    setEditingMilestone(null)
    setShowMilestoneModal(true)
  }

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone)
    setShowMilestoneModal(true)
  }

  const handleDeleteMilestone = async (id: string) => {
    try {
      await deleteMilestone(id)
    } catch (err) {
      console.error('Error deleting milestone:', err)
    }
  }

  const handleCompleteMilestone = async (id: string) => {
    try {
      await completeMilestone(id)
    } catch (err) {
      console.error('Error completing milestone:', err)
    }
  }

  const handleMilestoneSubmit = async (data: MilestoneCreateFormData) => {
    if (editingMilestone) {
      await updateMilestone(editingMilestone.id, data)
    } else {
      await createMilestone(planId, data)
    }
  }

  const handleAddSWOT = (category: SWOTCategory) => {
    setSwotCategory(category)
    setShowSWOTModal(true)
  }

  const handleSWOTSubmit = async (data: SWOTItemCreateFormData) => {
    await createSWOTItem(planId, data)
  }

  const handleDeleteSWOT = async (id: string) => {
    try {
      await deleteSWOTItem(id)
    } catch (err) {
      console.error('Error deleting SWOT item:', err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageLayout title="Account Plan" description="Loading..." backLink="/accounts">
        <LoadingState message="Loading account plan..." />
      </PageLayout>
    )
  }

  // Error state
  if (error || !selectedPlan || !stats) {
    return (
      <PageLayout title="Account Plan" description="Not found" backLink="/accounts">
        <div className="text-center py-12">
          <Icon name="error_outline" className="h-16 w-16 mx-auto text-error mb-4" />
          <h2 className="text-2xl font-bold">Plan Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            {error || 'The account plan you are looking for does not exist.'}
          </p>
          <Button className="mt-4" onClick={() => router.push('/accounts')}>
            Back to Plans
          </Button>
        </div>
      </PageLayout>
    )
  }

  const readonly = !canEdit()

  return (
    <PageLayout
      title={selectedPlan.title}
      description={`Account plan for ${selectedPlan.client?.name || 'Unknown Client'}`}
      backLink="/accounts"
    >

      {/* Overview Component */}
      <AccountOverview
        plan={selectedPlan}
        stats={stats}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddMilestone={handleAddMilestone}
        onEditMilestone={handleEditMilestone}
        onDeleteMilestone={handleDeleteMilestone}
        onCompleteMilestone={handleCompleteMilestone}
        onAddSWOT={handleAddSWOT}
        onDeleteSWOT={handleDeleteSWOT}
        readonly={readonly}
      />

      {/* Modals */}
      {selectedPlan && (
        <>
          <AddMilestoneModal
            open={showMilestoneModal}
            onOpenChange={setShowMilestoneModal}
            onSubmit={handleMilestoneSubmit}
            planStartDate={selectedPlan.start_date}
            planEndDate={selectedPlan.end_date}
            editMilestone={editingMilestone}
          />

          <AddSWOTModal
            open={showSWOTModal}
            onOpenChange={setShowSWOTModal}
            onSubmit={handleSWOTSubmit}
            initialCategory={swotCategory}
          />
        </>
      )}
    </PageLayout>
  )
}
