"""
Sales Control Model
Tracks customer purchase orders (sales controls)
"""

import enum
from datetime import datetime, date, timedelta
from typing import Optional, TYPE_CHECKING, List
from uuid import UUID
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Numeric,
    Date,
    Integer,
    ForeignKey,
    Enum as SQLEnum,
    Index,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from models.base import Base

if TYPE_CHECKING:
    from models.client import Client
    from models.quotation import Quotation
    from models.user import User


class SalesControlStatus(str, enum.Enum):
    """Sales control (PO) status enumeration"""
    PENDING = "pending"  # PO received, not started
    IN_PRODUCTION = "in_production"  # Being manufactured/prepared
    DELIVERED = "delivered"  # Delivered to customer
    INVOICED = "invoiced"  # Invoice sent
    PAID = "paid"  # Payment received (final state)
    CANCELLED = "cancelled"  # Order cancelled


class SalesControl(Base):
    """
    Sales Control model - Track customer purchase orders

    Represents purchase orders (POs) received from customers.
    Tracks the complete lifecycle from PO reception through payment.

    Attributes:
        id: Primary key (UUID)
        tenant_id: Multi-tenant isolation
        folio_number: Internal folio number (unique per tenant)
        client_po_number: Client's PO reference number
        po_reception_date: When client sent PO
        system_entry_date: When entered into our system
        promise_date: Delivery promise date (calculated from lead time)
        actual_delivery_date: Actual delivery date (if delivered)
        lead_time_days: Lead time used to calculate promise_date
        client_id: Reference to client
        quotation_id: Optional link to quotation (if originated from quote)
        assigned_to: Sales representative (user)
        client_name: Denormalized client name (performance)
        sales_rep_name: Denormalized sales rep name (performance)
        sales_control_amount: Order value
        currency: Currency code (default USD)
        status: Order status
        concept: PO description/concept
        notes: Internal notes
        invoice_number: Invoice number (when invoiced)
        invoice_date: Invoice date
        payment_date: Payment received date
        lines: Product line breakdown for quota tracking
    """

    __tablename__ = "sales_controls"

    # Primary Key
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()"))

    # Multi-tenancy
    tenant_id = Column(PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Control Identification
    folio_number = Column(String(50), nullable=False)
    client_po_number = Column(String(100), nullable=True)

    # Dates
    po_reception_date = Column(Date, nullable=False, index=True)
    system_entry_date = Column(Date, nullable=False)
    promise_date = Column(Date, nullable=False, index=True)
    actual_delivery_date = Column(Date, nullable=True)

    # Lead time calculation
    lead_time_days = Column(Integer, nullable=True)

    # Relationships - Foreign Keys
    client_id = Column(PGUUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    quotation_id = Column(PGUUID(as_uuid=True), ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Denormalized fields for performance
    client_name = Column(String(255), nullable=True)
    sales_rep_name = Column(String(255), nullable=True)

    # Financial
    sales_control_amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD", server_default="USD")

    # Status
    status = Column(SQLEnum(SalesControlStatus), nullable=False, default=SalesControlStatus.PENDING, index=True)

    # Additional Information
    concept = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Invoice tracking
    invoice_number = Column(String(100), nullable=True)
    invoice_date = Column(Date, nullable=True)
    payment_date = Column(Date, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, server_default=sa.func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=sa.func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="false")
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships - ORM
    client = relationship("Client", back_populates="sales_controls", foreign_keys=[client_id])
    quotation = relationship("Quotation", back_populates="sales_controls", foreign_keys=[quotation_id])
    sales_rep = relationship("User", back_populates="sales_controls", foreign_keys=[assigned_to])
    lines = relationship("SalesControlLine", back_populates="sales_control", cascade="all, delete-orphan")

    # Table constraints
    __table_args__ = (
        # Unique constraint: folio_number must be unique per tenant
        UniqueConstraint('tenant_id', 'folio_number', name='uk_sales_controls_tenant_folio'),

        # Check constraints
        CheckConstraint('sales_control_amount >= 0', name='chk_sales_controls_amount_positive'),

        # Composite indexes for common queries
        Index('idx_sales_controls_tenant_status', 'tenant_id', 'status'),
        Index('idx_sales_controls_tenant_client', 'tenant_id', 'client_id'),
        Index('idx_sales_controls_tenant_date', 'tenant_id', sa.text('po_reception_date DESC')),
        Index('idx_sales_controls_not_deleted', 'tenant_id', postgresql_where=sa.text('is_deleted = false')),
    )

    def __repr__(self) -> str:
        return f"<SalesControl(id={self.id}, folio={self.folio_number}, status={self.status})>"

    # Business logic properties

    @property
    def is_pending(self) -> bool:
        """Check if sales control is pending"""
        return self.status == SalesControlStatus.PENDING

    @property
    def is_in_production(self) -> bool:
        """Check if sales control is in production"""
        return self.status == SalesControlStatus.IN_PRODUCTION

    @property
    def is_delivered(self) -> bool:
        """Check if sales control was delivered"""
        return self.status in [SalesControlStatus.DELIVERED, SalesControlStatus.INVOICED, SalesControlStatus.PAID]

    @property
    def is_paid(self) -> bool:
        """Check if sales control was paid"""
        return self.status == SalesControlStatus.PAID

    @property
    def is_cancelled(self) -> bool:
        """Check if sales control was cancelled"""
        return self.status == SalesControlStatus.CANCELLED

    @property
    def is_overdue(self) -> bool:
        """Check if promise date has passed and not delivered yet"""
        if self.is_delivered or self.is_cancelled:
            return False
        return date.today() > self.promise_date

    @property
    def days_until_promise(self) -> Optional[int]:
        """Calculate days until promise date (negative if overdue)"""
        if not self.promise_date:
            return None
        delta = self.promise_date - date.today()
        return delta.days

    @property
    def days_in_production(self) -> Optional[int]:
        """Calculate days since PO was received"""
        if not self.po_reception_date:
            return None
        end_date = self.actual_delivery_date or date.today()
        delta = end_date - self.po_reception_date
        return delta.days

    @property
    def was_delivered_on_time(self) -> Optional[bool]:
        """Check if order was delivered on or before promise date"""
        if not self.actual_delivery_date or not self.promise_date:
            return None
        return self.actual_delivery_date <= self.promise_date

    @staticmethod
    def calculate_promise_date(po_date: date, lead_time_days: int) -> date:
        """
        Calculate promise date based on PO reception date and lead time

        Args:
            po_date: PO reception date
            lead_time_days: Lead time in days

        Returns:
            Promise date
        """
        return po_date + timedelta(days=lead_time_days)

    def update_promise_date(self, lead_time_days: int) -> None:
        """
        Update promise date based on new lead time

        Args:
            lead_time_days: New lead time in days
        """
        self.lead_time_days = lead_time_days
        self.promise_date = self.calculate_promise_date(self.po_reception_date, lead_time_days)

    def mark_as_in_production(self) -> None:
        """Mark sales control as in production"""
        if self.status == SalesControlStatus.PENDING:
            self.status = SalesControlStatus.IN_PRODUCTION

    def mark_as_delivered(self, delivery_date: Optional[date] = None) -> None:
        """
        Mark sales control as delivered

        Args:
            delivery_date: Actual delivery date (defaults to today)
        """
        if self.status in [SalesControlStatus.PENDING, SalesControlStatus.IN_PRODUCTION]:
            self.status = SalesControlStatus.DELIVERED
            self.actual_delivery_date = delivery_date or date.today()

    def mark_as_invoiced(self, invoice_number: str, invoice_date: Optional[date] = None) -> None:
        """
        Mark sales control as invoiced

        Args:
            invoice_number: Invoice number
            invoice_date: Invoice date (defaults to today)
        """
        if self.status == SalesControlStatus.DELIVERED:
            self.status = SalesControlStatus.INVOICED
            self.invoice_number = invoice_number
            self.invoice_date = invoice_date or date.today()

    def mark_as_paid(self, payment_date: Optional[date] = None) -> None:
        """
        Mark sales control as paid (final state)
        This triggers quota achievement updates

        Args:
            payment_date: Payment received date (defaults to today)
        """
        if self.status == SalesControlStatus.INVOICED:
            self.status = SalesControlStatus.PAID
            self.payment_date = payment_date or date.today()

    def mark_as_cancelled(self, reason: Optional[str] = None) -> None:
        """
        Mark sales control as cancelled

        Args:
            reason: Cancellation reason (stored in notes)
        """
        self.status = SalesControlStatus.CANCELLED
        if reason:
            self.notes = f"CANCELLED: {reason}\n{self.notes or ''}"


class SalesProductLine(Base):
    """
    Sales Product Line model - Catalog of product lines

    Represents product line categories for quota tracking.
    Examples: Industrial Equipment, Spare Parts, Services, etc.

    Attributes:
        id: Primary key (UUID)
        tenant_id: Multi-tenant isolation
        name: Product line name (unique per tenant)
        code: Optional product line code
        description: Product line description
        color: Hex color for UI display
        display_order: Order for UI display
        is_active: Whether product line is active
    """

    __tablename__ = "sales_product_lines"

    # Primary Key
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()"))

    # Multi-tenancy
    tenant_id = Column(PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Product Line Information
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=True)  # Hex color for UI
    display_order = Column(Integer, nullable=False, default=0, server_default="0")

    # Status
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, server_default=sa.func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=sa.func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="false")
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships - ORM
    quota_lines = relationship("QuotaLine", back_populates="product_line")
    sales_control_lines = relationship("SalesControlLine", back_populates="product_line")

    # Table constraints
    __table_args__ = (
        # Unique constraint: name must be unique per tenant
        UniqueConstraint('tenant_id', 'name', name='uk_product_lines_tenant_name'),

        # Composite indexes
        Index('idx_sales_product_lines_active', 'tenant_id', 'is_active'),
        Index('idx_sales_product_lines_order', 'tenant_id', 'display_order'),
    )

    def __repr__(self) -> str:
        return f"<SalesProductLine(id={self.id}, name={self.name})>"


class SalesControlLine(Base):
    """
    Sales Control Line model - Product line breakdown for sales controls

    Links sales controls to product lines for quota tracking.
    When a sales control is marked as PAID, these lines update quota achievements.

    Attributes:
        id: Primary key (UUID)
        tenant_id: Multi-tenant isolation
        sales_control_id: Reference to sales control
        product_line_id: Reference to product line
        product_line_name: Denormalized product line name (performance)
        line_amount: Amount for this product line
        description: Line description
    """

    __tablename__ = "sales_control_lines"

    # Primary Key
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()"))

    # Multi-tenancy
    tenant_id = Column(PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships - Foreign Keys
    sales_control_id = Column(PGUUID(as_uuid=True), ForeignKey("sales_controls.id", ondelete="CASCADE"), nullable=False, index=True)
    product_line_id = Column(PGUUID(as_uuid=True), ForeignKey("sales_product_lines.id", ondelete="CASCADE"), nullable=False, index=True)

    # Denormalized field for performance
    product_line_name = Column(String(200), nullable=True)

    # Amount for this product line
    line_amount = Column(Numeric(15, 2), nullable=False)

    # Description
    description = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, server_default=sa.func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=sa.func.now())

    # Relationships - ORM
    sales_control = relationship("SalesControl", back_populates="lines", foreign_keys=[sales_control_id])
    product_line = relationship("SalesProductLine", back_populates="sales_control_lines", foreign_keys=[product_line_id])

    # Table constraints
    __table_args__ = (
        # Check constraints
        CheckConstraint('line_amount >= 0', name='chk_sales_control_lines_amount_positive'),
    )

    def __repr__(self) -> str:
        return f"<SalesControlLine(id={self.id}, product_line={self.product_line_name}, amount={self.line_amount})>"


# Import sqlalchemy at module level (needed for server_default)
import sqlalchemy as sa
