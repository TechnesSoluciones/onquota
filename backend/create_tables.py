"""
Create all database tables from models
This bypasses Alembic and creates tables directly from SQLAlchemy models
"""
import asyncio
import sys

# Import database and base
from core.database import engine
from models.base import Base

# Import all models so they're registered with Base.metadata
from models.tenant import Tenant
from models.user import User
from models.refresh_token import RefreshToken
from models.client import Client
from models.expense_category import ExpenseCategory
from models.expense import Expense
from models.quote import Quote
from models.quote_item import QuoteItem
from models.transport import Vehicle, Shipment, ShipmentExpense
from models.ocr_job import OCRJob
from models.notification import Notification
from models.opportunity import Opportunity
from models.analysis import Analysis
from models.account_plan import AccountPlan, Milestone, SWOTItem
from models.visit import Visit, Call

async def create_all_tables():
    """Create all tables defined in models"""
    try:
        print("🔧 Creating all database tables...")

        async with engine.begin() as conn:
            # Drop all tables first (clean slate)
            print("   Dropping existing tables...")
            await conn.run_sync(Base.metadata.drop_all)

            # Create all tables
            print("   Creating tables from models...")
            await conn.run_sync(Base.metadata.create_all)

        print("✅ All tables created successfully!")
        return True

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(create_all_tables())
    sys.exit(0 if success else 1)
