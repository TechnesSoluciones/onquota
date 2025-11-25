"""
Dashboard Router
API endpoints for dashboard metrics and analytics
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from modules.dashboard.repository import DashboardRepository
from modules.dashboard.schemas import (
    DashboardSummary,
    DashboardKPIs,
    RevenueData,
    ExpensesData,
    TopClientsData,
    RecentActivityData,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get complete dashboard summary
    Returns year-to-date metrics, counts, and month-over-month comparisons
    """
    repo = DashboardRepository(db)
    return await repo.get_summary(current_user.tenant_id)


@router.get("/kpis", response_model=DashboardKPIs)
async def get_dashboard_kpis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get main dashboard KPIs
    Returns key performance indicators with period-over-period comparisons
    Includes: revenue, quota, conversion, clients, expenses, quotes
    """
    repo = DashboardRepository(db)
    return await repo.get_kpis(current_user.tenant_id)


@router.get("/revenue-monthly", response_model=RevenueData)
async def get_revenue_monthly(
    year: int = Query(
        default=datetime.now().year,
        description="Year for revenue data",
        ge=2020,
        le=2100,
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get monthly revenue time series
    Returns revenue data for each month of the specified year
    Includes comparison with previous year
    """
    repo = DashboardRepository(db)
    return await repo.get_revenue_monthly(current_user.tenant_id, year)


@router.get("/expenses-monthly", response_model=ExpensesData)
async def get_expenses_monthly(
    year: int = Query(
        default=datetime.now().year,
        description="Year for expenses data",
        ge=2020,
        le=2100,
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get monthly expenses time series
    Returns expenses data for each month of the specified year
    Includes comparison with previous year and breakdown by category
    """
    repo = DashboardRepository(db)
    return await repo.get_expenses_monthly(current_user.tenant_id, year)


@router.get("/top-clients", response_model=TopClientsData)
async def get_top_clients(
    limit: int = Query(10, description="Number of top clients to return", ge=1, le=50),
    period: str = Query(
        "current_year",
        description="Time period for ranking",
        regex="^(current_month|current_year|all_time)$",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get top clients by revenue
    Returns ranked list of clients based on accepted quote totals
    Can be filtered by period: current_month, current_year, or all_time
    """
    repo = DashboardRepository(db)
    return await repo.get_top_clients(current_user.tenant_id, limit, period)


@router.get("/recent-activity", response_model=RecentActivityData)
async def get_recent_activity(
    limit: int = Query(
        20, description="Number of activity events to return", ge=1, le=100
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get recent system activity
    Returns timeline of recent events including quotes, clients, and approvals
    Sorted by timestamp descending (most recent first)
    """
    repo = DashboardRepository(db)
    return await repo.get_recent_activity(current_user.tenant_id, limit)
