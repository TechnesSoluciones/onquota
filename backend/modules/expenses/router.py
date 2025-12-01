"""
Expenses endpoints
"""
from datetime import date
from typing import Optional
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
from models.expense import ExpenseStatus
from schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCategoryResponse,
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseWithCategory,
    ExpenseStatusUpdate,
    ExpenseSummary,
    ExpenseListResponse,
)
from modules.expenses.repository import ExpenseRepository
from api.dependencies import get_current_user, require_admin, require_supervisor_or_admin

router = APIRouter(prefix="/expenses", tags=["Expenses"])


# ============================================================================
# Category Endpoints
# ============================================================================


@router.post(
    "/categories",
    response_model=ExpenseCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    data: ExpenseCategoryCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create expense category (Admin only)

    Creates a new expense category for organizing expenses.
    """
    repo = ExpenseRepository(db)

    category = await repo.create_category(
        tenant_id=current_user.tenant_id,
        name=data.name,
        description=data.description,
        icon=data.icon,
        color=data.color,
    )

    await db.commit()
    return category


@router.get("/categories", response_model=list[ExpenseCategoryResponse])
async def list_categories(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all expense categories

    Returns all categories for the current user's tenant.
    """
    repo = ExpenseRepository(db)

    categories = await repo.list_categories(
        tenant_id=current_user.tenant_id,
        is_active=is_active,
    )

    return categories


@router.get("/categories/{category_id}", response_model=ExpenseCategoryResponse)
async def get_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get expense category by ID"""
    repo = ExpenseRepository(db)

    category = await repo.get_category_by_id(category_id, current_user.tenant_id)
    if not category:
        raise NotFoundError("ExpenseCategory", category_id)

    return category


@router.put("/categories/{category_id}", response_model=ExpenseCategoryResponse)
async def update_category(
    category_id: UUID,
    data: ExpenseCategoryUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update expense category (Admin only)"""
    repo = ExpenseRepository(db)

    category = await repo.update_category(
        category_id=category_id,
        tenant_id=current_user.tenant_id,
        **data.model_dump(exclude_unset=True),
    )

    if not category:
        raise NotFoundError("ExpenseCategory", category_id)

    await db.commit()
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete expense category (Admin only)"""
    repo = ExpenseRepository(db)

    success = await repo.delete_category(category_id, current_user.tenant_id)
    if not success:
        raise NotFoundError("ExpenseCategory", category_id)

    await db.commit()
    return None


# ============================================================================
# Expense Endpoints
# ============================================================================


@router.post(
    "/",
    response_model=ExpenseWithCategory,
    status_code=status.HTTP_201_CREATED,
)
async def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new expense

    Creates a new expense record for the current user.
    The expense will be in PENDING status by default.

    **Validations:**
    - Amount must be greater than 0
    - Date cannot be in the future
    - Category ID must exist (if provided)
    """
    repo = ExpenseRepository(db)

    # Validate category if provided
    if data.category_id:
        category = await repo.get_category_by_id(data.category_id, current_user.tenant_id)
        if not category:
            raise NotFoundError("ExpenseCategory", data.category_id)

    expense = await repo.create_expense(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        amount=data.amount,
        currency=data.currency,
        description=data.description,
        expense_date=data.date,
        category_id=data.category_id,
        receipt_url=data.receipt_url,
        receipt_number=data.receipt_number,
        vendor_name=data.vendor_name,
        notes=data.notes,
    )

    await db.commit()
    await db.refresh(expense)

    # Load category relationship
    expense = await repo.get_expense_by_id(expense.id, current_user.tenant_id, include_category=True)
    return expense


@router.get("/", response_model=ExpenseListResponse)
async def list_expenses(
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    status: Optional[ExpenseStatus] = Query(None, description="Filter by status"),
    date_from: Optional[date] = Query(None, description="Filter by date from (inclusive)"),
    date_to: Optional[date] = Query(None, description="Filter by date to (inclusive)"),
    min_amount: Optional[Decimal] = Query(None, description="Filter by minimum amount"),
    max_amount: Optional[Decimal] = Query(None, description="Filter by maximum amount"),
    search: Optional[str] = Query(None, description="Search in description, vendor, notes"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List expenses with filters and pagination

    Returns paginated list of expenses with optional filters.

    **Filters:**
    - `user_id`: Filter by user (Supervisors/Admins can see all users)
    - `category_id`: Filter by category
    - `status`: Filter by approval status (pending, approved, rejected)
    - `date_from`, `date_to`: Date range filter
    - `min_amount`, `max_amount`: Amount range filter
    - `search`: Full-text search in description, vendor, and notes

    **Pagination:**
    - `page`: Page number (starts at 1)
    - `page_size`: Items per page (1-100)

    **Access Control:**
    - Sales reps can only see their own expenses
    - Supervisors and admins can see all expenses in their tenant
    """
    repo = ExpenseRepository(db)

    # Access control: sales reps can only see their own expenses
    if current_user.role == UserRole.SALES_REP:
        user_id = current_user.id
    elif user_id and current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        # If not supervisor/admin, can't filter by other users
        raise ForbiddenError("You can only view your own expenses")

    expenses, total = await repo.list_expenses(
        tenant_id=current_user.tenant_id,
        user_id=user_id,
        category_id=category_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        page=page,
        page_size=page_size,
    )

    pages = math.ceil(total / page_size) if total > 0 else 0

    return ExpenseListResponse(
        items=expenses,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{expense_id}", response_model=ExpenseWithCategory)
async def get_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get expense by ID

    Returns detailed expense information including category.

    **Access Control:**
    - Sales reps can only view their own expenses
    - Supervisors and admins can view all expenses in their tenant
    """
    repo = ExpenseRepository(db)

    expense = await repo.get_expense_by_id(expense_id, current_user.tenant_id, include_category=True)
    if not expense:
        raise NotFoundError("Expense", expense_id)

    # Access control: sales reps can only see their own expenses
    if current_user.role == UserRole.SALES_REP and expense.user_id != current_user.id:
        raise ForbiddenError("You can only view your own expenses")

    return expense


@router.put("/{expense_id}", response_model=ExpenseWithCategory)
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update expense

    Updates an existing expense record.

    **Access Control:**
    - Users can only update their own pending expenses
    - Admins can update any expense
    """
    repo = ExpenseRepository(db)

    # Get expense
    expense = await repo.get_expense_by_id(expense_id, current_user.tenant_id, include_category=False)
    if not expense:
        raise NotFoundError("Expense", expense_id)

    # Access control
    if current_user.role != UserRole.ADMIN:
        if expense.user_id != current_user.id:
            raise ForbiddenError("You can only update your own expenses")
        if expense.status != ExpenseStatus.PENDING:
            raise ForbiddenError("You can only update pending expenses")

    # Validate category if provided
    if data.category_id:
        category = await repo.get_category_by_id(data.category_id, current_user.tenant_id)
        if not category:
            raise NotFoundError("ExpenseCategory", data.category_id)

    updated_expense = await repo.update_expense(
        expense_id=expense_id,
        tenant_id=current_user.tenant_id,
        **data.model_dump(exclude_unset=True),
    )

    await db.commit()

    # Reload with category
    updated_expense = await repo.get_expense_by_id(expense_id, current_user.tenant_id, include_category=True)
    return updated_expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete expense

    Soft deletes an expense record.

    **Access Control:**
    - Users can only delete their own pending expenses
    - Admins can delete any expense
    """
    repo = ExpenseRepository(db)

    # Get expense
    expense = await repo.get_expense_by_id(expense_id, current_user.tenant_id, include_category=False)
    if not expense:
        raise NotFoundError("Expense", expense_id)

    # Access control
    if current_user.role != UserRole.ADMIN:
        if expense.user_id != current_user.id:
            raise ForbiddenError("You can only delete your own expenses")
        if expense.status != ExpenseStatus.PENDING:
            raise ForbiddenError("You can only delete pending expenses")

    success = await repo.delete_expense(expense_id, current_user.tenant_id)
    await db.commit()

    return None


@router.put("/{expense_id}/status", response_model=ExpenseWithCategory)
async def update_expense_status(
    expense_id: UUID,
    data: ExpenseStatusUpdate,
    current_user: User = Depends(require_supervisor_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update expense status (Approve/Reject)

    Allows supervisors and admins to approve or reject expenses.

    **Access Control:** Supervisor or Admin only

    **Validations:**
    - Rejection reason is required when rejecting
    """
    repo = ExpenseRepository(db)

    expense = await repo.update_expense_status(
        expense_id=expense_id,
        tenant_id=current_user.tenant_id,
        status=data.status,
        approved_by=current_user.id if data.status == ExpenseStatus.APPROVED else None,
        rejection_reason=data.rejection_reason,
    )

    if not expense:
        raise NotFoundError("Expense", expense_id)

    await db.commit()

    # Reload with category
    expense = await repo.get_expense_by_id(expense_id, current_user.tenant_id, include_category=True)
    return expense


@router.get("/summary/statistics", response_model=ExpenseSummary)
async def get_expense_summary(
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    date_from: Optional[date] = Query(None, description="Filter by date from"),
    date_to: Optional[date] = Query(None, description="Filter by date to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get expense summary statistics

    Returns summary statistics including totals and counts by status.

    **Access Control:**
    - Sales reps can only see their own summary
    - Supervisors and admins can see summary for all or specific users
    """
    repo = ExpenseRepository(db)

    # Access control
    if current_user.role == UserRole.SALES_REP:
        user_id = current_user.id
    elif user_id and current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise ForbiddenError("You can only view your own summary")

    summary = await repo.get_expense_summary(
        tenant_id=current_user.tenant_id,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )

    # Get category breakdown
    by_category = await repo.get_expenses_by_category(
        tenant_id=current_user.tenant_id,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )

    return ExpenseSummary(
        total_amount=summary["total_amount"],
        total_count=summary["total_count"],
        pending_count=summary["pending_count"],
        approved_count=summary["approved_count"],
        rejected_count=summary["rejected_count"],
        by_category=by_category,
    )


@router.get("/comparison/monthly")
async def get_monthly_comparison(
    year: int = Query(..., ge=2000, le=2100, description="Year to compare"),
    comparison_type: str = Query("monthly", description="Type: monthly, yearly, quarter"),
    category_id: Optional[UUID] = Query(None, description="Filter by category"),
    start_date: Optional[date] = Query(None, description="Custom start date"),
    end_date: Optional[date] = Query(None, description="Custom end date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get expense comparison with multiple options

    Supports monthly, quarterly, and yearly comparisons with optional filters.

    **Access Control:**
    - Sales reps see only their own expenses
    - Supervisors and admins see all tenant expenses
    """
    from sqlalchemy import func, extract, and_
    from models.expense import Expense
    from datetime import datetime, timedelta

    repo = ExpenseRepository(db)

    # Determine user filter
    user_filter = current_user.id if current_user.role == UserRole.SALES_REP else None

    # Build base filters
    base_filters = [
        Expense.tenant_id == current_user.tenant_id,
        Expense.is_deleted == False
    ]

    if user_filter:
        base_filters.append(Expense.user_id == user_filter)

    if category_id:
        base_filters.append(Expense.category_id == category_id)

    # Handle custom date range
    if start_date and end_date:
        query_current = db.query(
            extract('month', Expense.date).label('month'),
            func.coalesce(func.sum(Expense.amount), 0).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            and_(*base_filters),
            Expense.date >= start_date,
            Expense.date <= end_date
        ).group_by(extract('month', Expense.date))

        # Previous period (same duration)
        duration = (end_date - start_date).days
        prev_start = start_date - timedelta(days=duration + 1)
        prev_end = start_date - timedelta(days=1)

        query_previous = db.query(
            extract('month', Expense.date).label('month'),
            func.coalesce(func.sum(Expense.amount), 0).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            and_(*base_filters),
            Expense.date >= prev_start,
            Expense.date <= prev_end
        ).group_by(extract('month', Expense.date))

    elif comparison_type == "quarter":
        # Quarterly comparison
        current_quarter = (datetime.now().month - 1) // 3 + 1
        query_current = db.query(
            extract('quarter', Expense.date).label('quarter'),
            func.coalesce(func.sum(Expense.amount), 0).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            and_(*base_filters),
            extract('year', Expense.date) == year
        ).group_by(extract('quarter', Expense.date))

        query_previous = db.query(
            extract('quarter', Expense.date).label('quarter'),
            func.coalesce(func.sum(Expense.amount), 0).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            and_(*base_filters),
            extract('year', Expense.date) == year - 1
        ).group_by(extract('quarter', Expense.date))

    elif comparison_type == "yearly":
        # Yearly comparison (last 5 years)
        query_current = db.query(
            extract('year', Expense.date).label('year_num'),
            func.coalesce(func.sum(Expense.amount), 0).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            and_(*base_filters),
            extract('year', Expense.date) >= year - 4,
            extract('year', Expense.date) <= year
        ).group_by(extract('year', Expense.date))

        # No previous for yearly
        query_previous = None

    else:  # monthly (default)
        query_current = db.query(
            extract('month', Expense.date).label('month'),
            func.coalesce(func.sum(Expense.amount), 0).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            and_(*base_filters),
            extract('year', Expense.date) == year
        ).group_by(extract('month', Expense.date))

        query_previous = db.query(
            extract('month', Expense.date).label('month'),
            func.coalesce(func.sum(Expense.amount), 0).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            and_(*base_filters),
            extract('year', Expense.date) == year - 1
        ).group_by(extract('month', Expense.date))

    # Execute queries
    current_results = await db.execute(query_current)
    current_data = {}

    if comparison_type == "quarter":
        current_data = {int(row.quarter): {"total": float(row.total), "count": row.count} for row in current_results}
    elif comparison_type == "yearly":
        current_data = {int(row.year_num): {"total": float(row.total), "count": row.count} for row in current_results}
    else:
        current_data = {int(row.month): {"total": float(row.total), "count": row.count} for row in current_results}

    previous_data = {}
    if query_previous:
        previous_results = await db.execute(query_previous)
        if comparison_type == "quarter":
            previous_data = {int(row.quarter): {"total": float(row.total), "count": row.count} for row in previous_results}
        else:
            previous_data = {int(row.month): {"total": float(row.total), "count": row.count} for row in previous_results}

    # Build response based on comparison type
    if comparison_type == "quarter":
        labels = ['Q1', 'Q2', 'Q3', 'Q4']
        data_points = []
        for q in range(1, 5):
            current = current_data.get(q, {"total": 0, "count": 0})
            previous = previous_data.get(q, {"total": 0, "count": 0})
            data_points.append({
                "month": labels[q - 1],
                "month_num": q,
                "actual": current["total"],
                "previous": previous["total"],
                "actual_count": current["count"],
                "previous_count": previous["count"],
            })

    elif comparison_type == "yearly":
        data_points = []
        for y in range(year - 4, year + 1):
            current = current_data.get(y, {"total": 0, "count": 0})
            data_points.append({
                "month": str(y),
                "month_num": y,
                "actual": current["total"],
                "previous": 0,
                "actual_count": current["count"],
                "previous_count": 0,
            })

    else:  # monthly
        months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        data_points = []
        for month_num in range(1, 13):
            current = current_data.get(month_num, {"total": 0, "count": 0})
            previous = previous_data.get(month_num, {"total": 0, "count": 0})
            data_points.append({
                "month": months[month_num - 1],
                "month_num": month_num,
                "actual": current["total"],
                "previous": previous["total"],
                "actual_count": current["count"],
                "previous_count": previous["count"],
            })

    # Calculate summary statistics
    total_actual = sum(item["actual"] for item in data_points)
    total_previous = sum(item["previous"] for item in data_points)
    avg_actual = total_actual / len(data_points) if total_actual > 0 and len(data_points) > 0 else 0

    # Find min and max
    points_with_data = [item for item in data_points if item["actual"] > 0]
    min_point = min(points_with_data, key=lambda x: x["actual"]) if points_with_data else None
    max_point = max(points_with_data, key=lambda x: x["actual"]) if points_with_data else None

    # Calculate percentage change
    pct_change = ((total_actual - total_previous) / total_previous * 100) if total_previous > 0 else 0

    return {
        "year": year,
        "comparison_type": comparison_type,
        "monthly_data": data_points,
        "summary": {
            "total_actual": total_actual,
            "total_previous": total_previous,
            "average_monthly": avg_actual,
            "percent_change": round(pct_change, 2),
            "min_month": {
                "name": min_point["month"],
                "amount": min_point["actual"]
            } if min_point else None,
            "max_month": {
                "name": max_point["month"],
                "amount": max_point["actual"]
            } if max_point else None,
        }
    }


@router.get("/comparison/export/excel")
async def export_comparison_excel(
    year: int = Query(..., ge=2000, le=2100, description="Year to export"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export monthly expense comparison to Excel

    Downloads an Excel file with monthly comparison data and summary statistics.
    """
    from sqlalchemy import select, func, extract, case
    from models.expense import Expense

    # Build query for current year
    query_current = select(
        extract('month', Expense.date).label('month'),
        func.coalesce(func.sum(Expense.amount), 0).label('total'),
        func.count(Expense.id).label('count')
    ).where(
        Expense.tenant_id == current_user.tenant_id,
        Expense.is_deleted == False,
        extract('year', Expense.date) == year
    ).group_by(extract('month', Expense.date))

    # Build query for previous year
    query_previous = select(
        extract('month', Expense.date).label('month'),
        func.coalesce(func.sum(Expense.amount), 0).label('total'),
        func.count(Expense.id).label('count')
    ).where(
        Expense.tenant_id == current_user.tenant_id,
        Expense.is_deleted == False,
        extract('year', Expense.date) == year - 1
    ).group_by(extract('month', Expense.date))

    # Execute queries
    result_current = await db.execute(query_current)
    result_previous = await db.execute(query_previous)

    current_data = {row.month: {"total": float(row.total), "count": row.count}
                    for row in result_current.all()}
    previous_data = {row.month: {"total": float(row.total), "count": row.count}
                     for row in result_previous.all()}

    # Build monthly data
    month_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                   "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

    monthly_data = []
    total_actual = 0
    total_previous = 0

    for month_num in range(1, 13):
        current = current_data.get(month_num, {"total": 0, "count": 0})
        previous = previous_data.get(month_num, {"total": 0, "count": 0})

        monthly_data.append({
            "month": month_names[month_num - 1],
            "month_num": month_num,
            "actual": current["total"],
            "previous": previous["total"],
            "actual_count": current["count"],
            "previous_count": previous["count"]
        })

        total_actual += current["total"]
        total_previous += previous["total"]

    # Calculate statistics
    avg_actual = total_actual / 12 if total_actual > 0 else 0
    pct_change = ((total_actual - total_previous) / total_previous * 100) if total_previous > 0 else 0

    # Find min and max months
    months_with_data = [m for m in monthly_data if m["actual"] > 0]
    min_month = min(months_with_data, key=lambda x: x["actual"]) if months_with_data else None
    max_month = max(months_with_data, key=lambda x: x["actual"]) if months_with_data else None

    data = {
        "year": year,
        "monthly_data": monthly_data,
        "summary": {
            "total_actual": total_actual,
            "total_previous": total_previous,
            "average_monthly": avg_actual,
            "percent_change": round(pct_change, 2),
            "min_month": {
                "name": min_month["month"],
                "amount": min_month["actual"]
            } if min_month else None,
            "max_month": {
                "name": max_month["month"],
                "amount": max_month["actual"]
            } if max_month else None,
        }
    }

    # Generate Excel file
    excel_file = create_excel_comparison(
        data=data,
        title="Comparación de Gastos",
        year=year,
        company_name="OnQuota"
    )

    # Return as download
    filename = f"gastos_comparacion_{year}.xlsx"
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
    Export monthly expense comparison to PDF

    Downloads a PDF file with monthly comparison data and summary statistics.
    """
    from sqlalchemy import select, func, extract, case
    from models.expense import Expense

    # Build query for current year
    query_current = select(
        extract('month', Expense.date).label('month'),
        func.coalesce(func.sum(Expense.amount), 0).label('total'),
        func.count(Expense.id).label('count')
    ).where(
        Expense.tenant_id == current_user.tenant_id,
        Expense.is_deleted == False,
        extract('year', Expense.date) == year
    ).group_by(extract('month', Expense.date))

    # Build query for previous year
    query_previous = select(
        extract('month', Expense.date).label('month'),
        func.coalesce(func.sum(Expense.amount), 0).label('total'),
        func.count(Expense.id).label('count')
    ).where(
        Expense.tenant_id == current_user.tenant_id,
        Expense.is_deleted == False,
        extract('year', Expense.date) == year - 1
    ).group_by(extract('month', Expense.date))

    # Execute queries
    result_current = await db.execute(query_current)
    result_previous = await db.execute(query_previous)

    current_data = {row.month: {"total": float(row.total), "count": row.count}
                    for row in result_current.all()}
    previous_data = {row.month: {"total": float(row.total), "count": row.count}
                     for row in result_previous.all()}

    # Build monthly data
    month_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                   "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

    monthly_data = []
    total_actual = 0
    total_previous = 0

    for month_num in range(1, 13):
        current = current_data.get(month_num, {"total": 0, "count": 0})
        previous = previous_data.get(month_num, {"total": 0, "count": 0})

        monthly_data.append({
            "month": month_names[month_num - 1],
            "month_num": month_num,
            "actual": current["total"],
            "previous": previous["total"],
            "actual_count": current["count"],
            "previous_count": previous["count"]
        })

        total_actual += current["total"]
        total_previous += previous["total"]

    # Calculate statistics
    avg_actual = total_actual / 12 if total_actual > 0 else 0
    pct_change = ((total_actual - total_previous) / total_previous * 100) if total_previous > 0 else 0

    # Find min and max months
    months_with_data = [m for m in monthly_data if m["actual"] > 0]
    min_month = min(months_with_data, key=lambda x: x["actual"]) if months_with_data else None
    max_month = max(months_with_data, key=lambda x: x["actual"]) if months_with_data else None

    data = {
        "year": year,
        "monthly_data": monthly_data,
        "summary": {
            "total_actual": total_actual,
            "total_previous": total_previous,
            "average_monthly": avg_actual,
            "percent_change": round(pct_change, 2),
            "min_month": {
                "name": min_month["month"],
                "amount": min_month["actual"]
            } if min_month else None,
            "max_month": {
                "name": max_month["month"],
                "amount": max_month["actual"]
            } if max_month else None,
        }
    }

    # Generate PDF file
    pdf_file = create_pdf_comparison(
        data=data,
        title="Comparación de Gastos",
        year=year,
        company_name="OnQuota"
    )

    # Return as download
    filename = f"gastos_comparacion_{year}.pdf"
    return StreamingResponse(
        pdf_file,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
