"""
Sales Controls Router
API endpoints for sales controls (purchase orders) management
"""

import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from datetime import date
from decimal import Decimal

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from models.sales_control import SalesControlStatus
from modules.sales.controls.repository import SalesControlRepository
from modules.sales.controls.schemas import (
    SalesControlCreate,
    SalesControlUpdate,
    SalesControlUpdateLeadTime,
    SalesControlMarkInProduction,
    SalesControlMarkDelivered,
    SalesControlMarkInvoiced,
    SalesControlMarkPaid,
    SalesControlCancel,
    SalesControlResponse,
    SalesControlListResponse,
    SalesControlDetailResponse,
    SalesControlListItem,
    SalesControlStats,
)

router = APIRouter(prefix="/sales/controls", tags=["Sales - Controls"])


@router.post("", response_model=SalesControlDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_sales_control(
    data: SalesControlCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new sales control (purchase order)"""
    repo = SalesControlRepository(db)

    exists = await repo.folio_exists(data.folio_number, current_user.tenant_id)
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sales control with folio '{data.folio_number}' already exists",
        )

    sales_control = await repo.create_sales_control(data, current_user.tenant_id, current_user.id)
    await db.commit()
    await db.refresh(sales_control, ["lines"])

    response = SalesControlDetailResponse.model_validate(sales_control)
    response.is_overdue = sales_control.is_overdue
    response.days_until_promise = sales_control.days_until_promise
    response.days_in_production = sales_control.days_in_production
    response.was_delivered_on_time = sales_control.was_delivered_on_time
    return response


@router.get("", response_model=SalesControlListResponse)
async def list_sales_controls(
    client_id: Optional[UUID] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    quotation_id: Optional[UUID] = Query(None),
    status: Optional[SalesControlStatus] = Query(None),
    po_date_from: Optional[date] = Query(None),
    po_date_to: Optional[date] = Query(None),
    promise_date_from: Optional[date] = Query(None),
    promise_date_to: Optional[date] = Query(None),
    min_amount: Optional[Decimal] = Query(None),
    max_amount: Optional[Decimal] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List sales controls with filters"""
    repo = SalesControlRepository(db)

    sales_controls, total = await repo.get_sales_controls(
        current_user.tenant_id, client_id, assigned_to, quotation_id, status,
        po_date_from, po_date_to, promise_date_from, promise_date_to,
        min_amount, max_amount, is_overdue, search, page, page_size,
    )

    total_pages = SalesControlListResponse.calculate_total_pages(total, page_size)

    items = []
    for sc in sales_controls:
        item = SalesControlListItem.model_validate(sc)
        item.is_overdue = sc.is_overdue
        item.days_until_promise = sc.days_until_promise
        items.append(item)

    return SalesControlListResponse(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )


@router.get("/overdue", response_model=List[SalesControlListItem])
async def get_overdue_sales_controls(
    assigned_to: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all overdue sales controls"""
    repo = SalesControlRepository(db)
    sales_controls = await repo.get_overdue_sales_controls(current_user.tenant_id, assigned_to)

    items = []
    for sc in sales_controls:
        item = SalesControlListItem.model_validate(sc)
        item.is_overdue = True
        item.days_until_promise = sc.days_until_promise
        items.append(item)
    return items


@router.get("/{sales_control_id}", response_model=SalesControlDetailResponse)
async def get_sales_control(
    sales_control_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get sales control detail"""
    repo = SalesControlRepository(db)
    sales_control = await repo.get_sales_control(sales_control_id, current_user.tenant_id, load_lines=True)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    response = SalesControlDetailResponse.model_validate(sales_control)
    response.is_overdue = sales_control.is_overdue
    response.days_until_promise = sales_control.days_until_promise
    response.days_in_production = sales_control.days_in_production
    response.was_delivered_on_time = sales_control.was_delivered_on_time
    return response


@router.put("/{sales_control_id}", response_model=SalesControlResponse)
async def update_sales_control(
    sales_control_id: UUID,
    data: SalesControlUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update sales control"""
    repo = SalesControlRepository(db)
    sales_control = await repo.update_sales_control(sales_control_id, current_user.tenant_id, data)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    await db.commit()
    await db.refresh(sales_control)
    return sales_control


@router.delete("/{sales_control_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sales_control(
    sales_control_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete sales control"""
    repo = SalesControlRepository(db)
    deleted = await repo.delete_sales_control(sales_control_id, current_user.tenant_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")
    await db.commit()


@router.post("/{sales_control_id}/mark-in-production", response_model=SalesControlResponse)
async def mark_in_production(
    sales_control_id: UUID,
    data: SalesControlMarkInProduction,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark as in production"""
    repo = SalesControlRepository(db)
    sales_control = await repo.mark_in_production(sales_control_id, current_user.tenant_id)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    await db.commit()
    await db.refresh(sales_control)
    return sales_control


@router.post("/{sales_control_id}/mark-delivered", response_model=SalesControlResponse)
async def mark_delivered(
    sales_control_id: UUID,
    data: SalesControlMarkDelivered,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark as delivered"""
    repo = SalesControlRepository(db)
    sales_control = await repo.mark_delivered(sales_control_id, current_user.tenant_id, data.actual_delivery_date)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    await db.commit()
    await db.refresh(sales_control)
    return sales_control


@router.post("/{sales_control_id}/mark-invoiced", response_model=SalesControlResponse)
async def mark_invoiced(
    sales_control_id: UUID,
    data: SalesControlMarkInvoiced,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark as invoiced"""
    repo = SalesControlRepository(db)
    sales_control = await repo.mark_invoiced(sales_control_id, current_user.tenant_id, data.invoice_number, data.invoice_date)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    await db.commit()
    await db.refresh(sales_control)
    return sales_control


@router.post("/{sales_control_id}/mark-paid", response_model=SalesControlResponse)
async def mark_paid(
    sales_control_id: UUID,
    data: SalesControlMarkPaid,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark as paid - triggers quota achievement updates"""
    repo = SalesControlRepository(db)
    sales_control = await repo.mark_paid(sales_control_id, current_user.tenant_id, data.payment_date)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    await db.commit()

    # Update quota achievements
    from modules.sales.quotas.services.quota_calculator import update_quota_achievements
    await update_quota_achievements(sales_control.id, current_user.tenant_id, db)
    await db.commit()

    await db.refresh(sales_control)
    return sales_control


@router.post("/{sales_control_id}/cancel", response_model=SalesControlResponse)
async def cancel_sales_control(
    sales_control_id: UUID,
    data: SalesControlCancel,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel sales control"""
    repo = SalesControlRepository(db)
    sales_control = await repo.mark_cancelled(sales_control_id, current_user.tenant_id, data.reason)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    await db.commit()
    await db.refresh(sales_control)
    return sales_control


@router.put("/{sales_control_id}/lead-time", response_model=SalesControlResponse)
async def update_lead_time(
    sales_control_id: UUID,
    data: SalesControlUpdateLeadTime,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update lead time and recalculate promise date"""
    repo = SalesControlRepository(db)
    sales_control = await repo.update_lead_time(sales_control_id, current_user.tenant_id, data.lead_time_days)

    if not sales_control:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales control not found")

    await db.commit()
    await db.refresh(sales_control)
    return sales_control


@router.get("/stats/summary", response_model=SalesControlStats)
async def get_sales_control_stats(
    assigned_to: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get sales control statistics"""
    repo = SalesControlRepository(db)
    stats = await repo.get_sales_control_stats(current_user.tenant_id, assigned_to)
    return stats
