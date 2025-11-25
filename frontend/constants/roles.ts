export const USER_ROLES = {
  ADMIN: 'admin',
  SALES_REP: 'sales_rep',
  SUPERVISOR: 'supervisor',
  ANALYST: 'analyst',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.SALES_REP]: 'Representante de Ventas',
  [USER_ROLES.SUPERVISOR]: 'Supervisor',
  [USER_ROLES.ANALYST]: 'Analista',
}

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: ['all'],
  [USER_ROLES.SALES_REP]: ['expenses:create', 'expenses:read', 'clients:read', 'clients:create'],
  [USER_ROLES.SUPERVISOR]: [
    'expenses:read',
    'expenses:approve',
    'clients:read',
    'reports:read',
  ],
  [USER_ROLES.ANALYST]: ['expenses:read', 'clients:read', 'reports:read', 'reports:create'],
} as const
