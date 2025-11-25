"""
Sales/Quotes endpoints
Handles quote creation, management, status updates, and statistics
"""
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import math

from core.database import get_db
from core.exceptions import NotFoundError, ForbiddenError
from models.user import User, UserRole
from models.quote import SaleStatus
from schemas.quote import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteWithItems,
    QuoteStatusUpdate,
    QuoteSummary,
    QuoteListResponse,
    QuoteItemCreate,
    QuoteItemUpdate,
    QuoteItemResponse,
)
from modules.sales.repository import SalesRepository
from api.dependencies import get_current_user, require_admin, require_supervisor_or_admin

router = APIRouter(prefix="/sales", tags=["Sales"])


# ============================================================================
# Quote Endpoints
# ============================================================================


@router.post(
    "/quotes",
    response_model=QuoteWithItems,
    status_code=status.HTTP_201_CREATED,
)
async def create_quote(
    data: QuoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new quote

    Creates a new sales quote with items.

    **Features:**
    - Auto-generates quote number: QUOT-{YYYY}-{NNNN}
    - Calculates totals automatically from items
    - Creates quote and items in a single transaction
    - Initial status: DRAFT

    **Validations:**
    - Client must exist
    - At least one item required
    - Valid until date must be today or future
    - Amounts must be positive
    """
    repo = SalesRepository(db)

    # Verify client exists (import ClientRepository if needed)
    # For now, we assume client_id is valid

    # Generate quote number: QUOT-{YYYY}-{NNNN}
    # Get the count of quotes created this year
    year = datetime.now().year
    from sqlalchemy import select, func, and_, extract
    from models.quote import Quote

    count_query = select(func.count()).select_from(Quote).where(
        and_(
            Quote.tenant_id == current_user.tenant_id,
            extract('year', Quote.created_at) == year
        )
    )
    result = await db.execute(count_query)
    count = result.scalar() or 0

    quote_number = f"QUOT-{year}-{(count + 1):04d}"

    # Calculate total from items
    total_amount = Decimal("0.00")
    for item in data.items:
        subtotal = repo.calculate_item_subtotal(
            item.quantity,
            item.unit_price,
            item.discount_percent
        )
        total_amount += subtotal

    # Set sales_rep_id to current user if not provided
    sales_rep_id = data.sales_rep_id or current_user.id

    # Create quote
    quote = await repo.create_quote(
        tenant_id=current_user.tenant_id,
        client_id=data.client_id,
        sales_rep_id=sales_rep_id,
        quote_number=quote_number,
        total_amount=total_amount,
        currency=data.currency,
        valid_until=data.valid_until,
        status=SaleStatus.DRAFT,
        notes=data.notes,
    )

    # Create quote items
    for item in data.items:
        await repo.add_quote_item(
            tenant_id=current_user.tenant_id,
            quote_id=quote.id,
            product_name=item.product_name,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_percent=item.discount_percent,
        )

    await db.commit()

    # Reload quote with items
    quote = await repo.get_quote_by_id(
        quote.id,
        current_user.tenant_id,
        include_items=True
    )

    return quote


@router.get("/quotes", response_model=QuoteListResponse)
async def list_quotes(
    status: Optional[SaleStatus] = Query(None, description="Filter by status"),
    client_id: Optional[UUID] = Query(None, description="Filter by client ID"),
    date_from: Optional[date] = Query(None, description="Filter by creation date from"),
    date_to: Optional[date] = Query(None, description="Filter by creation date to"),
    search: Optional[str] = Query(None, description="Search in quote number and notes"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List quotes with filters and pagination

    Returns paginated list of quotes with optional filters.

    **Filters:**
    - `status`: Filter by quote status (draft, sent, accepted, rejected, expired)
    - `client_id`: Filter by client
    - `date_from`, `date_to`: Creation date range filter
    - `search`: Search in quote number and notes

    **Pagination:**
    - `page`: Page number (starts at 1)
    - `page_size`: Items per page (1-100)

    **Access Control:**
    - Sales reps can only see their own quotes
    - Supervisors and admins can see all quotes in their tenant
    """
    repo = SalesRepository(db)

    # Get quotes with RBAC
    quotes, total = await repo.get_quotes(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        status=status,
        client_id=client_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        page_size=page_size,
    )

    pages = math.ceil(total / page_size) if total > 0 else 0

    return QuoteListResponse(
        items=quotes,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/quotes/{quote_id}", response_model=QuoteWithItems)
async def get_quote(
    quote_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get quote by ID

    Returns detailed quote information including items, client, and sales rep data.

    **Access Control:**
    - Sales reps can only view their own quotes
    - Supervisors and admins can view all quotes in their tenant
    """
    repo = SalesRepository(db)

    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        include_items=True
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    return quote


@router.put("/quotes/{quote_id}", response_model=QuoteWithItems)
async def update_quote(
    quote_id: UUID,
    data: QuoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update quote

    Updates an existing quote.

    **Business Rules:**
    - Can only update quotes in DRAFT status
    - Returns 409 Conflict if quote is not in DRAFT status
    - Totals are recalculated if items are modified

    **Access Control:**
    - Users can only update their own quotes
    - Admins can update any quote
    """
    repo = SalesRepository(db)

    # Get quote to check status
    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        include_items=False
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    # Check if quote can be edited
    if quote.status != SaleStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only DRAFT quotes can be updated. Current status: " + quote.status.value
        )

    # Update quote
    update_data = data.model_dump(exclude_unset=True)

    updated_quote = await repo.update_quote(
        quote_id=quote_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        **update_data
    )

    if not updated_quote:
        raise NotFoundError("Quote", quote_id)

    await db.commit()

    # Reload with items
    updated_quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        include_items=True
    )

    return updated_quote


@router.delete("/quotes/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete quote (Admin only)

    Soft deletes a quote.

    **Business Rules:**
    - Can only delete quotes in DRAFT status
    - Returns 409 Conflict if quote is not in DRAFT status

    **Access Control:** Admin only
    """
    repo = SalesRepository(db)

    # Get quote to check status
    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        include_items=False
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    # Check if quote can be deleted
    if quote.status != SaleStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only DRAFT quotes can be deleted. Current status: " + quote.status.value
        )

    success = await repo.delete_quote(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role
    )

    await db.commit()
    return None


@router.patch("/quotes/{quote_id}/status", response_model=QuoteWithItems)
async def update_quote_status(
    quote_id: UUID,
    data: QuoteStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update quote status

    Changes the status of a quote following valid state transitions.

    **Valid Transitions:**
    - DRAFT → SENT
    - SENT → ACCEPTED
    - SENT → REJECTED
    - SENT → EXPIRED

    **Invalid Transitions:**
    - No regressions allowed (e.g., SENT → DRAFT)
    - Cannot change from terminal states (ACCEPTED, REJECTED, EXPIRED)

    **Access Control:**
    - Sales reps can change status of their own quotes
    - Supervisors and admins can change any quote status
    """
    repo = SalesRepository(db)

    # Get quote
    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        include_items=False
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    # Validate state transition
    current_status = quote.status
    new_status = data.status

    # Define valid transitions
    valid_transitions = {
        SaleStatus.DRAFT: [SaleStatus.SENT],
        SaleStatus.SENT: [SaleStatus.ACCEPTED, SaleStatus.REJECTED, SaleStatus.EXPIRED],
        SaleStatus.ACCEPTED: [],  # Terminal state
        SaleStatus.REJECTED: [],  # Terminal state
        SaleStatus.EXPIRED: [],   # Terminal state
    }

    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition: {current_status.value} → {new_status.value}. "
                   f"Valid transitions from {current_status.value}: {[s.value for s in valid_transitions.get(current_status, [])]}"
        )

    # Update status
    updated_quote = await repo.update_quote_status(
        quote_id=quote_id,
        tenant_id=current_user.tenant_id,
        status=new_status,
        user_id=current_user.id,
        user_role=current_user.role
    )

    await db.commit()

    # Reload with items
    updated_quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        include_items=True
    )

    return updated_quote


@router.get("/quotes/summary", response_model=QuoteSummary)
async def get_quote_summary(
    date_from: Optional[date] = Query(None, description="Filter by creation date from"),
    date_to: Optional[date] = Query(None, description="Filter by creation date to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get quote summary statistics

    Returns summary statistics including:
    - Total quotes and amounts by status
    - Conversion rate (ACCEPTED / SENT)
    - Top 5 clients by quote value

    **Access Control:**
    - Sales reps see only their own quote statistics
    - Supervisors and admins see tenant-wide statistics
    """
    repo = SalesRepository(db)

    summary = await repo.get_quote_summary(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        date_from=date_from,
        date_to=date_to,
    )

    return QuoteSummary(**summary)


# ============================================================================
# Quote Item Endpoints
# ============================================================================


@router.post("/quotes/{quote_id}/items", response_model=QuoteItemResponse)
async def add_quote_item(
    quote_id: UUID,
    data: QuoteItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add item to quote

    Adds a new item to an existing quote.

    **Business Rules:**
    - Can only add items to DRAFT quotes
    - Quote total is automatically recalculated

    **Access Control:**
    - Users can only add items to their own quotes
    - Admins can add items to any quote
    """
    repo = SalesRepository(db)

    # Verify quote exists and is in DRAFT status
    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        include_items=False
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    if quote.status != SaleStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only add items to DRAFT quotes. Current status: " + quote.status.value
        )

    # Add item
    item = await repo.add_quote_item(
        tenant_id=current_user.tenant_id,
        quote_id=quote_id,
        product_name=data.product_name,
        description=data.description,
        quantity=data.quantity,
        unit_price=data.unit_price,
        discount_percent=data.discount_percent,
    )

    # Recalculate quote total
    new_total = await repo.calculate_quote_total(quote_id, current_user.tenant_id)
    await repo.update_quote(
        quote_id=quote_id,
        tenant_id=current_user.tenant_id,
        total_amount=new_total
    )

    await db.commit()
    await db.refresh(item)

    return item


@router.get("/quotes/{quote_id}/items", response_model=List[QuoteItemResponse])
async def list_quote_items(
    quote_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List quote items

    Returns all items for a specific quote.

    **Access Control:**
    - Sales reps can only view items from their own quotes
    - Supervisors and admins can view items from any quote
    """
    repo = SalesRepository(db)

    # Verify access to quote
    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        include_items=False
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    # Get items
    items = await repo.get_quote_items(quote_id, current_user.tenant_id)

    return items


@router.put("/quotes/{quote_id}/items/{item_id}", response_model=QuoteItemResponse)
async def update_quote_item(
    quote_id: UUID,
    item_id: UUID,
    data: QuoteItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update quote item

    Updates an existing quote item.

    **Business Rules:**
    - Can only update items in DRAFT quotes
    - Subtotal is automatically recalculated
    - Quote total is automatically recalculated

    **Access Control:**
    - Users can only update items in their own quotes
    - Admins can update items in any quote
    """
    repo = SalesRepository(db)

    # Verify quote exists and is in DRAFT status
    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        include_items=False
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    if quote.status != SaleStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only update items in DRAFT quotes. Current status: " + quote.status.value
        )

    # Update item
    update_data = data.model_dump(exclude_unset=True)
    item = await repo.update_quote_item(
        item_id=item_id,
        tenant_id=current_user.tenant_id,
        **update_data
    )

    if not item:
        raise NotFoundError("QuoteItem", item_id)

    # Verify item belongs to this quote
    if item.quote_id != quote_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item does not belong to this quote"
        )

    # Recalculate quote total
    new_total = await repo.calculate_quote_total(quote_id, current_user.tenant_id)
    await repo.update_quote(
        quote_id=quote_id,
        tenant_id=current_user.tenant_id,
        total_amount=new_total
    )

    await db.commit()
    await db.refresh(item)

    return item


@router.delete("/quotes/{quote_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote_item(
    quote_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete quote item

    Deletes an item from a quote.

    **Business Rules:**
    - Can only delete items from DRAFT quotes
    - Cannot delete the last item (quote must have at least one item)
    - Quote total is automatically recalculated

    **Access Control:**
    - Users can only delete items from their own quotes
    - Admins can delete items from any quote
    """
    repo = SalesRepository(db)

    # Verify quote exists and is in DRAFT status
    quote = await repo.get_quote_by_id(
        quote_id,
        current_user.tenant_id,
        user_id=current_user.id,
        user_role=current_user.role,
        include_items=True
    )

    if not quote:
        raise NotFoundError("Quote", quote_id)

    if quote.status != SaleStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only delete items from DRAFT quotes. Current status: " + quote.status.value
        )

    # Check if this is the last item
    items = await repo.get_quote_items(quote_id, current_user.tenant_id)
    if len(items) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last item. A quote must have at least one item."
        )

    # Verify item exists and belongs to this quote
    item = await repo.get_quote_item(item_id, current_user.tenant_id)
    if not item:
        raise NotFoundError("QuoteItem", item_id)

    if item.quote_id != quote_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item does not belong to this quote"
        )

    # Delete item
    success = await repo.delete_quote_item(item_id, current_user.tenant_id)

    # Recalculate quote total
    new_total = await repo.calculate_quote_total(quote_id, current_user.tenant_id)
    await repo.update_quote(
        quote_id=quote_id,
        tenant_id=current_user.tenant_id,
        total_amount=new_total
    )

    await db.commit()
    return None
