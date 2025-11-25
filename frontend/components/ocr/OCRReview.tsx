/**
 * OCRReview Component
 * Review and edit extracted OCR data
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ocrJobConfirmSchema, type OCRJobConfirmInput } from '@/lib/validations/ocr'
import { OCRJob } from '@/types/ocr'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Loader2, Save, CheckCircle } from 'lucide-react'
import { useOCR } from '@/hooks/useOCR'
import { useState } from 'react'

interface OCRReviewProps {
  job: OCRJob
  onConfirm?: () => void
}

const EXPENSE_CATEGORIES = [
  'Transportation',
  'Meals',
  'Accommodation',
  'Office Supplies',
  'Equipment',
  'Services',
  'Other',
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'CAD']

export function OCRReview({ job, onConfirm }: OCRReviewProps) {
  const { confirmExtraction, isLoading } = useOCR()
  const [isConfirmed, setIsConfirmed] = useState(false)

  const form = useForm<OCRJobConfirmInput>({
    resolver: zodResolver(ocrJobConfirmSchema),
    defaultValues: {
      provider: job.extracted_data?.provider || '',
      amount: job.extracted_data?.amount || 0,
      currency: job.extracted_data?.currency || 'USD',
      date: job.extracted_data?.date || new Date().toISOString().split('T')[0],
      category: job.extracted_data?.category || '',
    },
  })

  const onSubmit = async (data: OCRJobConfirmInput) => {
    try {
      await confirmExtraction(job.id, {
        ...data,
        items: job.extracted_data?.items,
      })
      setIsConfirmed(true)
      onConfirm?.()
    } catch (error) {
      console.error('Confirmation error:', error)
    }
  }

  const confidenceColor =
    (job.confidence || 0) >= 0.8
      ? 'text-green-600'
      : (job.confidence || 0) >= 0.6
      ? 'text-yellow-600'
      : 'text-red-600'

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Extracted Data</h3>
            <p className="text-sm text-gray-500">Review and edit if needed</p>
          </div>
          {job.confidence !== undefined && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Confidence Score</p>
              <p className={`text-2xl font-bold ${confidenceColor}`}>
                {(job.confidence * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider / Merchant</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Walmart, Shell, Uber" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {job.extracted_data?.items && job.extracted_data.items.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Line Items</FormLabel>
                <div className="border rounded-lg p-4 bg-gray-50">
                  {job.extracted_data.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm py-2 border-b last:border-b-0"
                    >
                      <span>{item.description}</span>
                      <span className="text-gray-600">
                        {item.quantity} x ${item.unit_price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading || isConfirmed} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : isConfirmed ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmed
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Confirm Data
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  )
}
