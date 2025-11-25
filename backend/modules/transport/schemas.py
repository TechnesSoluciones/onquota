"""
Transport Module Schemas
Pydantic models for vehicles, shipments, and expenses
"""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from decimal import Decimal
from datetime import date
from uuid import UUID

from models.transport import (
    VehicleType,
    VehicleStatus,
    ShipmentStatus,
    ExpenseType,
)


# ============================================================================
# VEHICLE SCHEMAS
# ============================================================================


class VehicleBase(BaseModel):
    """Base vehicle fields"""

    plate_number: str = Field(..., min_length=1, max_length=20, description="License plate number")
    brand: str = Field(..., min_length=1, max_length=100, description="Vehicle brand")
    model: str = Field(..., min_length=1, max_length=100, description="Vehicle model")
    year: Optional[str] = Field(None, max_length=4, description="Manufacturing year")
    vehicle_type: VehicleType = Field(..., description="Type of vehicle")
    status: VehicleStatus = Field(VehicleStatus.ACTIVE, description="Current status")
    assigned_driver_id: Optional[UUID] = Field(None, description="Assigned driver user_id")
    capacity_kg: Optional[Decimal] = Field(None, ge=0, description="Load capacity in kilograms")
    fuel_type: Optional[str] = Field(None, max_length=50, description="Fuel type")
    fuel_efficiency_km_l: Optional[Decimal] = Field(None, ge=0, description="Fuel efficiency km/liter")
    last_maintenance_date: Optional[date] = Field(None, description="Last maintenance date")
    next_maintenance_date: Optional[date] = Field(None, description="Next scheduled maintenance")
    mileage_km: Optional[Decimal] = Field(None, ge=0, description="Current mileage in km")
    notes: Optional[str] = Field(None, description="Additional notes")


class VehicleCreate(VehicleBase):
    """Schema for creating a new vehicle"""
    pass


class VehicleUpdate(BaseModel):
    """Schema for updating a vehicle (all fields optional)"""

    plate_number: Optional[str] = Field(None, min_length=1, max_length=20)
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    year: Optional[str] = Field(None, max_length=4)
    vehicle_type: Optional[VehicleType] = None
    status: Optional[VehicleStatus] = None
    assigned_driver_id: Optional[UUID] = None
    capacity_kg: Optional[Decimal] = Field(None, ge=0)
    fuel_type: Optional[str] = Field(None, max_length=50)
    fuel_efficiency_km_l: Optional[Decimal] = Field(None, ge=0)
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    mileage_km: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None


class VehicleResponse(VehicleBase):
    """Schema for vehicle API responses"""

    id: UUID
    tenant_id: UUID
    driver_name: Optional[str] = Field(None, description="Assigned driver name")
    shipment_count: int = Field(0, description="Number of shipments for this vehicle")
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class VehicleListResponse(BaseModel):
    """Schema for paginated vehicle list"""

    vehicles: List[VehicleResponse] = Field(..., description="List of vehicles")
    total: int = Field(..., description="Total number of vehicles")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class VehicleSummary(BaseModel):
    """Vehicle summary statistics"""

    total_vehicles: int = Field(..., description="Total number of vehicles")
    active_vehicles: int = Field(..., description="Active vehicles")
    in_maintenance: int = Field(..., description="Vehicles in maintenance")
    inactive_vehicles: int = Field(..., description="Inactive vehicles")
    total_capacity_kg: Decimal = Field(..., description="Total fleet capacity")
    avg_fuel_efficiency: Decimal = Field(..., description="Average fuel efficiency")
    vehicles_needing_maintenance: int = Field(..., description="Vehicles due for maintenance")


# ============================================================================
# SHIPMENT EXPENSE SCHEMAS
# ============================================================================


class ShipmentExpenseBase(BaseModel):
    """Base shipment expense fields"""

    expense_type: ExpenseType = Field(..., description="Type of expense")
    amount: Decimal = Field(..., ge=0, description="Expense amount")
    currency: str = Field("USD", max_length=3, description="Currency code")
    expense_date: date = Field(..., description="Date of expense")
    description: Optional[str] = Field(None, description="Expense description")
    location: Optional[str] = Field(None, max_length=255, description="Location where expense occurred")
    receipt_url: Optional[str] = Field(None, max_length=500, description="URL to receipt/invoice")


class ShipmentExpenseCreate(ShipmentExpenseBase):
    """Schema for creating a shipment expense"""
    pass


class ShipmentExpenseUpdate(BaseModel):
    """Schema for updating a shipment expense"""

    expense_type: Optional[ExpenseType] = None
    amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    expense_date: Optional[date] = None
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    receipt_url: Optional[str] = Field(None, max_length=500)


class ShipmentExpenseResponse(ShipmentExpenseBase):
    """Schema for shipment expense API responses"""

    id: UUID
    tenant_id: UUID
    shipment_id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ============================================================================
# SHIPMENT SCHEMAS
# ============================================================================


class ShipmentBase(BaseModel):
    """Base shipment fields"""

    shipment_number: str = Field(..., min_length=1, max_length=50, description="Unique shipment number")
    client_id: Optional[UUID] = Field(None, description="Client receiving the shipment")
    vehicle_id: Optional[UUID] = Field(None, description="Assigned vehicle")
    driver_id: Optional[UUID] = Field(None, description="Assigned driver")

    # Locations
    origin_address: str = Field(..., min_length=1, max_length=255, description="Origin address")
    origin_city: str = Field(..., min_length=1, max_length=100, description="Origin city")
    destination_address: str = Field(..., min_length=1, max_length=255, description="Destination address")
    destination_city: str = Field(..., min_length=1, max_length=100, description="Destination city")

    # Dates
    scheduled_date: date = Field(..., description="Scheduled pickup/delivery date")
    pickup_date: Optional[date] = Field(None, description="Actual pickup date")
    delivery_date: Optional[date] = Field(None, description="Actual delivery date")

    # Cargo details
    description: Optional[str] = Field(None, description="Cargo description")
    weight_kg: Optional[Decimal] = Field(None, ge=0, description="Weight in kg")
    quantity: Optional[Decimal] = Field(None, ge=0, description="Quantity of items")

    # Costs
    estimated_distance_km: Optional[Decimal] = Field(None, ge=0, description="Estimated distance in km")
    actual_distance_km: Optional[Decimal] = Field(None, ge=0, description="Actual distance traveled")
    freight_cost: Decimal = Field(0, ge=0, description="Freight cost charged")
    currency: str = Field("USD", max_length=3, description="Currency")

    # Status and notes
    status: ShipmentStatus = Field(ShipmentStatus.PENDING, description="Current status")
    notes: Optional[str] = Field(None, description="Additional notes")


class ShipmentCreate(ShipmentBase):
    """Schema for creating a new shipment"""
    pass


class ShipmentUpdate(BaseModel):
    """Schema for updating a shipment (all fields optional)"""

    shipment_number: Optional[str] = Field(None, min_length=1, max_length=50)
    client_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    origin_address: Optional[str] = Field(None, min_length=1, max_length=255)
    origin_city: Optional[str] = Field(None, min_length=1, max_length=100)
    destination_address: Optional[str] = Field(None, min_length=1, max_length=255)
    destination_city: Optional[str] = Field(None, min_length=1, max_length=100)
    scheduled_date: Optional[date] = None
    pickup_date: Optional[date] = None
    delivery_date: Optional[date] = None
    description: Optional[str] = None
    weight_kg: Optional[Decimal] = Field(None, ge=0)
    quantity: Optional[Decimal] = Field(None, ge=0)
    estimated_distance_km: Optional[Decimal] = Field(None, ge=0)
    actual_distance_km: Optional[Decimal] = Field(None, ge=0)
    freight_cost: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    status: Optional[ShipmentStatus] = None
    notes: Optional[str] = None


class ShipmentResponse(ShipmentBase):
    """Schema for shipment API responses"""

    id: UUID
    tenant_id: UUID
    client_name: Optional[str] = Field(None, description="Client name")
    vehicle_plate: Optional[str] = Field(None, description="Vehicle plate number")
    driver_name: Optional[str] = Field(None, description="Driver name")
    total_expenses: Decimal = Field(0, description="Total expenses for this shipment")
    expense_count: int = Field(0, description="Number of expenses")
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ShipmentWithExpenses(ShipmentResponse):
    """Schema for shipment with full expense details"""

    expenses: List[ShipmentExpenseResponse] = Field(
        default_factory=list, description="List of shipment expenses"
    )


class ShipmentListResponse(BaseModel):
    """Schema for paginated shipment list"""

    shipments: List[ShipmentResponse] = Field(..., description="List of shipments")
    total: int = Field(..., description="Total number of shipments")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class ShipmentSummary(BaseModel):
    """Shipment summary statistics"""

    total_shipments: int = Field(..., description="Total number of shipments")
    pending_shipments: int = Field(..., description="Pending shipments")
    in_transit_shipments: int = Field(..., description="Shipments in transit")
    delivered_shipments: int = Field(..., description="Delivered shipments")
    cancelled_shipments: int = Field(..., description="Cancelled shipments")
    total_revenue: Decimal = Field(..., description="Total freight revenue")
    total_expenses: Decimal = Field(..., description="Total shipment expenses")
    net_profit: Decimal = Field(..., description="Net profit (revenue - expenses)")
    avg_distance_km: Decimal = Field(..., description="Average distance per shipment")
    total_distance_km: Decimal = Field(..., description="Total distance traveled")


# ============================================================================
# FILTER SCHEMAS
# ============================================================================


class VehicleFilters(BaseModel):
    """Filters for vehicle list queries"""

    status: Optional[VehicleStatus] = None
    vehicle_type: Optional[VehicleType] = None
    assigned_driver_id: Optional[UUID] = None
    search: Optional[str] = Field(None, description="Search in plate_number, brand, model")


class ShipmentFilters(BaseModel):
    """Filters for shipment list queries"""

    status: Optional[ShipmentStatus] = None
    client_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    scheduled_date_from: Optional[date] = None
    scheduled_date_to: Optional[date] = None
    delivery_date_from: Optional[date] = None
    delivery_date_to: Optional[date] = None
    search: Optional[str] = Field(None, description="Search in shipment_number, description")
