"""
Client model
Represents customers in the CRM system
"""
from enum import Enum
from sqlalchemy import String, Text, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import date

from models.base import BaseModel


class ClientStatus(str, Enum):
    """Client status enum"""
    LEAD = "lead"
    PROSPECT = "prospect"
    ACTIVE = "active"
    INACTIVE = "inactive"
    LOST = "lost"


class ClientType(str, Enum):
    """Client type enum"""
    INDIVIDUAL = "individual"
    COMPANY = "company"


class Industry(str, Enum):
    """Industry enum"""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    RETAIL = "retail"
    MANUFACTURING = "manufacturing"
    EDUCATION = "education"
    REAL_ESTATE = "real_estate"
    HOSPITALITY = "hospitality"
    TRANSPORTATION = "transportation"
    ENERGY = "energy"
    AGRICULTURE = "agriculture"
    CONSTRUCTION = "construction"
    CONSULTING = "consulting"
    OTHER = "other"


class Client(BaseModel):
    """
    Client/Customer Model

    Represents customers and leads in the CRM system
    """
    __tablename__ = "clients"

    # Basic Information
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    client_type: Mapped[ClientType] = mapped_column(String(20), nullable=False, default=ClientType.COMPANY)

    # Contact Information
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Address
    address_line1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Business Information
    industry: Mapped[Optional[Industry]] = mapped_column(String(50), nullable=True, index=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # CRM Status
    status: Mapped[ClientStatus] = mapped_column(String(20), nullable=False, default=ClientStatus.LEAD, index=True)

    # Contact Person (for companies)
    contact_person_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_person_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_person_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Additional Information
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Comma-separated tags

    # Sales Information
    lead_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Website, Referral, Cold Call, etc.
    first_contact_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    conversion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # When lead became customer

    # Social Media
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    twitter_handle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Preferences
    preferred_language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    preferred_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<Client(id={self.id}, name='{self.name}', status='{self.status}')>"
