"""
Client Contact model
Represents employees/contacts within a client company
"""
from sqlalchemy import String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from typing import Optional
from uuid import UUID, uuid4

from models.base import BaseModel


class ClientContact(BaseModel):
    """
    Client Contact Model

    Represents an employee/contact person within a client company
    """
    __tablename__ = "client_contacts"

    # Foreign Key
    client_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Contact Information
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="Job title/position in company")

    # Status
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="Primary contact for this client")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Audit fields
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    updated_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Relationship
    client = relationship("Client", back_populates="contacts", lazy="selectin")

    def __repr__(self) -> str:
        return f"<ClientContact(id={self.id}, name='{self.name}', client_id={self.client_id})>"
