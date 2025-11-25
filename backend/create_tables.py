"""
Script para crear todas las tablas de la base de datos
"""
import asyncio

async def create_all_tables():
    """Crear todas las tablas usando SQLAlchemy"""

    # Importar todos los modelos para que SQLAlchemy los registre
    from models.tenant import Tenant
    from models.user import User
    from models.refresh_token import RefreshToken
    from models.client import Client
    from models.expense import Expense
    from models.expense_category import ExpenseCategory
    from models.quote import Quote
    from models.quote_item import QuoteItem
    from models.transport import Vehicle, Shipment, ShipmentExpense

    # Usar la función init_db del módulo database
    from core.database import init_db

    await init_db()
    print("✅ Todas las tablas creadas exitosamente!")

if __name__ == "__main__":
    asyncio.run(create_all_tables())
