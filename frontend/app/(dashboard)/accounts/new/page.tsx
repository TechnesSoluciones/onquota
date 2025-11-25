'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreatePlanWizard } from '@/components/accounts/CreatePlanWizard'
import { ChevronLeft } from 'lucide-react'

export default function NewAccountPlanPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/accounts')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="cursor-pointer hover:text-foreground"
            onClick={() => router.push('/accounts')}
          >
            Account Plans
          </span>
          <span>/</span>
          <span>New Plan</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Account Plan
        </h1>
        <p className="text-muted-foreground">
          Follow the steps to create a comprehensive account plan
        </p>
      </div>

      {/* Wizard */}
      <CreatePlanWizard />
    </div>
  )
}
