"""
Opportunity model for sales pipeline management
"""
from enum import Enum
from sqlalchemy import Column, String, Enum as SQLEnum, Numeric, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from models.base import BaseModel


class OpportunityStage(str, Enum):
    """Sales opportunity stages in the pipeline"""
    LEAD = "LEAD"                  # Nuevo contacto
    QUALIFIED = "QUALIFIED"        # Lead calificado
    PROPOSAL = "PROPOSAL"          # Propuesta enviada
    NEGOTIATION = "NEGOTIATION"    # En negociación
    CLOSED_WON = "CLOSED_WON"      # Ganada
    CLOSED_LOST = "CLOSED_LOST"    # Perdida


class Opportunity(BaseModel):
    """
    Opportunity Model

    Represents a sales opportunity in the pipeline.
    Tracks progression from lead to closed (won/lost).
    """
    __tablename__ = "opportunities"

    # Basic information
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Relationships
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    assigned_to = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True
    )

    # Sales information
    estimated_value = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    probability = Column(Numeric(5, 2), nullable=False)  # 0-100
    expected_close_date = Column(Date, nullable=True)
    actual_close_date = Column(Date, nullable=True)

    # Status tracking
    stage = Column(
        SQLEnum(OpportunityStage, name="opportunity_stage"),
        nullable=False,
        default=OpportunityStage.LEAD,
        index=True
    )

    # Loss reason (when CLOSED_LOST)
    loss_reason = Column(String(500), nullable=True)

    # Relationships
    client = relationship("Client", backref="opportunities")
    sales_rep = relationship("User", backref="opportunities")
    quotations = relationship("Quotation", back_populates="opportunity", lazy="select")

    def __repr__(self):
        return f"<Opportunity(id={self.id}, name='{self.name}', stage='{self.stage}')>"

    @property
    def weighted_value(self):
        """Calculate weighted value (estimated_value * probability / 100)"""
        if self.estimated_value and self.probability:
            return float(self.estimated_value) * (float(self.probability) / 100)
        return 0.0

    @property
    def is_closed(self):
        """Check if opportunity is in a closed stage"""
        return self.stage in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]

    @property
    def is_won(self):
        """Check if opportunity was won"""
        return self.stage == OpportunityStage.CLOSED_WON
