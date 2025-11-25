'use client'

import React from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, DollarSign, Target } from 'lucide-react'
import { AccountPlanResponse, PlanStatus } from '@/types/accounts'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface PlanCardProps {
  plan: AccountPlanResponse & {
    milestones_count?: number
    completed_milestones?: number
  }
  onClick?: () => void
}

const statusConfig = {
  [PlanStatus.DRAFT]: {
    label: 'Draft',
    variant: 'secondary' as const,
    color: 'bg-gray-500',
  },
  [PlanStatus.ACTIVE]: {
    label: 'Active',
    variant: 'default' as const,
    color: 'bg-blue-500',
  },
  [PlanStatus.COMPLETED]: {
    label: 'Completed',
    variant: 'default' as const,
    color: 'bg-green-500',
  },
  [PlanStatus.CANCELLED]: {
    label: 'Cancelled',
    variant: 'destructive' as const,
    color: 'bg-red-500',
  },
}

export function PlanCard({ plan, onClick }: PlanCardProps) {
  const config = statusConfig[plan.status]

  // Calculate progress
  const milestonesCount = plan.milestones_count || 0
  const completedMilestones = plan.completed_milestones || 0
  const progress =
    milestonesCount > 0 ? (completedMilestones / milestonesCount) * 100 : 0

  // Get client initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const cardContent = (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
      {/* Status indicator bar */}
      <div className={cn('absolute left-0 top-0 h-1 w-full', config.color)} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(plan.client_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base group-hover:text-primary">
                {plan.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {plan.client_name}
              </CardDescription>
            </div>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {plan.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {plan.description}
          </p>
        )}

        {/* Progress */}
        {milestonesCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Milestones</span>
              <span className="font-medium">
                {completedMilestones}/{milestonesCount}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Dates */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(plan.start_date), 'MMM d, yyyy')}</span>
          </div>
          {plan.end_date && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span>{format(new Date(plan.end_date), 'MMM d, yyyy')}</span>
            </div>
          )}

          {/* Revenue goal */}
          {plan.revenue_goal && (
            <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium">
                ${plan.revenue_goal.toLocaleString()}
              </span>
              <span className="text-xs">revenue goal</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (onClick) {
    return (
      <div onClick={onClick} className="cursor-pointer">
        {cardContent}
      </div>
    )
  }

  return (
    <Link href={`/accounts/${plan.id}`} className="block">
      {cardContent}
    </Link>
  )
}
