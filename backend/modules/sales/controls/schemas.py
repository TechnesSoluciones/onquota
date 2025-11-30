"""
Sales Control Pydantic Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator, condecimal

from models.sales_control import SalesControlStatus


# ============================================
# Sales Control Line Schemas
# ============================================

class SalesControlLineBase(BaseModel):
    """Base sales control line schema"""
    product_line_id: UUID = Field(..., description="Product line ID")
    line_amount: condecimal(ge=0, max_digits=15, decimal_places=2) = Field(..., description="Amount for this product line")
    description: Optional[str] = Field(None, max_length=1000, description="Line description")


class SalesControlLineCreate(SalesControlLineBase):
    """Schema for creating a sales control line"""
    pass


class SalesControlLineUpdate(BaseModel):
    """Schema for updating a sales control line"""
    product_line_id: Optional[UUID] = None
    line_amount: Optional[condecimal(ge=0, max_digits=15, decimal_places=2)] = None
    description: Optional[str] = Field(None, max_length=1000)


class SalesControlLineResponse(SalesControlLineBase):
    """Schema for sales control line responses"""
    id: UUID
    tenant_id: UUID
    sales_control_id: UUID
    product_line_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Sales Control Base Schemas
# ============================================

class SalesControlBase(BaseModel):
    """Base sales control schema with common fields"""
    folio_number: str = Field(..., min_length=1, max_length=50, description="Internal folio number")
    client_po_number: Optional[str] = Field(None, max_length=100, description="Client's PO reference number")
    po_reception_date: date = Field(..., description="When client sent PO")
    system_entry_date: date = Field(..., description="When entered into our system")
    lead_time_days: Optional[int] = Field(None, ge=0, le=365, description="Lead time in days")
    client_id: UUID = Field(..., description="Client ID")
    quotation_id: Optional[UUID] = Field(None, description="Quotation ID (optional)")
    sales_control_amount: condecimal(ge=0, max_digits=15, decimal_places=2) = Field(..., description="Order value")
    currency: str = Field(default="USD", min_length=3, max_length=3, description="Currency code")
    status: SalesControlStatus = Field(default=SalesControlStatus.PENDING, description="Order status")
    concept: Optional[str] = Field(None, max_length=5000, description="PO description/concept")
    notes: Optional[str] = Field(None, max_length=10000, description="Internal notes")

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        """Validate currency code is uppercase"""
        return v.upper()

    @model_validator(mode='after')
    def validate_dates(self):
        """Validate that system_entry_date is not before po_reception_date"""
        if self.system_entry_date < self.po_reception_date:
            raise ValueError('system_entry_date cannot be before po_reception_date')
        return self


# ============================================
# Request Schemas (for Create/Update)
# ============================================

class SalesControlCreate(SalesControlBase):
    """Schema for creating a new sales control"""
    assigned_to: Optional[UUID] = Field(None, description="Sales rep ID (defaults to current user if not provided)")
    lines: list[SalesControlLineCreate] = Field(default=[], description="Product line breakdown")

    # Promise date will be calculated automatically if not provided
    promise_date: Optional[date] = Field(None, description="Delivery promise date (calculated if not provided)")


class SalesControlUpdate(BaseModel):
    """Schema for updating an existing sales control"""
    folio_number: Optional[str] = Field(None, min_length=1, max_length=50)
    client_po_number: Optional[str] = Field(None, max_length=100)
    po_reception_date: Optional[date] = None
    system_entry_date: Optional[date] = None
    promise_date: Optional[date] = None
    lead_time_days: Optional[int] = Field(None, ge=0, le=365)
    client_id: Optional[UUID] = None
    quotation_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    sales_control_amount: Optional[condecimal(ge=0, max_digits=15, decimal_places=2)] = None
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    status: Optional[SalesControlStatus] = None
    concept: Optional[str] = Field(None, max_length=5000)
    notes: Optional[str] = Field(None, max_length=10000)

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        """Validate currency code is uppercase"""
        return v.upper() if v else None


class SalesControlUpdateLeadTime(BaseModel):
    """Schema for updating lead time (recalculates promise date)"""
    lead_time_days: int = Field(..., ge=0, le=365, description="New lead time in days")


class SalesControlMarkInProduction(BaseModel):
    """Schema for marking sales control as in production"""
    pass  # No additional fields needed


class SalesControlMarkDelivered(BaseModel):
    """Schema for marking sales control as delivered"""
    actual_delivery_date: Optional[date] = Field(None, description="Actual delivery date (defaults to today)")


class SalesControlMarkInvoiced(BaseModel):
    """Schema for marking sales control as invoiced"""
    invoice_number: str = Field(..., min_length=1, max_length=100, description="Invoice number")
    invoice_date: Optional[date] = Field(None, description="Invoice date (defaults to today)")


class SalesControlMarkPaid(BaseModel):
    """Schema for marking sales control as paid"""
    payment_date: Optional[date] = Field(None, description="Payment received date (defaults to today)")


class SalesControlCancel(BaseModel):
    """Schema for cancelling sales control"""
    reason: Optional[str] = Field(None, max_length=500, description="Cancellation reason")


# ============================================
# Response Schemas
# ============================================

class SalesControlResponse(SalesControlBase):
    """Schema for sales control responses"""
    id: UUID
    tenant_id: UUID
    assigned_to: UUID
    promise_date: date

    # Denormalized fields
    client_name: Optional[str] = None
    sales_rep_name: Optional[str] = None

    # Delivery tracking
    actual_delivery_date: Optional[date] = None

    # Invoice tracking
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    payment_date: Optional[date] = None

    # Metadata
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True


class SalesControlListItem(BaseModel):
    """Simplified schema for sales control list view"""
    id: UUID
    folio_number: str
    client_po_number: Optional[str]
    po_reception_date: date
    promise_date: date
    actual_delivery_date: Optional[date]
    client_id: UUID
    client_name: Optional[str]
    sales_control_amount: Decimal
    currency: str
    status: SalesControlStatus
    assigned_to: UUID
    sales_rep_name: Optional[str]
    created_at: datetime

    # Calculated fields
    is_overdue: bool = False
    days_until_promise: Optional[int] = None

    class Config:
        from_attributes = True


class SalesControlDetailResponse(SalesControlResponse):
    """Detailed sales control response with relationships"""
    lines: list[SalesControlLineResponse] = Field(default=[], description="Product line breakdown")

    # Calculated fields
    is_overdue: bool = False
    days_until_promise: Optional[int] = None
    days_in_production: Optional[int] = None
    was_delivered_on_time: Optional[bool] = None

    class Config:
        from_attributes = True


# ============================================
# List Response with Pagination
# ============================================

class SalesControlListResponse(BaseModel):
    """Paginated list of sales controls"""
    items: list[SalesControlListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

    @staticmethod
    def calculate_total_pages(total: int, page_size: int) -> int:
        """Calculate total pages"""
        return (total + page_size - 1) // page_size if total > 0 else 0


# ============================================
# Statistics Schemas
# ============================================

class SalesControlStats(BaseModel):
    """Sales control statistics"""
    total_controls: int = 0
    total_sales_amount: Decimal = Decimal('0')

    # By status
    pending_count: int = 0
    pending_amount: Decimal = Decimal('0')

    in_production_count: int = 0
    in_production_amount: Decimal = Decimal('0')

    delivered_count: int = 0
    delivered_amount: Decimal = Decimal('0')

    invoiced_count: int = 0
    invoiced_amount: Decimal = Decimal('0')

    paid_count: int = 0
    paid_amount: Decimal = Decimal('0')

    cancelled_count: int = 0
    cancelled_amount: Decimal = Decimal('0')

    # Overdue
    overdue_count: int = 0
    overdue_amount: Decimal = Decimal('0')

    # On-time delivery rate
    on_time_delivery_rate: Decimal = Decimal('0')


class SalesControlMonthlyStats(BaseModel):
    """Monthly sales control statistics"""
    year: int
    month: int
    period_str: str  # YYYY-MM

    total_controls: int = 0
    total_sales_amount: Decimal = Decimal('0')

    paid_count: int = 0
    paid_amount: Decimal = Decimal('0')

    on_time_delivery_rate: Decimal = Decimal('0')


class SalesControlsByClientStats(BaseModel):
    """Sales control statistics by client"""
    client_id: UUID
    client_name: str
    total_controls: int
    total_sales_amount: Decimal
    paid_count: int
    paid_amount: Decimal
    pending_count: int


# ============================================
# Filter Schemas
# ============================================

class SalesControlFilters(BaseModel):
    """Filters for sales control queries"""
    client_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    quotation_id: Optional[UUID] = None
    status: Optional[SalesControlStatus] = None
    po_date_from: Optional[date] = None
    po_date_to: Optional[date] = None
    promise_date_from: Optional[date] = None
    promise_date_to: Optional[date] = None
    min_amount: Optional[Decimal] = Field(None, ge=0)
    max_amount: Optional[Decimal] = Field(None, ge=0)
    is_overdue: Optional[bool] = None
    search: Optional[str] = Field(None, max_length=100, description="Search in folio_number, client_po_number, concept")
