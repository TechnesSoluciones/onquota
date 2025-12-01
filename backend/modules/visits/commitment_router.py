"""
Commitments Router
API endpoints for commitment and follow-up management
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
from models.visit import CommitmentStatus
from modules.visits.commitment_repository import CommitmentRepository
from modules.visits.schemas_enhanced import (
    CommitmentCreate,
    CommitmentUpdate,
    CommitmentComplete,
    CommitmentResponse,
    CommitmentListResponse,
)

router = APIRouter(prefix="/commitments", tags=["Commitments"])


# ============================================================================
# Commitment Endpoints
# ============================================================================

@router.post("", response_model=CommitmentResponse, status_code=status.HTTP_201_CREATED)
async def create_commitment(
    data: CommitmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new commitment

    Create a follow-up or commitment task.
    Can be linked to a visit or standalone.

    **Commitment Types:**
    - FOLLOW_UP: General follow-up
    - SEND_QUOTE: Send quotation
    - TECHNICAL_VISIT: Schedule technical visit
    - DEMO: Product demonstration
    - DOCUMENTATION: Send documentation
    - OTHER: Other tasks

    **Priority Levels:**
    - LOW, MEDIUM, HIGH, URGENT
    """
    repo = CommitmentRepository(db)
    commitment = await repo.create_commitment(
        data=data,
        tenant_id=current_user.tenant_id,
        created_by_user_id=current_user.id,
    )
    await db.commit()
    return commitment


@router.get("", response_model=CommitmentListResponse)
async def get_commitments(
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    visit_id: Optional[UUID] = Query(None, description="Filter by visit"),
    assigned_to_user_id: Optional[UUID] = Query(None, description="Filter by assigned user"),
    status: Optional[CommitmentStatus] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Filter by due date >= start_date"),
    end_date: Optional[datetime] = Query(None, description="Filter by due date <= end_date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of commitments

    Retrieve commitments with optional filters:
    - By client
    - By visit
    - By assigned user
    - By status
    - By due date range
    """
    repo = CommitmentRepository(db)
    commitments, total = await repo.get_commitments(
        tenant_id=current_user.tenant_id,
        client_id=client_id,
        visit_id=visit_id,
        assigned_to_user_id=assigned_to_user_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return CommitmentListResponse(
        items=commitments,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/pending", response_model=CommitmentListResponse)
async def get_pending_commitments(
    assigned_to_user_id: Optional[UUID] = Query(None, description="Filter by assigned user"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all pending commitments

    Returns commitments with PENDING status.
    Useful for "My Tasks" views.
    """
    repo = CommitmentRepository(db)
    commitments, total = await repo.get_pending_commitments(
        tenant_id=current_user.tenant_id,
        assigned_to_user_id=assigned_to_user_id,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return CommitmentListResponse(
        items=commitments,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/overdue", response_model=CommitmentListResponse)
async def get_overdue_commitments(
    assigned_to_user_id: Optional[UUID] = Query(None, description="Filter by assigned user"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get overdue commitments

    Returns commitments that are past their due date and not yet completed.
    """
    repo = CommitmentRepository(db)
    commitments, total = await repo.get_overdue_commitments(
        tenant_id=current_user.tenant_id,
        assigned_to_user_id=assigned_to_user_id,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return CommitmentListResponse(
        items=commitments,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats")
async def get_commitment_stats(
    assigned_to_user_id: Optional[UUID] = Query(None, description="Filter by assigned user"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get commitment statistics

    Returns statistics about commitments:
    - Total commitments
    - Count by status
    - Completion rate
    """
    repo = CommitmentRepository(db)
    stats = await repo.get_commitment_stats(
        tenant_id=current_user.tenant_id,
        assigned_to_user_id=assigned_to_user_id,
    )
    return stats


@router.get("/{commitment_id}", response_model=CommitmentResponse)
async def get_commitment(
    commitment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific commitment by ID"""
    repo = CommitmentRepository(db)
    commitment = await repo.get_commitment(commitment_id, current_user.tenant_id)

    if not commitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commitment not found"
        )

    return commitment


@router.put("/{commitment_id}", response_model=CommitmentResponse)
async def update_commitment(
    commitment_id: UUID,
    data: CommitmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a commitment"""
    repo = CommitmentRepository(db)
    commitment = await repo.update_commitment(commitment_id, current_user.tenant_id, data)

    if not commitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commitment not found"
        )

    await db.commit()
    return commitment


@router.post("/{commitment_id}/complete", response_model=CommitmentResponse)
async def complete_commitment(
    commitment_id: UUID,
    data: CommitmentComplete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a commitment as completed

    Records the completion time and optional notes.
    """
    repo = CommitmentRepository(db)
    commitment = await repo.complete_commitment(
        commitment_id=commitment_id,
        tenant_id=current_user.tenant_id,
        completion_notes=data.completion_notes,
    )

    if not commitment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commitment not found"
        )

    await db.commit()
    return commitment


@router.delete("/{commitment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_commitment(
    commitment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a commitment (soft delete)

    Soft deletes a commitment - it will be marked as deleted but retained in database.
    """
    repo = CommitmentRepository(db)
    success = await repo.delete_commitment(commitment_id, current_user.tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commitment not found"
        )

    await db.commit()
    return None
