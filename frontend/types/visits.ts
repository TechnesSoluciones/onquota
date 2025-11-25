/**
 * Visits and Calls Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/modules/visits/schemas.py
 */

/**
 * Visit status enum
 * Synced with: backend/modules/visits/models.py - VisitStatus enum
 */
export enum VisitStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Call type enum
 * Synced with: backend/modules/visits/models.py - CallType enum
 */
export enum CallType {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  MISSED = 'missed',
}

/**
 * Call status enum
 * Synced with: backend/modules/visits/models.py - CallStatus enum
 */
export enum CallStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  NO_ANSWER = 'no_answer',
  VOICEMAIL = 'voicemail',
  CANCELLED = 'cancelled',
}

// ============================================================================
// VISIT TYPES
// ============================================================================

/**
 * Visit create request
 * Synced with: VisitCreate schema
 */
export interface VisitCreate {
  client_id: string
  title: string
  description?: string | null
  scheduled_date: string
  duration_minutes?: number | null
  notes?: string | null
  outcome?: string | null
  follow_up_required?: boolean
  follow_up_date?: string | null
}

/**
 * Visit update request
 * Synced with: VisitUpdate schema
 */
export interface VisitUpdate {
  title?: string | null
  description?: string | null
  scheduled_date?: string | null
  duration_minutes?: number | null
  status?: VisitStatus | null
  notes?: string | null
  outcome?: string | null
  follow_up_required?: boolean | null
  follow_up_date?: string | null
}

/**
 * Visit check-in request (GPS)
 * Synced with: VisitCheckIn schema
 */
export interface VisitCheckIn {
  latitude: number
  longitude: number
  address?: string | null
}

/**
 * Visit check-out request (GPS)
 * Synced with: VisitCheckOut schema
 */
export interface VisitCheckOut {
  latitude: number
  longitude: number
  address?: string | null
  notes?: string | null
  outcome?: string | null
}

/**
 * Visit response
 * Synced with: VisitResponse schema
 */
export interface VisitResponse {
  id: string
  tenant_id: string

  // User (Sales Rep)
  user_id: string
  user_name: string | null

  // Client
  client_id: string
  client_name: string | null

  // Visit Details
  title: string
  description: string | null
  status: VisitStatus

  // Schedule
  scheduled_date: string
  duration_minutes: number | null

  // Check-in (GPS)
  check_in_time: string | null
  check_in_latitude: number | null
  check_in_longitude: number | null
  check_in_address: string | null

  // Check-out (GPS)
  check_out_time: string | null
  check_out_latitude: number | null
  check_out_longitude: number | null
  check_out_address: string | null

  // Outcome
  notes: string | null
  outcome: string | null
  follow_up_required: boolean
  follow_up_date: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Paginated visit list response
 * Synced with: VisitListResponse schema
 */
export interface VisitListResponse {
  items: VisitResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Visit filters for list queries
 */
export interface VisitFilters {
  client_id?: string
  status?: VisitStatus
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

// ============================================================================
// CALL TYPES
// ============================================================================

/**
 * Call create request
 * Synced with: CallCreate schema
 */
export interface CallCreate {
  client_id: string
  phone_number?: string | null
  title: string
  description?: string | null
  call_type: CallType
  scheduled_date?: string | null
  notes?: string | null
  outcome?: string | null
  follow_up_required?: boolean
  follow_up_date?: string | null
}

/**
 * Call update request
 * Synced with: CallUpdate schema
 */
export interface CallUpdate {
  phone_number?: string | null
  title?: string | null
  description?: string | null
  call_type?: CallType | null
  status?: CallStatus | null
  scheduled_date?: string | null
  notes?: string | null
  outcome?: string | null
  follow_up_required?: boolean | null
  follow_up_date?: string | null
  recording_url?: string | null
}

/**
 * Call start request
 * Synced with: CallStart schema
 */
export interface CallStart {
  phone_number?: string | null
}

/**
 * Call end request
 * Synced with: CallEnd schema
 */
export interface CallEnd {
  notes?: string | null
  outcome?: string | null
  status: CallStatus
}

/**
 * Call response
 * Synced with: CallResponse schema
 */
export interface CallResponse {
  id: string
  tenant_id: string

  // User (Sales Rep)
  user_id: string
  user_name: string | null

  // Client
  client_id: string
  client_name: string | null
  phone_number: string | null

  // Call Details
  title: string
  description: string | null
  call_type: CallType
  status: CallStatus

  // Schedule
  scheduled_date: string | null

  // Call Time
  start_time: string | null
  end_time: string | null
  duration_seconds: number | null

  // Outcome
  notes: string | null
  outcome: string | null
  follow_up_required: boolean
  follow_up_date: string | null

  // Recording
  recording_url: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Paginated call list response
 * Synced with: CallListResponse schema
 */
export interface CallListResponse {
  items: CallResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Call filters for list queries
 */
export interface CallFilters {
  client_id?: string
  call_type?: CallType
  status?: CallStatus
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

/**
 * Aliases for easier imports
 */
export type Visit = VisitResponse
export type Call = CallResponse
