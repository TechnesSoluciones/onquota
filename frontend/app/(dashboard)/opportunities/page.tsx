'use client'

/**
 * Opportunities Page V2
 * Kanban board view for managing sales opportunities
 * Updated with Design System V2
 */

import { useState } from 'react'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-v2'
import { Icon } from '@/components/icons'
import { OpportunityBoard } from '@/components/opportunities/OpportunityBoard'
import { PipelineStats } from '@/components/opportunities/PipelineStats'
import { CreateOpportunityModal } from '@/components/opportunities/CreateOpportunityModal'
import { useOpportunities } from '@/hooks/useOpportunities'
import type { Opportunity, OpportunityStage } from '@/types/opportunities'

export default function OpportunitiesPage() {
  const {
    opportunities,
    stats,
    loading,
    updateStage,
    remove,
    refetch,
  } = useOpportunities()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const handleStageUpdate = async (id: string, stage: OpportunityStage) => {
    await updateStage(id, stage)
  }

  const handleEdit = (opportunity: Opportunity) => {
    // Edit functionality is handled in OpportunityBoard via EditModal
    console.log('Edit opportunity:', opportunity)
  }

  const handleDelete = async (id: string) => {
    await remove(id)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Sales Opportunities
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Manage your sales pipeline with drag and drop
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              leftIcon={<Icon name="refresh" className={loading ? 'animate-spin' : ''} size="sm" />}
            >
              Refresh
            </Button>
            <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Icon name="add" size="sm" />}>
              New Opportunity
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-neutral-50 dark:bg-neutral-950">
        <Tabs defaultValue="board" className="flex h-full flex-col">
          <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6">
            <TabsList>
              <TabsTrigger value="board">Kanban Board</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
          </div>

          {/* Kanban Board Tab */}
          <TabsContent value="board" className="flex-1 overflow-auto p-6">
            {loading && opportunities.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                  <Icon name="refresh" className="mx-auto h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-600" />
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    Loading opportunities...
                  </p>
                </div>
              </div>
            ) : (
              <OpportunityBoard
                opportunities={opportunities}
                onStageUpdate={handleStageUpdate}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={refetch}
              />
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="flex-1 overflow-auto p-6">
            <PipelineStats stats={stats} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Modal */}
      <CreateOpportunityModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={refetch}
      />
    </div>
  )
}
