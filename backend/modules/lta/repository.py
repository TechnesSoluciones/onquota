"""
LTA Repository
Handles database operations for LTA agreements
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.lta import LTAAgreement
from models.client import Client
from modules.lta.schemas import LTAAgreementCreate, LTAAgreementUpdate


class LTARepository:
    """Repository for LTA Agreement operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        lta_data: LTAAgreementCreate,
        tenant_id: UUID,
        created_by: UUID
    ) -> LTAAgreement:
        """Create a new LTA agreement"""
        # Check if client already has an LTA
        existing = await self.get_by_client(lta_data.client_id, tenant_id)
        if existing:
            raise ValueError("Client already has an LTA agreement")

        # Check if agreement number is unique
        stmt = select(LTAAgreement).where(
            and_(
                LTAAgreement.tenant_id == tenant_id,
                LTAAgreement.agreement_number == lta_data.agreement_number,
                LTAAgreement.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ValueError("Agreement number already exists")

        lta = LTAAgreement(
            tenant_id=tenant_id,
            created_by=created_by,
            **lta_data.model_dump()
        )
        self.db.add(lta)
        await self.db.commit()
        await self.db.refresh(lta)
        return lta

    async def get_by_id(
        self,
        lta_id: UUID,
        tenant_id: UUID
    ) -> Optional[LTAAgreement]:
        """Get LTA by ID"""
        stmt = select(LTAAgreement).where(
            and_(
                LTAAgreement.id == lta_id,
                LTAAgreement.tenant_id == tenant_id,
                LTAAgreement.deleted_at.is_(None)
            )
        ).options(selectinload(LTAAgreement.client))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_client(
        self,
        client_id: UUID,
        tenant_id: UUID
    ) -> Optional[LTAAgreement]:
        """Get LTA by client ID"""
        stmt = select(LTAAgreement).where(
            and_(
                LTAAgreement.client_id == client_id,
                LTAAgreement.tenant_id == tenant_id,
                LTAAgreement.deleted_at.is_(None)
            )
        ).options(selectinload(LTAAgreement.client))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_agreement_number(
        self,
        agreement_number: str,
        tenant_id: UUID
    ) -> Optional[LTAAgreement]:
        """Get LTA by agreement number"""
        stmt = select(LTAAgreement).where(
            and_(
                LTAAgreement.agreement_number == agreement_number,
                LTAAgreement.tenant_id == tenant_id,
                LTAAgreement.deleted_at.is_(None)
            )
        ).options(selectinload(LTAAgreement.client))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        tenant_id: UUID,
        active_only: bool = False,
        page: int = 1,
        limit: int = 20
    ) -> tuple[List[LTAAgreement], int]:
        """List LTA agreements with pagination"""
        # Build base query
        conditions = [
            LTAAgreement.tenant_id == tenant_id,
            LTAAgreement.deleted_at.is_(None)
        ]

        if active_only:
            conditions.append(LTAAgreement.is_active == True)

        # Count total
        count_stmt = select(func.count(LTAAgreement.id)).where(and_(*conditions))
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar()

        # Get items
        stmt = (
            select(LTAAgreement)
            .where(and_(*conditions))
            .options(selectinload(LTAAgreement.client))
            .order_by(LTAAgreement.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def update(
        self,
        lta_id: UUID,
        lta_data: LTAAgreementUpdate,
        tenant_id: UUID,
        updated_by: UUID
    ) -> Optional[LTAAgreement]:
        """Update LTA agreement"""
        lta = await self.get_by_id(lta_id, tenant_id)
        if not lta:
            return None

        # Check if agreement number is being changed and is unique
        if lta_data.agreement_number and lta_data.agreement_number != lta.agreement_number:
            stmt = select(LTAAgreement).where(
                and_(
                    LTAAgreement.tenant_id == tenant_id,
                    LTAAgreement.agreement_number == lta_data.agreement_number,
                    LTAAgreement.id != lta_id,
                    LTAAgreement.deleted_at.is_(None)
                )
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ValueError("Agreement number already exists")

        # Update fields
        update_data = lta_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lta, field, value)

        lta.updated_by = updated_by
        from datetime import datetime
        lta.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(lta)
        return lta

    async def delete(
        self,
        lta_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """Soft delete LTA agreement"""
        lta = await self.get_by_id(lta_id, tenant_id)
        if not lta:
            return False

        from datetime import datetime
        lta.deleted_at = datetime.utcnow()
        await self.db.commit()
        return True
