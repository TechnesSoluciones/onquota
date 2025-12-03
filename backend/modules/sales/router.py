"""
Sales/Quotes endpoints
Handles quote creation, management, status updates, and statistics
"""
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import math

from core.database import get_db
from core.exceptions import NotFoundError, ForbiddenError
from core.export_utils import create_excel_comparison, create_pdf_comparison
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


@router.get("/comparison/monthly")
async def get_monthly_sales_comparison(
    year: int = Query(..., ge=2000, le=2100, description="Year to compare"),
    comparison_type: str = Query("monthly", description="Type: monthly, yearly, quarter"),
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    assigned_to_id: Optional[UUID] = Query(None, description="Filter by sales rep"),
    start_date: Optional[date] = Query(None, description="Custom start date"),
    end_date: Optional[date] = Query(None, description="Custom end date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get monthly sales comparison

    Compares sales/quotes month by month for the specified year vs previous year.
    Returns data suitable for charts and analysis.

    **Access Control:**
    - Sales reps see only their own quotes
    - Supervisors and admins see all tenant quotes
    """
    from sqlalchemy import func, extract, case
    from models.quote import Quote
    from datetime import datetime

    repo = SalesRepository(db)

    # Determine user filter
    user_filter = current_user.id if current_user.role == UserRole.SALES_REP else None

    # Build base query for current year
    query_current = db.query(
        extract('month', Quote.created_at).label('month'),
        func.coalesce(func.sum(Quote.total_amount), 0).label('total'),
        func.count(Quote.id).label('count'),
        func.count(case((Quote.status == SaleStatus.ACCEPTED, 1))).label('accepted_count'),
    ).filter(
        Quote.tenant_id == current_user.tenant_id,
        Quote.is_deleted == False,
        extract('year', Quote.created_at) == year
    )

    # Build base query for previous year
    query_previous = db.query(
        extract('month', Quote.created_at).label('month'),
        func.coalesce(func.sum(Quote.total_amount), 0).label('total'),
        func.count(Quote.id).label('count'),
        func.count(case((Quote.status == SaleStatus.ACCEPTED, 1))).label('accepted_count'),
    ).filter(
        Quote.tenant_id == current_user.tenant_id,
        Quote.is_deleted == False,
        extract('year', Quote.created_at) == year - 1
    )

    if user_filter:
        query_current = query_current.filter(Quote.sales_rep_id == user_filter)
        query_previous = query_previous.filter(Quote.sales_rep_id == user_filter)

    # Group by month
    query_current = query_current.group_by(extract('month', Quote.created_at))
    query_previous = query_previous.group_by(extract('month', Quote.created_at))

    # Execute queries
    current_results = await db.execute(query_current)
    previous_results = await db.execute(query_previous)

    # Convert to dict
    current_data = {
        int(row.month): {
            "total": float(row.total),
            "count": row.count,
            "accepted_count": row.accepted_count
        } for row in current_results
    }
    previous_data = {
        int(row.month): {
            "total": float(row.total),
            "count": row.count,
            "accepted_count": row.accepted_count
        } for row in previous_results
    }

    # Build monthly comparison
    months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    monthly_data = []

    for month_num in range(1, 13):
        current = current_data.get(month_num, {"total": 0, "count": 0, "accepted_count": 0})
        previous = previous_data.get(month_num, {"total": 0, "count": 0, "accepted_count": 0})

        monthly_data.append({
            "month": months[month_num - 1],
            "month_num": month_num,
            "actual": current["total"],
            "previous": previous["total"],
            "count": current["count"],
            "prevCount": previous["count"],
            "accepted_count": current["accepted_count"],
        })

    # Calculate summary statistics
    total_actual = sum(item["actual"] for item in monthly_data)
    total_previous = sum(item["previous"] for item in monthly_data)
    total_count = sum(item["count"] for item in monthly_data)
    total_accepted = sum(item["accepted_count"] for item in monthly_data)
    avg_ticket = total_actual / total_count if total_count > 0 else 0

    # Find min and max months
    months_with_data = [item for item in monthly_data if item["actual"] > 0]
    max_month = max(months_with_data, key=lambda x: x["actual"]) if months_with_data else None

    # Calculate percentage change
    pct_change = ((total_actual - total_previous) / total_previous * 100) if total_previous > 0 else 0

    # Calculate acceptance rate
    acceptance_rate = (total_accepted / total_count * 100) if total_count > 0 else 0

    return {
        "year": year,
        "monthly_data": monthly_data,
        "summary": {
            "total_actual": total_actual,
            "total_previous": total_previous,
            "total_quotes": total_count,
            "average_ticket": avg_ticket,
            "percent_change": round(pct_change, 2),
            "acceptance_rate": round(acceptance_rate, 2),
            "max_month": {
                "name": max_month["month"],
                "amount": max_month["actual"]
            } if max_month else None,
        }
    }


@router.get("/comparison/export/excel")
async def export_comparison_excel(
    year: int = Query(..., ge=2000, le=2100, description="Year to export"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export monthly sales comparison to Excel

    Downloads an Excel file with monthly comparison data and summary statistics.
    """
    from sqlalchemy import select, func, extract, case
    from models.quote import Quote

    # Build base query with tenant and role filtering
    base_filter = [
        Quote.tenant_id == current_user.tenant_id,
        Quote.is_deleted == False,
    ]

    # Sales reps only see their own quotes
    if current_user.role == UserRole.SALES_REP:
        base_filter.append(Quote.sales_rep_id == current_user.id)

    # Build query for current year
    query_current = select(
        extract('month', Quote.created_at).label('month'),
        func.coalesce(func.sum(Quote.total_amount), 0).label('total'),
        func.count(Quote.id).label('count'),
        func.count(case((Quote.status == SaleStatus.ACCEPTED, 1))).label('accepted_count'),
    ).where(
        *base_filter,
        extract('year', Quote.created_at) == year
    ).group_by(extract('month', Quote.created_at))

    # Build query for previous year
    query_previous = select(
        extract('month', Quote.created_at).label('month'),
        func.coalesce(func.sum(Quote.total_amount), 0).label('total'),
        func.count(Quote.id).label('count'),
    ).where(
        *base_filter,
        extract('year', Quote.created_at) == year - 1
    ).group_by(extract('month', Quote.created_at))

    # Execute queries
    result_current = await db.execute(query_current)
    result_previous = await db.execute(query_previous)

    current_data = {
        row.month: {
            "total": float(row.total),
            "count": row.count,
            "accepted_count": row.accepted_count
        }
        for row in result_current.all()
    }
    previous_data = {
        row.month: {"total": float(row.total), "count": row.count}
        for row in result_previous.all()
    }

    # Build monthly data
    month_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                   "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

    monthly_data = []
    total_actual = 0
    total_previous = 0
    total_count = 0
    total_accepted = 0

    for month_num in range(1, 13):
        current = current_data.get(month_num, {"total": 0, "count": 0, "accepted_count": 0})
        previous = previous_data.get(month_num, {"total": 0, "count": 0})

        monthly_data.append({
            "month": month_names[month_num - 1],
            "month_num": month_num,
            "actual": current["total"],
            "previous": previous["total"],
            "count": current["count"],
            "prevCount": previous["count"],
            "accepted_count": current["accepted_count"]
        })

        total_actual += current["total"]
        total_previous += previous["total"]
        total_count += current["count"]
        total_accepted += current["accepted_count"]

    # Calculate statistics
    avg_ticket = total_actual / total_count if total_count > 0 else 0
    pct_change = ((total_actual - total_previous) / total_previous * 100) if total_previous > 0 else 0
    acceptance_rate = (total_accepted / total_count * 100) if total_count > 0 else 0

    # Find max month
    months_with_data = [m for m in monthly_data if m["actual"] > 0]
    max_month = max(months_with_data, key=lambda x: x["actual"]) if months_with_data else None

    data = {
        "year": year,
        "monthly_data": monthly_data,
        "summary": {
            "total_actual": total_actual,
            "total_previous": total_previous,
            "total_quotes": total_count,
            "average_ticket": avg_ticket,
            "percent_change": round(pct_change, 2),
            "acceptance_rate": round(acceptance_rate, 2),
            "max_month": {
                "name": max_month["month"],
                "amount": max_month["actual"]
            } if max_month else None,
        }
    }

    # Generate Excel file
    excel_file = create_excel_comparison(
        data=data,
        title="Comparación de Ventas",
        year=year,
        company_name="OnQuota"
    )

    # Return as download
    filename = f"ventas_comparacion_{year}.xlsx"
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/comparison/export/pdf")
async def export_comparison_pdf(
    year: int = Query(..., ge=2000, le=2100, description="Year to export"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export monthly sales comparison to PDF

    Downloads a PDF file with monthly comparison data and summary statistics.
    """
    from sqlalchemy import select, func, extract, case
    from models.quote import Quote

    # Build base query with tenant and role filtering
    base_filter = [
        Quote.tenant_id == current_user.tenant_id,
        Quote.is_deleted == False,
    ]

    # Sales reps only see their own quotes
    if current_user.role == UserRole.SALES_REP:
        base_filter.append(Quote.sales_rep_id == current_user.id)

    # Build query for current year
    query_current = select(
        extract('month', Quote.created_at).label('month'),
        func.coalesce(func.sum(Quote.total_amount), 0).label('total'),
        func.count(Quote.id).label('count'),
        func.count(case((Quote.status == SaleStatus.ACCEPTED, 1))).label('accepted_count'),
    ).where(
        *base_filter,
        extract('year', Quote.created_at) == year
    ).group_by(extract('month', Quote.created_at))

    # Build query for previous year
    query_previous = select(
        extract('month', Quote.created_at).label('month'),
        func.coalesce(func.sum(Quote.total_amount), 0).label('total'),
        func.count(Quote.id).label('count'),
    ).where(
        *base_filter,
        extract('year', Quote.created_at) == year - 1
    ).group_by(extract('month', Quote.created_at))

    # Execute queries
    result_current = await db.execute(query_current)
    result_previous = await db.execute(query_previous)

    current_data = {
        row.month: {
            "total": float(row.total),
            "count": row.count,
            "accepted_count": row.accepted_count
        }
        for row in result_current.all()
    }
    previous_data = {
        row.month: {"total": float(row.total), "count": row.count}
        for row in result_previous.all()
    }

    # Build monthly data
    month_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                   "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

    monthly_data = []
    total_actual = 0
    total_previous = 0
    total_count = 0
    total_accepted = 0

    for month_num in range(1, 13):
        current = current_data.get(month_num, {"total": 0, "count": 0, "accepted_count": 0})
        previous = previous_data.get(month_num, {"total": 0, "count": 0})

        monthly_data.append({
            "month": month_names[month_num - 1],
            "month_num": month_num,
            "actual": current["total"],
            "previous": previous["total"],
            "count": current["count"],
            "prevCount": previous["count"],
            "accepted_count": current["accepted_count"]
        })

        total_actual += current["total"]
        total_previous += previous["total"]
        total_count += current["count"]
        total_accepted += current["accepted_count"]

    # Calculate statistics
    avg_ticket = total_actual / total_count if total_count > 0 else 0
    pct_change = ((total_actual - total_previous) / total_previous * 100) if total_previous > 0 else 0
    acceptance_rate = (total_accepted / total_count * 100) if total_count > 0 else 0

    # Find max month
    months_with_data = [m for m in monthly_data if m["actual"] > 0]
    max_month = max(months_with_data, key=lambda x: x["actual"]) if months_with_data else None

    data = {
        "year": year,
        "monthly_data": monthly_data,
        "summary": {
            "total_actual": total_actual,
            "total_previous": total_previous,
            "total_quotes": total_count,
            "average_ticket": avg_ticket,
            "percent_change": round(pct_change, 2),
            "acceptance_rate": round(acceptance_rate, 2),
            "max_month": {
                "name": max_month["month"],
                "amount": max_month["actual"]
            } if max_month else None,
        }
    }

    # Generate PDF file
    pdf_file = create_pdf_comparison(
        data=data,
        title="Comparación de Ventas",
        year=year,
        company_name="OnQuota"
    )

    # Return as download
    filename = f"ventas_comparacion_{year}.pdf"
    return StreamingResponse(
        pdf_file,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
