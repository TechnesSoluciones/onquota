import { ExpenseStats } from '@/components/expenses/ExpenseStats'

export default function ExpenseStatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estadísticas de Gastos</h1>
        <p className="text-muted-foreground">
          Análisis y visualización de tus gastos
        </p>
      </div>

      <ExpenseStats />
    </div>
  )
}
