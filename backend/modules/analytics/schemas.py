"""
Pydantic schemas for SPA Analytics API
Request/response models for FastAPI endpoints
"""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from models.analysis import AnalysisStatus, FileType


class AnalysisCreate(BaseModel):
    """Schema for creating a new analysis"""

    name: str = Field(..., min_length=3, max_length=100, description="Analysis name")
    description: Optional[str] = Field(None, max_length=500, description="Optional description")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate and clean name"""
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Name must be at least 3 characters long")
        return v


class AnalysisBase(BaseModel):
    """Base schema with common analysis fields"""

    id: UUID
    tenant_id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    file_path: str
    file_type: FileType
    status: AnalysisStatus
    row_count: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnalysisResponse(AnalysisBase):
    """Schema for analysis response with full results"""

    results: Optional[Dict[str, Any]] = None

    @property
    def is_completed(self) -> bool:
        return self.status == AnalysisStatus.COMPLETED

    @property
    def is_failed(self) -> bool:
        return self.status == AnalysisStatus.FAILED

    @property
    def is_processing(self) -> bool:
        return self.status == AnalysisStatus.PROCESSING


class AnalysisListItem(AnalysisBase):
    """Schema for analysis list items (without full results)"""

    total_sales: Optional[float] = None
    total_products: Optional[int] = None

    @staticmethod
    def from_analysis(analysis: Any) -> "AnalysisListItem":
        """Create list item from Analysis model"""
        data = {
            "id": analysis.id,
            "tenant_id": analysis.tenant_id,
            "user_id": analysis.user_id,
            "name": analysis.name,
            "description": analysis.description,
            "file_path": analysis.file_path,
            "file_type": analysis.file_type,
            "status": analysis.status,
            "row_count": analysis.row_count,
            "error_message": analysis.error_message,
            "created_at": analysis.created_at,
            "updated_at": analysis.updated_at,
        }

        # Extract summary stats if available
        if analysis.results and analysis.status == AnalysisStatus.COMPLETED:
            summary = analysis.results.get("summary", {})
            data["total_sales"] = summary.get("total_sales")
            data["total_products"] = summary.get("total_rows")

        return AnalysisListItem(**data)


class AnalysisListResponse(BaseModel):
    """Paginated list of analyses"""

    items: List[AnalysisListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

    @staticmethod
    def create(items: List[Any], total: int, page: int, page_size: int) -> "AnalysisListResponse":
        """Create paginated response"""
        import math

        return AnalysisListResponse(
            items=[AnalysisListItem.from_analysis(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if page_size > 0 else 0,
        )


class ABCClassification(BaseModel):
    """ABC classification for a category"""

    category: str = Field(..., description="ABC category (A, B, or C)")
    count: int = Field(..., description="Number of items in this category")
    percentage: float = Field(..., description="Percentage of total items")
    sales: Decimal = Field(..., description="Total sales for this category")
    sales_percentage: float = Field(..., description="Percentage of total sales")

    class Config:
        from_attributes = True


class TopItem(BaseModel):
    """Top performing product or client"""

    name: str = Field(..., description="Product or client name")
    sales: Decimal = Field(..., description="Total sales")
    quantity: int = Field(..., description="Total quantity sold")
    avg_price: Decimal = Field(..., description="Average price")
    category: str = Field(..., description="ABC category")
    percentage_of_total: float = Field(..., description="Percentage of total sales")


class SummaryStats(BaseModel):
    """Summary statistics"""

    total_rows: int
    total_sales: Decimal
    avg_sale: Decimal
    median_sale: Decimal
    std_dev: Decimal
    percentiles: Dict[str, Decimal] = Field(default_factory=dict)


class ABCAnalysisDetail(BaseModel):
    """Detailed ABC analysis by category"""

    A: ABCClassification
    B: ABCClassification
    C: ABCClassification


class DiscountAnalysis(BaseModel):
    """Discount analysis results"""

    total_discounts: Decimal
    avg_discount_pct: float
    discount_by_category: Dict[str, Decimal]
    top_discounted_products: List[TopItem]


class MarginAnalysis(BaseModel):
    """Margin analysis results"""

    total_margin: Decimal
    avg_margin_pct: float
    margin_by_category: Dict[str, Decimal]
    top_margin_products: List[TopItem]
    bottom_margin_products: List[TopItem]


class MonthlyTrend(BaseModel):
    """Monthly trend data"""

    month: str = Field(..., description="Month in YYYY-MM format")
    sales: Decimal
    quantity: int
    avg_price: Decimal
    growth_pct: Optional[float] = Field(None, description="Growth % vs previous month")


class AnalysisSummary(BaseModel):
    """Complete analysis summary"""

    summary: SummaryStats
    abc_analysis: Dict[str, ABCAnalysisDetail]  # by_product, by_client
    top_products: List[TopItem]
    top_clients: Optional[List[TopItem]] = None
    discount_analysis: Optional[DiscountAnalysis] = None
    margin_analysis: Optional[MarginAnalysis] = None
    monthly_trends: Optional[List[MonthlyTrend]] = None
    insights: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ABCDetailResponse(BaseModel):
    """Detailed ABC classification response"""

    analysis_id: UUID
    analysis_name: str
    by: str = Field(..., description="Classification type (product or client)")
    categories: ABCAnalysisDetail
    items: List[TopItem] = Field(..., description="All items with their categories")
    total_items: int
    created_at: datetime


class ExportFormat(str):
    """Export format options"""

    EXCEL = "excel"
    PDF = "pdf"


class AnalysisUpdate(BaseModel):
    """Schema for updating analysis metadata"""

    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate and clean name"""
        if v is not None:
            v = v.strip()
            if len(v) < 3:
                raise ValueError("Name must be at least 3 characters long")
        return v


class FileUploadResponse(BaseModel):
    """Response after file upload"""

    analysis_id: UUID
    name: str
    file_type: FileType
    status: AnalysisStatus
    message: str = "File uploaded successfully. Analysis is being processed."

    class Config:
        from_attributes = True
