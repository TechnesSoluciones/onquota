"""
Quota Repository
Database operations for quotas and quota lines
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract, case, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from models.quota import Quota, QuotaLine
from models.sales_control import SalesProductLine
from models.user import User
from modules.sales.quotas.schemas import (
    QuotaCreate,
    QuotaUpdate,
    QuotaLineCreate,
    QuotaLineUpdate,
    QuotaDashboardStats,
    QuotaMonthlyTrend,
    QuotaStats,
    QuotaComparisonStats,
)


class QuotaRepository:
    """Repository for Quota operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # CRUD Operations
    # ============================================

    async def create_quota(
        self,
        data: QuotaCreate,
        tenant_id: UUID,
        current_user_id: UUID,
    ) -> Quota:
        """
        Create a new quota with lines

        Args:
            data: Quota creation data with lines
            tenant_id: Tenant ID
            current_user_id: ID of user creating the quota

        Returns:
            Created quota with lines
        """
        # Get user name for denormalization
        user_stmt = select(User.full_name).where(User.id == data.user_id)
        user_name = await self.db.scalar(user_stmt)

        # Create quota
        quota = Quota(
            tenant_id=tenant_id,
            year=data.year,
            month=data.month,
            user_id=data.user_id,
            user_name=user_name,
            notes=data.notes,
            total_quota=Decimal('0'),
            total_achieved=Decimal('0'),
            achievement_percentage=Decimal('0'),
        )

        self.db.add(quota)
        await self.db.flush()

        # Create quota lines
        for line_data in data.lines:
            # Get product line name for denormalization
            pl_stmt = select(SalesProductLine.name).where(
                and_(
                    SalesProductLine.id == line_data.product_line_id,
                    SalesProductLine.tenant_id == tenant_id,
                )
            )
            product_line_name = await self.db.scalar(pl_stmt)

            line = QuotaLine(
                tenant_id=tenant_id,
                quota_id=quota.id,
                product_line_id=line_data.product_line_id,
                product_line_name=product_line_name,
                quota_amount=line_data.quota_amount,
                achieved_amount=Decimal('0'),
                achievement_percentage=Decimal('0'),
            )
            self.db.add(line)

        await self.db.flush()

        # Recalculate totals
        await self.db.refresh(quota, ["lines"])
        quota.recalculate_totals()
        await self.db.flush()

        await self.db.refresh(quota, ["lines"])
        return quota

    async def get_quota(
        self,
        quota_id: UUID,
        tenant_id: UUID,
        load_lines: bool = False,
    ) -> Optional[Quota]:
        """
        Get a quota by ID

        Args:
            quota_id: Quota ID
            tenant_id: Tenant ID
            load_lines: Whether to load lines relationship

        Returns:
            Quota if found, None otherwise
        """
        stmt = select(Quota).where(
            and_(
                Quota.id == quota_id,
                Quota.tenant_id == tenant_id,
                Quota.is_deleted == False,
            )
        )

        if load_lines:
            stmt = stmt.options(selectinload(Quota.lines))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_quotas(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        min_achievement_percentage: Optional[Decimal] = None,
        max_achievement_percentage: Optional[Decimal] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Quota], int]:
        """
        Get paginated quotas with filters

        Args:
            tenant_id: Tenant ID
            user_id: Filter by user (sales rep)
            year: Filter by specific year
            month: Filter by specific month
            year_from: Filter year from
            year_to: Filter year to
            min_achievement_percentage: Minimum achievement %
            max_achievement_percentage: Maximum achievement %
            page: Page number
            page_size: Items per page

        Returns:
            Tuple of (quotas list, total count)
        """
        conditions = [
            Quota.tenant_id == tenant_id,
            Quota.is_deleted == False,
        ]

        if user_id:
            conditions.append(Quota.user_id == user_id)
        if year:
            conditions.append(Quota.year == year)
        if month:
            conditions.append(Quota.month == month)
        if year_from:
            conditions.append(Quota.year >= year_from)
        if year_to:
            conditions.append(Quota.year <= year_to)
        if min_achievement_percentage is not None:
            conditions.append(Quota.achievement_percentage >= min_achievement_percentage)
        if max_achievement_percentage is not None:
            conditions.append(Quota.achievement_percentage <= max_achievement_percentage)

        # Count total
        count_stmt = select(func.count(Quota.id)).where(and_(*conditions))
        total = await self.db.scalar(count_stmt)

        # Get paginated results
        offset = (page - 1) * page_size
        stmt = (
            select(Quota)
            .where(and_(*conditions))
            .order_by(Quota.year.desc(), Quota.month.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        quotas = result.scalars().all()

        return list(quotas), total or 0

    async def update_quota(
        self,
        quota_id: UUID,
        tenant_id: UUID,
        data: QuotaUpdate,
    ) -> Optional[Quota]:
        """
        Update a quota (metadata only, lines updated separately)

        Args:
            quota_id: Quota ID
            tenant_id: Tenant ID
            data: Update data

        Returns:
            Updated quota if found, None otherwise
        """
        quota = await self.get_quota(quota_id, tenant_id)
        if not quota:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(quota, field, value)

        quota.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(quota)
        return quota

    async def delete_quota(
        self,
        quota_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Soft delete a quota"""
        quota = await self.get_quota(quota_id, tenant_id)
        if not quota:
            return False

        quota.is_deleted = True
        quota.deleted_at = datetime.utcnow()
        quota.updated_at = datetime.utcnow()
        await self.db.flush()
        return True

    # ============================================
    # Line Management
    # ============================================

    async def add_line(
        self,
        quota_id: UUID,
        tenant_id: UUID,
        data: QuotaLineCreate,
    ) -> Optional[QuotaLine]:
        """
        Add a line to a quota

        Args:
            quota_id: Quota ID
            tenant_id: Tenant ID
            data: Line creation data

        Returns:
            Created line if quota found, None otherwise
        """
        quota = await self.get_quota(quota_id, tenant_id)
        if not quota:
            return None

        # Get product line name for denormalization
        pl_stmt = select(SalesProductLine.name).where(
            and_(
                SalesProductLine.id == data.product_line_id,
                SalesProductLine.tenant_id == tenant_id,
            )
        )
        product_line_name = await self.db.scalar(pl_stmt)

        line = QuotaLine(
            tenant_id=tenant_id,
            quota_id=quota_id,
            product_line_id=data.product_line_id,
            product_line_name=product_line_name,
            quota_amount=data.quota_amount,
            achieved_amount=Decimal('0'),
            achievement_percentage=Decimal('0'),
        )
        self.db.add(line)
        await self.db.flush()
        await self.db.refresh(line)

        # Recalculate quota totals
        await self.recalculate_quota_totals(quota_id)

        return line

    async def update_line(
        self,
        quota_id: UUID,
        line_id: UUID,
        tenant_id: UUID,
        data: QuotaLineUpdate,
    ) -> Optional[QuotaLine]:
        """
        Update a quota line

        Args:
            quota_id: Quota ID
            line_id: Line ID
            tenant_id: Tenant ID
            data: Update data

        Returns:
            Updated line if found, None otherwise
        """
        stmt = select(QuotaLine).where(
            and_(
                QuotaLine.id == line_id,
                QuotaLine.quota_id == quota_id,
                QuotaLine.tenant_id == tenant_id,
            )
        )
        result = await self.db.execute(stmt)
        line = result.scalar_one_or_none()

        if not line:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(line, field, value)

        # Recalculate line achievement percentage
        line.recalculate_achievement_percentage()

        line.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(line)

        # Recalculate quota totals
        await self.recalculate_quota_totals(quota_id)

        return line

    async def remove_line(
        self,
        quota_id: UUID,
        line_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Remove a line from a quota

        Args:
            quota_id: Quota ID
            line_id: Line ID
            tenant_id: Tenant ID

        Returns:
            True if deleted, False if not found
        """
        stmt = select(QuotaLine).where(
            and_(
                QuotaLine.id == line_id,
                QuotaLine.quota_id == quota_id,
                QuotaLine.tenant_id == tenant_id,
            )
        )
        result = await self.db.execute(stmt)
        line = result.scalar_one_or_none()

        if not line:
            return False

        await self.db.delete(line)
        await self.db.flush()

        # Recalculate quota totals
        await self.recalculate_quota_totals(quota_id)

        return True

    async def recalculate_quota_totals(self, quota_id: UUID) -> None:
        """
        Recalculate quota totals from lines

        Args:
            quota_id: Quota ID
        """
        stmt = select(Quota).where(Quota.id == quota_id).options(selectinload(Quota.lines))
        result = await self.db.execute(stmt)
        quota = result.scalar_one_or_none()

        if quota:
            quota.recalculate_totals()
            await self.db.flush()

    # ============================================
    # Analytics Methods
    # ============================================

    async def get_dashboard_stats(
        self,
        user_id: UUID,
        year: int,
        month: int,
        tenant_id: UUID,
    ) -> Optional[QuotaDashboardStats]:
        """
        Get dashboard statistics for a user and period

        Args:
            user_id: User ID
            year: Year
            month: Month
            tenant_id: Tenant ID

        Returns:
            Dashboard stats if quota exists, None otherwise
        """
        # Get quota with lines
        stmt = select(Quota).where(
            and_(
                Quota.tenant_id == tenant_id,
                Quota.user_id == user_id,
                Quota.year == year,
                Quota.month == month,
                Quota.is_deleted == False,
            )
        ).options(selectinload(Quota.lines))

        result = await self.db.execute(stmt)
        quota: Optional[Quota] = result.scalar_one_or_none()

        if not quota:
            return None

        # Calculate YTD (year-to-date) statistics
        ytd_stmt = select(
            func.coalesce(func.sum(Quota.total_quota), 0).label('ytd_quota'),
            func.coalesce(func.sum(Quota.total_achieved), 0).label('ytd_achieved'),
        ).where(
            and_(
                Quota.tenant_id == tenant_id,
                Quota.user_id == user_id,
                Quota.year == year,
                Quota.month <= month,
                Quota.is_deleted == False,
            )
        )
        ytd_result = await self.db.execute(ytd_stmt)
        ytd_row = ytd_result.one()

        ytd_quota = Decimal(str(ytd_row.ytd_quota or 0))
        ytd_achieved = Decimal(str(ytd_row.ytd_achieved or 0))
        ytd_percentage = (ytd_achieved / ytd_quota * Decimal('100')) if ytd_quota > 0 else Decimal('0')

        # Build response
        from modules.sales.quotas.schemas import QuotaLineResponse

        lines = []
        for line in quota.lines:
            line_resp = QuotaLineResponse.model_validate(line)
            line_resp.is_achieved = line.is_achieved
            line_resp.remaining_quota = line.remaining_quota
            line_resp.gap_percentage = line.gap_percentage
            lines.append(line_resp)

        return QuotaDashboardStats(
            period=quota.period_str,
            year=quota.year,
            month=quota.month,
            user_id=quota.user_id,
            user_name=quota.user_name,
            total_quota=quota.total_quota,
            total_achieved=quota.total_achieved,
            achievement_percentage=quota.achievement_percentage,
            remaining_quota=quota.remaining_quota,
            gap_percentage=quota.gap_percentage,
            lines=lines,
            ytd_quota=ytd_quota,
            ytd_achieved=ytd_achieved,
            ytd_percentage=ytd_percentage.quantize(Decimal('0.01')),
        )

    async def get_annual_stats(
        self,
        user_id: UUID,
        year: int,
        tenant_id: UUID,
    ) -> QuotaStats:
        """
        Get annual statistics for a user

        Args:
            user_id: User ID
            year: Year
            tenant_id: Tenant ID

        Returns:
            Annual quota statistics
        """
        # Get user name
        user_stmt = select(User.full_name).where(User.id == user_id)
        user_name = await self.db.scalar(user_stmt)

        # Get current month
        from datetime import date
        current_date = date.today()
        current_month = current_date.month if current_date.year == year else 12

        # Get current month quota
        current_month_stmt = select(Quota).where(
            and_(
                Quota.tenant_id == tenant_id,
                Quota.user_id == user_id,
                Quota.year == year,
                Quota.month == current_month,
                Quota.is_deleted == False,
            )
        )
        current_result = await self.db.execute(current_month_stmt)
        current_quota = current_result.scalar_one_or_none()

        current_month_quota = current_quota.total_quota if current_quota else Decimal('0')
        current_month_achieved = current_quota.total_achieved if current_quota else Decimal('0')
        current_month_percentage = current_quota.achievement_percentage if current_quota else Decimal('0')

        # Get annual stats
        annual_stmt = select(
            func.coalesce(func.sum(Quota.total_quota), 0).label('annual_quota'),
            func.coalesce(func.sum(Quota.total_achieved), 0).label('annual_achieved'),
            func.count(Quota.id).label('total_months'),
            func.sum(case((Quota.achievement_percentage >= 100, 1), else_=0)).label('months_achieved'),
        ).where(
            and_(
                Quota.tenant_id == tenant_id,
                Quota.user_id == user_id,
                Quota.year == year,
                Quota.is_deleted == False,
            )
        )
        annual_result = await self.db.execute(annual_stmt)
        annual_row = annual_result.one()

        annual_quota = Decimal(str(annual_row.annual_quota or 0))
        annual_achieved = Decimal(str(annual_row.annual_achieved or 0))
        total_months = annual_row.total_months or 0
        months_achieved = annual_row.months_achieved or 0

        annual_percentage = (annual_achieved / annual_quota * Decimal('100')) if annual_quota > 0 else Decimal('0')
        achievement_rate = (Decimal(str(months_achieved)) / Decimal(str(total_months)) * Decimal('100')) if total_months > 0 else Decimal('0')

        return QuotaStats(
            user_id=user_id,
            user_name=user_name,
            current_month_quota=current_month_quota,
            current_month_achieved=current_month_achieved,
            current_month_percentage=current_month_percentage.quantize(Decimal('0.01')),
            annual_quota=annual_quota,
            annual_achieved=annual_achieved,
            annual_percentage=annual_percentage.quantize(Decimal('0.01')),
            months_achieved=months_achieved,
            total_months=total_months,
            achievement_rate=achievement_rate.quantize(Decimal('0.01')),
        )

    async def get_monthly_trends(
        self,
        user_id: UUID,
        year: int,
        tenant_id: UUID,
    ) -> List[QuotaMonthlyTrend]:
        """
        Get monthly trends for a user and year

        Args:
            user_id: User ID
            year: Year
            tenant_id: Tenant ID

        Returns:
            List of monthly trends (one per month)
        """
        stmt = select(Quota).where(
            and_(
                Quota.tenant_id == tenant_id,
                Quota.user_id == user_id,
                Quota.year == year,
                Quota.is_deleted == False,
            )
        ).order_by(Quota.month.asc())

        result = await self.db.execute(stmt)
        quotas = result.scalars().all()

        # Build trends for all 12 months
        trends = []
        quota_dict = {q.month: q for q in quotas}

        for month in range(1, 13):
            quota = quota_dict.get(month)
            if quota:
                gap_amount = quota.remaining_quota
                trends.append(QuotaMonthlyTrend(
                    year=year,
                    month=month,
                    period_str=f"{year}-{month:02d}",
                    quota_amount=quota.total_quota,
                    achieved_amount=quota.total_achieved,
                    achievement_percentage=quota.achievement_percentage,
                    gap_amount=gap_amount,
                ))
            else:
                # No quota for this month
                trends.append(QuotaMonthlyTrend(
                    year=year,
                    month=month,
                    period_str=f"{year}-{month:02d}",
                    quota_amount=Decimal('0'),
                    achieved_amount=Decimal('0'),
                    achievement_percentage=Decimal('0'),
                    gap_amount=Decimal('0'),
                ))

        return trends

    async def get_comparison_stats(
        self,
        user_id: UUID,
        year: int,
        month: int,
        tenant_id: UUID,
    ) -> QuotaComparisonStats:
        """
        Get month-to-month comparison statistics

        Args:
            user_id: User ID
            year: Year
            month: Month
            tenant_id: Tenant ID

        Returns:
            Comparison statistics between current and previous month
        """
        # Get current month stats
        current_stats = await self.get_dashboard_stats(user_id, year, month, tenant_id)

        # Calculate previous month
        if month == 1:
            prev_year = year - 1
            prev_month = 12
        else:
            prev_year = year
            prev_month = month - 1

        # Get previous month stats
        previous_stats = await self.get_dashboard_stats(user_id, prev_year, prev_month, tenant_id)

        # Calculate changes
        quota_change = Decimal('0')
        achieved_change = Decimal('0')
        percentage_change = Decimal('0')

        if current_stats and previous_stats:
            quota_change = current_stats.total_quota - previous_stats.total_quota
            achieved_change = current_stats.total_achieved - previous_stats.total_achieved
            percentage_change = current_stats.achievement_percentage - previous_stats.achievement_percentage

        return QuotaComparisonStats(
            current_month=current_stats,
            previous_month=previous_stats,
            quota_change=quota_change,
            achieved_change=achieved_change,
            percentage_change=percentage_change.quantize(Decimal('0.01')),
        )
