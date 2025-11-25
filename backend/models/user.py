"""
User model for authentication
"""
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from models.base import Base


class UserRole(str, Enum):
    """User roles in the system"""
    ADMIN = "admin"
    SALES_REP = "sales_rep"
    SUPERVISOR = "supervisor"
    ANALYST = "analyst"


class User(Base):
    """
    User model for authentication and authorization
    """

    __tablename__ = "users"

    # Override base model id to not use BaseModel
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        unique=True,
        nullable=False,
    )

    # Tenant relationship
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Profile
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Role and permissions
    role = Column(
        SQLEnum(UserRole, name="user_role"),
        default=UserRole.SALES_REP,
        nullable=False,
        index=True,
    )

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Activity tracking
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String(50), nullable=True)

    # Password reset
    reset_token = Column(String(500), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)

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
    tenant = relationship("Tenant", back_populates="users")
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
