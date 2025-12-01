"""
LTA (Long Term Agreement) models
Represents long-term agreements for clients without expiration dates
"""
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import String, Text, Boolean, ForeignKey, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from typing import Optional

from models.base import Base


class LTAAgreement(Base):
    """
    LTA Agreement Model

    Represents a long-term agreement for a specific client
    Unlike SPAs, LTAs do not have expiration dates
    """
    __tablename__ = "lta_agreements"

    # Primary Key
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign Keys
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One LTA per client
        index=True
    )

    # Client Info (denormalized for performance)
    bpid: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="Business Partner ID"
    )

    # Agreement Info
    agreement_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique LTA agreement number"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Description of the agreement"
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Internal notes about the agreement"
    )

    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true",
        index=True,
        comment="Whether the LTA is currently active"
    )

    # Audit Fields
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default="NOW()"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True
    )

    # Relationships
    client = relationship("Client", foreign_keys=[client_id], lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")

    @property
    def status(self) -> str:
        """
        Get agreement status
        Returns: 'active' or 'inactive'
        """
        if self.deleted_at is not None:
            return "deleted"
        return "active" if self.is_active else "inactive"

    def __repr__(self) -> str:
        return f"<LTAAgreement(id={self.id}, agreement_number={self.agreement_number}, active={self.is_active})>"
