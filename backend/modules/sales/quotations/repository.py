"""
Quotation Repository
Database operations for quotations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

from models.quotation import Quotation, QuoteStatus
from models.client import Client
from models.user import User
from modules.sales.quotations.schemas import (
    QuotationCreate,
    QuotationUpdate,
    QuotationMarkWon,
    QuotationMarkLost,
    QuotationStats,
    QuotationMonthlyStats,
    QuotationsByClientStats,
)


class QuotationRepository:
    """Repository for Quotation operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_quotation(
        self,
        data: QuotationCreate,
        tenant_id: UUID,
        current_user_id: UUID,
    ) -> Quotation:
        """
        Create a new quotation

        Args:
            data: Quotation creation data
            tenant_id: Tenant ID
            current_user_id: ID of user creating the quotation

        Returns:
            Created quotation
        """
        # Determine assigned_to (use provided or default to current user)
        assigned_to = data.assigned_to if data.assigned_to else current_user_id

        # Get client name for denormalization
        client_stmt = select(Client.name).where(
            and_(Client.id == data.client_id, Client.tenant_id == tenant_id)
        )
        client_name = await self.db.scalar(client_stmt)

        # Get sales rep name for denormalization
        user_stmt = select(User.full_name).where(User.id == assigned_to)
        sales_rep_name = await self.db.scalar(user_stmt)

        quotation = Quotation(
            tenant_id=tenant_id,
            quote_number=data.quote_number,
            quote_date=data.quote_date,
            client_id=data.client_id,
            opportunity_id=data.opportunity_id,
            assigned_to=assigned_to,
            client_name=client_name,
            sales_rep_name=sales_rep_name,
            quoted_amount=data.quoted_amount,
            currency=data.currency,
            status=data.status,
            notes=data.notes,
            products_description=data.products_description,
        )

        self.db.add(quotation)
        await self.db.flush()
        await self.db.refresh(quotation)
        return quotation

    async def get_quotation(
        self,
        quotation_id: UUID,
        tenant_id: UUID,
    ) -> Optional[Quotation]:
        """Get a quotation by ID"""
        stmt = select(Quotation).where(
            and_(
                Quotation.id == quotation_id,
                Quotation.tenant_id == tenant_id,
                Quotation.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_quotations(
        self,
        tenant_id: UUID,
        client_id: Optional[UUID] = None,
        opportunity_id: Optional[UUID] = None,
        assigned_to: Optional[UUID] = None,
        status: Optional[QuoteStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Quotation], int]:
        """Get paginated quotations with filters"""
        conditions = [
            Quotation.tenant_id == tenant_id,
            Quotation.is_deleted == False,
        ]

        if client_id:
            conditions.append(Quotation.client_id == client_id)
        if opportunity_id:
            conditions.append(Quotation.opportunity_id == opportunity_id)
        if assigned_to:
            conditions.append(Quotation.assigned_to == assigned_to)
        if status:
            conditions.append(Quotation.status == status)
        if start_date:
            conditions.append(Quotation.quote_date >= start_date)
        if end_date:
            conditions.append(Quotation.quote_date <= end_date)

        # Count total
        count_stmt = select(func.count(Quotation.id)).where(and_(*conditions))
        total = await self.db.scalar(count_stmt)

        # Get paginated results
        offset = (page - 1) * page_size
        stmt = (
            select(Quotation)
            .where(and_(*conditions))
            .order_by(Quotation.quote_date.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        quotations = result.scalars().all()

        return list(quotations), total or 0

    async def update_quotation(
        self,
        quotation_id: UUID,
        tenant_id: UUID,
        data: QuotationUpdate,
    ) -> Optional[Quotation]:
        """Update a quotation"""
        quotation = await self.get_quotation(quotation_id, tenant_id)
        if not quotation:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Update denormalized client_name if client_id changed
        if 'client_id' in update_data and update_data['client_id']:
            client_stmt = select(Client.name).where(
                and_(
                    Client.id == update_data['client_id'],
                    Client.tenant_id == tenant_id,
                )
            )
            client_name = await self.db.scalar(client_stmt)
            update_data['client_name'] = client_name

        # Update denormalized sales_rep_name if assigned_to changed
        if 'assigned_to' in update_data and update_data['assigned_to']:
            user_stmt = select(User.full_name).where(
                User.id == update_data['assigned_to']
            )
            sales_rep_name = await self.db.scalar(user_stmt)
            update_data['sales_rep_name'] = sales_rep_name

        for field, value in update_data.items():
            setattr(quotation, field, value)

        quotation.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(quotation)
        return quotation

    async def mark_as_won(
        self,
        quotation_id: UUID,
        tenant_id: UUID,
        data: QuotationMarkWon,
    ) -> Optional[Quotation]:
        """Mark quotation as won (fully or partially)"""
        quotation = await self.get_quotation(quotation_id, tenant_id)
        if not quotation:
            return None

        won_date = data.won_date if data.won_date else date.today()

        if data.partially:
            quotation.mark_as_partially_won(won_date)
        else:
            quotation.mark_as_won(won_date)

        quotation.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(quotation)
        return quotation

    async def mark_as_lost(
        self,
        quotation_id: UUID,
        tenant_id: UUID,
        data: QuotationMarkLost,
    ) -> Optional[Quotation]:
        """Mark quotation as lost"""
        quotation = await self.get_quotation(quotation_id, tenant_id)
        if not quotation:
            return None

        lost_date = data.lost_date if data.lost_date else date.today()
        quotation.mark_as_lost(lost_date, data.lost_reason)

        quotation.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(quotation)
        return quotation

    async def delete_quotation(
        self,
        quotation_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Soft delete a quotation"""
        quotation = await self.get_quotation(quotation_id, tenant_id)
        if not quotation:
            return False

        quotation.is_deleted = True
        quotation.deleted_at = datetime.utcnow()
        quotation.updated_at = datetime.utcnow()
        await self.db.flush()
        return True

    async def get_stats(
        self,
        tenant_id: UUID,
        client_id: Optional[UUID] = None,
        assigned_to: Optional[UUID] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> QuotationStats:
        """Get quotation statistics"""
        conditions = [
            Quotation.tenant_id == tenant_id,
            Quotation.is_deleted == False,
        ]

        if client_id:
            conditions.append(Quotation.client_id == client_id)
        if assigned_to:
            conditions.append(Quotation.assigned_to == assigned_to)
        if year:
            conditions.append(extract('year', Quotation.quote_date) == year)
        if month:
            conditions.append(extract('month', Quotation.quote_date) == month)

        stmt = select(Quotation).where(and_(*conditions))
        result = await self.db.execute(stmt)
        quotations = list(result.scalars().all())

        # Calculate statistics
        total = len(quotations)
        total_amount = sum(q.quoted_amount for q in quotations)

        cotizado = [q for q in quotations if q.status == QuoteStatus.COTIZADO]
        ganado = [q for q in quotations if q.status == QuoteStatus.GANADO]
        perdido = [q for q in quotations if q.status == QuoteStatus.PERDIDO]
        ganado_parcial = [q for q in quotations if q.status == QuoteStatus.GANADO_PARCIALMENTE]

        won_quotations = ganado + ganado_parcial
        closed_quotations = won_quotations + perdido

        win_rate = (
            Decimal(len(won_quotations)) / Decimal(len(closed_quotations)) * Decimal('100')
            if closed_quotations
            else Decimal('0')
        )

        avg_quote = total_amount / Decimal(total) if total > 0 else Decimal('0')
        avg_won = (
            sum(q.quoted_amount for q in won_quotations) / Decimal(len(won_quotations))
            if won_quotations
            else Decimal('0')
        )

        return QuotationStats(
            total_quotations=total,
            total_quoted_amount=total_amount,
            cotizado_count=len(cotizado),
            cotizado_amount=sum(q.quoted_amount for q in cotizado),
            ganado_count=len(ganado),
            ganado_amount=sum(q.quoted_amount for q in ganado),
            perdido_count=len(perdido),
            perdido_amount=sum(q.quoted_amount for q in perdido),
            ganado_parcialmente_count=len(ganado_parcial),
            ganado_parcialmente_amount=sum(q.quoted_amount for q in ganado_parcial),
            win_rate=win_rate,
            average_quote_amount=avg_quote,
            average_won_amount=avg_won,
        )

    async def get_monthly_stats(
        self,
        tenant_id: UUID,
        year: int,
        assigned_to: Optional[UUID] = None,
    ) -> List[QuotationMonthlyStats]:
        """Get monthly quotation statistics for a year"""
        stats = []

        for month in range(1, 13):
            month_stats = await self.get_stats(
                tenant_id=tenant_id,
                assigned_to=assigned_to,
                year=year,
                month=month,
            )

            stats.append(
                QuotationMonthlyStats(
                    year=year,
                    month=month,
                    period_str=f"{year}-{month:02d}",
                    total_quotations=month_stats.total_quotations,
                    total_quoted_amount=month_stats.total_quoted_amount,
                    won_count=month_stats.ganado_count + month_stats.ganado_parcialmente_count,
                    won_amount=month_stats.ganado_amount + month_stats.ganado_parcialmente_amount,
                    lost_count=month_stats.perdido_count,
                    lost_amount=month_stats.perdido_amount,
                    win_rate=month_stats.win_rate,
                )
            )

        return stats

    async def get_stats_by_client(
        self,
        tenant_id: UUID,
        assigned_to: Optional[UUID] = None,
        year: Optional[int] = None,
    ) -> List[QuotationsByClientStats]:
        """Get quotation statistics grouped by client"""
        conditions = [
            Quotation.tenant_id == tenant_id,
            Quotation.is_deleted == False,
        ]

        if assigned_to:
            conditions.append(Quotation.assigned_to == assigned_to)
        if year:
            conditions.append(extract('year', Quotation.quote_date) == year)

        stmt = select(Quotation).where(and_(*conditions))
        result = await self.db.execute(stmt)
        quotations = list(result.scalars().all())

        # Group by client
        client_stats = {}
        for q in quotations:
            if q.client_id not in client_stats:
                client_stats[q.client_id] = {
                    'client_id': q.client_id,
                    'client_name': q.client_name or 'Unknown',
                    'total_quotations': 0,
                    'total_quoted_amount': Decimal('0'),
                    'won_count': 0,
                    'won_amount': Decimal('0'),
                    'lost_count': 0,
                    'pending_count': 0,
                }

            stats = client_stats[q.client_id]
            stats['total_quotations'] += 1
            stats['total_quoted_amount'] += q.quoted_amount

            if q.status in [QuoteStatus.GANADO, QuoteStatus.GANADO_PARCIALMENTE]:
                stats['won_count'] += 1
                stats['won_amount'] += q.quoted_amount
            elif q.status == QuoteStatus.PERDIDO:
                stats['lost_count'] += 1
            else:
                stats['pending_count'] += 1

        return [QuotationsByClientStats(**stats) for stats in client_stats.values()]

    async def quotation_number_exists(
        self,
        quote_number: str,
        tenant_id: UUID,
        exclude_id: Optional[UUID] = None,
    ) -> bool:
        """
        Check if quotation number already exists

        Args:
            quote_number: Quote number to check
            tenant_id: Tenant ID
            exclude_id: Exclude this ID from check (for updates)

        Returns:
            True if exists, False otherwise
        """
        conditions = [
            Quotation.tenant_id == tenant_id,
            Quotation.quote_number == quote_number,
            Quotation.is_deleted == False,
        ]

        if exclude_id:
            conditions.append(Quotation.id != exclude_id)

        stmt = select(func.count(Quotation.id)).where(and_(*conditions))
        count = await self.db.scalar(stmt)
        return (count or 0) > 0
