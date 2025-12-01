"""
Quote schemas (Pydantic models for request/response)
Handles validation for Sales & Quotes module
"""
from __future__ import annotations  # Enable PEP 563 postponed annotations

from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from models.quote import SaleStatus
from core.constants import CURRENCY_CODES


# ============================================================================
# QuoteItem Schemas
# ============================================================================


class QuoteItemCreate(BaseModel):
    """Schema for creating quote item"""

    product_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    discount_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)

    @field_validator("product_name")
    @classmethod
    def validate_product_name(cls, v):
        if not v.strip():
            raise ValueError("Product name cannot be empty")
        return v.strip()

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return round(v, 2)

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, v):
        if v < 0:
            raise ValueError("Unit price cannot be negative")
        return round(v, 2)

    @field_validator("discount_percent")
    @classmethod
    def validate_discount(cls, v):
        if v < 0 or v > 100:
            raise ValueError("Discount must be between 0 and 100")
        return round(v, 2)


class QuoteItemUpdate(BaseModel):
    """Schema for updating quote item"""

    product_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Quantity must be greater than 0")
        if v is not None:
            return round(v, 2)
        return v

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, v):
        if v is not None and v < 0:
            raise ValueError("Unit price cannot be negative")
        if v is not None:
            return round(v, 2)
        return v

    @field_validator("discount_percent")
    @classmethod
    def validate_discount(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Discount must be between 0 and 100")
        if v is not None:
            return round(v, 2)
        return v


class QuoteItemResponse(BaseModel):
    """Schema for quote item response"""

    id: UUID
    tenant_id: UUID
    quote_id: UUID
    product_name: str
    description: Optional[str]
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal
    subtotal: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Quote Schemas
# ============================================================================


class QuoteCreate(BaseModel):
    """Schema for creating quote"""

    client_id: UUID
    sales_rep_id: Optional[UUID] = None  # Will default to current user if not provided
    quote_number: str = Field(..., min_length=1, max_length=50)
    total_amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    status: SaleStatus = Field(default=SaleStatus.DRAFT)
    valid_until: date
    notes: Optional[str] = None
    items: List[QuoteItemCreate] = Field(..., min_length=1)

    @field_validator("quote_number")
    @classmethod
    def validate_quote_number(cls, v):
        if not v.strip():
            raise ValueError("Quote number cannot be empty")
        return v.strip()

    @field_validator("total_amount")
    @classmethod
    def validate_total_amount(cls, v):
        if v <= 0:
            raise ValueError("Total amount must be greater than 0")
        return round(v, 2)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        v = v.upper()
        if v not in CURRENCY_CODES:
            raise ValueError(f"Currency must be one of: {', '.join(CURRENCY_CODES)}")
        return v

    @field_validator("valid_until")
    @classmethod
    def validate_valid_until(cls, v):
        if v < date.today():
            raise ValueError("Valid until date must be today or in the future")
        return v

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Quote must have at least one item")
        return v


class QuoteUpdate(BaseModel):
    """Schema for updating quote"""

    client_id: Optional[UUID] = None
    sales_rep_id: Optional[UUID] = None
    quote_number: Optional[str] = Field(None, min_length=1, max_length=50)
    total_amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    status: Optional[SaleStatus] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("total_amount")
    @classmethod
    def validate_total_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Total amount must be greater than 0")
        if v is not None:
            return round(v, 2)
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        if v is not None:
            v = v.upper()
            if v not in CURRENCY_CODES:
                raise ValueError(f"Currency must be one of: {', '.join(CURRENCY_CODES)}")
        return v

    @field_validator("valid_until")
    @classmethod
    def validate_valid_until(cls, v):
        if v is not None and v < date.today():
            raise ValueError("Valid until date must be today or in the future")
        return v


class QuoteResponse(BaseModel):
    """Schema for quote response"""

    id: UUID
    tenant_id: UUID
    client_id: UUID
    sales_rep_id: UUID
    quote_number: str
    total_amount: Decimal
    currency: str
    status: SaleStatus
    valid_until: date
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuoteWithItems(QuoteResponse):
    """Schema for quote response with items"""

    items: List[QuoteItemResponse] = []

    class Config:
        from_attributes = True


class QuoteStatusUpdate(BaseModel):
    """Schema for updating quote status"""

    status: SaleStatus

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in SaleStatus:
            raise ValueError(f"Invalid status. Must be one of: {', '.join([s.value for s in SaleStatus])}")
        return v


# ============================================================================
# Summary and Statistics Schemas
# ============================================================================


class QuoteSummary(BaseModel):
    """Schema for quote summary/statistics"""

    total_quotes: int
    total_amount: Decimal
    draft_count: int
    draft_amount: Decimal
    sent_count: int
    sent_amount: Decimal
    accepted_count: int
    accepted_amount: Decimal
    rejected_count: int
    rejected_amount: Decimal
    expired_count: int
    expired_amount: Decimal
    conversion_rate: float  # accepted / (accepted + rejected + expired)
    top_clients: List[dict]  # Top 5 clients by quote value


# ============================================================================
# Pagination Schemas
# ============================================================================


class QuoteListResponse(BaseModel):
    """Schema for paginated quote list"""

    items: List[QuoteResponse]  # Changed from QuoteWithItems to avoid recursion
    total: int
    page: int
    page_size: int
    pages: int
