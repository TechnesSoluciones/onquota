"""
ExpenseCategory model for categorizing expenses
"""
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from models.base import BaseModel


class ExpenseCategory(BaseModel):
    """
    Expense category model
    Categories for organizing expenses
    """

    __tablename__ = "expense_categories"

    # Category information
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name for UI
    color = Column(String(7), nullable=True)  # Hex color code (#RRGGBB)

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    expenses = relationship("Expense", back_populates="category")

    def __repr__(self):
        return f"<ExpenseCategory(id={self.id}, name='{self.name}')>"
