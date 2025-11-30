"""
Quotation Pydantic Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, condecimal

from models.quotation import QuoteStatus


# ============================================
# Base Schemas
# ============================================

class QuotationBase(BaseModel):
    """Base quotation schema with common fields"""
    quote_number: str = Field(..., min_length=1, max_length=100, description="External system quote number")
    quote_date: date = Field(..., description="Date quote was created")
    client_id: UUID = Field(..., description="Client ID")
    opportunity_id: Optional[UUID] = Field(None, description="Opportunity ID (optional)")
    quoted_amount: condecimal(ge=0, max_digits=15, decimal_places=2) = Field(..., description="Total quote value")
    currency: str = Field(default="USD", min_length=3, max_length=3, description="Currency code")
    status: QuoteStatus = Field(default=QuoteStatus.COTIZADO, description="Quote status")
    notes: Optional[str] = Field(None, max_length=10000, description="Additional notes")
    products_description: Optional[str] = Field(None, max_length=5000, description="Brief description of quoted items")

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        """Validate currency code is uppercase"""
        return v.upper()


# ============================================
# Request Schemas (for Create/Update)
# ============================================

class QuotationCreate(QuotationBase):
    """Schema for creating a new quotation"""
    assigned_to: Optional[UUID] = Field(None, description="Sales rep ID (defaults to current user if not provided)")


class QuotationUpdate(BaseModel):
    """Schema for updating an existing quotation"""
    quote_number: Optional[str] = Field(None, min_length=1, max_length=100)
    quote_date: Optional[date] = None
    client_id: Optional[UUID] = None
    opportunity_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    quoted_amount: Optional[condecimal(ge=0, max_digits=15, decimal_places=2)] = None
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    status: Optional[QuoteStatus] = None
    notes: Optional[str] = Field(None, max_length=10000)
    products_description: Optional[str] = Field(None, max_length=5000)

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        """Validate currency code is uppercase"""
        return v.upper() if v else None


class QuotationMarkWon(BaseModel):
    """Schema for marking quotation as won"""
    won_date: Optional[date] = Field(None, description="Date quote was won (defaults to today)")
    partially: bool = Field(default=False, description="True for partially won, False for fully won")


class QuotationMarkLost(BaseModel):
    """Schema for marking quotation as lost"""
    lost_date: Optional[date] = Field(None, description="Date quote was lost (defaults to today)")
    lost_reason: Optional[str] = Field(None, max_length=500, description="Reason why quote was lost")


# ============================================
# Response Schemas
# ============================================

class QuotationResponse(QuotationBase):
    """Schema for quotation responses"""
    id: UUID
    tenant_id: UUID
    assigned_to: UUID

    # Denormalized fields
    client_name: Optional[str] = None
    sales_rep_name: Optional[str] = None

    # Win/Loss tracking
    won_date: Optional[date] = None
    lost_date: Optional[date] = None
    lost_reason: Optional[str] = None

    # Metadata
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True


class QuotationListItem(BaseModel):
    """Simplified schema for quotation list view"""
    id: UUID
    quote_number: str
    quote_date: date
    client_id: UUID
    client_name: Optional[str]
    quoted_amount: Decimal
    currency: str
    status: QuoteStatus
    assigned_to: UUID
    sales_rep_name: Optional[str]
    won_date: Optional[date]
    lost_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


class QuotationDetailResponse(QuotationResponse):
    """Detailed quotation response with relationships"""
    # Include related sales controls count
    sales_controls_count: int = Field(default=0, description="Number of related sales controls")

    class Config:
        from_attributes = True


# ============================================
# List Response with Pagination
# ============================================

class QuotationListResponse(BaseModel):
    """Paginated list of quotations"""
    items: list[QuotationListItem]
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

class QuotationStats(BaseModel):
    """Quotation statistics"""
    total_quotations: int = 0
    total_quoted_amount: Decimal = Decimal('0')

    # By status
    cotizado_count: int = 0
    cotizado_amount: Decimal = Decimal('0')

    ganado_count: int = 0
    ganado_amount: Decimal = Decimal('0')

    perdido_count: int = 0
    perdido_amount: Decimal = Decimal('0')

    ganado_parcialmente_count: int = 0
    ganado_parcialmente_amount: Decimal = Decimal('0')

    # Win rate
    win_rate: Decimal = Field(default=Decimal('0'), description="Percentage of won quotations")

    # Average amounts
    average_quote_amount: Decimal = Decimal('0')
    average_won_amount: Decimal = Decimal('0')


class QuotationMonthlyStats(BaseModel):
    """Monthly quotation statistics"""
    year: int
    month: int
    period_str: str  # YYYY-MM

    total_quotations: int = 0
    total_quoted_amount: Decimal = Decimal('0')

    won_count: int = 0
    won_amount: Decimal = Decimal('0')

    lost_count: int = 0
    lost_amount: Decimal = Decimal('0')

    win_rate: Decimal = Decimal('0')


class QuotationsByClientStats(BaseModel):
    """Quotations statistics by client"""
    client_id: UUID
    client_name: str
    total_quotations: int
    total_quoted_amount: Decimal
    won_count: int
    won_amount: Decimal
    lost_count: int
    pending_count: int


# ============================================
# Filter Schemas
# ============================================

class QuotationFilters(BaseModel):
    """Filters for quotation queries"""
    client_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    status: Optional[QuoteStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    min_amount: Optional[Decimal] = Field(None, ge=0)
    max_amount: Optional[Decimal] = Field(None, ge=0)
    search: Optional[str] = Field(None, max_length=100, description="Search in quote_number, client_name, products_description")
