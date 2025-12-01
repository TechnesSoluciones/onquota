"""
Account Planner models
Represents strategic account plans with milestones and SWOT analysis
"""
from enum import Enum
from decimal import Decimal
from sqlalchemy import Column, String, Enum as SQLEnum, Numeric, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from models.base import BaseModel


class PlanStatus(str, Enum):
    """Account plan status"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MilestoneStatus(str, Enum):
    """Milestone status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SWOTCategory(str, Enum):
    """SWOT analysis category"""
    STRENGTH = "strength"
    WEAKNESS = "weakness"
    OPPORTUNITY = "opportunity"
    THREAT = "threat"


class AccountPlan(BaseModel):
    """
    Account Plan Model

    Represents a strategic account plan for managing client relationships
    and growth strategies.
    """
    __tablename__ = "account_plans"

    # Basic information
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Relationships
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True
    )

    # Status and timeline
    status = Column(
        SQLEnum(PlanStatus, name="plan_status"),
        nullable=False,
        default=PlanStatus.DRAFT,
        index=True
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Financial goals
    revenue_goal = Column(Numeric(15, 2), nullable=True)

    # Relationships
    client = relationship("Client", backref="account_plans")
    creator = relationship("User", backref="account_plans")
    milestones = relationship(
        "Milestone",
        back_populates="plan",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    swot_items = relationship(
        "SWOTItem",
        back_populates="plan",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<AccountPlan(id={self.id}, title='{self.title}', status='{self.status}')>"

    @property
    def is_active(self):
        """Check if plan is currently active"""
        return self.status == PlanStatus.ACTIVE

    @property
    def milestones_count(self):
        """Get total number of milestones"""
        return len(self.milestones) if self.milestones else 0

    @property
    def completed_milestones_count(self):
        """Get number of completed milestones"""
        if not self.milestones:
            return 0
        return len([m for m in self.milestones if m.status == MilestoneStatus.COMPLETED])

    @property
    def progress_percentage(self):
        """Calculate plan progress based on completed milestones"""
        if not self.milestones or len(self.milestones) == 0:
            return 0.0
        return (self.completed_milestones_count / len(self.milestones)) * 100


class Milestone(BaseModel):
    """
    Milestone Model

    Represents a key milestone or deliverable within an account plan.
    """
    __tablename__ = "milestones"

    # Basic information
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Relationship to plan
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("account_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Timeline
    due_date = Column(Date, nullable=False)
    completion_date = Column(Date, nullable=True)

    # Status
    status = Column(
        SQLEnum(MilestoneStatus, name="milestone_status"),
        nullable=False,
        default=MilestoneStatus.PENDING,
        index=True
    )

    # Relationships
    plan = relationship("AccountPlan", back_populates="milestones")

    def __repr__(self):
        return f"<Milestone(id={self.id}, title='{self.title}', status='{self.status}')>"

    @property
    def is_completed(self):
        """Check if milestone is completed"""
        return self.status == MilestoneStatus.COMPLETED

    @property
    def is_overdue(self):
        """Check if milestone is overdue"""
        from datetime import date
        return (
            self.status != MilestoneStatus.COMPLETED
            and self.status != MilestoneStatus.CANCELLED
            and self.due_date < date.today()
        )


class SWOTItem(BaseModel):
    """
    SWOT Item Model

    Represents a single item in a SWOT (Strengths, Weaknesses,
    Opportunities, Threats) analysis for an account plan.
    """
    __tablename__ = "swot_items"

    # Relationship to plan
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("account_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # SWOT category
    category = Column(
        SQLEnum(SWOTCategory, name="swot_category"),
        nullable=False,
        index=True
    )

    # Content
    description = Column(Text, nullable=False)

    # Relationships
    plan = relationship("AccountPlan", back_populates="swot_items")

    def __repr__(self):
        return f"<SWOTItem(id={self.id}, category='{self.category}')>"
