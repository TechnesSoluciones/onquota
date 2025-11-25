"""
Unit tests for sales/quotes repository
Tests CRUD operations, status transitions, item management, and RBAC
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from modules.sales.repository import SalesRepository
from modules.auth.repository import AuthRepository
from modules.clients.repository import ClientRepository
from models.quote import SaleStatus
from models.client import ClientStatus
from models.user import UserRole


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
async def setup_tenant_and_users(db_session):
    """Create tenant and users for testing"""
    auth_repo = AuthRepository(db_session)

    # Create tenant
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    # Create users with different roles
    admin = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="admin@test.com",
        password="Password123",
        full_name="Admin User",
        role=UserRole.ADMIN,
    )

    supervisor = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="supervisor@test.com",
        password="Password123",
        full_name="Supervisor User",
        role=UserRole.SUPERVISOR,
    )

    sales_rep1 = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="rep1@test.com",
        password="Password123",
        full_name="Sales Rep 1",
        role=UserRole.SALES_REP,
    )

    sales_rep2 = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="rep2@test.com",
        password="Password123",
        full_name="Sales Rep 2",
        role=UserRole.SALES_REP,
    )

    return {
        "tenant": tenant,
        "admin": admin,
        "supervisor": supervisor,
        "sales_rep1": sales_rep1,
        "sales_rep2": sales_rep2,
    }


@pytest.fixture
async def setup_client(db_session, setup_tenant_and_users):
    """Create test client"""
    data = await setup_tenant_and_users
    client_repo = ClientRepository(db_session)

    client = await client_repo.create_client(
        tenant_id=data["tenant"].id,
        name="Test Client Corp",
        tax_id="123456789",
        email="client@example.com",
        phone="+1234567890",
        address="123 Test St",
        city="Test City",
        country="Test Country",
        status=ClientStatus.ACTIVE,
    )

    data["client"] = client
    return data


# ============================================================================
# Quote CRUD Tests
# ============================================================================


@pytest.mark.asyncio
async def test_create_quote(db_session, setup_client):
    """Test creating a quote with items"""
    data = await setup_client
    repo = SalesRepository(db_session)

    # Create quote
    quote = await repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-0001",
        total_amount=Decimal("1000.00"),
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.DRAFT,
        notes="Test quote",
    )

    assert quote.id is not None
    assert quote.quote_number == "QUOT-2025-0001"
    assert quote.total_amount == Decimal("1000.00")
    assert quote.currency == "USD"
    assert quote.status == SaleStatus.DRAFT
    assert quote.notes == "Test quote"
    assert quote.tenant_id == data["tenant"].id
    assert quote.client_id == data["client"].id
    assert quote.sales_rep_id == data["sales_rep1"].id


@pytest.mark.asyncio
async def test_calculate_item_subtotal(db_session):
    """Test subtotal calculation with discount"""
    repo = SalesRepository(db_session)

    # Test 1: No discount
    subtotal = repo.calculate_item_subtotal(
        quantity=Decimal("10"),
        unit_price=Decimal("50.00"),
        discount_percent=Decimal("0"),
    )
    assert subtotal == Decimal("500.00")

    # Test 2: 10% discount
    subtotal = repo.calculate_item_subtotal(
        quantity=Decimal("5"),
        unit_price=Decimal("100.00"),
        discount_percent=Decimal("10"),
    )
    assert subtotal == Decimal("450.00")

    # Test 3: 25% discount
    subtotal = repo.calculate_item_subtotal(
        quantity=Decimal("4"),
        unit_price=Decimal("200.00"),
        discount_percent=Decimal("25"),
    )
    assert subtotal == Decimal("600.00")

    # Test 4: 100% discount (free)
    subtotal = repo.calculate_item_subtotal(
        quantity=Decimal("3"),
        unit_price=Decimal("75.00"),
        discount_percent=Decimal("100"),
    )
    assert subtotal == Decimal("0.00")
