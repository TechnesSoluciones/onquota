'use client'

/**
 * New Account Plan Page V2
 * Wizard for creating strategic account plans
 * Updated with Design System V2
 */

import React from 'react'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layouts'
import { CreatePlanWizard } from '@/components/accounts/CreatePlanWizard'

export default function NewAccountPlanPage() {
  const router = useRouter()

  return (
    <PageLayout
      title="Create New Account Plan"
      description="Define your strategic objectives and action items for this account"
      backLink="/accounts"
    >
      <CreatePlanWizard />
    </PageLayout>
  )
}
