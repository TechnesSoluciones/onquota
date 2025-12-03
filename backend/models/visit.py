"""
Visit and Call Models
Database models for customer visits and phone calls tracking with GPS location

Enhanced with:
- Visit type (presencial/virtual)
- Contact person tracking
- Topic catalog and details
- Visit-Opportunity relationship
- Commitments/follow-ups
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


class VisitType(str, enum.Enum):
    """Visit type enumeration"""
    PRESENCIAL = "presencial"
    VIRTUAL = "virtual"


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


class CommitmentType(str, enum.Enum):
    """Commitment type enumeration"""
    FOLLOW_UP = "follow_up"
    SEND_QUOTE = "send_quote"
    TECHNICAL_VISIT = "technical_visit"
    DEMO = "demo"
    DOCUMENTATION = "documentation"
    OTHER = "other"


class CommitmentPriority(str, enum.Enum):
    """Commitment priority enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class CommitmentStatus(str, enum.Enum):
    """Commitment status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"


class Visit(Base):
    """
    Visit Model - Enhanced
    Tracks customer visits (presencial/virtual) with full traceability

    Features:
    - Manual visit registration
    - Visit type (presencial/virtual)
    - Contact person tracking
    - Topics discussed with details
    - GPS coordinates (optional for presencial)
    - Links to opportunities/leads generated
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

    # NEW: Visit Type
    visit_type = Column(SQLEnum(VisitType), nullable=True, index=True)  # presencial/virtual

    # NEW: Contact Person
    contact_person_name = Column(String(200), nullable=True)
    contact_person_role = Column(String(200), nullable=True)  # cargo: gerente, compras, etc.

    # Schedule
    scheduled_date = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Numeric(10, 2), nullable=True)

    # Check-in/Check-out (GPS) - OPTIONAL for presencial visits
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_in_latitude = Column(Numeric(10, 7), nullable=True)
    check_in_longitude = Column(Numeric(10, 7), nullable=True)
    check_in_address = Column(String(500), nullable=True)

    check_out_time = Column(DateTime(timezone=True), nullable=True)
    check_out_latitude = Column(Numeric(10, 7), nullable=True)
    check_out_longitude = Column(Numeric(10, 7), nullable=True)
    check_out_address = Column(String(500), nullable=True)

    # Visit Outcome
    notes = Column(Text, nullable=True)  # Keep for backward compatibility
    general_notes = Column(Text, nullable=True)  # NEW: General comments
    outcome = Column(String(200), nullable=True)
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False, index=True)

    # Relationships
    topics = relationship("VisitTopicDetail", back_populates="visit", cascade="all, delete-orphan")
    opportunities = relationship("VisitOpportunity", back_populates="visit", cascade="all, delete-orphan")
    commitments = relationship("Commitment", back_populates="visit")

    def __repr__(self):
        return f"<Visit {self.id} - {self.client_name} - {self.visit_type} - {self.status}>"


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


class VisitTopic(Base):
    """
    Visit Topic Model
    Catalog of predefined topics for visits

    Features:
    - Predefined topics (Proyecto, Soporte, Presentación, etc.)
    - Custom topics per tenant
    - UI metadata (icon, color)
    """
    __tablename__ = "visit_topics"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Multi-tenancy
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Topic Details
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Emoji or icon name
    color = Column(String(20), nullable=True)  # Hex color for UI

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    visit_details = relationship("VisitTopicDetail", back_populates="topic")

    def __repr__(self):
        return f"<VisitTopic {self.id} - {self.name}>"


class VisitTopicDetail(Base):
    """
    Visit Topic Detail Model
    M2M relationship between Visit and VisitTopic with additional details

    Features:
    - Links visit to topic
    - Free-text details for each topic discussed
    """
    __tablename__ = "visit_topic_details"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("visit_topics.id", ondelete="CASCADE"), nullable=False, index=True)

    # Free-text details
    details = Column(Text, nullable=True)  # What was discussed about this topic

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    visit = relationship("Visit", back_populates="topics")
    topic = relationship("VisitTopic", back_populates="visit_details")

    def __repr__(self):
        return f"<VisitTopicDetail {self.id} - Visit: {self.visit_id} - Topic: {self.topic_id}>"


class VisitOpportunity(Base):
    """
    Visit Opportunity Model
    Links visits to opportunities/leads generated

    Features:
    - Tracks which visits generated which leads
    - Notes on how the lead originated
    - Enables traceability: Visit → Lead → Quote → Order
    """
    __tablename__ = "visit_opportunities"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False, index=True)

    # Notes
    notes = Column(Text, nullable=True)  # How this lead came from the visit

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    visit = relationship("Visit", back_populates="opportunities")

    def __repr__(self):
        return f"<VisitOpportunity {self.id} - Visit: {self.visit_id} - Opp: {self.opportunity_id}>"


class Commitment(Base):
    """
    Commitment Model
    Tracks follow-ups and commitments from visits

    Features:
    - Follow-up actions from visits
    - Assignment to team members
    - Due dates and priorities
    - Status tracking
    - Future: Email reminders
    """
    __tablename__ = "commitments"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Multi-tenancy
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Relationships
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_by_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Commitment Details
    type = Column(SQLEnum(CommitmentType), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    priority = Column(SQLEnum(CommitmentPriority), nullable=False, default=CommitmentPriority.MEDIUM, index=True)
    status = Column(SQLEnum(CommitmentStatus), nullable=False, default=CommitmentStatus.PENDING, index=True)

    # Completion Tracking
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completion_notes = Column(Text, nullable=True)

    # Reminders (for future email automation)
    reminder_sent = Column(Boolean, default=False, nullable=False)
    reminder_date = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    visit = relationship("Visit", back_populates="commitments")

    def __repr__(self):
        return f"<Commitment {self.id} - {self.title} - {self.status}>"
