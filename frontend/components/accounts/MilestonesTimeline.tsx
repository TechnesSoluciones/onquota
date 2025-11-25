'use client'

import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react'
import { Milestone, MilestoneStatus } from '@/types/accounts'
import { format, isPast, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface MilestonesTimelineProps {
  milestones: Milestone[]
  onAddMilestone: () => void
  onEditMilestone: (milestone: Milestone) => void
  onDeleteMilestone: (id: string) => void
  onCompleteMilestone: (id: string) => void
  readonly?: boolean
}

const statusConfig = {
  [MilestoneStatus.PENDING]: {
    icon: Circle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: 'Pending',
    variant: 'secondary' as const,
  },
  [MilestoneStatus.IN_PROGRESS]: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    label: 'In Progress',
    variant: 'default' as const,
  },
  [MilestoneStatus.COMPLETED]: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900',
    label: 'Completed',
    variant: 'default' as const,
  },
  [MilestoneStatus.OVERDUE]: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900',
    label: 'Overdue',
    variant: 'destructive' as const,
  },
}

export function MilestonesTimeline({
  milestones,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onCompleteMilestone,
  readonly = false,
}: MilestonesTimelineProps) {
  // Sort milestones by due date
  const sortedMilestones = [...milestones].sort((a, b) => {
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  // Calculate completion percentage
  const completedCount = milestones.filter(
    (m) => m.status === MilestoneStatus.COMPLETED
  ).length
  const completionPercentage =
    milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date())
  }

  const renderMilestone = (milestone: Milestone, index: number) => {
    const config = statusConfig[milestone.status]
    const Icon = config.icon
    const daysUntil = getDaysUntilDue(milestone.due_date)
    const isLast = index === sortedMilestones.length - 1

    return (
      <div key={milestone.id} className="relative">
        {/* Timeline connector */}
        {!isLast && (
          <div className="absolute left-[15px] top-[40px] h-full w-0.5 bg-border" />
        )}

        <div className="flex gap-4">
          {/* Status icon */}
          <div className="relative z-10 flex-shrink-0">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 border-background',
                config.bgColor
              )}
            >
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
          </div>

          {/* Milestone content */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {milestone.title}
                    </CardTitle>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  <CardDescription className="mt-1">
                    Due: {format(new Date(milestone.due_date), 'PPP')}
                    {milestone.status !== MilestoneStatus.COMPLETED &&
                      daysUntil >= 0 && (
                        <span className="ml-2 text-xs">
                          ({daysUntil} days remaining)
                        </span>
                      )}
                    {milestone.status !== MilestoneStatus.COMPLETED &&
                      daysUntil < 0 && (
                        <span className="ml-2 text-xs text-red-600">
                          ({Math.abs(daysUntil)} days overdue)
                        </span>
                      )}
                  </CardDescription>
                </div>
                {!readonly && (
                  <div className="flex gap-1">
                    {milestone.status !== MilestoneStatus.COMPLETED && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCompleteMilestone(milestone.id)}
                        className="h-8 px-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="sr-only">Complete</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditMilestone(milestone)}
                      className="h-8 px-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMilestone(milestone.id)}
                      className="h-8 px-2 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            {milestone.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {milestone.description}
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Milestones</h3>
          <p className="text-sm text-muted-foreground">
            Track key deliverables and deadlines
          </p>
        </div>
        {!readonly && (
          <Button onClick={onAddMilestone} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium">
            {completedCount}/{milestones.length} completed (
            {Math.round(completionPercentage)}%)
          </span>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </div>

      {/* Timeline */}
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                No milestones added yet
              </p>
              {!readonly && (
                <Button
                  variant="link"
                  onClick={onAddMilestone}
                  className="mt-2"
                >
                  Add your first milestone
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          {sortedMilestones.map((milestone, index) =>
            renderMilestone(milestone, index)
          )}
        </div>
      )}
    </div>
  )
}
