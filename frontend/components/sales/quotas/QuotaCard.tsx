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
  const achievementColor = getAchievementColor(quota.achievement_percentage)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{quota.user_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(quota.year, quota.month - 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`${achievementColor.bg} ${achievementColor.text}`}
          >
            {quota.achievement_percentage.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Achievement</span>
            <span className="font-medium">
              {formatCurrency(quota.total_achieved, currency)} /{' '}
              {formatCurrency(quota.total_quota, currency)}
            </span>
          </div>
          <Progress
            value={Math.min(quota.achievement_percentage, 100)}
            className="h-3"
          />
        </div>

        {/* Product Line Breakdown */}
        {quota.lines && quota.lines.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Target className="h-4 w-4 text-muted-foreground" />
              Product Lines
            </div>
            {quota.lines.map((line) => {
              const lineColor = getAchievementColor(line.achievement_percentage)
              return (
                <div key={line.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {line.product_line_name}
                    </span>
                    <span className={`text-xs ${lineColor.text}`}>
                      {line.achievement_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(line.achievement_percentage, 100)}
                      className="h-2 flex-1"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(line.achieved_amount, currency)} achieved
                    </span>
                    <span>
                      {formatCurrency(line.quota_amount, currency)} goal
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
            {quota.achievement_percentage >= 100 ? (
              <>
                <TrendingUp className={`h-5 w-5 ${achievementColor.icon}`} />
                <span className="text-sm font-medium text-slate-900">
                  Goal exceeded!
                </span>
              </>
            ) : quota.achievement_percentage >= 90 ? (
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
