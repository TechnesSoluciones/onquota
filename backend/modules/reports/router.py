"""
Reports API Router
Endpoints for reports and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User

from modules.reports.repository import ReportsRepository
from modules.reports.schemas import (
    ReportFiltersBase,
    ExecutiveDashboard,
    QuotationConversionReport,
    SalesFunnelReport,
)


router = APIRouter(prefix="/reports", tags=["Reports"])


# ============================================================================
# Dashboard Executive
# ============================================================================

@router.get("/dashboard/executive", response_model=ExecutiveDashboard)
async def get_executive_dashboard(
    start_date: Optional[date] = Query(None, description="Start date for report"),
    end_date: Optional[date] = Query(None, description="End date for report"),
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    sales_rep_id: Optional[UUID] = Query(None, description="Filter by sales rep"),
    currency: str = Query("USD", description="Currency for amounts"),
    comparison_period: Optional[str] = Query(
        None,
        description="Comparison period (previous_period or previous_year)"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get executive dashboard with KPIs, trends, and top performers.

    Returns comprehensive overview of business performance including:
    - Main KPIs (revenue, win rate, pipeline, etc.)
    - Trend charts for revenue, quotations, and visits
    - Top performing sales reps, clients, and product lines
    - Automated alerts for key metrics

    Default period: Current month if dates not provided
    """

    # Build filters
    filters = ReportFiltersBase(
        start_date=start_date,
        end_date=end_date,
        client_id=client_id,
        sales_rep_id=sales_rep_id,
        currency=currency,
        comparison_period=comparison_period
    )

    # Get dashboard data
    repo = ReportsRepository(db)

    try:
        dashboard = await repo.get_executive_dashboard(
            tenant_id=current_user.tenant_id,
            filters=filters
        )
        return dashboard

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating dashboard: {str(e)}"
        )


# ============================================================================
# Quotations Reports
# ============================================================================

@router.get("/quotations/conversion", response_model=QuotationConversionReport)
async def get_quotation_conversion_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    client_id: Optional[UUID] = Query(None),
    sales_rep_id: Optional[UUID] = Query(None),
    currency: str = Query("USD"),
    comparison_period: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get quotation conversion analysis report.

    Analyzes quotation performance including:
    - Total quotations and amounts
    - Win/loss analysis
    - Conversion to sales controls
    - Time to close metrics
    - Monthly breakdown
    """

    # TODO: Implement in Phase 2
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Quotation conversion report will be implemented in Phase 2"
    )


# ============================================================================
# Sales Funnel
# ============================================================================

@router.get("/funnel/complete-analysis", response_model=SalesFunnelReport)
async def get_sales_funnel_analysis(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    client_id: Optional[UUID] = Query(None),
    sales_rep_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete sales funnel analysis.

    Analyzes the full sales funnel from visits to payment:
    - Visits → Quotations
    - Quotations → Won
    - Won → Sales Controls
    - Sales Controls → Paid
    - Conversion rates at each stage
    - Velocity metrics
    """

    # TODO: Implement in Phase 2
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Sales funnel analysis will be implemented in Phase 2"
    )


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def reports_health_check():
    """Health check for reports module"""
    return {
        "status": "healthy",
        "module": "reports",
        "version": "1.0.0",
        "phase": "1 - Fundamentos"
    }
