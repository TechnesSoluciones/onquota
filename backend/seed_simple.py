"""
Simple Database Seeder Script for OnQuota
Seeds only the core tables that exist
"""
import asyncio
from datetime import datetime, timedelta, date
from decimal import Decimal
from uuid import uuid4

from core.database import AsyncSessionLocal
from core.security import get_password_hash
from models.tenant import Tenant
from models.user import User, UserRole
from models.refresh_token import RefreshToken
from models.client import Client, ClientStatus
from models.expense_category import ExpenseCategory
from models.expense import Expense, ExpenseStatus
from models.quote import Quote, SaleStatus
from models.quote_item import QuoteItem
from models.transport import Vehicle, VehicleType, VehicleStatus, Shipment, ShipmentStatus, ShipmentExpense, ExpenseType


async def seed_database():
    """Seed database with sample data"""
    print("🌱 Starting database seeding...")

    async with AsyncSessionLocal() as session:
        try:
            # 1. Create Tenant
            print("\n1️⃣ Creating tenant...")
            tenant = Tenant(
                id=uuid4(),
                company_name="Empresa Demo OnQuota",
                domain="demo.onquota.com",
                is_active=True,
            )
            session.add(tenant)
            await session.flush()
            tenant_id = tenant.id
            print(f"   ✓ Tenant: {tenant.company_name}")

            # 2. Create Users
            print("\n2️⃣ Creating users...")
            admin = User(
                id=uuid4(),
                tenant_id=tenant_id,
                email="admin@demo.com",
                hashed_password=get_password_hash("Admin123!"),
                full_name="Administrador Principal",
                phone="+593987654321",
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True,
            )
            session.add(admin)

            sales_rep = User(
                id=uuid4(),
                tenant_id=tenant_id,
                email="juan.perez@demo.com",
                hashed_password=get_password_hash("Sales123!"),
                full_name="Juan Pérez",
                phone="+593987654322",
                role=UserRole.SALES_REP,
                is_active=True,
                is_verified=True,
            )
            session.add(sales_rep)

            supervisor = User(
                id=uuid4(),
                tenant_id=tenant_id,
                email="supervisor@demo.com",
                hashed_password=get_password_hash("Super123!"),
                full_name="Ana Martínez",
                phone="+593987654325",
                role=UserRole.SUPERVISOR,
                is_active=True,
                is_verified=True,
            )
            session.add(supervisor)

            await session.flush()
            print(f"   ✓ Admin: {admin.email}")
            print(f"   ✓ Sales Rep: {sales_rep.email}")
            print(f"   ✓ Supervisor: {supervisor.email}")

            # 3. Create Clients
            print("\n3️⃣ Creating clients...")
            client1 = Client(
                id=uuid4(),
                tenant_id=tenant_id,
                name="Empresa ABC",
                tax_id="1234567890001",
                email="contacto@empresaabc.com",
                phone="+593987111111",
                status=ClientStatus.ACTIVE,
                address_line1="Av. Amazonas N123 y Patria",
                city="Quito",
                country="Ecuador",
            )
            session.add(client1)

            client2 = Client(
                id=uuid4(),
                tenant_id=tenant_id,
                name="Tech Solutions SA",
                tax_id="0987654321001",
                email="info@techsolutions.com",
                phone="+593987222222",
                status=ClientStatus.ACTIVE,
                address_line1="Av. 9 de Octubre 456",
                city="Guayaquil",
                country="Ecuador",
            )
            session.add(client2)

            await session.flush()
            print(f"   ✓ Client: {client1.name}")
            print(f"   ✓ Client: {client2.name}")

            # 4. Create Expense Categories
            print("\n4️⃣ Creating expense categories...")
            categories = []
            category_names = ["Combustible", "Alimentos", "Peajes", "Estacionamiento", "Suministros", "Mantenimiento"]
            for cat_name in category_names:
                cat = ExpenseCategory(
                    id=uuid4(),
                    tenant_id=tenant_id,
                    name=cat_name,
                    is_active=True,
                )
                session.add(cat)
                categories.append(cat)
            await session.flush()
            print(f"   ✓ Created {len(categories)} categories")

            # 5. Create Vehicles
            print("\n5️⃣ Creating vehicles...")
            vehicle1 = Vehicle(
                id=uuid4(),
                tenant_id=tenant_id,
                plate_number="ABC-1234",
                brand="Chevrolet",
                model="Sail",
                year="2020",
                vehicle_type=VehicleType.CAR,
                status=VehicleStatus.ACTIVE,
                fuel_type="Gasolina",
                fuel_efficiency_km_l=Decimal("15.5"),
                mileage_km=Decimal("45000"),
            )
            session.add(vehicle1)

            vehicle2 = Vehicle(
                id=uuid4(),
                tenant_id=tenant_id,
                plate_number="XYZ-5678",
                brand="Toyota",
                model="Hilux",
                year="2021",
                vehicle_type=VehicleType.TRUCK,
                status=VehicleStatus.ACTIVE,
                fuel_type="Diesel",
                fuel_efficiency_km_l=Decimal("12.0"),
                mileage_km=Decimal("28000"),
            )
            session.add(vehicle2)

            await session.flush()
            print(f"   ✓ Vehicle: {vehicle1.plate_number} ({vehicle1.brand} {vehicle1.model})")
            print(f"   ✓ Vehicle: {vehicle2.plate_number} ({vehicle2.brand} {vehicle2.model})")

            # 6. Create Expenses
            print("\n6️⃣ Creating expenses...")
            expense1 = Expense(
                id=uuid4(),
                tenant_id=tenant_id,
                user_id=sales_rep.id,
                category_id=categories[0].id,  # Combustible
                amount=Decimal("35.71"),
                currency="USD",
                description="Gasolina Super 95 - 12.5 litros",
                date=date.today() - timedelta(days=5),
                status=ExpenseStatus.APPROVED,
                approved_by=supervisor.id,
                vendor_name="Gasolinera El Sol",
            )
            session.add(expense1)

            expense2 = Expense(
                id=uuid4(),
                tenant_id=tenant_id,
                user_id=sales_rep.id,
                category_id=categories[1].id,  # Alimentos
                amount=Decimal("34.50"),
                currency="USD",
                description="Almuerzo con cliente",
                date=date.today() - timedelta(days=4),
                status=ExpenseStatus.APPROVED,
                approved_by=supervisor.id,
                vendor_name="Restaurante La Casa Grande",
            )
            session.add(expense2)

            expense3 = Expense(
                id=uuid4(),
                tenant_id=tenant_id,
                user_id=sales_rep.id,
                category_id=categories[2].id,  # Peajes
                amount=Decimal("3.50"),
                currency="USD",
                description="Peaje Autopista del Sol",
                date=date.today() - timedelta(days=3),
                status=ExpenseStatus.APPROVED,
                approved_by=supervisor.id,
            )
            session.add(expense3)

            print(f"   ✓ Created 3 expenses")

            # 7. Create Quotes
            print("\n7️⃣ Creating quotes...")
            quote1 = Quote(
                id=uuid4(),
                tenant_id=tenant_id,
                client_id=client1.id,
                sales_rep_id=sales_rep.id,
                quote_number="Q-2025-001",
                total_amount=Decimal("8500.00"),
                currency="USD",
                status=SaleStatus.DRAFT,
                valid_until=date.today() + timedelta(days=15),
                notes="Cliente requiere entrega en 2 semanas - Equipos de cómputo",
            )
            session.add(quote1)
            await session.flush()

            # Quote Items
            item1 = QuoteItem(
                id=uuid4(),
                tenant_id=tenant_id,
                quote_id=quote1.id,
                product_name="Laptop Dell XPS 15",
                description="Laptop de alto rendimiento para desarrollo",
                quantity=Decimal("5"),
                unit_price=Decimal("1200.00"),
                discount_percent=Decimal("10.00"),
                subtotal=Decimal("5400.00"),  # 5 * 1200 * 0.9
            )
            session.add(item1)

            item2 = QuoteItem(
                id=uuid4(),
                tenant_id=tenant_id,
                quote_id=quote1.id,
                product_name="Monitor Samsung 27\"",
                description="Monitor Full HD para workstation",
                quantity=Decimal("5"),
                unit_price=Decimal("350.00"),
                discount_percent=Decimal("5.00"),
                subtotal=Decimal("1662.50"),  # 5 * 350 * 0.95
            )
            session.add(item2)

            print(f"   ✓ Quote: {quote1.quote_number} with 2 items")

            # 8. Create Shipments
            print("\n8️⃣ Creating shipments...")
            shipment1 = Shipment(
                id=uuid4(),
                tenant_id=tenant_id,
                shipment_number="SH-2025-001",
                client_id=client1.id,
                vehicle_id=vehicle1.id,
                driver_id=sales_rep.id,
                origin_address="Bodega Central",
                origin_city="Quito",
                destination_address="Av. Amazonas N123",
                destination_city="Quito",
                scheduled_date=date.today() - timedelta(days=2),
                pickup_date=date.today() - timedelta(days=2),
                delivery_date=date.today() - timedelta(days=2),
                description="Entrega de equipos de cómputo",
                weight_kg=Decimal("150.00"),
                freight_cost=Decimal("50.00"),
                currency="USD",
                status=ShipmentStatus.DELIVERED,
            )
            session.add(shipment1)

            shipment2 = Shipment(
                id=uuid4(),
                tenant_id=tenant_id,
                shipment_number="SH-2025-002",
                client_id=client2.id,
                vehicle_id=vehicle2.id,
                driver_id=sales_rep.id,
                origin_address="Bodega Central",
                origin_city="Quito",
                destination_address="Av. 9 de Octubre 456",
                destination_city="Guayaquil",
                scheduled_date=date.today(),
                description="Materiales de construcción",
                weight_kg=Decimal("500.00"),
                freight_cost=Decimal("150.00"),
                currency="USD",
                status=ShipmentStatus.IN_TRANSIT,
            )
            session.add(shipment2)

            await session.flush()
            print(f"   ✓ Shipment: {shipment1.shipment_number}")
            print(f"   ✓ Shipment: {shipment2.shipment_number}")

            # 9. Create Shipment Expenses
            print("\n9️⃣ Creating shipment expenses...")
            ship_exp1 = ShipmentExpense(
                id=uuid4(),
                tenant_id=tenant_id,
                shipment_id=shipment1.id,
                expense_type=ExpenseType.FUEL,
                amount=Decimal("45.00"),
                currency="USD",
                expense_date=date.today() - timedelta(days=2),
                description="Combustible para viaje",
                location="Gasolinera El Sol, Quito",
            )
            session.add(ship_exp1)

            ship_exp2 = ShipmentExpense(
                id=uuid4(),
                tenant_id=tenant_id,
                shipment_id=shipment1.id,
                expense_type=ExpenseType.TOLL,
                amount=Decimal("5.00"),
                currency="USD",
                expense_date=date.today() - timedelta(days=2),
                description="Peaje Autopista",
            )
            session.add(ship_exp2)

            print(f"   ✓ Created 2 shipment expenses")

            # Commit all changes
            await session.commit()

            print("\n" + "=" * 60)
            print("✅ Database seeding completed successfully!")
            print("=" * 60)
            print("\n📊 Summary:")
            print(f"   • 1 Tenant (Company)")
            print(f"   • 3 Users (1 Admin, 1 Sales Rep, 1 Supervisor)")
            print(f"   • 2 Clients")
            print(f"   • {len(categories)} Expense Categories")
            print(f"   • 2 Vehicles")
            print(f"   • 3 Expenses")
            print(f"   • 1 Quote with 2 items")
            print(f"   • 2 Shipments")
            print(f"   • 2 Shipment Expenses")
            print("\n🔐 Login Credentials:")
            print("   Admin:")
            print("      Email: admin@demo.com")
            print("      Password: Admin123!")
            print("\n   Sales Rep:")
            print("      Email: juan.perez@demo.com")
            print("      Password: Sales123!")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error seeding database: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
