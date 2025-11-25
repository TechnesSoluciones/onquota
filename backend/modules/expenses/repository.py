"""
Repository for expense-related database operations
OPTIMIZED: Fixed N+1 queries with eager loading and added caching
"""
from datetime import date, datetime
from typing import Optional, List, Tuple
from uuid import UUID
from decimal import Decimal
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.expense import Expense, ExpenseStatus
from models.expense_category import ExpenseCategory
from core.logging import get_logger
from core.cache import cached, invalidate_cache_pattern

logger = get_logger(__name__)


class ExpenseRepository:
    """Repository for expense operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # ExpenseCategory Operations
    # ========================================================================

    @invalidate_cache_pattern("expense:categories:*")
    async def create_category(
        self,
        tenant_id: UUID,
        name: str,
        description: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
    ) -> ExpenseCategory:
        """
        Create a new expense category
        OPTIMIZED: Invalidates category cache after creation
        """
        category = ExpenseCategory(
            tenant_id=tenant_id,
            name=name,
            description=description,
            icon=icon,
            color=color,
        )

        self.db.add(category)
        await self.db.flush()
        await self.db.refresh(category)

        logger.info(f"Created expense category: {category.id} - {category.name}")
        return category

    async def get_category_by_id(
        self,
        category_id: UUID,
        tenant_id: UUID,
    ) -> Optional[ExpenseCategory]:
        """Get category by ID"""
        result = await self.db.execute(
            select(ExpenseCategory).where(
                and_(
                    ExpenseCategory.id == category_id,
                    ExpenseCategory.tenant_id == tenant_id,
                    ExpenseCategory.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    @cached(ttl=3600, key_prefix="expense:categories")
    async def list_categories(
        self,
        tenant_id: UUID,
        is_active: Optional[bool] = None,
    ) -> List[ExpenseCategory]:
        """
        List all categories for a tenant
        OPTIMIZED: Cached for 1 hour (lookup data changes infrequently)
        """
        conditions = [
            ExpenseCategory.tenant_id == tenant_id,
            ExpenseCategory.is_deleted == False,
        ]

        if is_active is not None:
            conditions.append(ExpenseCategory.is_active == is_active)

        result = await self.db.execute(
            select(ExpenseCategory)
            .where(and_(*conditions))
            .order_by(ExpenseCategory.name)
        )
        return list(result.scalars().all())

    async def update_category(
        self,
        category_id: UUID,
        tenant_id: UUID,
        **kwargs,
    ) -> Optional[ExpenseCategory]:
        """Update expense category"""
        category = await self.get_category_by_id(category_id, tenant_id)
        if not category:
            return None

        for key, value in kwargs.items():
            if hasattr(category, key) and value is not None:
                setattr(category, key, value)

        await self.db.flush()
        await self.db.refresh(category)

        logger.info(f"Updated expense category: {category.id}")
        return category

    async def delete_category(
        self,
        category_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Soft delete expense category"""
        category = await self.get_category_by_id(category_id, tenant_id)
        if not category:
            return False

        category.soft_delete()
        await self.db.flush()

        logger.info(f"Deleted expense category: {category.id}")
        return True

    # ========================================================================
    # Expense Operations
    # ========================================================================

    async def create_expense(
        self,
        tenant_id: UUID,
        user_id: UUID,
        amount: Decimal,
        currency: str,
        description: str,
        expense_date: date,
        category_id: Optional[UUID] = None,
        receipt_url: Optional[str] = None,
        receipt_number: Optional[str] = None,
        vendor_name: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Expense:
        """Create a new expense"""
        expense = Expense(
            tenant_id=tenant_id,
            user_id=user_id,
            category_id=category_id,
            amount=amount,
            currency=currency,
            description=description,
            date=expense_date,
            receipt_url=receipt_url,
            receipt_number=receipt_number,
            vendor_name=vendor_name,
            notes=notes,
            status=ExpenseStatus.PENDING,
        )

        self.db.add(expense)
        await self.db.flush()
        await self.db.refresh(expense)

        logger.info(f"Created expense: {expense.id} - {expense.amount} {expense.currency}")
        return expense

    async def get_expense_by_id(
        self,
        expense_id: UUID,
        tenant_id: UUID,
        include_category: bool = True,
    ) -> Optional[Expense]:
        """Get expense by ID with optional category"""
        query = select(Expense).where(
            and_(
                Expense.id == expense_id,
                Expense.tenant_id == tenant_id,
                Expense.is_deleted == False,
            )
        )

        if include_category:
            query = query.options(selectinload(Expense.category))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_expenses(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        status: Optional[ExpenseStatus] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Expense], int]:
        """
        List expenses with filters and pagination

        Returns:
            Tuple of (expenses list, total count)
        """
        # Build conditions
        conditions = [
            Expense.tenant_id == tenant_id,
            Expense.is_deleted == False,
        ]

        if user_id:
            conditions.append(Expense.user_id == user_id)

        if category_id:
            conditions.append(Expense.category_id == category_id)

        if status:
            conditions.append(Expense.status == status)

        if date_from:
            conditions.append(Expense.date >= date_from)

        if date_to:
            conditions.append(Expense.date <= date_to)

        if min_amount:
            conditions.append(Expense.amount >= min_amount)

        if max_amount:
            conditions.append(Expense.amount <= max_amount)

        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Expense.description.ilike(search_pattern),
                    Expense.vendor_name.ilike(search_pattern),
                    Expense.notes.ilike(search_pattern),
                )
            )

        # Count query
        count_query = select(func.count()).select_from(Expense).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        # Data query with pagination
        offset = (page - 1) * page_size
        data_query = (
            select(Expense)
            .where(and_(*conditions))
            .options(selectinload(Expense.category))
            .order_by(desc(Expense.date), desc(Expense.created_at))
            .limit(page_size)
            .offset(offset)
        )

        result = await self.db.execute(data_query)
        expenses = list(result.scalars().all())

        return expenses, total

    async def update_expense(
        self,
        expense_id: UUID,
        tenant_id: UUID,
        **kwargs,
    ) -> Optional[Expense]:
        """Update expense"""
        expense = await self.get_expense_by_id(expense_id, tenant_id, include_category=False)
        if not expense:
            return None

        for key, value in kwargs.items():
            if hasattr(expense, key) and value is not None:
                setattr(expense, key, value)

        await self.db.flush()
        await self.db.refresh(expense)

        logger.info(f"Updated expense: {expense.id}")
        return expense

    async def delete_expense(
        self,
        expense_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Soft delete expense"""
        expense = await self.get_expense_by_id(expense_id, tenant_id, include_category=False)
        if not expense:
            return False

        expense.soft_delete()
        await self.db.flush()

        logger.info(f"Deleted expense: {expense.id}")
        return True

    async def update_expense_status(
        self,
        expense_id: UUID,
        tenant_id: UUID,
        status: ExpenseStatus,
        approved_by: Optional[UUID] = None,
        rejection_reason: Optional[str] = None,
    ) -> Optional[Expense]:
        """Update expense status (approve/reject)"""
        expense = await self.get_expense_by_id(expense_id, tenant_id, include_category=False)
        if not expense:
            return None

        expense.status = status

        if status == ExpenseStatus.APPROVED:
            expense.approved_by = approved_by
            expense.rejection_reason = None
        elif status == ExpenseStatus.REJECTED:
            expense.rejection_reason = rejection_reason
            expense.approved_by = None

        await self.db.flush()
        await self.db.refresh(expense)

        logger.info(f"Updated expense status: {expense.id} -> {status}")
        return expense

    async def get_expense_summary(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> dict:
        """
        Get expense summary with totals and counts

        Returns:
            Dictionary with summary statistics
        """
        conditions = [
            Expense.tenant_id == tenant_id,
            Expense.is_deleted == False,
        ]

        if user_id:
            conditions.append(Expense.user_id == user_id)

        if date_from:
            conditions.append(Expense.date >= date_from)

        if date_to:
            conditions.append(Expense.date <= date_to)

        # Total amount and counts by status
        query = select(
            func.sum(Expense.amount).label("total_amount"),
            func.count(Expense.id).label("total_count"),
            func.sum(
                func.case((Expense.status == ExpenseStatus.PENDING, 1), else_=0)
            ).label("pending_count"),
            func.sum(
                func.case((Expense.status == ExpenseStatus.APPROVED, 1), else_=0)
            ).label("approved_count"),
            func.sum(
                func.case((Expense.status == ExpenseStatus.REJECTED, 1), else_=0)
            ).label("rejected_count"),
        ).where(and_(*conditions))

        result = await self.db.execute(query)
        row = result.first()

        return {
            "total_amount": row.total_amount or Decimal("0.00"),
            "total_count": row.total_count or 0,
            "pending_count": row.pending_count or 0,
            "approved_count": row.approved_count or 0,
            "rejected_count": row.rejected_count or 0,
        }

    async def get_expenses_by_category(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[dict]:
        """
        Get expense breakdown by category

        Returns:
            List of dictionaries with category breakdown
        """
        from models.expense_category import ExpenseCategory

        conditions = [
            Expense.tenant_id == tenant_id,
            Expense.is_deleted == False,
        ]

        if user_id:
            conditions.append(Expense.user_id == user_id)

        if date_from:
            conditions.append(Expense.date >= date_from)

        if date_to:
            conditions.append(Expense.date <= date_to)

        # Query with left join to include categories with no expenses
        query = (
            select(
                ExpenseCategory.name.label("category_name"),
                func.coalesce(func.sum(Expense.amount), 0).label("amount"),
                func.count(Expense.id).label("count"),
            )
            .outerjoin(Expense, ExpenseCategory.id == Expense.category_id)
            .where(
                and_(
                    ExpenseCategory.tenant_id == tenant_id,
                    ExpenseCategory.is_active == True,
                )
            )
            .group_by(ExpenseCategory.name)
            .order_by(func.sum(Expense.amount).desc())
        )

        result = await self.db.execute(query)
        rows = result.all()

        breakdown = []
        for row in rows:
            # Only include categories with actual expenses if filters are applied
            if row.amount and Decimal(str(row.amount)) > 0:
                breakdown.append({
                    "category_name": row.category_name,
                    "amount": Decimal(str(row.amount)),
                    "count": row.count,
                })

        return breakdown
