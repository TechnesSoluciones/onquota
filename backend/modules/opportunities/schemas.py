"""
Pydantic schemas for Opportunity API
"""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from models.opportunity import OpportunityStage


class OpportunityCreate(BaseModel):
    """Schema for creating a new opportunity"""
    name: str = Field(..., min_length=3, max_length=200, description="Opportunity name")
    description: Optional[str] = Field(None, description="Detailed description")
    client_id: UUID = Field(..., description="Client UUID")
    estimated_value: Decimal = Field(..., gt=0, description="Estimated deal value")
    currency: str = Field(default="USD", pattern="^(USD|EUR|COP|MXN|ARS|DOP)$", description="Currency code")
    probability: Decimal = Field(..., ge=0, le=100, description="Win probability (0-100)")
    expected_close_date: Optional[date] = Field(None, description="Expected close date")
    stage: OpportunityStage = Field(default=OpportunityStage.LEAD, description="Current stage")

    @field_validator('expected_close_date')
    @classmethod
    def validate_future_date(cls, v):
        """Ensure expected close date is not in the past"""
        if v and v < date.today():
            raise ValueError('Expected close date must be in the future or today')
        return v

    @field_validator('estimated_value')
    @classmethod
    def validate_decimal_places(cls, v):
        """Ensure max 2 decimal places"""
        if v.as_tuple().exponent < -2:
            raise ValueError('Maximum 2 decimal places allowed')
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Enterprise Software License",
                "description": "Annual license for 100 users",
                "client_id": "550e8400-e29b-41d4-a716-446655440000",
                "estimated_value": "50000.00",
                "currency": "USD",
                "probability": "70",
                "expected_close_date": "2025-12-31",
                "stage": "PROPOSAL"
            }
        }
    }


class OpportunityUpdate(BaseModel):
    """Schema for updating an existing opportunity"""
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    estimated_value: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, pattern="^(USD|EUR|COP|MXN|ARS|DOP)$")
    probability: Optional[Decimal] = Field(None, ge=0, le=100)
    expected_close_date: Optional[date] = None
    stage: Optional[OpportunityStage] = None
    loss_reason: Optional[str] = Field(None, max_length=500)

    @field_validator('expected_close_date')
    @classmethod
    def validate_future_date(cls, v):
        """Ensure expected close date is not in the past"""
        if v and v < date.today():
            raise ValueError('Expected close date must be in the future or today')
        return v


class OpportunityStageUpdate(BaseModel):
    """Schema for updating opportunity stage"""
    stage: OpportunityStage = Field(..., description="New stage")
    loss_reason: Optional[str] = Field(None, max_length=500, description="Reason if closing as lost")

    @field_validator('loss_reason')
    @classmethod
    def validate_loss_reason(cls, v, info):
        """Require loss_reason when stage is CLOSED_LOST"""
        if info.data.get('stage') == OpportunityStage.CLOSED_LOST and not v:
            raise ValueError('loss_reason is required when closing opportunity as lost')
        return v


class OpportunityResponse(BaseModel):
    """Schema for opportunity response"""
    id: UUID
    tenant_id: UUID
    name: str
    description: Optional[str]
    client_id: UUID
    client_name: str
    assigned_to: UUID
    sales_rep_name: str
    estimated_value: Decimal
    currency: str
    probability: Decimal
    expected_close_date: Optional[date]
    actual_close_date: Optional[date]
    stage: OpportunityStage
    loss_reason: Optional[str]
    weighted_value: float
    is_closed: bool
    is_won: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class OpportunityListResponse(BaseModel):
    """Schema for paginated opportunity list"""
    items: list[OpportunityResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PipelineStageStats(BaseModel):
    """Statistics for a single pipeline stage"""
    count: int
    total_value: Decimal
    weighted_value: Decimal
    average_probability: Decimal


class PipelineSummary(BaseModel):
    """Summary statistics for the sales pipeline"""
    total_opportunities: int
    total_value: Decimal
    weighted_value: Decimal
    by_stage: dict[str, PipelineStageStats]
    win_rate: Decimal
    average_deal_size: Decimal
    total_won: int
    total_lost: int
    active_opportunities: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_opportunities": 45,
                "total_value": "2500000.00",
                "weighted_value": "1750000.00",
                "by_stage": {
                    "LEAD": {
                        "count": 10,
                        "total_value": "500000.00",
                        "weighted_value": "150000.00",
                        "average_probability": "30.00"
                    }
                },
                "win_rate": "65.50",
                "average_deal_size": "55555.56",
                "total_won": 15,
                "total_lost": 8,
                "active_opportunities": 22
            }
        }
    }


class PipelineBoardCard(BaseModel):
    """Simplified opportunity card for Kanban board"""
    id: UUID
    name: str
    client_name: str
    estimated_value: Decimal
    currency: str
    probability: Decimal
    weighted_value: float
    expected_close_date: Optional[date]
    sales_rep_name: str
    stage: OpportunityStage


class PipelineBoardColumn(BaseModel):
    """Column data for Kanban board"""
    stage: OpportunityStage
    count: int
    total_value: Decimal
    weighted_value: Decimal
    opportunities: list[PipelineBoardCard]


class PipelineBoardResponse(BaseModel):
    """Complete Kanban board data"""
    columns: list[PipelineBoardColumn]
    summary: PipelineSummary


# ============================================================================
# Analytics Response Schemas
# ============================================================================


class WinRateResponse(BaseModel):
    """Win rate analytics response"""
    total_closed: int = Field(..., description="Total closed opportunities")
    won: int = Field(..., description="Number of won opportunities")
    lost: int = Field(..., description="Number of lost opportunities")
    win_rate: Decimal = Field(..., description="Win rate percentage")
    total_won_value: Decimal = Field(..., description="Total value of won opportunities")
    total_lost_value: Decimal = Field(..., description="Total value of lost opportunities")
    average_won_value: Decimal = Field(..., description="Average value per won deal")

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_closed": 50,
                "won": 35,
                "lost": 15,
                "win_rate": "70.00",
                "total_won_value": "1750000.00",
                "total_lost_value": "450000.00",
                "average_won_value": "50000.00"
            }
        }
    }


class ConversionRateStage(BaseModel):
    """Conversion rate for a single stage"""
    stage: str = Field(..., description="Current stage name")
    count: int = Field(..., description="Number of opportunities at this stage")
    converted_to_next: int = Field(..., description="Number that advanced to next stage")
    conversion_rate: Decimal = Field(..., description="Conversion percentage")
    next_stage: str = Field(..., description="Next stage in pipeline")


class ConversionRatesResponse(BaseModel):
    """Conversion rates between pipeline stages"""
    conversion_rates: dict[str, ConversionRateStage] = Field(
        ...,
        description="Conversion rates by stage"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "conversion_rates": {
                    "LEAD": {
                        "stage": "LEAD",
                        "count": 100,
                        "converted_to_next": 70,
                        "conversion_rate": "70.00",
                        "next_stage": "QUALIFIED"
                    },
                    "QUALIFIED": {
                        "stage": "QUALIFIED",
                        "count": 70,
                        "converted_to_next": 50,
                        "conversion_rate": "71.43",
                        "next_stage": "PROPOSAL"
                    }
                }
            }
        }
    }


class MonthlyForecast(BaseModel):
    """Forecast for a single month"""
    best_case: Decimal = Field(..., description="Best case revenue")
    weighted: Decimal = Field(..., description="Weighted revenue forecast")
    count: int = Field(..., description="Number of opportunities")


class RevenueForecastResponse(BaseModel):
    """Revenue forecast response"""
    forecast_period_days: int = Field(..., description="Number of days in forecast period")
    end_date: str = Field(..., description="End date of forecast period (ISO format)")
    opportunity_count: int = Field(..., description="Total opportunities in forecast")
    best_case: Decimal = Field(..., description="Best case total revenue")
    weighted: Decimal = Field(..., description="Weighted total revenue")
    conservative: Decimal = Field(..., description="Conservative forecast (high probability only)")
    monthly_breakdown: dict[str, MonthlyForecast] = Field(
        ...,
        description="Monthly breakdown of forecast"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "forecast_period_days": 90,
                "end_date": "2025-02-26",
                "opportunity_count": 25,
                "best_case": "2500000.00",
                "weighted": "1750000.00",
                "conservative": "1200000.00",
                "monthly_breakdown": {
                    "2025-12": {
                        "best_case": "800000.00",
                        "weighted": "560000.00",
                        "count": 10
                    },
                    "2025-01": {
                        "best_case": "1000000.00",
                        "weighted": "700000.00",
                        "count": 10
                    }
                }
            }
        }
    }


class PipelineHealthResponse(BaseModel):
    """Overall pipeline health metrics"""
    total_active_opportunities: int = Field(..., description="Total active opportunities")
    total_pipeline_value: float = Field(..., description="Total unweighted pipeline value")
    weighted_pipeline_value: float = Field(..., description="Weighted pipeline value")
    stage_distribution: dict = Field(..., description="Opportunities and value by stage")
    aging_analysis: dict[str, int] = Field(..., description="Age distribution of opportunities")
    overdue_count: int = Field(..., description="Number of overdue opportunities")
    overdue_value: float = Field(..., description="Total value of overdue opportunities")

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_active_opportunities": 45,
                "total_pipeline_value": 2500000.00,
                "weighted_pipeline_value": 1750000.00,
                "stage_distribution": {
                    "LEAD": {
                        "count": 10,
                        "value": "500000.00"
                    },
                    "QUALIFIED": {
                        "count": 15,
                        "value": "800000.00"
                    }
                },
                "aging_analysis": {
                    "0-30": 20,
                    "31-60": 15,
                    "61-90": 7,
                    "90+": 3
                },
                "overdue_count": 5,
                "overdue_value": 250000.00
            }
        }
    }
