"""
SPA (Special Price Agreement) models
Represents special pricing agreements for clients and upload logs
"""
from decimal import Decimal
from datetime import date, datetime
from uuid import UUID, uuid4
from sqlalchemy import String, Text, Date, Boolean, Integer, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from typing import Optional

from models.base import Base


class SPAAgreement(Base):
    """
    SPA Agreement Model

    Represents a special pricing agreement for a specific product/client combination
    """
    __tablename__ = "spa_agreements"

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
        index=True
    )
    batch_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="Batch ID from upload"
    )

    # Client Info (denormalized for performance)
    bpid: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Business Partner ID"
    )
    ship_to_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Product Info
    article_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="SKU or Part Number"
    )
    article_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Pricing
    list_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
        comment="List price"
    )
    app_net_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=18, scale=4),
        nullable=False,
        comment="Approved net price"
    )
    discount_percent: Mapped[Decimal] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=False,
        comment="Calculated discount percentage"
    )
    uom: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        server_default="EA"
    )

    # Validity Period
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true",
        comment="True if today is between start_date and end_date"
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
    # Note: Primary relationship is via client_id (UUID FK)
    # bpid is denormalized for performance and matching external systems
    client = relationship("Client", foreign_keys=[client_id], lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")

    @property
    def status(self) -> str:
        """
        Calculate current status based on dates
        Returns: 'active', 'pending', or 'expired'
        """
        today = date.today()
        if self.end_date < today:
            return "expired"
        elif self.start_date > today:
            return "pending"
        else:
            return "active"

    @property
    def is_currently_valid(self) -> bool:
        """Check if SPA is currently valid"""
        return self.status == "active" and self.deleted_at is None

    def __repr__(self) -> str:
        return f"<SPAAgreement(id={self.id}, article={self.article_number}, discount={self.discount_percent}%)>"


class SPAUploadLog(Base):
    """
    SPA Upload Log Model

    Tracks upload batches and their processing statistics
    """
    __tablename__ = "spa_upload_logs"

    # Primary Key
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Upload Info
    batch_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        unique=True,
        index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Statistics
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    duration_seconds: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(precision=10, scale=2),
        nullable=True,
        comment="Processing duration in seconds"
    )

    # Error Tracking
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default="NOW()",
        index=True
    )

    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="selectin")

    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_rows == 0:
            return 0.0
        return (self.success_count / self.total_rows) * 100

    def __repr__(self) -> str:
        return f"<SPAUploadLog(id={self.id}, batch={self.batch_id}, success={self.success_count}/{self.total_rows})>"
