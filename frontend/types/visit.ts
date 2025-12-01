/**
 * Visit and Commitment Types
 * TypeScript interfaces for enhanced visit tracking with full traceability
 */

// =============================================================================
// Enums
// =============================================================================

export enum VisitStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum VisitType {
  PRESENCIAL = 'presencial',
  VIRTUAL = 'virtual',
}

export enum CommitmentType {
  FOLLOW_UP = 'follow_up',
  SEND_QUOTE = 'send_quote',
  TECHNICAL_VISIT = 'technical_visit',
  DEMO = 'demo',
  DOCUMENTATION = 'documentation',
  OTHER = 'other',
}

export enum CommitmentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum CommitmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

// =============================================================================
// Visit Topic Interfaces
// =============================================================================

export interface VisitTopic {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitTopicCreate {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface VisitTopicUpdate {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
}

export interface VisitTopicDetail {
  id: string;
  visit_id: string;
  topic_id: string;
  topic_name?: string;
  topic_icon?: string;
  topic_color?: string;
  details?: string;
  created_at: string;
}

export interface VisitTopicDetailCreate {
  topic_id: string;
  details?: string;
}

// =============================================================================
// Visit Opportunity Interfaces
// =============================================================================

export interface VisitOpportunity {
  id: string;
  visit_id: string;
  opportunity_id: string;
  opportunity_name?: string;
  notes?: string;
  created_at: string;
}

export interface VisitOpportunityCreate {
  opportunity_id: string;
  notes?: string;
}

// =============================================================================
// Visit Interfaces
// =============================================================================

export interface Visit {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  client_id: string;
  client_name?: string;
  title: string;
  description?: string;
  status: VisitStatus;
  visit_type: VisitType;
  contact_person_name?: string;
  contact_person_role?: string;
  visit_date: string;
  duration_minutes?: number;
  check_in_time?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_in_address?: string;
  check_out_time?: string;
  check_out_latitude?: number;
  check_out_longitude?: number;
  check_out_address?: string;
  notes?: string;
  general_notes?: string;
  outcome?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  topics?: VisitTopicDetail[];
  opportunities?: VisitOpportunity[];
}

export interface VisitCreate {
  client_id: string;
  title: string;
  description?: string;
  visit_type: VisitType;
  contact_person_name?: string;
  contact_person_role?: string;
  visit_date: string;
  duration_minutes?: number;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_in_address?: string;
  general_notes?: string;
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  topics?: VisitTopicDetailCreate[];
}

export interface VisitUpdate {
  title?: string;
  description?: string;
  visit_type?: VisitType;
  contact_person_name?: string;
  contact_person_role?: string;
  visit_date?: string;
  duration_minutes?: number;
  status?: VisitStatus;
  general_notes?: string;
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

export interface VisitListResponse {
  items: Visit[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// =============================================================================
// Commitment Interfaces
// =============================================================================

export interface Commitment {
  id: string;
  tenant_id: string;
  visit_id?: string;
  client_id: string;
  assigned_to_user_id: string;
  created_by_user_id: string;
  type: CommitmentType;
  title: string;
  description?: string;
  due_date: string;
  priority: CommitmentPriority;
  status: CommitmentStatus;
  completed_at?: string;
  completion_notes?: string;
  reminder_sent: boolean;
  reminder_date?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  assigned_to_name?: string;
  created_by_name?: string;
}

export interface CommitmentCreate {
  client_id: string;
  assigned_to_user_id: string;
  type: CommitmentType;
  title: string;
  description?: string;
  due_date: string;
  priority?: CommitmentPriority;
  visit_id?: string;
  reminder_date?: string;
}

export interface CommitmentUpdate {
  assigned_to_user_id?: string;
  type?: CommitmentType;
  title?: string;
  description?: string;
  due_date?: string;
  priority?: CommitmentPriority;
  status?: CommitmentStatus;
  reminder_date?: string;
}

export interface CommitmentComplete {
  completion_notes?: string;
}

export interface CommitmentListResponse {
  items: Commitment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// =============================================================================
// Analytics Interfaces
// =============================================================================

export interface VisitAnalyticsSummary {
  total_visits: number;
  presencial_visits: number;
  virtual_visits: number;
  completed_visits: number;
  scheduled_visits: number;
  total_opportunities_generated: number;
  total_commitments_created: number;
  avg_duration_minutes?: number;
}

export interface VisitsByClientAnalytics {
  client_id: string;
  client_name: string;
  total_visits: number;
  last_visit_date?: string;
  opportunities_generated: number;
  commitments_pending: number;
  most_discussed_topics: string[];
}

export interface VisitTopicAnalytics {
  topic_id: string;
  topic_name: string;
  topic_icon?: string;
  topic_color?: string;
  times_discussed: number;
  unique_clients: number;
}

export interface ConversionFunnelAnalytics {
  period: string;
  total_visits: number;
  leads_generated: number;
  leads_to_quotes: number;
  quotes_to_orders: number;
  conversion_rate_visit_to_lead: number;
  conversion_rate_lead_to_quote: number;
  conversion_rate_quote_to_order: number;
  total_value_closed: number;
}

export interface CommitmentAnalytics {
  total_commitments: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  completion_rate: number;
  avg_days_to_complete?: number;
}

// =============================================================================
// Filter Interfaces
// =============================================================================

export interface VisitFilters {
  client_id?: string;
  status?: VisitStatus;
  visit_type?: VisitType;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface CommitmentFilters {
  client_id?: string;
  visit_id?: string;
  assigned_to_user_id?: string;
  status?: CommitmentStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// =============================================================================
// Helper Types
// =============================================================================

export const COMMITMENT_TYPE_LABELS: Record<CommitmentType, string> = {
  [CommitmentType.FOLLOW_UP]: 'Seguimiento',
  [CommitmentType.SEND_QUOTE]: 'Enviar Cotización',
  [CommitmentType.TECHNICAL_VISIT]: 'Visita Técnica',
  [CommitmentType.DEMO]: 'Demostración',
  [CommitmentType.DOCUMENTATION]: 'Documentación',
  [CommitmentType.OTHER]: 'Otro',
};

export const COMMITMENT_PRIORITY_LABELS: Record<CommitmentPriority, string> = {
  [CommitmentPriority.LOW]: 'Baja',
  [CommitmentPriority.MEDIUM]: 'Media',
  [CommitmentPriority.HIGH]: 'Alta',
  [CommitmentPriority.URGENT]: 'Urgente',
};

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  [CommitmentStatus.PENDING]: 'Pendiente',
  [CommitmentStatus.IN_PROGRESS]: 'En Progreso',
  [CommitmentStatus.COMPLETED]: 'Completado',
  [CommitmentStatus.CANCELLED]: 'Cancelado',
  [CommitmentStatus.OVERDUE]: 'Vencido',
};

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  [VisitType.PRESENCIAL]: 'Presencial',
  [VisitType.VIRTUAL]: 'Virtual',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  [VisitStatus.SCHEDULED]: 'Programada',
  [VisitStatus.IN_PROGRESS]: 'En Progreso',
  [VisitStatus.COMPLETED]: 'Completada',
  [VisitStatus.CANCELLED]: 'Cancelada',
};
