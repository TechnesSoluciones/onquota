"""
Client repository
Handles database operations for clients
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional, Tuple
from uuid import UUID
from datetime import date

from models.client import Client, ClientStatus, ClientType, Industry


class ClientRepository:
    """Repository for client database operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ============================================================================
    # Create Operations
    # ============================================================================

    async def create_client(
        self,
        tenant_id: UUID,
        name: str,
        client_type: ClientType = ClientType.COMPANY,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        mobile: Optional[str] = None,
        website: Optional[str] = None,
        address_line1: Optional[str] = None,
        address_line2: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        postal_code: Optional[str] = None,
        country: Optional[str] = None,
        industry: Optional[Industry] = None,
        tax_id: Optional[str] = None,
        status: ClientStatus = ClientStatus.LEAD,
        contact_person_name: Optional[str] = None,
        contact_person_email: Optional[str] = None,
        contact_person_phone: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[str] = None,
        lead_source: Optional[str] = None,
        first_contact_date: Optional[date] = None,
        conversion_date: Optional[date] = None,
        linkedin_url: Optional[str] = None,
        twitter_handle: Optional[str] = None,
        preferred_language: str = "en",
        preferred_currency: str = "USD",
        is_active: bool = True,
    ) -> Client:
        """Create a new client"""
        client = Client(
            tenant_id=tenant_id,
            name=name,
            client_type=client_type,
            email=email,
            phone=phone,
            mobile=mobile,
            website=website,
            address_line1=address_line1,
            address_line2=address_line2,
            city=city,
            state=state,
            postal_code=postal_code,
            country=country,
            industry=industry,
            tax_id=tax_id,
            status=status,
            contact_person_name=contact_person_name,
            contact_person_email=contact_person_email,
            contact_person_phone=contact_person_phone,
            notes=notes,
            tags=tags,
            lead_source=lead_source,
            first_contact_date=first_contact_date,
            conversion_date=conversion_date,
            linkedin_url=linkedin_url,
            twitter_handle=twitter_handle,
            preferred_language=preferred_language,
            preferred_currency=preferred_currency,
            is_active=is_active,
        )

        self.session.add(client)
        await self.session.flush()
        return client

    # ============================================================================
    # Read Operations
    # ============================================================================

    async def get_client_by_id(
        self,
        client_id: UUID,
        tenant_id: UUID,
    ) -> Optional[Client]:
        """Get client by ID"""
        stmt = select(Client).where(
            Client.id == client_id,
            Client.tenant_id == tenant_id,
            Client.is_deleted == False,
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_client_by_email(
        self,
        email: str,
        tenant_id: UUID,
    ) -> Optional[Client]:
        """Get client by email"""
        stmt = select(Client).where(
            Client.email == email,
            Client.tenant_id == tenant_id,
            Client.is_deleted == False,
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_clients(
        self,
        tenant_id: UUID,
        status: Optional[ClientStatus] = None,
        client_type: Optional[ClientType] = None,
        industry: Optional[Industry] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        country: Optional[str] = None,
        city: Optional[str] = None,
        tags: Optional[str] = None,
        lead_source: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[list[Client], int]:
        """
        List clients with filters and pagination

        Args:
            tenant_id: Tenant ID
            status: Filter by client status
            client_type: Filter by client type (individual/company)
            industry: Filter by industry
            is_active: Filter by active status
            search: Search in name, email, contact person
            country: Filter by country
            city: Filter by city
            tags: Search in tags (partial match)
            lead_source: Filter by lead source
            page: Page number (1-indexed)
            page_size: Number of items per page

        Returns:
            Tuple of (list of clients, total count)
        """
        # Base query
        stmt = select(Client).where(
            Client.tenant_id == tenant_id,
            Client.is_deleted == False,
        )

        # Apply filters
        if status:
            stmt = stmt.where(Client.status == status)

        if client_type:
            stmt = stmt.where(Client.client_type == client_type)

        if industry:
            stmt = stmt.where(Client.industry == industry)

        if is_active is not None:
            stmt = stmt.where(Client.is_active == is_active)

        if country:
            stmt = stmt.where(Client.country.ilike(f"%{country}%"))

        if city:
            stmt = stmt.where(Client.city.ilike(f"%{city}%"))

        if tags:
            stmt = stmt.where(Client.tags.ilike(f"%{tags}%"))

        if lead_source:
            stmt = stmt.where(Client.lead_source.ilike(f"%{lead_source}%"))

        if search:
            search_filter = or_(
                Client.name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
                Client.contact_person_name.ilike(f"%{search}%"),
                Client.notes.ilike(f"%{search}%"),
            )
            stmt = stmt.where(search_filter)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar_one()

        # Apply pagination and ordering
        stmt = stmt.order_by(Client.name.asc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)

        # Execute query
        result = await self.session.execute(stmt)
        clients = list(result.scalars().all())

        return clients, total

    # ============================================================================
    # Update Operations
    # ============================================================================

    async def update_client(
        self,
        client_id: UUID,
        tenant_id: UUID,
        **kwargs,
    ) -> Optional[Client]:
        """Update client"""
        client = await self.get_client_by_id(client_id, tenant_id)
        if not client:
            return None

        for key, value in kwargs.items():
            if hasattr(client, key) and value is not None:
                setattr(client, key, value)

        await self.session.flush()
        return client

    async def update_client_status(
        self,
        client_id: UUID,
        tenant_id: UUID,
        status: ClientStatus,
    ) -> Optional[Client]:
        """Update client status"""
        client = await self.get_client_by_id(client_id, tenant_id)
        if not client:
            return None

        client.status = status
        await self.session.flush()
        return client

    # ============================================================================
    # Delete Operations
    # ============================================================================

    async def delete_client(
        self,
        client_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Soft delete client"""
        client = await self.get_client_by_id(client_id, tenant_id)
        if not client:
            return False

        client.soft_delete()
        await self.session.flush()
        return True

    # ============================================================================
    # Summary Operations
    # ============================================================================

    async def get_client_summary(
        self,
        tenant_id: UUID,
        status: Optional[ClientStatus] = None,
        industry: Optional[Industry] = None,
    ) -> dict:
        """
        Get client summary statistics

        Returns:
            Dictionary with summary statistics including:
            - total_clients: Total number of clients
            - leads_count: Number of leads
            - prospects_count: Number of prospects
            - active_count: Number of active clients
            - inactive_count: Number of inactive clients
            - lost_count: Number of lost clients
        """
        # Base query
        base_filter = and_(
            Client.tenant_id == tenant_id,
            Client.is_deleted == False,
        )

        if status:
            base_filter = and_(base_filter, Client.status == status)

        if industry:
            base_filter = and_(base_filter, Client.industry == industry)

        # Total clients
        total_stmt = select(func.count()).select_from(Client).where(base_filter)
        total_result = await self.session.execute(total_stmt)
        total_clients = total_result.scalar_one()

        # Count by status
        leads_stmt = select(func.count()).select_from(Client).where(
            base_filter,
            Client.status == ClientStatus.LEAD,
        )
        leads_result = await self.session.execute(leads_stmt)
        leads_count = leads_result.scalar_one()

        prospects_stmt = select(func.count()).select_from(Client).where(
            base_filter,
            Client.status == ClientStatus.PROSPECT,
        )
        prospects_result = await self.session.execute(prospects_stmt)
        prospects_count = prospects_result.scalar_one()

        active_stmt = select(func.count()).select_from(Client).where(
            base_filter,
            Client.status == ClientStatus.ACTIVE,
        )
        active_result = await self.session.execute(active_stmt)
        active_count = active_result.scalar_one()

        inactive_stmt = select(func.count()).select_from(Client).where(
            base_filter,
            Client.status == ClientStatus.INACTIVE,
        )
        inactive_result = await self.session.execute(inactive_stmt)
        inactive_count = inactive_result.scalar_one()

        lost_stmt = select(func.count()).select_from(Client).where(
            base_filter,
            Client.status == ClientStatus.LOST,
        )
        lost_result = await self.session.execute(lost_stmt)
        lost_count = lost_result.scalar_one()

        return {
            "total_clients": total_clients,
            "leads_count": leads_count,
            "prospects_count": prospects_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "lost_count": lost_count,
        }

    async def get_clients_by_industry(
        self,
        tenant_id: UUID,
    ) -> list[dict]:
        """Get client count by industry"""
        stmt = (
            select(
                Client.industry,
                func.count(Client.id).label("count"),
            )
            .where(
                Client.tenant_id == tenant_id,
                Client.is_deleted == False,
                Client.industry.isnot(None),
            )
            .group_by(Client.industry)
            .order_by(func.count(Client.id).desc())
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            {"industry": row.industry, "count": row.count}
            for row in rows
        ]
