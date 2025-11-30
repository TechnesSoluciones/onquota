"""
Client Contacts Router
API endpoints for managing client contacts
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import get_current_user
from models.user import User
from models.client import Client
from models.client_contact import ClientContact
from modules.clients.contacts_repository import ClientContactRepository
from modules.clients.repository import ClientRepository
from schemas.client import (
    ClientContactCreate,
    ClientContactUpdate,
    ClientContactResponse,
    ClientContactListResponse,
)

router = APIRouter(prefix="/clients", tags=["Client Contacts"])


@router.get("/{client_id}/contacts", response_model=ClientContactListResponse)
async def get_client_contacts(
    client_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all contacts for a client"""
    # Verify client exists and belongs to tenant
    client_repo = ClientRepository(db)
    client = await client_repo.get_client_by_id(client_id, current_user.tenant_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    repo = ClientContactRepository(db)
    return await repo.get_by_client(
        client_id,
        current_user.tenant_id,
        page,
        page_size,
        is_active
    )


@router.get("/{client_id}/contacts/{contact_id}", response_model=ClientContactResponse)
async def get_client_contact(
    client_id: UUID,
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single contact by ID"""
    repo = ClientContactRepository(db)
    contact = await repo.get_by_id(contact_id, current_user.tenant_id)

    if not contact or contact.client_id != client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    return ClientContactResponse.model_validate(contact)


@router.post("/{client_id}/contacts", response_model=ClientContactResponse, status_code=status.HTTP_201_CREATED)
async def create_client_contact(
    client_id: UUID,
    data: ClientContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create new contact for a client"""
    # Verify client exists and belongs to tenant
    client_repo = ClientRepository(db)
    client = await client_repo.get_client_by_id(client_id, current_user.tenant_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    repo = ClientContactRepository(db)
    contact = await repo.create(
        client_id,
        current_user.tenant_id,
        data,
        current_user.id
    )

    await db.commit()
    await db.refresh(contact)

    return ClientContactResponse.model_validate(contact)


@router.put("/{client_id}/contacts/{contact_id}", response_model=ClientContactResponse)
async def update_client_contact(
    client_id: UUID,
    contact_id: UUID,
    data: ClientContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update contact"""
    repo = ClientContactRepository(db)
    contact = await repo.get_by_id(contact_id, current_user.tenant_id)

    if not contact or contact.client_id != client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    contact = await repo.update(contact, data, current_user.id)

    await db.commit()
    await db.refresh(contact)

    return ClientContactResponse.model_validate(contact)


@router.delete("/{client_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_contact(
    client_id: UUID,
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete contact (soft delete)"""
    repo = ClientContactRepository(db)
    contact = await repo.get_by_id(contact_id, current_user.tenant_id)

    if not contact or contact.client_id != client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    await repo.delete(contact)
    await db.commit()
