/**
 * Account Planner Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/schemas/account_plan.py
 */

/**
 * Plan status enum
 * Synced with: backend/models/account_plan.py - PlanStatus enum
 */
export enum PlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Milestone status enum
 * Synced with: backend/models/account_plan.py - MilestoneStatus enum
 */
export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

/**
 * SWOT category enum
 * Synced with: backend/models/account_plan.py - SWOTCategory enum
 */
export enum SWOTCategory {
  STRENGTH = 'strength',
  WEAKNESS = 'weakness',
  OPPORTUNITY = 'opportunity',
  THREAT = 'threat',
}

/**
 * SWOT Item interface
 */
export interface SWOTItem {
  id: string
  plan_id: string
  category: SWOTCategory
  description: string
  created_at: string
  updated_at: string
}

/**
 * SWOT Item create request
 */
export interface SWOTItemCreate {
  category: SWOTCategory
  description: string
}

/**
 * Milestone interface
 */
export interface Milestone {
  id: string
  plan_id: string
  title: string
  description: string | null
  due_date: string
  status: MilestoneStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Milestone create request
 */
export interface MilestoneCreate {
  title: string
  description?: string | null
  due_date: string
}

/**
 * Milestone update request
 */
export interface MilestoneUpdate {
  title?: string | null
  description?: string | null
  due_date?: string | null
  status?: MilestoneStatus | null
  completed_at?: string | null
}

/**
 * Account Plan interface
 */
export interface AccountPlan {
  id: string
  tenant_id: string
  client_id: string
  title: string
  description: string | null
  status: PlanStatus
  start_date: string
  end_date: string | null
  revenue_goal: number | null
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Account Plan with client info
 */
export interface AccountPlanWithClient extends AccountPlan {
  client_name: string
  client_email: string | null
}

/**
 * Account Plan create request
 */
export interface AccountPlanCreate {
  client_id: string
  title: string
  description?: string | null
  start_date: string
  end_date?: string | null
  revenue_goal?: number | null
  status?: PlanStatus
}

/**
 * Account Plan update request
 */
export interface AccountPlanUpdate {
  title?: string | null
  description?: string | null
  status?: PlanStatus | null
  start_date?: string | null
  end_date?: string | null
  revenue_goal?: number | null
}

/**
 * Account Plan detail (includes milestones and SWOT)
 */
export interface AccountPlanDetail extends AccountPlanWithClient {
  milestones: Milestone[]
  swot_items: SWOTItem[]
}

/**
 * Account Plan statistics
 */
export interface AccountPlanStats {
  total_milestones: number
  completed_milestones: number
  pending_milestones: number
  overdue_milestones: number
  completion_percentage: number
  days_remaining: number | null
  swot_breakdown: {
    strengths: number
    weaknesses: number
    opportunities: number
    threats: number
  }
}

/**
 * Paginated account plans list response
 */
export interface AccountPlanListResponse {
  items: AccountPlanWithClient[]
  total: number
  page: number
  page_size: number
  pages: number
}

/**
 * Account plan filters for list queries
 */
export interface AccountPlanFilters {
  client_id?: string
  status?: PlanStatus
  search?: string
  page?: number
  page_size?: number
}

/**
 * Alias for AccountPlanWithClient
 */
export type AccountPlanResponse = AccountPlanWithClient
