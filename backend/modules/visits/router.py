"""
Visits and Calls Router
API endpoints for customer visits and phone calls tracking
"""
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import datetime

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from modules.visits.repository import VisitRepository, CallRepository
from modules.visits.schemas import (
    VisitCreate,
    VisitUpdate,
    VisitResponse,
    VisitListResponse,
    VisitCheckIn,
    VisitCheckOut,
    CallCreate,
    CallUpdate,
    CallResponse,
    CallListResponse,
    CallStart,
    CallEnd,
)
from models.visit import VisitStatus, CallType, CallStatus

router = APIRouter(prefix="/visits", tags=["Visits & Calls"])


# ============================================================================
# Visit Endpoints
# ============================================================================

@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
async def create_visit(
    data: VisitCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new customer visit

    Schedule a visit to a customer with GPS tracking capabilities.
    Visit will be created in SCHEDULED status.
    """
    repo = VisitRepository(db)
    visit = await repo.create_visit(
        data=data,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_name=current_user.full_name,
    )
    await db.commit()
    return visit


@router.get("", response_model=VisitListResponse)
async def get_visits(
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    status: Optional[VisitStatus] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of visits

    Retrieve all visits for the current user with optional filters:
    - By client
    - By status (scheduled, in_progress, completed, cancelled)
    - By date range
    """
    repo = VisitRepository(db)
    visits, total = await repo.get_visits(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        client_id=client_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return VisitListResponse(
        items=visits,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{visit_id}", response_model=VisitResponse)
async def get_visit(
    visit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific visit by ID"""
    repo = VisitRepository(db)
    visit = await repo.get_visit(visit_id, current_user.tenant_id)

    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    return visit


@router.put("/{visit_id}", response_model=VisitResponse)
async def update_visit(
    visit_id: UUID,
    data: VisitUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a visit

    Update visit details like title, description, scheduled date, etc.
    Cannot update GPS check-in/check-out data (use dedicated endpoints).
    """
    repo = VisitRepository(db)
    visit = await repo.update_visit(visit_id, current_user.tenant_id, data)

    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    await db.commit()
    return visit


@router.post("/{visit_id}/check-in", response_model=VisitResponse)
async def check_in_visit(
    visit_id: UUID,
    data: VisitCheckIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check in to a visit (GPS)

    Record GPS coordinates when arriving at customer location.
    Visit status will change to IN_PROGRESS.

    **GPS Data:**
    - Latitude and longitude coordinates
    - Optional reverse-geocoded address
    - Check-in timestamp (automatic)
    """
    repo = VisitRepository(db)
    visit = await repo.check_in(visit_id, current_user.tenant_id, data)

    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    await db.commit()
    return visit


@router.post("/{visit_id}/check-out", response_model=VisitResponse)
async def check_out_visit(
    visit_id: UUID,
    data: VisitCheckOut,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check out from a visit (GPS)

    Record GPS coordinates when leaving customer location.
    Visit status will change to COMPLETED.
    Duration will be calculated automatically.

    **GPS Data:**
    - Latitude and longitude coordinates
    - Optional reverse-geocoded address
    - Check-out timestamp (automatic)
    - Visit notes and outcome
    """
    repo = VisitRepository(db)
    visit = await repo.check_out(visit_id, current_user.tenant_id, data)

    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    await db.commit()
    return visit


@router.delete("/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visit(
    visit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a visit (soft delete)

    Soft deletes a visit - it will be marked as deleted but retained in database.
    """
    repo = VisitRepository(db)
    success = await repo.delete_visit(visit_id, current_user.tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )

    await db.commit()
    return None


# ============================================================================
# Call Endpoints
# ============================================================================

@router.post("/calls", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
async def create_call(
    data: CallCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new phone call record

    Record a phone call with a customer.
    Can be scheduled for future or logged immediately.

    **Call Types:**
    - INCOMING: Received call
    - OUTGOING: Made call
    - MISSED: Missed call
    """
    repo = CallRepository(db)
    call = await repo.create_call(
        data=data,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_name=current_user.full_name,
    )
    await db.commit()
    return call


@router.get("/calls", response_model=CallListResponse)
async def get_calls(
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    call_type: Optional[CallType] = Query(None, description="Filter by type"),
    status: Optional[CallStatus] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of calls

    Retrieve all calls for the current user with optional filters:
    - By client
    - By call type (incoming/outgoing/missed)
    - By status
    - By date range
    """
    repo = CallRepository(db)
    calls, total = await repo.get_calls(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        client_id=client_id,
        call_type=call_type,
        status=status,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return CallListResponse(
        items=calls,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/calls/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific call by ID"""
    repo = CallRepository(db)
    call = await repo.get_call(call_id, current_user.tenant_id)

    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found"
        )

    return call


@router.put("/calls/{call_id}", response_model=CallResponse)
async def update_call(
    call_id: UUID,
    data: CallUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a call

    Update call details like title, description, notes, outcome, etc.
    """
    repo = CallRepository(db)
    call = await repo.update_call(call_id, current_user.tenant_id, data)

    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found"
        )

    await db.commit()
    return call


@router.post("/calls/{call_id}/start", response_model=CallResponse)
async def start_call(
    call_id: UUID,
    data: CallStart,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a call

    Record the start time of a call.
    Use this when initiating or receiving a call.
    """
    repo = CallRepository(db)
    call = await repo.start_call(call_id, current_user.tenant_id, data)

    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found"
        )

    await db.commit()
    return call


@router.post("/calls/{call_id}/end", response_model=CallResponse)
async def end_call(
    call_id: UUID,
    data: CallEnd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    End a call

    Record the end time and outcome of a call.
    Duration will be calculated automatically.

    **Final Status Options:**
    - COMPLETED: Call completed successfully
    - NO_ANSWER: No one answered
    - VOICEMAIL: Left voicemail
    """
    repo = CallRepository(db)
    call = await repo.end_call(call_id, current_user.tenant_id, data)

    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found"
        )

    await db.commit()
    return call


@router.delete("/calls/{call_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a call (soft delete)

    Soft deletes a call - it will be marked as deleted but retained in database.
    """
    repo = CallRepository(db)
    success = await repo.delete_call(call_id, current_user.tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found"
        )

    await db.commit()
    return None
