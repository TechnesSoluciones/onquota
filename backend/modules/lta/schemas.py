"""
LTA (Long Term Agreement) Pydantic Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from uuid import UUID


class LTAAgreementBase(BaseModel):
    """Base schema for LTA Agreement"""
    agreement_number: str = Field(..., max_length=100, description="Unique LTA agreement number")
    description: Optional[str] = Field(None, description="Description of the agreement")
    notes: Optional[str] = Field(None, description="Internal notes")
    is_active: bool = Field(True, description="Whether the LTA is active")


class LTAAgreementCreate(LTAAgreementBase):
    """Schema for creating LTA Agreement"""
    client_id: UUID = Field(..., description="Client ID to link the LTA to")
    bpid: Optional[str] = Field(None, max_length=50, description="Business Partner ID")


class LTAAgreementUpdate(BaseModel):
    """Schema for updating LTA Agreement"""
    agreement_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    bpid: Optional[str] = Field(None, max_length=50)


class LTAAgreementResponse(LTAAgreementBase):
    """Schema for LTA Agreement response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    client_id: UUID
    bpid: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: UUID
    updated_by: Optional[UUID]


class LTAAgreementWithClient(LTAAgreementResponse):
    """Schema for LTA Agreement with client information"""
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_bpid: Optional[str] = None


class LTAListResponse(BaseModel):
    """Paginated list of LTA Agreements"""
    items: list[LTAAgreementResponse]
    total: int
    page: int
    limit: int
    pages: int
