"""
Repository for sales/quotes database operations
Handles CRUD operations for quotes and quote items with RBAC controls
"""
from datetime import date, datetime
from typing import Optional, List, Tuple, Dict
from uuid import UUID
from decimal import Decimal
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.quote import Quote, SaleStatus
from models.quote_item import QuoteItem
from models.user import UserRole
from core.logging import get_logger

logger = get_logger(__name__)


class SalesRepository:
    """
    Repository for sales/quotes operations
    Implements multi-tenant data isolation and RBAC controls
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Quote Operations
    # ========================================================================

    async def create_quote(
        self,
        tenant_id: UUID,
        client_id: UUID,
        sales_rep_id: UUID,
        quote_number: str,
        total_amount: Decimal,
        currency: str,
        valid_until: date,
        status: SaleStatus = SaleStatus.DRAFT,
        notes: Optional[str] = None,
    ) -> Quote:
        """
        Create a new quote

        Args:
            tenant_id: Tenant identifier for multi-tenancy
            client_id: Client receiving the quote
            sales_rep_id: Sales representative creating the quote
            quote_number: Unique quote number
            total_amount: Total quote amount
            currency: Currency code (e.g., USD, EUR)
            valid_until: Quote expiration date
            status: Quote status (default: DRAFT)
            notes: Optional notes

        Returns:
            Created Quote object
        """
        quote = Quote(
            tenant_id=tenant_id,
            client_id=client_id,
            sales_rep_id=sales_rep_id,
            quote_number=quote_number,
            total_amount=total_amount,
            currency=currency,
            status=status,
            valid_until=valid_until,
            notes=notes,
        )

        self.db.add(quote)
        await self.db.flush()
        await self.db.refresh(quote)

        logger.info(f"Created quote: {quote.id} - {quote.quote_number}")
        return quote

    async def get_quote_by_id(
        self,
        quote_id: UUID,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
        include_items: bool = True,
    ) -> Optional[Quote]:
        """
        Get quote by ID with RBAC controls

        Args:
            quote_id: Quote identifier
            tenant_id: Tenant identifier
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC
            include_items: Whether to include quote items

        Returns:
            Quote object or None if not found/unauthorized
        """
        conditions = [
            Quote.id == quote_id,
            Quote.tenant_id == tenant_id,
            Quote.is_deleted == False,
        ]

        # RBAC: Sales reps can only see their own quotes
        if user_role == UserRole.SALES_REP and user_id:
            conditions.append(Quote.sales_rep_id == user_id)

        query = select(Quote).where(and_(*conditions))

        # OPTIMIZATION: Eager load related entities to prevent N+1 queries
        query = query.options(
            selectinload(Quote.client),
            selectinload(Quote.sales_rep),
        )

        if include_items:
            query = query.options(selectinload(Quote.items))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_quotes(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
        status: Optional[SaleStatus] = None,
        client_id: Optional[UUID] = None,
        sales_rep_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Quote], int]:
        """
        List quotes with filters, pagination, and RBAC

        Args:
            tenant_id: Tenant identifier
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC
            status: Filter by status
            client_id: Filter by client
            sales_rep_id: Filter by sales rep
            date_from: Filter by creation date from
            date_to: Filter by creation date to
            search: Search in quote number and notes
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (quotes list, total count)
        """
        # Build conditions
        conditions = [
            Quote.tenant_id == tenant_id,
            Quote.is_deleted == False,
        ]

        # RBAC: Sales reps can only see their own quotes
        if user_role == UserRole.SALES_REP and user_id:
            conditions.append(Quote.sales_rep_id == user_id)

        if status:
            conditions.append(Quote.status == status)

        if client_id:
            conditions.append(Quote.client_id == client_id)

        if sales_rep_id:
            conditions.append(Quote.sales_rep_id == sales_rep_id)

        if date_from:
            conditions.append(Quote.created_at >= datetime.combine(date_from, datetime.min.time()))

        if date_to:
            conditions.append(Quote.created_at <= datetime.combine(date_to, datetime.max.time()))

        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Quote.quote_number.ilike(search_pattern),
                    Quote.notes.ilike(search_pattern),
                )
            )

        # Count query
        count_query = select(func.count()).select_from(Quote).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        # Data query with pagination
        # OPTIMIZATION: Eager load related entities to prevent N+1 queries
        offset = (page - 1) * page_size
        data_query = (
            select(Quote)
            .where(and_(*conditions))
            .options(
                selectinload(Quote.items),
                selectinload(Quote.client),
                selectinload(Quote.sales_rep),
            )
            .order_by(desc(Quote.created_at))
            .limit(page_size)
            .offset(offset)
        )

        result = await self.db.execute(data_query)
        quotes = list(result.scalars().all())

        return quotes, total

    async def update_quote(
        self,
        quote_id: UUID,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
        **kwargs,
    ) -> Optional[Quote]:
        """
        Update quote with RBAC controls

        Args:
            quote_id: Quote identifier
            tenant_id: Tenant identifier
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC
            **kwargs: Fields to update

        Returns:
            Updated Quote object or None if not found/unauthorized
        """
        quote = await self.get_quote_by_id(
            quote_id, tenant_id, user_id, user_role, include_items=False
        )
        if not quote:
            return None

        for key, value in kwargs.items():
            if hasattr(quote, key) and value is not None:
                setattr(quote, key, value)

        await self.db.flush()
        await self.db.refresh(quote)

        logger.info(f"Updated quote: {quote.id}")
        return quote

    async def delete_quote(
        self,
        quote_id: UUID,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
    ) -> bool:
        """
        Soft delete quote with RBAC controls

        Args:
            quote_id: Quote identifier
            tenant_id: Tenant identifier
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC

        Returns:
            True if deleted, False if not found/unauthorized
        """
        quote = await self.get_quote_by_id(
            quote_id, tenant_id, user_id, user_role, include_items=False
        )
        if not quote:
            return False

        quote.soft_delete()
        await self.db.flush()

        logger.info(f"Deleted quote: {quote.id}")
        return True

    async def update_quote_status(
        self,
        quote_id: UUID,
        tenant_id: UUID,
        status: SaleStatus,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
    ) -> Optional[Quote]:
        """
        Update quote status

        Args:
            quote_id: Quote identifier
            tenant_id: Tenant identifier
            status: New status
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC

        Returns:
            Updated Quote object or None if not found/unauthorized
        """
        quote = await self.get_quote_by_id(
            quote_id, tenant_id, user_id, user_role, include_items=False
        )
        if not quote:
            return None

        quote.status = status
        await self.db.flush()
        await self.db.refresh(quote)

        logger.info(f"Updated quote status: {quote.id} -> {status}")
        return quote

    async def get_quotes_by_status(
        self,
        tenant_id: UUID,
        status: SaleStatus,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
    ) -> List[Quote]:
        """
        Get all quotes with specific status

        Args:
            tenant_id: Tenant identifier
            status: Status to filter by
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC

        Returns:
            List of Quote objects
        """
        quotes, _ = await self.get_quotes(
            tenant_id=tenant_id,
            user_id=user_id,
            user_role=user_role,
            status=status,
            page=1,
            page_size=1000,  # Get all matching quotes
        )
        return quotes

    async def get_quotes_by_client(
        self,
        tenant_id: UUID,
        client_id: UUID,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
    ) -> List[Quote]:
        """
        Get all quotes for specific client

        Args:
            tenant_id: Tenant identifier
            client_id: Client identifier
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC

        Returns:
            List of Quote objects
        """
        quotes, _ = await self.get_quotes(
            tenant_id=tenant_id,
            user_id=user_id,
            user_role=user_role,
            client_id=client_id,
            page=1,
            page_size=1000,  # Get all matching quotes
        )
        return quotes

    async def calculate_quote_total(self, quote_id: UUID, tenant_id: UUID) -> Decimal:
        """
        Calculate total amount from quote items

        Args:
            quote_id: Quote identifier
            tenant_id: Tenant identifier

        Returns:
            Total amount as Decimal
        """
        query = select(func.sum(QuoteItem.subtotal)).where(
            and_(
                QuoteItem.quote_id == quote_id,
                QuoteItem.tenant_id == tenant_id,
                QuoteItem.is_deleted == False,
            )
        )

        result = await self.db.execute(query)
        total = result.scalar()

        return total or Decimal("0.00")

    # ========================================================================
    # QuoteItem Operations
    # ========================================================================

    async def add_quote_item(
        self,
        tenant_id: UUID,
        quote_id: UUID,
        product_name: str,
        quantity: Decimal,
        unit_price: Decimal,
        discount_percent: Decimal = Decimal("0"),
        description: Optional[str] = None,
    ) -> QuoteItem:
        """
        Add item to quote and calculate subtotal

        Args:
            tenant_id: Tenant identifier
            quote_id: Quote identifier
            product_name: Product/service name
            quantity: Quantity
            unit_price: Unit price
            discount_percent: Discount percentage (0-100)
            description: Optional description

        Returns:
            Created QuoteItem object
        """
        subtotal = self.calculate_item_subtotal(quantity, unit_price, discount_percent)

        item = QuoteItem(
            tenant_id=tenant_id,
            quote_id=quote_id,
            product_name=product_name,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            discount_percent=discount_percent,
            subtotal=subtotal,
        )

        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)

        logger.info(f"Added quote item: {item.id} - {item.product_name}")
        return item

    async def get_quote_items(
        self,
        quote_id: UUID,
        tenant_id: UUID,
    ) -> List[QuoteItem]:
        """
        Get all items for a quote

        Args:
            quote_id: Quote identifier
            tenant_id: Tenant identifier

        Returns:
            List of QuoteItem objects
        """
        result = await self.db.execute(
            select(QuoteItem).where(
                and_(
                    QuoteItem.quote_id == quote_id,
                    QuoteItem.tenant_id == tenant_id,
                    QuoteItem.is_deleted == False,
                )
            ).order_by(QuoteItem.created_at)
        )
        return list(result.scalars().all())

    async def get_quote_item(
        self,
        item_id: UUID,
        tenant_id: UUID,
    ) -> Optional[QuoteItem]:
        """
        Get specific quote item

        Args:
            item_id: Item identifier
            tenant_id: Tenant identifier

        Returns:
            QuoteItem object or None
        """
        result = await self.db.execute(
            select(QuoteItem).where(
                and_(
                    QuoteItem.id == item_id,
                    QuoteItem.tenant_id == tenant_id,
                    QuoteItem.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    async def update_quote_item(
        self,
        item_id: UUID,
        tenant_id: UUID,
        **kwargs,
    ) -> Optional[QuoteItem]:
        """
        Update quote item and recalculate subtotal if pricing changes

        Args:
            item_id: Item identifier
            tenant_id: Tenant identifier
            **kwargs: Fields to update

        Returns:
            Updated QuoteItem object or None
        """
        item = await self.get_quote_item(item_id, tenant_id)
        if not item:
            return None

        # Update fields
        for key, value in kwargs.items():
            if hasattr(item, key) and value is not None:
                setattr(item, key, value)

        # Recalculate subtotal if pricing fields changed
        if any(k in kwargs for k in ["quantity", "unit_price", "discount_percent"]):
            item.subtotal = self.calculate_item_subtotal(
                item.quantity, item.unit_price, item.discount_percent
            )

        await self.db.flush()
        await self.db.refresh(item)

        logger.info(f"Updated quote item: {item.id}")
        return item

    async def delete_quote_item(
        self,
        item_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Soft delete quote item

        Args:
            item_id: Item identifier
            tenant_id: Tenant identifier

        Returns:
            True if deleted, False if not found
        """
        item = await self.get_quote_item(item_id, tenant_id)
        if not item:
            return False

        item.soft_delete()
        await self.db.flush()

        logger.info(f"Deleted quote item: {item.id}")
        return True

    @staticmethod
    def calculate_item_subtotal(
        quantity: Decimal,
        unit_price: Decimal,
        discount_percent: Decimal = Decimal("0"),
    ) -> Decimal:
        """
        Calculate item subtotal with discount

        Formula: (quantity * unit_price) * (1 - discount_percent/100)

        Args:
            quantity: Item quantity
            unit_price: Price per unit
            discount_percent: Discount percentage (0-100)

        Returns:
            Calculated subtotal
        """
        base_amount = quantity * unit_price
        discount_multiplier = Decimal("1") - (discount_percent / Decimal("100"))
        subtotal = base_amount * discount_multiplier
        return round(subtotal, 2)

    # ========================================================================
    # Statistics and Analytics
    # ========================================================================

    async def get_quote_summary(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Dict:
        """
        Get quote summary statistics

        Args:
            tenant_id: Tenant identifier
            user_id: Current user ID for RBAC
            user_role: Current user role for RBAC
            date_from: Filter by creation date from
            date_to: Filter by creation date to

        Returns:
            Dictionary with summary statistics including:
            - Total quotes and amount
            - Counts and amounts by status
            - Conversion rate
            - Top 5 clients by quote value
        """
        conditions = [
            Quote.tenant_id == tenant_id,
            Quote.is_deleted == False,
        ]

        # RBAC: Sales reps can only see their own quotes
        if user_role == UserRole.SALES_REP and user_id:
            conditions.append(Quote.sales_rep_id == user_id)

        if date_from:
            conditions.append(Quote.created_at >= datetime.combine(date_from, datetime.min.time()))

        if date_to:
            conditions.append(Quote.created_at <= datetime.combine(date_to, datetime.max.time()))

        # Overall statistics
        query = select(
            func.count(Quote.id).label("total_quotes"),
            func.sum(Quote.total_amount).label("total_amount"),
            func.sum(
                func.case((Quote.status == SaleStatus.DRAFT, 1), else_=0)
            ).label("draft_count"),
            func.sum(
                func.case((Quote.status == SaleStatus.DRAFT, Quote.total_amount), else_=0)
            ).label("draft_amount"),
            func.sum(
                func.case((Quote.status == SaleStatus.SENT, 1), else_=0)
            ).label("sent_count"),
            func.sum(
                func.case((Quote.status == SaleStatus.SENT, Quote.total_amount), else_=0)
            ).label("sent_amount"),
            func.sum(
                func.case((Quote.status == SaleStatus.ACCEPTED, 1), else_=0)
            ).label("accepted_count"),
            func.sum(
                func.case((Quote.status == SaleStatus.ACCEPTED, Quote.total_amount), else_=0)
            ).label("accepted_amount"),
            func.sum(
                func.case((Quote.status == SaleStatus.REJECTED, 1), else_=0)
            ).label("rejected_count"),
            func.sum(
                func.case((Quote.status == SaleStatus.REJECTED, Quote.total_amount), else_=0)
            ).label("rejected_amount"),
            func.sum(
                func.case((Quote.status == SaleStatus.EXPIRED, 1), else_=0)
            ).label("expired_count"),
            func.sum(
                func.case((Quote.status == SaleStatus.EXPIRED, Quote.total_amount), else_=0)
            ).label("expired_amount"),
        ).where(and_(*conditions))

        result = await self.db.execute(query)
        row = result.first()

        # Calculate conversion rate: accepted / (accepted + rejected + expired)
        total_concluded = (row.accepted_count or 0) + (row.rejected_count or 0) + (row.expired_count or 0)
        conversion_rate = (
            (row.accepted_count / total_concluded * 100) if total_concluded > 0 else 0.0
        )

        # Get top 5 clients by quote value
        top_clients_query = (
            select(
                Quote.client_id,
                func.sum(Quote.total_amount).label("total_value"),
                func.count(Quote.id).label("quote_count"),
            )
            .where(and_(*conditions))
            .group_by(Quote.client_id)
            .order_by(desc("total_value"))
            .limit(5)
        )

        top_clients_result = await self.db.execute(top_clients_query)
        top_clients = [
            {
                "client_id": str(row.client_id),
                "total_value": float(row.total_value or 0),
                "quote_count": row.quote_count or 0,
            }
            for row in top_clients_result
        ]

        return {
            "total_quotes": row.total_quotes or 0,
            "total_amount": row.total_amount or Decimal("0.00"),
            "draft_count": row.draft_count or 0,
            "draft_amount": row.draft_amount or Decimal("0.00"),
            "sent_count": row.sent_count or 0,
            "sent_amount": row.sent_amount or Decimal("0.00"),
            "accepted_count": row.accepted_count or 0,
            "accepted_amount": row.accepted_amount or Decimal("0.00"),
            "rejected_count": row.rejected_count or 0,
            "rejected_amount": row.rejected_amount or Decimal("0.00"),
            "expired_count": row.expired_count or 0,
            "expired_amount": row.expired_amount or Decimal("0.00"),
            "conversion_rate": round(conversion_rate, 2),
            "top_clients": top_clients,
        }
