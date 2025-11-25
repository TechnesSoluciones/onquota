'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  swotItemCreateSchema,
  type SWOTItemCreateFormData,
} from '@/lib/validations/accounts'
import { SWOTCategory } from '@/types/accounts'
import { Loader2, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddSWOTModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SWOTItemCreateFormData) => Promise<void>
  initialCategory?: SWOTCategory
}

const swotOptions = [
  {
    category: SWOTCategory.STRENGTH,
    title: 'Strength',
    description: 'Internal positive attributes and resources',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  {
    category: SWOTCategory.WEAKNESS,
    title: 'Weakness',
    description: 'Internal negative attributes and limitations',
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  {
    category: SWOTCategory.OPPORTUNITY,
    title: 'Opportunity',
    description: 'External factors that could be advantageous',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    category: SWOTCategory.THREAT,
    title: 'Threat',
    description: 'External factors that could cause problems',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
]

export function AddSWOTModal({
  open,
  onOpenChange,
  onSubmit,
  initialCategory,
}: AddSWOTModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<SWOTItemCreateFormData>({
    category: initialCategory || SWOTCategory.STRENGTH,
    description: '',
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof SWOTItemCreateFormData, string>>
  >({})
  const { toast } = useToast()

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        category: initialCategory || SWOTCategory.STRENGTH,
        description: '',
      })
      setErrors({})
    }
  }, [open, initialCategory])

  const handleCategorySelect = (category: SWOTCategory) => {
    setFormData((prev) => ({ ...prev, category }))
    if (errors.category) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.category
        return newErrors
      })
    }
  }

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({ ...prev, description: value }))
    if (errors.description) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.description
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    try {
      swotItemCreateSchema.parse(formData)
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Partial<Record<keyof SWOTItemCreateFormData, string>> =
        {}
      error.errors?.forEach((err: any) => {
        const field = err.path[0] as keyof SWOTItemCreateFormData
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.detail || error?.message || 'Failed to add SWOT item',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add SWOT Item</DialogTitle>
            <DialogDescription>
              Add a new item to your SWOT analysis. Select a category and
              provide a description.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Category Selection */}
            <div className="grid gap-3">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {swotOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = formData.category === option.category

                  return (
                    <button
                      key={option.category}
                      type="button"
                      onClick={() => handleCategorySelect(option.category)}
                      disabled={isSubmitting}
                      className={cn(
                        'flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all',
                        isSelected
                          ? cn(option.borderColor, option.bgColor)
                          : 'border-border bg-background hover:bg-muted',
                        isSubmitting && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-5 w-5', option.color)} />
                        <span className="font-semibold">{option.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  )
                })}
              </div>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe this SWOT item in detail..."
                value={formData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters, maximum 500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add SWOT Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
