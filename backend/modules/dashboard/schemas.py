"""
Dashboard Schemas
Pydantic models for dashboard API responses
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Dict
from decimal import Decimal
from datetime import date


class KPIMetric(BaseModel):
    """Individual KPI metric with current and previous period comparison"""

    title: str = Field(..., description="KPI title")
    current_value: Decimal = Field(..., description="Current period value")
    previous_value: Decimal | None = Field(
        None, description="Previous period value for comparison"
    )
    change_percent: Decimal | None = Field(
        None, description="Percentage change from previous period"
    )
    is_positive: bool = Field(
        True, description="Whether the change is positive/favorable"
    )
    format_type: str = Field(
        "currency", description="Format type: currency, number, percentage"
    )


class DashboardKPIs(BaseModel):
    """Main dashboard KPIs response"""

    # Sales/Revenue KPIs
    total_revenue: KPIMetric = Field(..., description="Total revenue this month")
    monthly_quota: KPIMetric = Field(
        ..., description="Monthly quota achievement percentage"
    )
    conversion_rate: KPIMetric = Field(..., description="Quote conversion rate")

    # Client KPIs
    active_clients: KPIMetric = Field(..., description="Number of active clients")
    new_clients_this_month: KPIMetric = Field(
        ..., description="New clients acquired this month"
    )

    # Expense KPIs
    total_expenses: KPIMetric = Field(..., description="Total expenses this month")
    pending_approvals: KPIMetric = Field(
        ..., description="Number of pending expense approvals"
    )

    # Sales Pipeline KPIs
    quotes_sent: KPIMetric = Field(..., description="Quotes sent this month")
    quotes_accepted: KPIMetric = Field(..., description="Quotes accepted this month")


class MonthlyDataPoint(BaseModel):
    """Data point for monthly time series"""

    month: str = Field(..., description="Month in YYYY-MM format")
    value: Decimal = Field(..., description="Value for the month")
    label: str = Field(..., description="Display label (e.g., 'Ene 2025')")


class RevenueData(BaseModel):
    """Monthly revenue time series data"""

    current_year: List[MonthlyDataPoint] = Field(
        ..., description="Current year monthly data"
    )
    previous_year: List[MonthlyDataPoint] | None = Field(
        None, description="Previous year monthly data for comparison"
    )
    total_current_year: Decimal = Field(..., description="Total for current year")
    total_previous_year: Decimal | None = Field(
        None, description="Total for previous year"
    )


class ExpensesData(BaseModel):
    """Monthly expenses time series data"""

    current_year: List[MonthlyDataPoint] = Field(
        ..., description="Current year monthly data"
    )
    previous_year: List[MonthlyDataPoint] | None = Field(
        None, description="Previous year monthly data for comparison"
    )
    total_current_year: Decimal = Field(..., description="Total for current year")
    total_previous_year: Decimal | None = Field(
        None, description="Total for previous year"
    )

    # Breakdown by category
    by_category: List[Dict[str, Decimal]] = Field(
        default_factory=list, description="Expenses breakdown by category"
    )


class TopClient(BaseModel):
    """Top client by revenue"""

    client_id: str = Field(..., description="Client UUID")
    client_name: str = Field(..., description="Client name")
    total_revenue: Decimal = Field(..., description="Total revenue from client")
    quote_count: int = Field(..., description="Number of quotes")
    last_quote_date: date | None = Field(None, description="Date of last quote")


class TopClientsData(BaseModel):
    """Top clients ranked by revenue"""

    clients: List[TopClient] = Field(..., description="List of top clients")
    period: str = Field(
        "current_month", description="Period: current_month, current_year, all_time"
    )


class ActivityEvent(BaseModel):
    """Recent activity event"""

    id: str = Field(..., description="Event ID")
    type: str = Field(
        ..., description="Event type: quote_created, quote_accepted, expense_approved, client_created"
    )
    title: str = Field(..., description="Event title")
    description: str = Field(..., description="Event description")
    user_name: str | None = Field(None, description="User who triggered the event")
    timestamp: str = Field(..., description="Event timestamp ISO format")
    metadata: Dict | None = Field(None, description="Additional event metadata")


class RecentActivityData(BaseModel):
    """Recent system activity"""

    events: List[ActivityEvent] = Field(..., description="List of recent events")
    total_events: int = Field(..., description="Total number of events available")


class DashboardSummary(BaseModel):
    """Complete dashboard summary with all metrics"""

    # Overview metrics
    total_revenue_ytd: Decimal = Field(..., description="Year-to-date revenue")
    total_expenses_ytd: Decimal = Field(..., description="Year-to-date expenses")
    net_profit_ytd: Decimal = Field(..., description="Year-to-date net profit")
    profit_margin: Decimal = Field(..., description="Profit margin percentage")

    # Quick stats
    total_clients: int = Field(..., description="Total active clients")
    total_quotes: int = Field(..., description="Total quotes this year")
    total_expenses_count: int = Field(..., description="Total expenses this year")

    # Month-over-month comparison
    revenue_mom_change: Decimal = Field(
        ..., description="Month-over-month revenue change %"
    )
    expenses_mom_change: Decimal = Field(
        ..., description="Month-over-month expenses change %"
    )

    # Current month totals
    current_month_revenue: Decimal = Field(..., description="Current month revenue")
    current_month_expenses: Decimal = Field(..., description="Current month expenses")
    current_month_quotes: int = Field(..., description="Current month quotes count")
