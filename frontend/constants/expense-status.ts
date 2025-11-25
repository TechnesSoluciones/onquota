export const EXPENSE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type ExpenseStatus = typeof EXPENSE_STATUS[keyof typeof EXPENSE_STATUS]

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  [EXPENSE_STATUS.PENDING]: 'Pendiente',
  [EXPENSE_STATUS.APPROVED]: 'Aprobado',
  [EXPENSE_STATUS.REJECTED]: 'Rechazado',
}

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  [EXPENSE_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [EXPENSE_STATUS.APPROVED]: 'bg-green-100 text-green-800',
  [EXPENSE_STATUS.REJECTED]: 'bg-red-100 text-red-800',
}

export const EXPENSE_CATEGORIES = [
  'Transporte',
  'Alimentación',
  'Hospedaje',
  'Combustible',
  'Entretenimiento',
  'Material de oficina',
  'Telecomunicaciones',
  'Otros',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]
