"""
Enhanced Visits Router
API endpoints for enhanced visit tracking with full traceability
"""
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from models.visit import VisitType, VisitStatus
from modules.visits.topic_repository import VisitTopicRepository
from modules.visits.schemas_enhanced import (
    VisitTopicCreate,
    VisitTopicUpdate,
    VisitTopicResponse,
    VisitTopicListResponse,
)

router = APIRouter(prefix="/visit-topics", tags=["Visit Topics"])


# ============================================================================
# Visit Topics Endpoints (Catalog)
# ============================================================================

@router.post("", response_model=VisitTopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    data: VisitTopicCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new visit topic

    Create a custom topic for your organization's visits.
    """
    repo = VisitTopicRepository(db)
    topic = await repo.create_topic(data, current_user.tenant_id)
    await db.commit()
    return topic


@router.get("", response_model=VisitTopicListResponse)
async def get_topics(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of visit topics

    Retrieve the catalog of topics available for visits.
    """
    repo = VisitTopicRepository(db)
    topics, total = await repo.get_topics(
        tenant_id=current_user.tenant_id,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return VisitTopicListResponse(
        items=topics,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/active", response_model=List[VisitTopicResponse])
async def get_active_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all active topics (for dropdowns)

    Returns all active topics without pagination, useful for form dropdowns.
    """
    repo = VisitTopicRepository(db)
    topics = await repo.get_all_active(current_user.tenant_id)
    return topics


@router.get("/{topic_id}", response_model=VisitTopicResponse)
async def get_topic(
    topic_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific topic by ID"""
    repo = VisitTopicRepository(db)
    topic = await repo.get_topic(topic_id, current_user.tenant_id)

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )

    return topic


@router.put("/{topic_id}", response_model=VisitTopicResponse)
async def update_topic(
    topic_id: UUID,
    data: VisitTopicUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a visit topic"""
    repo = VisitTopicRepository(db)
    topic = await repo.update_topic(topic_id, current_user.tenant_id, data)

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )

    await db.commit()
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_topic(
    topic_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate a topic (soft delete)

    Deactivates a topic so it won't appear in dropdowns but preserves historical data.
    """
    repo = VisitTopicRepository(db)
    success = await repo.deactivate_topic(topic_id, current_user.tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )

    await db.commit()
    return None


@router.post("/seed", response_model=List[VisitTopicResponse], status_code=status.HTTP_201_CREATED)
async def seed_default_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Seed default topics

    Creates the predefined catalog of topics for your organization.
    This should be called once when first setting up the system.

    **Topics created:**
    - Proyecto Nuevo
    - Soporte Técnico
    - Presentación de Producto
    - Seguimiento Cotización
    - Negociación Comercial
    - Capacitación
    - Instalación/Entrega
    - Reclamo/Queja
    - Mantenimiento
    - Otro
    """
    repo = VisitTopicRepository(db)
    topics = await repo.seed_default_topics(current_user.tenant_id)
    await db.commit()
    return topics
