"""
Quotation Model
Tracks quotations from external production systems
"""

import enum
from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Numeric,
    Date,
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
    from models.opportunity import Opportunity
    from models.user import User
    from models.sales_control import SalesControl


class QuoteStatus(str, enum.Enum):
    """Quotation status enumeration"""
    COTIZADO = "cotizado"  # Quoted (initial state)
    GANADO = "ganado"  # Won (fully)
    PERDIDO = "perdido"  # Lost
    GANADO_PARCIALMENTE = "ganado_parcialmente"  # Partially won


class Quotation(Base):
    """
    Quotation model - Track quotations from external systems

    Represents quotations created in external production systems.
    Not for generating quotes, but for tracking existing ones.

    Attributes:
        id: Primary key (UUID)
        tenant_id: Multi-tenant isolation
        quote_number: External system quote number (unique per tenant)
        quote_date: Date quote was created
        client_id: Reference to client
        opportunity_id: Optional link to opportunity (from visits)
        assigned_to: Sales representative (user)
        client_name: Denormalized client name (performance)
        sales_rep_name: Denormalized sales rep name (performance)
        quoted_amount: Total quote value
        currency: Currency code (default USD)
        status: Quote status (cotizado, ganado, perdido, ganado_parcialmente)
        notes: Additional notes
        products_description: Brief description of quoted items
        won_date: Date quote was won (if applicable)
        lost_date: Date quote was lost (if applicable)
        lost_reason: Why quote was lost
        sales_controls: Related purchase orders (if won)
    """

    __tablename__ = "quotations"

    # Primary Key
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()"))

    # Multi-tenancy
    tenant_id = Column(PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Quote Identification
    quote_number = Column(String(100), nullable=False)
    quote_date = Column(Date, nullable=False, index=True)

    # Relationships - Foreign Keys
    client_id = Column(PGUUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    opportunity_id = Column(PGUUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Denormalized fields for performance
    client_name = Column(String(255), nullable=True)
    sales_rep_name = Column(String(255), nullable=True)

    # Financial
    quoted_amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD", server_default="USD")

    # Status
    status = Column(SQLEnum(QuoteStatus), nullable=False, default=QuoteStatus.COTIZADO, index=True)

    # Additional Information
    notes = Column(Text, nullable=True)
    products_description = Column(Text, nullable=True)

    # Win/Loss tracking
    won_date = Column(Date, nullable=True)
    lost_date = Column(Date, nullable=True)
    lost_reason = Column(String(500), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, server_default=sa.func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=sa.func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="false")
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships - ORM
    client = relationship("Client", back_populates="quotations", foreign_keys=[client_id])
    opportunity = relationship("Opportunity", back_populates="quotations", foreign_keys=[opportunity_id])
    sales_rep = relationship("User", back_populates="quotations", foreign_keys=[assigned_to])
    sales_controls = relationship("SalesControl", back_populates="quotation", cascade="all, delete-orphan")

    # Table constraints
    __table_args__ = (
        # Unique constraint: quote_number must be unique per tenant
        UniqueConstraint('tenant_id', 'quote_number', name='uk_quotations_tenant_quote_number'),

        # Check constraints
        CheckConstraint('quoted_amount >= 0', name='chk_quotations_amount_positive'),

        # Composite indexes for common queries
        Index('idx_quotations_tenant_status', 'tenant_id', 'status'),
        Index('idx_quotations_tenant_client', 'tenant_id', 'client_id'),
        Index('idx_quotations_tenant_date', 'tenant_id', sa.text('quote_date DESC')),
        Index('idx_quotations_not_deleted', 'tenant_id', postgresql_where=sa.text('is_deleted = false')),
    )

    def __repr__(self) -> str:
        return f"<Quotation(id={self.id}, quote_number={self.quote_number}, status={self.status})>"

    # Business logic properties

    @property
    def is_won(self) -> bool:
        """Check if quotation was won (fully or partially)"""
        return self.status in [QuoteStatus.GANADO, QuoteStatus.GANADO_PARCIALMENTE]

    @property
    def is_lost(self) -> bool:
        """Check if quotation was lost"""
        return self.status == QuoteStatus.PERDIDO

    @property
    def is_pending(self) -> bool:
        """Check if quotation is still pending (quoted but not won/lost)"""
        return self.status == QuoteStatus.COTIZADO

    @property
    def days_since_quote(self) -> Optional[int]:
        """Calculate days since quote was created"""
        if not self.quote_date:
            return None
        delta = date.today() - self.quote_date
        return delta.days

    @property
    def days_to_close(self) -> Optional[int]:
        """Calculate days it took to close (win or lose) the quote"""
        if self.status == QuoteStatus.COTIZADO:
            return None

        close_date = self.won_date if self.is_won else self.lost_date
        if not close_date or not self.quote_date:
            return None

        delta = close_date - self.quote_date
        return delta.days

    def mark_as_won(self, won_date: Optional[date] = None) -> None:
        """
        Mark quotation as won

        Args:
            won_date: Date quote was won (defaults to today)
        """
        self.status = QuoteStatus.GANADO
        self.won_date = won_date or date.today()
        self.lost_date = None
        self.lost_reason = None

    def mark_as_partially_won(self, won_date: Optional[date] = None) -> None:
        """
        Mark quotation as partially won

        Args:
            won_date: Date quote was partially won (defaults to today)
        """
        self.status = QuoteStatus.GANADO_PARCIALMENTE
        self.won_date = won_date or date.today()
        self.lost_date = None
        self.lost_reason = None

    def mark_as_lost(self, lost_date: Optional[date] = None, reason: Optional[str] = None) -> None:
        """
        Mark quotation as lost

        Args:
            lost_date: Date quote was lost (defaults to today)
            reason: Reason why quote was lost
        """
        self.status = QuoteStatus.PERDIDO
        self.lost_date = lost_date or date.today()
        self.lost_reason = reason
        self.won_date = None


# Import sqlalchemy at module level (needed for server_default)
import sqlalchemy as sa
