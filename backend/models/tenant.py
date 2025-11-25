"""
Tenant model for multi-tenancy
"""
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from models.base import Base


class Tenant(Base):
    """
    Tenant/Organization model
    Represents a company/organization in the multi-tenant system
    """

    __tablename__ = "tenants"

    # Override base model fields since Tenant doesn't have a tenant_id
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        unique=True,
        nullable=False,
    )

    # Company information
    company_name = Column(String(255), nullable=False, index=True)
    domain = Column(String(255), unique=True, nullable=True, index=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Settings stored as JSON
    settings = Column(JSONB, default={}, nullable=False)

    # Subscription info (for future use)
    subscription_plan = Column(String(50), default="free", nullable=False)
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)

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

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tenant(id={self.id}, company_name='{self.company_name}')>"
