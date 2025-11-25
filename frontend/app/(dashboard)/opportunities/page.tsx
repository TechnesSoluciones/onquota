'use client'

/**
 * Opportunities Page
 * Kanban board view for managing sales opportunities
 */

import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sales Opportunities
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your sales pipeline with drag and drop
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Opportunity
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <Tabs defaultValue="board" className="flex h-full flex-col">
          <div className="border-b bg-white px-6">
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
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
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
