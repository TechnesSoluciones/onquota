"""
Sales Control Repository
Database operations for sales controls (purchase orders)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract, case
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal

from models.sales_control import (
    SalesControl,
    SalesControlStatus,
    SalesControlLine,
    SalesProductLine,
)
from models.client import Client
from models.user import User
from modules.sales.controls.schemas import (
    SalesControlCreate,
    SalesControlUpdate,
    SalesControlStats,
    SalesControlMonthlyStats,
    SalesControlsByClientStats,
)


class SalesControlRepository:
    """Repository for Sales Control operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_sales_control(
        self,
        data: SalesControlCreate,
        tenant_id: UUID,
        current_user_id: UUID,
    ) -> SalesControl:
        """
        Create a new sales control with lines

        Args:
            data: Sales control creation data
            tenant_id: Tenant ID
            current_user_id: ID of user creating the sales control

        Returns:
            Created sales control with lines
        """
        # Determine assigned_to (use provided or default to current user)
        assigned_to = data.assigned_to if data.assigned_to else current_user_id

        # Get client name for denormalization
        client_stmt = select(Client.name).where(
            and_(Client.id == data.client_id, Client.tenant_id == tenant_id)
        )
        client_name = await self.db.scalar(client_stmt)

        # Get sales rep name for denormalization
        user_stmt = select(User.full_name).where(User.id == assigned_to)
        sales_rep_name = await self.db.scalar(user_stmt)

        # Calculate promise_date if not provided
        promise_date = data.promise_date
        if not promise_date and data.lead_time_days:
            promise_date = SalesControl.calculate_promise_date(
                data.po_reception_date, data.lead_time_days
            )
        elif not promise_date:
            # Default 30 days if no lead time provided
            promise_date = data.po_reception_date + timedelta(days=30)

        # Create sales control
        sales_control = SalesControl(
            tenant_id=tenant_id,
            folio_number=data.folio_number,
            client_po_number=data.client_po_number,
            po_reception_date=data.po_reception_date,
            system_entry_date=data.system_entry_date,
            promise_date=promise_date,
            lead_time_days=data.lead_time_days,
            client_id=data.client_id,
            quotation_id=data.quotation_id,
            assigned_to=assigned_to,
            client_name=client_name,
            sales_rep_name=sales_rep_name,
            sales_control_amount=data.sales_control_amount,
            currency=data.currency,
            status=data.status,
            concept=data.concept,
            notes=data.notes,
        )

        self.db.add(sales_control)
        await self.db.flush()

        # Create sales control lines
        for line_data in data.lines:
            # Get product line name for denormalization
            pl_stmt = select(SalesProductLine.name).where(
                and_(
                    SalesProductLine.id == line_data.product_line_id,
                    SalesProductLine.tenant_id == tenant_id,
                )
            )
            product_line_name = await self.db.scalar(pl_stmt)

            line = SalesControlLine(
                tenant_id=tenant_id,
                sales_control_id=sales_control.id,
                product_line_id=line_data.product_line_id,
                product_line_name=product_line_name,
                line_amount=line_data.line_amount,
                description=line_data.description,
            )
            self.db.add(line)

        await self.db.flush()
        await self.db.refresh(sales_control)

        # Load lines relationship
        await self.db.refresh(sales_control, ["lines"])

        return sales_control

    async def get_sales_control(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
        load_lines: bool = False,
    ) -> Optional[SalesControl]:
        """
        Get a sales control by ID

        Args:
            sales_control_id: Sales control ID
            tenant_id: Tenant ID
            load_lines: Whether to load lines relationship

        Returns:
            Sales control if found, None otherwise
        """
        stmt = select(SalesControl).where(
            and_(
                SalesControl.id == sales_control_id,
                SalesControl.tenant_id == tenant_id,
                SalesControl.is_deleted == False,
            )
        )

        if load_lines:
            stmt = stmt.options(selectinload(SalesControl.lines))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_sales_controls(
        self,
        tenant_id: UUID,
        client_id: Optional[UUID] = None,
        assigned_to: Optional[UUID] = None,
        quotation_id: Optional[UUID] = None,
        status: Optional[SalesControlStatus] = None,
        po_date_from: Optional[date] = None,
        po_date_to: Optional[date] = None,
        promise_date_from: Optional[date] = None,
        promise_date_to: Optional[date] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None,
        is_overdue: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[SalesControl], int]:
        """
        Get paginated sales controls with filters

        Args:
            tenant_id: Tenant ID
            client_id: Filter by client
            assigned_to: Filter by sales rep
            quotation_id: Filter by quotation
            status: Filter by status
            po_date_from: Filter PO date from
            po_date_to: Filter PO date to
            promise_date_from: Filter promise date from
            promise_date_to: Filter promise date to
            min_amount: Minimum amount
            max_amount: Maximum amount
            is_overdue: Filter overdue orders
            search: Search in folio, PO number, concept
            page: Page number
            page_size: Items per page

        Returns:
            Tuple of (sales controls list, total count)
        """
        conditions = [
            SalesControl.tenant_id == tenant_id,
            SalesControl.is_deleted == False,
        ]

        if client_id:
            conditions.append(SalesControl.client_id == client_id)
        if assigned_to:
            conditions.append(SalesControl.assigned_to == assigned_to)
        if quotation_id:
            conditions.append(SalesControl.quotation_id == quotation_id)
        if status:
            conditions.append(SalesControl.status == status)
        if po_date_from:
            conditions.append(SalesControl.po_reception_date >= po_date_from)
        if po_date_to:
            conditions.append(SalesControl.po_reception_date <= po_date_to)
        if promise_date_from:
            conditions.append(SalesControl.promise_date >= promise_date_from)
        if promise_date_to:
            conditions.append(SalesControl.promise_date <= promise_date_to)
        if min_amount is not None:
            conditions.append(SalesControl.sales_control_amount >= min_amount)
        if max_amount is not None:
            conditions.append(SalesControl.sales_control_amount <= max_amount)

        # Overdue filter
        if is_overdue is not None:
            if is_overdue:
                # Overdue: promise_date < today AND status not in (delivered, invoiced, paid, cancelled)
                conditions.append(
                    and_(
                        SalesControl.promise_date < date.today(),
                        SalesControl.status.not_in([
                            SalesControlStatus.DELIVERED,
                            SalesControlStatus.INVOICED,
                            SalesControlStatus.PAID,
                            SalesControlStatus.CANCELLED,
                        ])
                    )
                )
            else:
                # Not overdue
                conditions.append(
                    or_(
                        SalesControl.promise_date >= date.today(),
                        SalesControl.status.in_([
                            SalesControlStatus.DELIVERED,
                            SalesControlStatus.INVOICED,
                            SalesControlStatus.PAID,
                            SalesControlStatus.CANCELLED,
                        ])
                    )
                )

        # Search
        if search:
            search_term = f"%{search}%"
            conditions.append(
                or_(
                    SalesControl.folio_number.ilike(search_term),
                    SalesControl.client_po_number.ilike(search_term),
                    SalesControl.concept.ilike(search_term),
                )
            )

        # Count total
        count_stmt = select(func.count(SalesControl.id)).where(and_(*conditions))
        total = await self.db.scalar(count_stmt)

        # Get paginated results
        offset = (page - 1) * page_size
        stmt = (
            select(SalesControl)
            .where(and_(*conditions))
            .order_by(SalesControl.po_reception_date.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        sales_controls = result.scalars().all()

        return list(sales_controls), total or 0

    async def get_overdue_sales_controls(
        self,
        tenant_id: UUID,
        assigned_to: Optional[UUID] = None,
    ) -> List[SalesControl]:
        """
        Get all overdue sales controls

        Args:
            tenant_id: Tenant ID
            assigned_to: Filter by sales rep (optional)

        Returns:
            List of overdue sales controls
        """
        conditions = [
            SalesControl.tenant_id == tenant_id,
            SalesControl.is_deleted == False,
            SalesControl.promise_date < date.today(),
            SalesControl.status.not_in([
                SalesControlStatus.DELIVERED,
                SalesControlStatus.INVOICED,
                SalesControlStatus.PAID,
                SalesControlStatus.CANCELLED,
            ]),
        ]

        if assigned_to:
            conditions.append(SalesControl.assigned_to == assigned_to)

        stmt = (
            select(SalesControl)
            .where(and_(*conditions))
            .order_by(SalesControl.promise_date.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_sales_control(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
        data: SalesControlUpdate,
    ) -> Optional[SalesControl]:
        """
        Update a sales control

        Args:
            sales_control_id: Sales control ID
            tenant_id: Tenant ID
            data: Update data

        Returns:
            Updated sales control if found, None otherwise
        """
        sales_control = await self.get_sales_control(sales_control_id, tenant_id)
        if not sales_control:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Update denormalized fields if needed
        if "client_id" in update_data:
            client_stmt = select(Client.name).where(
                and_(Client.id == update_data["client_id"], Client.tenant_id == tenant_id)
            )
            client_name = await self.db.scalar(client_stmt)
            update_data["client_name"] = client_name

        if "assigned_to" in update_data:
            user_stmt = select(User.full_name).where(User.id == update_data["assigned_to"])
            sales_rep_name = await self.db.scalar(user_stmt)
            update_data["sales_rep_name"] = sales_rep_name

        for field, value in update_data.items():
            setattr(sales_control, field, value)

        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(sales_control)
        return sales_control

    async def update_lead_time(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
        lead_time_days: int,
    ) -> Optional[SalesControl]:
        """
        Update lead time and recalculate promise date

        Args:
            sales_control_id: Sales control ID
            tenant_id: Tenant ID
            lead_time_days: New lead time in days

        Returns:
            Updated sales control if found, None otherwise
        """
        sales_control = await self.get_sales_control(sales_control_id, tenant_id)
        if not sales_control:
            return None

        sales_control.update_promise_date(lead_time_days)
        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(sales_control)
        return sales_control

    async def mark_in_production(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
    ) -> Optional[SalesControl]:
        """Mark sales control as in production"""
        sales_control = await self.get_sales_control(sales_control_id, tenant_id)
        if not sales_control:
            return None

        sales_control.mark_as_in_production()
        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(sales_control)
        return sales_control

    async def mark_delivered(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
        delivery_date: Optional[date] = None,
    ) -> Optional[SalesControl]:
        """Mark sales control as delivered"""
        sales_control = await self.get_sales_control(sales_control_id, tenant_id)
        if not sales_control:
            return None

        sales_control.mark_as_delivered(delivery_date)
        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(sales_control)
        return sales_control

    async def mark_invoiced(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
        invoice_number: str,
        invoice_date: Optional[date] = None,
    ) -> Optional[SalesControl]:
        """Mark sales control as invoiced"""
        sales_control = await self.get_sales_control(sales_control_id, tenant_id)
        if not sales_control:
            return None

        sales_control.mark_as_invoiced(invoice_number, invoice_date)
        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(sales_control)
        return sales_control

    async def mark_paid(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
        payment_date: Optional[date] = None,
    ) -> Optional[SalesControl]:
        """
        Mark sales control as paid
        NOTE: After calling this, you should trigger quota achievement updates
        """
        sales_control = await self.get_sales_control(sales_control_id, tenant_id, load_lines=True)
        if not sales_control:
            return None

        sales_control.mark_as_paid(payment_date)
        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(sales_control)
        return sales_control

    async def mark_cancelled(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
        reason: Optional[str] = None,
    ) -> Optional[SalesControl]:
        """Mark sales control as cancelled"""
        sales_control = await self.get_sales_control(sales_control_id, tenant_id)
        if not sales_control:
            return None

        sales_control.mark_as_cancelled(reason)
        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(sales_control)
        return sales_control

    async def delete_sales_control(
        self,
        sales_control_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Soft delete a sales control"""
        sales_control = await self.get_sales_control(sales_control_id, tenant_id)
        if not sales_control:
            return False

        sales_control.is_deleted = True
        sales_control.deleted_at = datetime.utcnow()
        sales_control.updated_at = datetime.utcnow()
        await self.db.flush()
        return True

    async def folio_exists(
        self,
        folio_number: str,
        tenant_id: UUID,
        exclude_id: Optional[UUID] = None,
    ) -> bool:
        """Check if folio number already exists"""
        conditions = [
            SalesControl.tenant_id == tenant_id,
            SalesControl.folio_number == folio_number,
            SalesControl.is_deleted == False,
        ]

        if exclude_id:
            conditions.append(SalesControl.id != exclude_id)

        stmt = select(func.count(SalesControl.id)).where(and_(*conditions))
        count = await self.db.scalar(stmt)
        return (count or 0) > 0

    async def get_sales_control_stats(
        self,
        tenant_id: UUID,
        assigned_to: Optional[UUID] = None,
    ) -> SalesControlStats:
        """Get sales control statistics"""
        conditions = [
            SalesControl.tenant_id == tenant_id,
            SalesControl.is_deleted == False,
        ]

        if assigned_to:
            conditions.append(SalesControl.assigned_to == assigned_to)

        # Get counts and amounts by status
        stmt = select(
            func.count(SalesControl.id).label("total_count"),
            func.coalesce(func.sum(SalesControl.sales_control_amount), 0).label("total_amount"),
            func.sum(case((SalesControl.status == SalesControlStatus.PENDING, 1), else_=0)).label("pending_count"),
            func.sum(case((SalesControl.status == SalesControlStatus.PENDING, SalesControl.sales_control_amount), else_=0)).label("pending_amount"),
            func.sum(case((SalesControl.status == SalesControlStatus.IN_PRODUCTION, 1), else_=0)).label("in_production_count"),
            func.sum(case((SalesControl.status == SalesControlStatus.IN_PRODUCTION, SalesControl.sales_control_amount), else_=0)).label("in_production_amount"),
            func.sum(case((SalesControl.status == SalesControlStatus.DELIVERED, 1), else_=0)).label("delivered_count"),
            func.sum(case((SalesControl.status == SalesControlStatus.DELIVERED, SalesControl.sales_control_amount), else_=0)).label("delivered_amount"),
            func.sum(case((SalesControl.status == SalesControlStatus.INVOICED, 1), else_=0)).label("invoiced_count"),
            func.sum(case((SalesControl.status == SalesControlStatus.INVOICED, SalesControl.sales_control_amount), else_=0)).label("invoiced_amount"),
            func.sum(case((SalesControl.status == SalesControlStatus.PAID, 1), else_=0)).label("paid_count"),
            func.sum(case((SalesControl.status == SalesControlStatus.PAID, SalesControl.sales_control_amount), else_=0)).label("paid_amount"),
            func.sum(case((SalesControl.status == SalesControlStatus.CANCELLED, 1), else_=0)).label("cancelled_count"),
            func.sum(case((SalesControl.status == SalesControlStatus.CANCELLED, SalesControl.sales_control_amount), else_=0)).label("cancelled_amount"),
        ).where(and_(*conditions))

        result = await self.db.execute(stmt)
        row = result.one()

        # Calculate overdue
        overdue_conditions = conditions + [
            SalesControl.promise_date < date.today(),
            SalesControl.status.not_in([
                SalesControlStatus.DELIVERED,
                SalesControlStatus.INVOICED,
                SalesControlStatus.PAID,
                SalesControlStatus.CANCELLED,
            ]),
        ]
        overdue_stmt = select(
            func.count(SalesControl.id).label("overdue_count"),
            func.coalesce(func.sum(SalesControl.sales_control_amount), 0).label("overdue_amount"),
        ).where(and_(*overdue_conditions))
        overdue_result = await self.db.execute(overdue_stmt)
        overdue_row = overdue_result.one()

        # Calculate on-time delivery rate
        delivered_conditions = conditions + [
            SalesControl.actual_delivery_date.isnot(None),
        ]
        delivered_stmt = select(
            func.count(SalesControl.id).label("delivered_total"),
            func.sum(case((SalesControl.actual_delivery_date <= SalesControl.promise_date, 1), else_=0)).label("on_time_count"),
        ).where(and_(*delivered_conditions))
        delivered_result = await self.db.execute(delivered_stmt)
        delivered_row = delivered_result.one()

        on_time_delivery_rate = Decimal('0')
        if delivered_row.delivered_total and delivered_row.delivered_total > 0:
            on_time_delivery_rate = (Decimal(str(delivered_row.on_time_count)) / Decimal(str(delivered_row.delivered_total))) * Decimal('100')

        return SalesControlStats(
            total_controls=row.total_count or 0,
            total_sales_amount=Decimal(str(row.total_amount or 0)),
            pending_count=row.pending_count or 0,
            pending_amount=Decimal(str(row.pending_amount or 0)),
            in_production_count=row.in_production_count or 0,
            in_production_amount=Decimal(str(row.in_production_amount or 0)),
            delivered_count=row.delivered_count or 0,
            delivered_amount=Decimal(str(row.delivered_amount or 0)),
            invoiced_count=row.invoiced_count or 0,
            invoiced_amount=Decimal(str(row.invoiced_amount or 0)),
            paid_count=row.paid_count or 0,
            paid_amount=Decimal(str(row.paid_amount or 0)),
            cancelled_count=row.cancelled_count or 0,
            cancelled_amount=Decimal(str(row.cancelled_amount or 0)),
            overdue_count=overdue_row.overdue_count or 0,
            overdue_amount=Decimal(str(overdue_row.overdue_amount or 0)),
            on_time_delivery_rate=on_time_delivery_rate.quantize(Decimal('0.01')),
        )
