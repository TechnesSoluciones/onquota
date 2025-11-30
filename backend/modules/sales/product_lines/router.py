"""
Product Lines Router
API endpoints for product lines catalog management
"""

import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from modules.sales.product_lines.repository import ProductLineRepository
from modules.sales.product_lines.schemas import (
    SalesProductLineCreate,
    SalesProductLineUpdate,
    SalesProductLineResponse,
    SalesProductLineListResponse,
)

router = APIRouter(prefix="/sales/product-lines", tags=["Sales - Product Lines"])


# ============================================================================
# Product Line CRUD Endpoints
# ============================================================================

@router.post("", response_model=SalesProductLineResponse, status_code=status.HTTP_201_CREATED)
async def create_product_line(
    data: SalesProductLineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new product line

    Product lines are used to categorize sales for quota tracking.
    Each product line can have:
    - Unique name (required)
    - Optional code/SKU
    - Color for UI visualization
    - Display order for sorting
    """
    repo = ProductLineRepository(db)

    # Check if product line with same name exists
    exists = await repo.product_line_exists(
        name=data.name,
        tenant_id=current_user.tenant_id,
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product line with name '{data.name}' already exists",
        )

    product_line = await repo.create_product_line(
        data=data,
        tenant_id=current_user.tenant_id,
    )

    await db.commit()
    return product_line


@router.get("", response_model=SalesProductLineListResponse)
async def list_product_lines(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List product lines with optional filters

    Returns product lines ordered by display_order and name.
    Filter by active status to get only active product lines for dropdowns.
    """
    repo = ProductLineRepository(db)

    product_lines, total = await repo.get_product_lines(
        tenant_id=current_user.tenant_id,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    total_pages = SalesProductLineListResponse.calculate_total_pages(total, page_size)

    return SalesProductLineListResponse(
        items=product_lines,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/active", response_model=list[SalesProductLineResponse])
async def get_active_product_lines(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all active product lines (for dropdowns)

    Returns only active product lines ordered by display_order and name.
    Use this endpoint to populate dropdown lists in forms.
    """
    repo = ProductLineRepository(db)

    product_lines = await repo.get_active_product_lines(
        tenant_id=current_user.tenant_id,
    )

    return product_lines


@router.get("/{product_line_id}", response_model=SalesProductLineResponse)
async def get_product_line(
    product_line_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get product line by ID"""
    repo = ProductLineRepository(db)
    product_line = await repo.get_product_line(product_line_id, current_user.tenant_id)

    if not product_line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product line not found",
        )

    return product_line


@router.put("/{product_line_id}", response_model=SalesProductLineResponse)
async def update_product_line(
    product_line_id: UUID,
    data: SalesProductLineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update product line

    Update product line details like name, code, color, display order, or active status.
    """
    repo = ProductLineRepository(db)

    # If updating name, check for duplicates
    if data.name:
        exists = await repo.product_line_exists(
            name=data.name,
            tenant_id=current_user.tenant_id,
            exclude_id=product_line_id,
        )
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product line with name '{data.name}' already exists",
            )

    product_line = await repo.update_product_line(
        product_line_id,
        current_user.tenant_id,
        data,
    )

    if not product_line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product line not found",
        )

    await db.commit()
    return product_line


@router.delete("/{product_line_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_line(
    product_line_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete product line (soft delete/deactivate)

    Soft deletes a product line by deactivating it.
    Historical data referencing this product line will remain intact.
    """
    repo = ProductLineRepository(db)
    success = await repo.delete_product_line(product_line_id, current_user.tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product line not found",
        )

    await db.commit()
    return None
