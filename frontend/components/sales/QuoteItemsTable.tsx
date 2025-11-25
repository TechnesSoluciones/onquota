'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuoteItemRow {
  id: string
  product_name: string
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  subtotal: number
}

interface QuoteItemsTableProps {
  items: QuoteItemRow[]
  onChange: (items: QuoteItemRow[]) => void
  currency?: string
  readOnly?: boolean
  className?: string
}

/**
 * Editable table for managing quote items with dynamic calculations
 * Columns: Product, Description, Quantity, Unit Price, Discount %, Subtotal
 * Features: Add row, Edit, Delete row, Auto-calculation
 */
export function QuoteItemsTable({
  items,
  onChange,
  currency = 'USD',
  readOnly = false,
  className,
}: QuoteItemsTableProps) {
  const [editingRow, setEditingRow] = useState<string | null>(null)

  /**
   * Calculate subtotal for an item
   * Formula: (quantity × unit_price) × (1 - discount_percent/100)
   */
  const calculateSubtotal = (
    quantity: number,
    unitPrice: number,
    discountPercent: number
  ): number => {
    const subtotal = quantity * unitPrice * (1 - discountPercent / 100)
    return Math.round(subtotal * 100) / 100 // Round to 2 decimals
  }

  /**
   * Calculate total amount for all items
   */
  const calculateTotal = (): number => {
    return items.reduce((total, item) => total + item.subtotal, 0)
  }

  /**
   * Add a new empty row
   */
  const handleAddRow = () => {
    const newItem: QuoteItemRow = {
      id: `temp-${Date.now()}`,
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      subtotal: 0,
    }
    onChange([...items, newItem])
    setEditingRow(newItem.id)
  }

  /**
   * Delete a row
   */
  const handleDeleteRow = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  /**
   * Update a field in a row
   */
  const handleUpdateField = (
    id: string,
    field: keyof QuoteItemRow,
    value: string | number
  ) => {
    const updatedItems = items.map((item) => {
      if (item.id !== id) return item

      const updated = { ...item, [field]: value }

      // Recalculate subtotal when quantity, price, or discount changes
      if (
        field === 'quantity' ||
        field === 'unit_price' ||
        field === 'discount_percent'
      ) {
        updated.subtotal = calculateSubtotal(
          updated.quantity,
          updated.unit_price,
          updated.discount_percent
        )
      }

      return updated
    })

    onChange(updatedItems)
  }

  /**
   * Format currency value
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  /**
   * Get currency symbol
   */
  const getCurrencySymbol = (): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      COP: '$',
      EUR: '€',
    }
    return symbols[currency] || currency
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Producto</TableHead>
              <TableHead className="w-[250px]">Descripción</TableHead>
              <TableHead className="w-[100px] text-right">Cantidad</TableHead>
              <TableHead className="w-[120px] text-right">
                Precio Unit.
              </TableHead>
              <TableHead className="w-[100px] text-right">Desc. %</TableHead>
              <TableHead className="w-[120px] text-right">Subtotal</TableHead>
              {!readOnly && <TableHead className="w-[80px]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 6 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {readOnly
                    ? 'No hay items en esta cotización'
                    : 'Haz clic en "Agregar Item" para comenzar'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isEditing = editingRow === item.id

                return (
                  <TableRow
                    key={item.id}
                    className={cn(isEditing && 'bg-muted/30')}
                  >
                    {/* Product Name */}
                    <TableCell>
                      {readOnly ? (
                        <span className="font-medium">{item.product_name}</span>
                      ) : (
                        <Input
                          value={item.product_name}
                          onChange={(e) =>
                            handleUpdateField(
                              item.id,
                              'product_name',
                              e.target.value
                            )
                          }
                          onFocus={() => setEditingRow(item.id)}
                          placeholder="Nombre del producto"
                          className="h-8"
                        />
                      )}
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm text-muted-foreground">
                          {item.description || '-'}
                        </span>
                      ) : (
                        <Textarea
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateField(
                              item.id,
                              'description',
                              e.target.value
                            )
                          }
                          onFocus={() => setEditingRow(item.id)}
                          placeholder="Descripción opcional"
                          className="h-8 min-h-[32px] resize-none"
                          rows={1}
                        />
                      )}
                    </TableCell>

                    {/* Quantity */}
                    <TableCell className="text-right">
                      {readOnly ? (
                        <span>{item.quantity}</span>
                      ) : (
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateField(
                              item.id,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          onFocus={() => setEditingRow(item.id)}
                          className="h-8 text-right"
                        />
                      )}
                    </TableCell>

                    {/* Unit Price */}
                    <TableCell className="text-right">
                      {readOnly ? (
                        <span>
                          {getCurrencySymbol()} {formatCurrency(item.unit_price)}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleUpdateField(
                              item.id,
                              'unit_price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          onFocus={() => setEditingRow(item.id)}
                          className="h-8 text-right"
                        />
                      )}
                    </TableCell>

                    {/* Discount Percent */}
                    <TableCell className="text-right">
                      {readOnly ? (
                        <span>{item.discount_percent}%</span>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.discount_percent}
                          onChange={(e) =>
                            handleUpdateField(
                              item.id,
                              'discount_percent',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          onFocus={() => setEditingRow(item.id)}
                          className="h-8 text-right"
                        />
                      )}
                    </TableCell>

                    {/* Subtotal (calculated) */}
                    <TableCell className="text-right font-medium">
                      {getCurrencySymbol()} {formatCurrency(item.subtotal)}
                    </TableCell>

                    {/* Actions */}
                    {!readOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRow(item.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar item</span>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>

          {/* Footer with Total */}
          {items.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="text-right font-semibold">
                  Total:
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  {getCurrencySymbol()} {formatCurrency(calculateTotal())}
                </TableCell>
                {!readOnly && <TableCell />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Add Item Button */}
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Item
        </Button>
      )}

      {/* Validation Message */}
      {!readOnly && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Se requiere al menos 1 item para crear una cotización
        </p>
      )}
    </div>
  )
}
