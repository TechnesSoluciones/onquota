"""
LTA API Router
Endpoints for managing Long Term Agreements
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional
import math

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from modules.lta.repository import LTARepository
from modules.lta.schemas import (
    LTAAgreementCreate,
    LTAAgreementUpdate,
    LTAAgreementResponse,
    LTAAgreementWithClient,
    LTAListResponse
)


router = APIRouter(prefix="/api/v1/lta", tags=["LTA"])


@router.post("/", response_model=LTAAgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_lta(
    lta_data: LTAAgreementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new LTA agreement"""
    repo = LTARepository(db)

    try:
        lta = await repo.create(
            lta_data=lta_data,
            tenant_id=current_user.tenant_id,
            created_by=current_user.id
        )
        return LTAAgreementResponse.model_validate(lta)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=LTAListResponse)
async def list_ltas(
    active_only: bool = False,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all LTA agreements"""
    repo = LTARepository(db)

    items, total = await repo.list(
        tenant_id=current_user.tenant_id,
        active_only=active_only,
        page=page,
        limit=limit
    )

    return LTAListResponse(
        items=[LTAAgreementResponse.model_validate(lta) for lta in items],
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.get("/{lta_id}", response_model=LTAAgreementWithClient)
async def get_lta(
    lta_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get LTA agreement by ID"""
    repo = LTARepository(db)
    lta = await repo.get_by_id(lta_id, current_user.tenant_id)

    if not lta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LTA agreement not found"
        )

    # Build response with client info
    response_data = LTAAgreementResponse.model_validate(lta).model_dump()
    if lta.client:
        response_data["client_name"] = lta.client.name
        response_data["client_email"] = lta.client.email
        response_data["client_bpid"] = lta.client.bpid

    return LTAAgreementWithClient(**response_data)


@router.get("/client/{client_id}", response_model=Optional[LTAAgreementWithClient])
async def get_client_lta(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get LTA agreement for a specific client"""
    repo = LTARepository(db)
    lta = await repo.get_by_client(client_id, current_user.tenant_id)

    if not lta:
        return None

    # Build response with client info
    response_data = LTAAgreementResponse.model_validate(lta).model_dump()
    if lta.client:
        response_data["client_name"] = lta.client.name
        response_data["client_email"] = lta.client.email
        response_data["client_bpid"] = lta.client.bpid

    return LTAAgreementWithClient(**response_data)


@router.get("/agreement/{agreement_number}", response_model=LTAAgreementWithClient)
async def get_lta_by_number(
    agreement_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get LTA agreement by agreement number"""
    repo = LTARepository(db)
    lta = await repo.get_by_agreement_number(agreement_number, current_user.tenant_id)

    if not lta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LTA agreement not found"
        )

    # Build response with client info
    response_data = LTAAgreementResponse.model_validate(lta).model_dump()
    if lta.client:
        response_data["client_name"] = lta.client.name
        response_data["client_email"] = lta.client.email
        response_data["client_bpid"] = lta.client.bpid

    return LTAAgreementWithClient(**response_data)


@router.put("/{lta_id}", response_model=LTAAgreementResponse)
async def update_lta(
    lta_id: UUID,
    lta_data: LTAAgreementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update LTA agreement"""
    repo = LTARepository(db)

    try:
        lta = await repo.update(
            lta_id=lta_id,
            lta_data=lta_data,
            tenant_id=current_user.tenant_id,
            updated_by=current_user.id
        )

        if not lta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LTA agreement not found"
            )

        return LTAAgreementResponse.model_validate(lta)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{lta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lta(
    lta_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete LTA agreement"""
    repo = LTARepository(db)
    success = await repo.delete(lta_id, current_user.tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LTA agreement not found"
        )

    return None
