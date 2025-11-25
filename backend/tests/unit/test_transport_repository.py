"""
Unit tests for TransportRepository
Tests CRUD operations for vehicles, shipments, and shipment expenses
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from modules.transport.repository import TransportRepository
from models.transport import (
    Vehicle,
    VehicleType,
    VehicleStatus,
    Shipment,
    ShipmentStatus,
    ShipmentExpense,
    ExpenseType,
)
from models.tenant import Tenant
from models.user import User
from models.client import Client


@pytest.fixture
async def tenant(db_session: AsyncSession) -> Tenant:
    """Create a test tenant"""
    tenant = Tenant(
        id=uuid4(),
        name="Test Transport Company",
        subdomain="transport-test",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest.fixture
async def user(db_session: AsyncSession, tenant: Tenant) -> User:
    """Create a test user (driver)"""
    user = User(
        id=uuid4(),
        tenant_id=tenant.id,
        email="driver@test.com",
        username="test_driver",
        hashed_password="hashed_password",
        role="user",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def client(db_session: AsyncSession, tenant: Tenant) -> Client:
    """Create a test client"""
    client = Client(
        id=uuid4(),
        tenant_id=tenant.id,
        name="Test Client Corp",
        email="client@test.com",
        phone="555-1234",
        address="123 Test St",
        city="Test City",
    )
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    return client


@pytest.fixture
def repo(db_session: AsyncSession) -> TransportRepository:
    """Create repository instance"""
    return TransportRepository(db_session)


# ========================================================================
# VEHICLE TESTS
# ========================================================================


class TestVehicleOperations:
    """Test suite for vehicle CRUD operations"""

    @pytest.mark.asyncio
    async def test_create_vehicle_basic(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating a basic vehicle with required fields only"""
        # Arrange
        plate = "ABC-1234"
        brand = "Toyota"
        model = "Hilux"
        vehicle_type = VehicleType.TRUCK

        # Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number=plate,
            brand=brand,
            model=model,
            vehicle_type=vehicle_type,
        )

        # Assert
        assert vehicle.id is not None
        assert vehicle.tenant_id == tenant.id
        assert vehicle.plate_number == plate
        assert vehicle.brand == brand
        assert vehicle.model == model
        assert vehicle.vehicle_type == vehicle_type
        assert vehicle.status == VehicleStatus.ACTIVE  # Default
        assert vehicle.is_deleted is False

    @pytest.mark.asyncio
    async def test_create_vehicle_complete(
        self, repo: TransportRepository, tenant: Tenant, user: User
    ):
        """Test creating a vehicle with all optional fields"""
        # Arrange
        today = date.today()
        next_maintenance = today + timedelta(days=90)

        # Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="XYZ-9999",
            brand="Mercedes-Benz",
            model="Actros",
            vehicle_type=VehicleType.TRUCK,
            year="2023",
            status=VehicleStatus.ACTIVE,
            assigned_driver_id=user.id,
            capacity_kg=Decimal("15000.00"),
            fuel_type="Diesel",
            fuel_efficiency_km_l=Decimal("8.5"),
            last_maintenance_date=today,
            next_maintenance_date=next_maintenance,
            mileage_km=Decimal("45000.00"),
            notes="Heavy duty truck",
        )

        # Assert
        assert vehicle.year == "2023"
        assert vehicle.assigned_driver_id == user.id
        assert vehicle.capacity_kg == Decimal("15000.00")
        assert vehicle.fuel_type == "Diesel"
        assert vehicle.fuel_efficiency_km_l == Decimal("8.5")
        assert vehicle.last_maintenance_date == today
        assert vehicle.next_maintenance_date == next_maintenance
        assert vehicle.mileage_km == Decimal("45000.00")
        assert vehicle.notes == "Heavy duty truck"

    @pytest.mark.asyncio
    async def test_get_vehicle_by_id(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test retrieving a vehicle by ID"""
        # Arrange
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="TEST-001",
            brand="Ford",
            model="Ranger",
            vehicle_type=VehicleType.TRUCK,
        )

        # Act
        fetched = await repo.get_vehicle_by_id(vehicle.id, tenant.id)

        # Assert
        assert fetched is not None
        assert fetched.id == vehicle.id
        assert fetched.plate_number == "TEST-001"

    @pytest.mark.asyncio
    async def test_get_vehicle_by_id_wrong_tenant(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test that vehicle cannot be accessed with wrong tenant_id"""
        # Arrange
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="TEST-002",
            brand="Ford",
            model="Ranger",
            vehicle_type=VehicleType.TRUCK,
        )
        wrong_tenant_id = uuid4()

        # Act
        fetched = await repo.get_vehicle_by_id(vehicle.id, wrong_tenant_id)

        # Assert
        assert fetched is None

    @pytest.mark.asyncio
    async def test_get_vehicle_by_id_not_found(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test retrieving non-existent vehicle returns None"""
        # Arrange
        non_existent_id = uuid4()

        # Act
        fetched = await repo.get_vehicle_by_id(non_existent_id, tenant.id)

        # Assert
        assert fetched is None

    @pytest.mark.asyncio
    async def test_get_vehicles_pagination(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test vehicle listing with pagination"""
        # Arrange - Create 25 vehicles
        for i in range(25):
            await repo.create_vehicle(
                tenant_id=tenant.id,
                plate_number=f"PLATE-{i:03d}",
                brand="Toyota",
                model="Hilux",
                vehicle_type=VehicleType.TRUCK,
            )

        # Act - Get first page
        vehicles_page1, total = await repo.get_vehicles(
            tenant_id=tenant.id, page=1, page_size=20
        )

        # Assert
        assert total == 25
        assert len(vehicles_page1) == 20

        # Act - Get second page
        vehicles_page2, _ = await repo.get_vehicles(
            tenant_id=tenant.id, page=2, page_size=20
        )

        # Assert
        assert len(vehicles_page2) == 5

    @pytest.mark.asyncio
    async def test_get_vehicles_filter_by_status(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test filtering vehicles by status"""
        # Arrange
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="ACTIVE-1",
            brand="Toyota",
            model="Hilux",
            vehicle_type=VehicleType.TRUCK,
            status=VehicleStatus.ACTIVE,
        )
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="MAINT-1",
            brand="Ford",
            model="Ranger",
            vehicle_type=VehicleType.TRUCK,
            status=VehicleStatus.MAINTENANCE,
        )

        # Act
        active_vehicles, total_active = await repo.get_vehicles(
            tenant_id=tenant.id, status=VehicleStatus.ACTIVE
        )

        # Assert
        assert total_active == 1
        assert active_vehicles[0].status == VehicleStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_get_vehicles_filter_by_type(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test filtering vehicles by vehicle type"""
        # Arrange
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="TRUCK-1",
            brand="Mercedes",
            model="Actros",
            vehicle_type=VehicleType.TRUCK,
        )
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="VAN-1",
            brand="Ford",
            model="Transit",
            vehicle_type=VehicleType.VAN,
        )

        # Act
        trucks, total_trucks = await repo.get_vehicles(
            tenant_id=tenant.id, vehicle_type=VehicleType.TRUCK
        )

        # Assert
        assert total_trucks == 1
        assert trucks[0].vehicle_type == VehicleType.TRUCK

    @pytest.mark.asyncio
    async def test_get_vehicles_search(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test searching vehicles by plate, brand, or model"""
        # Arrange
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="ABC-123",
            brand="Toyota",
            model="Hilux",
            vehicle_type=VehicleType.TRUCK,
        )
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="XYZ-789",
            brand="Ford",
            model="Ranger",
            vehicle_type=VehicleType.TRUCK,
        )

        # Act - Search by plate
        results, total = await repo.get_vehicles(
            tenant_id=tenant.id, search="ABC"
        )

        # Assert
        assert total == 1
        assert results[0].plate_number == "ABC-123"

        # Act - Search by brand
        results, total = await repo.get_vehicles(
            tenant_id=tenant.id, search="Toyota"
        )

        # Assert
        assert total == 1
        assert results[0].brand == "Toyota"

    @pytest.mark.asyncio
    async def test_update_vehicle(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test updating vehicle fields"""
        # Arrange
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="UPDATE-1",
            brand="Toyota",
            model="Hilux",
            vehicle_type=VehicleType.TRUCK,
            mileage_km=Decimal("10000.00"),
        )

        # Act
        updated = await repo.update_vehicle(
            vehicle_id=vehicle.id,
            tenant_id=tenant.id,
            mileage_km=Decimal("15000.00"),
            status=VehicleStatus.MAINTENANCE,
        )

        # Assert
        assert updated is not None
        assert updated.mileage_km == Decimal("15000.00")
        assert updated.status == VehicleStatus.MAINTENANCE

    @pytest.mark.asyncio
    async def test_update_vehicle_not_found(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test updating non-existent vehicle returns None"""
        # Arrange
        non_existent_id = uuid4()

        # Act
        result = await repo.update_vehicle(
            vehicle_id=non_existent_id,
            tenant_id=tenant.id,
            mileage_km=Decimal("15000.00"),
        )

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_vehicle(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test soft deleting a vehicle"""
        # Arrange
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="DELETE-1",
            brand="Toyota",
            model="Hilux",
            vehicle_type=VehicleType.TRUCK,
        )

        # Act
        deleted = await repo.delete_vehicle(vehicle.id, tenant.id)

        # Assert
        assert deleted is True

        # Verify vehicle is soft deleted
        fetched = await repo.get_vehicle_by_id(vehicle.id, tenant.id)
        assert fetched is None

    @pytest.mark.asyncio
    async def test_delete_vehicle_not_found(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test deleting non-existent vehicle returns False"""
        # Arrange
        non_existent_id = uuid4()

        # Act
        deleted = await repo.delete_vehicle(non_existent_id, tenant.id)

        # Assert
        assert deleted is False

    @pytest.mark.asyncio
    async def test_get_vehicle_summary(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test vehicle fleet summary statistics"""
        # Arrange
        today = date.today()
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="ACTIVE-1",
            brand="Toyota",
            model="Hilux",
            vehicle_type=VehicleType.TRUCK,
            status=VehicleStatus.ACTIVE,
            capacity_kg=Decimal("5000.00"),
            fuel_efficiency_km_l=Decimal("10.0"),
        )
        await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="MAINT-1",
            brand="Ford",
            model="Ranger",
            vehicle_type=VehicleType.TRUCK,
            status=VehicleStatus.MAINTENANCE,
            capacity_kg=Decimal("3000.00"),
            fuel_efficiency_km_l=Decimal("8.0"),
            next_maintenance_date=today - timedelta(days=1),  # Overdue
        )

        # Act
        summary = await repo.get_vehicle_summary(tenant.id)

        # Assert
        assert summary["total_vehicles"] == 2
        assert summary["active_vehicles"] == 1
        assert summary["in_maintenance"] == 1
        assert summary["inactive_vehicles"] == 0
        assert summary["total_capacity_kg"] == Decimal("8000.00")
        assert summary["avg_fuel_efficiency"] == Decimal("9.0")
        assert summary["vehicles_needing_maintenance"] == 1


# ========================================================================
# SHIPMENT TESTS
# ========================================================================


class TestShipmentOperations:
    """Test suite for shipment CRUD operations"""

    @pytest.mark.asyncio
    async def test_create_shipment_basic(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating a basic shipment"""
        # Arrange
        today = date.today()

        # Act
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="SHIP-001",
            origin_address="123 Origin St",
            origin_city="Origin City",
            destination_address="456 Dest Ave",
            destination_city="Dest City",
            scheduled_date=today,
            freight_cost=Decimal("500.00"),
        )

        # Assert
        assert shipment.id is not None
        assert shipment.tenant_id == tenant.id
        assert shipment.shipment_number == "SHIP-001"
        assert shipment.origin_city == "Origin City"
        assert shipment.destination_city == "Dest City"
        assert shipment.status == ShipmentStatus.PENDING
        assert shipment.freight_cost == Decimal("500.00")
        assert shipment.currency == "USD"

    @pytest.mark.asyncio
    async def test_create_shipment_complete(
        self,
        repo: TransportRepository,
        tenant: Tenant,
        client: Client,
        user: User,
    ):
        """Test creating a shipment with all fields"""
        # Arrange
        today = date.today()
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="SHIP-VEH",
            brand="Toyota",
            model="Hilux",
            vehicle_type=VehicleType.TRUCK,
        )

        # Act
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="SHIP-002",
            origin_address="123 Origin St",
            origin_city="Origin City",
            destination_address="456 Dest Ave",
            destination_city="Dest City",
            scheduled_date=today,
            freight_cost=Decimal("800.00"),
            currency="EUR",
            client_id=client.id,
            vehicle_id=vehicle.id,
            driver_id=user.id,
            description="Electronic equipment",
            weight_kg=Decimal("1500.00"),
            quantity=Decimal("50"),
            estimated_distance_km=Decimal("450.00"),
            status=ShipmentStatus.PENDING,
            notes="Handle with care",
        )

        # Assert
        assert shipment.client_id == client.id
        assert shipment.vehicle_id == vehicle.id
        assert shipment.driver_id == user.id
        assert shipment.description == "Electronic equipment"
        assert shipment.weight_kg == Decimal("1500.00")
        assert shipment.quantity == Decimal("50")
        assert shipment.estimated_distance_km == Decimal("450.00")
        assert shipment.currency == "EUR"
        assert shipment.notes == "Handle with care"

    @pytest.mark.asyncio
    async def test_get_shipment_by_id(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test retrieving a shipment by ID"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="SHIP-003",
            origin_address="123 Origin St",
            origin_city="Origin City",
            destination_address="456 Dest Ave",
            destination_city="Dest City",
            scheduled_date=today,
        )

        # Act
        fetched = await repo.get_shipment_by_id(shipment.id, tenant.id)

        # Assert
        assert fetched is not None
        assert fetched.id == shipment.id
        assert fetched.shipment_number == "SHIP-003"

    @pytest.mark.asyncio
    async def test_get_shipment_by_id_wrong_tenant(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test that shipment cannot be accessed with wrong tenant_id"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="SHIP-004",
            origin_address="123 Origin St",
            origin_city="Origin City",
            destination_address="456 Dest Ave",
            destination_city="Dest City",
            scheduled_date=today,
        )
        wrong_tenant_id = uuid4()

        # Act
        fetched = await repo.get_shipment_by_id(shipment.id, wrong_tenant_id)

        # Assert
        assert fetched is None

    @pytest.mark.asyncio
    async def test_get_shipments_filter_by_status(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test filtering shipments by status"""
        # Arrange
        today = date.today()
        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="PEND-1",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            status=ShipmentStatus.PENDING,
        )
        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="TRANS-1",
            origin_address="Addr3",
            origin_city="City3",
            destination_address="Addr4",
            destination_city="City4",
            scheduled_date=today,
            status=ShipmentStatus.IN_TRANSIT,
        )

        # Act
        pending, total = await repo.get_shipments(
            tenant_id=tenant.id, status=ShipmentStatus.PENDING
        )

        # Assert
        assert total == 1
        assert pending[0].status == ShipmentStatus.PENDING

    @pytest.mark.asyncio
    async def test_get_shipments_filter_by_date_range(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test filtering shipments by scheduled date range"""
        # Arrange
        today = date.today()
        tomorrow = today + timedelta(days=1)
        next_week = today + timedelta(days=7)

        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="TODAY",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )
        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="NEXTWEEK",
            origin_address="Addr3",
            origin_city="City3",
            destination_address="Addr4",
            destination_city="City4",
            scheduled_date=next_week,
        )

        # Act
        shipments, total = await repo.get_shipments(
            tenant_id=tenant.id,
            scheduled_date_from=today,
            scheduled_date_to=tomorrow,
        )

        # Assert
        assert total == 1
        assert shipments[0].shipment_number == "TODAY"

    @pytest.mark.asyncio
    async def test_get_shipments_search(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test searching shipments by number or description"""
        # Arrange
        today = date.today()
        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="SEARCH-001",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            description="Electronics",
        )
        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="OTHER-002",
            origin_address="Addr3",
            origin_city="City3",
            destination_address="Addr4",
            destination_city="City4",
            scheduled_date=today,
            description="Furniture",
        )

        # Act
        results, total = await repo.get_shipments(
            tenant_id=tenant.id, search="SEARCH"
        )

        # Assert
        assert total == 1
        assert results[0].shipment_number == "SEARCH-001"

    @pytest.mark.asyncio
    async def test_update_shipment(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test updating shipment fields"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="UPDATE-1",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            freight_cost=Decimal("500.00"),
        )

        # Act
        updated = await repo.update_shipment(
            shipment_id=shipment.id,
            tenant_id=tenant.id,
            freight_cost=Decimal("600.00"),
            actual_distance_km=Decimal("350.00"),
        )

        # Assert
        assert updated is not None
        assert updated.freight_cost == Decimal("600.00")
        assert updated.actual_distance_km == Decimal("350.00")

    @pytest.mark.asyncio
    async def test_update_shipment_status(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test updating shipment status with automatic date setting"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="STATUS-1",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            status=ShipmentStatus.PENDING,
        )

        # Act - Change to IN_TRANSIT
        updated = await repo.update_shipment_status(
            shipment_id=shipment.id,
            tenant_id=tenant.id,
            new_status=ShipmentStatus.IN_TRANSIT,
        )

        # Assert
        assert updated is not None
        assert updated.status == ShipmentStatus.IN_TRANSIT
        assert updated.pickup_date == today

        # Act - Change to DELIVERED
        delivered = await repo.update_shipment_status(
            shipment_id=shipment.id,
            tenant_id=tenant.id,
            new_status=ShipmentStatus.DELIVERED,
        )

        # Assert
        assert delivered.status == ShipmentStatus.DELIVERED
        assert delivered.delivery_date == today

    @pytest.mark.asyncio
    async def test_delete_shipment(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test soft deleting a shipment"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="DELETE-1",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )

        # Act
        deleted = await repo.delete_shipment(shipment.id, tenant.id)

        # Assert
        assert deleted is True

        # Verify shipment is soft deleted
        fetched = await repo.get_shipment_by_id(shipment.id, tenant.id)
        assert fetched is None

    @pytest.mark.asyncio
    async def test_get_shipment_summary(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test shipment summary statistics"""
        # Arrange
        today = date.today()
        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="SUM-1",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            freight_cost=Decimal("1000.00"),
            status=ShipmentStatus.PENDING,
            actual_distance_km=Decimal("100.00"),
        )
        await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="SUM-2",
            origin_address="Addr3",
            origin_city="City3",
            destination_address="Addr4",
            destination_city="City4",
            scheduled_date=today,
            freight_cost=Decimal("1500.00"),
            status=ShipmentStatus.DELIVERED,
            actual_distance_km=Decimal("200.00"),
        )

        # Act
        summary = await repo.get_shipment_summary(tenant.id)

        # Assert
        assert summary["total_shipments"] == 2
        assert summary["pending_shipments"] == 1
        assert summary["delivered_shipments"] == 1
        assert summary["total_revenue"] == Decimal("2500.00")
        assert summary["total_distance_km"] == Decimal("300.00")


# ========================================================================
# SHIPMENT EXPENSE TESTS
# ========================================================================


class TestShipmentExpenseOperations:
    """Test suite for shipment expense CRUD operations"""

    @pytest.mark.asyncio
    async def test_create_shipment_expense(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating a shipment expense"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="EXP-1",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )

        # Act
        expense = await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.FUEL,
            amount=Decimal("150.00"),
            expense_date=today,
            description="Gas station refill",
            location="Highway Station",
        )

        # Assert
        assert expense.id is not None
        assert expense.tenant_id == tenant.id
        assert expense.shipment_id == shipment.id
        assert expense.expense_type == ExpenseType.FUEL
        assert expense.amount == Decimal("150.00")
        assert expense.currency == "USD"
        assert expense.description == "Gas station refill"

    @pytest.mark.asyncio
    async def test_get_shipment_expenses(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test retrieving all expenses for a shipment"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="EXP-2",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )

        await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.FUEL,
            amount=Decimal("100.00"),
            expense_date=today,
        )
        await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.TOLL,
            amount=Decimal("25.00"),
            expense_date=today,
        )

        # Act
        expenses = await repo.get_shipment_expenses(shipment.id, tenant.id)

        # Assert
        assert len(expenses) == 2
        expense_types = [e.expense_type for e in expenses]
        assert ExpenseType.FUEL in expense_types
        assert ExpenseType.TOLL in expense_types

    @pytest.mark.asyncio
    async def test_update_shipment_expense(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test updating a shipment expense"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="EXP-3",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )
        expense = await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.FUEL,
            amount=Decimal("100.00"),
            expense_date=today,
        )

        # Act
        updated = await repo.update_shipment_expense(
            expense_id=expense.id,
            shipment_id=shipment.id,
            tenant_id=tenant.id,
            amount=Decimal("120.00"),
            description="Updated amount",
        )

        # Assert
        assert updated is not None
        assert updated.amount == Decimal("120.00")
        assert updated.description == "Updated amount"

    @pytest.mark.asyncio
    async def test_delete_shipment_expense(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test soft deleting a shipment expense"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="EXP-4",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )
        expense = await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.FUEL,
            amount=Decimal("100.00"),
            expense_date=today,
        )

        # Act
        deleted = await repo.delete_shipment_expense(
            expense_id=expense.id,
            shipment_id=shipment.id,
            tenant_id=tenant.id,
        )

        # Assert
        assert deleted is True

        # Verify expense is soft deleted
        expenses = await repo.get_shipment_expenses(shipment.id, tenant.id)
        assert len(expenses) == 0

    @pytest.mark.asyncio
    async def test_shipment_summary_includes_expenses(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test that shipment summary correctly calculates net profit with expenses"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="PROFIT-1",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            freight_cost=Decimal("1000.00"),
            status=ShipmentStatus.DELIVERED,
        )

        await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.FUEL,
            amount=Decimal("200.00"),
            expense_date=today,
        )
        await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.TOLL,
            amount=Decimal("50.00"),
            expense_date=today,
        )

        # Act
        summary = await repo.get_shipment_summary(tenant.id)

        # Assert
        assert summary["total_revenue"] == Decimal("1000.00")
        assert summary["total_expenses"] == Decimal("250.00")
        assert summary["net_profit"] == Decimal("750.00")
