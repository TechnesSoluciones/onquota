"""
QuoteItem model for Sales & Quotes module
Represents individual line items in a quote
"""
from sqlalchemy import Column, String, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from models.base import BaseModel


class QuoteItem(BaseModel):
    """
    Quote Item Model

    Represents individual products/services in a quote
    Includes pricing, discounts, and subtotals
    """
    __tablename__ = "quote_items"

    # Reference to parent quote
    quote_id = Column(
        UUID(as_uuid=True),
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Product/Service details
    product_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Pricing
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount_percent = Column(Numeric(5, 2), nullable=False, default=0)
    subtotal = Column(Numeric(12, 2), nullable=False)

    # Relationship
    quote = relationship("Quote", back_populates="items")

    def __repr__(self):
        return f"<QuoteItem(id={self.id}, product='{self.product_name}', qty={self.quantity})>"
