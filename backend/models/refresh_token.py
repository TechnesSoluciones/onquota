"""
RefreshToken model for JWT token management
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from models.base import Base


class RefreshToken(Base):
    """
    Refresh token for JWT authentication
    Stores refresh tokens to allow token rotation and revocation
    """

    __tablename__ = "refresh_tokens"

    # Override base model id
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        unique=True,
        nullable=False,
    )

    # User relationship
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Override tenant_id from BaseModel since we get it from user
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Token data
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Token status
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    # Device/client info (optional)
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # No update timestamp needed for tokens
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, revoked={self.is_revoked})>"
