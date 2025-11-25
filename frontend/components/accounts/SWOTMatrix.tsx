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
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react'
import { SWOTItem, SWOTCategory } from '@/types/accounts'
import { cn } from '@/lib/utils'

interface SWOTMatrixProps {
  swotItems: SWOTItem[]
  onAddItem: (category: SWOTCategory) => void
  onDeleteItem: (id: string) => void
  readonly?: boolean
}

const swotConfig = {
  [SWOTCategory.STRENGTH]: {
    title: 'Strengths',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeVariant: 'default' as const,
  },
  [SWOTCategory.WEAKNESS]: {
    title: 'Weaknesses',
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeVariant: 'destructive' as const,
  },
  [SWOTCategory.OPPORTUNITY]: {
    title: 'Opportunities',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeVariant: 'secondary' as const,
  },
  [SWOTCategory.THREAT]: {
    title: 'Threats',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeVariant: 'outline' as const,
  },
}

export function SWOTMatrix({
  swotItems,
  onAddItem,
  onDeleteItem,
  readonly = false,
}: SWOTMatrixProps) {
  const getItemsByCategory = (category: SWOTCategory) => {
    return swotItems.filter((item) => item.category === category)
  }

  const renderQuadrant = (category: SWOTCategory) => {
    const config = swotConfig[category]
    const Icon = config.icon
    const items = getItemsByCategory(category)

    return (
      <Card
        className={cn(
          'h-full min-h-[300px]',
          config.borderColor,
          config.bgColor
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-5 w-5', config.color)} />
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <Badge variant={config.badgeVariant}>{items.length}</Badge>
            </div>
            {!readonly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddItem(category)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add {config.title}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No {config.title.toLowerCase()} added yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-lg border bg-background p-3 text-sm shadow-sm transition-shadow hover:shadow-md"
                >
                  <p className="pr-8">{item.description}</p>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteItem(item.id)}
                      className="absolute right-1 top-1 h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">SWOT Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Strategic analysis of the account
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {swotItems.length} items
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {renderQuadrant(SWOTCategory.STRENGTH)}
        {renderQuadrant(SWOTCategory.WEAKNESS)}
        {renderQuadrant(SWOTCategory.OPPORTUNITY)}
        {renderQuadrant(SWOTCategory.THREAT)}
      </div>
    </div>
  )
}
