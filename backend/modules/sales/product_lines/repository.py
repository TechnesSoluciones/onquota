"""
Product Lines Repository
Database operations for product lines catalog
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime

from models.sales_control import SalesProductLine
from modules.sales.quotas.schemas import (
    SalesProductLineCreate,
    SalesProductLineUpdate,
)


class ProductLineRepository:
    """Repository for Product Line operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_product_line(
        self,
        data: SalesProductLineCreate,
        tenant_id: UUID,
    ) -> SalesProductLine:
        """
        Create a new product line

        Args:
            data: Product line creation data
            tenant_id: Tenant ID

        Returns:
            Created product line
        """
        product_line = SalesProductLine(
            tenant_id=tenant_id,
            name=data.name,
            code=data.code,
            description=data.description,
            color=data.color,
            display_order=data.display_order,
        )

        self.db.add(product_line)
        await self.db.flush()
        await self.db.refresh(product_line)
        return product_line

    async def get_product_line(
        self,
        product_line_id: UUID,
        tenant_id: UUID,
    ) -> Optional[SalesProductLine]:
        """
        Get a product line by ID

        Args:
            product_line_id: Product line ID
            tenant_id: Tenant ID

        Returns:
            Product line if found, None otherwise
        """
        stmt = select(SalesProductLine).where(
            and_(
                SalesProductLine.id == product_line_id,
                SalesProductLine.tenant_id == tenant_id,
                SalesProductLine.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_product_lines(
        self,
        tenant_id: UUID,
        is_active: Optional[bool] = None,
        page: int = 1,
        page_size: int = 100,
    ) -> Tuple[List[SalesProductLine], int]:
        """
        Get paginated product lines with filters

        Args:
            tenant_id: Tenant ID
            is_active: Filter by active status (None = all)
            page: Page number
            page_size: Items per page

        Returns:
            Tuple of (product lines list, total count)
        """
        conditions = [
            SalesProductLine.tenant_id == tenant_id,
            SalesProductLine.is_deleted == False,
        ]

        if is_active is not None:
            conditions.append(SalesProductLine.is_active == is_active)

        # Count total
        count_stmt = select(func.count(SalesProductLine.id)).where(and_(*conditions))
        total = await self.db.scalar(count_stmt)

        # Get paginated results
        offset = (page - 1) * page_size
        stmt = (
            select(SalesProductLine)
            .where(and_(*conditions))
            .order_by(SalesProductLine.display_order.asc(), SalesProductLine.name.asc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        product_lines = result.scalars().all()

        return list(product_lines), total or 0

    async def get_active_product_lines(
        self,
        tenant_id: UUID,
    ) -> List[SalesProductLine]:
        """
        Get all active product lines (for dropdowns)

        Args:
            tenant_id: Tenant ID

        Returns:
            List of active product lines ordered by display_order
        """
        stmt = (
            select(SalesProductLine)
            .where(
                and_(
                    SalesProductLine.tenant_id == tenant_id,
                    SalesProductLine.is_active == True,
                    SalesProductLine.is_deleted == False,
                )
            )
            .order_by(SalesProductLine.display_order.asc(), SalesProductLine.name.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_product_line(
        self,
        product_line_id: UUID,
        tenant_id: UUID,
        data: SalesProductLineUpdate,
    ) -> Optional[SalesProductLine]:
        """
        Update a product line

        Args:
            product_line_id: Product line ID
            tenant_id: Tenant ID
            data: Update data

        Returns:
            Updated product line if found, None otherwise
        """
        product_line = await self.get_product_line(product_line_id, tenant_id)
        if not product_line:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(product_line, field, value)

        product_line.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(product_line)
        return product_line

    async def delete_product_line(
        self,
        product_line_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Soft delete a product line (deactivate)

        Args:
            product_line_id: Product line ID
            tenant_id: Tenant ID

        Returns:
            True if deleted, False if not found
        """
        product_line = await self.get_product_line(product_line_id, tenant_id)
        if not product_line:
            return False

        # Soft delete by deactivating
        product_line.is_active = False
        product_line.is_deleted = True
        product_line.deleted_at = datetime.utcnow()
        product_line.updated_at = datetime.utcnow()
        await self.db.flush()
        return True

    async def product_line_exists(
        self,
        name: str,
        tenant_id: UUID,
        exclude_id: Optional[UUID] = None,
    ) -> bool:
        """
        Check if product line with name already exists

        Args:
            name: Product line name
            tenant_id: Tenant ID
            exclude_id: Exclude this ID from check (for updates)

        Returns:
            True if exists, False otherwise
        """
        conditions = [
            SalesProductLine.tenant_id == tenant_id,
            SalesProductLine.name == name,
            SalesProductLine.is_deleted == False,
        ]

        if exclude_id:
            conditions.append(SalesProductLine.id != exclude_id)

        stmt = select(func.count(SalesProductLine.id)).where(and_(*conditions))
        count = await self.db.scalar(stmt)
        return (count or 0) > 0
