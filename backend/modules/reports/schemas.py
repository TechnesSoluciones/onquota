"""
Reports Pydantic Schemas
Data models for reports and analytics
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Literal
from uuid import UUID

from pydantic import BaseModel, Field, condecimal


# ============================================================================
# Base Schemas
# ============================================================================

class DatePeriod(BaseModel):
    """Date range for reports"""
    start_date: date
    end_date: date
    label: Optional[str] = None  # e.g., "Q1 2024", "January 2024"


class ComparisonMetrics(BaseModel):
    """Comparison metrics vs previous period"""
    previous_value: Decimal
    current_value: Decimal
    change_amount: Decimal
    change_percentage: float
    trend: Literal["up", "down", "neutral"]


class TrendPoint(BaseModel):
    """Single point in a trend chart"""
    date: date
    value: Decimal
    label: Optional[str] = None


# ============================================================================
# Common Filter Schemas
# ============================================================================

class ReportFiltersBase(BaseModel):
    """Base filters for all reports"""
    start_date: Optional[date] = Field(None, description="Start date for report")
    end_date: Optional[date] = Field(None, description="End date for report")
    client_id: Optional[UUID] = Field(None, description="Filter by specific client")
    sales_rep_id: Optional[UUID] = Field(None, description="Filter by sales rep")
    product_line_id: Optional[UUID] = Field(None, description="Filter by product line")
    currency: str = Field(default="USD", description="Currency for amounts")
    comparison_period: Optional[Literal["previous_period", "previous_year"]] = Field(
        None,
        description="Compare with previous period or year"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "currency": "USD",
                "comparison_period": "previous_period"
            }
        }


# ============================================================================
# Dashboard Executive Schemas
# ============================================================================

class DashboardKPIs(BaseModel):
    """Main KPIs for executive dashboard"""

    # Revenue metrics
    total_revenue: Decimal = Field(description="Total revenue from paid sales controls")
    revenue_growth: float = Field(description="Revenue growth % vs comparison period")

    # Quotations metrics
    active_quotations: int = Field(description="Number of active quotations (cotizado status)")
    quotations_value: Decimal = Field(description="Total value of active quotations")
    win_rate: float = Field(description="Win rate % (won / (won + lost))")

    # Pipeline metrics
    pipeline_value: Decimal = Field(description="Total value in pipeline (pending + in_production)")
    weighted_pipeline: Decimal = Field(description="Pipeline value weighted by probability")

    # Activity metrics
    visits_this_period: int = Field(description="Number of visits in period")
    new_clients: int = Field(description="Number of new clients added")

    # Efficiency metrics
    avg_sales_cycle_days: float = Field(description="Average days from quotation to payment")
    conversion_rate: float = Field(description="Overall conversion rate (visits to paid)")

    # Expenses metrics
    total_expenses: Decimal = Field(description="Total expenses in period")
    expense_to_revenue_ratio: float = Field(description="Expenses as % of revenue")


class SalesRepPerformance(BaseModel):
    """Sales representative performance metrics"""
    user_id: UUID
    user_name: str
    total_revenue: Decimal
    quotations_count: int
    won_count: int
    win_rate: float
    quota_achievement: Optional[float] = None  # If quotas exist


class ProductLineMetric(BaseModel):
    """Product line performance metrics"""
    product_line_id: UUID
    product_line_name: str
    total_sales: Decimal
    order_count: int
    percentage_of_total: float


class ClientRevenueMetric(BaseModel):
    """Client revenue metrics"""
    client_id: UUID
    client_name: str
    total_revenue: Decimal
    total_transactions: int
    avg_transaction_value: Decimal
    percentage_of_total: float


class DashboardAlert(BaseModel):
    """Alert for dashboard"""
    severity: Literal["info", "warning", "critical"]
    title: str
    message: str
    metric_value: Optional[str] = None
    threshold: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExecutiveDashboard(BaseModel):
    """Executive dashboard with all KPIs and insights"""
    period: DatePeriod

    # Main KPIs
    kpis: DashboardKPIs

    # Trends (last 12 months or period)
    revenue_trend: List[TrendPoint] = Field(default_factory=list)
    quotations_trend: List[TrendPoint] = Field(default_factory=list)
    visits_trend: List[TrendPoint] = Field(default_factory=list)

    # Top performers
    top_sales_reps: List[SalesRepPerformance] = Field(default_factory=list)
    top_clients: List[ClientRevenueMetric] = Field(default_factory=list)
    top_product_lines: List[ProductLineMetric] = Field(default_factory=list)

    # Alerts and notifications
    alerts: List[DashboardAlert] = Field(default_factory=list)

    # Metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    cache_key: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "period": {
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31",
                    "label": "January 2024"
                },
                "kpis": {
                    "total_revenue": 150000.00,
                    "revenue_growth": 15.5,
                    "active_quotations": 25,
                    "quotations_value": 200000.00,
                    "win_rate": 42.5,
                    "pipeline_value": 500000.00,
                    "weighted_pipeline": 300000.00,
                    "visits_this_period": 45,
                    "new_clients": 8,
                    "avg_sales_cycle_days": 28.5,
                    "conversion_rate": 35.0,
                    "total_expenses": 25000.00,
                    "expense_to_revenue_ratio": 16.7
                }
            }
        }


# ============================================================================
# Quotation Reports Schemas
# ============================================================================

class MonthlyConversionMetrics(BaseModel):
    """Monthly conversion metrics"""
    year: int
    month: int
    month_name: str
    total_quotations: int
    won_quotations: int
    lost_quotations: int
    win_rate: float
    total_amount: Decimal
    won_amount: Decimal


class QuotationConversionReport(BaseModel):
    """Quotation conversion analysis report"""
    period: DatePeriod

    # Main metrics
    total_quotations: int
    total_quoted_amount: Decimal

    won_quotations: int
    won_amount: Decimal
    won_percentage: float

    lost_quotations: int
    lost_amount: Decimal
    lost_percentage: float

    pending_quotations: int
    pending_amount: Decimal

    # Conversion to sales
    quotations_with_sales_control: int
    sales_controls_amount: Decimal
    conversion_rate: float

    # Time metrics
    avg_time_to_close_days: Optional[float] = None

    # Comparison
    comparison: Optional[ComparisonMetrics] = None

    # Monthly breakdown
    by_month: List[MonthlyConversionMetrics] = Field(default_factory=list)


# ============================================================================
# Sales Funnel Schemas
# ============================================================================

class SalesFunnelReport(BaseModel):
    """Complete sales funnel analysis"""
    period: DatePeriod

    # Stage 1: Visits
    total_visits: int
    unique_clients_visited: int

    # Stage 2: Quotations generated
    quotations_from_visits: int
    quotations_amount: Decimal
    visit_to_quotation_rate: float

    # Stage 3: Quotations won
    won_quotations: int
    won_amount: Decimal
    quotation_to_win_rate: float

    # Stage 4: Sales controls
    sales_controls_created: int
    sales_controls_amount: Decimal

    # Stage 5: Paid
    paid_sales_controls: int
    paid_amount: Decimal
    win_to_paid_rate: float

    # Overall metrics
    overall_conversion_rate: float
    avg_deal_size: Decimal
    avg_sales_cycle_days: float

    # Velocity metrics
    avg_visit_to_quotation_days: float
    avg_quotation_to_win_days: float
    avg_win_to_paid_days: float


# ============================================================================
# Export Schemas
# ============================================================================

class ExportRequest(BaseModel):
    """Request to export a report"""
    report_type: Literal[
        "executive_dashboard",
        "quotation_conversion",
        "sales_funnel",
        "top_clients",
        "visits_effectiveness"
    ]
    format: Literal["excel", "pdf"]
    filters: ReportFiltersBase
    include_charts: bool = Field(default=True, description="Include charts in export")


class ExportJob(BaseModel):
    """Export job status"""
    job_id: UUID
    status: Literal["pending", "processing", "completed", "failed"]
    report_type: str
    format: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None
    error_message: Optional[str] = None
