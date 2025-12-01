from __future__ import annotations

"""
Expense schemas (Pydantic models for request/response)
"""
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, ValidationInfo
from models.expense import ExpenseStatus
from core.constants import CURRENCY_CODES


# ============================================================================
# ExpenseCategory Schemas
# ============================================================================


class ExpenseCategoryCreate(BaseModel):
    """Schema for creating expense category"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError("Category name cannot be empty")
        return v.strip()

    @field_validator("color")
    @classmethod
    def validate_color(cls, v):
        if v and not v.startswith("#"):
            raise ValueError("Color must be in hex format (#RRGGBB)")
        if v and len(v) != 7:
            raise ValueError("Color must be 7 characters (#RRGGBB)")
        return v


class ExpenseCategoryUpdate(BaseModel):
    """Schema for updating expense category"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)
    is_active: Optional[bool] = None


class ExpenseCategoryResponse(BaseModel):
    """Schema for expense category response"""

    id: UUID
    tenant_id: UUID
    name: str
    description: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Expense Schemas
# ============================================================================


class ExpenseCreate(BaseModel):
    """Schema for creating expense"""

    category_id: Optional[UUID] = None
    amount: Decimal = Field(..., gt=0, )
    currency: str = Field(default="USD", max_length=3)
    description: str = Field(..., min_length=1, max_length=5000)
    date: date
    receipt_url: Optional[str] = Field(None, max_length=500)
    receipt_number: Optional[str] = Field(None, max_length=100)
    vendor_name: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        # Round to 2 decimal places
        return round(v, 2)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v):
        # Don't allow future dates
        if v > date.today():
            raise ValueError("Expense date cannot be in the future")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        # Convert to uppercase
        v = v.upper()
        # Validate against supported currencies
        if v not in CURRENCY_CODES:
            raise ValueError(f"Currency must be one of: {', '.join(CURRENCY_CODES)}")
        return v


class ExpenseUpdate(BaseModel):
    """Schema for updating expense"""

    category_id: Optional[UUID] = None
    amount: Optional[Decimal] = Field(None, gt=0, )
    currency: Optional[str] = Field(None, max_length=3)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    date: Optional[date] = None
    receipt_url: Optional[str] = Field(None, max_length=500)
    receipt_number: Optional[str] = Field(None, max_length=100)
    vendor_name: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Amount must be greater than 0")
        if v is not None:
            return round(v, 2)
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v):
        if v is not None and v > date.today():
            raise ValueError("Expense date cannot be in the future")
        return v


class ExpenseResponse(BaseModel):
    """Schema for expense response"""

    id: UUID
    tenant_id: UUID
    user_id: UUID
    category_id: Optional[UUID]
    amount: Decimal
    currency: str
    description: str
    date: date
    receipt_url: Optional[str]
    receipt_number: Optional[str]
    vendor_name: Optional[str]
    status: ExpenseStatus
    approved_by: Optional[UUID]
    rejection_reason: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExpenseWithCategory(ExpenseResponse):
    """Schema for expense response with category details"""

    category: Optional[ExpenseCategoryResponse] = None

    class Config:
        from_attributes = True


class ExpenseStatusUpdate(BaseModel):
    """Schema for updating expense status"""

    status: ExpenseStatus
    rejection_reason: Optional[str] = None

    @field_validator("rejection_reason")
    @classmethod
    def validate_rejection_reason(cls, v, info: ValidationInfo):
        # Rejection reason is required when status is rejected
        if info.data.get("status") == ExpenseStatus.REJECTED and not v:
            raise ValueError("Rejection reason is required when rejecting an expense")
        return v


class ExpenseSummary(BaseModel):
    """Schema for expense summary/statistics"""

    total_amount: Decimal
    total_count: int
    pending_count: int
    approved_count: int
    rejected_count: int
    by_category: List[dict]  # [{category_name, amount, count}]


# ============================================================================
# Pagination Schemas
# ============================================================================


class ExpenseListResponse(BaseModel):
    """Schema for paginated expense list"""

    items: List[ExpenseResponse]  # Changed from ExpenseWithCategory to avoid recursion
    total: int
    page: int
    page_size: int
    pages: int
