"""
Expense model for tracking business expenses
"""
from enum import Enum
from sqlalchemy import Column, String, Text, Numeric, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from models.base import BaseModel


class ExpenseStatus(str, Enum):
    """Expense approval status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Expense(BaseModel):
    """
    Expense model
    Tracks business expenses with categories, receipts, and approval workflow
    """

    __tablename__ = "expenses"

    # User who created the expense
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Category
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("expense_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Expense details
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    description = Column(Text, nullable=False)
    date = Column(Date, nullable=False, index=True)

    # Receipt/documentation
    receipt_url = Column(String(500), nullable=True)
    receipt_number = Column(String(100), nullable=True)

    # Approval workflow
    status = Column(
        SQLEnum(ExpenseStatus, name="expense_status", values_callable=lambda x: [e.value for e in x]),
        default=ExpenseStatus.PENDING,
        nullable=False,
        index=True,
    )
    approved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejection_reason = Column(Text, nullable=True)

    # Additional notes
    notes = Column(Text, nullable=True)

    # Vendor/supplier information
    vendor_name = Column(String(255), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    category = relationship("ExpenseCategory", back_populates="expenses")
    approver = relationship("User", foreign_keys=[approved_by])

    def __repr__(self):
        return f"<Expense(id={self.id}, amount={self.amount}, category='{self.category_id}')>"
