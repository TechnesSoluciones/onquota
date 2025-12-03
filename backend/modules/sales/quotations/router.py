"""
Quotations Router
API endpoints for quotation management
"""

import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from datetime import date

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from models.quotation import QuoteStatus
from modules.sales.quotations.repository import QuotationRepository
from modules.sales.quotations.schemas import (
    QuotationCreate,
    QuotationUpdate,
    QuotationMarkWon,
    QuotationMarkLost,
    QuotationResponse,
    QuotationListResponse,
    QuotationDetailResponse,
    QuotationStats,
    QuotationMonthlyStats,
    QuotationsByClientStats,
)

router = APIRouter(prefix="/sales/quotations", tags=["Sales - Quotations"])


# ============================================================================
# Quotation CRUD Endpoints
# ============================================================================

@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    data: QuotationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new quotation

    Register a quotation from external production system.
    Quote number must be unique within tenant.

    **Flow:**
    1. External system generates quote
    2. Register quote here for tracking
    3. Link to opportunity (if applicable)
    4. Quote can later be marked as won/lost
    """
    repo = QuotationRepository(db)

    # Check if quote number already exists
    exists = await repo.quotation_number_exists(
        quote_number=data.quote_number,
        tenant_id=current_user.tenant_id,
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation with number '{data.quote_number}' already exists",
        )

    quotation = await repo.create_quotation(
        data=data,
        tenant_id=current_user.tenant_id,
        current_user_id=current_user.id,
    )

    await db.commit()
    return quotation


@router.get("", response_model=QuotationListResponse)
async def list_quotations(
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    opportunity_id: Optional[UUID] = Query(None, description="Filter by opportunity"),
    assigned_to: Optional[UUID] = Query(None, description="Filter by sales rep"),
    status: Optional[QuoteStatus] = Query(None, description="Filter by status"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List quotations with filters and pagination

    **Filters:**
    - client_id: Filter by client
    - opportunity_id: Filter by linked opportunity
    - assigned_to: Filter by sales representative
    - status: Filter by quote status
    - start_date/end_date: Filter by quote date range
    """
    repo = QuotationRepository(db)

    quotations, total = await repo.get_quotations(
        tenant_id=current_user.tenant_id,
        client_id=client_id,
        opportunity_id=opportunity_id,
        assigned_to=assigned_to,
        status=status,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )

    total_pages = QuotationListResponse.calculate_total_pages(total, page_size)

    return QuotationListResponse(
        items=quotations,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ============================================================================

@router.get("/stats/summary", response_model=QuotationStats)
async def get_quotation_stats(
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    assigned_to: Optional[UUID] = Query(None, description="Filter by sales rep"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Filter by year"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get quotation summary statistics

    **Returns:**
    - Total quotations and amounts
    - Breakdown by status (cotizado, ganado, perdido, ganado parcialmente)
    - Win rate percentage
    - Average quote and won amounts

    **Filters:**
    - client_id: Filter by specific client
    - assigned_to: Filter by sales rep
    - year/month: Filter by time period
    """
    repo = QuotationRepository(db)

    stats = await repo.get_stats(
        tenant_id=current_user.tenant_id,
        client_id=client_id,
        assigned_to=assigned_to,
        year=year,
        month=month,
    )

    return stats


@router.get("/stats/monthly/{year}", response_model=List[QuotationMonthlyStats])
async def get_monthly_stats(
    year: int,
    assigned_to: Optional[UUID] = Query(None, description="Filter by sales rep"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get monthly quotation statistics for a year

    Returns month-by-month breakdown of:
    - Total quotes and amounts
    - Won/lost counts and amounts
    - Win rates

    **Use Case:** Charts showing monthly trends
    """
    repo = QuotationRepository(db)

    stats = await repo.get_monthly_stats(
        tenant_id=current_user.tenant_id,
        year=year,
        assigned_to=assigned_to,
    )

    return stats


@router.get("/stats/by-client", response_model=List[QuotationsByClientStats])
async def get_stats_by_client(
    assigned_to: Optional[UUID] = Query(None, description="Filter by sales rep"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Filter by year"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get quotation statistics grouped by client

    Returns per-client breakdown of:
    - Total quotations and amounts
    - Won counts and amounts
    - Lost and pending counts

    **Use Case:** Identify top clients by quotation volume/value
    """
    repo = QuotationRepository(db)

    stats = await repo.get_stats_by_client(
        tenant_id=current_user.tenant_id,
        assigned_to=assigned_to,
        year=year,
    )

    return stats

@router.get("/{quotation_id}", response_model=QuotationDetailResponse)
async def get_quotation(
    quotation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get quotation by ID with full details"""
    repo = QuotationRepository(db)
    quotation = await repo.get_quotation(quotation_id, current_user.tenant_id)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found",
        )

    # Add sales_controls_count
    response_dict = {**quotation.__dict__, 'sales_controls_count': len(quotation.sales_controls)}
    return response_dict


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: UUID,
    data: QuotationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update quotation details

    Update quotation metadata like quote number, date, amount, etc.
    Use dedicated endpoints to mark as won/lost.
    """
    repo = QuotationRepository(db)

    # If updating quote number, check for duplicates
    if data.quote_number:
        exists = await repo.quotation_number_exists(
            quote_number=data.quote_number,
            tenant_id=current_user.tenant_id,
            exclude_id=quotation_id,
        )
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quotation with number '{data.quote_number}' already exists",
            )

    quotation = await repo.update_quotation(quotation_id, current_user.tenant_id, data)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found",
        )

    await db.commit()
    return quotation


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quotation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete quotation (soft delete)

    Soft deletes a quotation - it will be marked as deleted but retained in database.
    """
    repo = QuotationRepository(db)
    success = await repo.delete_quotation(quotation_id, current_user.tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found",
        )

    await db.commit()
    return None


# ============================================================================
# Status Management Endpoints
# ============================================================================

@router.post("/{quotation_id}/mark-won", response_model=QuotationResponse)
async def mark_quotation_won(
    quotation_id: UUID,
    data: QuotationMarkWon,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark quotation as won

    **Status Transitions:**
    - fully won: Status changes to GANADO
    - partially won: Status changes to GANADO_PARCIALMENTE

    Won date defaults to today if not provided.
    """
    repo = QuotationRepository(db)
    quotation = await repo.mark_as_won(quotation_id, current_user.tenant_id, data)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found",
        )

    await db.commit()
    return quotation


@router.post("/{quotation_id}/mark-lost", response_model=QuotationResponse)
async def mark_quotation_lost(
    quotation_id: UUID,
    data: QuotationMarkLost,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark quotation as lost

    **Status Transition:**
    - Status changes to PERDIDO

    Lost date defaults to today if not provided.
    Lost reason is optional but recommended for analysis.
    """
    repo = QuotationRepository(db)
    quotation = await repo.mark_as_lost(quotation_id, current_user.tenant_id, data)

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found",
        )

    await db.commit()
    return quotation


# ============================================================================
# Analytics Endpoints
