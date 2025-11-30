from __future__ import annotations

"""
Client schemas
Pydantic models for client validation and serialization
"""
from pydantic import BaseModel, EmailStr, Field, field_validator, ValidationInfo
from typing import Optional
from uuid import UUID
from datetime import date, datetime

from models.client import ClientStatus, ClientType, Industry
from core.constants import CURRENCY_CODES


# ============================================================================
# Request Schemas
# ============================================================================


class ClientCreate(BaseModel):
    """Schema for creating a new client"""

    # Basic Information
    name: str = Field(..., min_length=1, max_length=255, description="Client name")
    client_type: ClientType = Field(default=ClientType.COMPANY, description="Individual or Company")

    # Contact Information
    email: Optional[EmailStr] = Field(None, description="Primary email address")
    phone: Optional[str] = Field(None, max_length=50, description="Primary phone number")
    mobile: Optional[str] = Field(None, max_length=50, description="Mobile phone number")
    website: Optional[str] = Field(None, max_length=255, description="Website URL")

    # Address
    address_line1: Optional[str] = Field(None, max_length=255, description="Address line 1")
    address_line2: Optional[str] = Field(None, max_length=255, description="Address line 2")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal/ZIP code")
    country: Optional[str] = Field(None, max_length=100, description="Country")

    # Business Information
    industry: Optional[Industry] = Field(None, description="Industry sector")
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax ID / VAT number")
    bpid: Optional[str] = Field(None, max_length=50, description="Business Partner ID for SPA linking")

    # CRM Status
    status: ClientStatus = Field(default=ClientStatus.LEAD, description="Client status")

    # Contact Person (for companies)
    contact_person_name: Optional[str] = Field(None, max_length=255, description="Contact person name")
    contact_person_email: Optional[EmailStr] = Field(None, description="Contact person email")
    contact_person_phone: Optional[str] = Field(None, max_length=50, description="Contact person phone")

    # Additional Information
    notes: Optional[str] = Field(None, description="Additional notes")
    tags: Optional[str] = Field(None, max_length=500, description="Comma-separated tags")

    # Sales Information
    lead_source: Optional[str] = Field(None, max_length=100, description="Lead source (e.g., Website, Referral)")
    first_contact_date: Optional[date] = Field(None, description="Date of first contact")
    conversion_date: Optional[date] = Field(None, description="Date when lead became customer")

    # Social Media
    linkedin_url: Optional[str] = Field(None, max_length=255, description="LinkedIn profile URL")
    twitter_handle: Optional[str] = Field(None, max_length=100, description="Twitter handle")

    # Preferences
    preferred_language: str = Field(default="en", max_length=10, description="Preferred language code")
    preferred_currency: str = Field(default="USD", max_length=3, description="Preferred currency code")

    # Status
    is_active: bool = Field(default=True, description="Is client active")

    @field_validator("preferred_currency")
    @classmethod
    def validate_currency(cls, v):
        """Validate currency code"""
        if v:
            v = v.upper()
            if v not in CURRENCY_CODES:
                raise ValueError(f"Currency must be one of: {', '.join(CURRENCY_CODES)}")
        return v

    @field_validator("website", "linkedin_url")
    @classmethod
    def validate_url(cls, v):
        """Basic URL validation"""
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("conversion_date")
    @classmethod
    def validate_conversion_date(cls, v, info: ValidationInfo):
        """Validate conversion date is not before first contact date"""
        if v and "first_contact_date" in info.data and info.data["first_contact_date"]:
            if v < info.data["first_contact_date"]:
                raise ValueError("Conversion date cannot be before first contact date")
        return v

    class Config:
        from_attributes = True


class ClientUpdate(BaseModel):
    """Schema for updating a client"""

    # Basic Information
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    client_type: Optional[ClientType] = None

    # Contact Information
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)

    # Address
    address_line1: Optional[str] = Field(None, max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)

    # Business Information
    industry: Optional[Industry] = None
    tax_id: Optional[str] = Field(None, max_length=50)
    bpid: Optional[str] = Field(None, max_length=50)

    # CRM Status
    status: Optional[ClientStatus] = None

    # Contact Person
    contact_person_name: Optional[str] = Field(None, max_length=255)
    contact_person_email: Optional[EmailStr] = None
    contact_person_phone: Optional[str] = Field(None, max_length=50)

    # Additional Information
    notes: Optional[str] = None
    tags: Optional[str] = Field(None, max_length=500)

    # Sales Information
    lead_source: Optional[str] = Field(None, max_length=100)
    first_contact_date: Optional[date] = None
    conversion_date: Optional[date] = None

    # Social Media
    linkedin_url: Optional[str] = Field(None, max_length=255)
    twitter_handle: Optional[str] = Field(None, max_length=100)

    # Preferences
    preferred_language: Optional[str] = Field(None, max_length=10)
    preferred_currency: Optional[str] = Field(None, max_length=3)

    # Status
    is_active: Optional[bool] = None

    @field_validator("preferred_currency")
    @classmethod
    def validate_currency(cls, v):
        """Validate currency code"""
        if v:
            v = v.upper()
            if v not in CURRENCY_CODES:
                raise ValueError(f"Currency must be one of: {', '.join(CURRENCY_CODES)}")
        return v

    @field_validator("website", "linkedin_url")
    @classmethod
    def validate_url(cls, v):
        """Basic URL validation"""
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    class Config:
        from_attributes = True


# ============================================================================
# Response Schemas
# ============================================================================


class ClientResponse(BaseModel):
    """Schema for client response"""

    id: UUID
    tenant_id: UUID

    # Basic Information
    name: str
    client_type: ClientType

    # Contact Information
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None

    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

    # Business Information
    industry: Optional[Industry] = None
    tax_id: Optional[str] = None
    bpid: Optional[str] = None

    # CRM Status
    status: ClientStatus

    # Contact Person
    contact_person_name: Optional[str] = None
    contact_person_email: Optional[str] = None
    contact_person_phone: Optional[str] = None

    # Additional Information
    notes: Optional[str] = None
    tags: Optional[str] = None

    # Sales Information
    lead_source: Optional[str] = None
    first_contact_date: Optional[date] = None
    conversion_date: Optional[date] = None

    # Social Media
    linkedin_url: Optional[str] = None
    twitter_handle: Optional[str] = None

    # Preferences
    preferred_language: str
    preferred_currency: str

    # Status
    is_active: bool

    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    """Schema for paginated client list response"""

    items: list[ClientResponse]
    total: int
    page: int
    page_size: int
    pages: int

    class Config:
        from_attributes = True


class ClientSummary(BaseModel):
    """Schema for client summary statistics"""

    total_clients: int
    leads_count: int
    prospects_count: int
    active_count: int
    inactive_count: int
    lost_count: int
    by_industry: list[dict]  # [{"industry": "technology", "count": 10}, ...]

    class Config:
        from_attributes = True


# ============================================================================
# Client Contact Schemas
# ============================================================================

class ClientContactBase(BaseModel):
    """Base schema for client contact"""
    name: str = Field(..., min_length=1, max_length=255, description="Contact name")
    email: Optional[EmailStr] = Field(None, description="Contact email")
    phone: Optional[str] = Field(None, max_length=50, description="Contact phone")
    position: Optional[str] = Field(None, max_length=200, description="Job title/position")
    is_primary: bool = Field(default=False, description="Is primary contact")
    is_active: bool = Field(default=True, description="Is contact active")

    class Config:
        from_attributes = True


class ClientContactCreate(ClientContactBase):
    """Schema for creating a new client contact"""
    pass


class ClientContactUpdate(BaseModel):
    """Schema for updating a client contact"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    position: Optional[str] = Field(None, max_length=200)
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


class ClientContactResponse(ClientContactBase):
    """Schema for client contact response"""
    id: UUID
    tenant_id: UUID
    client_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientContactListResponse(BaseModel):
    """Schema for paginated client contact list"""
    items: list[ClientContactResponse]
    total: int
    page: int
    page_size: int
    pages: int

    class Config:
        from_attributes = True
