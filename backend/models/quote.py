"""
Quote model for Sales & Quotes module
Tracks sales quotes/proposals with items and approval workflow
"""
from enum import Enum
from sqlalchemy import Column, String, Numeric, Date, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from models.base import BaseModel


class SaleStatus(str, Enum):
    """Quote/Sale status enum"""
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Quote(BaseModel):
    """
    Quote/Proposal Model

    Represents sales quotes/proposals sent to clients
    Multi-tenant aware with RBAC controls
    """
    __tablename__ = "quotes"

    # Relaciones con otras entidades
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sales_rep_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Campos de negocio
    quote_number = Column(String(50), nullable=False, unique=True, index=True)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    status = Column(
        SQLEnum(SaleStatus, name="sale_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=SaleStatus.DRAFT,
        index=True,
    )
    valid_until = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)

    # Relationships
    client = relationship("Client", backref="quotes")
    sales_rep = relationship("User", backref="quotes")
    items = relationship(
        "QuoteItem",
        back_populates="quote",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<Quote(id={self.id}, number='{self.quote_number}', total={self.total_amount})>"
