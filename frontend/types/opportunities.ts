/**
 * Opportunity Types
 * TypeScript types for CRM Opportunities / Sales Pipeline
 */

/**
 * Opportunity stage enum
 * Represents the stages in the sales pipeline
 */
export enum OpportunityStage {
  LEAD = 'LEAD',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

/**
 * Stage display configuration
 */
export const STAGE_CONFIG: Record<
  OpportunityStage,
  {
    label: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  [OpportunityStage.LEAD]: {
    label: 'Lead',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  [OpportunityStage.QUALIFIED]: {
    label: 'Qualified',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  [OpportunityStage.PROPOSAL]: {
    label: 'Proposal',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
  },
  [OpportunityStage.NEGOTIATION]: {
    label: 'Negotiation',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  [OpportunityStage.CLOSED_WON]: {
    label: 'Closed Won',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  [OpportunityStage.CLOSED_LOST]: {
    label: 'Closed Lost',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
}

/**
 * Opportunity create request
 */
export interface OpportunityCreate {
  name: string
  client_id: string
  estimated_value: number
  currency?: string
  probability?: number
  expected_close_date?: string
  stage?: OpportunityStage
  assigned_to?: string
  description?: string
  notes?: string
}

/**
 * Opportunity update request
 */
export interface OpportunityUpdate {
  name?: string
  client_id?: string
  estimated_value?: number
  currency?: string
  probability?: number
  expected_close_date?: string
  stage?: OpportunityStage
  assigned_to?: string
  description?: string
  notes?: string
}

/**
 * Opportunity response
 */
export interface OpportunityResponse {
  id: string
  tenant_id: string
  name: string
  client_id: string
  client_name: string
  estimated_value: number
  currency: string
  probability: number
  expected_close_date: string | null
  stage: OpportunityStage
  assigned_to: string | null
  sales_rep_name: string | null
  description: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Paginated opportunity list response
 */
export interface OpportunityListResponse {
  items: OpportunityResponse[]
  total: number
  page: number
  page_size: number
  pages: number
}

/**
 * Opportunity filters
 */
export interface OpportunityFilters {
  stage?: OpportunityStage
  client_id?: string
  assigned_to?: string
  min_value?: number
  max_value?: number
  search?: string
  page?: number
  page_size?: number
}

/**
 * Pipeline statistics
 */
export interface PipelineStats {
  total_opportunities: number
  total_value: number
  weighted_value: number
  win_rate: number
  avg_days_to_close: number
  by_stage: Array<{
    stage: OpportunityStage
    count: number
    total_value: number
  }>
}

/**
 * Stage update request
 */
export interface StageUpdateRequest {
  stage: OpportunityStage
}

/**
 * Alias for OpportunityResponse
 */
export type Opportunity = OpportunityResponse
