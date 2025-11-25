"""
Unit tests for DashboardRepository
Tests KPI calculations, aggregations, and dashboard metrics
"""
import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from modules.dashboard.repository import DashboardRepository
from models.tenant import Tenant
from models.user import User
from models.client import Client, ClientStatus
from models.quote import Quote, SaleStatus
from models.quote_item import QuoteItem
from models.expense import Expense, ExpenseStatus, ExpenseCategory


@pytest.fixture
async def tenant(db_session: AsyncSession) -> Tenant:
    """Create a test tenant"""
    tenant = Tenant(
        id=uuid4(),
        name="Dashboard Test Company",
        subdomain="dashboard-test",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest.fixture
async def user(db_session: AsyncSession, tenant: Tenant) -> User:
    """Create a test user"""
    user = User(
        id=uuid4(),
        tenant_id=tenant.id,
        email="user@test.com",
        username="test_user",
        hashed_password="hashed_password",
        role="user",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def client(db_session: AsyncSession, tenant: Tenant) -> Client:
    """Create a test client"""
    client = Client(
        id=uuid4(),
        tenant_id=tenant.id,
        name="Dashboard Test Client",
        email="client@test.com",
        phone="555-1234",
        address="123 Test St",
        city="Test City",
        status=ClientStatus.ACTIVE,
    )
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    return client


@pytest.fixture
async def expense_category(db_session: AsyncSession, tenant: Tenant) -> ExpenseCategory:
    """Create a test expense category"""
    category = ExpenseCategory(
        id=uuid4(),
        tenant_id=tenant.id,
        name="Travel",
        description="Travel expenses",
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest.fixture
def repo(db_session: AsyncSession) -> DashboardRepository:
    """Create repository instance"""
    return DashboardRepository(db_session)


# ========================================================================
# HELPER METHODS TESTS
# ========================================================================


class TestHelperMethods:
    """Test suite for dashboard helper methods"""

    def test_get_month_label(self, repo: DashboardRepository):
        """Test month label generation in Spanish"""
        # Act & Assert
        assert repo._get_month_label(2025, 1) == "Ene 2025"
        assert repo._get_month_label(2025, 6) == "Jun 2025"
        assert repo._get_month_label(2025, 12) == "Dic 2025"

    def test_calculate_change_percent_increase(self, repo: DashboardRepository):
        """Test percentage change calculation for increase"""
        # Arrange
        current = Decimal("150.00")
        previous = Decimal("100.00")

        # Act
        change = repo._calculate_change_percent(current, previous)

        # Assert
        assert change == Decimal("50.00")

    def test_calculate_change_percent_decrease(self, repo: DashboardRepository):
        """Test percentage change calculation for decrease"""
        # Arrange
        current = Decimal("75.00")
        previous = Decimal("100.00")

        # Act
        change = repo._calculate_change_percent(current, previous)

        # Assert
        assert change == Decimal("-25.00")

    def test_calculate_change_percent_zero_previous(self, repo: DashboardRepository):
        """Test percentage change when previous value is zero"""
        # Arrange
        current = Decimal("100.00")
        previous = Decimal("0")

        # Act
        change = repo._calculate_change_percent(current, previous)

        # Assert
        assert change is None

    def test_calculate_change_percent_none_previous(self, repo: DashboardRepository):
        """Test percentage change when previous value is None"""
        # Arrange
        current = Decimal("100.00")
        previous = None

        # Act
        change = repo._calculate_change_percent(current, previous)

        # Assert
        assert change is None

    def test_get_date_ranges(self, repo: DashboardRepository):
        """Test date ranges calculation"""
        # Act
        dates = repo._get_date_ranges()

        # Assert
        assert "current_month_start" in dates
        assert "current_year_start" in dates
        assert "prev_month_start" in dates
        assert "prev_month_end" in dates
        assert "now" in dates

        # Verify current_year_start is January 1st
        assert dates["current_year_start"].month == 1
        assert dates["current_year_start"].day == 1

        # Verify current_month_start is first day of current month
        now = datetime.now()
        assert dates["current_month_start"].month == now.month
        assert dates["current_month_start"].day == 1


# ========================================================================
# KPI TESTS
# ========================================================================


class TestKPICalculations:
    """Test suite for KPI calculations"""

    @pytest.mark.asyncio
    async def test_get_revenue_with_accepted_quotes(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        db_session: AsyncSession,
    ):
        """Test revenue calculation from accepted quotes"""
        # Arrange
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)

        quote = Quote(
            id=uuid4(),
            tenant_id=tenant.id,
            client_id=client.id,
            quote_number="Q-001",
            total_amount=Decimal("1000.00"),
            status=SaleStatus.ACCEPTED,
            created_at=now,
        )
        db_session.add(quote)
        await db_session.commit()

        # Act
        revenue = await repo._get_revenue(tenant.id, month_start, now)

        # Assert
        assert revenue == Decimal("1000.00")

    @pytest.mark.asyncio
    async def test_get_revenue_excludes_non_accepted_quotes(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        db_session: AsyncSession,
    ):
        """Test that revenue only includes accepted quotes"""
        # Arrange
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)

        # Create quotes with different statuses
        for status in [SaleStatus.DRAFT, SaleStatus.SENT, SaleStatus.REJECTED]:
            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-{status.value}",
                total_amount=Decimal("1000.00"),
                status=status,
                created_at=now,
            )
            db_session.add(quote)

        await db_session.commit()

        # Act
        revenue = await repo._get_revenue(tenant.id, month_start, now)

        # Assert
        assert revenue == Decimal("0")

    @pytest.mark.asyncio
    async def test_get_active_clients_count(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        db_session: AsyncSession,
    ):
        """Test active clients count"""
        # Arrange
        for i in range(3):
            client = Client(
                id=uuid4(),
                tenant_id=tenant.id,
                name=f"Client {i}",
                email=f"client{i}@test.com",
                phone="555-0000",
                address="Address",
                city="City",
                status=ClientStatus.ACTIVE,
            )
            db_session.add(client)

        # Add inactive client
        inactive = Client(
            id=uuid4(),
            tenant_id=tenant.id,
            name="Inactive Client",
            email="inactive@test.com",
            phone="555-9999",
            address="Address",
            city="City",
            status=ClientStatus.INACTIVE,
        )
        db_session.add(inactive)
        await db_session.commit()

        # Act
        count = await repo._get_active_clients_count(tenant.id)

        # Assert
        assert count == 3

    @pytest.mark.asyncio
    async def test_get_new_clients_count_in_period(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        db_session: AsyncSession,
    ):
        """Test counting new clients in specific period"""
        # Arrange
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)
        last_month = month_start - timedelta(days=1)

        # Create client this month
        current_client = Client(
            id=uuid4(),
            tenant_id=tenant.id,
            name="Current Month Client",
            email="current@test.com",
            phone="555-1111",
            address="Address",
            city="City",
            created_at=now,
        )
        db_session.add(current_client)

        # Create client last month
        old_client = Client(
            id=uuid4(),
            tenant_id=tenant.id,
            name="Old Client",
            email="old@test.com",
            phone="555-2222",
            address="Address",
            city="City",
            created_at=last_month,
        )
        db_session.add(old_client)
        await db_session.commit()

        # Act
        count = await repo._get_new_clients_count(tenant.id, month_start, now)

        # Assert
        assert count == 1

    @pytest.mark.asyncio
    async def test_get_expenses_total_approved_only(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        user: User,
        expense_category: ExpenseCategory,
        db_session: AsyncSession,
    ):
        """Test that expenses total only includes approved expenses"""
        # Arrange
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)
        today = date.today()

        # Create approved expense
        approved = Expense(
            id=uuid4(),
            tenant_id=tenant.id,
            employee_id=user.id,
            category_id=expense_category.id,
            amount=Decimal("500.00"),
            description="Approved expense",
            date=today,
            status=ExpenseStatus.APPROVED,
        )
        db_session.add(approved)

        # Create pending expense
        pending = Expense(
            id=uuid4(),
            tenant_id=tenant.id,
            employee_id=user.id,
            category_id=expense_category.id,
            amount=Decimal("300.00"),
            description="Pending expense",
            date=today,
            status=ExpenseStatus.PENDING,
        )
        db_session.add(pending)
        await db_session.commit()

        # Act
        total = await repo._get_expenses_total(tenant.id, month_start, now)

        # Assert
        assert total == Decimal("500.00")

    @pytest.mark.asyncio
    async def test_get_pending_approvals_count(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        user: User,
        expense_category: ExpenseCategory,
        db_session: AsyncSession,
    ):
        """Test counting pending expense approvals"""
        # Arrange
        today = date.today()

        for i in range(3):
            expense = Expense(
                id=uuid4(),
                tenant_id=tenant.id,
                employee_id=user.id,
                category_id=expense_category.id,
                amount=Decimal("100.00"),
                description=f"Pending {i}",
                date=today,
                status=ExpenseStatus.PENDING,
            )
            db_session.add(expense)

        approved = Expense(
            id=uuid4(),
            tenant_id=tenant.id,
            employee_id=user.id,
            category_id=expense_category.id,
            amount=Decimal("200.00"),
            description="Approved",
            date=today,
            status=ExpenseStatus.APPROVED,
        )
        db_session.add(approved)
        await db_session.commit()

        # Act
        count = await repo._get_pending_approvals_count(tenant.id)

        # Assert
        assert count == 3

    @pytest.mark.asyncio
    async def test_get_conversion_rate(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        db_session: AsyncSession,
    ):
        """Test quote conversion rate calculation"""
        # Arrange
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)

        # Create 10 sent quotes, 3 accepted
        for i in range(7):
            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-SENT-{i}",
                total_amount=Decimal("1000.00"),
                status=SaleStatus.SENT,
                created_at=now,
            )
            db_session.add(quote)

        for i in range(3):
            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-ACCEPTED-{i}",
                total_amount=Decimal("1000.00"),
                status=SaleStatus.ACCEPTED,
                created_at=now,
            )
            db_session.add(quote)

        await db_session.commit()

        # Act
        conversion = await repo._get_conversion_rate(tenant.id, month_start, now)

        # Assert
        # 3 accepted out of 10 total (sent + accepted) = 30%
        assert conversion == Decimal("30.00")

    @pytest.mark.asyncio
    async def test_get_conversion_rate_no_quotes(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
    ):
        """Test conversion rate when no quotes exist"""
        # Arrange
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)

        # Act
        conversion = await repo._get_conversion_rate(tenant.id, month_start, now)

        # Assert
        assert conversion == Decimal("0")

    @pytest.mark.asyncio
    async def test_get_kpis_structure(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
    ):
        """Test that get_kpis returns proper structure"""
        # Act
        kpis = await repo.get_kpis(tenant.id)

        # Assert
        assert kpis.total_revenue is not None
        assert kpis.monthly_quota is not None
        assert kpis.conversion_rate is not None
        assert kpis.active_clients is not None
        assert kpis.new_clients_this_month is not None
        assert kpis.total_expenses is not None
        assert kpis.pending_approvals is not None
        assert kpis.quotes_sent is not None
        assert kpis.quotes_accepted is not None

        # Verify format types
        assert kpis.total_revenue.format_type == "currency"
        assert kpis.conversion_rate.format_type == "percentage"
        assert kpis.active_clients.format_type == "number"


# ========================================================================
# MONTHLY DATA TESTS
# ========================================================================


class TestMonthlyData:
    """Test suite for monthly data aggregations"""

    @pytest.mark.asyncio
    async def test_get_monthly_revenue_by_year(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        db_session: AsyncSession,
    ):
        """Test monthly revenue aggregation for a year"""
        # Arrange
        year = 2024

        # Create quotes in different months
        for month in [1, 3, 6]:
            quote_date = datetime(year, month, 15)
            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-{year}-{month}",
                total_amount=Decimal("1000.00"),
                status=SaleStatus.ACCEPTED,
                created_at=quote_date,
            )
            db_session.add(quote)

        await db_session.commit()

        # Act
        data = await repo._get_monthly_revenue_by_year(tenant.id, year)

        # Assert
        assert len(data) == 12  # All 12 months
        assert data[0].value == Decimal("1000.00")  # January
        assert data[1].value == Decimal("0")  # February
        assert data[2].value == Decimal("1000.00")  # March
        assert data[5].value == Decimal("1000.00")  # June

    @pytest.mark.asyncio
    async def test_get_revenue_monthly_with_comparison(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        db_session: AsyncSession,
    ):
        """Test revenue monthly data with year-over-year comparison"""
        # Arrange
        current_year = datetime.now().year
        previous_year = current_year - 1

        # Create quotes for both years
        for year in [current_year, previous_year]:
            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-{year}",
                total_amount=Decimal("5000.00"),
                status=SaleStatus.ACCEPTED,
                created_at=datetime(year, 6, 15),
            )
            db_session.add(quote)

        await db_session.commit()

        # Act
        data = await repo.get_revenue_monthly(tenant.id, current_year)

        # Assert
        assert data.current_year is not None
        assert data.previous_year is not None
        assert data.total_current_year == Decimal("5000.00")
        assert data.total_previous_year == Decimal("5000.00")

    @pytest.mark.asyncio
    async def test_get_monthly_expenses_by_year(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        user: User,
        expense_category: ExpenseCategory,
        db_session: AsyncSession,
    ):
        """Test monthly expenses aggregation for a year"""
        # Arrange
        year = 2024

        # Create expenses in different months
        for month in [2, 4, 8]:
            expense_date = date(year, month, 15)
            expense = Expense(
                id=uuid4(),
                tenant_id=tenant.id,
                employee_id=user.id,
                category_id=expense_category.id,
                amount=Decimal("500.00"),
                description=f"Expense {month}",
                date=expense_date,
                status=ExpenseStatus.APPROVED,
            )
            db_session.add(expense)

        await db_session.commit()

        # Act
        data = await repo._get_monthly_expenses_by_year(tenant.id, year)

        # Assert
        assert len(data) == 12
        assert data[1].value == Decimal("500.00")  # February
        assert data[3].value == Decimal("500.00")  # April
        assert data[7].value == Decimal("500.00")  # August

    @pytest.mark.asyncio
    async def test_get_expenses_monthly_structure(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
    ):
        """Test expenses monthly data structure"""
        # Arrange
        year = datetime.now().year

        # Act
        data = await repo.get_expenses_monthly(tenant.id, year)

        # Assert
        assert data.current_year is not None
        assert len(data.current_year) == 12
        assert data.by_category is not None  # May be empty
        assert isinstance(data.total_current_year, Decimal)


# ========================================================================
# TOP CLIENTS TESTS
# ========================================================================


class TestTopClients:
    """Test suite for top clients rankings"""

    @pytest.mark.asyncio
    async def test_get_top_clients_by_revenue(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        db_session: AsyncSession,
    ):
        """Test top clients ranking by revenue"""
        # Arrange
        now = datetime.now()

        # Create clients with different revenue
        revenues = [5000, 3000, 1000]
        for i, revenue in enumerate(revenues):
            client = Client(
                id=uuid4(),
                tenant_id=tenant.id,
                name=f"Client {i}",
                email=f"client{i}@test.com",
                phone="555-0000",
                address="Address",
                city="City",
            )
            db_session.add(client)
            await db_session.flush()

            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-{i}",
                total_amount=Decimal(str(revenue)),
                status=SaleStatus.ACCEPTED,
                created_at=now,
            )
            db_session.add(quote)

        await db_session.commit()

        # Act
        data = await repo.get_top_clients(tenant.id, limit=10, period="all_time")

        # Assert
        assert len(data.clients) == 3
        # Verify sorted by revenue descending
        assert data.clients[0].total_revenue == Decimal("5000")
        assert data.clients[1].total_revenue == Decimal("3000")
        assert data.clients[2].total_revenue == Decimal("1000")

    @pytest.mark.asyncio
    async def test_get_top_clients_period_filter(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        db_session: AsyncSession,
    ):
        """Test top clients with period filter"""
        # Arrange
        now = datetime.now()
        last_year = now - timedelta(days=400)

        client = Client(
            id=uuid4(),
            tenant_id=tenant.id,
            name="Recent Client",
            email="recent@test.com",
            phone="555-0000",
            address="Address",
            city="City",
        )
        db_session.add(client)
        await db_session.flush()

        # Recent quote
        recent_quote = Quote(
            id=uuid4(),
            tenant_id=tenant.id,
            client_id=client.id,
            quote_number="Q-RECENT",
            total_amount=Decimal("1000.00"),
            status=SaleStatus.ACCEPTED,
            created_at=now,
        )
        db_session.add(recent_quote)

        # Old quote
        old_quote = Quote(
            id=uuid4(),
            tenant_id=tenant.id,
            client_id=client.id,
            quote_number="Q-OLD",
            total_amount=Decimal("5000.00"),
            status=SaleStatus.ACCEPTED,
            created_at=last_year,
        )
        db_session.add(old_quote)
        await db_session.commit()

        # Act
        data_year = await repo.get_top_clients(
            tenant.id, limit=10, period="current_year"
        )

        # Assert
        # Should only include recent quote
        assert len(data_year.clients) == 1
        assert data_year.clients[0].total_revenue == Decimal("1000.00")

    @pytest.mark.asyncio
    async def test_get_top_clients_limit(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        db_session: AsyncSession,
    ):
        """Test top clients respects limit parameter"""
        # Arrange
        now = datetime.now()

        # Create 15 clients
        for i in range(15):
            client = Client(
                id=uuid4(),
                tenant_id=tenant.id,
                name=f"Client {i}",
                email=f"client{i}@test.com",
                phone="555-0000",
                address="Address",
                city="City",
            )
            db_session.add(client)
            await db_session.flush()

            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-{i}",
                total_amount=Decimal("1000.00"),
                status=SaleStatus.ACCEPTED,
                created_at=now,
            )
            db_session.add(quote)

        await db_session.commit()

        # Act
        data = await repo.get_top_clients(tenant.id, limit=5, period="all_time")

        # Assert
        assert len(data.clients) == 5


# ========================================================================
# RECENT ACTIVITY TESTS
# ========================================================================


class TestRecentActivity:
    """Test suite for recent activity feed"""

    @pytest.mark.asyncio
    async def test_get_recent_activity_includes_quotes(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        db_session: AsyncSession,
    ):
        """Test recent activity includes quote events"""
        # Arrange
        quote = Quote(
            id=uuid4(),
            tenant_id=tenant.id,
            client_id=client.id,
            quote_number="Q-ACTIVITY",
            total_amount=Decimal("1000.00"),
            status=SaleStatus.SENT,
        )
        db_session.add(quote)
        await db_session.commit()

        # Act
        activity = await repo.get_recent_activity(tenant.id, limit=20)

        # Assert
        assert len(activity.events) > 0
        quote_events = [e for e in activity.events if e.type == "quote_created"]
        assert len(quote_events) > 0
        assert "Q-ACTIVITY" in quote_events[0].metadata["quote_number"]

    @pytest.mark.asyncio
    async def test_get_recent_activity_includes_clients(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        db_session: AsyncSession,
    ):
        """Test recent activity includes client events"""
        # Arrange
        client = Client(
            id=uuid4(),
            tenant_id=tenant.id,
            name="New Activity Client",
            email="activity@test.com",
            phone="555-0000",
            address="Address",
            city="City",
        )
        db_session.add(client)
        await db_session.commit()

        # Act
        activity = await repo.get_recent_activity(tenant.id, limit=20)

        # Assert
        client_events = [e for e in activity.events if e.type == "client_created"]
        assert len(client_events) > 0

    @pytest.mark.asyncio
    async def test_get_recent_activity_limit(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        db_session: AsyncSession,
    ):
        """Test recent activity respects limit parameter"""
        # Arrange
        for i in range(30):
            quote = Quote(
                id=uuid4(),
                tenant_id=tenant.id,
                client_id=client.id,
                quote_number=f"Q-{i}",
                total_amount=Decimal("1000.00"),
                status=SaleStatus.SENT,
            )
            db_session.add(quote)

        await db_session.commit()

        # Act
        activity = await repo.get_recent_activity(tenant.id, limit=10)

        # Assert
        assert len(activity.events) <= 10


# ========================================================================
# DASHBOARD SUMMARY TESTS
# ========================================================================


class TestDashboardSummary:
    """Test suite for complete dashboard summary"""

    @pytest.mark.asyncio
    async def test_get_summary_structure(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
    ):
        """Test dashboard summary returns complete structure"""
        # Act
        summary = await repo.get_summary(tenant.id)

        # Assert
        assert summary.total_revenue_ytd is not None
        assert summary.total_expenses_ytd is not None
        assert summary.net_profit_ytd is not None
        assert summary.profit_margin is not None
        assert summary.total_clients is not None
        assert summary.total_quotes is not None
        assert summary.total_expenses_count is not None
        assert summary.revenue_mom_change is not None
        assert summary.expenses_mom_change is not None
        assert summary.current_month_revenue is not None
        assert summary.current_month_expenses is not None
        assert summary.current_month_quotes is not None

    @pytest.mark.asyncio
    async def test_get_summary_profit_calculation(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
        client: Client,
        user: User,
        expense_category: ExpenseCategory,
        db_session: AsyncSession,
    ):
        """Test net profit and profit margin calculation"""
        # Arrange
        now = datetime.now()
        year_start = datetime(now.year, 1, 1)
        today = date.today()

        # Create revenue
        quote = Quote(
            id=uuid4(),
            tenant_id=tenant.id,
            client_id=client.id,
            quote_number="Q-PROFIT",
            total_amount=Decimal("10000.00"),
            status=SaleStatus.ACCEPTED,
            created_at=now,
        )
        db_session.add(quote)

        # Create expense
        expense = Expense(
            id=uuid4(),
            tenant_id=tenant.id,
            employee_id=user.id,
            category_id=expense_category.id,
            amount=Decimal("2000.00"),
            description="Expense",
            date=today,
            status=ExpenseStatus.APPROVED,
        )
        db_session.add(expense)
        await db_session.commit()

        # Act
        summary = await repo.get_summary(tenant.id)

        # Assert
        assert summary.total_revenue_ytd == Decimal("10000.00")
        assert summary.total_expenses_ytd == Decimal("2000.00")
        assert summary.net_profit_ytd == Decimal("8000.00")
        # Profit margin = (8000 / 10000) * 100 = 80%
        assert summary.profit_margin == Decimal("80.00")

    @pytest.mark.asyncio
    async def test_get_summary_zero_revenue_profit_margin(
        self,
        repo: DashboardRepository,
        tenant: Tenant,
    ):
        """Test profit margin when revenue is zero"""
        # Act
        summary = await repo.get_summary(tenant.id)

        # Assert
        assert summary.profit_margin == Decimal("0")
