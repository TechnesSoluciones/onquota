/**
 * OpportunityBoard Component
 * Kanban board with drag and drop functionality for opportunity stages
 */

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OpportunityCard } from './OpportunityCard'
import { CreateOpportunityModal } from './CreateOpportunityModal'
import { EditOpportunityModal } from './EditOpportunityModal'
import type { Opportunity, OpportunityStage } from '@/types/opportunities'
import { STAGE_CONFIG } from '@/types/opportunities'
import { cn } from '@/lib/utils'

interface OpportunityBoardProps {
  opportunities: Opportunity[]
  onStageUpdate: (id: string, stage: OpportunityStage) => Promise<void>
  onEdit: (opportunity: Opportunity) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}

export function OpportunityBoard({
  opportunities,
  onStageUpdate,
  onEdit,
  onDelete,
  onRefresh,
}: OpportunityBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    })
  )

  const stages = Object.values(STAGE_CONFIG)

  // Group opportunities by stage
  const opportunitiesByStage = opportunities.reduce(
    (acc, opp) => {
      if (!acc[opp.stage]) {
        acc[opp.stage] = []
      }
      acc[opp.stage].push(opp)
      return acc
    },
    {} as Record<OpportunityStage, Opportunity[]>
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Check if dropped over a stage column
    const targetStage = Object.keys(STAGE_CONFIG).find(
      (stage) => `column-${stage}` === overId
    ) as OpportunityStage | undefined

    if (targetStage) {
      const opportunity = opportunities.find((opp) => opp.id === activeId)
      if (opportunity && opportunity.stage !== targetStage) {
        // Update stage via API
        await onStageUpdate(activeId, targetStage)
      }
    }
  }

  const handleEdit = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity)
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this opportunity?')) {
      onDelete(id)
    }
  }

  const activeOpportunity = activeId
    ? opportunities.find((opp) => opp.id === activeId)
    : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(STAGE_CONFIG).map(([stage, config]) => {
            const stageOpportunities =
              opportunitiesByStage[stage as OpportunityStage] || []
            const columnId = `column-${stage}`

            return (
              <div
                key={stage}
                className="flex min-w-[320px] flex-1 flex-col rounded-lg bg-gray-50"
              >
                {/* Column Header */}
                <div
                  className={cn(
                    'rounded-t-lg border-b-2 p-4',
                    config.borderColor
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {config.label}
                      </h3>
                      <span
                        className={cn(
                          'flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-medium',
                          config.bgColor,
                          config.color
                        )}
                      >
                        {stageOpportunities.length}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCreateModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Drop Zone */}
                <SortableContext
                  id={columnId}
                  items={stageOpportunities.map((opp) => opp.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    id={columnId}
                    className="flex-1 space-y-3 overflow-y-auto p-4"
                    style={{ minHeight: '400px', maxHeight: 'calc(100vh - 300px)' }}
                  >
                    {stageOpportunities.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white">
                        <p className="text-sm text-gray-500">
                          Drop opportunities here
                        </p>
                      </div>
                    ) : (
                      stageOpportunities.map((opportunity) => (
                        <OpportunityCard
                          key={opportunity.id}
                          opportunity={opportunity}
                          onEdit={() => handleEdit(opportunity)}
                          onDelete={() => handleDelete(opportunity.id)}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOpportunity ? (
            <div className="rotate-3 opacity-90">
              <OpportunityCard
                opportunity={activeOpportunity}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <CreateOpportunityModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={onRefresh}
      />

      {selectedOpportunity && (
        <EditOpportunityModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          opportunity={selectedOpportunity}
          onSuccess={onRefresh}
        />
      )}
    </>
  )
}
