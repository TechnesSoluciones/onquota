"""
Repository for transport database operations
Handles CRUD operations for vehicles, shipments, and shipment expenses
"""
from datetime import date, datetime
from typing import Optional, List, Tuple
from uuid import UUID
from decimal import Decimal
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from models.transport import (
    Vehicle,
    VehicleType,
    VehicleStatus,
    Shipment,
    ShipmentStatus,
    ShipmentExpense,
    ExpenseType,
)
from models.user import User
from core.logging import get_logger

logger = get_logger(__name__)


class TransportRepository:
    """
    Repository for transport operations
    Implements multi-tenant data isolation for vehicles, shipments, and expenses
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # VEHICLE OPERATIONS
    # ========================================================================

    async def create_vehicle(
        self,
        tenant_id: UUID,
        plate_number: str,
        brand: str,
        model: str,
        vehicle_type: VehicleType,
        year: Optional[str] = None,
        status: VehicleStatus = VehicleStatus.ACTIVE,
        assigned_driver_id: Optional[UUID] = None,
        capacity_kg: Optional[Decimal] = None,
        fuel_type: Optional[str] = None,
        fuel_efficiency_km_l: Optional[Decimal] = None,
        last_maintenance_date: Optional[date] = None,
        next_maintenance_date: Optional[date] = None,
        mileage_km: Optional[Decimal] = None,
        notes: Optional[str] = None,
    ) -> Vehicle:
        """
        Create a new vehicle

        Args:
            tenant_id: Tenant identifier for multi-tenancy
            plate_number: License plate number
            brand: Vehicle brand
            model: Vehicle model
            vehicle_type: Type of vehicle
            year: Manufacturing year
            status: Vehicle status
            assigned_driver_id: Assigned driver user_id
            capacity_kg: Load capacity in kg
            fuel_type: Fuel type
            fuel_efficiency_km_l: Fuel efficiency
            last_maintenance_date: Last maintenance date
            next_maintenance_date: Next scheduled maintenance
            mileage_km: Current mileage
            notes: Additional notes

        Returns:
            Created Vehicle object
        """
        vehicle = Vehicle(
            tenant_id=tenant_id,
            plate_number=plate_number,
            brand=brand,
            model=model,
            year=year,
            vehicle_type=vehicle_type,
            status=status,
            assigned_driver_id=assigned_driver_id,
            capacity_kg=capacity_kg,
            fuel_type=fuel_type,
            fuel_efficiency_km_l=fuel_efficiency_km_l,
            last_maintenance_date=last_maintenance_date,
            next_maintenance_date=next_maintenance_date,
            mileage_km=mileage_km,
            notes=notes,
        )

        self.db.add(vehicle)
        await self.db.flush()
        await self.db.refresh(vehicle)

        logger.info(f"Created vehicle: {vehicle.id} - {vehicle.plate_number}")
        return vehicle

    async def get_vehicle_by_id(
        self,
        vehicle_id: UUID,
        tenant_id: UUID,
        include_driver: bool = True,
    ) -> Optional[Vehicle]:
        """
        Get vehicle by ID

        Args:
            vehicle_id: Vehicle identifier
            tenant_id: Tenant identifier
            include_driver: Whether to include driver information

        Returns:
            Vehicle object or None if not found
        """
        conditions = [
            Vehicle.id == vehicle_id,
            Vehicle.tenant_id == tenant_id,
            Vehicle.is_deleted == False,
        ]

        query = select(Vehicle).where(and_(*conditions))

        if include_driver:
            query = query.options(joinedload(Vehicle.driver))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_vehicles(
        self,
        tenant_id: UUID,
        status: Optional[VehicleStatus] = None,
        vehicle_type: Optional[VehicleType] = None,
        assigned_driver_id: Optional[UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Vehicle], int]:
        """
        List vehicles with filters and pagination

        Args:
            tenant_id: Tenant identifier
            status: Filter by status
            vehicle_type: Filter by vehicle type
            assigned_driver_id: Filter by assigned driver
            search: Search in plate_number, brand, model
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (vehicles list, total count)
        """
        conditions = [
            Vehicle.tenant_id == tenant_id,
            Vehicle.is_deleted == False,
        ]

        if status:
            conditions.append(Vehicle.status == status)

        if vehicle_type:
            conditions.append(Vehicle.vehicle_type == vehicle_type)

        if assigned_driver_id:
            conditions.append(Vehicle.assigned_driver_id == assigned_driver_id)

        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Vehicle.plate_number.ilike(search_pattern),
                    Vehicle.brand.ilike(search_pattern),
                    Vehicle.model.ilike(search_pattern),
                )
            )

        # Count query
        count_query = select(func.count()).select_from(Vehicle).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        # Data query with pagination
        offset = (page - 1) * page_size
        data_query = (
            select(Vehicle)
            .where(and_(*conditions))
            .options(joinedload(Vehicle.driver))
            .order_by(desc(Vehicle.created_at))
            .limit(page_size)
            .offset(offset)
        )

        result = await self.db.execute(data_query)
        vehicles = list(result.scalars().all())

        return vehicles, total

    async def update_vehicle(
        self,
        vehicle_id: UUID,
        tenant_id: UUID,
        **kwargs,
    ) -> Optional[Vehicle]:
        """
        Update vehicle

        Args:
            vehicle_id: Vehicle identifier
            tenant_id: Tenant identifier
            **kwargs: Fields to update

        Returns:
            Updated Vehicle object or None if not found
        """
        vehicle = await self.get_vehicle_by_id(vehicle_id, tenant_id, include_driver=False)
        if not vehicle:
            return None

        for key, value in kwargs.items():
            if hasattr(vehicle, key) and value is not None:
                setattr(vehicle, key, value)

        await self.db.flush()
        await self.db.refresh(vehicle)

        logger.info(f"Updated vehicle: {vehicle.id}")
        return vehicle

    async def delete_vehicle(
        self,
        vehicle_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Soft delete vehicle

        Args:
            vehicle_id: Vehicle identifier
            tenant_id: Tenant identifier

        Returns:
            True if deleted, False if not found
        """
        vehicle = await self.get_vehicle_by_id(vehicle_id, tenant_id, include_driver=False)
        if not vehicle:
            return False

        vehicle.is_deleted = True
        await self.db.flush()

        logger.info(f"Deleted vehicle: {vehicle.id}")
        return True

    async def get_vehicle_summary(self, tenant_id: UUID) -> dict:
        """
        Get vehicle fleet summary statistics

        Args:
            tenant_id: Tenant identifier

        Returns:
            Dictionary with summary statistics
        """
        conditions = [
            Vehicle.tenant_id == tenant_id,
            Vehicle.is_deleted == False,
        ]

        # Total vehicles by status
        query = (
            select(
                func.count(Vehicle.id).label("total"),
                func.sum(
                    func.case((Vehicle.status == VehicleStatus.ACTIVE, 1), else_=0)
                ).label("active"),
                func.sum(
                    func.case((Vehicle.status == VehicleStatus.MAINTENANCE, 1), else_=0)
                ).label("maintenance"),
                func.sum(
                    func.case((Vehicle.status == VehicleStatus.INACTIVE, 1), else_=0)
                ).label("inactive"),
                func.sum(Vehicle.capacity_kg).label("total_capacity"),
                func.avg(Vehicle.fuel_efficiency_km_l).label("avg_efficiency"),
            )
            .select_from(Vehicle)
            .where(and_(*conditions))
        )

        result = await self.db.execute(query)
        row = result.one()

        # Count vehicles needing maintenance (next_maintenance_date <= today)
        today = date.today()
        maintenance_query = select(func.count()).select_from(Vehicle).where(
            and_(
                Vehicle.tenant_id == tenant_id,
                Vehicle.is_deleted == False,
                Vehicle.next_maintenance_date <= today,
            )
        )
        maintenance_result = await self.db.execute(maintenance_query)
        needing_maintenance = maintenance_result.scalar()

        return {
            "total_vehicles": row.total or 0,
            "active_vehicles": row.active or 0,
            "in_maintenance": row.maintenance or 0,
            "inactive_vehicles": row.inactive or 0,
            "total_capacity_kg": row.total_capacity or Decimal("0"),
            "avg_fuel_efficiency": row.avg_efficiency or Decimal("0"),
            "vehicles_needing_maintenance": needing_maintenance or 0,
        }

    # ========================================================================
    # SHIPMENT OPERATIONS
    # ========================================================================

    async def create_shipment(
        self,
        tenant_id: UUID,
        shipment_number: str,
        origin_address: str,
        origin_city: str,
        destination_address: str,
        destination_city: str,
        scheduled_date: date,
        freight_cost: Decimal = Decimal("0"),
        currency: str = "USD",
        client_id: Optional[UUID] = None,
        vehicle_id: Optional[UUID] = None,
        driver_id: Optional[UUID] = None,
        pickup_date: Optional[date] = None,
        delivery_date: Optional[date] = None,
        description: Optional[str] = None,
        weight_kg: Optional[Decimal] = None,
        quantity: Optional[Decimal] = None,
        estimated_distance_km: Optional[Decimal] = None,
        actual_distance_km: Optional[Decimal] = None,
        status: ShipmentStatus = ShipmentStatus.PENDING,
        notes: Optional[str] = None,
    ) -> Shipment:
        """
        Create a new shipment

        Args:
            tenant_id: Tenant identifier
            shipment_number: Unique shipment number
            origin_address: Origin address
            origin_city: Origin city
            destination_address: Destination address
            destination_city: Destination city
            scheduled_date: Scheduled pickup/delivery date
            freight_cost: Freight cost charged
            currency: Currency code
            client_id: Client receiving the shipment
            vehicle_id: Assigned vehicle
            driver_id: Assigned driver
            pickup_date: Actual pickup date
            delivery_date: Actual delivery date
            description: Cargo description
            weight_kg: Weight in kg
            quantity: Quantity of items
            estimated_distance_km: Estimated distance
            actual_distance_km: Actual distance traveled
            status: Shipment status
            notes: Additional notes

        Returns:
            Created Shipment object
        """
        shipment = Shipment(
            tenant_id=tenant_id,
            shipment_number=shipment_number,
            client_id=client_id,
            vehicle_id=vehicle_id,
            driver_id=driver_id,
            origin_address=origin_address,
            origin_city=origin_city,
            destination_address=destination_address,
            destination_city=destination_city,
            scheduled_date=scheduled_date,
            pickup_date=pickup_date,
            delivery_date=delivery_date,
            description=description,
            weight_kg=weight_kg,
            quantity=quantity,
            estimated_distance_km=estimated_distance_km,
            actual_distance_km=actual_distance_km,
            freight_cost=freight_cost,
            currency=currency,
            status=status,
            notes=notes,
        )

        self.db.add(shipment)
        await self.db.flush()
        await self.db.refresh(shipment)

        logger.info(f"Created shipment: {shipment.id} - {shipment.shipment_number}")
        return shipment

    async def get_shipment_by_id(
        self,
        shipment_id: UUID,
        tenant_id: UUID,
        include_expenses: bool = True,
        include_relations: bool = True,
    ) -> Optional[Shipment]:
        """
        Get shipment by ID

        Args:
            shipment_id: Shipment identifier
            tenant_id: Tenant identifier
            include_expenses: Whether to include shipment expenses
            include_relations: Whether to include client, vehicle, driver

        Returns:
            Shipment object or None if not found
        """
        conditions = [
            Shipment.id == shipment_id,
            Shipment.tenant_id == tenant_id,
            Shipment.is_deleted == False,
        ]

        query = select(Shipment).where(and_(*conditions))

        if include_expenses:
            query = query.options(selectinload(Shipment.expenses))

        if include_relations:
            query = query.options(
                joinedload(Shipment.client),
                joinedload(Shipment.vehicle),
                joinedload(Shipment.driver),
            )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_shipments(
        self,
        tenant_id: UUID,
        status: Optional[ShipmentStatus] = None,
        client_id: Optional[UUID] = None,
        vehicle_id: Optional[UUID] = None,
        driver_id: Optional[UUID] = None,
        origin_city: Optional[str] = None,
        destination_city: Optional[str] = None,
        scheduled_date_from: Optional[date] = None,
        scheduled_date_to: Optional[date] = None,
        delivery_date_from: Optional[date] = None,
        delivery_date_to: Optional[date] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Shipment], int]:
        """
        List shipments with filters and pagination

        Args:
            tenant_id: Tenant identifier
            status: Filter by status
            client_id: Filter by client
            vehicle_id: Filter by vehicle
            driver_id: Filter by driver
            origin_city: Filter by origin city
            destination_city: Filter by destination city
            scheduled_date_from: Filter by scheduled date from
            scheduled_date_to: Filter by scheduled date to
            delivery_date_from: Filter by delivery date from
            delivery_date_to: Filter by delivery date to
            search: Search in shipment_number, description
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (shipments list, total count)
        """
        conditions = [
            Shipment.tenant_id == tenant_id,
            Shipment.is_deleted == False,
        ]

        if status:
            conditions.append(Shipment.status == status)

        if client_id:
            conditions.append(Shipment.client_id == client_id)

        if vehicle_id:
            conditions.append(Shipment.vehicle_id == vehicle_id)

        if driver_id:
            conditions.append(Shipment.driver_id == driver_id)

        if origin_city:
            conditions.append(Shipment.origin_city.ilike(f"%{origin_city}%"))

        if destination_city:
            conditions.append(Shipment.destination_city.ilike(f"%{destination_city}%"))

        if scheduled_date_from:
            conditions.append(Shipment.scheduled_date >= scheduled_date_from)

        if scheduled_date_to:
            conditions.append(Shipment.scheduled_date <= scheduled_date_to)

        if delivery_date_from:
            conditions.append(Shipment.delivery_date >= delivery_date_from)

        if delivery_date_to:
            conditions.append(Shipment.delivery_date <= delivery_date_to)

        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Shipment.shipment_number.ilike(search_pattern),
                    Shipment.description.ilike(search_pattern),
                )
            )

        # Count query
        count_query = select(func.count()).select_from(Shipment).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        # Data query with pagination
        offset = (page - 1) * page_size
        data_query = (
            select(Shipment)
            .where(and_(*conditions))
            .options(
                joinedload(Shipment.client),
                joinedload(Shipment.vehicle),
                joinedload(Shipment.driver),
            )
            .order_by(desc(Shipment.created_at))
            .limit(page_size)
            .offset(offset)
        )

        result = await self.db.execute(data_query)
        shipments = list(result.scalars().all())

        return shipments, total

    async def update_shipment(
        self,
        shipment_id: UUID,
        tenant_id: UUID,
        **kwargs,
    ) -> Optional[Shipment]:
        """
        Update shipment

        Args:
            shipment_id: Shipment identifier
            tenant_id: Tenant identifier
            **kwargs: Fields to update

        Returns:
            Updated Shipment object or None if not found
        """
        shipment = await self.get_shipment_by_id(
            shipment_id, tenant_id, include_expenses=False, include_relations=False
        )
        if not shipment:
            return None

        for key, value in kwargs.items():
            if hasattr(shipment, key) and value is not None:
                setattr(shipment, key, value)

        await self.db.flush()
        await self.db.refresh(shipment)

        logger.info(f"Updated shipment: {shipment.id}")
        return shipment

    async def update_shipment_status(
        self,
        shipment_id: UUID,
        tenant_id: UUID,
        new_status: ShipmentStatus,
    ) -> Optional[Shipment]:
        """
        Update shipment status with automatic date setting

        Args:
            shipment_id: Shipment identifier
            tenant_id: Tenant identifier
            new_status: New shipment status

        Returns:
            Updated Shipment object or None if not found
        """
        shipment = await self.get_shipment_by_id(
            shipment_id, tenant_id, include_expenses=False, include_relations=False
        )
        if not shipment:
            return None

        old_status = shipment.status
        shipment.status = new_status

        # Auto-set dates based on status transition
        today = date.today()
        if new_status == ShipmentStatus.IN_TRANSIT and not shipment.pickup_date:
            shipment.pickup_date = today
        elif new_status == ShipmentStatus.DELIVERED and not shipment.delivery_date:
            shipment.delivery_date = today

        await self.db.flush()
        await self.db.refresh(shipment)

        logger.info(f"Updated shipment status: {shipment.id} from {old_status} to {new_status}")
        return shipment

    async def delete_shipment(
        self,
        shipment_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Soft delete shipment

        Args:
            shipment_id: Shipment identifier
            tenant_id: Tenant identifier

        Returns:
            True if deleted, False if not found
        """
        shipment = await self.get_shipment_by_id(
            shipment_id, tenant_id, include_expenses=False, include_relations=False
        )
        if not shipment:
            return False

        shipment.is_deleted = True
        await self.db.flush()

        logger.info(f"Deleted shipment: {shipment.id}")
        return True

    async def get_shipment_summary(self, tenant_id: UUID) -> dict:
        """
        Get shipment summary statistics

        Args:
            tenant_id: Tenant identifier

        Returns:
            Dictionary with summary statistics
        """
        conditions = [
            Shipment.tenant_id == tenant_id,
            Shipment.is_deleted == False,
        ]

        # Total shipments by status
        query = (
            select(
                func.count(Shipment.id).label("total"),
                func.sum(
                    func.case((Shipment.status == ShipmentStatus.PENDING, 1), else_=0)
                ).label("pending"),
                func.sum(
                    func.case((Shipment.status == ShipmentStatus.IN_TRANSIT, 1), else_=0)
                ).label("in_transit"),
                func.sum(
                    func.case((Shipment.status == ShipmentStatus.DELIVERED, 1), else_=0)
                ).label("delivered"),
                func.sum(
                    func.case((Shipment.status == ShipmentStatus.CANCELLED, 1), else_=0)
                ).label("cancelled"),
                func.sum(Shipment.freight_cost).label("total_revenue"),
                func.avg(Shipment.actual_distance_km).label("avg_distance"),
                func.sum(Shipment.actual_distance_km).label("total_distance"),
            )
            .select_from(Shipment)
            .where(and_(*conditions))
        )

        result = await self.db.execute(query)
        row = result.one()

        # Get total expenses for shipments
        expense_query = (
            select(func.sum(ShipmentExpense.amount))
            .select_from(ShipmentExpense)
            .join(Shipment)
            .where(
                and_(
                    Shipment.tenant_id == tenant_id,
                    Shipment.is_deleted == False,
                    ShipmentExpense.is_deleted == False,
                )
            )
        )
        expense_result = await self.db.execute(expense_query)
        total_expenses = expense_result.scalar() or Decimal("0")

        revenue = row.total_revenue or Decimal("0")
        net_profit = revenue - total_expenses

        return {
            "total_shipments": row.total or 0,
            "pending_shipments": row.pending or 0,
            "in_transit_shipments": row.in_transit or 0,
            "delivered_shipments": row.delivered or 0,
            "cancelled_shipments": row.cancelled or 0,
            "total_revenue": revenue,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
            "avg_distance_km": row.avg_distance or Decimal("0"),
            "total_distance_km": row.total_distance or Decimal("0"),
        }

    # ========================================================================
    # SHIPMENT EXPENSE OPERATIONS
    # ========================================================================

    async def create_shipment_expense(
        self,
        tenant_id: UUID,
        shipment_id: UUID,
        expense_type: ExpenseType,
        amount: Decimal,
        expense_date: date,
        currency: str = "USD",
        description: Optional[str] = None,
        location: Optional[str] = None,
        receipt_url: Optional[str] = None,
    ) -> ShipmentExpense:
        """
        Create a new shipment expense

        Args:
            tenant_id: Tenant identifier
            shipment_id: Related shipment
            expense_type: Type of expense
            amount: Expense amount
            expense_date: Date of expense
            currency: Currency code
            description: Expense description
            location: Location where expense occurred
            receipt_url: URL to receipt/invoice

        Returns:
            Created ShipmentExpense object
        """
        expense = ShipmentExpense(
            tenant_id=tenant_id,
            shipment_id=shipment_id,
            expense_type=expense_type,
            amount=amount,
            currency=currency,
            expense_date=expense_date,
            description=description,
            location=location,
            receipt_url=receipt_url,
        )

        self.db.add(expense)
        await self.db.flush()
        await self.db.refresh(expense)

        logger.info(f"Created shipment expense: {expense.id} for shipment {shipment_id}")
        return expense

    async def get_shipment_expenses(
        self,
        shipment_id: UUID,
        tenant_id: UUID,
    ) -> List[ShipmentExpense]:
        """
        Get all expenses for a shipment

        Args:
            shipment_id: Shipment identifier
            tenant_id: Tenant identifier

        Returns:
            List of ShipmentExpense objects
        """
        query = (
            select(ShipmentExpense)
            .join(Shipment)
            .where(
                and_(
                    ShipmentExpense.shipment_id == shipment_id,
                    Shipment.tenant_id == tenant_id,
                    ShipmentExpense.is_deleted == False,
                )
            )
            .order_by(desc(ShipmentExpense.expense_date))
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_shipment_expense(
        self,
        expense_id: UUID,
        shipment_id: UUID,
        tenant_id: UUID,
        **kwargs,
    ) -> Optional[ShipmentExpense]:
        """
        Update shipment expense

        Args:
            expense_id: Expense identifier
            shipment_id: Shipment identifier
            tenant_id: Tenant identifier
            **kwargs: Fields to update

        Returns:
            Updated ShipmentExpense object or None if not found
        """
        query = (
            select(ShipmentExpense)
            .join(Shipment)
            .where(
                and_(
                    ShipmentExpense.id == expense_id,
                    ShipmentExpense.shipment_id == shipment_id,
                    Shipment.tenant_id == tenant_id,
                    ShipmentExpense.is_deleted == False,
                )
            )
        )

        result = await self.db.execute(query)
        expense = result.scalar_one_or_none()

        if not expense:
            return None

        for key, value in kwargs.items():
            if hasattr(expense, key) and value is not None:
                setattr(expense, key, value)

        await self.db.flush()
        await self.db.refresh(expense)

        logger.info(f"Updated shipment expense: {expense.id}")
        return expense

    async def delete_shipment_expense(
        self,
        expense_id: UUID,
        shipment_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Soft delete shipment expense

        Args:
            expense_id: Expense identifier
            shipment_id: Shipment identifier
            tenant_id: Tenant identifier

        Returns:
            True if deleted, False if not found
        """
        query = (
            select(ShipmentExpense)
            .join(Shipment)
            .where(
                and_(
                    ShipmentExpense.id == expense_id,
                    ShipmentExpense.shipment_id == shipment_id,
                    Shipment.tenant_id == tenant_id,
                    ShipmentExpense.is_deleted == False,
                )
            )
        )

        result = await self.db.execute(query)
        expense = result.scalar_one_or_none()

        if not expense:
            return False

        expense.is_deleted = True
        await self.db.flush()

        logger.info(f"Deleted shipment expense: {expense.id}")
        return True
