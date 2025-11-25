"""
Dashboard Repository
Aggregations and metrics calculations for dashboard
OPTIMIZED: Includes caching and parallel query execution
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract, case
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict
from uuid import UUID
import calendar
import asyncio

from models.quote import Quote, SaleStatus
from models.expense import Expense, ExpenseStatus
from models.client import Client, ClientStatus
from models.user import User
from modules.dashboard.schemas import (
    KPIMetric,
    DashboardKPIs,
    MonthlyDataPoint,
    RevenueData,
    ExpensesData,
    TopClient,
    TopClientsData,
    ActivityEvent,
    RecentActivityData,
    DashboardSummary,
)
from core.cache import cached, invalidate_cache_pattern


class DashboardRepository:
    """Repository for dashboard data aggregations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _get_month_label(self, year: int, month: int) -> str:
        """Generate Spanish month label (e.g., 'Ene 2025')"""
        month_names = [
            "Ene",
            "Feb",
            "Mar",
            "Abr",
            "May",
            "Jun",
            "Jul",
            "Ago",
            "Sep",
            "Oct",
            "Nov",
            "Dic",
        ]
        return f"{month_names[month - 1]} {year}"

    def _calculate_change_percent(
        self, current: Decimal, previous: Decimal | None
    ) -> Decimal | None:
        """Calculate percentage change between two values"""
        if previous is None or previous == 0:
            return None
        change = ((current - previous) / previous) * 100
        return Decimal(str(round(change, 2)))

    def _get_date_ranges(self):
        """Get current and previous period date ranges"""
        now = datetime.now()
        current_month_start = datetime(now.year, now.month, 1)
        current_year_start = datetime(now.year, 1, 1)

        # Previous month
        if now.month == 1:
            prev_month_start = datetime(now.year - 1, 12, 1)
            prev_month_end = datetime(now.year, 1, 1) - timedelta(days=1)
        else:
            prev_month_start = datetime(now.year, now.month - 1, 1)
            last_day = calendar.monthrange(now.year, now.month - 1)[1]
            prev_month_end = datetime(now.year, now.month - 1, last_day, 23, 59, 59)

        return {
            "current_month_start": current_month_start,
            "current_year_start": current_year_start,
            "prev_month_start": prev_month_start,
            "prev_month_end": prev_month_end,
            "now": now,
        }

    # ========================================================================
    # KPIs Methods
    # ========================================================================

    @cached(ttl=300, key_prefix="dashboard:kpis")
    async def get_kpis(self, tenant_id: UUID) -> DashboardKPIs:
        """
        Get main dashboard KPIs with period comparisons
        OPTIMIZED: Cached for 5 minutes, parallel query execution
        """
        dates = self._get_date_ranges()

        # OPTIMIZATION: Execute all queries in parallel using asyncio.gather
        # This reduces total query time from sum(all queries) to max(single query)
        (
            revenue_current,
            revenue_previous,
            active_clients,
            new_clients_month,
            new_clients_prev_month,
            expenses_current,
            expenses_previous,
            pending_approvals,
            conversion_current,
            conversion_previous,
            quotes_sent,
            quotes_accepted,
        ) = await asyncio.gather(
            # Revenue queries
            self._get_revenue(tenant_id, dates["current_month_start"], dates["now"]),
            self._get_revenue(tenant_id, dates["prev_month_start"], dates["prev_month_end"]),
            # Client queries
            self._get_active_clients_count(tenant_id),
            self._get_new_clients_count(tenant_id, dates["current_month_start"], dates["now"]),
            self._get_new_clients_count(tenant_id, dates["prev_month_start"], dates["prev_month_end"]),
            # Expense queries
            self._get_expenses_total(tenant_id, dates["current_month_start"], dates["now"]),
            self._get_expenses_total(tenant_id, dates["prev_month_start"], dates["prev_month_end"]),
            # Pending approvals
            self._get_pending_approvals_count(tenant_id),
            # Conversion rate queries
            self._get_conversion_rate(tenant_id, dates["current_month_start"], dates["now"]),
            self._get_conversion_rate(tenant_id, dates["prev_month_start"], dates["prev_month_end"]),
            # Quote count queries
            self._get_quotes_by_status_count(tenant_id, SaleStatus.SENT, dates["current_month_start"], dates["now"]),
            self._get_quotes_by_status_count(tenant_id, SaleStatus.ACCEPTED, dates["current_month_start"], dates["now"]),
        )

        # Build KPIs
        return DashboardKPIs(
            total_revenue=KPIMetric(
                title="Ventas del Mes",
                current_value=revenue_current,
                previous_value=revenue_previous,
                change_percent=self._calculate_change_percent(
                    revenue_current, revenue_previous
                ),
                is_positive=revenue_current >= (revenue_previous or 0),
                format_type="currency",
            ),
            monthly_quota=await self._calculate_quota_performance(
                tenant_id, revenue_current, revenue_previous, dates
            ),
            conversion_rate=KPIMetric(
                title="Tasa de Conversión",
                current_value=conversion_current,
                previous_value=conversion_previous,
                change_percent=self._calculate_change_percent(
                    conversion_current, conversion_previous
                ),
                is_positive=conversion_current >= (conversion_previous or 0),
                format_type="percentage",
            ),
            active_clients=KPIMetric(
                title="Clientes Activos",
                current_value=Decimal(str(active_clients)),
                previous_value=None,
                change_percent=None,
                is_positive=True,
                format_type="number",
            ),
            new_clients_this_month=KPIMetric(
                title="Clientes Nuevos",
                current_value=Decimal(str(new_clients_month)),
                previous_value=Decimal(str(new_clients_prev_month)),
                change_percent=self._calculate_change_percent(
                    Decimal(str(new_clients_month)),
                    Decimal(str(new_clients_prev_month)),
                ),
                is_positive=new_clients_month >= new_clients_prev_month,
                format_type="number",
            ),
            total_expenses=KPIMetric(
                title="Gastos del Mes",
                current_value=expenses_current,
                previous_value=expenses_previous,
                change_percent=self._calculate_change_percent(
                    expenses_current, expenses_previous
                ),
                is_positive=expenses_current <= (
                    expenses_previous or Decimal("999999")
                ),  # Lower is better
                format_type="currency",
            ),
            pending_approvals=KPIMetric(
                title="Aprobaciones Pendientes",
                current_value=Decimal(str(pending_approvals)),
                previous_value=None,
                change_percent=None,
                is_positive=pending_approvals == 0,
                format_type="number",
            ),
            quotes_sent=KPIMetric(
                title="Cotizaciones Enviadas",
                current_value=Decimal(str(quotes_sent)),
                previous_value=None,
                change_percent=None,
                is_positive=True,
                format_type="number",
            ),
            quotes_accepted=KPIMetric(
                title="Cotizaciones Aceptadas",
                current_value=Decimal(str(quotes_accepted)),
                previous_value=None,
                change_percent=None,
                is_positive=True,
                format_type="number",
            ),
        )

    async def _get_revenue(
        self, tenant_id: UUID, start_date: datetime, end_date: datetime
    ) -> Decimal:
        """Get total revenue from accepted quotes in period"""
        stmt = select(func.coalesce(func.sum(Quote.total_amount), 0)).where(
            and_(
                Quote.tenant_id == tenant_id,
                Quote.status == SaleStatus.ACCEPTED,
                Quote.created_at >= start_date,
                Quote.created_at <= end_date,
            )
        )
        result = await self.db.execute(stmt)
        return Decimal(str(result.scalar() or 0))

    async def _get_active_clients_count(self, tenant_id: UUID) -> int:
        """Get count of active clients"""
        stmt = select(func.count(Client.id)).where(
            and_(
                Client.tenant_id == tenant_id,
                Client.status == ClientStatus.ACTIVE,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _get_new_clients_count(
        self, tenant_id: UUID, start_date: datetime, end_date: datetime
    ) -> int:
        """Get count of new clients in period"""
        stmt = select(func.count(Client.id)).where(
            and_(
                Client.tenant_id == tenant_id,
                Client.created_at >= start_date,
                Client.created_at <= end_date,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _get_expenses_total(
        self, tenant_id: UUID, start_date: datetime, end_date: datetime
    ) -> Decimal:
        """Get total approved expenses in period"""
        stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            and_(
                Expense.tenant_id == tenant_id,
                Expense.status == ExpenseStatus.APPROVED,
                Expense.date >= start_date.date(),
                Expense.date <= end_date.date(),
            )
        )
        result = await self.db.execute(stmt)
        return Decimal(str(result.scalar() or 0))

    async def _get_pending_approvals_count(self, tenant_id: UUID) -> int:
        """Get count of pending expense approvals"""
        stmt = select(func.count(Expense.id)).where(
            and_(
                Expense.tenant_id == tenant_id,
                Expense.status == ExpenseStatus.PENDING,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _get_conversion_rate(
        self, tenant_id: UUID, start_date: datetime, end_date: datetime
    ) -> Decimal:
        """Calculate quote conversion rate (accepted / sent) in period"""
        # Count sent quotes
        sent_stmt = select(func.count(Quote.id)).where(
            and_(
                Quote.tenant_id == tenant_id,
                Quote.status.in_([SaleStatus.SENT, SaleStatus.ACCEPTED]),
                Quote.created_at >= start_date,
                Quote.created_at <= end_date,
            )
        )
        sent_result = await self.db.execute(sent_stmt)
        sent_count = sent_result.scalar() or 0

        if sent_count == 0:
            return Decimal("0")

        # Count accepted quotes
        accepted_stmt = select(func.count(Quote.id)).where(
            and_(
                Quote.tenant_id == tenant_id,
                Quote.status == SaleStatus.ACCEPTED,
                Quote.created_at >= start_date,
                Quote.created_at <= end_date,
            )
        )
        accepted_result = await self.db.execute(accepted_stmt)
        accepted_count = accepted_result.scalar() or 0

        conversion = (accepted_count / sent_count) * 100
        return Decimal(str(round(conversion, 2)))

    async def _get_quotes_by_status_count(
        self,
        tenant_id: UUID,
        status: SaleStatus,
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        """Get count of quotes by status in period"""
        stmt = select(func.count(Quote.id)).where(
            and_(
                Quote.tenant_id == tenant_id,
                Quote.status == status,
                Quote.created_at >= start_date,
                Quote.created_at <= end_date,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _get_expenses_count(self, tenant_id: UUID, year: int) -> int:
        """Get count of expenses for a specific year"""
        stmt = select(func.count(Expense.id)).where(
            and_(
                Expense.tenant_id == tenant_id,
                extract("year", Expense.date) == year,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _calculate_quota_performance(
        self,
        tenant_id: UUID,
        revenue_current: Decimal,
        revenue_previous: Decimal,
        dates: dict,
    ) -> KPIMetric:
        """
        Calculate quota performance based on revenue trends

        Since there's no dedicated quota model yet, we calculate performance based on:
        1. Revenue growth YoY for the same month
        2. Assumes a baseline quota of 20% growth over previous year's month
        """
        # Get revenue for same month last year
        last_year_month_start = datetime(
            dates["current_month_start"].year - 1,
            dates["current_month_start"].month,
            1,
        )
        last_year_month_end = datetime(
            dates["current_month_start"].year - 1,
            dates["current_month_start"].month,
            calendar.monthrange(
                dates["current_month_start"].year - 1,
                dates["current_month_start"].month,
            )[1],
            23, 59, 59,
        )

        revenue_last_year = await self._get_revenue(
            tenant_id, last_year_month_start, last_year_month_end
        )

        # Calculate quota as 20% growth over last year's revenue
        # If no last year data, use current month as 100% of an estimated quota
        if revenue_last_year and revenue_last_year > 0:
            # Target is 20% growth
            target_quota = revenue_last_year * Decimal("1.20")
            current_performance = (revenue_current / target_quota) * 100

            # Previous month performance for comparison
            if revenue_previous and revenue_previous > 0:
                # Get previous month last year for comparison
                prev_month = dates["prev_month_start"]
                prev_year_month_start = datetime(
                    prev_month.year - 1,
                    prev_month.month,
                    1,
                )
                prev_year_month_end = datetime(
                    prev_month.year - 1,
                    prev_month.month,
                    calendar.monthrange(prev_month.year - 1, prev_month.month)[1],
                    23, 59, 59,
                )
                revenue_prev_last_year = await self._get_revenue(
                    tenant_id, prev_year_month_start, prev_year_month_end
                )

                if revenue_prev_last_year and revenue_prev_last_year > 0:
                    prev_target = revenue_prev_last_year * Decimal("1.20")
                    previous_performance = (revenue_previous / prev_target) * 100
                else:
                    previous_performance = Decimal("0")
            else:
                previous_performance = Decimal("0")
        else:
            # No historical data, assume current revenue is 100% of quota
            current_performance = Decimal("100.0")
            previous_performance = Decimal("100.0")

        # Ensure values are reasonable (cap at 200%)
        current_performance = min(current_performance, Decimal("200.0"))
        previous_performance = min(previous_performance, Decimal("200.0"))

        return KPIMetric(
            title="Cumplimiento de Cuota",
            current_value=current_performance,
            previous_value=previous_performance,
            change_percent=self._calculate_change_percent(
                current_performance, previous_performance
            ),
            is_positive=current_performance >= previous_performance,
            format_type="percentage",
        )


    # ========================================================================
    # Monthly Data Methods
    # ========================================================================

    @cached(ttl=600, key_prefix="dashboard:revenue_monthly")
    async def get_revenue_monthly(self, tenant_id: UUID, year: int) -> RevenueData:
        """
        Get monthly revenue data for the year
        OPTIMIZED: Cached for 10 minutes, parallel data fetch
        """
        # OPTIMIZATION: Fetch both years in parallel
        current_data, previous_data = await asyncio.gather(
            self._get_monthly_revenue_by_year(tenant_id, year),
            self._get_monthly_revenue_by_year(tenant_id, year - 1),
        )

        total_current = sum(point.value for point in current_data)
        total_previous = (
            sum(point.value for point in previous_data) if previous_data else None
        )

        return RevenueData(
            current_year=current_data,
            previous_year=previous_data if previous_data else None,
            total_current_year=total_current,
            total_previous_year=total_previous,
        )

    async def _get_monthly_revenue_by_year(
        self, tenant_id: UUID, year: int
    ) -> List[MonthlyDataPoint]:
        """Get monthly revenue for a specific year"""
        stmt = (
            select(
                extract("month", Quote.created_at).label("month"),
                func.coalesce(func.sum(Quote.total_amount), 0).label("total"),
            )
            .where(
                and_(
                    Quote.tenant_id == tenant_id,
                    Quote.status == SaleStatus.ACCEPTED,
                    extract("year", Quote.created_at) == year,
                )
            )
            .group_by(extract("month", Quote.created_at))
            .order_by(extract("month", Quote.created_at))
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        # Create data points for all 12 months
        data_dict = {int(row.month): Decimal(str(row.total)) for row in rows}
        data_points = []

        for month in range(1, 13):
            value = data_dict.get(month, Decimal("0"))
            data_points.append(
                MonthlyDataPoint(
                    month=f"{year}-{month:02d}",
                    value=value,
                    label=self._get_month_label(year, month),
                )
            )

        return data_points

    @cached(ttl=600, key_prefix="dashboard:expenses_monthly")
    async def get_expenses_monthly(self, tenant_id: UUID, year: int) -> ExpensesData:
        """
        Get monthly expenses data for the year
        OPTIMIZED: Cached for 10 minutes, parallel data fetch
        """
        # OPTIMIZATION: Fetch all data in parallel
        current_data, previous_data, by_category = await asyncio.gather(
            self._get_monthly_expenses_by_year(tenant_id, year),
            self._get_monthly_expenses_by_year(tenant_id, year - 1),
            self._get_expenses_by_category(tenant_id, year),
        )

        total_current = sum(point.value for point in current_data)
        total_previous = (
            sum(point.value for point in previous_data) if previous_data else None
        )

        return ExpensesData(
            current_year=current_data,
            previous_year=previous_data if previous_data else None,
            total_current_year=total_current,
            total_previous_year=total_previous,
            by_category=by_category,
        )

    async def _get_monthly_expenses_by_year(
        self, tenant_id: UUID, year: int
    ) -> List[MonthlyDataPoint]:
        """Get monthly expenses for a specific year"""
        stmt = (
            select(
                extract("month", Expense.date).label("month"),
                func.coalesce(func.sum(Expense.amount), 0).label("total"),
            )
            .where(
                and_(
                    Expense.tenant_id == tenant_id,
                    Expense.status == ExpenseStatus.APPROVED,
                    extract("year", Expense.date) == year,
                )
            )
            .group_by(extract("month", Expense.date))
            .order_by(extract("month", Expense.date))
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        # Create data points for all 12 months
        data_dict = {int(row.month): Decimal(str(row.total)) for row in rows}
        data_points = []

        for month in range(1, 13):
            value = data_dict.get(month, Decimal("0"))
            data_points.append(
                MonthlyDataPoint(
                    month=f"{year}-{month:02d}",
                    value=value,
                    label=self._get_month_label(year, month),
                )
            )

        return data_points

    async def _get_expenses_by_category(
        self, tenant_id: UUID, year: int
    ) -> List[Dict[str, Decimal]]:
        """Get expenses breakdown by category for the year"""
        from models.expense_category import ExpenseCategory

        stmt = (
            select(
                ExpenseCategory.name.label("category_name"),
                func.coalesce(func.sum(Expense.amount), 0).label("total"),
            )
            .outerjoin(Expense, ExpenseCategory.id == Expense.category_id)
            .where(
                and_(
                    ExpenseCategory.tenant_id == tenant_id,
                    ExpenseCategory.is_active == True,
                    # Only include expenses from the specified year and approved status
                    # OR if no expenses, still show the category with 0
                    or_(
                        and_(
                            Expense.tenant_id == tenant_id,
                            Expense.status == ExpenseStatus.APPROVED,
                            extract("year", Expense.date) == year,
                            Expense.is_deleted == False,
                        ),
                        Expense.id == None,  # Categories with no expenses
                    ),
                )
            )
            .group_by(ExpenseCategory.name)
            .order_by(func.sum(Expense.amount).desc())
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        # Return list of category breakdowns
        breakdown = []
        for row in rows:
            # Only include categories that have actual expenses
            if row.total and Decimal(str(row.total)) > 0:
                breakdown.append({
                    "category": row.category_name,
                    "total": Decimal(str(row.total)),
                })

        return breakdown

    # ========================================================================
    # Top Clients Method
    # ========================================================================

    @cached(ttl=600, key_prefix="dashboard:top_clients")
    async def get_top_clients(
        self, tenant_id: UUID, limit: int = 10, period: str = "current_year"
    ) -> TopClientsData:
        """Get top clients by revenue"""
        dates = self._get_date_ranges()

        # Determine date filter based on period
        if period == "current_month":
            date_filter = Quote.created_at >= dates["current_month_start"]
        elif period == "current_year":
            date_filter = Quote.created_at >= dates["current_year_start"]
        else:  # all_time
            date_filter = True

        stmt = (
            select(
                Client.id.label("client_id"),
                Client.name.label("client_name"),
                func.sum(Quote.total_amount).label("total_revenue"),
                func.count(Quote.id).label("quote_count"),
                func.max(Quote.created_at).label("last_quote_date"),
            )
            .join(Quote, Quote.client_id == Client.id)
            .where(
                and_(
                    Client.tenant_id == tenant_id,
                    Quote.status == SaleStatus.ACCEPTED,
                    date_filter,
                )
            )
            .group_by(Client.id, Client.name)
            .order_by(func.sum(Quote.total_amount).desc())
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        clients = [
            TopClient(
                client_id=str(row.client_id),
                client_name=row.client_name,
                total_revenue=Decimal(str(row.total_revenue)),
                quote_count=row.quote_count,
                last_quote_date=row.last_quote_date.date()
                if row.last_quote_date
                else None,
            )
            for row in rows
        ]

        return TopClientsData(clients=clients, period=period)

    # ========================================================================
    # Recent Activity Method
    # ========================================================================

    async def get_recent_activity(
        self, tenant_id: UUID, limit: int = 20
    ) -> RecentActivityData:
        """
        Get recent system activity
        OPTIMIZED: Uses eager loading to prevent N+1 queries
        """
        events = []

        # Get recent quotes (created, sent, accepted)
        # OPTIMIZATION: Eager load sales_rep to prevent N+1 queries
        quote_stmt = (
            select(Quote)
            .where(Quote.tenant_id == tenant_id)
            .options(joinedload(Quote.sales_rep))
            .order_by(Quote.created_at.desc())
            .limit(limit)
        )
        quote_result = await self.db.execute(quote_stmt)
        quotes = quote_result.unique().scalars().all()

        for quote in quotes:
            events.append(
                ActivityEvent(
                    id=str(quote.id),
                    type="quote_created",
                    title=f"Cotización {quote.quote_number}",
                    description=f"Cotización creada - Estado: {quote.status.value}",
                    user_name=quote.sales_rep.full_name if quote.sales_rep else None,
                    timestamp=quote.created_at.isoformat(),
                    metadata={
                        "quote_number": quote.quote_number,
                        "status": quote.status.value,
                        "amount": str(quote.total_amount),
                    },
                )
            )

        # Get recent clients
        client_stmt = (
            select(Client)
            .where(Client.tenant_id == tenant_id)
            .order_by(Client.created_at.desc())
            .limit(5)
        )
        client_result = await self.db.execute(client_stmt)
        clients = client_result.scalars().all()

        for client in clients:
            events.append(
                ActivityEvent(
                    id=str(client.id),
                    type="client_created",
                    title=f"Cliente: {client.name}",
                    description=f"Nuevo cliente agregado",
                    user_name=None,
                    timestamp=client.created_at.isoformat(),
                    metadata={"client_name": client.name, "status": client.status.value},
                )
            )

        # Sort all events by timestamp
        events.sort(key=lambda x: x.timestamp, reverse=True)

        return RecentActivityData(events=events[:limit], total_events=len(events))

    # ========================================================================
    # Dashboard Summary Method
    # ========================================================================

    @cached(ttl=300, key_prefix="dashboard:summary")
    async def get_summary(self, tenant_id: UUID) -> DashboardSummary:
        """
        Get complete dashboard summary
        OPTIMIZED: Cached for 5 minutes, parallel query execution
        """
        dates = self._get_date_ranges()
        current_year = datetime.now().year

        # OPTIMIZATION: Execute all queries in parallel
        (
            revenue_ytd,
            expenses_ytd,
            total_clients,
            total_quotes,
            total_expenses_count,
            current_month_revenue,
            current_month_expenses,
            current_month_quotes,
            prev_month_revenue,
            prev_month_expenses,
        ) = await asyncio.gather(
            # YTD totals
            self._get_revenue(tenant_id, dates["current_year_start"], dates["now"]),
            self._get_expenses_total(tenant_id, dates["current_year_start"], dates["now"]),
            # Counts
            self._get_active_clients_count(tenant_id),
            self._get_quotes_by_status_count(tenant_id, SaleStatus.ACCEPTED, dates["current_year_start"], dates["now"]),
            self._get_expenses_count(tenant_id, current_year),
            # Current month
            self._get_revenue(tenant_id, dates["current_month_start"], dates["now"]),
            self._get_expenses_total(tenant_id, dates["current_month_start"], dates["now"]),
            self._get_quotes_by_status_count(tenant_id, SaleStatus.ACCEPTED, dates["current_month_start"], dates["now"]),
            # Previous month
            self._get_revenue(tenant_id, dates["prev_month_start"], dates["prev_month_end"]),
            self._get_expenses_total(tenant_id, dates["prev_month_start"], dates["prev_month_end"]),
        )

        net_profit_ytd = revenue_ytd - expenses_ytd
        profit_margin = (
            (net_profit_ytd / revenue_ytd * 100) if revenue_ytd > 0 else Decimal("0")
        )

        # MoM changes
        revenue_mom_change = self._calculate_change_percent(
            current_month_revenue, prev_month_revenue
        ) or Decimal("0")
        expenses_mom_change = self._calculate_change_percent(
            current_month_expenses, prev_month_expenses
        ) or Decimal("0")

        return DashboardSummary(
            total_revenue_ytd=revenue_ytd,
            total_expenses_ytd=expenses_ytd,
            net_profit_ytd=net_profit_ytd,
            profit_margin=profit_margin,
            total_clients=total_clients,
            total_quotes=total_quotes,
            total_expenses_count=total_expenses_count,
            revenue_mom_change=revenue_mom_change,
            expenses_mom_change=expenses_mom_change,
            current_month_revenue=current_month_revenue,
            current_month_expenses=current_month_expenses,
            current_month_quotes=current_month_quotes,
        )
