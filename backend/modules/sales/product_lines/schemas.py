"""
Product Lines Schemas
Pydantic models for product lines API
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ============================================================================
# Product Line Schemas
# ============================================================================

class SalesProductLineBase(BaseModel):
    """Base schema for product line"""
    name: str = Field(..., min_length=1, max_length=200, description="Product line name")
    code: Optional[str] = Field(None, max_length=50, description="Product line code/SKU")
    description: Optional[str] = Field(None, description="Product line description")
    color: Optional[str] = Field(None, max_length=7, description="Color for UI (hex format: #RRGGBB)")
    display_order: int = Field(default=0, description="Display order for sorting")
    is_active: bool = Field(default=True, description="Is product line active")

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        """Validate hex color format"""
        if v is not None:
            if not v.startswith("#"):
                raise ValueError("Color must start with #")
            if len(v) != 7:
                raise ValueError("Color must be in format #RRGGBB")
            try:
                int(v[1:], 16)
            except ValueError:
                raise ValueError("Invalid hex color value")
        return v


class SalesProductLineCreate(SalesProductLineBase):
    """Schema for creating product line"""
    pass


class SalesProductLineUpdate(BaseModel):
    """Schema for updating product line"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        """Validate hex color format"""
        if v is not None:
            if not v.startswith("#"):
                raise ValueError("Color must start with #")
            if len(v) != 7:
                raise ValueError("Color must be in format #RRGGBB")
            try:
                int(v[1:], 16)
            except ValueError:
                raise ValueError("Invalid hex color value")
        return v


class SalesProductLineResponse(SalesProductLineBase):
    """Schema for product line response"""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SalesProductLineListItem(BaseModel):
    """Schema for product line in list"""
    id: UUID
    name: str
    code: Optional[str]
    color: Optional[str]
    display_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class SalesProductLineListResponse(BaseModel):
    """Schema for paginated product line list"""
    items: List[SalesProductLineResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    @staticmethod
    def calculate_total_pages(total: int, page_size: int) -> int:
        """Calculate total number of pages"""
        if page_size <= 0:
            return 0
        return (total + page_size - 1) // page_size
