"""
Opportunity Analytics Service
Provides advanced analytics and metrics for opportunities
"""
from typing import Dict, List, Optional, Tuple
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal
from collections import defaultdict
from sqlalchemy import select, func, and_, or_, extract, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from models.opportunity import Opportunity, OpportunityStage
from models.user import User
from core.logging import get_logger

logger = get_logger(__name__)


class OpportunityAnalyticsService:
    """
    Service for calculating opportunity analytics and metrics

    Provides:
    - Win rate analysis by sales rep
    - Conversion rates between stages
    - Average sales cycle duration
    - Forecast accuracy calculations
    - Pipeline health metrics
    - Revenue forecasting
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_win_rate(
        self,
        tenant_id: UUID,
        sales_rep_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, any]:
        """
        Calculate win rate for opportunities

        Args:
            tenant_id: Tenant UUID
            sales_rep_id: Optional filter by sales rep
            start_date: Optional start date for closed opportunities
            end_date: Optional end date for closed opportunities

        Returns:
            Dictionary with:
                - total_closed: Total closed opportunities
                - won: Number of won opportunities
                - lost: Number of lost opportunities
                - win_rate: Win rate percentage
                - total_won_value: Total value of won opportunities
                - total_lost_value: Total value of lost opportunities
                - average_won_value: Average value per won deal
        """
        # Build base query for closed opportunities
        conditions = [
            Opportunity.tenant_id == tenant_id,
            Opportunity.is_deleted == False,
            Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        ]

        if sales_rep_id:
            conditions.append(Opportunity.assigned_to == sales_rep_id)

        if start_date:
            conditions.append(Opportunity.actual_close_date >= start_date)

        if end_date:
            conditions.append(Opportunity.actual_close_date <= end_date)

        # Get all closed opportunities
        query = select(Opportunity).where(and_(*conditions))
        result = await self.db.execute(query)
        opportunities = result.scalars().all()

        # Calculate metrics
        won_opps = [opp for opp in opportunities if opp.stage == OpportunityStage.CLOSED_WON]
        lost_opps = [opp for opp in opportunities if opp.stage == OpportunityStage.CLOSED_LOST]

        total_closed = len(opportunities)
        won_count = len(won_opps)
        lost_count = len(lost_opps)

        win_rate = Decimal("0.00")
        if total_closed > 0:
            win_rate = Decimal(str((won_count / total_closed) * 100)).quantize(Decimal("0.01"))

        total_won_value = sum(float(opp.estimated_value) for opp in won_opps)
        total_lost_value = sum(float(opp.estimated_value) for opp in lost_opps)

        average_won_value = Decimal("0.00")
        if won_count > 0:
            average_won_value = Decimal(str(total_won_value / won_count)).quantize(Decimal("0.01"))

        logger.info(
            f"Win rate calculated for tenant {tenant_id}: {win_rate}% "
            f"({won_count}/{total_closed})"
        )

        return {
            "total_closed": total_closed,
            "won": won_count,
            "lost": lost_count,
            "win_rate": win_rate,
            "total_won_value": Decimal(str(total_won_value)),
            "total_lost_value": Decimal(str(total_lost_value)),
            "average_won_value": average_won_value,
        }

    async def calculate_conversion_rates(
        self,
        tenant_id: UUID,
        sales_rep_id: Optional[UUID] = None
    ) -> Dict[str, Dict[str, any]]:
        """
        Calculate conversion rates between pipeline stages

        Args:
            tenant_id: Tenant UUID
            sales_rep_id: Optional filter by sales rep

        Returns:
            Dictionary with conversion rates for each stage:
            {
                "LEAD": {
                    "count": 100,
                    "converted_to_next": 70,
                    "conversion_rate": 70.0
                },
                ...
            }
        """
        conditions = [
            Opportunity.tenant_id == tenant_id,
            Opportunity.is_deleted == False
        ]

        if sales_rep_id:
            conditions.append(Opportunity.assigned_to == sales_rep_id)

        # Get all opportunities
        query = select(Opportunity).where(and_(*conditions))
        result = await self.db.execute(query)
        opportunities = result.scalars().all()

        # Define stage progression
        stage_progression = {
            OpportunityStage.LEAD: OpportunityStage.QUALIFIED,
            OpportunityStage.QUALIFIED: OpportunityStage.PROPOSAL,
            OpportunityStage.PROPOSAL: OpportunityStage.NEGOTIATION,
            OpportunityStage.NEGOTIATION: OpportunityStage.CLOSED_WON,
        }

        # Calculate conversion rates
        conversion_rates = {}

        for current_stage, next_stage in stage_progression.items():
            # Count opportunities at this stage
            current_stage_opps = [opp for opp in opportunities if opp.stage == current_stage]
            current_count = len(current_stage_opps)

            # Count opportunities that reached next stage or beyond
            # (including those that might have moved beyond the next stage)
            stage_order = list(OpportunityStage)
            next_stage_index = stage_order.index(next_stage)
            advanced_stages = stage_order[next_stage_index:]

            converted_count = len([
                opp for opp in opportunities
                if opp.stage in advanced_stages
            ])

            # Calculate conversion rate
            conversion_rate = Decimal("0.00")
            if current_count > 0:
                # This is a simplified calculation
                # In reality, you might want to track historical stage changes
                conversion_rate = Decimal(str((converted_count / current_count) * 100)).quantize(Decimal("0.01"))

            conversion_rates[current_stage.value] = {
                "stage": current_stage.value,
                "count": current_count,
                "converted_to_next": converted_count,
                "conversion_rate": conversion_rate,
                "next_stage": next_stage.value
            }

        logger.info(f"Conversion rates calculated for tenant {tenant_id}")

        return conversion_rates

    async def calculate_average_sales_cycle(
        self,
        tenant_id: UUID,
        sales_rep_id: Optional[UUID] = None,
        stage: Optional[OpportunityStage] = None
    ) -> Dict[str, any]:
        """
        Calculate average sales cycle duration

        Args:
            tenant_id: Tenant UUID
            sales_rep_id: Optional filter by sales rep
            stage: Optional filter by final stage (won/lost)

        Returns:
            Dictionary with:
                - average_days: Average days from creation to close
                - median_days: Median days
                - min_days: Shortest cycle
                - max_days: Longest cycle
                - total_opportunities: Number of opportunities analyzed
        """
        conditions = [
            Opportunity.tenant_id == tenant_id,
            Opportunity.is_deleted == False,
            Opportunity.actual_close_date.isnot(None)  # Only closed opportunities
        ]

        if sales_rep_id:
            conditions.append(Opportunity.assigned_to == sales_rep_id)

        if stage:
            conditions.append(Opportunity.stage == stage)
        else:
            # Default: only won and lost
            conditions.append(Opportunity.stage.in_([
                OpportunityStage.CLOSED_WON,
                OpportunityStage.CLOSED_LOST
            ]))

        # Get all closed opportunities
        query = select(Opportunity).where(and_(*conditions))
        result = await self.db.execute(query)
        opportunities = result.scalars().all()

        if not opportunities:
            return {
                "average_days": 0,
                "median_days": 0,
                "min_days": 0,
                "max_days": 0,
                "total_opportunities": 0
            }

        # Calculate cycle durations
        durations = []
        for opp in opportunities:
            if opp.actual_close_date and opp.created_at:
                # Calculate days between creation and close
                delta = opp.actual_close_date - opp.created_at.date()
                durations.append(delta.days)

        if not durations:
            return {
                "average_days": 0,
                "median_days": 0,
                "min_days": 0,
                "max_days": 0,
                "total_opportunities": 0
            }

        # Calculate statistics
        durations.sort()
        average_days = sum(durations) / len(durations)
        median_days = durations[len(durations) // 2]
        min_days = min(durations)
        max_days = max(durations)

        logger.info(
            f"Average sales cycle for tenant {tenant_id}: {average_days:.1f} days "
            f"(n={len(opportunities)})"
        )

        return {
            "average_days": round(average_days, 1),
            "median_days": median_days,
            "min_days": min_days,
            "max_days": max_days,
            "total_opportunities": len(opportunities)
        }

    async def calculate_forecast_accuracy(
        self,
        tenant_id: UUID,
        quarter: Optional[int] = None,
        year: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Calculate forecast accuracy by comparing expected vs actual close dates

        Args:
            tenant_id: Tenant UUID
            quarter: Optional quarter (1-4)
            year: Optional year

        Returns:
            Dictionary with:
                - total_closed: Total closed opportunities in period
                - closed_on_time: Opportunities closed on or before expected date
                - closed_late: Opportunities closed after expected date
                - accuracy_rate: Percentage of on-time closes
                - average_delay_days: Average delay in days for late closes
        """
        conditions = [
            Opportunity.tenant_id == tenant_id,
            Opportunity.is_deleted == False,
            Opportunity.actual_close_date.isnot(None),
            Opportunity.expected_close_date.isnot(None)
        ]

        # Add time period filters
        if year and quarter:
            quarter_start_month = (quarter - 1) * 3 + 1
            quarter_end_month = quarter * 3

            conditions.append(extract('year', Opportunity.actual_close_date) == year)
            conditions.append(and_(
                extract('month', Opportunity.actual_close_date) >= quarter_start_month,
                extract('month', Opportunity.actual_close_date) <= quarter_end_month
            ))
        elif year:
            conditions.append(extract('year', Opportunity.actual_close_date) == year)

        # Get opportunities
        query = select(Opportunity).where(and_(*conditions))
        result = await self.db.execute(query)
        opportunities = result.scalars().all()

        if not opportunities:
            return {
                "total_closed": 0,
                "closed_on_time": 0,
                "closed_late": 0,
                "accuracy_rate": Decimal("0.00"),
                "average_delay_days": 0
            }

        # Analyze forecast accuracy
        on_time = []
        late = []
        delays = []

        for opp in opportunities:
            if opp.actual_close_date <= opp.expected_close_date:
                on_time.append(opp)
            else:
                late.append(opp)
                delay = (opp.actual_close_date - opp.expected_close_date).days
                delays.append(delay)

        total_closed = len(opportunities)
        on_time_count = len(on_time)
        late_count = len(late)

        accuracy_rate = Decimal("0.00")
        if total_closed > 0:
            accuracy_rate = Decimal(str((on_time_count / total_closed) * 100)).quantize(Decimal("0.01"))

        average_delay = 0
        if delays:
            average_delay = round(sum(delays) / len(delays), 1)

        logger.info(
            f"Forecast accuracy for tenant {tenant_id}: {accuracy_rate}% "
            f"({on_time_count}/{total_closed} on time)"
        )

        return {
            "total_closed": total_closed,
            "closed_on_time": on_time_count,
            "closed_late": late_count,
            "accuracy_rate": accuracy_rate,
            "average_delay_days": average_delay
        }

    async def get_pipeline_health_metrics(
        self,
        tenant_id: UUID,
        sales_rep_id: Optional[UUID] = None
    ) -> Dict[str, any]:
        """
        Calculate overall pipeline health metrics

        Args:
            tenant_id: Tenant UUID
            sales_rep_id: Optional filter by sales rep

        Returns:
            Comprehensive pipeline health metrics including:
            - Stage distribution
            - Aging analysis
            - Value concentration
            - Activity metrics
        """
        conditions = [
            Opportunity.tenant_id == tenant_id,
            Opportunity.is_deleted == False,
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        ]

        if sales_rep_id:
            conditions.append(Opportunity.assigned_to == sales_rep_id)

        # Get active opportunities
        query = select(Opportunity).where(and_(*conditions))
        result = await self.db.execute(query)
        opportunities = result.scalars().all()

        # Stage distribution
        stage_distribution = defaultdict(lambda: {"count": 0, "value": Decimal("0.00")})
        for opp in opportunities:
            stage_distribution[opp.stage.value]["count"] += 1
            stage_distribution[opp.stage.value]["value"] += opp.estimated_value

        # Aging analysis
        today = date.today()
        aging_buckets = {
            "0-30": 0,
            "31-60": 0,
            "61-90": 0,
            "90+": 0
        }

        for opp in opportunities:
            age = (today - opp.created_at.date()).days
            if age <= 30:
                aging_buckets["0-30"] += 1
            elif age <= 60:
                aging_buckets["31-60"] += 1
            elif age <= 90:
                aging_buckets["61-90"] += 1
            else:
                aging_buckets["90+"] += 1

        # Overdue opportunities (past expected close date)
        overdue = [
            opp for opp in opportunities
            if opp.expected_close_date and opp.expected_close_date < today
        ]

        logger.info(f"Pipeline health metrics calculated for tenant {tenant_id}")

        return {
            "total_active_opportunities": len(opportunities),
            "total_pipeline_value": sum(float(opp.estimated_value) for opp in opportunities),
            "weighted_pipeline_value": sum(opp.weighted_value for opp in opportunities),
            "stage_distribution": dict(stage_distribution),
            "aging_analysis": aging_buckets,
            "overdue_count": len(overdue),
            "overdue_value": sum(float(opp.estimated_value) for opp in overdue)
        }

    async def calculate_revenue_forecast(
        self,
        tenant_id: UUID,
        forecast_period_days: int = 90,
        sales_rep_id: Optional[UUID] = None
    ) -> Dict[str, any]:
        """
        Calculate revenue forecast for upcoming period

        Args:
            tenant_id: Tenant UUID
            forecast_period_days: Number of days to forecast (default: 90)
            sales_rep_id: Optional filter by sales rep

        Returns:
            Revenue forecast with confidence levels
        """
        end_date = date.today() + timedelta(days=forecast_period_days)

        conditions = [
            Opportunity.tenant_id == tenant_id,
            Opportunity.is_deleted == False,
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]),
            Opportunity.expected_close_date <= end_date
        ]

        if sales_rep_id:
            conditions.append(Opportunity.assigned_to == sales_rep_id)

        # Get opportunities expected to close in period
        query = select(Opportunity).where(and_(*conditions))
        result = await self.db.execute(query)
        opportunities = result.scalars().all()

        # Calculate forecast by confidence level
        best_case = sum(float(opp.estimated_value) for opp in opportunities)
        weighted = sum(opp.weighted_value for opp in opportunities)

        # Conservative (only high probability deals)
        high_probability_opps = [
            opp for opp in opportunities
            if opp.probability >= 75
        ]
        conservative = sum(opp.weighted_value for opp in high_probability_opps)

        # Group by month
        monthly_forecast = defaultdict(lambda: {
            "best_case": Decimal("0.00"),
            "weighted": Decimal("0.00"),
            "count": 0
        })

        for opp in opportunities:
            if opp.expected_close_date:
                month_key = opp.expected_close_date.strftime("%Y-%m")
                monthly_forecast[month_key]["best_case"] += opp.estimated_value
                monthly_forecast[month_key]["weighted"] += Decimal(str(opp.weighted_value))
                monthly_forecast[month_key]["count"] += 1

        logger.info(
            f"Revenue forecast for tenant {tenant_id}: "
            f"Weighted=${weighted:.2f}, Best case=${best_case:.2f}"
        )

        return {
            "forecast_period_days": forecast_period_days,
            "end_date": end_date.isoformat(),
            "opportunity_count": len(opportunities),
            "best_case": Decimal(str(best_case)),
            "weighted": Decimal(str(weighted)),
            "conservative": Decimal(str(conservative)),
            "monthly_breakdown": dict(monthly_forecast)
        }
