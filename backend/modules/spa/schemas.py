"""
Pydantic schemas for SPA module
"""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, validator


# ==================== Upload Schemas ====================

class SPARowData(BaseModel):
    """Schema for parsed row data from Excel/TSV"""
    bpid: str
    ship_to_name: str
    article_number: str
    article_description: Optional[str] = None
    list_price: Decimal
    app_net_price: Decimal
    uom: str = "EA"
    start_date: date
    end_date: date

    class Config:
        from_attributes = True


class SPAUploadResult(BaseModel):
    """Result of SPA file upload"""
    batch_id: UUID
    filename: str
    total_rows: int
    success_count: int
    error_count: int
    clients_created: int = 0
    clients_linked: int = 0
    errors: List[dict] = []

    class Config:
        from_attributes = True


class SPAUploadLogResponse(BaseModel):
    """SPA Upload Log Response"""
    id: UUID
    batch_id: UUID
    filename: str
    total_rows: int
    success_count: int
    error_count: int
    duration_seconds: Optional[Decimal]
    error_message: Optional[str]
    created_at: datetime
    uploaded_by: UUID

    class Config:
        from_attributes = True


# ==================== SPA Agreement Schemas ====================

class SPAAgreementBase(BaseModel):
    """Base schema for SPA Agreement"""
    bpid: str = Field(..., description="Business Partner ID")
    ship_to_name: str
    article_number: str
    article_description: Optional[str] = None
    list_price: Decimal
    app_net_price: Decimal
    discount_percent: Decimal
    uom: str = "EA"
    start_date: date
    end_date: date

    @validator('discount_percent')
    def validate_discount(cls, v):
        if not (0 <= v <= 100):
            raise ValueError('Discount must be between 0 and 100')
        return v

    @validator('list_price', 'app_net_price')
    def validate_prices(cls, v):
        if v < 0:
            raise ValueError('Price must be positive')
        return v

    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class SPAAgreementCreate(SPAAgreementBase):
    """Schema for creating SPA Agreement"""
    client_id: Optional[UUID] = None
    batch_id: UUID


class SPAAgreementResponse(SPAAgreementBase):
    """Response schema for SPA Agreement"""
    id: UUID
    tenant_id: UUID
    client_id: UUID
    batch_id: UUID
    is_active: bool
    status: str  # active, pending, expired
    is_currently_valid: bool
    created_at: datetime
    created_by: UUID

    class Config:
        from_attributes = True


class SPAAgreementWithClient(SPAAgreementResponse):
    """SPA Agreement with client information"""
    client_name: Optional[str] = None
    client_email: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== Search and Filter Schemas ====================

class SPASearchParams(BaseModel):
    """Parameters for searching SPAs"""
    client_id: Optional[UUID] = None
    bpid: Optional[str] = None
    article_number: Optional[str] = None
    search: Optional[str] = Field(None, description="Search in article number or description")
    is_active: Optional[bool] = None
    status: Optional[str] = Field(None, description="active, pending, or expired")
    start_date_from: Optional[date] = None
    start_date_to: Optional[date] = None
    end_date_from: Optional[date] = None
    end_date_to: Optional[date] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=500)
    sort_by: str = Field("created_at", description="Field to sort by")
    sort_order: str = Field("desc", description="asc or desc")


class SPAListResponse(BaseModel):
    """Paginated list of SPA Agreements"""
    items: List[SPAAgreementResponse]
    total: int
    page: int
    page_size: int
    pages: int

    class Config:
        from_attributes = True


# ==================== Discount Search Schemas ====================

class SPADiscountSearchRequest(BaseModel):
    """Request to search for discount"""
    article_number: str = Field(..., description="Product catalog/article number")
    client_id: Optional[UUID] = Field(None, description="Client ID (optional)")
    bpid: Optional[str] = Field(None, description="Business Partner ID (optional)")
    check_date: Optional[date] = Field(None, description="Date to check validity (default: today)")

    @validator('check_date', always=True)
    def set_default_date(cls, v):
        return v or date.today()


class SPADiscountResponse(BaseModel):
    """Response with best discount found"""
    found: bool
    discount_percent: Optional[Decimal] = None
    list_price: Optional[Decimal] = None
    app_net_price: Optional[Decimal] = None
    agreement_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    client_id: Optional[UUID] = None
    bpid: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== Statistics Schemas ====================

class SPAStatsResponse(BaseModel):
    """SPA Statistics"""
    total_agreements: int
    active_agreements: int
    pending_agreements: int
    expired_agreements: int
    total_clients: int
    total_products: int
    avg_discount: Decimal
    max_discount: Decimal
    min_discount: Decimal
    total_uploads: int
    last_upload_date: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== Export Schemas ====================

class SPAExportRequest(BaseModel):
    """Request to export SPAs"""
    filters: Optional[SPASearchParams] = None
    format: str = Field("excel", description="excel or csv")


# ==================== Bulk Operations ====================

class SPABulkDeleteRequest(BaseModel):
    """Request to bulk delete SPAs"""
    agreement_ids: List[UUID]


class SPABulkDeleteResponse(BaseModel):
    """Response from bulk delete"""
    deleted_count: int
    errors: List[dict] = []
