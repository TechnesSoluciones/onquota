"""
Integration tests fixtures
Shared fixtures for end-to-end testing
"""
import pytest
import pytest_asyncio
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, Any

from modules.auth.repository import AuthRepository
from modules.clients.repository import ClientRepository
from modules.expenses.repository import ExpenseRepository
from modules.sales.repository import SalesRepository
from models.user import UserRole
from models.client import ClientStatus, ClientType
from models.expense import ExpenseStatus
from models.quote import SaleStatus


@pytest_asyncio.fixture
async def setup_test_data(db_session):
    """
    Create complete test data: tenant, users, clients, expense categories
    Returns dictionary with all created entities
    """
    auth_repo = AuthRepository(db_session)
    client_repo = ClientRepository(db_session)
    expense_repo = ExpenseRepository(db_session)

    # Create tenant
    tenant = await auth_repo.create_tenant(company_name="Test Corp")

    # Create users with different roles
    admin = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="admin@test.com",
        password="AdminPass123",
        full_name="Admin User",
        role=UserRole.ADMIN,
    )

    supervisor = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="supervisor@test.com",
        password="SuperPass123",
        full_name="Supervisor User",
        role=UserRole.SUPERVISOR,
    )

    sales_rep1 = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="sales1@test.com",
        password="SalesPass123",
        full_name="Sales Rep One",
        role=UserRole.SALES_REP,
    )

    sales_rep2 = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="sales2@test.com",
        password="SalesPass123",
        full_name="Sales Rep Two",
        role=UserRole.SALES_REP,
    )

    # Create clients
    client1 = await client_repo.create_client(
        tenant_id=tenant.id,
        name="Acme Corporation",
        tax_id="TAX001",
        email="contact@acme.com",
        phone="+1234567890",
        address="123 Main St",
        city="New York",
        country="USA",
        status=ClientStatus.ACTIVE,
        client_type=ClientType.CORPORATE,
    )

    client2 = await client_repo.create_client(
        tenant_id=tenant.id,
        name="Global Tech Inc",
        tax_id="TAX002",
        email="info@globaltech.com",
        phone="+1234567891",
        address="456 Tech Ave",
        city="San Francisco",
        country="USA",
        status=ClientStatus.ACTIVE,
        client_type=ClientType.CORPORATE,
    )

    client3 = await client_repo.create_client(
        tenant_id=tenant.id,
        name="StartUp XYZ",
        tax_id="TAX003",
        email="hello@startupxyz.com",
        phone="+1234567892",
        address="789 Innovation Blvd",
        city="Austin",
        country="USA",
        status=ClientStatus.LEAD,
        client_type=ClientType.STARTUP,
    )

    # Create expense categories
    category1 = await expense_repo.create_category(
        tenant_id=tenant.id,
        name="Travel",
        description="Travel and accommodation expenses",
    )

    category2 = await expense_repo.create_category(
        tenant_id=tenant.id,
        name="Office Supplies",
        description="Office supplies and equipment",
    )

    return {
        "tenant": tenant,
        "admin": admin,
        "supervisor": supervisor,
        "sales_rep1": sales_rep1,
        "sales_rep2": sales_rep2,
        "client1": client1,
        "client2": client2,
        "client3": client3,
        "category1": category1,
        "category2": category2,
    }


@pytest_asyncio.fixture
async def sales_repo(db_session):
    """Sales repository instance"""
    return SalesRepository(db_session)


@pytest_asyncio.fixture
async def expense_repo(db_session):
    """Expense repository instance"""
    return ExpenseRepository(db_session)


@pytest_asyncio.fixture
async def client_repo(db_session):
    """Client repository instance"""
    return ClientRepository(db_session)


# Helper functions

def create_quote_data(
    tenant_id, client_id, sales_rep_id, status=SaleStatus.DRAFT
) -> Dict[str, Any]:
    """Helper to create quote data dictionary"""
    return {
        "tenant_id": tenant_id,
        "client_id": client_id,
        "sales_rep_id": sales_rep_id,
        "quote_number": f"QUOT-{date.today().year}-{status.value.upper()[:3]}-001",
        "total_amount": Decimal("1000.00"),
        "currency": "USD",
        "valid_until": date.today() + timedelta(days=30),
        "status": status,
        "notes": f"Test quote in {status.value} status",
    }


def create_quote_items() -> list:
    """Helper to create quote items data"""
    return [
        {
            "product_name": "Product A",
            "description": "Description for Product A",
            "quantity": Decimal("2"),
            "unit_price": Decimal("100.00"),
            "discount_percent": Decimal("0"),
        },
        {
            "product_name": "Product B",
            "description": "Description for Product B",
            "quantity": Decimal("5"),
            "unit_price": Decimal("50.00"),
            "discount_percent": Decimal("10"),
        },
    ]


def create_expense_data(
    tenant_id, user_id, category_id=None, status=ExpenseStatus.PENDING
) -> Dict[str, Any]:
    """Helper to create expense data dictionary"""
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "category_id": category_id,
        "amount": Decimal("250.00"),
        "currency": "USD",
        "date": date.today(),
        "description": f"Test expense in {status.value} status",
        "vendor_name": "Test Vendor",
        "status": status,
    }
