/**
 * TopProductsTable Component
 * Table showing top performing products
 */

'use client'

import { TopProduct } from '@/types/analytics'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TopProductsTableProps {
  products: TopProduct[]
  limit?: number
}

const CATEGORY_COLORS = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-yellow-100 text-yellow-700',
  C: 'bg-red-100 text-red-700',
}

export function TopProductsTable({ products, limit = 10 }: TopProductsTableProps) {
  const displayProducts = products.slice(0, limit)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Top Products</h3>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Product Code</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Avg Discount</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayProducts.map((product, index) => (
              <TableRow key={product.product_code}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-mono text-sm">
                  {product.product_code}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate" title={product.product_name}>
                    {product.product_name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={CATEGORY_COLORS[product.category]}>
                    {product.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${product.total_sales.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {product.total_quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {product.avg_discount.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      product.margin_percentage >= 30
                        ? 'text-green-600 font-medium'
                        : product.margin_percentage >= 15
                        ? 'text-yellow-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {product.margin_percentage.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {products.length > limit && (
        <p className="text-sm text-gray-600 mt-4 text-center">
          Showing top {limit} of {products.length} products
        </p>
      )}
    </Card>
  )
}
