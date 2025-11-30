'use client'

/**
 * ProductLineList Component
 * Displays a list/table of product lines
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
import type { ProductLine } from '@/types/sales'

interface ProductLineListProps {
  productLines: ProductLine[]
  onEdit: (productLine: ProductLine) => void
  onDelete: (productLine: ProductLine) => void
  isLoading?: boolean
}

export function ProductLineList({
  productLines,
  onEdit,
  onDelete,
  isLoading = false,
}: ProductLineListProps) {
  // Sort by display_order
  const sortedLines = [...productLines].sort(
    (a, b) => a.display_order - b.display_order
  )

  if (productLines.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-muted-foreground">No product lines found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first product line to get started
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedLines.map((line) => (
              <tr
                key={line.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {line.display_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">
                    {line.name}
                  </div>
                  {line.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-xs">
                      {line.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {line.code || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {line.color ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="text-xs text-muted-foreground font-mono">
                        {line.color}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={line.is_active ? 'default' : 'secondary'}
                    className={
                      line.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : ''
                    }
                  >
                    {line.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(line)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(line)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
