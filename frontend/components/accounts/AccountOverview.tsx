'use client'

import React, { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
  Edit,
  Trash2,
} from 'lucide-react'
import { AccountPlanDetail, AccountPlanStats, PlanStatus } from '@/types/accounts'
import { format, differenceInDays } from 'date-fns'
import { SWOTMatrix } from './SWOTMatrix'
import { MilestonesTimeline } from './MilestonesTimeline'

interface AccountOverviewProps {
  plan: AccountPlanDetail
  stats: AccountPlanStats
  onEdit: () => void
  onDelete: () => void
  onAddMilestone: () => void
  onEditMilestone: (milestone: any) => void
  onDeleteMilestone: (id: string) => void
  onCompleteMilestone: (id: string) => void
  onAddSWOT: (category: any) => void
  onDeleteSWOT: (id: string) => void
  readonly?: boolean
}

const statusConfig = {
  [PlanStatus.DRAFT]: {
    label: 'Draft',
    variant: 'secondary' as const,
  },
  [PlanStatus.ACTIVE]: {
    label: 'Active',
    variant: 'default' as const,
  },
  [PlanStatus.COMPLETED]: {
    label: 'Completed',
    variant: 'default' as const,
  },
  [PlanStatus.CANCELLED]: {
    label: 'Cancelled',
    variant: 'destructive' as const,
  },
}

export function AccountOverview({
  plan,
  stats,
  onEdit,
  onDelete,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onCompleteMilestone,
  onAddSWOT,
  onDeleteSWOT,
  readonly = false,
}: AccountOverviewProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const config = statusConfig[plan.status]

  const handleDeleteConfirm = () => {
    onDelete()
    setShowDeleteDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{plan.title}</h1>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            Account plan for {plan.client_name}
          </p>
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Description */}
      {plan.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {Math.round(stats.completion_percentage)}%
              </div>
              <Progress value={stats.completion_percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.completed_milestones} of {stats.total_milestones}{' '}
                milestones
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completed_milestones}/{stats.total_milestones}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pending_milestones} pending
              {stats.overdue_milestones > 0 &&
                `, ${stats.overdue_milestones} overdue`}
            </p>
          </CardContent>
        </Card>

        {/* Days Remaining */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Days Remaining
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.days_remaining !== null
                ? stats.days_remaining >= 0
                  ? stats.days_remaining
                  : 'Overdue'
                : 'No end date'}
            </div>
            <p className="text-xs text-muted-foreground">
              {plan.end_date
                ? `Until ${format(new Date(plan.end_date), 'MMM d, yyyy')}`
                : 'Ongoing'}
            </p>
          </CardContent>
        </Card>

        {/* Revenue Goal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Goal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plan.revenue_goal
                ? `$${plan.revenue_goal.toLocaleString()}`
                : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground">Target revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="swot">SWOT Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* SWOT */}
          <SWOTMatrix
            swotItems={plan.swot_items}
            onAddItem={onAddSWOT}
            onDeleteItem={onDeleteSWOT}
            readonly={readonly}
          />

          {/* Milestones */}
          <MilestonesTimeline
            milestones={plan.milestones}
            onAddMilestone={onAddMilestone}
            onEditMilestone={onEditMilestone}
            onDeleteMilestone={onDeleteMilestone}
            onCompleteMilestone={onCompleteMilestone}
            readonly={readonly}
          />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestonesTimeline
            milestones={plan.milestones}
            onAddMilestone={onAddMilestone}
            onEditMilestone={onEditMilestone}
            onDeleteMilestone={onDeleteMilestone}
            onCompleteMilestone={onCompleteMilestone}
            readonly={readonly}
          />
        </TabsContent>

        <TabsContent value="swot">
          <SWOTMatrix
            swotItems={plan.swot_items}
            onAddItem={onAddSWOT}
            onDeleteItem={onDeleteSWOT}
            readonly={readonly}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account plan "{plan.title}" and
              all its milestones and SWOT items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
