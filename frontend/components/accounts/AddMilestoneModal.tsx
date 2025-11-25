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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  milestoneCreateSchema,
  milestoneCreateWithPlanSchema,
  type MilestoneCreateFormData,
} from '@/lib/validations/accounts'
import { Milestone } from '@/types/accounts'
import { Loader2 } from 'lucide-react'

interface AddMilestoneModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MilestoneCreateFormData) => Promise<void>
  planStartDate: string
  planEndDate?: string | null
  editMilestone?: Milestone | null
}

export function AddMilestoneModal({
  open,
  onOpenChange,
  onSubmit,
  planStartDate,
  planEndDate,
  editMilestone,
}: AddMilestoneModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<MilestoneCreateFormData>({
    title: '',
    description: '',
    due_date: '',
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof MilestoneCreateFormData, string>>
  >({})
  const { toast } = useToast()

  // Reset form when modal opens/closes or when editing a milestone
  useEffect(() => {
    if (open) {
      if (editMilestone) {
        setFormData({
          title: editMilestone.title,
          description: editMilestone.description || '',
          due_date: editMilestone.due_date.split('T')[0], // Convert to YYYY-MM-DD
        })
      } else {
        setFormData({
          title: '',
          description: '',
          due_date: '',
        })
      }
      setErrors({})
    }
  }, [open, editMilestone])

  const handleChange = (
    field: keyof MilestoneCreateFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    try {
      // Use schema with plan date validation
      const schema = milestoneCreateWithPlanSchema(planStartDate, planEndDate)
      schema.parse(formData)
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Partial<
        Record<keyof MilestoneCreateFormData, string>
      > = {}
      error.errors?.forEach((err: any) => {
        const field = err.path[0] as keyof MilestoneCreateFormData
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
          error?.detail || error?.message || 'Failed to save milestone',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </DialogTitle>
            <DialogDescription>
              {editMilestone
                ? 'Update milestone details below.'
                : 'Add a new milestone to track progress on this account plan.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Initial discovery call"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                disabled={isSubmitting}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add details about this milestone..."
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Due Date */}
            <div className="grid gap-2">
              <Label htmlFor="due_date">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
                disabled={isSubmitting}
                min={planStartDate}
                max={planEndDate || undefined}
                className={errors.due_date ? 'border-destructive' : ''}
              />
              {errors.due_date && (
                <p className="text-sm text-destructive">{errors.due_date}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be between plan dates (
                {new Date(planStartDate).toLocaleDateString()}
                {planEndDate &&
                  ` - ${new Date(planEndDate).toLocaleDateString()}`}
                )
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
              {editMilestone ? 'Update' : 'Add'} Milestone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
