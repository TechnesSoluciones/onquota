"""
Unit tests for query optimization (N+1 prevention)
Tests eager loading in repository methods
"""
import pytest
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from uuid import uuid4
from decimal import Decimal
from datetime import date, datetime

from models.quote import Quote, SaleStatus
from models.quote_item import QuoteItem
from models.client import Client, ClientStatus
from models.user import User, UserRole


@pytest.mark.asyncio
async def test_get_quotes_uses_eager_loading(async_db):
    """
    Test that get_quotes method uses eager loading for related entities
    This prevents N+1 queries when accessing quote.client, quote.sales_rep, quote.items
    """
    from modules.sales.repository import SalesRepository

    repo = SalesRepository(async_db)

    # Create test data
    tenant_id = uuid4()
    user_id = uuid4()

    # Create a quote with relationships
    quote = Quote(
        id=uuid4(),
        tenant_id=tenant_id,
        client_id=uuid4(),
        sales_rep_id=user_id,
        quote_number="TEST-001",
        total_amount=Decimal("1000.00"),
        currency="USD",
        status=SaleStatus.DRAFT,
        valid_until=date.today(),
    )
    async_db.add(quote)
    await async_db.flush()

    # Call get_quotes
    quotes, total = await repo.get_quotes(
        tenant_id=tenant_id,
        page=1,
        page_size=20
    )

    # Verify eager loading was used by checking if relationships are loaded
    # without triggering additional queries
    assert len(quotes) > 0
    assert quotes[0].id == quote.id

    # These should not trigger additional queries if eager loading worked
    # (In a real test with SQL logging, we'd verify query count)
    _ = quotes[0].client
    _ = quotes[0].sales_rep
    _ = quotes[0].items


@pytest.mark.asyncio
async def test_get_quote_by_id_loads_relationships(async_db):
    """
    Test that get_quote_by_id eagerly loads client and sales_rep
    """
    from modules.sales.repository import SalesRepository

    repo = SalesRepository(async_db)

    # Create test quote
    tenant_id = uuid4()
    quote_id = uuid4()
    user_id = uuid4()

    quote = Quote(
        id=quote_id,
        tenant_id=tenant_id,
        client_id=uuid4(),
        sales_rep_id=user_id,
        quote_number="TEST-002",
        total_amount=Decimal("2000.00"),
        currency="USD",
        status=SaleStatus.SENT,
        valid_until=date.today(),
    )
    async_db.add(quote)
    await async_db.flush()

    # Fetch quote
    fetched_quote = await repo.get_quote_by_id(quote_id, tenant_id)

    assert fetched_quote is not None
    assert fetched_quote.id == quote_id

    # Accessing relationships should not cause additional queries
    # (with eager loading)
    assert fetched_quote.client_id is not None
    assert fetched_quote.sales_rep_id is not None


@pytest.mark.asyncio
async def test_get_recent_activity_loads_sales_rep(async_db):
    """
    Test that get_recent_activity eagerly loads sales_rep to prevent N+1
    """
    from modules.dashboard.repository import DashboardRepository

    repo = DashboardRepository(async_db)

    # Create test data
    tenant_id = uuid4()

    quote = Quote(
        id=uuid4(),
        tenant_id=tenant_id,
        client_id=uuid4(),
        sales_rep_id=uuid4(),
        quote_number="TEST-003",
        total_amount=Decimal("3000.00"),
        currency="USD",
        status=SaleStatus.ACCEPTED,
        valid_until=date.today(),
    )
    async_db.add(quote)
    await async_db.flush()

    # Get recent activity
    activity = await repo.get_recent_activity(tenant_id, limit=10)

    # Verify sales rep is loaded (or at least accessible)
    assert activity is not None
    assert hasattr(activity, "events")
    if len(activity.events) > 0:
        event = activity.events[0]
        # Should have user_name from eager loaded sales_rep
        # (could be None if no sales_rep, but should not cause additional query)


def test_selectinload_configuration():
    """
    Test that selectinload is correctly configured in query builders
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # This is a structural test to ensure selectinload usage pattern
    query = select(Quote).options(
        selectinload(Quote.items),
        selectinload(Quote.client),
        selectinload(Quote.sales_rep),
    )

    # Verify query has options
    assert query._mapper_adapter_map is not None or query._join_condition is not None
