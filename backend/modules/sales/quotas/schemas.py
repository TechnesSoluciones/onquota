"""
Quota Pydantic Schemas
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, condecimal, model_validator


# ============================================
# Quota Line Schemas
# ============================================

class QuotaLineBase(BaseModel):
    """Base quota line schema"""
    product_line_id: UUID = Field(..., description="Product line ID")
    quota_amount: condecimal(ge=0, max_digits=15, decimal_places=2) = Field(..., description="Quota for this product line")


class QuotaLineCreate(QuotaLineBase):
    """Schema for creating a quota line"""
    pass


class QuotaLineUpdate(BaseModel):
    """Schema for updating a quota line"""
    quota_amount: Optional[condecimal(ge=0, max_digits=15, decimal_places=2)] = None


class QuotaLineResponse(QuotaLineBase):
    """Schema for quota line responses"""
    id: UUID
    tenant_id: UUID
    quota_id: UUID
    product_line_name: Optional[str] = None
    achieved_amount: Decimal
    achievement_percentage: Decimal
    created_at: datetime
    updated_at: datetime

    # Calculated properties
    is_achieved: bool = False
    remaining_quota: Decimal = Decimal('0')
    gap_percentage: Decimal = Decimal('0')

    class Config:
        from_attributes = True


# ============================================
# Quota Base Schemas
# ============================================

class QuotaBase(BaseModel):
    """Base quota schema with common fields"""
    year: int = Field(..., ge=2000, le=2100, description="Year (e.g., 2025)")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    user_id: UUID = Field(..., description="Sales representative ID")
    notes: Optional[str] = Field(None, max_length=10000, description="Additional notes")


# ============================================
# Request Schemas (for Create/Update)
# ============================================

class QuotaCreate(QuotaBase):
    """Schema for creating a new quota"""
    lines: list[QuotaLineCreate] = Field(..., min_length=1, description="Product line breakdown (at least one required)")

    @model_validator(mode='after')
    def validate_lines_not_empty(self):
        """Ensure at least one line is provided"""
        if not self.lines or len(self.lines) == 0:
            raise ValueError('At least one quota line is required')
        return self


class QuotaUpdate(BaseModel):
    """Schema for updating an existing quota"""
    notes: Optional[str] = Field(None, max_length=10000)
    # Lines are updated separately via dedicated endpoints


# ============================================
# Response Schemas
# ============================================

class QuotaResponse(QuotaBase):
    """Schema for quota responses"""
    id: UUID
    tenant_id: UUID

    # Denormalized field
    user_name: Optional[str] = None

    # Totals
    total_quota: Decimal
    total_achieved: Decimal
    achievement_percentage: Decimal

    # Metadata
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True


class QuotaListItem(BaseModel):
    """Simplified schema for quota list view"""
    id: UUID
    year: int
    month: int
    period_str: str  # YYYY-MM
    user_id: UUID
    user_name: Optional[str]
    total_quota: Decimal
    total_achieved: Decimal
    achievement_percentage: Decimal
    created_at: datetime

    # Calculated fields
    is_achieved: bool = False
    remaining_quota: Decimal = Decimal('0')
    gap_percentage: Decimal = Decimal('0')

    class Config:
        from_attributes = True


class QuotaDetailResponse(QuotaResponse):
    """Detailed quota response with lines"""
    lines: list[QuotaLineResponse] = Field(default=[], description="Product line breakdown")

    # Calculated fields
    is_achieved: bool = False
    remaining_quota: Decimal = Decimal('0')
    gap_percentage: Decimal = Decimal('0')

    class Config:
        from_attributes = True


# ============================================
# List Response with Pagination
# ============================================

class QuotaListResponse(BaseModel):
    """Paginated list of quotas"""
    items: list[QuotaListItem]
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

class QuotaStats(BaseModel):
    """Quota statistics for a user"""
    user_id: UUID
    user_name: Optional[str] = None

    # Current month
    current_month_quota: Decimal = Decimal('0')
    current_month_achieved: Decimal = Decimal('0')
    current_month_percentage: Decimal = Decimal('0')

    # Current year
    annual_quota: Decimal = Decimal('0')
    annual_achieved: Decimal = Decimal('0')
    annual_percentage: Decimal = Decimal('0')

    # Performance metrics
    months_achieved: int = 0
    total_months: int = 0
    achievement_rate: Decimal = Decimal('0')  # Percentage of months achieved


class QuotaDashboardStats(BaseModel):
    """Dashboard statistics for quotas"""
    period: str  # YYYY-MM
    year: int
    month: int

    # User-specific stats
    user_id: UUID
    user_name: Optional[str] = None

    # Current period
    total_quota: Decimal = Decimal('0')
    total_achieved: Decimal = Decimal('0')
    achievement_percentage: Decimal = Decimal('0')
    remaining_quota: Decimal = Decimal('0')
    gap_percentage: Decimal = Decimal('0')

    # Product line breakdown
    lines: list[QuotaLineResponse] = []

    # Annual accumulation
    ytd_quota: Decimal = Decimal('0')  # Year-to-date quota
    ytd_achieved: Decimal = Decimal('0')  # Year-to-date achieved
    ytd_percentage: Decimal = Decimal('0')


class QuotaMonthlyTrend(BaseModel):
    """Monthly quota trend for charts"""
    year: int
    month: int
    period_str: str  # YYYY-MM
    quota_amount: Decimal
    achieved_amount: Decimal
    achievement_percentage: Decimal
    gap_amount: Decimal


class QuotaProductLineTrend(BaseModel):
    """Product line trend across months"""
    product_line_id: UUID
    product_line_name: str
    monthly_data: list[QuotaMonthlyTrend] = []


class QuotaComparisonStats(BaseModel):
    """Month-to-month comparison statistics"""
    current_month: Optional[QuotaDashboardStats] = None
    previous_month: Optional[QuotaDashboardStats] = None

    # Changes
    quota_change: Decimal = Decimal('0')
    achieved_change: Decimal = Decimal('0')
    percentage_change: Decimal = Decimal('0')


# ============================================
# Filter Schemas
# ============================================

class QuotaFilters(BaseModel):
    """Filters for quota queries"""
    user_id: Optional[UUID] = None
    year: Optional[int] = Field(None, ge=2000, le=2100)
    month: Optional[int] = Field(None, ge=1, le=12)
    year_from: Optional[int] = Field(None, ge=2000, le=2100)
    year_to: Optional[int] = Field(None, ge=2000, le=2100)
    min_achievement_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    max_achievement_percentage: Optional[Decimal] = Field(None, ge=0, le=100)


# ============================================
# Product Line Schemas (Catalog)
# ============================================

class SalesProductLineBase(BaseModel):
    """Base product line schema"""
    name: str = Field(..., min_length=1, max_length=200, description="Product line name")
    code: Optional[str] = Field(None, max_length=50, description="Product line code")
    description: Optional[str] = Field(None, max_length=2000, description="Product line description")
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$', description="Hex color for UI")
    display_order: int = Field(default=0, ge=0, description="Display order")


class SalesProductLineCreate(SalesProductLineBase):
    """Schema for creating a product line"""
    pass


class SalesProductLineUpdate(BaseModel):
    """Schema for updating a product line"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=2000)
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    display_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class SalesProductLineResponse(SalesProductLineBase):
    """Schema for product line responses"""
    id: UUID
    tenant_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SalesProductLineListResponse(BaseModel):
    """Paginated list of product lines"""
    items: list[SalesProductLineResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    @staticmethod
    def calculate_total_pages(total: int, page_size: int) -> int:
        """Calculate total pages"""
        return (total + page_size - 1) // page_size if total > 0 else 0
