"""
Client Contacts Repository
Data access layer for client contacts
"""
from typing import Optional
from uuid import UUID
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.client_contact import ClientContact
from schemas.client import (
    ClientContactCreate,
    ClientContactUpdate,
    ClientContactResponse,
    ClientContactListResponse,
)


class ClientContactRepository:
    """Repository for client contact operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(
        self,
        contact_id: UUID,
        tenant_id: UUID
    ) -> Optional[ClientContact]:
        """Get single contact by ID"""
        result = await self.db.execute(
            select(ClientContact).where(
                and_(
                    ClientContact.id == contact_id,
                    ClientContact.tenant_id == tenant_id,
                    ClientContact.is_deleted == False
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_client(
        self,
        client_id: UUID,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 50,
        is_active: Optional[bool] = None
    ) -> ClientContactListResponse:
        """Get all contacts for a client"""
        # Build query
        query = select(ClientContact).where(
            and_(
                ClientContact.client_id == client_id,
                ClientContact.tenant_id == tenant_id,
                ClientContact.is_deleted == False
            )
        )

        if is_active is not None:
            query = query.where(ClientContact.is_active == is_active)

        # Count total
        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        # Get paginated results
        query = query.order_by(
            ClientContact.is_primary.desc(),
            ClientContact.name
        )
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        contacts = result.scalars().all()

        return ClientContactListResponse(
            items=[ClientContactResponse.model_validate(c) for c in contacts],
            total=total,
            page=page,
            page_size=page_size,
            pages=(total + page_size - 1) // page_size
        )

    async def create(
        self,
        client_id: UUID,
        tenant_id: UUID,
        data: ClientContactCreate,
        user_id: UUID
    ) -> ClientContact:
        """Create new contact"""
        # If setting as primary, unset other primary contacts for this client
        if data.is_primary:
            await self.db.execute(
                update(ClientContact)
                .where(
                    and_(
                        ClientContact.client_id == client_id,
                        ClientContact.tenant_id == tenant_id,
                        ClientContact.is_primary == True,
                        ClientContact.is_deleted == False
                    )
                )
                .values(is_primary=False)
            )

        contact = ClientContact(
            client_id=client_id,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            **data.model_dump()
        )

        self.db.add(contact)
        await self.db.flush()
        await self.db.refresh(contact)

        return contact

    async def update(
        self,
        contact: ClientContact,
        data: ClientContactUpdate,
        user_id: UUID
    ) -> ClientContact:
        """Update existing contact"""
        # If setting as primary, unset other primary contacts
        if data.is_primary and not contact.is_primary:
            await self.db.execute(
                update(ClientContact)
                .where(
                    and_(
                        ClientContact.client_id == contact.client_id,
                        ClientContact.tenant_id == contact.tenant_id,
                        ClientContact.id != contact.id,
                        ClientContact.is_primary == True,
                        ClientContact.is_deleted == False
                    )
                )
                .values(is_primary=False)
            )

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contact, field, value)

        contact.updated_by = user_id

        await self.db.flush()
        await self.db.refresh(contact)

        return contact

    async def delete(self, contact: ClientContact) -> None:
        """Soft delete contact"""
        contact.soft_delete()
        await self.db.flush()
