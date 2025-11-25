"""
Database Seeder Script for OnQuota

This script populates the database with sample data for testing and development.

Usage:
    python seed_database.py

Environment:
    Requires DATABASE_URL to be set in .env file
"""
import asyncio
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from core.config import settings
from core.security import get_password_hash
from models.tenant import Tenant
from models.user import User, UserRole
from models.client import Client, ClientStatus, Industry
from models.expense import Expense, ExpenseCategory, ExpenseStatus
from models.quote import Quote, QuoteItem, QuoteStatus
from models.vehicle import Vehicle, VehicleStatus, FuelType
from models.shipment import Shipment, ShipmentStatus
from models.opportunity import Opportunity, OpportunityStage


class DatabaseSeeder:
    """Seeds database with sample data"""

    def __init__(self):
        self.engine = create_async_engine(settings.DATABASE_URL, echo=False)
        self.async_session = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )
        self.tenant_id = None
        self.users = {}
        self.clients = {}
        self.vehicles = {}

    async def seed_all(self):
        """Seed all tables"""
        print("🌱 Starting database seeding...")

        async with self.async_session() as session:
            try:
                # 1. Create tenant
                print("\n1️⃣  Creating tenant (company)...")
                await self.seed_tenant(session)

                # 2. Create users
                print("2️⃣  Creating users...")
                await self.seed_users(session)

                # 3. Create clients
                print("3️⃣  Creating clients...")
                await self.seed_clients(session)

                # 4. Create vehicles
                print("4️⃣  Creating vehicles...")
                await self.seed_vehicles(session)

                # 5. Create expenses
                print("5️⃣  Creating expenses...")
                await self.seed_expenses(session)

                # 6. Create quotes
                print("6️⃣  Creating quotes...")
                await self.seed_quotes(session)

                # 7. Create shipments
                print("7️⃣  Creating shipments...")
                await self.seed_shipments(session)

                # 8. Create opportunities
                print("8️⃣  Creating opportunities...")
                await self.seed_opportunities(session)

                await session.commit()
                print("\n✅ Database seeding completed successfully!")

            except Exception as e:
                await session.rollback()
                print(f"\n❌ Error seeding database: {e}")
                raise

    async def seed_tenant(self, session: AsyncSession):
        """Create sample tenant (company)"""
        tenant = Tenant(
            id=uuid4(),
            company_name="Empresa Demo OnQuota",
            domain="demo.onquota.com",
            is_active=True,
        )
        session.add(tenant)
        await session.flush()
        self.tenant_id = tenant.id
        print(f"   ✓ Created tenant: {tenant.company_name} (ID: {tenant.id})")

    async def seed_users(self, session: AsyncSession):
        """Create sample users with different roles"""
        users_data = [
            {
                "email": "admin@demo.com",
                "password": "Admin123!",
                "full_name": "Administrador Principal",
                "role": UserRole.ADMIN,
                "phone": "+593987654321",
            },
            {
                "email": "juan.perez@demo.com",
                "password": "Sales123!",
                "full_name": "Juan Pérez",
                "role": UserRole.SALES_REP,
                "phone": "+593987654322",
            },
            {
                "email": "maria.garcia@demo.com",
                "password": "Sales123!",
                "full_name": "María García",
                "role": UserRole.SALES_REP,
                "phone": "+593987654323",
            },
            {
                "email": "carlos.lopez@demo.com",
                "password": "Sales123!",
                "full_name": "Carlos López",
                "role": UserRole.SALES_REP,
                "phone": "+593987654324",
            },
            {
                "email": "supervisor@demo.com",
                "password": "Super123!",
                "full_name": "Ana Martínez",
                "role": UserRole.SUPERVISOR,
                "phone": "+593987654325",
            },
            {
                "email": "analyst@demo.com",
                "password": "Analyst123!",
                "full_name": "Roberto Sánchez",
                "role": UserRole.ANALYST,
                "phone": "+593987654326",
            },
        ]

        for user_data in users_data:
            user = User(
                id=uuid4(),
                tenant_id=self.tenant_id,
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"]),
                full_name=user_data["full_name"],
                phone=user_data["phone"],
                role=user_data["role"],
                is_active=True,
            )
            session.add(user)
            await session.flush()
            self.users[user_data["role"].value] = user
            print(f"   ✓ Created user: {user.full_name} ({user.role.value})")

    async def seed_clients(self, session: AsyncSession):
        """Create sample clients"""
        clients_data = [
            {
                "name": "Empresa ABC",
                "ruc": "1234567890001",
                "email": "contacto@empresaabc.com",
                "phone": "+593987111111",
                "industry": Industry.TECHNOLOGY,
                "status": ClientStatus.ACTIVE,
                "address": "Av. Amazonas N123 y Patria, Quito",
            },
            {
                "name": "Tech Solutions",
                "ruc": "0987654321001",
                "email": "info@techsolutions.com",
                "phone": "+593987222222",
                "industry": Industry.TECHNOLOGY,
                "status": ClientStatus.ACTIVE,
                "address": "Av. 9 de Octubre 456, Guayaquil",
            },
            {
                "name": "Distribuidora XYZ",
                "ruc": "1122334455001",
                "email": "ventas@distribuidoraxyz.com",
                "phone": "+593987333333",
                "industry": Industry.RETAIL,
                "status": ClientStatus.ACTIVE,
                "address": "Calle Bolívar 789, Cuenca",
            },
            {
                "name": "Corporativo SA",
                "ruc": "9988776655001",
                "email": "info@corporativosa.com",
                "phone": "+593987444444",
                "industry": Industry.FINANCE,
                "status": ClientStatus.ACTIVE,
                "address": "Av. Naciones Unidas E10-123, Quito",
            },
            {
                "name": "Servicios Integrales",
                "ruc": "5566778899001",
                "email": "contacto@serviciosintegrales.com",
                "phone": "+593987555555",
                "industry": Industry.SERVICES,
                "status": ClientStatus.PROSPECT,
                "address": "Av. De las Américas Km 5.5, Guayaquil",
            },
        ]

        for client_data in clients_data:
            client = Client(
                id=uuid4(),
                tenant_id=self.tenant_id,
                **client_data,
            )
            session.add(client)
            await session.flush()
            self.clients[client_data["name"]] = client
            print(f"   ✓ Created client: {client.name}")

    async def seed_vehicles(self, session: AsyncSession):
        """Create sample vehicles"""
        vehicles_data = [
            {
                "license_plate": "ABC-1234",
                "brand": "Chevrolet",
                "model": "Sail",
                "year": 2020,
                "fuel_type": FuelType.GASOLINE,
                "status": VehicleStatus.ACTIVE,
            },
            {
                "license_plate": "XYZ-5678",
                "brand": "Toyota",
                "model": "Hilux",
                "year": 2021,
                "fuel_type": FuelType.DIESEL,
                "status": VehicleStatus.ACTIVE,
            },
            {
                "license_plate": "PQR-9012",
                "brand": "Nissan",
                "model": "Versa",
                "year": 2019,
                "fuel_type": FuelType.GASOLINE,
                "status": VehicleStatus.ACTIVE,
            },
        ]

        for vehicle_data in vehicles_data:
            vehicle = Vehicle(
                id=uuid4(),
                tenant_id=self.tenant_id,
                **vehicle_data,
            )
            session.add(vehicle)
            await session.flush()
            self.vehicles[vehicle_data["license_plate"]] = vehicle
            print(f"   ✓ Created vehicle: {vehicle.license_plate}")

    async def seed_expenses(self, session: AsyncSession):
        """Create sample expenses"""
        sales_rep = self.users.get(UserRole.SALES_REP.value)
        vehicle = list(self.vehicles.values())[0]

        expenses_data = [
            {
                "amount": Decimal("35.71"),
                "category": ExpenseCategory.FUEL,
                "description": "Gasolina Super 95 - 12.5 litros",
                "status": ExpenseStatus.APPROVED,
                "expense_date": datetime.now() - timedelta(days=5),
                "vehicle_id": vehicle.id,
            },
            {
                "amount": Decimal("34.50"),
                "category": ExpenseCategory.FOOD,
                "description": "Almuerzo con cliente - Restaurante La Casa Grande",
                "status": ExpenseStatus.APPROVED,
                "expense_date": datetime.now() - timedelta(days=4),
            },
            {
                "amount": Decimal("3.50"),
                "category": ExpenseCategory.TOLL,
                "description": "Peaje Autopista del Sol",
                "status": ExpenseStatus.APPROVED,
                "expense_date": datetime.now() - timedelta(days=3),
                "vehicle_id": vehicle.id,
            },
            {
                "amount": Decimal("4.00"),
                "category": ExpenseCategory.PARKING,
                "description": "Estacionamiento Plaza Mall - 4h 15min",
                "status": ExpenseStatus.APPROVED,
                "expense_date": datetime.now() - timedelta(days=2),
            },
            {
                "amount": Decimal("150.00"),
                "category": ExpenseCategory.SUPPLIES,
                "description": "Material de oficina y papelería",
                "status": ExpenseStatus.PENDING,
                "expense_date": datetime.now() - timedelta(days=1),
            },
        ]

        for expense_data in expenses_data:
            expense = Expense(
                id=uuid4(),
                tenant_id=self.tenant_id,
                user_id=sales_rep.id,
                **expense_data,
            )
            session.add(expense)
        print(f"   ✓ Created {len(expenses_data)} expenses")

    async def seed_quotes(self, session: AsyncSession):
        """Create sample quotes"""
        sales_rep = self.users.get(UserRole.SALES_REP.value)
        client = self.clients.get("Empresa ABC")

        # Quote 1: Pending
        quote1 = Quote(
            id=uuid4(),
            tenant_id=self.tenant_id,
            client_id=client.id,
            created_by=sales_rep.id,
            quote_number="Q-2025-001",
            title="Equipos de Cómputo",
            description="Cotización para equipos de oficina",
            status=QuoteStatus.PENDING,
            valid_until=datetime.now() + timedelta(days=15),
            notes="Cliente requiere entrega en 2 semanas",
        )
        session.add(quote1)
        await session.flush()

        # Quote items
        items1 = [
            {
                "description": "Laptop Dell XPS 15",
                "quantity": 5,
                "unit_price": Decimal("1200.00"),
                "discount": Decimal("10.00"),
            },
            {
                "description": "Monitor Samsung 27\"",
                "quantity": 5,
                "unit_price": Decimal("350.00"),
                "discount": Decimal("5.00"),
            },
        ]

        for item_data in items1:
            item = QuoteItem(
                id=uuid4(),
                tenant_id=self.tenant_id,
                quote_id=quote1.id,
                **item_data,
            )
            session.add(item)

        # Quote 2: Won
        client2 = self.clients.get("Tech Solutions")
        quote2 = Quote(
            id=uuid4(),
            tenant_id=self.tenant_id,
            client_id=client2.id,
            created_by=sales_rep.id,
            quote_number="Q-2025-002",
            title="Infraestructura de Redes",
            description="Equipamiento de red para oficina",
            status=QuoteStatus.WON,
            valid_until=datetime.now() - timedelta(days=5),
        )
        session.add(quote2)
        await session.flush()

        items2 = [
            {
                "description": "Switch Cisco 24 puertos",
                "quantity": 3,
                "unit_price": Decimal("450.00"),
                "discount": Decimal("12.00"),
            },
            {
                "description": "Router TP-Link AX6000",
                "quantity": 2,
                "unit_price": Decimal("180.00"),
                "discount": Decimal("10.00"),
            },
        ]

        for item_data in items2:
            item = QuoteItem(
                id=uuid4(),
                tenant_id=self.tenant_id,
                quote_id=quote2.id,
                **item_data,
            )
            session.add(item)

        print(f"   ✓ Created 2 quotes with items")

    async def seed_shipments(self, session: AsyncSession):
        """Create sample shipments"""
        vehicle = list(self.vehicles.values())[0]
        driver = self.users.get(UserRole.SALES_REP.value)
        client = self.clients.get("Empresa ABC")

        shipments_data = [
            {
                "tracking_number": "SH-2025-001",
                "origin": "Bodega Central, Quito",
                "destination": "Av. Amazonas N123, Quito",
                "status": ShipmentStatus.DELIVERED,
                "scheduled_date": datetime.now() - timedelta(days=2),
                "delivery_date": datetime.now() - timedelta(days=2),
                "vehicle_id": vehicle.id,
                "driver_id": driver.id,
                "client_id": client.id,
            },
            {
                "tracking_number": "SH-2025-002",
                "origin": "Bodega Central, Quito",
                "destination": "Av. 9 de Octubre 456, Guayaquil",
                "status": ShipmentStatus.IN_TRANSIT,
                "scheduled_date": datetime.now(),
                "vehicle_id": vehicle.id,
                "driver_id": driver.id,
                "client_id": self.clients.get("Tech Solutions").id,
            },
        ]

        for shipment_data in shipments_data:
            shipment = Shipment(
                id=uuid4(),
                tenant_id=self.tenant_id,
                **shipment_data,
            )
            session.add(shipment)

        print(f"   ✓ Created {len(shipments_data)} shipments")

    async def seed_opportunities(self, session: AsyncSession):
        """Create sample opportunities"""
        sales_rep = self.users.get(UserRole.SALES_REP.value)
        client = self.clients.get("Corporativo SA")

        opportunities_data = [
            {
                "title": "Renovación Licencias Microsoft 365",
                "description": "Renovación anual de 50 licencias",
                "stage": OpportunityStage.PROPOSAL,
                "probability": 75,
                "expected_value": Decimal("15000.00"),
                "expected_close_date": datetime.now() + timedelta(days=30),
                "client_id": client.id,
                "assigned_to": sales_rep.id,
            },
            {
                "title": "Implementación Sistema ERP",
                "description": "Implementación de ERP para gestión empresarial",
                "stage": OpportunityStage.QUALIFICATION,
                "probability": 50,
                "expected_value": Decimal("45000.00"),
                "expected_close_date": datetime.now() + timedelta(days=60),
                "client_id": self.clients.get("Distribuidora XYZ").id,
                "assigned_to": sales_rep.id,
            },
            {
                "title": "Consultoría IT",
                "description": "Servicios de consultoría técnica por 6 meses",
                "stage": OpportunityStage.NEGOTIATION,
                "probability": 80,
                "expected_value": Decimal("25000.00"),
                "expected_close_date": datetime.now() + timedelta(days=15),
                "client_id": client.id,
                "assigned_to": sales_rep.id,
            },
        ]

        for opp_data in opportunities_data:
            opportunity = Opportunity(
                id=uuid4(),
                tenant_id=self.tenant_id,
                **opp_data,
            )
            session.add(opportunity)

        print(f"   ✓ Created {len(opportunities_data)} opportunities")

    async def close(self):
        """Close database connection"""
        await self.engine.dispose()


async def main():
    """Main entry point"""
    print("=" * 60)
    print("  OnQuota Database Seeder")
    print("=" * 60)

    seeder = DatabaseSeeder()

    try:
        await seeder.seed_all()
        print("\n" + "=" * 60)
        print("  Summary")
        print("=" * 60)
        print("  ✓ 1 Tenant (Company)")
        print("  ✓ 6 Users (1 Admin, 3 Sales, 1 Supervisor, 1 Analyst)")
        print("  ✓ 5 Clients")
        print("  ✓ 3 Vehicles")
        print("  ✓ 5 Expenses")
        print("  ✓ 2 Quotes (with items)")
        print("  ✓ 2 Shipments")
        print("  ✓ 3 Opportunities")
        print("=" * 60)
        print("\n🎉 You can now login with:")
        print("   Email: admin@demo.com")
        print("   Password: Admin123!")
        print("\n   Or any sales rep:")
        print("   Email: juan.perez@demo.com")
        print("   Password: Sales123!")
        print()

    except Exception as e:
        print(f"\n💥 Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await seeder.close()


if __name__ == "__main__":
    asyncio.run(main())
