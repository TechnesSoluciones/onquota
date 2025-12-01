"""
Reports Repository
Data access layer for reports and analytics
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple
from uuid import UUID
import calendar

from sqlalchemy import select, func, and_, or_, case, extract, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from models.quotation import Quotation, QuoteStatus
from models.sales_control import SalesControl, SalesControlStatus
from models.visit import Visit
from models.expense import Expense
from models.client import Client
from models.user import User

from modules.reports.schemas import (
    ReportFiltersBase,
    DatePeriod,
    DashboardKPIs,
    ExecutiveDashboard,
    SalesRepPerformance,
    ProductLineMetric,
    ClientRevenueMetric,
    DashboardAlert,
    TrendPoint,
)


class ReportsRepository:
    """Repository for reports queries"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _get_comparison_period(
        self,
        start_date: date,
        end_date: date,
        comparison_type: str
    ) -> Tuple[date, date]:
        """Calculate comparison period dates"""
        days_diff = (end_date - start_date).days

        if comparison_type == "previous_period":
            comp_end = start_date - timedelta(days=1)
            comp_start = comp_end - timedelta(days=days_diff)
        elif comparison_type == "previous_year":
            comp_start = start_date.replace(year=start_date.year - 1)
            comp_end = end_date.replace(year=end_date.year - 1)
        else:
            raise ValueError(f"Invalid comparison type: {comparison_type}")

        return comp_start, comp_end

    def _calculate_percentage_change(
        self,
        current: Decimal,
        previous: Decimal
    ) -> float:
        """Calculate percentage change"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return float(((current - previous) / previous) * 100)

    # ========================================================================
    # Dashboard Executive Methods
    # ========================================================================

    async def get_executive_dashboard(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase
    ) -> ExecutiveDashboard:
        """Get executive dashboard with KPIs"""

        # Set default dates if not provided
        if not filters.start_date or not filters.end_date:
            filters.end_date = date.today()
            filters.start_date = filters.end_date.replace(day=1)  # First day of month

        period = DatePeriod(
            start_date=filters.start_date,
            end_date=filters.end_date,
            label=f"{filters.start_date.strftime('%B %Y')}"
        )

        # Get KPIs
        kpis = await self._get_dashboard_kpis(tenant_id, filters)

        # Get trends
        revenue_trend = await self._get_revenue_trend(tenant_id, filters)
        quotations_trend = await self._get_quotations_trend(tenant_id, filters)
        visits_trend = await self._get_visits_trend(tenant_id, filters)

        # Get top performers
        top_sales_reps = await self._get_top_sales_reps(tenant_id, filters, limit=5)
        top_clients = await self._get_top_clients(tenant_id, filters, limit=10)
        top_product_lines = await self._get_top_product_lines(tenant_id, filters, limit=5)

        # Get alerts
        alerts = await self._get_dashboard_alerts(tenant_id, filters, kpis)

        return ExecutiveDashboard(
            period=period,
            kpis=kpis,
            revenue_trend=revenue_trend,
            quotations_trend=quotations_trend,
            visits_trend=visits_trend,
            top_sales_reps=top_sales_reps,
            top_clients=top_clients,
            top_product_lines=top_product_lines,
            alerts=alerts
        )

    async def _get_dashboard_kpis(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase
    ) -> DashboardKPIs:
        """Calculate main KPIs for dashboard"""

        # Revenue from paid sales controls
        revenue_query = select(
            func.coalesce(func.sum(SalesControl.sales_control_amount), 0)
        ).where(
            and_(
                SalesControl.tenant_id == tenant_id,
                SalesControl.status == SalesControlStatus.PAID,
                SalesControl.payment_date.between(filters.start_date, filters.end_date),
                SalesControl.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(revenue_query)
        total_revenue = result.scalar() or Decimal(0)

        # Active quotations (cotizado status)
        active_quot_query = select(
            func.count(Quotation.id),
            func.coalesce(func.sum(Quotation.quoted_amount), 0)
        ).where(
            and_(
                Quotation.tenant_id == tenant_id,
                Quotation.status == QuoteStatus.COTIZADO,
                Quotation.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(active_quot_query)
        row = result.first()
        active_quotations = row[0] or 0
        quotations_value = row[1] or Decimal(0)

        # Win rate calculation
        winloss_query = select(
            func.count(case((Quotation.status == QuoteStatus.GANADO, 1))),
            func.count(case((Quotation.status == QuoteStatus.PERDIDO, 1)))
        ).where(
            and_(
                Quotation.tenant_id == tenant_id,
                Quotation.quote_date.between(filters.start_date, filters.end_date),
                Quotation.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(winloss_query)
        row = result.first()
        won_count = row[0] or 0
        lost_count = row[1] or 0
        win_rate = (won_count / (won_count + lost_count) * 100) if (won_count + lost_count) > 0 else 0.0

        # Pipeline value (pending + in_production)
        pipeline_query = select(
            func.coalesce(func.sum(SalesControl.sales_control_amount), 0)
        ).where(
            and_(
                SalesControl.tenant_id == tenant_id,
                SalesControl.status.in_([
                    SalesControlStatus.PENDING,
                    SalesControlStatus.IN_PRODUCTION
                ]),
                SalesControl.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(pipeline_query)
        pipeline_value = result.scalar() or Decimal(0)

        # Visits count
        visits_query = select(func.count(Visit.id)).where(
            and_(
                Visit.tenant_id == tenant_id,
                Visit.visit_date.between(filters.start_date, filters.end_date),
                Visit.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(visits_query)
        visits_this_period = result.scalar() or 0

        # New clients
        new_clients_query = select(func.count(Client.id)).where(
            and_(
                Client.tenant_id == tenant_id,
                Client.created_at.between(
                    datetime.combine(filters.start_date, datetime.min.time()),
                    datetime.combine(filters.end_date, datetime.max.time())
                ),
                Client.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(new_clients_query)
        new_clients = result.scalar() or 0

        # Total expenses
        expenses_query = select(
            func.coalesce(func.sum(Expense.amount), 0)
        ).where(
            and_(
                Expense.tenant_id == tenant_id,
                Expense.date.between(filters.start_date, filters.end_date),
                Expense.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(expenses_query)
        total_expenses = result.scalar() or Decimal(0)

        # Calculate metrics
        expense_to_revenue_ratio = (
            float(total_expenses / total_revenue * 100)
            if total_revenue > 0
            else 0.0
        )

        # Revenue growth (compare with previous period if requested)
        revenue_growth = 0.0
        if filters.comparison_period:
            comp_start, comp_end = self._get_comparison_period(
                filters.start_date,
                filters.end_date,
                filters.comparison_period
            )
            comp_revenue_query = select(
                func.coalesce(func.sum(SalesControl.sales_control_amount), 0)
            ).where(
                and_(
                    SalesControl.tenant_id == tenant_id,
                    SalesControl.status == SalesControlStatus.PAID,
                    SalesControl.payment_date.between(comp_start, comp_end),
                    SalesControl.deleted_at.is_(None)
                )
            )
            result = await self.db.execute(comp_revenue_query)
            comp_revenue = result.scalar() or Decimal(0)
            revenue_growth = self._calculate_percentage_change(total_revenue, comp_revenue)

        # Placeholders for metrics requiring more complex calculations
        avg_sales_cycle_days = 30.0  # TODO: Calculate from quotation date to payment date
        conversion_rate = 25.0  # TODO: Calculate visits to paid sales
        weighted_pipeline = pipeline_value * Decimal("0.6")  # Simple 60% probability

        return DashboardKPIs(
            total_revenue=total_revenue,
            revenue_growth=revenue_growth,
            active_quotations=active_quotations,
            quotations_value=quotations_value,
            win_rate=win_rate,
            pipeline_value=pipeline_value,
            weighted_pipeline=weighted_pipeline,
            visits_this_period=visits_this_period,
            new_clients=new_clients,
            avg_sales_cycle_days=avg_sales_cycle_days,
            conversion_rate=conversion_rate,
            total_expenses=total_expenses,
            expense_to_revenue_ratio=expense_to_revenue_ratio
        )

    async def _get_revenue_trend(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase
    ) -> List[TrendPoint]:
        """Get revenue trend by month"""
        # Get last 12 months
        trend_points = []

        # Simple implementation - get monthly revenue
        # TODO: Implement full monthly aggregation
        trend_points.append(TrendPoint(
            date=filters.end_date,
            value=Decimal(0),
            label=filters.end_date.strftime("%B")
        ))

        return trend_points

    async def _get_quotations_trend(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase
    ) -> List[TrendPoint]:
        """Get quotations trend"""
        # TODO: Implement
        return []

    async def _get_visits_trend(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase
    ) -> List[TrendPoint]:
        """Get visits trend"""
        # TODO: Implement
        return []

    async def _get_top_sales_reps(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase,
        limit: int = 5
    ) -> List[SalesRepPerformance]:
        """Get top performing sales reps"""
        # TODO: Implement full query
        return []

    async def _get_top_clients(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase,
        limit: int = 10
    ) -> List[ClientRevenueMetric]:
        """Get top clients by revenue"""

        query = select(
            Client.id,
            Client.name,
            func.coalesce(func.sum(SalesControl.sales_control_amount), 0).label('total_revenue'),
            func.count(SalesControl.id).label('transaction_count')
        ).select_from(Client).outerjoin(
            SalesControl,
            and_(
                SalesControl.client_id == Client.id,
                SalesControl.status == SalesControlStatus.PAID,
                SalesControl.payment_date.between(filters.start_date, filters.end_date),
                SalesControl.deleted_at.is_(None)
            )
        ).where(
            and_(
                Client.tenant_id == tenant_id,
                Client.deleted_at.is_(None)
            )
        ).group_by(
            Client.id, Client.name
        ).having(
            func.sum(SalesControl.sales_control_amount) > 0
        ).order_by(
            func.sum(SalesControl.sales_control_amount).desc()
        ).limit(limit)

        result = await self.db.execute(query)
        rows = result.all()

        # Calculate total for percentages
        total_revenue = sum(row.total_revenue for row in rows)

        clients = []
        for row in rows:
            avg_value = row.total_revenue / row.transaction_count if row.transaction_count > 0 else Decimal(0)
            percentage = float(row.total_revenue / total_revenue * 100) if total_revenue > 0 else 0.0

            clients.append(ClientRevenueMetric(
                client_id=row.id,
                client_name=row.name,
                total_revenue=row.total_revenue,
                total_transactions=row.transaction_count,
                avg_transaction_value=avg_value,
                percentage_of_total=percentage
            ))

        return clients

    async def _get_top_product_lines(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase,
        limit: int = 5
    ) -> List[ProductLineMetric]:
        """Get top product lines"""
        # TODO: Implement with sales_control_lines join
        return []

    async def _get_dashboard_alerts(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase,
        kpis: DashboardKPIs
    ) -> List[DashboardAlert]:
        """Generate alerts based on KPIs"""
        alerts = []

        # Low win rate alert
        if kpis.win_rate < 30:
            alerts.append(DashboardAlert(
                severity="warning",
                title="Tasa de conversión baja",
                message="La tasa de conversión de cotizaciones está por debajo del 30%",
                metric_value=f"{kpis.win_rate:.1f}%",
                threshold="30%"
            ))

        # High expense ratio alert
        if kpis.expense_to_revenue_ratio > 25:
            alerts.append(DashboardAlert(
                severity="warning",
                title="Ratio gastos/ingresos alto",
                message="Los gastos representan más del 25% de los ingresos",
                metric_value=f"{kpis.expense_to_revenue_ratio:.1f}%",
                threshold="25%"
            ))

        # Low activity alert
        if kpis.visits_this_period < 10:
            alerts.append(DashboardAlert(
                severity="info",
                title="Actividad de visitas baja",
                message="Se han registrado pocas visitas este período",
                metric_value=str(kpis.visits_this_period),
                threshold="10"
            ))

        return alerts
