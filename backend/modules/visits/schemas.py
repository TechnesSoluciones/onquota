"""
Visit and Call Schemas
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

from models.visit import VisitStatus, CallType, CallStatus


# ============================================================================
# Visit Schemas
# ============================================================================

class VisitBase(BaseModel):
    """Base visit schema with common fields"""
    client_id: UUID = Field(..., description="Client UUID")
    title: str = Field(..., min_length=1, max_length=200, description="Visit title")
    description: Optional[str] = Field(None, description="Visit description")
    scheduled_date: datetime = Field(..., description="Scheduled visit date/time")
    duration_minutes: Optional[Decimal] = Field(None, ge=0, description="Expected duration in minutes")
    outcome: Optional[str] = Field(None, max_length=200, description="Visit outcome")
    follow_up_required: bool = Field(default=False, description="Whether follow-up is required")
    follow_up_date: Optional[datetime] = Field(None, description="Follow-up date if required")


class VisitCreate(VisitBase):
    """Schema for creating a new visit"""
    notes: Optional[str] = Field(None, description="Visit notes")


class VisitUpdate(BaseModel):
    """Schema for updating a visit"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[Decimal] = Field(None, ge=0)
    status: Optional[VisitStatus] = None
    notes: Optional[str] = None
    outcome: Optional[str] = Field(None, max_length=200)
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[datetime] = None


class VisitCheckIn(BaseModel):
    """Schema for checking in to a visit (GPS)"""
    latitude: Decimal = Field(..., ge=-90, le=90, description="GPS latitude")
    longitude: Decimal = Field(..., ge=-180, le=180, description="GPS longitude")
    address: Optional[str] = Field(None, max_length=500, description="Address (reverse geocoded)")


class VisitCheckOut(BaseModel):
    """Schema for checking out from a visit (GPS)"""
    latitude: Decimal = Field(..., ge=-90, le=90, description="GPS latitude")
    longitude: Decimal = Field(..., ge=-180, le=180, description="GPS longitude")
    address: Optional[str] = Field(None, max_length=500, description="Address (reverse geocoded)")
    notes: Optional[str] = Field(None, description="Visit notes/summary")
    outcome: Optional[str] = Field(None, max_length=200, description="Visit outcome")


class VisitResponse(VisitBase):
    """Schema for visit response"""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    user_name: Optional[str]
    client_name: Optional[str]
    status: VisitStatus

    # Check-in
    check_in_time: Optional[datetime]
    check_in_latitude: Optional[Decimal]
    check_in_longitude: Optional[Decimal]
    check_in_address: Optional[str]

    # Check-out
    check_out_time: Optional[datetime]
    check_out_latitude: Optional[Decimal]
    check_out_longitude: Optional[Decimal]
    check_out_address: Optional[str]

    # Outcome
    notes: Optional[str]

    # Metadata
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VisitListResponse(BaseModel):
    """Schema for paginated visit list"""
    items: list[VisitResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Call Schemas
# ============================================================================

class CallBase(BaseModel):
    """Base call schema with common fields"""
    client_id: UUID = Field(..., description="Client UUID")
    title: str = Field(..., min_length=1, max_length=200, description="Call title/subject")
    description: Optional[str] = Field(None, description="Call description")
    call_type: CallType = Field(..., description="Call type (incoming/outgoing/missed)")
    phone_number: Optional[str] = Field(None, max_length=50, description="Phone number")
    scheduled_date: Optional[datetime] = Field(None, description="Scheduled call date/time")
    outcome: Optional[str] = Field(None, max_length=200, description="Call outcome")
    follow_up_required: bool = Field(default=False, description="Whether follow-up is required")
    follow_up_date: Optional[datetime] = Field(None, description="Follow-up date if required")


class CallCreate(CallBase):
    """Schema for creating a new call"""
    notes: Optional[str] = Field(None, description="Call notes")


class CallUpdate(BaseModel):
    """Schema for updating a call"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    call_type: Optional[CallType] = None
    phone_number: Optional[str] = Field(None, max_length=50)
    scheduled_date: Optional[datetime] = None
    status: Optional[CallStatus] = None
    notes: Optional[str] = None
    outcome: Optional[str] = Field(None, max_length=200)
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[datetime] = None


class CallStart(BaseModel):
    """Schema for starting a call"""
    phone_number: Optional[str] = Field(None, max_length=50, description="Phone number dialed/received")


class CallEnd(BaseModel):
    """Schema for ending a call"""
    notes: Optional[str] = Field(None, description="Call notes/summary")
    outcome: Optional[str] = Field(None, max_length=200, description="Call outcome")
    status: CallStatus = Field(default=CallStatus.COMPLETED, description="Call final status")


class CallResponse(CallBase):
    """Schema for call response"""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    user_name: Optional[str]
    client_name: Optional[str]
    status: CallStatus

    # Call timing
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    duration_seconds: Optional[Decimal]

    # Notes
    notes: Optional[str]

    # Recording
    recording_url: Optional[str]

    # Metadata
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CallListResponse(BaseModel):
    """Schema for paginated call list"""
    items: list[CallResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Activity Summary Schemas
# ============================================================================

class ActivitySummary(BaseModel):
    """Combined activity summary for visits and calls"""
    total_visits: int
    total_calls: int
    completed_visits: int
    completed_calls: int
    scheduled_visits: int
    scheduled_calls: int
    follow_ups_required: int


class DailyActivity(BaseModel):
    """Daily activity breakdown"""
    date: str  # YYYY-MM-DD
    visits: int
    calls: int
    total_duration_minutes: Optional[Decimal]
