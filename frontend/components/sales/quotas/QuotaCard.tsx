'use client'

/**
 * QuotaCard Component
 * Card displaying quota summary with achievement progress
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Target } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { QuotaDetail } from '@/types/sales'

interface QuotaCardProps {
  quota: QuotaDetail
  currency?: string
}

/**
 * Get achievement color based on percentage
 */
function getAchievementColor(percentage: number): {
  bg: string
  text: string
  icon: string
} {
  if (percentage >= 90) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: 'text-green-600',
    }
  }
  if (percentage >= 70) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
    }
  }
  return {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: 'text-red-600',
  }
}

export function QuotaCard({ quota, currency = 'COP' }: QuotaCardProps) {
  const achievementPercentage = quota.achievement_percentage ?? 0
  const achievementColor = getAchievementColor(achievementPercentage)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{quota.user_name ?? 'Unknown User'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(quota.year ?? new Date().getFullYear(), (quota.month ?? 1) - 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`${achievementColor.bg} ${achievementColor.text}`}
          >
            {achievementPercentage.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Achievement</span>
            <span className="font-medium">
              {formatCurrency(quota.total_achieved ?? 0, currency)} /{' '}
              {formatCurrency(quota.total_quota ?? 0, currency)}
            </span>
          </div>
          <Progress
            value={Math.min(achievementPercentage, 100)}
            className="h-3"
          />
        </div>

        {/* Product Line Breakdown */}
        {quota.lines && Array.isArray(quota.lines) && quota.lines.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Target className="h-4 w-4 text-muted-foreground" />
              Product Lines
            </div>
            {quota.lines.map((line) => {
              const lineAchievementPercentage = line.achievement_percentage ?? 0
              const lineColor = getAchievementColor(lineAchievementPercentage)
              return (
                <div key={line.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {line.product_line_name ?? 'Unknown'}
                    </span>
                    <span className={`text-xs ${lineColor.text}`}>
                      {lineAchievementPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(lineAchievementPercentage, 100)}
                      className="h-2 flex-1"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(line.achieved_amount ?? 0, currency)} achieved
                    </span>
                    <span>
                      {formatCurrency(line.quota_amount ?? 0, currency)} goal
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Achievement Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            {achievementPercentage >= 100 ? (
              <>
                <TrendingUp className={`h-5 w-5 ${achievementColor.icon}`} />
                <span className="text-sm font-medium text-slate-900">
                  Goal exceeded!
                </span>
              </>
            ) : achievementPercentage >= 90 ? (
              <>
                <TrendingUp className={`h-5 w-5 ${achievementColor.icon}`} />
                <span className="text-sm font-medium text-slate-900">
                  On track to meet goal
                </span>
              </>
            ) : (
              <>
                <TrendingDown className={`h-5 w-5 ${achievementColor.icon}`} />
                <span className="text-sm font-medium text-slate-900">
                  Below target
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
