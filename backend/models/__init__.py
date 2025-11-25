"""Database models package"""
from models.base import Base, BaseModel
from models.tenant import Tenant
from models.user import User, UserRole
from models.refresh_token import RefreshToken
from models.expense_category import ExpenseCategory
from models.expense import Expense, ExpenseStatus
from models.quote import Quote, SaleStatus
from models.quote_item import QuoteItem
from models.transport import (
    Vehicle,
    VehicleType,
    VehicleStatus,
    Shipment,
    ShipmentStatus,
    ShipmentExpense,
    ExpenseType,
)

# All models must be imported here for Alembic autogenerate to work
__all__ = [
    "Base",
    "BaseModel",
    "Tenant",
    "User",
    "UserRole",
    "RefreshToken",
    "ExpenseCategory",
    "Expense",
    "ExpenseStatus",
    "Quote",
    "QuoteItem",
    "SaleStatus",
    "Vehicle",
    "VehicleType",
    "VehicleStatus",
    "Shipment",
    "ShipmentStatus",
    "ShipmentExpense",
    "ExpenseType",
]
