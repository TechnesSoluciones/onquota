"""
Clients endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import math

from core.database import get_db
from core.exceptions import NotFoundError, ForbiddenError
from models.user import User, UserRole
from models.client import ClientStatus, ClientType, Industry
from schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
    ClientSummary,
)
from modules.clients.repository import ClientRepository
from api.dependencies import get_current_user, require_admin, require_supervisor_or_admin

router = APIRouter(prefix="/clients", tags=["Clients"])


# ============================================================================
# Client Endpoints
# ============================================================================


@router.post(
    "/",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_client(
    data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new client

    Creates a new client/customer record in the CRM system.

    **Access Control:**
    - All authenticated users can create clients
    - Client will be associated with user's tenant

    **Validations:**
    - Name is required
    - Email must be valid format (if provided)
    - URLs must start with http:// or https://
    - Currency code must be 3 characters
    - Conversion date cannot be before first contact date
    """
    repo = ClientRepository(db)

    # Check if client with same email already exists
    if data.email:
        existing = await repo.get_client_by_email(data.email, current_user.tenant_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Client with email {data.email} already exists",
            )

    client = await repo.create_client(
        tenant_id=current_user.tenant_id,
        **data.model_dump(),
    )

    await db.commit()
    await db.refresh(client)
    return client


@router.get("/", response_model=ClientListResponse)
async def list_clients(
    status: Optional[ClientStatus] = Query(None, description="Filter by client status"),
    client_type: Optional[ClientType] = Query(None, description="Filter by client type"),
    industry: Optional[Industry] = Query(None, description="Filter by industry"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in name, email, contact person, notes"),
    country: Optional[str] = Query(None, description="Filter by country"),
    city: Optional[str] = Query(None, description="Filter by city"),
    tags: Optional[str] = Query(None, description="Search in tags"),
    lead_source: Optional[str] = Query(None, description="Filter by lead source"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List clients with filters and pagination

    Returns paginated list of clients with optional filters.

    **Filters:**
    - `status`: Filter by client status (lead, prospect, active, inactive, lost)
    - `client_type`: Filter by type (individual, company)
    - `industry`: Filter by industry sector
    - `is_active`: Filter by active status
    - `search`: Full-text search in name, email, contact person, and notes
    - `country`: Filter by country
    - `city`: Filter by city
    - `tags`: Search in tags (partial match)
    - `lead_source`: Filter by lead source

    **Pagination:**
    - `page`: Page number (starts at 1)
    - `page_size`: Items per page (1-100)

    **Access Control:**
    - All authenticated users can list clients
    - Results are filtered by user's tenant
    """
    repo = ClientRepository(db)

    clients, total = await repo.list_clients(
        tenant_id=current_user.tenant_id,
        status=status,
        client_type=client_type,
        industry=industry,
        is_active=is_active,
        search=search,
        country=country,
        city=city,
        tags=tags,
        lead_source=lead_source,
        page=page,
        page_size=page_size,
    )

    pages = math.ceil(total / page_size) if total > 0 else 0

    return ClientListResponse(
        items=clients,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get client by ID

    Returns detailed client information.

    **Access Control:**
    - All authenticated users can view clients in their tenant
    """
    repo = ClientRepository(db)

    client = await repo.get_client_by_id(client_id, current_user.tenant_id)
    if not client:
        raise NotFoundError("Client", client_id)

    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update client

    Updates an existing client record.

    **Access Control:**
    - All authenticated users can update clients in their tenant

    **Validations:**
    - Email must be valid format (if provided)
    - URLs must start with http:// or https://
    - Currency code must be 3 characters
    """
    repo = ClientRepository(db)

    # Check if client exists
    client = await repo.get_client_by_id(client_id, current_user.tenant_id)
    if not client:
        raise NotFoundError("Client", client_id)

    # Check if email is being updated and already exists
    if data.email and data.email != client.email:
        existing = await repo.get_client_by_email(data.email, current_user.tenant_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Client with email {data.email} already exists",
            )

    updated_client = await repo.update_client(
        client_id=client_id,
        tenant_id=current_user.tenant_id,
        **data.model_dump(exclude_unset=True),
    )

    await db.commit()
    await db.refresh(updated_client)
    return updated_client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete client

    Soft deletes a client record.

    **Access Control:** Admin only

    **Note:** This is a soft delete. The client record is marked as deleted
    but not removed from the database.
    """
    repo = ClientRepository(db)

    success = await repo.delete_client(client_id, current_user.tenant_id)
    if not success:
        raise NotFoundError("Client", client_id)

    await db.commit()
    return None


@router.put("/{client_id}/status", response_model=ClientResponse)
async def update_client_status(
    client_id: UUID,
    status: ClientStatus,
    current_user: User = Depends(require_supervisor_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update client status

    Updates the CRM status of a client (e.g., lead → prospect → active).

    **Access Control:** Supervisor or Admin only

    **Status Values:**
    - `lead`: Initial contact/interest
    - `prospect`: Qualified lead
    - `active`: Active customer
    - `inactive`: Inactive customer
    - `lost`: Lost opportunity
    """
    repo = ClientRepository(db)

    client = await repo.update_client_status(
        client_id=client_id,
        tenant_id=current_user.tenant_id,
        status=status,
    )

    if not client:
        raise NotFoundError("Client", client_id)

    await db.commit()
    await db.refresh(client)
    return client


@router.get("/summary/statistics", response_model=ClientSummary)
async def get_client_summary(
    status: Optional[ClientStatus] = Query(None, description="Filter by status"),
    industry: Optional[Industry] = Query(None, description="Filter by industry"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get client summary statistics

    Returns summary statistics including totals and counts by status.

    **Access Control:**
    - All authenticated users can view summary for their tenant

    **Statistics Included:**
    - Total clients
    - Count by status (leads, prospects, active, inactive, lost)
    - Count by industry
    """
    repo = ClientRepository(db)

    summary = await repo.get_client_summary(
        tenant_id=current_user.tenant_id,
        status=status,
        industry=industry,
    )

    by_industry = await repo.get_clients_by_industry(
        tenant_id=current_user.tenant_id,
    )

    return ClientSummary(
        total_clients=summary["total_clients"],
        leads_count=summary["leads_count"],
        prospects_count=summary["prospects_count"],
        active_count=summary["active_count"],
        inactive_count=summary["inactive_count"],
        lost_count=summary["lost_count"],
        by_industry=by_industry,
    )
