"""
Base model for all database models
Includes common fields for multi-tenancy and auditing
"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, declared_attr
from sqlalchemy.sql import func

Base = declarative_base()


class BaseModel(Base):
    """
    Abstract base model with common fields
    All models should inherit from this
    """

    __abstract__ = True

    # Primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        unique=True,
        nullable=False,
    )

    # Multi-tenancy
    @declared_attr
    def tenant_id(cls):
        """Tenant foreign key for multi-tenancy"""
        return Column(
            UUID(as_uuid=True),
            ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id})>"

    def soft_delete(self):
        """Mark record as deleted without removing from database"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
