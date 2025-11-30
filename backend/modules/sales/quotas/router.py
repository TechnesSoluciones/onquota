"""
Quotas Router
API endpoints for quota management and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from datetime import date
from decimal import Decimal

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from modules.sales.quotas.repository import QuotaRepository
from modules.sales.quotas.schemas import (
    QuotaCreate,
    QuotaUpdate,
    QuotaLineCreate,
    QuotaLineUpdate,
    QuotaResponse,
    QuotaDetailResponse,
    QuotaListItem,
    QuotaListResponse,
    QuotaLineResponse,
    QuotaDashboardStats,
    QuotaMonthlyTrend,
    QuotaStats,
    QuotaComparisonStats,
)

router = APIRouter(prefix="/sales/quotas", tags=["Sales - Quotas"])


# ============================================
# CRUD Endpoints
# ============================================

@router.post("", response_model=QuotaDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_quota(
    data: QuotaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new quota with lines

    Creates a monthly quota for a sales representative with product line breakdown.

    Business Rules:
    - At least one quota line is required
    - Totals are calculated automatically from lines
    - Achievement starts at 0 and is updated when sales controls are paid
    - One quota per user per period (year-month)

    Access Control:
    - Admins and supervisors can create quotas for any user
    - Sales reps can only create quotas for themselves
    """
    repo = QuotaRepository(db)

    # Check if quota already exists for this user and period
    existing_quotas, _ = await repo.get_quotas(
        current_user.tenant_id,
        user_id=data.user_id,
        year=data.year,
        month=data.month,
        page=1,
        page_size=1,
    )

    if existing_quotas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quota already exists for user {data.user_id} in {data.year}-{data.month:02d}",
        )

    quota = await repo.create_quota(data, current_user.tenant_id, current_user.id)
    await db.commit()
    await db.refresh(quota, ["lines"])

    # Build response with calculated fields
    response = QuotaDetailResponse.model_validate(quota)
    response.is_achieved = quota.is_achieved
    response.remaining_quota = quota.remaining_quota
    response.gap_percentage = quota.gap_percentage

    # Add calculated fields to lines
    for i, line in enumerate(quota.lines):
        response.lines[i].is_achieved = line.is_achieved
        response.lines[i].remaining_quota = line.remaining_quota
        response.lines[i].gap_percentage = line.gap_percentage

    return response


@router.get("", response_model=QuotaListResponse)
async def list_quotas(
    user_id: Optional[UUID] = Query(None, description="Filter by user"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Filter by year"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month"),
    year_from: Optional[int] = Query(None, ge=2000, le=2100, description="Filter year from"),
    year_to: Optional[int] = Query(None, ge=2000, le=2100, description="Filter year to"),
    min_achievement_percentage: Optional[Decimal] = Query(None, ge=0, le=100, description="Min achievement %"),
    max_achievement_percentage: Optional[Decimal] = Query(None, ge=0, le=100, description="Max achievement %"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List quotas with filters and pagination

    Returns paginated list of quotas with optional filters.

    Filters:
    - user_id: Filter by sales representative
    - year: Filter by specific year
    - month: Filter by specific month
    - year_from, year_to: Year range filter
    - min_achievement_percentage, max_achievement_percentage: Achievement % range

    Access Control:
    - Sales reps can only see their own quotas
    - Supervisors and admins can see all quotas in their tenant
    """
    repo = QuotaRepository(db)

    quotas, total = await repo.get_quotas(
        current_user.tenant_id,
        user_id=user_id,
        year=year,
        month=month,
        year_from=year_from,
        year_to=year_to,
        min_achievement_percentage=min_achievement_percentage,
        max_achievement_percentage=max_achievement_percentage,
        page=page,
        page_size=page_size,
    )

    total_pages = QuotaListResponse.calculate_total_pages(total, page_size)

    # Build list items with calculated fields
    items = []
    for quota in quotas:
        item = QuotaListItem.model_validate(quota)
        item.period_str = quota.period_str
        item.is_achieved = quota.is_achieved
        item.remaining_quota = quota.remaining_quota
        item.gap_percentage = quota.gap_percentage
        items.append(item)

    return QuotaListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{quota_id}", response_model=QuotaDetailResponse)
async def get_quota(
    quota_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get quota detail with lines

    Returns detailed quota information including all product line breakdowns.

    Access Control:
    - Sales reps can only view their own quotas
    - Supervisors and admins can view all quotas in their tenant
    """
    repo = QuotaRepository(db)
    quota = await repo.get_quota(quota_id, current_user.tenant_id, load_lines=True)

    if not quota:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quota not found"
        )

    # Build response with calculated fields
    response = QuotaDetailResponse.model_validate(quota)
    response.is_achieved = quota.is_achieved
    response.remaining_quota = quota.remaining_quota
    response.gap_percentage = quota.gap_percentage

    # Add calculated fields to lines
    for i, line in enumerate(quota.lines):
        response.lines[i].is_achieved = line.is_achieved
        response.lines[i].remaining_quota = line.remaining_quota
        response.lines[i].gap_percentage = line.gap_percentage

    return response


@router.put("/{quota_id}", response_model=QuotaResponse)
async def update_quota(
    quota_id: UUID,
    data: QuotaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update quota metadata

    Updates quota notes and other metadata fields.
    Lines are updated separately via dedicated endpoints.

    Access Control:
    - Admins and supervisors can update any quota
    - Sales reps cannot update quotas (read-only)
    """
    repo = QuotaRepository(db)
    quota = await repo.update_quota(quota_id, current_user.tenant_id, data)

    if not quota:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quota not found"
        )

    await db.commit()
    await db.refresh(quota)
    return quota


@router.delete("/{quota_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quota(
    quota_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft delete quota

    Business Rules:
    - Soft delete (is_deleted flag)
    - Cascade deletes all quota lines

    Access Control:
    - Admin only
    """
    repo = QuotaRepository(db)
    deleted = await repo.delete_quota(quota_id, current_user.tenant_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quota not found"
        )

    await db.commit()


# ============================================
# Line Management Endpoints
# ============================================

@router.post("/{quota_id}/lines", response_model=QuotaLineResponse, status_code=status.HTTP_201_CREATED)
async def add_quota_line(
    quota_id: UUID,
    data: QuotaLineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add line to quota

    Adds a product line to an existing quota.
    Quota totals are automatically recalculated.

    Access Control:
    - Admins and supervisors can add lines to any quota
    """
    repo = QuotaRepository(db)
    line = await repo.add_line(quota_id, current_user.tenant_id, data)

    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quota not found"
        )

    await db.commit()
    await db.refresh(line)

    # Build response with calculated fields
    response = QuotaLineResponse.model_validate(line)
    response.is_achieved = line.is_achieved
    response.remaining_quota = line.remaining_quota
    response.gap_percentage = line.gap_percentage

    return response


@router.put("/{quota_id}/lines/{line_id}", response_model=QuotaLineResponse)
async def update_quota_line(
    quota_id: UUID,
    line_id: UUID,
    data: QuotaLineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update quota line

    Updates a quota line's amount.
    Achievement percentage and quota totals are automatically recalculated.

    Access Control:
    - Admins and supervisors can update lines in any quota
    """
    repo = QuotaRepository(db)
    line = await repo.update_line(quota_id, line_id, current_user.tenant_id, data)

    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quota line not found"
        )

    await db.commit()
    await db.refresh(line)

    # Build response with calculated fields
    response = QuotaLineResponse.model_validate(line)
    response.is_achieved = line.is_achieved
    response.remaining_quota = line.remaining_quota
    response.gap_percentage = line.gap_percentage

    return response


@router.delete("/{quota_id}/lines/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quota_line(
    quota_id: UUID,
    line_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove line from quota

    Removes a product line from a quota.
    Quota totals are automatically recalculated.

    Access Control:
    - Admins and supervisors can remove lines from any quota
    """
    repo = QuotaRepository(db)
    deleted = await repo.remove_line(quota_id, line_id, current_user.tenant_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quota line not found"
        )

    await db.commit()


# ============================================
# Analytics Endpoints
# ============================================

@router.get("/stats/dashboard", response_model=QuotaDashboardStats)
async def get_quota_dashboard(
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Year (defaults to current)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (defaults to current)"),
    user_id: Optional[UUID] = Query(None, description="User ID (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get quota dashboard statistics

    Returns comprehensive dashboard data including:
    - Current period quota and achievement
    - Product line breakdown
    - Year-to-date (YTD) accumulation
    - Remaining quota and gap percentage

    Filters:
    - year: Defaults to current year
    - month: Defaults to current month
    - user_id: Defaults to current user (admins can query other users)

    Access Control:
    - Sales reps can only view their own dashboard
    - Supervisors and admins can view any user's dashboard
    """
    from datetime import datetime

    # Default to current period
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month

    # Default to current user
    if user_id is None:
        user_id = current_user.id

    repo = QuotaRepository(db)
    stats = await repo.get_dashboard_stats(user_id, year, month, current_user.tenant_id)

    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quota found for period {year}-{month:02d}"
        )

    return stats


@router.get("/stats/trends", response_model=List[QuotaMonthlyTrend])
async def get_quota_trends(
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    user_id: Optional[UUID] = Query(None, description="User ID (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get monthly quota trends

    Returns monthly trends for the entire year (12 months).
    Useful for charts and visualizations.

    Filters:
    - year: Required - year to analyze
    - user_id: Optional - defaults to current user (admins can query other users)

    Returns:
    - Array of 12 monthly trend objects (one per month)
    - Months without quotas show zero values

    Access Control:
    - Sales reps can only view their own trends
    - Supervisors and admins can view any user's trends
    """
    # Default to current user
    if user_id is None:
        user_id = current_user.id

    repo = QuotaRepository(db)
    trends = await repo.get_monthly_trends(user_id, year, current_user.tenant_id)

    return trends


@router.get("/stats/annual", response_model=QuotaStats)
async def get_annual_quota_stats(
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    user_id: Optional[UUID] = Query(None, description="User ID (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get annual quota statistics

    Returns year-to-date statistics including:
    - Current month quota and achievement
    - Annual quota and achievement totals
    - Months achieved count
    - Achievement rate (% of months quota was met)

    Filters:
    - year: Required - year to analyze
    - user_id: Optional - defaults to current user (admins can query other users)

    Access Control:
    - Sales reps can only view their own stats
    - Supervisors and admins can view any user's stats
    """
    # Default to current user
    if user_id is None:
        user_id = current_user.id

    repo = QuotaRepository(db)
    stats = await repo.get_annual_stats(user_id, year, current_user.tenant_id)

    return stats


@router.get("/stats/comparison", response_model=QuotaComparisonStats)
async def get_quota_comparison(
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month"),
    user_id: Optional[UUID] = Query(None, description="User ID (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get month-to-month quota comparison

    Compares current month with previous month including:
    - Current and previous month dashboard stats
    - Quota change (difference in quota amounts)
    - Achievement change (difference in achieved amounts)
    - Percentage change (difference in achievement %)

    Filters:
    - year: Required
    - month: Required
    - user_id: Optional - defaults to current user (admins can query other users)

    Access Control:
    - Sales reps can only view their own comparison
    - Supervisors and admins can view any user's comparison
    """
    # Default to current user
    if user_id is None:
        user_id = current_user.id

    repo = QuotaRepository(db)
    comparison = await repo.get_comparison_stats(user_id, year, month, current_user.tenant_id)

    return comparison
