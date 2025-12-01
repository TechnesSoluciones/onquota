/**
 * LTA (Long Term Agreement) Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/modules/lta/schemas.py
 */

/**
 * LTA status enum
 */
export enum LTAStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

/**
 * Base LTA Agreement data
 * Synced with: LTAAgreementBase schema
 */
export interface LTAAgreementBase {
  agreement_number: string
  description?: string | null
  notes?: string | null
  is_active: boolean
}

/**
 * LTA Agreement Create Request
 * Synced with: LTAAgreementCreate schema
 */
export interface LTAAgreementCreate extends LTAAgreementBase {
  client_id: string
  bpid?: string | null
}

/**
 * LTA Agreement Update Request
 * Synced with: LTAAgreementUpdate schema
 */
export interface LTAAgreementUpdate {
  agreement_number?: string | null
  description?: string | null
  notes?: string | null
  is_active?: boolean | null
  bpid?: string | null
}

/**
 * LTA Agreement Response (full record)
 * Synced with: LTAAgreementResponse schema
 */
export interface LTAAgreement extends LTAAgreementBase {
  id: string
  tenant_id: string
  client_id: string
  bpid?: string | null
  status: string
  created_at: string  // ISO datetime string
  updated_at?: string | null  // ISO datetime string
  created_by: string
  updated_by?: string | null
}

/**
 * LTA Agreement with Client Information
 * Synced with: LTAAgreementWithClient schema
 */
export interface LTAAgreementWithClient extends LTAAgreement {
  client_name?: string | null
  client_email?: string | null
  client_bpid?: string | null
}

/**
 * Paginated list of LTA Agreements
 * Synced with: LTAListResponse schema
 */
export interface LTAListResponse {
  items: LTAAgreement[]
  total: number
  page: number
  limit: number
  pages: number
}
