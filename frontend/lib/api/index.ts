/**
 * API Services Index
 * Central export point for all API services
 */

import { apiClient as client } from './client'

export { apiClient, setAuthState, clearAuth, isAuthenticated } from './client'

// Export apiClient as 'api' for backward compatibility
export const api = client

export { authApi } from './auth'
export { expensesApi, expenseCategoriesApi } from './expenses'
export { clientsApi } from './clients'
export { transportApi } from './transport'
export { accountPlansApi } from './accounts'
export {
  visitsApi,
  callsApi,
  visitTopicsApi,
  visitTopicDetailsApi,
  visitOpportunitiesApi,
  visitAnalyticsApi,
} from './visits'
export { commitmentsApi } from './commitments'
export { spaApi } from './spa'
