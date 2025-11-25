"""
Sales Module Integration Tests
End-to-end tests for quotes/sales workflows
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal

from models.quote import SaleStatus
from modules.sales.repository import SalesRepository
from tests.integration.conftest import create_quote_data, create_quote_items


@pytest.mark.asyncio
async def test_create_quote_with_items(db_session, setup_test_data, sales_repo):
    """
    Test 1: Create complete quote with items
    Verifies: Quote creation, items creation, total calculation
    """
    data = await setup_test_data

    # Create quote with items
    items_data = create_quote_items()
    quote = await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-INT-001",
        total_amount=Decimal("475.00"),  # 2*100 + 5*50*0.9
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.DRAFT,
        notes="Integration test quote",
    )

    # Add items
    for item_data in items_data:
        await sales_repo.add_quote_item(
            quote_id=quote.id, **item_data, quote=None
        )

    # Verify quote was created
    assert quote.id is not None
    assert quote.quote_number == "QUOT-2025-INT-001"
    assert quote.status == SaleStatus.DRAFT
    assert quote.total_amount == Decimal("475.00")

    # Verify items were added
    quote_with_items = await sales_repo.get_quote(quote.id, data["tenant"].id)
    assert len(quote_with_items.items) == 2
    assert quote_with_items.items[0].product_name == "Product A"
    assert quote_with_items.items[1].product_name == "Product B"


@pytest.mark.asyncio
async def test_update_quote_draft(db_session, setup_test_data, sales_repo):
    """
    Test 2: Update quote in DRAFT status
    Verifies: Only DRAFT quotes can be fully updated
    """
    data = await setup_test_data

    # Create draft quote
    quote = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.DRAFT,
        )
    )

    # Update quote
    updated_quote = await sales_repo.update_quote(
        quote_id=quote.id,
        tenant_id=data["tenant"].id,
        total_amount=Decimal("1500.00"),
        valid_until=date.today() + timedelta(days=60),
        notes="Updated notes",
    )

    assert updated_quote.total_amount == Decimal("1500.00")
    assert updated_quote.notes == "Updated notes"


@pytest.mark.asyncio
async def test_quote_status_transition_draft_to_sent(
    db_session, setup_test_data, sales_repo
):
    """
    Test 3: Valid status transition DRAFT → SENT
    Verifies: Status transition rules
    """
    data = await setup_test_data

    # Create draft quote
    quote = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.DRAFT,
        )
    )

    # Transition to SENT
    updated_quote = await sales_repo.update_quote_status(
        quote_id=quote.id,
        tenant_id=data["tenant"].id,
        new_status=SaleStatus.SENT,
    )

    assert updated_quote.status == SaleStatus.SENT


@pytest.mark.asyncio
async def test_quote_status_transition_sent_to_accepted(
    db_session, setup_test_data, sales_repo
):
    """
    Test 4: Valid status transition SENT → ACCEPTED
    Verifies: Acceptance flow
    """
    data = await setup_test_data

    # Create sent quote
    quote = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.SENT,
        )
    )

    # Transition to ACCEPTED
    updated_quote = await sales_repo.update_quote_status(
        quote_id=quote.id,
        tenant_id=data["tenant"].id,
        new_status=SaleStatus.ACCEPTED,
    )

    assert updated_quote.status == SaleStatus.ACCEPTED


@pytest.mark.asyncio
async def test_quote_status_transition_sent_to_rejected(
    db_session, setup_test_data, sales_repo
):
    """
    Test 5: Valid status transition SENT → REJECTED
    Verifies: Rejection flow
    """
    data = await setup_test_data

    # Create sent quote
    quote = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.SENT,
        )
    )

    # Transition to REJECTED
    updated_quote = await sales_repo.update_quote_status(
        quote_id=quote.id,
        tenant_id=data["tenant"].id,
        new_status=SaleStatus.REJECTED,
    )

    assert updated_quote.status == SaleStatus.REJECTED


@pytest.mark.asyncio
async def test_quote_invalid_status_transition(
    db_session, setup_test_data, sales_repo
):
    """
    Test 6: Invalid status transition (ACCEPTED → DRAFT)
    Verifies: Status transition validation prevents invalid transitions
    """
    data = await setup_test_data

    # Create accepted quote
    quote = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.ACCEPTED,
        )
    )

    # Attempt invalid transition to DRAFT (should raise error)
    with pytest.raises(ValueError, match="Invalid status transition"):
        await sales_repo.update_quote_status(
            quote_id=quote.id,
            tenant_id=data["tenant"].id,
            new_status=SaleStatus.DRAFT,
        )


@pytest.mark.asyncio
async def test_list_quotes_with_filters(db_session, setup_test_data, sales_repo):
    """
    Test 7: List quotes with various filters
    Verifies: Filtering by status, client, date range
    """
    data = await setup_test_data

    # Create multiple quotes with different statuses and clients
    quote1 = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.DRAFT,
        )
    )

    quote2 = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client2"].id,
            data["sales_rep1"].id,
            SaleStatus.SENT,
        )
    )

    quote3 = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.ACCEPTED,
        )
    )

    # Filter by status
    draft_quotes = await sales_repo.get_quotes(
        tenant_id=data["tenant"].id,
        status=SaleStatus.DRAFT,
    )
    assert len(draft_quotes) == 1
    assert draft_quotes[0].status == SaleStatus.DRAFT

    # Filter by client
    client1_quotes = await sales_repo.get_quotes(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
    )
    assert len(client1_quotes) == 2

    # Get all quotes
    all_quotes = await sales_repo.get_quotes(tenant_id=data["tenant"].id)
    assert len(all_quotes) >= 3


@pytest.mark.asyncio
async def test_rbac_sales_rep_sees_only_own_quotes(
    db_session, setup_test_data, sales_repo
):
    """
    Test 8: RBAC - Sales rep only sees their own quotes
    Verifies: Role-based access control for sales reps
    """
    data = await setup_test_data

    # Sales rep 1 creates a quote
    quote1 = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.DRAFT,
        )
    )

    # Sales rep 2 creates a quote
    quote2 = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client2"].id,
            data["sales_rep2"].id,
            SaleStatus.DRAFT,
        )
    )

    # Sales rep 1 queries their quotes (should only see their own)
    rep1_quotes = await sales_repo.get_quotes(
        tenant_id=data["tenant"].id,
        sales_rep_id=data["sales_rep1"].id,
    )
    assert len(rep1_quotes) == 1
    assert rep1_quotes[0].sales_rep_id == data["sales_rep1"].id

    # Sales rep 2 queries their quotes (should only see their own)
    rep2_quotes = await sales_repo.get_quotes(
        tenant_id=data["tenant"].id,
        sales_rep_id=data["sales_rep2"].id,
    )
    assert len(rep2_quotes) == 1
    assert rep2_quotes[0].sales_rep_id == data["sales_rep2"].id


@pytest.mark.asyncio
async def test_quote_items_crud(db_session, setup_test_data, sales_repo):
    """
    Test 9: CRUD operations on quote items
    Verifies: Add, update, delete items
    """
    data = await setup_test_data

    # Create quote
    quote = await sales_repo.create_quote(
        **create_quote_data(
            data["tenant"].id,
            data["client1"].id,
            data["sales_rep1"].id,
            SaleStatus.DRAFT,
        )
    )

    # Add item
    item = await sales_repo.add_quote_item(
        quote_id=quote.id,
        product_name="Test Product",
        description="Test Description",
        quantity=Decimal("3"),
        unit_price=Decimal("100.00"),
        discount_percent=Decimal("0"),
        quote=None,
    )
    assert item.id is not None
    assert item.subtotal == Decimal("300.00")

    # Update item
    updated_item = await sales_repo.update_quote_item(
        item_id=item.id,
        quote_id=quote.id,
        tenant_id=data["tenant"].id,
        quantity=Decimal("5"),
        unit_price=Decimal("80.00"),
    )
    assert updated_item.quantity == Decimal("5")
    assert updated_item.unit_price == Decimal("80.00")
    assert updated_item.subtotal == Decimal("400.00")

    # Delete item
    await sales_repo.delete_quote_item(
        item_id=item.id,
        quote_id=quote.id,
        tenant_id=data["tenant"].id,
    )

    # Verify deletion
    quote_with_items = await sales_repo.get_quote(quote.id, data["tenant"].id)
    assert len(quote_with_items.items) == 0


@pytest.mark.asyncio
async def test_quote_total_calculation_with_discounts(
    db_session, setup_test_data, sales_repo
):
    """
    Test 10: Calculate quote totals correctly with discounts
    Verifies: Subtotal and total calculations with various discount percentages
    """
    data = await setup_test_data

    # Test calculation without discount
    subtotal1 = sales_repo.calculate_item_subtotal(
        quantity=Decimal("10"),
        unit_price=Decimal("50.00"),
        discount_percent=Decimal("0"),
    )
    assert subtotal1 == Decimal("500.00")

    # Test calculation with 10% discount
    subtotal2 = sales_repo.calculate_item_subtotal(
        quantity=Decimal("5"),
        unit_price=Decimal("100.00"),
        discount_percent=Decimal("10"),
    )
    assert subtotal2 == Decimal("450.00")

    # Test calculation with 25% discount
    subtotal3 = sales_repo.calculate_item_subtotal(
        quantity=Decimal("4"),
        unit_price=Decimal("200.00"),
        discount_percent=Decimal("25"),
    )
    assert subtotal3 == Decimal("600.00")

    # Test calculation with 100% discount (free item)
    subtotal4 = sales_repo.calculate_item_subtotal(
        quantity=Decimal("3"),
        unit_price=Decimal("75.00"),
        discount_percent=Decimal("100"),
    )
    assert subtotal4 == Decimal("0.00")

    # Create quote with multiple items with different discounts
    quote = await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        quote_number="QUOT-2025-CALC-001",
        total_amount=Decimal("0"),  # Will be calculated
        currency="USD",
        valid_until=date.today() + timedelta(days=30),
        status=SaleStatus.DRAFT,
        notes="Test total calculation",
    )

    # Add items
    await sales_repo.add_quote_item(
        quote_id=quote.id,
        product_name="Product 1",
        quantity=Decimal("10"),
        unit_price=Decimal("50.00"),
        discount_percent=Decimal("0"),
        quote=None,
    )
    await sales_repo.add_quote_item(
        quote_id=quote.id,
        product_name="Product 2",
        quantity=Decimal("5"),
        unit_price=Decimal("100.00"),
        discount_percent=Decimal("10"),
        quote=None,
    )

    # Calculate total
    calculated_total = await sales_repo.calculate_quote_total(quote.id)
    expected_total = Decimal("500.00") + Decimal("450.00")
    assert calculated_total == expected_total
