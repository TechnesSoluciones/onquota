"""
Dashboard Module Integration Tests
End-to-end tests for dashboard metrics and aggregations
"""
import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal

from models.quote import SaleStatus
from models.expense import ExpenseStatus
from modules.dashboard.repository import DashboardRepository
from tests.integration.conftest import (
    create_quote_data,
    create_expense_data,
)


@pytest.mark.asyncio
async def test_dashboard_kpis_with_real_data(
    db_session, setup_test_data, sales_repo, expense_repo
):
    """
    Test 1: Get KPIs with real data
    Verifies: KPI calculations with actual quotes and expenses
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)

    # Create accepted quotes (revenue)
    await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.ACCEPTED,
        )
    )
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client2"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-ACC-002",
        total_amount=Decimal("2000.00"),
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.ACCEPTED,
    )

    # Create expenses
    await expense_repo.create_expense(
        **create_expense_data(
            data["tenant"].id,
            data["sales_rep1"].id,
            data["category1"].id,
            ExpenseStatus.APPROVED,
        )
    )

    # Get KPIs
    kpis = await dashboard_repo.get_kpis(data["tenant"].id)

    # Verify KPIs have data
    assert kpis.total_revenue.current_value >= Decimal("3000.00")
    assert kpis.total_expenses.current_value >= Decimal("250.00")
    assert kpis.active_clients.current_value >= 2
    assert kpis.quotes_accepted.current_value >= 2


@pytest.mark.asyncio
async def test_revenue_monthly_yoy_comparison(
    db_session, setup_test_data, sales_repo
):
    """
    Test 2: Get monthly revenue with year-over-year comparison
    Verifies: Monthly aggregation and YoY data
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)
    current_year = datetime.now().year

    # Create quotes for current year
    for month in range(1, 4):  # Jan, Feb, Mar
        await sales_repo.create_quote(
            tenant_id=data["tenant"].id,
            client_id=data["client1"].id,
            sales_rep_id=data["sales_rep1"].id,
            quote_number=f"QUOT-{current_year}-{month:02d}-001",
            total_amount=Decimal(str(1000 * month)),
            currency="USD",
            valid_until=date(current_year, month, 28) + timedelta(days=30),
            status=SaleStatus.ACCEPTED,
            created_at=datetime(current_year, month, 15),
        )

    # Get revenue data
    revenue_data = await dashboard_repo.get_revenue_monthly(
        data["tenant"].id, current_year
    )

    # Verify data structure
    assert len(revenue_data.current_year) == 12
    assert revenue_data.current_year[0].month == f"{current_year}-01"
    assert revenue_data.current_year[1].month == f"{current_year}-02"
    assert revenue_data.current_year[2].month == f"{current_year}-03"

    # Verify totals
    assert revenue_data.total_current_year >= Decimal("6000.00")  # 1000+2000+3000


@pytest.mark.asyncio
async def test_expenses_monthly_yoy_comparison(
    db_session, setup_test_data, expense_repo
):
    """
    Test 3: Get monthly expenses with year-over-year comparison
    Verifies: Monthly expense aggregation
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)
    current_year = datetime.now().year

    # Create expenses for current year
    for month in range(1, 4):  # Jan, Feb, Mar
        await expense_repo.create_expense(
            tenant_id=data["tenant"].id,
            user_id=data["sales_rep1"].id,
            category_id=data["category1"].id,
            amount=Decimal(str(500 * month)),
            currency="USD",
            date=date(current_year, month, 15),
            description=f"Expense for month {month}",
            status=ExpenseStatus.APPROVED,
        )

    # Get expenses data
    expenses_data = await dashboard_repo.get_expenses_monthly(
        data["tenant"].id, current_year
    )

    # Verify data structure
    assert len(expenses_data.current_year) == 12
    assert expenses_data.total_current_year >= Decimal("3000.00")  # 500+1000+1500


@pytest.mark.asyncio
async def test_top_clients_ranking(db_session, setup_test_data, sales_repo):
    """
    Test 4: Get top clients by revenue
    Verifies: Client ranking calculation
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)

    # Create quotes for different clients with different amounts
    # Client 1: $5000 total
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-C1-001",
        total_amount=Decimal("3000.00"),
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.ACCEPTED,
    )
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-C1-002",
        total_amount=Decimal("2000.00"),
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.ACCEPTED,
    )

    # Client 2: $3500 total
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client2"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-C2-001",
        total_amount=Decimal("3500.00"),
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.ACCEPTED,
    )

    # Get top clients
    top_clients = await dashboard_repo.get_top_clients(
        data["tenant"].id, limit=10, period="current_year"
    )

    # Verify ranking
    assert len(top_clients.clients) >= 2
    # Client 1 should be first (highest revenue)
    assert top_clients.clients[0].client_id == str(data["client1"].id)
    assert top_clients.clients[0].total_revenue == Decimal("5000.00")
    assert top_clients.clients[0].quote_count == 2
    # Client 2 should be second
    assert top_clients.clients[1].client_id == str(data["client2"].id)
    assert top_clients.clients[1].total_revenue == Decimal("3500.00")


@pytest.mark.asyncio
async def test_recent_activity_timeline(
    db_session, setup_test_data, sales_repo, client_repo
):
    """
    Test 5: Get recent activity timeline
    Verifies: Activity events aggregation and ordering
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)

    # Create various activities
    # Create quote
    quote = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.DRAFT,
        )
    )

    # Create client
    new_client = await client_repo.create_client(
        tenant_id=data["tenant"].id,
        name="New Activity Client",
        tax_id="TAX999",
        email="activity@test.com",
        phone="+1234567899",
        address="999 Activity St",
        city="Activity City",
        country="USA",
    )

    # Get recent activity
    activity = await dashboard_repo.get_recent_activity(
        data["tenant"].id, limit=10
    )

    # Verify activity events
    assert len(activity.events) > 0
    assert activity.total_events > 0

    # Verify events have required fields
    first_event = activity.events[0]
    assert first_event.id is not None
    assert first_event.type in [
        "quote_created",
        "quote_accepted",
        "client_created",
        "expense_approved",
    ]
    assert first_event.title is not None
    assert first_event.timestamp is not None


@pytest.mark.asyncio
async def test_dashboard_summary(db_session, setup_test_data, sales_repo, expense_repo):
    """
    Test 6: Get complete dashboard summary
    Verifies: Comprehensive summary with YTD metrics
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)

    # Create data
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-SUM-001",
        total_amount=Decimal("5000.00"),
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.ACCEPTED,
    )

    await expense_repo.create_expense(
        tenant_id=data["tenant"].id,
        user_id=data["sales_rep1"].id,
        category_id=data["category1"].id,
        amount=Decimal("1000.00"),
        currency="USD",
        date=date.today(),
        description="Summary test expense",
        status=ExpenseStatus.APPROVED,
    )

    # Get summary
    summary = await dashboard_repo.get_summary(data["tenant"].id)

    # Verify summary structure
    assert summary.total_revenue_ytd >= Decimal("5000.00")
    assert summary.total_expenses_ytd >= Decimal("1000.00")
    assert summary.net_profit_ytd >= Decimal("4000.00")
    assert summary.profit_margin > Decimal("0")
    assert summary.total_clients >= 2


@pytest.mark.asyncio
async def test_conversion_rate_calculation(
    db_session, setup_test_data, sales_repo
):
    """
    Test 7: Verify conversion rate calculation
    Verifies: Conversion rate = accepted / (sent + accepted) * 100
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)

    # Create quotes: 2 sent, 3 accepted = 60% conversion
    await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.SENT,
        )
    )
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client2"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-SENT-002",
        total_amount=Decimal("1000.00"),
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.SENT,
    )

    for i in range(3):
        await sales_repo.create_quote(
            tenant_id=data["tenant"].id,
            client_id=data["client1"].id,
            sales_rep_id=data["sales_rep1"].id,
            quote_number=f"QUOT-2025-ACC-{i+1}",
            total_amount=Decimal("1000.00"),
            currency="USD",
            valid_until=date.today() + timedelta(days=30),
            status=SaleStatus.ACCEPTED,
        )

    # Get KPIs
    kpis = await dashboard_repo.get_kpis(data["tenant"].id)

    # Verify conversion rate (3 accepted / 5 total = 60%)
    assert kpis.conversion_rate.current_value == Decimal("60.00")


@pytest.mark.asyncio
async def test_month_over_month_changes(
    db_session, setup_test_data, sales_repo, expense_repo
):
    """
    Test 8: Verify Month-over-Month change calculations
    Verifies: MoM percentage change calculations
    """
    data = await setup_test_data
    dashboard_repo = DashboardRepository(db_session)
    current_date = datetime.now()
    current_month = current_date.month
    current_year = current_date.year

    # Previous month data
    if current_month == 1:
        prev_month = 12
        prev_year = current_year - 1
    else:
        prev_month = current_month - 1
        prev_year = current_year

    # Create quote for previous month (1000)
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number=f"QUOT-{prev_year}-{prev_month:02d}-001",
        total_amount=Decimal("1000.00"),
        currency="USD",
        valid_until=date(prev_year, prev_month, 15) + timedelta(days=30),
        status=SaleStatus.ACCEPTED,
        created_at=datetime(prev_year, prev_month, 15),
    )

    # Create quote for current month (1500) - 50% increase
    await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number=f"QUOT-{current_year}-{current_month:02d}-001",
        total_amount=Decimal("1500.00"),
        currency="USD",
        valid_until=date(current_year, current_month, 15) + timedelta(days=30),
        status=SaleStatus.ACCEPTED,
        created_at=datetime(current_year, current_month, 15),
    )

    # Get summary
    summary = await dashboard_repo.get_summary(data["tenant"].id)

    # Verify MoM change is calculated
    assert summary.revenue_mom_change == Decimal("50.00")  # 50% increase
