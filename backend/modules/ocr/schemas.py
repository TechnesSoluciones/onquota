"""
Pydantic schemas for OCR module
Request/response validation and serialization
"""
from __future__ import annotations

from datetime import datetime
from datetime import date as DateType
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict
from modules.ocr.models import OCRJobStatus


class ExtractedItem(BaseModel):
    """Individual item from receipt/invoice"""
    description: str = Field(..., description="Item description")
    quantity: Optional[Decimal] = Field(None, ge=0, description="Quantity")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="Unit price")
    total: Optional[Decimal] = Field(None, ge=0, description="Line total")

    model_config = ConfigDict(from_attributes=True)


class ExtractedData(BaseModel):
    """Structured data extracted from receipt/invoice"""
    provider: Optional[str] = Field(None, description="Provider/vendor name")
    amount: Optional[Decimal] = Field(None, ge=0, description="Total amount")
    currency: str = Field(default="USD", description="Currency code (ISO 4217)")
    expense_date: Optional[DateType] = Field(None, description="Receipt/invoice date")  # Renamed from 'date' to avoid conflict
    category: Optional[str] = Field(None, description="Expense category")
    items: list[ExtractedItem] | None = Field(default=None, description="Line items")
    receipt_number: Optional[str] = Field(None, description="Receipt/invoice number")
    tax_amount: Optional[Decimal] = Field(None, ge=0, description="Tax amount")
    subtotal: Optional[Decimal] = Field(None, ge=0, description="Subtotal before tax")

    model_config = ConfigDict(from_attributes=True)


class ExtractedDataUpdate(BaseModel):
    """User-confirmed/edited extracted data"""
    provider: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., ge=0, description="Total amount")
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    expense_date: DateType = Field(..., description="Receipt/invoice date")  # Renamed from 'date' to avoid conflict
    category: str = Field(..., min_length=1, max_length=100)
    items: list[ExtractedItem] | None = Field(default=None)
    receipt_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)

    model_config = ConfigDict(from_attributes=True)


class OCRJobCreate(BaseModel):
    """Schema for creating OCR job (file upload handled separately)"""
    ocr_engine: str = Field(default="tesseract", description="OCR engine to use")

    @field_validator("ocr_engine")
    @classmethod
    def validate_engine(cls, v: str) -> str:
        """Validate OCR engine"""
        allowed_engines = ["tesseract", "google_vision"]
        if v not in allowed_engines:
            raise ValueError(f"OCR engine must be one of: {allowed_engines}")
        return v

    model_config = ConfigDict(from_attributes=True)


class OCRJobResponse(BaseModel):
    """Schema for OCR job response"""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    image_path: str
    original_filename: str
    file_size: Decimal
    mime_type: str
    status: OCRJobStatus
    confidence: Optional[Decimal] = None
    extracted_data: Optional[ExtractedData] = None
    confirmed_data: Optional[ExtractedData] = None
    error_message: Optional[str] = None
    retry_count: Decimal
    processing_time_seconds: Optional[Decimal] = None
    ocr_engine: str
    is_confirmed: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OCRJobListItem(BaseModel):
    """Simplified schema for job listing"""
    id: UUID
    original_filename: str
    status: OCRJobStatus
    confidence: Optional[Decimal] = None
    provider: Optional[str] = None
    amount: Optional[Decimal] = None
    expense_date: Optional[DateType] = None  # Renamed from 'date' to avoid conflict
    is_confirmed: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_ocr_job(cls, job):
        """Create from OCRJob model"""
        data = job.get_final_data() if job.get_final_data() else {}
        return cls(
            id=job.id,
            original_filename=job.original_filename,
            status=job.status,
            confidence=job.confidence,
            provider=data.get("provider"),
            amount=data.get("amount"),
            expense_date=data.get("date"),  # Map 'date' from DB to 'expense_date' in schema
            is_confirmed=job.is_confirmed,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

    model_config = ConfigDict(from_attributes=True)


class OCRJobListResponse(BaseModel):
    """Paginated list of OCR jobs"""
    items: list[OCRJobListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = ConfigDict(from_attributes=True)


class OCRJobStatusUpdate(BaseModel):
    """Internal schema for updating job status"""
    status: OCRJobStatus
    confidence: Optional[Decimal] = Field(None, ge=0, le=1)
    extracted_data: Optional[dict] = None
    raw_text: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_seconds: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class OCRJobConfirm(BaseModel):
    """Schema for confirming extraction results"""
    confirmed_data: ExtractedDataUpdate
    create_expense: bool = Field(
        default=False,
        description="Create expense from confirmed data",
    )

    model_config = ConfigDict(from_attributes=True)
