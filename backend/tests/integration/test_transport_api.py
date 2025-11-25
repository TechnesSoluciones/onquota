"""
Integration tests for Transport API endpoints
Tests complete workflows including request validation, authentication, and responses
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.testclient import TestClient

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


@pytest.fixture
async def test_tenant(db_session: AsyncSession) -> Tenant:
    """Create test tenant"""
    tenant = Tenant(
        id=uuid4(),
        name="API Test Company",
        subdomain="api-test",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest.fixture
async def test_user(db_session: AsyncSession, test_tenant: Tenant) -> User:
    """Create test user"""
    user = User(
        id=uuid4(),
        tenant_id=test_tenant.id,
        email="api@test.com",
        username="api_user",
        hashed_password="hashed",
        role="manager",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def api_repo(db_session: AsyncSession) -> TransportRepository:
    """Create repository for API tests"""
    return TransportRepository(db_session)


class TestTransportVehicleWorkflow:
    """Integration tests for complete vehicle management workflows"""

    @pytest.mark.asyncio
    async def test_vehicle_creation_retrieval_workflow(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test complete workflow: create vehicle -> retrieve -> verify"""
        # Arrange
        vehicle_data = {
            "plate_number": "API-VEH-001",
            "brand": "Mercedes",
            "model": "Actros",
            "vehicle_type": VehicleType.TRUCK,
            "year": "2023",
            "capacity_kg": Decimal("20000.00"),
            "fuel_type": "Diesel",
            "fuel_efficiency_km_l": Decimal("9.5"),
        }

        # Act - Create
        vehicle = await api_repo.create_vehicle(
            tenant_id=test_tenant.id,
            **vehicle_data,
        )
        vehicle_id = vehicle.id

        # Act - Retrieve
        fetched = await api_repo.get_vehicle_by_id(vehicle_id, test_tenant.id)

        # Assert
        assert fetched is not None
        assert fetched.plate_number == vehicle_data["plate_number"]
        assert fetched.brand == vehicle_data["brand"]
        assert fetched.capacity_kg == vehicle_data["capacity_kg"]

    @pytest.mark.asyncio
    async def test_vehicle_bulk_creation_retrieval(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test creating multiple vehicles and retrieving with pagination"""
        # Arrange - Create 50 vehicles
        vehicle_count = 50
        plate_numbers = []
        for i in range(vehicle_count):
            plate = f"API-BULK-{i:04d}"
            plate_numbers.append(plate)
            await api_repo.create_vehicle(
                tenant_id=test_tenant.id,
                plate_number=plate,
                brand=f"Brand{i % 5}",
                model=f"Model{i % 3}",
                vehicle_type=VehicleType.TRUCK,
            )

        # Act - Retrieve in pages
        page1, total = await api_repo.get_vehicles(
            tenant_id=test_tenant.id, page=1, page_size=20
        )
        page2, _ = await api_repo.get_vehicles(
            tenant_id=test_tenant.id, page=2, page_size=20
        )
        page3, _ = await api_repo.get_vehicles(
            tenant_id=test_tenant.id, page=3, page_size=20
        )

        # Assert
        assert total == vehicle_count
        assert len(page1) == 20
        assert len(page2) == 20
        assert len(page3) == 10
        assert total == len(page1) + len(page2) + len(page3)

    @pytest.mark.asyncio
    async def test_vehicle_search_across_fields(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test searching vehicles by different fields"""
        # Arrange
        vehicles = [
            {
                "plate": "SEARCH-001",
                "brand": "Toyota",
                "model": "Hilux",
            },
            {
                "plate": "SEARCH-002",
                "brand": "Mercedes",
                "model": "Actros",
            },
            {
                "plate": "FIND-003",
                "brand": "Ford",
                "model": "Transit",
            },
        ]

        for v in vehicles:
            await api_repo.create_vehicle(
                tenant_id=test_tenant.id,
                plate_number=v["plate"],
                brand=v["brand"],
                model=v["model"],
                vehicle_type=VehicleType.TRUCK,
            )

        # Act & Assert - Search by plate
        results, count = await api_repo.get_vehicles(
            tenant_id=test_tenant.id, search="SEARCH"
        )
        assert count == 2

        # Act & Assert - Search by brand
        results, count = await api_repo.get_vehicles(
            tenant_id=test_tenant.id, search="Mercedes"
        )
        assert count == 1
        assert results[0].brand == "Mercedes"

        # Act & Assert - Search by model
        results, count = await api_repo.get_vehicles(
            tenant_id=test_tenant.id, search="Hilux"
        )
        assert count == 1
        assert results[0].model == "Hilux"

    @pytest.mark.asyncio
    async def test_vehicle_update_workflow(
        self, api_repo: TransportRepository, test_tenant: Tenant, test_user: User
    ):
        """Test complete vehicle update workflow"""
        # Arrange - Create initial vehicle
        vehicle = await api_repo.create_vehicle(
            tenant_id=test_tenant.id,
            plate_number="UPDATE-VEH",
            brand="Initial Brand",
            model="Initial Model",
            vehicle_type=VehicleType.VAN,
            status=VehicleStatus.ACTIVE,
            mileage_km=Decimal("10000.00"),
        )

        # Act - Update multiple fields
        updated = await api_repo.update_vehicle(
            vehicle_id=vehicle.id,
            tenant_id=test_tenant.id,
            mileage_km=Decimal("15000.00"),
            status=VehicleStatus.MAINTENANCE,
            assigned_driver_id=test_user.id,
        )

        # Assert
        assert updated.mileage_km == Decimal("15000.00")
        assert updated.status == VehicleStatus.MAINTENANCE
        assert updated.assigned_driver_id == test_user.id
        assert updated.brand == "Initial Brand"  # Unchanged

    @pytest.mark.asyncio
    async def test_vehicle_deletion_workflow(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test soft deletion workflow"""
        # Arrange
        vehicle = await api_repo.create_vehicle(
            tenant_id=test_tenant.id,
            plate_number="DELETE-VEH",
            brand="Delete Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
        )
        vehicle_id = vehicle.id

        # Act - Delete
        deleted = await api_repo.delete_vehicle(vehicle_id, test_tenant.id)

        # Assert - Delete returned True
        assert deleted is True

        # Assert - Cannot retrieve after deletion
        fetched = await api_repo.get_vehicle_by_id(vehicle_id, test_tenant.id)
        assert fetched is None

        # Assert - Appears in soft delete check (if exists)
        all_vehicles, count = await api_repo.get_vehicles(
            tenant_id=test_tenant.id
        )
        vehicle_ids = [v.id for v in all_vehicles]
        assert vehicle_id not in vehicle_ids


class TestTransportShipmentWorkflow:
    """Integration tests for shipment management workflows"""

    @pytest.mark.asyncio
    async def test_shipment_creation_status_transition(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test shipment creation and status transitions"""
        # Arrange
        today = date.today()

        # Act - Create shipment
        shipment = await api_repo.create_shipment(
            tenant_id=test_tenant.id,
            shipment_number="TRANS-001",
            origin_address="123 Origin St",
            origin_city="Origin City",
            destination_address="456 Dest St",
            destination_city="Dest City",
            scheduled_date=today,
            freight_cost=Decimal("500.00"),
            status=ShipmentStatus.PENDING,
        )

        # Assert initial state
        assert shipment.status == ShipmentStatus.PENDING
        assert shipment.pickup_date is None
        assert shipment.delivery_date is None

        # Act - Transition to IN_TRANSIT
        in_transit = await api_repo.update_shipment_status(
            shipment_id=shipment.id,
            tenant_id=test_tenant.id,
            new_status=ShipmentStatus.IN_TRANSIT,
        )

        # Assert IN_TRANSIT state
        assert in_transit.status == ShipmentStatus.IN_TRANSIT
        assert in_transit.pickup_date == today

        # Act - Transition to DELIVERED
        delivered = await api_repo.update_shipment_status(
            shipment_id=shipment.id,
            tenant_id=test_tenant.id,
            new_status=ShipmentStatus.DELIVERED,
        )

        # Assert DELIVERED state
        assert delivered.status == ShipmentStatus.DELIVERED
        assert delivered.delivery_date == today

    @pytest.mark.asyncio
    async def test_shipment_with_expenses_complete_flow(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test complete shipment workflow with expenses tracking"""
        # Arrange
        today = date.today()

        # Act - Create shipment
        shipment = await api_repo.create_shipment(
            tenant_id=test_tenant.id,
            shipment_number="EXPENSE-FLOW",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            freight_cost=Decimal("1000.00"),
        )

        # Act - Add expenses
        expense1 = await api_repo.create_shipment_expense(
            tenant_id=test_tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.FUEL,
            amount=Decimal("200.00"),
            expense_date=today,
            description="Fuel",
        )

        expense2 = await api_repo.create_shipment_expense(
            tenant_id=test_tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.TOLL,
            amount=Decimal("50.00"),
            expense_date=today,
            description="Toll",
        )

        # Act - Verify expenses
        expenses = await api_repo.get_shipment_expenses(shipment.id, test_tenant.id)

        # Assert
        assert len(expenses) == 2
        total_expenses = sum(e.amount for e in expenses)
        assert total_expenses == Decimal("250.00")

    @pytest.mark.asyncio
    async def test_shipment_filtering_by_date_range(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test filtering shipments by date range"""
        # Arrange
        today = date.today()
        tomorrow = today + timedelta(days=1)
        next_week = today + timedelta(days=7)
        next_month = today + timedelta(days=30)

        # Create shipments on different dates
        for scheduled, num in [
            (today, "TODAY"),
            (tomorrow, "TOMORROW"),
            (next_week, "NEXTWEEK"),
            (next_month, "NEXTMONTH"),
        ]:
            await api_repo.create_shipment(
                tenant_id=test_tenant.id,
                shipment_number=num,
                origin_address="Addr1",
                origin_city="City1",
                destination_address="Addr2",
                destination_city="City2",
                scheduled_date=scheduled,
            )

        # Act - Query by date range
        shipments, count = await api_repo.get_shipments(
            tenant_id=test_tenant.id,
            scheduled_date_from=today,
            scheduled_date_to=tomorrow,
        )

        # Assert
        assert count == 2
        numbers = [s.shipment_number for s in shipments]
        assert "TODAY" in numbers
        assert "TOMORROW" in numbers

    @pytest.mark.asyncio
    async def test_shipment_summary_calculations(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test shipment summary with calculations"""
        # Arrange
        today = date.today()

        # Create multiple shipments with different statuses
        shipment_data = [
            {
                "number": "SUM-PENDING",
                "status": ShipmentStatus.PENDING,
                "cost": Decimal("1000.00"),
                "distance": Decimal("100.00"),
            },
            {
                "number": "SUM-TRANSIT",
                "status": ShipmentStatus.IN_TRANSIT,
                "cost": Decimal("1500.00"),
                "distance": Decimal("150.00"),
            },
            {
                "number": "SUM-DELIVERED",
                "status": ShipmentStatus.DELIVERED,
                "cost": Decimal("2000.00"),
                "distance": Decimal("200.00"),
            },
        ]

        for data in shipment_data:
            await api_repo.create_shipment(
                tenant_id=test_tenant.id,
                shipment_number=data["number"],
                origin_address="Addr1",
                origin_city="City1",
                destination_address="Addr2",
                destination_city="City2",
                scheduled_date=today,
                freight_cost=data["cost"],
                status=data["status"],
                estimated_distance_km=data["distance"],
            )

        # Act
        summary = await api_repo.get_shipment_summary(test_tenant.id)

        # Assert
        assert summary["total_shipments"] == 3
        assert summary["pending_shipments"] == 1
        assert summary["in_transit_shipments"] == 1
        assert summary["delivered_shipments"] == 1
        assert summary["total_revenue"] == Decimal("4500.00")
        assert summary["total_distance_km"] == Decimal("450.00")


class TestTransportErrorHandling:
    """Tests for error conditions and edge cases"""

    @pytest.mark.asyncio
    async def test_update_nonexistent_vehicle(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test updating non-existent vehicle returns None"""
        # Arrange
        fake_id = uuid4()

        # Act
        result = await api_repo.update_vehicle(
            vehicle_id=fake_id,
            tenant_id=test_tenant.id,
            mileage_km=Decimal("5000.00"),
        )

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent_vehicle(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test deleting non-existent vehicle returns False"""
        # Arrange
        fake_id = uuid4()

        # Act
        result = await api_repo.delete_vehicle(fake_id, test_tenant.id)

        # Assert
        assert result is False

    @pytest.mark.asyncio
    async def test_get_vehicles_empty_result(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test getting vehicles when none exist returns empty list"""
        # Act
        vehicles, count = await api_repo.get_vehicles(tenant_id=test_tenant.id)

        # Assert
        assert count == 0
        assert len(vehicles) == 0

    @pytest.mark.asyncio
    async def test_search_with_no_matches(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test search that returns no results"""
        # Arrange
        await api_repo.create_vehicle(
            tenant_id=test_tenant.id,
            plate_number="UNIQUE-123",
            brand="Toyota",
            model="Hilux",
            vehicle_type=VehicleType.TRUCK,
        )

        # Act
        results, count = await api_repo.get_vehicles(
            tenant_id=test_tenant.id, search="NONEXISTENT"
        )

        # Assert
        assert count == 0
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_update_shipment_expense_nonexistent(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test updating non-existent expense"""
        # Arrange
        today = date.today()
        shipment = await api_repo.create_shipment(
            tenant_id=test_tenant.id,
            shipment_number="EXP-MISSING",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )
        fake_expense_id = uuid4()

        # Act
        result = await api_repo.update_shipment_expense(
            expense_id=fake_expense_id,
            shipment_id=shipment.id,
            tenant_id=test_tenant.id,
            amount=Decimal("100.00"),
        )

        # Assert
        assert result is None


class TestTransportDataConsistency:
    """Tests for data consistency and relationships"""

    @pytest.mark.asyncio
    async def test_vehicle_assignment_tracking(
        self,
        api_repo: TransportRepository,
        test_tenant: Tenant,
        test_user: User,
    ):
        """Test assigning and tracking vehicle assignment"""
        # Arrange
        vehicle = await api_repo.create_vehicle(
            tenant_id=test_tenant.id,
            plate_number="ASSIGN-TEST",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
        )

        # Act - Assign driver
        updated = await api_repo.update_vehicle(
            vehicle_id=vehicle.id,
            tenant_id=test_tenant.id,
            assigned_driver_id=test_user.id,
        )

        # Assert
        assert updated.assigned_driver_id == test_user.id

        # Act - Unassign driver
        unassigned = await api_repo.update_vehicle(
            vehicle_id=vehicle.id,
            tenant_id=test_tenant.id,
            assigned_driver_id=None,
        )

        # Assert
        assert unassigned.assigned_driver_id is None

    @pytest.mark.asyncio
    async def test_shipment_status_workflow_consistency(
        self, api_repo: TransportRepository, test_tenant: Tenant
    ):
        """Test that shipment status transitions maintain consistency"""
        # Arrange
        today = date.today()
        shipment = await api_repo.create_shipment(
            tenant_id=test_tenant.id,
            shipment_number="CONSISTENCY",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )

        # Act & Assert - Verify initial state
        assert shipment.status == ShipmentStatus.PENDING
        assert shipment.pickup_date is None
        assert shipment.delivery_date is None

        # Act - Mark as in transit
        in_transit = await api_repo.update_shipment_status(
            shipment_id=shipment.id,
            tenant_id=test_tenant.id,
            new_status=ShipmentStatus.IN_TRANSIT,
        )

        # Assert - Pickup date should be set
        assert in_transit.pickup_date is not None
        assert in_transit.delivery_date is None

        # Act - Mark as delivered
        delivered = await api_repo.update_shipment_status(
            shipment_id=shipment.id,
            tenant_id=test_tenant.id,
            new_status=ShipmentStatus.DELIVERED,
        )

        # Assert - Both dates should be set
        assert delivered.pickup_date is not None
        assert delivered.delivery_date is not None
        assert delivered.pickup_date <= delivered.delivery_date
