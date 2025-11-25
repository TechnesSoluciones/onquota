export * from './roles'
export * from './expense-status'

export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EXPENSES: '/dashboard/expenses',
  CLIENTS: '/dashboard/clients',
  REPORTS: '/dashboard/reports',
  SETTINGS: '/dashboard/settings',
  PROFILE: '/dashboard/profile',
} as const

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  EXPENSES: {
    LIST: '/api/expenses',
    CREATE: '/api/expenses',
    UPDATE: (id: string) => `/api/expenses/${id}`,
    DELETE: (id: string) => `/api/expenses/${id}`,
    APPROVE: (id: string) => `/api/expenses/${id}/approve`,
    REJECT: (id: string) => `/api/expenses/${id}/reject`,
  },
  CLIENTS: {
    LIST: '/api/clients',
    CREATE: '/api/clients',
    UPDATE: (id: string) => `/api/clients/${id}`,
    DELETE: (id: string) => `/api/clients/${id}`,
  },
} as const
