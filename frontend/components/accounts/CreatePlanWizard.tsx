'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useAccountPlans } from '@/hooks/useAccountPlans'
import { useClients } from '@/hooks/useClients'
import {
  accountPlanCreateSchema,
  milestoneCreateSchema,
  swotItemCreateSchema,
  type AccountPlanCreateFormData,
  type MilestoneCreateFormData,
  type SWOTItemCreateFormData,
} from '@/lib/validations/accounts'
import { SWOTCategory, PlanStatus } from '@/types/accounts'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  {
    id: 1,
    title: 'Basic Information',
    description: 'Plan details and client selection',
  },
  {
    id: 2,
    title: 'Timeline & Goals',
    description: 'Set dates and revenue targets',
  },
  {
    id: 3,
    title: 'SWOT Analysis',
    description: 'Add strategic analysis items',
  },
  {
    id: 4,
    title: 'Milestones',
    description: 'Define key deliverables',
  },
]

const swotIcons = {
  [SWOTCategory.STRENGTH]: TrendingUp,
  [SWOTCategory.WEAKNESS]: TrendingDown,
  [SWOTCategory.OPPORTUNITY]: Target,
  [SWOTCategory.THREAT]: AlertTriangle,
}

export function CreatePlanWizard() {
  const router = useRouter()
  const { toast } = useToast()
  const { createPlan } = useAccountPlans()
  const { clients } = useClients()

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form data
  const [planData, setPlanData] = useState<
    Partial<AccountPlanCreateFormData>
  >({
    status: PlanStatus.DRAFT,
  })
  const [milestones, setMilestones] = useState<MilestoneCreateFormData[]>([])
  const [swotItems, setSwotItems] = useState<SWOTItemCreateFormData[]>([])

  // Step-specific form data
  const [milestoneForm, setMilestoneForm] = useState<MilestoneCreateFormData>({
    title: '',
    description: '',
    due_date: '',
  })
  const [swotForm, setSwotForm] = useState<SWOTItemCreateFormData>({
    category: SWOTCategory.STRENGTH,
    description: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const progress = (currentStep / steps.length) * 100

  const validateStep1 = (): boolean => {
    try {
      accountPlanCreateSchema
        .pick({ client_id: true, title: true, description: true })
        .parse({
          client_id: planData.client_id,
          title: planData.title,
          description: planData.description || null,
        })
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      error.errors?.forEach((err: any) => {
        fieldErrors[err.path[0]] = err.message
      })
      setErrors(fieldErrors)
      return false
    }
  }

  const validateStep2 = (): boolean => {
    try {
      accountPlanCreateSchema
        .pick({
          start_date: true,
          end_date: true,
          revenue_goal: true,
        })
        .parse({
          start_date: planData.start_date,
          end_date: planData.end_date || null,
          revenue_goal: planData.revenue_goal || null,
        })
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      error.errors?.forEach((err: any) => {
        fieldErrors[err.path[0]] = err.message
      })
      setErrors(fieldErrors)
      return false
    }
  }

  const handleNext = () => {
    let isValid = false

    if (currentStep === 1) {
      isValid = validateStep1()
    } else if (currentStep === 2) {
      isValid = validateStep2()
    } else {
      isValid = true // Steps 3 and 4 are optional
    }

    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addMilestone = () => {
    try {
      milestoneCreateSchema.parse(milestoneForm)
      setMilestones([...milestones, milestoneForm])
      setMilestoneForm({ title: '', description: '', due_date: '' })
      setErrors({})
      toast({
        title: 'Success',
        description: 'Milestone added',
      })
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      error.errors?.forEach((err: any) => {
        fieldErrors[`milestone_${err.path[0]}`] = err.message
      })
      setErrors(fieldErrors)
    }
  }

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index))
  }

  const addSwotItem = () => {
    try {
      swotItemCreateSchema.parse(swotForm)
      setSwotItems([...swotItems, swotForm])
      setSwotForm({ category: SWOTCategory.STRENGTH, description: '' })
      setErrors({})
      toast({
        title: 'Success',
        description: 'SWOT item added',
      })
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      error.errors?.forEach((err: any) => {
        fieldErrors[`swot_${err.path[0]}`] = err.message
      })
      setErrors(fieldErrors)
    }
  }

  const removeSwotItem = (index: number) => {
    setSwotItems(swotItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all required fields',
        variant: 'destructive',
      })
      setCurrentStep(1)
      return
    }

    setIsSubmitting(true)
    try {
      // Create the plan
      const newPlan = await createPlan(planData as AccountPlanCreateFormData)

      // TODO: Add milestones and SWOT items after plan creation
      // This would require separate API calls using the plan ID
      // For now, we'll redirect to the plan page where users can add them

      toast({
        title: 'Success',
        description: 'Account plan created successfully',
      })

      router.push(`/accounts/${newPlan.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.detail || error?.message || 'Failed to create account plan',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="client_id">
          Client <span className="text-destructive">*</span>
        </Label>
        <Select
          value={planData.client_id}
          onValueChange={(value) =>
            setPlanData({ ...planData, client_id: value })
          }
        >
          <SelectTrigger
            id="client_id"
            className={errors.client_id ? 'border-destructive' : ''}
          >
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.client_id && (
          <p className="text-sm text-destructive">{errors.client_id}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">
          Plan Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g., Q1 2024 Growth Strategy"
          value={planData.title || ''}
          onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the objectives and scope of this plan..."
          value={planData.description || ''}
          onChange={(e) =>
            setPlanData({ ...planData, description: e.target.value })
          }
          rows={4}
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="start_date">
          Start Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="start_date"
          type="date"
          value={planData.start_date || ''}
          onChange={(e) =>
            setPlanData({ ...planData, start_date: e.target.value })
          }
          className={errors.start_date ? 'border-destructive' : ''}
        />
        {errors.start_date && (
          <p className="text-sm text-destructive">{errors.start_date}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="end_date">End Date (Optional)</Label>
        <Input
          id="end_date"
          type="date"
          value={planData.end_date || ''}
          onChange={(e) =>
            setPlanData({ ...planData, end_date: e.target.value })
          }
          min={planData.start_date}
          className={errors.end_date ? 'border-destructive' : ''}
        />
        {errors.end_date && (
          <p className="text-sm text-destructive">{errors.end_date}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="revenue_goal">Revenue Goal (Optional)</Label>
        <Input
          id="revenue_goal"
          type="number"
          placeholder="e.g., 100000"
          value={planData.revenue_goal || ''}
          onChange={(e) =>
            setPlanData({
              ...planData,
              revenue_goal: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className={errors.revenue_goal ? 'border-destructive' : ''}
        />
        {errors.revenue_goal && (
          <p className="text-sm text-destructive">{errors.revenue_goal}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Target revenue for this account plan
        </p>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="mb-4 font-medium">Add SWOT Items (Optional)</h4>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={swotForm.category}
              onValueChange={(value: SWOTCategory) =>
                setSwotForm({ ...swotForm, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SWOTCategory.STRENGTH}>Strength</SelectItem>
                <SelectItem value={SWOTCategory.WEAKNESS}>Weakness</SelectItem>
                <SelectItem value={SWOTCategory.OPPORTUNITY}>
                  Opportunity
                </SelectItem>
                <SelectItem value={SWOTCategory.THREAT}>Threat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="swot_description">Description</Label>
            <Textarea
              id="swot_description"
              placeholder="Describe this SWOT item..."
              value={swotForm.description}
              onChange={(e) =>
                setSwotForm({ ...swotForm, description: e.target.value })
              }
              rows={3}
              className={
                errors.swot_description ? 'border-destructive' : ''
              }
            />
            {errors.swot_description && (
              <p className="text-sm text-destructive">
                {errors.swot_description}
              </p>
            )}
          </div>

          <Button type="button" onClick={addSwotItem} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add SWOT Item
          </Button>
        </div>
      </div>

      {swotItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Added Items ({swotItems.length})</h4>
          {swotItems.map((item, index) => {
            const Icon = swotIcons[item.category]
            return (
              <div
                key={index}
                className="flex items-start justify-between rounded-lg border p-3"
              >
                <div className="flex items-start gap-2">
                  <Icon className="mt-1 h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {item.category}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSwotItem(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="mb-4 font-medium">Add Milestones (Optional)</h4>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="milestone_title">Title</Label>
            <Input
              id="milestone_title"
              placeholder="e.g., Initial discovery call"
              value={milestoneForm.title}
              onChange={(e) =>
                setMilestoneForm({ ...milestoneForm, title: e.target.value })
              }
              className={errors.milestone_title ? 'border-destructive' : ''}
            />
            {errors.milestone_title && (
              <p className="text-sm text-destructive">
                {errors.milestone_title}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="milestone_description">Description</Label>
            <Textarea
              id="milestone_description"
              placeholder="Add details..."
              value={milestoneForm.description || ''}
              onChange={(e) =>
                setMilestoneForm({
                  ...milestoneForm,
                  description: e.target.value,
                })
              }
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="milestone_due_date">Due Date</Label>
            <Input
              id="milestone_due_date"
              type="date"
              value={milestoneForm.due_date}
              onChange={(e) =>
                setMilestoneForm({
                  ...milestoneForm,
                  due_date: e.target.value,
                })
              }
              min={planData.start_date}
              max={planData.end_date || undefined}
              className={errors.milestone_due_date ? 'border-destructive' : ''}
            />
            {errors.milestone_due_date && (
              <p className="text-sm text-destructive">
                {errors.milestone_due_date}
              </p>
            )}
          </div>

          <Button type="button" onClick={addMilestone} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </div>
      </div>

      {milestones.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Added Milestones ({milestones.length})</h4>
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className="flex items-start justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{milestone.title}</p>
                <p className="text-xs text-muted-foreground">
                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMilestone(index)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Create Account Plan</CardTitle>
        <CardDescription>
          Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
        </CardDescription>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  currentStep > step.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : currentStep === step.id
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground text-muted-foreground'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
                {step.title}
              </p>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < steps.length ? (
            <Button type="button" onClick={handleNext} disabled={isSubmitting}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Plan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
