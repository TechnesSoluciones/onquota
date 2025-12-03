"""
SPA Repository
Handles database operations for SPA agreements
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

from models.spa import SPAAgreement, SPAUploadLog
from models.client import Client
from modules.spa.schemas import SPASearchParams


class SPARepository:
    """Repository for SPA database operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ============================================================================
    # Create Operations
    # ============================================================================

    async def create_agreement(
        self,
        tenant_id: UUID,
        client_id: UUID,
        batch_id: UUID,
        bpid: str,
        ship_to_name: str,
        article_number: str,
        list_price: Decimal,
        app_net_price: Decimal,
        discount_percent: Decimal,
        start_date: date,
        end_date: date,
        created_by: UUID,
        article_description: Optional[str] = None,
        uom: str = "EA",
    ) -> SPAAgreement:
        """Create a new SPA agreement"""
        agreement = SPAAgreement(
            tenant_id=tenant_id,
            client_id=client_id,
            batch_id=batch_id,
            bpid=bpid,
            ship_to_name=ship_to_name,
            article_number=article_number,
            article_description=article_description,
            list_price=list_price,
            app_net_price=app_net_price,
            discount_percent=discount_percent,
            uom=uom,
            start_date=start_date,
            end_date=end_date,
            is_active=self._is_date_active(start_date, end_date),
            created_by=created_by,
        )
        self.session.add(agreement)
        await self.session.flush()
        return agreement

    async def bulk_create_agreements(
        self, agreements: List[SPAAgreement]
    ) -> List[SPAAgreement]:
        """Bulk create SPA agreements"""
        self.session.add_all(agreements)
        await self.session.flush()
        return agreements

    async def create_upload_log(
        self,
        batch_id: UUID,
        filename: str,
        uploaded_by: UUID,
        tenant_id: UUID,
        total_rows: int = 0,
        success_count: int = 0,
        error_count: int = 0,
        duration_seconds: Optional[Decimal] = None,
        error_message: Optional[str] = None,
    ) -> SPAUploadLog:
        """Create upload log"""
        log = SPAUploadLog(
            batch_id=batch_id,
            filename=filename,
            uploaded_by=uploaded_by,
            tenant_id=tenant_id,
            total_rows=total_rows,
            success_count=success_count,
            error_count=error_count,
            duration_seconds=duration_seconds,
            error_message=error_message,
        )
        self.session.add(log)
        await self.session.flush()
        return log

    # ============================================================================
    # Read Operations
    # ============================================================================

    async def get_by_id(
        self, agreement_id: UUID, tenant_id: UUID
    ) -> Optional[SPAAgreement]:
        """Get SPA agreement by ID"""
        stmt = (
            select(SPAAgreement)
            .where(
                and_(
                    SPAAgreement.id == agreement_id,
                    SPAAgreement.tenant_id == tenant_id,
                    SPAAgreement.deleted_at.is_(None),
                )
            )
            .options(selectinload(SPAAgreement.client))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self, tenant_id: UUID, params: SPASearchParams
    ) -> Tuple[List[SPAAgreement], int]:
        """Search SPA agreements with filters and pagination"""
        # Base query
        stmt = select(SPAAgreement).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.deleted_at.is_(None),
            )
        )

        # Apply filters
        if params.client_id:
            stmt = stmt.where(SPAAgreement.client_id == params.client_id)

        if params.bpid:
            stmt = stmt.where(SPAAgreement.bpid == params.bpid)

        if params.article_number:
            stmt = stmt.where(SPAAgreement.article_number == params.article_number)

        if params.search:
            search_term = f"%{params.search}%"
            stmt = stmt.where(
                or_(
                    SPAAgreement.article_number.ilike(search_term),
                    SPAAgreement.article_description.ilike(search_term),
                )
            )

        if params.is_active is not None:
            stmt = stmt.where(SPAAgreement.is_active == params.is_active)

        if params.start_date_from:
            stmt = stmt.where(SPAAgreement.start_date >= params.start_date_from)

        if params.start_date_to:
            stmt = stmt.where(SPAAgreement.start_date <= params.start_date_to)

        if params.end_date_from:
            stmt = stmt.where(SPAAgreement.end_date >= params.end_date_from)

        if params.end_date_to:
            stmt = stmt.where(SPAAgreement.end_date <= params.end_date_to)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar()

        # Apply sorting
        sort_column = getattr(SPAAgreement, params.sort_by, SPAAgreement.created_at)
        if params.sort_order == "desc":
            stmt = stmt.order_by(desc(sort_column))
        else:
            stmt = stmt.order_by(asc(sort_column))

        # Apply pagination
        offset = (params.page - 1) * params.page_size
        stmt = stmt.offset(offset).limit(params.page_size)

        # Load relationships
        stmt = stmt.options(selectinload(SPAAgreement.client))

        # Execute
        result = await self.session.execute(stmt)
        items = result.scalars().all()

        return list(items), total

    async def find_discount(
        self,
        tenant_id: UUID,
        article_number: str,
        client_id: Optional[UUID] = None,
        bpid: Optional[str] = None,
        check_date: Optional[date] = None,
    ) -> Optional[SPAAgreement]:
        """
        Find best discount for product/client combination
        Returns SPA with highest discount that is currently valid
        """
        check_date = check_date or date.today()

        stmt = (
            select(SPAAgreement)
            .where(
                and_(
                    SPAAgreement.tenant_id == tenant_id,
                    SPAAgreement.article_number == article_number,
                    SPAAgreement.start_date <= check_date,
                    SPAAgreement.end_date >= check_date,
                    SPAAgreement.deleted_at.is_(None),
                )
            )
            .order_by(desc(SPAAgreement.discount_percent))
        )

        # Filter by client or BPID
        if client_id:
            stmt = stmt.where(SPAAgreement.client_id == client_id)
        elif bpid:
            stmt = stmt.where(SPAAgreement.bpid == bpid)

        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_client(
        self, client_id: UUID, tenant_id: UUID, active_only: bool = False
    ) -> List[SPAAgreement]:
        """Get all SPAs for a client"""
        stmt = select(SPAAgreement).where(
            and_(
                SPAAgreement.client_id == client_id,
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.deleted_at.is_(None),
            )
        )

        if active_only:
            stmt = stmt.where(SPAAgreement.is_active == True)

        stmt = stmt.order_by(desc(SPAAgreement.created_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_upload_log(
        self, batch_id: UUID, tenant_id: UUID
    ) -> Optional[SPAUploadLog]:
        """Get upload log by batch ID"""
        stmt = select(SPAUploadLog).where(
            and_(
                SPAUploadLog.batch_id == batch_id,
                SPAUploadLog.tenant_id == tenant_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_upload_history(
        self, tenant_id: UUID, limit: int, db: AsyncSession = None
    ) -> List[SPAUploadLog]:
        """Get upload history for tenant"""
        stmt = (
            select(SPAUploadLog)
            .where(SPAUploadLog.tenant_id == tenant_id)
            .order_by(desc(SPAUploadLog.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ============================================================================
    # Update Operations
    # ============================================================================

    async def update_active_status(self) -> int:
        """
        Update is_active flag based on current date
        Returns number of records updated
        """
        today = date.today()

        # Update to active
        active_stmt = (
            select(SPAAgreement)
            .where(
                and_(
                    SPAAgreement.start_date <= today,
                    SPAAgreement.end_date >= today,
                    SPAAgreement.is_active == False,
                    SPAAgreement.deleted_at.is_(None),
                )
            )
        )
        active_result = await self.session.execute(active_stmt)
        active_agreements = active_result.scalars().all()

        for agreement in active_agreements:
            agreement.is_active = True

        # Update to inactive
        inactive_stmt = (
            select(SPAAgreement)
            .where(
                and_(
                    or_(
                        SPAAgreement.end_date < today,
                        SPAAgreement.start_date > today,
                    ),
                    SPAAgreement.is_active == True,
                    SPAAgreement.deleted_at.is_(None),
                )
            )
        )
        inactive_result = await self.session.execute(inactive_stmt)
        inactive_agreements = inactive_result.scalars().all()

        for agreement in inactive_agreements:
            agreement.is_active = False

        await self.session.flush()
        return len(active_agreements) + len(inactive_agreements)

    # ============================================================================
    # Delete Operations
    # ============================================================================

    async def soft_delete(
        self, agreement_id: UUID, tenant_id: UUID
    ) -> Optional[SPAAgreement]:
        """Soft delete SPA agreement"""
        agreement = await self.get_by_id(agreement_id, tenant_id)
        if agreement:
            agreement.deleted_at = datetime.utcnow()
            await self.session.flush()
        return agreement

    async def bulk_soft_delete(
        self, agreement_ids: List[UUID], tenant_id: UUID
    ) -> int:
        """Bulk soft delete SPA agreements"""
        stmt = select(SPAAgreement).where(
            and_(
                SPAAgreement.id.in_(agreement_ids),
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        agreements = result.scalars().all()

        for agreement in agreements:
            agreement.deleted_at = datetime.utcnow()

        await self.session.flush()
        return len(agreements)

    # ============================================================================
    # Statistics
    # ============================================================================

    async def get_stats(self, tenant_id: UUID, db: AsyncSession = None) -> dict:
        """Alias for get_statistics for compatibility"""
        return await self.get_statistics(tenant_id)

    async def get_statistics(self, tenant_id: UUID) -> dict:
        """Get SPA statistics"""
        today = date.today()

        # Total agreements
        total_stmt = select(func.count(SPAAgreement.id)).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        total_result = await self.session.execute(total_stmt)
        total_agreements = total_result.scalar() or 0

        # Active agreements
        active_stmt = select(func.count(SPAAgreement.id)).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.start_date <= today,
                SPAAgreement.end_date >= today,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        active_result = await self.session.execute(active_stmt)
        active_agreements = active_result.scalar() or 0

        # Pending agreements
        pending_stmt = select(func.count(SPAAgreement.id)).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.start_date > today,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        pending_result = await self.session.execute(pending_stmt)
        pending_agreements = pending_result.scalar() or 0

        # Expired agreements
        expired_stmt = select(func.count(SPAAgreement.id)).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.end_date < today,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        expired_result = await self.session.execute(expired_stmt)
        expired_agreements = expired_result.scalar() or 0

        # Unique clients
        clients_stmt = select(func.count(func.distinct(SPAAgreement.client_id))).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        clients_result = await self.session.execute(clients_stmt)
        total_clients = clients_result.scalar() or 0

        # Unique products
        products_stmt = select(func.count(func.distinct(SPAAgreement.article_number))).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        products_result = await self.session.execute(products_stmt)
        total_products = products_result.scalar() or 0

        # Discount statistics
        discount_stmt = select(
            func.avg(SPAAgreement.discount_percent),
            func.max(SPAAgreement.discount_percent),
            func.min(SPAAgreement.discount_percent),
        ).where(
            and_(
                SPAAgreement.tenant_id == tenant_id,
                SPAAgreement.deleted_at.is_(None),
            )
        )
        discount_result = await self.session.execute(discount_stmt)
        avg_discount, max_discount, min_discount = discount_result.one()

        # Upload statistics
        uploads_stmt = select(func.count(SPAUploadLog.id)).where(
            SPAUploadLog.tenant_id == tenant_id
        )
        uploads_result = await self.session.execute(uploads_stmt)
        total_uploads = uploads_result.scalar() or 0

        last_upload_stmt = select(func.max(SPAUploadLog.created_at)).where(
            SPAUploadLog.tenant_id == tenant_id
        )
        last_upload_result = await self.session.execute(last_upload_stmt)
        last_upload_date = last_upload_result.scalar()

        return {
            "total_agreements": total_agreements,
            "active_agreements": active_agreements,
            "pending_agreements": pending_agreements,
            "expired_agreements": expired_agreements,
            "total_clients": total_clients,
            "total_products": total_products,
            "avg_discount": avg_discount or Decimal("0"),
            "max_discount": max_discount or Decimal("0"),
            "min_discount": min_discount or Decimal("0"),
            "total_uploads": total_uploads,
            "last_upload_date": last_upload_date,
        }

    # ============================================================================
    # Helper Methods
    # ============================================================================

    def _is_date_active(self, start_date: date, end_date: date) -> bool:
        """Check if dates are currently active"""
        today = date.today()
        return start_date <= today <= end_date

    async def find_client_by_bpid(
        self, bpid: str, tenant_id: UUID
    ) -> Optional[Client]:
        """Find client by BPID"""
        stmt = select(Client).where(
            and_(
                Client.bpid == bpid,
                Client.tenant_id == tenant_id,
                Client.is_deleted == False,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
