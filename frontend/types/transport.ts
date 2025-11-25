/**
 * Transport Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/modules/transport/schemas.py
 */

/**
 * Vehicle type enum
 * Synced with: backend/models/transport.py - VehicleType enum
 */
export enum VehicleType {
  CAR = 'car',
  VAN = 'van',
  TRUCK = 'truck',
  MOTORCYCLE = 'motorcycle',
  OTHER = 'other',
}

/**
 * Vehicle status enum
 * Synced with: backend/models/transport.py - VehicleStatus enum
 */
export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

/**
 * Shipment status enum
 * Synced with: backend/models/transport.py - ShipmentStatus enum
 */
export enum ShipmentStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * Shipment expense type enum
 * Synced with: backend/models/transport.py - ExpenseType enum
 */
export enum ShipmentExpenseType {
  FUEL = 'fuel',
  TOLL = 'toll',
  PARKING = 'parking',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

// ============================================================================
// VEHICLE TYPES
// ============================================================================

/**
 * Vehicle response
 * Synced with: VehicleResponse schema
 */
export interface Vehicle {
  id: string
  tenant_id: string
  plate_number: string
  brand: string
  model: string
  year: string | null
  vehicle_type: VehicleType
  status: VehicleStatus
  assigned_driver_id: string | null
  capacity_kg: number | null
  fuel_type: string | null
  fuel_efficiency_km_l: number | null
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  mileage_km: number | null
  notes: string | null
  driver_name: string | null
  shipment_count: number
  created_at: string
  updated_at: string
}

/**
 * Vehicle create request
 * Synced with: VehicleCreate schema
 */
export interface VehicleCreate {
  plate_number: string
  brand: string
  model: string
  year?: string | null
  vehicle_type: VehicleType
  status?: VehicleStatus
  assigned_driver_id?: string | null
  capacity_kg?: number | null
  fuel_type?: string | null
  fuel_efficiency_km_l?: number | null
  last_maintenance_date?: string | null
  next_maintenance_date?: string | null
  mileage_km?: number | null
  notes?: string | null
}

/**
 * Vehicle update request
 * Synced with: VehicleUpdate schema
 */
export interface VehicleUpdate {
  plate_number?: string
  brand?: string
  model?: string
  year?: string | null
  vehicle_type?: VehicleType
  status?: VehicleStatus
  assigned_driver_id?: string | null
  capacity_kg?: number | null
  fuel_type?: string | null
  fuel_efficiency_km_l?: number | null
  last_maintenance_date?: string | null
  next_maintenance_date?: string | null
  mileage_km?: number | null
  notes?: string | null
}

/**
 * Paginated vehicle list response
 * Synced with: VehicleListResponse schema
 */
export interface VehicleListResponse {
  vehicles: Vehicle[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Vehicle summary statistics
 * Synced with: VehicleSummary schema
 */
export interface VehicleSummary {
  total_vehicles: number
  active_vehicles: number
  in_maintenance: number
  inactive_vehicles: number
  total_capacity_kg: number
  avg_fuel_efficiency: number
  vehicles_needing_maintenance: number
}

/**
 * Vehicle filters for list queries
 * Synced with: VehicleFilters schema
 */
export interface VehicleFilters {
  status?: VehicleStatus
  vehicle_type?: VehicleType
  assigned_driver_id?: string
  search?: string
  page?: number
  page_size?: number
}

// ============================================================================
// SHIPMENT EXPENSE TYPES
// ============================================================================

/**
 * Shipment expense response
 * Synced with: ShipmentExpenseResponse schema
 */
export interface ShipmentExpense {
  id: string
  tenant_id: string
  shipment_id: string
  expense_type: ShipmentExpenseType
  amount: number
  currency: string
  expense_date: string
  description: string | null
  location: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Shipment expense create request
 * Synced with: ShipmentExpenseCreate schema
 */
export interface ShipmentExpenseCreate {
  expense_type: ShipmentExpenseType
  amount: number
  currency?: string
  expense_date: string
  description?: string | null
  location?: string | null
  receipt_url?: string | null
}

/**
 * Shipment expense update request
 * Synced with: ShipmentExpenseUpdate schema
 */
export interface ShipmentExpenseUpdate {
  expense_type?: ShipmentExpenseType
  amount?: number
  currency?: string
  expense_date?: string
  description?: string | null
  location?: string | null
  receipt_url?: string | null
}

// ============================================================================
// SHIPMENT TYPES
// ============================================================================

/**
 * Shipment response
 * Synced with: ShipmentResponse schema
 */
export interface Shipment {
  id: string
  tenant_id: string
  shipment_number: string
  client_id: string | null
  vehicle_id: string | null
  driver_id: string | null
  origin_address: string
  origin_city: string
  destination_address: string
  destination_city: string
  scheduled_date: string
  pickup_date: string | null
  delivery_date: string | null
  description: string | null
  weight_kg: number | null
  quantity: number | null
  estimated_distance_km: number | null
  actual_distance_km: number | null
  freight_cost: number
  currency: string
  status: ShipmentStatus
  notes: string | null
  client_name: string | null
  vehicle_plate: string | null
  driver_name: string | null
  total_expenses: number
  expense_count: number
  created_at: string
  updated_at: string
}

/**
 * Shipment with full expense details
 * Synced with: ShipmentWithExpenses schema
 */
export interface ShipmentWithExpenses extends Shipment {
  expenses: ShipmentExpense[]
}

/**
 * Shipment create request
 * Synced with: ShipmentCreate schema
 */
export interface ShipmentCreate {
  shipment_number: string
  client_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
  origin_address: string
  origin_city: string
  destination_address: string
  destination_city: string
  scheduled_date: string
  pickup_date?: string | null
  delivery_date?: string | null
  description?: string | null
  weight_kg?: number | null
  quantity?: number | null
  estimated_distance_km?: number | null
  actual_distance_km?: number | null
  freight_cost?: number
  currency?: string
  status?: ShipmentStatus
  notes?: string | null
}

/**
 * Shipment update request
 * Synced with: ShipmentUpdate schema
 */
export interface ShipmentUpdate {
  shipment_number?: string
  client_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
  origin_address?: string
  origin_city?: string
  destination_address?: string
  destination_city?: string
  scheduled_date?: string
  pickup_date?: string | null
  delivery_date?: string | null
  description?: string | null
  weight_kg?: number | null
  quantity?: number | null
  estimated_distance_km?: number | null
  actual_distance_km?: number | null
  freight_cost?: number
  currency?: string
  status?: ShipmentStatus
  notes?: string | null
}

/**
 * Paginated shipment list response
 * Synced with: ShipmentListResponse schema
 */
export interface ShipmentListResponse {
  shipments: Shipment[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Shipment summary statistics
 * Synced with: ShipmentSummary schema
 */
export interface ShipmentSummary {
  total_shipments: number
  pending_shipments: number
  in_transit_shipments: number
  delivered_shipments: number
  cancelled_shipments: number
  total_revenue: number
  total_expenses: number
  net_profit: number
  avg_distance_km: number
  total_distance_km: number
}

/**
 * Shipment filters for list queries
 * Synced with: ShipmentFilters schema
 */
export interface ShipmentFilters {
  status?: ShipmentStatus
  client_id?: string
  vehicle_id?: string
  driver_id?: string
  origin_city?: string
  destination_city?: string
  scheduled_date_from?: string
  scheduled_date_to?: string
  delivery_date_from?: string
  delivery_date_to?: string
  search?: string
  page?: number
  page_size?: number
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Helper type for status badge colors
 */
export const VEHICLE_STATUS_COLORS = {
  [VehicleStatus.ACTIVE]: 'green',
  [VehicleStatus.MAINTENANCE]: 'yellow',
  [VehicleStatus.INACTIVE]: 'gray',
} as const

/**
 * Helper type for status badge colors
 */
export const SHIPMENT_STATUS_COLORS = {
  [ShipmentStatus.PENDING]: 'gray',
  [ShipmentStatus.IN_TRANSIT]: 'blue',
  [ShipmentStatus.DELIVERED]: 'green',
  [ShipmentStatus.CANCELLED]: 'red',
} as const

/**
 * Helper type for status badge labels
 */
export const VEHICLE_STATUS_LABELS = {
  [VehicleStatus.ACTIVE]: 'Activo',
  [VehicleStatus.MAINTENANCE]: 'Mantenimiento',
  [VehicleStatus.INACTIVE]: 'Inactivo',
} as const

/**
 * Helper type for status badge labels
 */
export const SHIPMENT_STATUS_LABELS = {
  [ShipmentStatus.PENDING]: 'Pendiente',
  [ShipmentStatus.IN_TRANSIT]: 'En Tránsito',
  [ShipmentStatus.DELIVERED]: 'Entregado',
  [ShipmentStatus.CANCELLED]: 'Cancelado',
} as const

/**
 * Helper type for expense type labels
 */
export const EXPENSE_TYPE_LABELS = {
  [ShipmentExpenseType.FUEL]: 'Combustible',
  [ShipmentExpenseType.TOLL]: 'Peaje',
  [ShipmentExpenseType.PARKING]: 'Estacionamiento',
  [ShipmentExpenseType.MAINTENANCE]: 'Mantenimiento',
  [ShipmentExpenseType.OTHER]: 'Otro',
} as const
