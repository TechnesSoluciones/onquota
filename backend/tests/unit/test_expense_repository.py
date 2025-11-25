"""
Unit tests for expense repository
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from modules.expenses.repository import ExpenseRepository
from modules.auth.repository import AuthRepository
from models.expense import ExpenseStatus
from models.user import UserRole


@pytest.mark.asyncio
async def test_create_expense_category(db_session):
    """Test creating expense category"""
    # Create tenant first
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    # Create category
    repo = ExpenseRepository(db_session)
    category = await repo.create_category(
        tenant_id=tenant.id,
        name="Meals",
        description="Meal expenses",
        icon="utensils",
        color="#FF5733",
    )

    assert category.id is not None
    assert category.name == "Meals"
    assert category.description == "Meal expenses"
    assert category.icon == "utensils"
    assert category.color == "#FF5733"
    assert category.is_active is True


@pytest.mark.asyncio
async def test_list_expense_categories(db_session):
    """Test listing expense categories"""
    # Create tenant
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    # Create categories
    repo = ExpenseRepository(db_session)
    await repo.create_category(tenant_id=tenant.id, name="Travel")
    await repo.create_category(tenant_id=tenant.id, name="Meals")
    await repo.create_category(tenant_id=tenant.id, name="Office Supplies")

    # List all categories
    categories = await repo.list_categories(tenant_id=tenant.id)
    assert len(categories) == 3

    # Check order (should be alphabetical)
    assert categories[0].name == "Meals"
    assert categories[1].name == "Office Supplies"
    assert categories[2].name == "Travel"


@pytest.mark.asyncio
async def test_create_expense(db_session):
    """Test creating expense"""
    # Setup: Create tenant, user, and category
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    expense_repo = ExpenseRepository(db_session)
    category = await expense_repo.create_category(
        tenant_id=tenant.id,
        name="Travel",
    )

    # Create expense
    expense = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("150.75"),
        currency="USD",
        description="Flight to client meeting",
        expense_date=date.today(),
        category_id=category.id,
        vendor_name="Airline Inc",
    )

    assert expense.id is not None
    assert expense.amount == Decimal("150.75")
    assert expense.currency == "USD"
    assert expense.description == "Flight to client meeting"
    assert expense.category_id == category.id
    assert expense.status == ExpenseStatus.PENDING
    assert expense.vendor_name == "Airline Inc"


@pytest.mark.asyncio
async def test_get_expense_by_id(db_session):
    """Test getting expense by ID"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
    )

    expense_repo = ExpenseRepository(db_session)
    created_expense = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("50.00"),
        currency="USD",
        description="Lunch meeting",
        expense_date=date.today(),
    )

    # Get expense
    expense = await expense_repo.get_expense_by_id(
        created_expense.id,
        tenant.id,
        include_category=True,
    )

    assert expense is not None
    assert expense.id == created_expense.id
    assert expense.amount == Decimal("50.00")


@pytest.mark.asyncio
async def test_list_expenses_with_filters(db_session):
    """Test listing expenses with filters"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user1 = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="user1@example.com",
        password="Password123",
        full_name="User One",
    )
    user2 = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="user2@example.com",
        password="Password123",
        full_name="User Two",
    )

    expense_repo = ExpenseRepository(db_session)
    category = await expense_repo.create_category(tenant_id=tenant.id, name="Travel")

    # Create expenses
    today = date.today()
    yesterday = today - timedelta(days=1)

    await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user1.id,
        amount=Decimal("100.00"),
        currency="USD",
        description="Expense 1",
        expense_date=today,
        category_id=category.id,
    )

    await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user2.id,
        amount=Decimal("200.00"),
        currency="USD",
        description="Expense 2",
        expense_date=yesterday,
    )

    await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user1.id,
        amount=Decimal("50.00"),
        currency="USD",
        description="Expense 3",
        expense_date=today,
    )

    # Test: List all expenses
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        page=1,
        page_size=10,
    )
    assert total == 3
    assert len(expenses) == 3

    # Test: Filter by user
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        user_id=user1.id,
        page=1,
        page_size=10,
    )
    assert total == 2
    assert all(e.user_id == user1.id for e in expenses)

    # Test: Filter by category
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        category_id=category.id,
        page=1,
        page_size=10,
    )
    assert total == 1
    assert expenses[0].category_id == category.id

    # Test: Filter by date
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        date_from=today,
        date_to=today,
        page=1,
        page_size=10,
    )
    assert total == 2

    # Test: Filter by amount range
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        min_amount=Decimal("100.00"),
        page=1,
        page_size=10,
    )
    assert total == 2


@pytest.mark.asyncio
async def test_list_expenses_pagination(db_session):
    """Test expense list pagination"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
    )

    expense_repo = ExpenseRepository(db_session)

    # Create 25 expenses
    for i in range(25):
        await expense_repo.create_expense(
            tenant_id=tenant.id,
            user_id=user.id,
            amount=Decimal(f"{i + 1}.00"),
            currency="USD",
            description=f"Expense {i + 1}",
            expense_date=date.today(),
        )

    # Test: First page (10 items)
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        page=1,
        page_size=10,
    )
    assert total == 25
    assert len(expenses) == 10

    # Test: Second page (10 items)
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        page=2,
        page_size=10,
    )
    assert total == 25
    assert len(expenses) == 10

    # Test: Third page (5 items)
    expenses, total = await expense_repo.list_expenses(
        tenant_id=tenant.id,
        page=3,
        page_size=10,
    )
    assert total == 25
    assert len(expenses) == 5


@pytest.mark.asyncio
async def test_update_expense(db_session):
    """Test updating expense"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
    )

    expense_repo = ExpenseRepository(db_session)
    expense = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("100.00"),
        currency="USD",
        description="Original description",
        expense_date=date.today(),
    )

    # Update expense
    updated_expense = await expense_repo.update_expense(
        expense_id=expense.id,
        tenant_id=tenant.id,
        amount=Decimal("150.00"),
        description="Updated description",
    )

    assert updated_expense is not None
    assert updated_expense.amount == Decimal("150.00")
    assert updated_expense.description == "Updated description"


@pytest.mark.asyncio
async def test_update_expense_status(db_session):
    """Test updating expense status"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
    )
    supervisor = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="supervisor@example.com",
        password="Password123",
        full_name="Supervisor",
        role=UserRole.SUPERVISOR,
    )

    expense_repo = ExpenseRepository(db_session)
    expense = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("100.00"),
        currency="USD",
        description="Test expense",
        expense_date=date.today(),
    )

    # Approve expense
    approved_expense = await expense_repo.update_expense_status(
        expense_id=expense.id,
        tenant_id=tenant.id,
        status=ExpenseStatus.APPROVED,
        approved_by=supervisor.id,
    )

    assert approved_expense.status == ExpenseStatus.APPROVED
    assert approved_expense.approved_by == supervisor.id
    assert approved_expense.rejection_reason is None

    # Reject expense
    rejected_expense = await expense_repo.update_expense_status(
        expense_id=expense.id,
        tenant_id=tenant.id,
        status=ExpenseStatus.REJECTED,
        rejection_reason="Missing receipt",
    )

    assert rejected_expense.status == ExpenseStatus.REJECTED
    assert rejected_expense.rejection_reason == "Missing receipt"
    assert rejected_expense.approved_by is None


@pytest.mark.asyncio
async def test_delete_expense(db_session):
    """Test soft deleting expense"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
    )

    expense_repo = ExpenseRepository(db_session)
    expense = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("100.00"),
        currency="USD",
        description="Test expense",
        expense_date=date.today(),
    )

    # Delete expense
    success = await expense_repo.delete_expense(expense.id, tenant.id)
    assert success is True

    # Try to get deleted expense (should return None)
    deleted_expense = await expense_repo.get_expense_by_id(expense.id, tenant.id)
    assert deleted_expense is None


@pytest.mark.asyncio
async def test_get_expense_summary(db_session):
    """Test getting expense summary"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
    )
    supervisor = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="supervisor@example.com",
        password="Password123",
        full_name="Supervisor",
        role=UserRole.SUPERVISOR,
    )

    expense_repo = ExpenseRepository(db_session)

    # Create expenses with different statuses
    expense1 = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("100.00"),
        currency="USD",
        description="Expense 1",
        expense_date=date.today(),
    )

    expense2 = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("200.00"),
        currency="USD",
        description="Expense 2",
        expense_date=date.today(),
    )

    expense3 = await expense_repo.create_expense(
        tenant_id=tenant.id,
        user_id=user.id,
        amount=Decimal("50.00"),
        currency="USD",
        description="Expense 3",
        expense_date=date.today(),
    )

    # Approve one
    await expense_repo.update_expense_status(
        expense_id=expense1.id,
        tenant_id=tenant.id,
        status=ExpenseStatus.APPROVED,
        approved_by=supervisor.id,
    )

    # Reject one
    await expense_repo.update_expense_status(
        expense_id=expense2.id,
        tenant_id=tenant.id,
        status=ExpenseStatus.REJECTED,
        rejection_reason="Missing receipt",
    )

    # Get summary
    summary = await expense_repo.get_expense_summary(
        tenant_id=tenant.id,
        user_id=user.id,
    )

    assert summary["total_amount"] == Decimal("350.00")
    assert summary["total_count"] == 3
    assert summary["pending_count"] == 1
    assert summary["approved_count"] == 1
    assert summary["rejected_count"] == 1
