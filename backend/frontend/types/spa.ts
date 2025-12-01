/**
 * TypeScript types para módulo SPA
 * Sincronizado con schemas Pydantic del backend
 */

export interface SPAAgreement {
  id: string;
  tenant_id: string;
  client_id: string;
  batch_id: string;
  bpid: string;
  ship_to_name: string;
  article_number: string;
  article_description: string | null;
  list_price: number;
  app_net_price: number;
  discount_percent: number;
  uom: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  is_active: boolean;
  created_at: string; // ISO datetime
  updated_at: string | null;
  created_by: string;
}

export interface SPAAgreementWithClient extends SPAAgreement {
  client: {
    id: string;
    name: string;
    email: string | null;
    bpid: string | null;
  };
}

export interface SPADiscountMatch {
  spa_id: string;
  discount_percent: number;
  app_net_price: number;
  list_price: number;
  uom: string;
  start_date: string;
  end_date: string;
  article_description: string | null;
}

export interface SPADiscountResponse {
  found: boolean;
  client_id: string;
  article_number: string;
  discount: SPADiscountMatch | null;
}

export interface SPADiscountSearchRequest {
  client_id: string;
  article_number: string;
}

export interface SPAUploadError {
  row: number;
  bpid: string;
  article: string;
  error: string;
}

export interface SPAUploadResult {
  batch_id: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  errors: SPAUploadError[];
  duration_seconds: number;
  upload_log_id: string;
}

export interface SPASearchParams {
  page?: number;
  page_size?: number;
  client_id?: string;
  article_number?: string;
  bpid?: string;
  active_only?: boolean;
  search?: string;
  sort_by?: string;
  sort_desc?: boolean;
}

export interface SPAListResponse {
  items: SPAAgreement[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SPAStatsResponse {
  total_spas: number;
  active_spas: number;
  expired_spas: number;
  expiring_soon: number; // Próximos 30 días
  total_clients_with_spas: number;
  average_discount: number;
}

export interface SPAUploadLog {
  id: string;
  batch_id: string;
  filename: string;
  uploaded_by: string;
  tenant_id: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

// Frontend-specific types

export interface SPATableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SPAFilterState {
  search: string;
  activeOnly: boolean;
  clientId: string | null;
  articleNumber: string | null;
  bpid: string | null;
}

export interface SPAUploadState {
  uploading: boolean;
  progress: number;
  result: SPAUploadResult | null;
  error: string | null;
}
