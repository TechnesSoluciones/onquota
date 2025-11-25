"""
Advanced unit tests for Transport module
Tests edge cases, boundary values, and error handling
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


@pytest.fixture
async def tenant(db_session: AsyncSession) -> Tenant:
    """Create a test tenant"""
    tenant = Tenant(
        id=uuid4(),
        name="Advanced Test Company",
        subdomain="advanced-test",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest.fixture
async def user(db_session: AsyncSession, tenant: Tenant) -> User:
    """Create a test user"""
    user = User(
        id=uuid4(),
        tenant_id=tenant.id,
        email="advanced@test.com",
        username="advanced_user",
        hashed_password="hashed",
        role="user",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def repo(db_session: AsyncSession) -> TransportRepository:
    """Create repository instance"""
    return TransportRepository(db_session)


class TestVehicleEdgeCases:
    """Test suite for vehicle edge cases and boundary values"""

    @pytest.mark.asyncio
    async def test_vehicle_with_zero_capacity(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating vehicle with zero capacity (valid edge case)"""
        # Arrange & Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="ZERO-CAP",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
            capacity_kg=Decimal("0.00"),
        )

        # Assert
        assert vehicle.capacity_kg == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_vehicle_with_very_large_capacity(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating vehicle with very large capacity"""
        # Arrange & Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="LARGE-CAP",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
            capacity_kg=Decimal("999999.99"),
        )

        # Assert
        assert vehicle.capacity_kg == Decimal("999999.99")

    @pytest.mark.asyncio
    async def test_vehicle_with_high_mileage(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating vehicle with extremely high mileage"""
        # Arrange & Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="HIGH-MILEAGE",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
            mileage_km=Decimal("999999.99"),
        )

        # Assert
        assert vehicle.mileage_km == Decimal("999999.99")

    @pytest.mark.asyncio
    async def test_vehicle_plate_with_special_characters(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test vehicle plate number with various formats"""
        # Arrange
        special_plates = [
            "ABC-1234",
            "ABC 1234",
            "ABC1234",
            "1234ABC",
            "ABC-1234-XYZ",
        ]

        # Act & Assert
        for plate in special_plates:
            vehicle = await repo.create_vehicle(
                tenant_id=tenant.id,
                plate_number=plate,
                brand="Test",
                model="Model",
                vehicle_type=VehicleType.TRUCK,
            )
            assert vehicle.plate_number == plate

    @pytest.mark.asyncio
    async def test_vehicle_long_notes_field(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test vehicle with very long notes"""
        # Arrange
        long_notes = "A" * 1000  # 1000 character notes

        # Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="LONG-NOTES",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
            notes=long_notes,
        )

        # Assert
        assert vehicle.notes == long_notes

    @pytest.mark.asyncio
    async def test_vehicle_unicode_brand_model(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test vehicle with unicode characters in brand/model"""
        # Arrange & Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="UNICODE",
            brand="日本製造",  # Japanese characters
            model="Ñiño",  # Spanish characters
            vehicle_type=VehicleType.TRUCK,
        )

        # Assert
        assert vehicle.brand == "日本製造"
        assert vehicle.model == "Ñiño"

    @pytest.mark.asyncio
    async def test_update_vehicle_partial_fields(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test updating only specific vehicle fields"""
        # Arrange
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="PARTIAL-UPDATE",
            brand="OldBrand",
            model="OldModel",
            vehicle_type=VehicleType.TRUCK,
            mileage_km=Decimal("1000.00"),
            notes="Old notes",
        )

        # Act
        updated = await repo.update_vehicle(
            vehicle_id=vehicle.id,
            tenant_id=tenant.id,
            mileage_km=Decimal("2000.00"),
        )

        # Assert
        assert updated.mileage_km == Decimal("2000.00")
        assert updated.brand == "OldBrand"  # Unchanged
        assert updated.notes == "Old notes"  # Unchanged

    @pytest.mark.asyncio
    async def test_vehicle_multiple_status_transitions(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test transitioning vehicle through multiple statuses"""
        # Arrange
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="STATUS-TRANS",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
            status=VehicleStatus.ACTIVE,
        )

        # Act & Assert - Test status transitions
        status_sequence = [
            VehicleStatus.MAINTENANCE,
            VehicleStatus.INACTIVE,
            VehicleStatus.ACTIVE,
        ]

        for status in status_sequence:
            updated = await repo.update_vehicle(
                vehicle_id=vehicle.id,
                tenant_id=tenant.id,
                status=status,
            )
            assert updated.status == status

    @pytest.mark.asyncio
    async def test_vehicle_maintenance_date_edge_cases(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test vehicle with past and future maintenance dates"""
        # Arrange
        today = date.today()
        past_date = today - timedelta(days=365)
        future_date = today + timedelta(days=365)

        # Act
        vehicle = await repo.create_vehicle(
            tenant_id=tenant.id,
            plate_number="MAINT-DATES",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
            last_maintenance_date=past_date,
            next_maintenance_date=future_date,
        )

        # Assert
        assert vehicle.last_maintenance_date == past_date
        assert vehicle.next_maintenance_date == future_date


class TestShipmentEdgeCases:
    """Test suite for shipment edge cases"""

    @pytest.mark.asyncio
    async def test_shipment_with_zero_freight_cost(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating shipment with zero freight cost"""
        # Arrange & Act
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="ZERO-COST",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            freight_cost=Decimal("0.00"),
        )

        # Assert
        assert shipment.freight_cost == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_shipment_with_large_freight_cost(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating shipment with very large freight cost"""
        # Arrange & Act
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="LARGE-COST",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            freight_cost=Decimal("999999.99"),
        )

        # Assert
        assert shipment.freight_cost == Decimal("999999.99")

    @pytest.mark.asyncio
    async def test_shipment_past_scheduled_date(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating shipment with past scheduled date"""
        # Arrange & Act
        past_date = date.today() - timedelta(days=10)
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="PAST-DATE",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=past_date,
        )

        # Assert
        assert shipment.scheduled_date == past_date

    @pytest.mark.asyncio
    async def test_shipment_all_statuses(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating shipments with all possible statuses"""
        # Arrange
        today = date.today()
        statuses = [
            ShipmentStatus.PENDING,
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.DELIVERED,
            ShipmentStatus.CANCELLED,
        ]

        # Act & Assert
        for idx, status in enumerate(statuses):
            shipment = await repo.create_shipment(
                tenant_id=tenant.id,
                shipment_number=f"STATUS-{idx}",
                origin_address="Addr1",
                origin_city="City1",
                destination_address="Addr2",
                destination_city="City2",
                scheduled_date=today,
                status=status,
            )
            assert shipment.status == status

    @pytest.mark.asyncio
    async def test_shipment_with_large_weight_and_quantity(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test shipment with extreme weight and quantity values"""
        # Arrange
        today = date.today()

        # Act
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="LARGE-WEIGHT",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            weight_kg=Decimal("999999.99"),
            quantity=Decimal("999999.99"),
        )

        # Assert
        assert shipment.weight_kg == Decimal("999999.99")
        assert shipment.quantity == Decimal("999999.99")

    @pytest.mark.asyncio
    async def test_shipment_filter_by_distance_range(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test filtering shipments by distance range"""
        # Arrange
        today = date.today()
        distances = [
            (Decimal("10.00"), "CLOSE"),
            (Decimal("100.00"), "MEDIUM"),
            (Decimal("1000.00"), "FAR"),
        ]

        for distance, num in distances:
            await repo.create_shipment(
                tenant_id=tenant.id,
                shipment_number=num,
                origin_address="Addr1",
                origin_city="City1",
                destination_address="Addr2",
                destination_city="City2",
                scheduled_date=today,
                estimated_distance_km=distance,
            )

        # Act - Get all and verify
        all_shipments, total = await repo.get_shipments(tenant_id=tenant.id)

        # Assert
        assert total == 3
        distances_found = sorted(
            [s.estimated_distance_km for s in all_shipments]
        )
        assert distances_found == [
            Decimal("10.00"),
            Decimal("100.00"),
            Decimal("1000.00"),
        ]

    @pytest.mark.asyncio
    async def test_shipment_long_description(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test shipment with very long description"""
        # Arrange
        today = date.today()
        long_description = "A" * 2000  # 2000 character description

        # Act
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="LONG-DESC",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            description=long_description,
        )

        # Assert
        assert shipment.description == long_description


class TestExpenseEdgeCases:
    """Test suite for expense edge cases"""

    @pytest.mark.asyncio
    async def test_shipment_expense_zero_amount(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating expense with zero amount"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="EXP-ZERO",
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
            amount=Decimal("0.00"),
            expense_date=today,
        )

        # Assert
        assert expense.amount == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_shipment_all_expense_types(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test creating expenses for all possible types"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="EXP-TYPES",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )

        expense_types = [
            ExpenseType.FUEL,
            ExpenseType.TOLL,
            ExpenseType.MAINTENANCE,
            ExpenseType.OTHER,
        ]

        # Act & Assert
        for idx, exp_type in enumerate(expense_types):
            expense = await repo.create_shipment_expense(
                tenant_id=tenant.id,
                shipment_id=shipment.id,
                expense_type=exp_type,
                amount=Decimal("100.00"),
                expense_date=today,
            )
            assert expense.expense_type == exp_type

    @pytest.mark.asyncio
    async def test_multiple_expenses_same_shipment(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test multiple expenses on same shipment"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="MULTI-EXP",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )

        # Act - Create 10 expenses
        for i in range(10):
            await repo.create_shipment_expense(
                tenant_id=tenant.id,
                shipment_id=shipment.id,
                expense_type=ExpenseType.FUEL,
                amount=Decimal(f"{i * 10}.00"),
                expense_date=today,
            )

        # Assert
        expenses = await repo.get_shipment_expenses(shipment.id, tenant.id)
        assert len(expenses) == 10

    @pytest.mark.asyncio
    async def test_expense_amounts_calculation(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test that multiple expenses are correctly summed"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="EXPENSE-CALC",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            freight_cost=Decimal("1000.00"),
        )

        expense_amounts = [
            Decimal("100.00"),
            Decimal("250.50"),
            Decimal("75.25"),
        ]

        # Act
        for amount in expense_amounts:
            await repo.create_shipment_expense(
                tenant_id=tenant.id,
                shipment_id=shipment.id,
                expense_type=ExpenseType.FUEL,
                amount=amount,
                expense_date=today,
            )

        expenses = await repo.get_shipment_expenses(shipment.id, tenant.id)

        # Assert
        total_expenses = sum(e.amount for e in expenses)
        expected_total = sum(expense_amounts)
        assert total_expenses == expected_total
        assert total_expenses == Decimal("425.75")

    @pytest.mark.asyncio
    async def test_expense_currency_handling(
        self, repo: TransportRepository, tenant: Tenant
    ):
        """Test expenses with different currency values"""
        # Arrange
        today = date.today()
        shipment = await repo.create_shipment(
            tenant_id=tenant.id,
            shipment_number="CURRENCY",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
            currency="EUR",
        )

        # Act
        expense = await repo.create_shipment_expense(
            tenant_id=tenant.id,
            shipment_id=shipment.id,
            expense_type=ExpenseType.FUEL,
            amount=Decimal("100.00"),
            expense_date=today,
            currency="EUR",
        )

        # Assert
        assert expense.currency == "EUR"
        assert shipment.currency == "EUR"


class TestTenantIsolation:
    """Test suite for multi-tenant data isolation"""

    @pytest.mark.asyncio
    async def test_vehicle_not_accessible_across_tenants(
        self, repo: TransportRepository, db_session: AsyncSession
    ):
        """Test that vehicle created in one tenant is not visible to another"""
        # Arrange
        tenant1 = Tenant(id=uuid4(), name="Tenant1", subdomain="tenant1")
        tenant2 = Tenant(id=uuid4(), name="Tenant2", subdomain="tenant2")
        db_session.add(tenant1)
        db_session.add(tenant2)
        await db_session.commit()

        # Create vehicle in tenant1
        vehicle = await repo.create_vehicle(
            tenant_id=tenant1.id,
            plate_number="ISOLATED",
            brand="Test",
            model="Model",
            vehicle_type=VehicleType.TRUCK,
        )

        # Act - Try to access from tenant2
        fetched = await repo.get_vehicle_by_id(vehicle.id, tenant2.id)

        # Assert
        assert fetched is None

    @pytest.mark.asyncio
    async def test_shipment_not_accessible_across_tenants(
        self, repo: TransportRepository, db_session: AsyncSession
    ):
        """Test that shipment created in one tenant is not visible to another"""
        # Arrange
        tenant1 = Tenant(id=uuid4(), name="Tenant1", subdomain="tenant1")
        tenant2 = Tenant(id=uuid4(), name="Tenant2", subdomain="tenant2")
        db_session.add(tenant1)
        db_session.add(tenant2)
        await db_session.commit()

        today = date.today()

        # Create shipment in tenant1
        shipment = await repo.create_shipment(
            tenant_id=tenant1.id,
            shipment_number="ISOLATED",
            origin_address="Addr1",
            origin_city="City1",
            destination_address="Addr2",
            destination_city="City2",
            scheduled_date=today,
        )

        # Act - Try to access from tenant2
        fetched = await repo.get_shipment_by_id(shipment.id, tenant2.id)

        # Assert
        assert fetched is None

    @pytest.mark.asyncio
    async def test_multiple_tenants_independent_data(
        self, repo: TransportRepository, db_session: AsyncSession
    ):
        """Test that multiple tenants maintain separate data"""
        # Arrange
        tenant1 = Tenant(id=uuid4(), name="Tenant1", subdomain="tenant1")
        tenant2 = Tenant(id=uuid4(), name="Tenant2", subdomain="tenant2")
        db_session.add(tenant1)
        db_session.add(tenant2)
        await db_session.commit()

        # Create 5 vehicles in tenant1
        for i in range(5):
            await repo.create_vehicle(
                tenant_id=tenant1.id,
                plate_number=f"T1-PLATE-{i}",
                brand="Test",
                model="Model",
                vehicle_type=VehicleType.TRUCK,
            )

        # Create 3 vehicles in tenant2
        for i in range(3):
            await repo.create_vehicle(
                tenant_id=tenant2.id,
                plate_number=f"T2-PLATE-{i}",
                brand="Test",
                model="Model",
                vehicle_type=VehicleType.TRUCK,
            )

        # Act
        tenant1_vehicles, tenant1_count = await repo.get_vehicles(
            tenant_id=tenant1.id
        )
        tenant2_vehicles, tenant2_count = await repo.get_vehicles(
            tenant_id=tenant2.id
        )

        # Assert
        assert tenant1_count == 5
        assert tenant2_count == 3
