/**
 * Expense Statistics Page V2
 * Analytics and visualization of expenses
 * Updated with Design System V2
 */

import { ExpenseStats } from '@/components/expenses/ExpenseStats'
import { PageLayout } from '@/components/layouts'

export default function ExpenseStatsPage() {
  return (
    <PageLayout
      title="Estadísticas de Gastos"
      description="Análisis y visualización de tus gastos"
      backLink="/expenses"
    >
      <ExpenseStats />
    </PageLayout>
  )
}
