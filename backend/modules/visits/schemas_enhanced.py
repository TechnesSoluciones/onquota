"""
Enhanced Visit and Commitment Schemas
Pydantic schemas for request/response validation with full traceability
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal

from models.visit import (
    VisitStatus,
    VisitType,
    CallType,
    CallStatus,
    CommitmentType,
    CommitmentPriority,
    CommitmentStatus,
)


# ============================================================================
# Visit Topic Schemas
# ============================================================================

class VisitTopicBase(BaseModel):
    """Base visit topic schema"""
    name: str = Field(..., min_length=1, max_length=200, description="Topic name")
    description: Optional[str] = Field(None, description="Topic description")
    icon: Optional[str] = Field(None, max_length=50, description="Icon (emoji or name)")
    color: Optional[str] = Field(None, max_length=20, description="Hex color code")


class VisitTopicCreate(VisitTopicBase):
    """Schema for creating a new visit topic"""
    pass


class VisitTopicUpdate(BaseModel):
    """Schema for updating a visit topic"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class VisitTopicResponse(VisitTopicBase):
    """Schema for visit topic response"""
    id: UUID
    tenant_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VisitTopicListResponse(BaseModel):
    """Schema for paginated visit topic list"""
    items: List[VisitTopicResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Visit Topic Detail Schemas (M2M with details)
# ============================================================================

class VisitTopicDetailBase(BaseModel):
    """Base visit topic detail schema"""
    topic_id: UUID = Field(..., description="Topic UUID from catalog")
    details: Optional[str] = Field(None, description="Free-text details about what was discussed")


class VisitTopicDetailCreate(VisitTopicDetailBase):
    """Schema for adding a topic to a visit"""
    pass


class VisitTopicDetailResponse(BaseModel):
    """Schema for visit topic detail response"""
    id: UUID
    visit_id: UUID
    topic_id: UUID
    topic_name: Optional[str] = None  # Denormalized from topic
    topic_icon: Optional[str] = None
    topic_color: Optional[str] = None
    details: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Visit Opportunity Schemas
# ============================================================================

class VisitOpportunityCreate(BaseModel):
    """Schema for linking an opportunity to a visit"""
    opportunity_id: UUID = Field(..., description="Opportunity UUID")
    notes: Optional[str] = Field(None, description="How this lead originated from the visit")


class VisitOpportunityResponse(BaseModel):
    """Schema for visit-opportunity relationship"""
    id: UUID
    visit_id: UUID
    opportunity_id: UUID
    opportunity_name: Optional[str] = None  # Denormalized
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Enhanced Visit Schemas
# ============================================================================

class VisitBase(BaseModel):
    """Base visit schema with enhanced fields"""
    client_id: UUID = Field(..., description="Client UUID")
    title: str = Field(..., min_length=1, max_length=200, description="Visit title")
    description: Optional[str] = Field(None, description="Visit description")

    # NEW: Visit Type
    visit_type: VisitType = Field(..., description="Visit type: presencial or virtual")

    # NEW: Contact Person
    contact_person_name: Optional[str] = Field(None, max_length=200, description="Person who attended")
    contact_person_role: Optional[str] = Field(None, max_length=200, description="Role/position")

    # Visit Date (manual entry)
    visit_date: datetime = Field(..., description="Date and time of the visit/meeting")
    duration_minutes: Optional[Decimal] = Field(None, ge=0, description="Duration in minutes")

    # Outcome
    general_notes: Optional[str] = Field(None, description="General comments about the visit")
    outcome: Optional[str] = Field(None, max_length=200, description="Visit outcome")
    follow_up_required: bool = Field(default=False, description="Whether follow-up is required")
    follow_up_date: Optional[datetime] = Field(None, description="Follow-up date if required")


class VisitCreate(VisitBase):
    """Schema for creating a new visit"""
    # Optional: GPS coordinates for presencial visits
    check_in_latitude: Optional[Decimal] = Field(None, ge=-90, le=90, description="GPS latitude")
    check_in_longitude: Optional[Decimal] = Field(None, ge=-180, le=180, description="GPS longitude")
    check_in_address: Optional[str] = Field(None, max_length=500, description="Address")

    # Topics to add immediately
    topics: Optional[List[VisitTopicDetailCreate]] = Field(default=[], description="Topics discussed")


class VisitUpdate(BaseModel):
    """Schema for updating a visit"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    visit_type: Optional[VisitType] = None
    contact_person_name: Optional[str] = Field(None, max_length=200)
    contact_person_role: Optional[str] = Field(None, max_length=200)
    visit_date: Optional[datetime] = None
    duration_minutes: Optional[Decimal] = Field(None, ge=0)
    status: Optional[VisitStatus] = None
    general_notes: Optional[str] = None
    outcome: Optional[str] = Field(None, max_length=200)
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[datetime] = None


class VisitResponse(VisitBase):
    """Schema for visit response with all relationships"""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    user_name: Optional[str]
    client_name: Optional[str]
    status: VisitStatus

    # GPS (optional)
    check_in_time: Optional[datetime]
    check_in_latitude: Optional[Decimal]
    check_in_longitude: Optional[Decimal]
    check_in_address: Optional[str]

    check_out_time: Optional[datetime]
    check_out_latitude: Optional[Decimal]
    check_out_longitude: Optional[Decimal]
    check_out_address: Optional[str]

    # Backward compatibility
    notes: Optional[str]

    # Metadata
    created_at: datetime
    updated_at: datetime

    # Relationships (populated separately or with joins)
    topics: Optional[List[VisitTopicDetailResponse]] = []
    opportunities: Optional[List[VisitOpportunityResponse]] = []

    model_config = {"from_attributes": True}


class VisitListResponse(BaseModel):
    """Schema for paginated visit list"""
    items: List[VisitResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Commitment Schemas
# ============================================================================

class CommitmentBase(BaseModel):
    """Base commitment schema"""
    client_id: UUID = Field(..., description="Client UUID")
    assigned_to_user_id: UUID = Field(..., description="User responsible for this commitment")
    type: CommitmentType = Field(..., description="Commitment type")
    title: str = Field(..., min_length=1, max_length=300, description="Commitment title")
    description: Optional[str] = Field(None, description="Detailed description")
    due_date: datetime = Field(..., description="Due date")
    priority: CommitmentPriority = Field(default=CommitmentPriority.MEDIUM, description="Priority level")


class CommitmentCreate(CommitmentBase):
    """Schema for creating a new commitment"""
    visit_id: Optional[UUID] = Field(None, description="Optional: Link to visit that generated this")
    reminder_date: Optional[datetime] = Field(None, description="When to send reminder")


class CommitmentUpdate(BaseModel):
    """Schema for updating a commitment"""
    assigned_to_user_id: Optional[UUID] = None
    type: Optional[CommitmentType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[CommitmentPriority] = None
    status: Optional[CommitmentStatus] = None
    reminder_date: Optional[datetime] = None


class CommitmentComplete(BaseModel):
    """Schema for completing a commitment"""
    completion_notes: Optional[str] = Field(None, description="Notes about completion")


class CommitmentResponse(CommitmentBase):
    """Schema for commitment response"""
    id: UUID
    tenant_id: UUID
    visit_id: Optional[UUID]
    created_by_user_id: UUID
    status: CommitmentStatus

    # Completion
    completed_at: Optional[datetime]
    completion_notes: Optional[str]

    # Reminders
    reminder_sent: bool
    reminder_date: Optional[datetime]

    # Metadata
    created_at: datetime
    updated_at: datetime

    # Denormalized fields (to be populated)
    client_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CommitmentListResponse(BaseModel):
    """Schema for paginated commitment list"""
    items: List[CommitmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Analytics Schemas
# ============================================================================

class VisitAnalyticsSummary(BaseModel):
    """Summary analytics for visits"""
    total_visits: int
    presencial_visits: int
    virtual_visits: int
    completed_visits: int
    scheduled_visits: int
    total_opportunities_generated: int
    total_commitments_created: int
    avg_duration_minutes: Optional[float]


class VisitsByClientAnalytics(BaseModel):
    """Visit analytics by client"""
    client_id: UUID
    client_name: str
    total_visits: int
    last_visit_date: Optional[datetime]
    opportunities_generated: int
    commitments_pending: int
    most_discussed_topics: List[str]


class VisitTopicAnalytics(BaseModel):
    """Analytics by topic"""
    topic_id: UUID
    topic_name: str
    topic_icon: Optional[str]
    topic_color: Optional[str]
    times_discussed: int
    unique_clients: int


class ConversionFunnelAnalytics(BaseModel):
    """Conversion funnel: Visit → Lead → Quote → Order"""
    period: str  # e.g., "2025-01"
    total_visits: int
    leads_generated: int
    leads_to_quotes: int
    quotes_to_orders: int
    conversion_rate_visit_to_lead: float
    conversion_rate_lead_to_quote: float
    conversion_rate_quote_to_order: float
    total_value_closed: Decimal


class CommitmentAnalytics(BaseModel):
    """Commitment analytics"""
    total_commitments: int
    pending: int
    in_progress: int
    completed: int
    overdue: int
    completion_rate: float
    avg_days_to_complete: Optional[float]
