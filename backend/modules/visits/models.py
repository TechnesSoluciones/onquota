"""
Visit and Call Models
Database models for customer visits and phone calls tracking with GPS location
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from models.base import Base


class VisitStatus(str, enum.Enum):
    """Visit status enumeration"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CallType(str, enum.Enum):
    """Call type enumeration"""
    INCOMING = "incoming"
    OUTGOING = "outgoing"
    MISSED = "missed"


class CallStatus(str, enum.Enum):
    """Call status enumeration"""
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    NO_ANSWER = "no_answer"
    VOICEMAIL = "voicemail"
    CANCELLED = "cancelled"


class Visit(Base):
    """
    Visit Model
    Tracks physical visits to customers with GPS location

    Features:
    - GPS coordinates (latitude/longitude)
    - Check-in/Check-out timestamps
    - Visit notes and outcomes
    - Client relationship
    - Multi-tenancy support
    """
    __tablename__ = "visits"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Multi-tenancy
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # User (Sales Rep)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_name = Column(String(200), nullable=True)  # Denormalized for performance

    # Client
    client_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    client_name = Column(String(200), nullable=True)  # Denormalized for performance

    # Visit Details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(VisitStatus), nullable=False, default=VisitStatus.SCHEDULED, index=True)

    # Schedule
    scheduled_date = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Numeric(10, 2), nullable=True)  # Expected duration

    # Check-in/Check-out (GPS)
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_in_latitude = Column(Numeric(10, 7), nullable=True)  # GPS coordinates
    check_in_longitude = Column(Numeric(10, 7), nullable=True)
    check_in_address = Column(String(500), nullable=True)  # Reverse geocoded address

    check_out_time = Column(DateTime(timezone=True), nullable=True)
    check_out_latitude = Column(Numeric(10, 7), nullable=True)
    check_out_longitude = Column(Numeric(10, 7), nullable=True)
    check_out_address = Column(String(500), nullable=True)

    # Visit Outcome
    notes = Column(Text, nullable=True)
    outcome = Column(String(200), nullable=True)  # Result: successful, rescheduled, etc.
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False, index=True)

    def __repr__(self):
        return f"<Visit {self.id} - {self.client_name} - {self.status}>"


class Call(Base):
    """
    Call Model
    Tracks phone calls with customers

    Features:
    - Call type (incoming/outgoing/missed)
    - Duration tracking
    - Call notes and outcomes
    - Client relationship
    - Multi-tenancy support
    """
    __tablename__ = "calls"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Multi-tenancy
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # User (Sales Rep)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_name = Column(String(200), nullable=True)  # Denormalized for performance

    # Client
    client_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    client_name = Column(String(200), nullable=True)  # Denormalized for performance
    phone_number = Column(String(50), nullable=True)

    # Call Details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    call_type = Column(SQLEnum(CallType), nullable=False, index=True)
    status = Column(SQLEnum(CallStatus), nullable=False, default=CallStatus.SCHEDULED, index=True)

    # Schedule
    scheduled_date = Column(DateTime(timezone=True), nullable=True, index=True)

    # Call Time
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Numeric(10, 2), nullable=True)  # Actual call duration

    # Call Outcome
    notes = Column(Text, nullable=True)
    outcome = Column(String(200), nullable=True)  # Result: deal discussed, follow-up, etc.
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)

    # Recording (optional)
    recording_url = Column(String(500), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False, index=True)

    def __repr__(self):
        return f"<Call {self.id} - {self.client_name} - {self.call_type} - {self.status}>"
