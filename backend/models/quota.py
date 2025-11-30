"""
Quota Model
Tracks sales rep quotas and achievements by product line
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING, List
from uuid import UUID
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Numeric,
    Integer,
    ForeignKey,
    Index,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from models.base import Base

if TYPE_CHECKING:
    from models.user import User
    from models.sales_control import SalesProductLine


class Quota(Base):
    """
    Quota model - Track sales rep monthly quotas

    Represents monthly sales quotas for sales representatives.
    Each quota can be broken down by product lines.

    Attributes:
        id: Primary key (UUID)
        tenant_id: Multi-tenant isolation
        year: Year (e.g., 2025)
        month: Month (1-12)
        user_id: Sales representative (user)
        user_name: Denormalized user name (performance)
        total_quota: Total quota amount (sum of lines)
        total_achieved: Total achieved amount (sum of lines)
        achievement_percentage: Calculated % (total_achieved / total_quota * 100)
        notes: Additional notes
        lines: Product line breakdown
    """

    __tablename__ = "quotas"

    # Primary Key
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()"))

    # Multi-tenancy
    tenant_id = Column(PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Period (year and month)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)

    # Relationship to user (sales rep)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Denormalized field for performance
    user_name = Column(String(255), nullable=True)

    # Totals (aggregated from quota_lines)
    total_quota = Column(Numeric(15, 2), nullable=False, default=Decimal('0'), server_default='0')
    total_achieved = Column(Numeric(15, 2), nullable=False, default=Decimal('0'), server_default='0')

    # Calculated percentage
    achievement_percentage = Column(Numeric(5, 2), nullable=False, default=Decimal('0'), server_default='0')

    # Notes
    notes = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, server_default=sa.func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=sa.func.now())
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="false")
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships - ORM
    user = relationship("User", back_populates="quotas", foreign_keys=[user_id])
    lines = relationship("QuotaLine", back_populates="quota", cascade="all, delete-orphan")

    # Table constraints
    __table_args__ = (
        # Unique constraint: one quota per user per period
        UniqueConstraint('tenant_id', 'user_id', 'year', 'month', name='uk_quotas_tenant_user_period'),

        # Check constraints
        CheckConstraint('month >= 1 AND month <= 12', name='chk_quotas_month_valid'),
        CheckConstraint('year >= 2000 AND year <= 2100', name='chk_quotas_year_valid'),
        CheckConstraint('total_quota >= 0', name='chk_quotas_total_quota_positive'),
        CheckConstraint('total_achieved >= 0', name='chk_quotas_total_achieved_positive'),

        # Composite indexes for common queries
        Index('idx_quotas_tenant_user', 'tenant_id', 'user_id'),
        Index('idx_quotas_tenant_period', 'tenant_id', 'year', 'month'),
        Index('idx_quotas_not_deleted', 'tenant_id', postgresql_where=sa.text('is_deleted = false')),
    )

    def __repr__(self) -> str:
        return f"<Quota(id={self.id}, user={self.user_name}, period={self.year}-{self.month:02d})>"

    # Business logic properties

    @property
    def period_str(self) -> str:
        """Get period as string (YYYY-MM)"""
        return f"{self.year}-{self.month:02d}"

    @property
    def is_achieved(self) -> bool:
        """Check if quota was fully achieved (>= 100%)"""
        return self.achievement_percentage >= Decimal('100')

    @property
    def remaining_quota(self) -> Decimal:
        """Calculate remaining quota to achieve"""
        remaining = self.total_quota - self.total_achieved
        return max(Decimal('0'), remaining)

    @property
    def gap_percentage(self) -> Decimal:
        """Calculate gap percentage (100% - achievement%)"""
        gap = Decimal('100') - self.achievement_percentage
        return max(Decimal('0'), gap)

    def recalculate_totals(self) -> None:
        """
        Recalculate totals and achievement percentage from lines
        Should be called after lines are modified
        """
        if not self.lines:
            self.total_quota = Decimal('0')
            self.total_achieved = Decimal('0')
            self.achievement_percentage = Decimal('0')
            return

        self.total_quota = sum(line.quota_amount for line in self.lines)
        self.total_achieved = sum(line.achieved_amount for line in self.lines)

        if self.total_quota > 0:
            self.achievement_percentage = (self.total_achieved / self.total_quota) * Decimal('100')
        else:
            self.achievement_percentage = Decimal('0')

        # Round to 2 decimal places
        self.achievement_percentage = self.achievement_percentage.quantize(Decimal('0.01'))

    def get_line_by_product_line_id(self, product_line_id: UUID) -> Optional['QuotaLine']:
        """
        Get quota line for specific product line

        Args:
            product_line_id: Product line ID

        Returns:
            QuotaLine if found, None otherwise
        """
        for line in self.lines:
            if line.product_line_id == product_line_id:
                return line
        return None


class QuotaLine(Base):
    """
    Quota Line model - Product line breakdown for quotas

    Represents quota and achievement for a specific product line.

    Attributes:
        id: Primary key (UUID)
        tenant_id: Multi-tenant isolation
        quota_id: Reference to quota
        product_line_id: Reference to product line
        product_line_name: Denormalized product line name (performance)
        quota_amount: Quota for this product line
        achieved_amount: Achieved amount for this product line
        achievement_percentage: Calculated % (achieved / quota * 100)
    """

    __tablename__ = "quota_lines"

    # Primary Key
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()"))

    # Multi-tenancy
    tenant_id = Column(PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships - Foreign Keys
    quota_id = Column(PGUUID(as_uuid=True), ForeignKey("quotas.id", ondelete="CASCADE"), nullable=False, index=True)
    product_line_id = Column(PGUUID(as_uuid=True), ForeignKey("sales_product_lines.id", ondelete="CASCADE"), nullable=False, index=True)

    # Denormalized field for performance
    product_line_name = Column(String(200), nullable=True)

    # Amounts
    quota_amount = Column(Numeric(15, 2), nullable=False)
    achieved_amount = Column(Numeric(15, 2), nullable=False, default=Decimal('0'), server_default='0')

    # Calculated percentage
    achievement_percentage = Column(Numeric(5, 2), nullable=False, default=Decimal('0'), server_default='0')

    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, server_default=sa.func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=sa.func.now())

    # Relationships - ORM
    quota = relationship("Quota", back_populates="lines", foreign_keys=[quota_id])
    product_line = relationship("SalesProductLine", back_populates="quota_lines", foreign_keys=[product_line_id])

    # Table constraints
    __table_args__ = (
        # Unique constraint: one line per product line per quota
        UniqueConstraint('quota_id', 'product_line_id', name='uk_quota_lines_quota_product'),

        # Check constraints
        CheckConstraint('quota_amount >= 0', name='chk_quota_lines_quota_positive'),
        CheckConstraint('achieved_amount >= 0', name='chk_quota_lines_achieved_positive'),
    )

    def __repr__(self) -> str:
        return f"<QuotaLine(id={self.id}, product_line={self.product_line_name}, achievement={self.achievement_percentage}%)>"

    # Business logic properties

    @property
    def is_achieved(self) -> bool:
        """Check if line quota was fully achieved (>= 100%)"""
        return self.achievement_percentage >= Decimal('100')

    @property
    def remaining_quota(self) -> Decimal:
        """Calculate remaining quota to achieve for this line"""
        remaining = self.quota_amount - self.achieved_amount
        return max(Decimal('0'), remaining)

    @property
    def gap_percentage(self) -> Decimal:
        """Calculate gap percentage for this line (100% - achievement%)"""
        gap = Decimal('100') - self.achievement_percentage
        return max(Decimal('0'), gap)

    def recalculate_achievement_percentage(self) -> None:
        """
        Recalculate achievement percentage
        Should be called after achieved_amount is updated
        """
        if self.quota_amount > 0:
            self.achievement_percentage = (self.achieved_amount / self.quota_amount) * Decimal('100')
        else:
            self.achievement_percentage = Decimal('0')

        # Round to 2 decimal places
        self.achievement_percentage = self.achievement_percentage.quantize(Decimal('0.01'))

    def add_achievement(self, amount: Decimal) -> None:
        """
        Add achievement amount and recalculate percentage

        Args:
            amount: Amount to add to achievement
        """
        self.achieved_amount += amount
        self.recalculate_achievement_percentage()


# Import sqlalchemy at module level (needed for server_default)
import sqlalchemy as sa
