"""
Pydantic schemas for Account Planner API
"""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from modules.accounts.models import PlanStatus, MilestoneStatus, SWOTCategory


# ============================================================================
# Account Plan Schemas
# ============================================================================


class AccountPlanCreate(BaseModel):
    """Schema for creating a new account plan"""
    title: str = Field(..., min_length=3, max_length=200, description="Plan title")
    description: Optional[str] = Field(None, description="Detailed description")
    client_id: UUID = Field(..., description="Client UUID")
    start_date: date = Field(..., description="Plan start date")
    end_date: Optional[date] = Field(None, description="Plan end date")
    revenue_goal: Optional[Decimal] = Field(None, gt=0, description="Revenue goal")
    status: PlanStatus = Field(default=PlanStatus.DRAFT, description="Plan status")

    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        """Ensure end_date is after start_date"""
        if v and info.data.get('start_date'):
            if v <= info.data['start_date']:
                raise ValueError('end_date must be after start_date')
        return v

    @field_validator('revenue_goal')
    @classmethod
    def validate_decimal_places(cls, v):
        """Ensure max 2 decimal places"""
        if v and v.as_tuple().exponent < -2:
            raise ValueError('Maximum 2 decimal places allowed for revenue_goal')
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Q4 2025 Growth Strategy",
                "description": "Strategic plan to expand enterprise services",
                "client_id": "550e8400-e29b-41d4-a716-446655440000",
                "start_date": "2025-10-01",
                "end_date": "2025-12-31",
                "revenue_goal": "250000.00",
                "status": "active"
            }
        }
    }


class AccountPlanUpdate(BaseModel):
    """Schema for updating an existing account plan"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    revenue_goal: Optional[Decimal] = Field(None, gt=0)
    status: Optional[PlanStatus] = None

    @field_validator('revenue_goal')
    @classmethod
    def validate_decimal_places(cls, v):
        """Ensure max 2 decimal places"""
        if v and v.as_tuple().exponent < -2:
            raise ValueError('Maximum 2 decimal places allowed for revenue_goal')
        return v


class AccountPlanResponse(BaseModel):
    """Schema for account plan response"""
    id: UUID
    tenant_id: UUID
    title: str
    description: Optional[str]
    client_id: UUID
    client_name: str
    created_by: UUID
    creator_name: str
    status: PlanStatus
    start_date: date
    end_date: Optional[date]
    revenue_goal: Optional[Decimal]
    milestones_count: int
    completed_milestones_count: int
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


# ============================================================================
# Milestone Schemas
# ============================================================================


class MilestoneCreate(BaseModel):
    """Schema for creating a new milestone"""
    title: str = Field(..., min_length=3, max_length=200, description="Milestone title")
    description: Optional[str] = Field(None, description="Detailed description")
    due_date: date = Field(..., description="Due date")
    status: MilestoneStatus = Field(default=MilestoneStatus.PENDING, description="Milestone status")

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Complete needs assessment",
                "description": "Conduct comprehensive needs analysis with stakeholders",
                "due_date": "2025-11-30",
                "status": "pending"
            }
        }
    }


class MilestoneUpdate(BaseModel):
    """Schema for updating an existing milestone"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[MilestoneStatus] = None
    completion_date: Optional[date] = None


class MilestoneResponse(BaseModel):
    """Schema for milestone response"""
    id: UUID
    tenant_id: UUID
    plan_id: UUID
    title: str
    description: Optional[str]
    due_date: date
    completion_date: Optional[date]
    status: MilestoneStatus
    is_completed: bool
    is_overdue: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


# ============================================================================
# SWOT Item Schemas
# ============================================================================


class SWOTItemCreate(BaseModel):
    """Schema for creating a new SWOT item"""
    category: SWOTCategory = Field(..., description="SWOT category")
    description: str = Field(..., min_length=3, description="Item description")

    model_config = {
        "json_schema_extra": {
            "example": {
                "category": "strength",
                "description": "Strong existing relationship with C-level executives"
            }
        }
    }


class SWOTItemResponse(BaseModel):
    """Schema for SWOT item response"""
    id: UUID
    tenant_id: UUID
    plan_id: UUID
    category: SWOTCategory
    description: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


# ============================================================================
# Detailed Plan Schemas
# ============================================================================


class AccountPlanDetail(BaseModel):
    """Schema for detailed account plan with related entities"""
    id: UUID
    tenant_id: UUID
    title: str
    description: Optional[str]
    client_id: UUID
    client_name: str
    created_by: UUID
    creator_name: str
    status: PlanStatus
    start_date: date
    end_date: Optional[date]
    revenue_goal: Optional[Decimal]
    milestones: List[MilestoneResponse]
    swot_items: List[SWOTItemResponse]
    milestones_count: int
    completed_milestones_count: int
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


# ============================================================================
# Statistics Schemas
# ============================================================================


class SWOTStats(BaseModel):
    """SWOT analysis statistics"""
    strengths_count: int
    weaknesses_count: int
    opportunities_count: int
    threats_count: int
    total_items: int


class MilestoneStats(BaseModel):
    """Milestone statistics"""
    total: int
    pending: int
    in_progress: int
    completed: int
    cancelled: int
    overdue: int
    completion_rate: float


class AccountPlanStats(BaseModel):
    """Comprehensive account plan statistics"""
    plan_id: UUID
    title: str
    status: PlanStatus
    progress_percentage: float
    milestones: MilestoneStats
    swot: SWOTStats
    days_remaining: Optional[int]
    revenue_goal: Optional[Decimal]

    model_config = {
        "json_schema_extra": {
            "example": {
                "plan_id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Q4 2025 Growth Strategy",
                "status": "active",
                "progress_percentage": 45.5,
                "milestones": {
                    "total": 10,
                    "pending": 3,
                    "in_progress": 2,
                    "completed": 4,
                    "cancelled": 1,
                    "overdue": 1,
                    "completion_rate": 40.0
                },
                "swot": {
                    "strengths_count": 5,
                    "weaknesses_count": 3,
                    "opportunities_count": 7,
                    "threats_count": 2,
                    "total_items": 17
                },
                "days_remaining": 45,
                "revenue_goal": "250000.00"
            }
        }
    }


# ============================================================================
# List Response Schemas
# ============================================================================


class AccountPlanListResponse(BaseModel):
    """Schema for paginated account plan list"""
    items: List[AccountPlanResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
