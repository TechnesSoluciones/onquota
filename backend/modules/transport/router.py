"""
Transport Router
API endpoints for vehicle and shipment management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional

from core.database import get_db
from api.dependencies import get_current_user
from models.user import User
from models.transport import VehicleType, VehicleStatus, ShipmentStatus, ExpenseType
from modules.transport.repository import TransportRepository
from modules.transport.schemas import (
    # Vehicle schemas
    VehicleCreate,
    VehicleUpdate,
    VehicleResponse,
    VehicleListResponse,
    VehicleSummary,
    # Shipment schemas
    ShipmentCreate,
    ShipmentUpdate,
    ShipmentResponse,
    ShipmentWithExpenses,
    ShipmentListResponse,
    ShipmentSummary,
    # Expense schemas
    ShipmentExpenseCreate,
    ShipmentExpenseUpdate,
    ShipmentExpenseResponse,
)

router = APIRouter(prefix="/transport", tags=["Transport"])


# ============================================================================
# VEHICLE ENDPOINTS
# ============================================================================


@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new vehicle

    Creates a vehicle in the fleet management system.
    """
    repo = TransportRepository(db)

    vehicle = await repo.create_vehicle(
        tenant_id=current_user.tenant_id,
        **vehicle_data.model_dump(),
    )

    await db.commit()

    # Build response
    response = VehicleResponse(
        id=vehicle.id,
        tenant_id=vehicle.tenant_id,
        plate_number=vehicle.plate_number,
        brand=vehicle.brand,
        model=vehicle.model,
        year=vehicle.year,
        vehicle_type=vehicle.vehicle_type,
        status=vehicle.status,
        assigned_driver_id=vehicle.assigned_driver_id,
        capacity_kg=vehicle.capacity_kg,
        fuel_type=vehicle.fuel_type,
        fuel_efficiency_km_l=vehicle.fuel_efficiency_km_l,
        last_maintenance_date=vehicle.last_maintenance_date,
        next_maintenance_date=vehicle.next_maintenance_date,
        mileage_km=vehicle.mileage_km,
        notes=vehicle.notes,
        driver_name=vehicle.driver.name if vehicle.driver else None,
        shipment_count=0,
        created_at=vehicle.created_at.isoformat(),
        updated_at=vehicle.updated_at.isoformat(),
    )

    return response


@router.get("/vehicles", response_model=VehicleListResponse)
async def list_vehicles(
    status: Optional[VehicleStatus] = Query(None, description="Filter by status"),
    vehicle_type: Optional[VehicleType] = Query(None, description="Filter by vehicle type"),
    assigned_driver_id: Optional[UUID] = Query(None, description="Filter by assigned driver"),
    search: Optional[str] = Query(None, description="Search in plate_number, brand, model"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List vehicles with filters and pagination

    Returns a paginated list of vehicles in the fleet.
    """
    repo = TransportRepository(db)

    vehicles, total = await repo.get_vehicles(
        tenant_id=current_user.tenant_id,
        status=status,
        vehicle_type=vehicle_type,
        assigned_driver_id=assigned_driver_id,
        search=search,
        page=page,
        page_size=page_size,
    )

    # Build response
    vehicles_response = []
    for v in vehicles:
        vehicles_response.append(
            VehicleResponse(
                id=v.id,
                tenant_id=v.tenant_id,
                plate_number=v.plate_number,
                brand=v.brand,
                model=v.model,
                year=v.year,
                vehicle_type=v.vehicle_type,
                status=v.status,
                assigned_driver_id=v.assigned_driver_id,
                capacity_kg=v.capacity_kg,
                fuel_type=v.fuel_type,
                fuel_efficiency_km_l=v.fuel_efficiency_km_l,
                last_maintenance_date=v.last_maintenance_date,
                next_maintenance_date=v.next_maintenance_date,
                mileage_km=v.mileage_km,
                notes=v.notes,
                driver_name=v.driver.name if v.driver else None,
                shipment_count=len(v.shipments) if hasattr(v, "shipments") else 0,
                created_at=v.created_at.isoformat(),
                updated_at=v.updated_at.isoformat(),
            )
        )

    total_pages = (total + page_size - 1) // page_size

    return VehicleListResponse(
        vehicles=vehicles_response,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get vehicle by ID

    Returns detailed information about a specific vehicle.
    """
    repo = TransportRepository(db)

    vehicle = await repo.get_vehicle_by_id(
        vehicle_id=vehicle_id,
        tenant_id=current_user.tenant_id,
        include_driver=True,
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    return VehicleResponse(
        id=vehicle.id,
        tenant_id=vehicle.tenant_id,
        plate_number=vehicle.plate_number,
        brand=vehicle.brand,
        model=vehicle.model,
        year=vehicle.year,
        vehicle_type=vehicle.vehicle_type,
        status=vehicle.status,
        assigned_driver_id=vehicle.assigned_driver_id,
        capacity_kg=vehicle.capacity_kg,
        fuel_type=vehicle.fuel_type,
        fuel_efficiency_km_l=vehicle.fuel_efficiency_km_l,
        last_maintenance_date=vehicle.last_maintenance_date,
        next_maintenance_date=vehicle.next_maintenance_date,
        mileage_km=vehicle.mileage_km,
        notes=vehicle.notes,
        driver_name=vehicle.driver.name if vehicle.driver else None,
        shipment_count=len(vehicle.shipments) if hasattr(vehicle, "shipments") else 0,
        created_at=vehicle.created_at.isoformat(),
        updated_at=vehicle.updated_at.isoformat(),
    )


@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: UUID,
    vehicle_data: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update vehicle

    Updates an existing vehicle. Only provided fields will be updated.
    """
    repo = TransportRepository(db)

    # Only pass non-None values
    update_data = {k: v for k, v in vehicle_data.model_dump().items() if v is not None}

    vehicle = await repo.update_vehicle(
        vehicle_id=vehicle_id,
        tenant_id=current_user.tenant_id,
        **update_data,
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    await db.commit()

    # Reload with relationships
    vehicle = await repo.get_vehicle_by_id(
        vehicle_id=vehicle.id,
        tenant_id=current_user.tenant_id,
        include_driver=True,
    )

    return VehicleResponse(
        id=vehicle.id,
        tenant_id=vehicle.tenant_id,
        plate_number=vehicle.plate_number,
        brand=vehicle.brand,
        model=vehicle.model,
        year=vehicle.year,
        vehicle_type=vehicle.vehicle_type,
        status=vehicle.status,
        assigned_driver_id=vehicle.assigned_driver_id,
        capacity_kg=vehicle.capacity_kg,
        fuel_type=vehicle.fuel_type,
        fuel_efficiency_km_l=vehicle.fuel_efficiency_km_l,
        last_maintenance_date=vehicle.last_maintenance_date,
        next_maintenance_date=vehicle.next_maintenance_date,
        mileage_km=vehicle.mileage_km,
        notes=vehicle.notes,
        driver_name=vehicle.driver.name if vehicle.driver else None,
        shipment_count=len(vehicle.shipments) if hasattr(vehicle, "shipments") else 0,
        created_at=vehicle.created_at.isoformat(),
        updated_at=vehicle.updated_at.isoformat(),
    )


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete vehicle (soft delete)

    Marks a vehicle as deleted without removing it from the database.
    """
    repo = TransportRepository(db)

    deleted = await repo.delete_vehicle(
        vehicle_id=vehicle_id,
        tenant_id=current_user.tenant_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    await db.commit()


@router.get("/vehicles-summary", response_model=VehicleSummary)
async def get_vehicles_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get vehicle fleet summary statistics

    Returns aggregated statistics about the vehicle fleet.
    """
    repo = TransportRepository(db)
    summary_data = await repo.get_vehicle_summary(current_user.tenant_id)

    return VehicleSummary(**summary_data)


# ============================================================================
# SHIPMENT ENDPOINTS
# ============================================================================


@router.post("/shipments", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    shipment_data: ShipmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new shipment

    Creates a new freight/delivery shipment.
    """
    repo = TransportRepository(db)

    shipment = await repo.create_shipment(
        tenant_id=current_user.tenant_id,
        **shipment_data.model_dump(),
    )

    await db.commit()

    # Reload with relationships
    shipment = await repo.get_shipment_by_id(
        shipment_id=shipment.id,
        tenant_id=current_user.tenant_id,
        include_expenses=False,
        include_relations=True,
    )

    return _build_shipment_response(shipment)


@router.get("/shipments", response_model=ShipmentListResponse)
async def list_shipments(
    status: Optional[ShipmentStatus] = Query(None, description="Filter by status"),
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    vehicle_id: Optional[UUID] = Query(None, description="Filter by vehicle"),
    driver_id: Optional[UUID] = Query(None, description="Filter by driver"),
    origin_city: Optional[str] = Query(None, description="Filter by origin city"),
    destination_city: Optional[str] = Query(None, description="Filter by destination city"),
    search: Optional[str] = Query(None, description="Search in shipment_number, description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List shipments with filters and pagination

    Returns a paginated list of shipments with extensive filtering options.
    """
    repo = TransportRepository(db)

    shipments, total = await repo.get_shipments(
        tenant_id=current_user.tenant_id,
        status=status,
        client_id=client_id,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        origin_city=origin_city,
        destination_city=destination_city,
        search=search,
        page=page,
        page_size=page_size,
    )

    # Build response
    shipments_response = [_build_shipment_response(s) for s in shipments]

    total_pages = (total + page_size - 1) // page_size

    return ShipmentListResponse(
        shipments=shipments_response,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/shipments/{shipment_id}", response_model=ShipmentWithExpenses)
async def get_shipment(
    shipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get shipment by ID with expenses

    Returns detailed information about a specific shipment including all expenses.
    """
    repo = TransportRepository(db)

    shipment = await repo.get_shipment_by_id(
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
        include_expenses=True,
        include_relations=True,
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    # Build response with expenses
    base_response = _build_shipment_response(shipment)

    expenses_response = []
    for expense in shipment.expenses:
        expenses_response.append(
            ShipmentExpenseResponse(
                id=expense.id,
                tenant_id=expense.tenant_id,
                shipment_id=expense.shipment_id,
                expense_type=expense.expense_type,
                amount=expense.amount,
                currency=expense.currency,
                expense_date=expense.expense_date,
                description=expense.description,
                location=expense.location,
                receipt_url=expense.receipt_url,
                created_at=expense.created_at.isoformat(),
                updated_at=expense.updated_at.isoformat(),
            )
        )

    return ShipmentWithExpenses(
        **base_response.model_dump(),
        expenses=expenses_response,
    )


@router.put("/shipments/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: UUID,
    shipment_data: ShipmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update shipment

    Updates an existing shipment. Only provided fields will be updated.
    """
    repo = TransportRepository(db)

    # Only pass non-None values
    update_data = {k: v for k, v in shipment_data.model_dump().items() if v is not None}

    shipment = await repo.update_shipment(
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
        **update_data,
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    await db.commit()

    # Reload with relationships
    shipment = await repo.get_shipment_by_id(
        shipment_id=shipment.id,
        tenant_id=current_user.tenant_id,
        include_expenses=False,
        include_relations=True,
    )

    return _build_shipment_response(shipment)


@router.patch("/shipments/{shipment_id}/status", response_model=ShipmentResponse)
async def update_shipment_status(
    shipment_id: UUID,
    new_status: ShipmentStatus,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update shipment status

    Updates the status of a shipment. Automatically sets pickup_date or delivery_date
    based on the new status.
    """
    repo = TransportRepository(db)

    shipment = await repo.update_shipment_status(
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
        new_status=new_status,
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    await db.commit()

    # Reload with relationships
    shipment = await repo.get_shipment_by_id(
        shipment_id=shipment.id,
        tenant_id=current_user.tenant_id,
        include_expenses=False,
        include_relations=True,
    )

    return _build_shipment_response(shipment)


@router.delete("/shipments/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipment(
    shipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete shipment (soft delete)

    Marks a shipment as deleted without removing it from the database.
    """
    repo = TransportRepository(db)

    deleted = await repo.delete_shipment(
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    await db.commit()


@router.get("/shipments-summary", response_model=ShipmentSummary)
async def get_shipments_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get shipment summary statistics

    Returns aggregated statistics about shipments including revenue, expenses, and distances.
    """
    repo = TransportRepository(db)
    summary_data = await repo.get_shipment_summary(current_user.tenant_id)

    return ShipmentSummary(**summary_data)


# ============================================================================
# SHIPMENT EXPENSE ENDPOINTS
# ============================================================================


@router.post(
    "/shipments/{shipment_id}/expenses",
    response_model=ShipmentExpenseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_shipment_expense(
    shipment_id: UUID,
    expense_data: ShipmentExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a shipment expense

    Adds a new expense (fuel, toll, parking, etc.) to a shipment.
    """
    repo = TransportRepository(db)

    # Verify shipment exists
    shipment = await repo.get_shipment_by_id(
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
        include_expenses=False,
        include_relations=False,
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    expense = await repo.create_shipment_expense(
        tenant_id=current_user.tenant_id,
        shipment_id=shipment_id,
        **expense_data.model_dump(),
    )

    await db.commit()

    return ShipmentExpenseResponse(
        id=expense.id,
        tenant_id=expense.tenant_id,
        shipment_id=expense.shipment_id,
        expense_type=expense.expense_type,
        amount=expense.amount,
        currency=expense.currency,
        expense_date=expense.expense_date,
        description=expense.description,
        location=expense.location,
        receipt_url=expense.receipt_url,
        created_at=expense.created_at.isoformat(),
        updated_at=expense.updated_at.isoformat(),
    )


@router.get("/shipments/{shipment_id}/expenses", response_model=list[ShipmentExpenseResponse])
async def list_shipment_expenses(
    shipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all expenses for a shipment

    Returns all expenses associated with a specific shipment.
    """
    repo = TransportRepository(db)

    # Verify shipment exists
    shipment = await repo.get_shipment_by_id(
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
        include_expenses=False,
        include_relations=False,
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    expenses = await repo.get_shipment_expenses(
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
    )

    return [
        ShipmentExpenseResponse(
            id=expense.id,
            tenant_id=expense.tenant_id,
            shipment_id=expense.shipment_id,
            expense_type=expense.expense_type,
            amount=expense.amount,
            currency=expense.currency,
            expense_date=expense.expense_date,
            description=expense.description,
            location=expense.location,
            receipt_url=expense.receipt_url,
            created_at=expense.created_at.isoformat(),
            updated_at=expense.updated_at.isoformat(),
        )
        for expense in expenses
    ]


@router.put(
    "/shipments/{shipment_id}/expenses/{expense_id}",
    response_model=ShipmentExpenseResponse,
)
async def update_shipment_expense(
    shipment_id: UUID,
    expense_id: UUID,
    expense_data: ShipmentExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a shipment expense

    Updates an existing shipment expense. Only provided fields will be updated.
    """
    repo = TransportRepository(db)

    # Only pass non-None values
    update_data = {k: v for k, v in expense_data.model_dump().items() if v is not None}

    expense = await repo.update_shipment_expense(
        expense_id=expense_id,
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
        **update_data,
    )

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )

    await db.commit()

    return ShipmentExpenseResponse(
        id=expense.id,
        tenant_id=expense.tenant_id,
        shipment_id=expense.shipment_id,
        expense_type=expense.expense_type,
        amount=expense.amount,
        currency=expense.currency,
        expense_date=expense.expense_date,
        description=expense.description,
        location=expense.location,
        receipt_url=expense.receipt_url,
        created_at=expense.created_at.isoformat(),
        updated_at=expense.updated_at.isoformat(),
    )


@router.delete(
    "/shipments/{shipment_id}/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_shipment_expense(
    shipment_id: UUID,
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a shipment expense (soft delete)

    Marks an expense as deleted without removing it from the database.
    """
    repo = TransportRepository(db)

    deleted = await repo.delete_shipment_expense(
        expense_id=expense_id,
        shipment_id=shipment_id,
        tenant_id=current_user.tenant_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )

    await db.commit()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _build_shipment_response(shipment) -> ShipmentResponse:
    """Helper to build ShipmentResponse from shipment model"""
    from decimal import Decimal

    # Calculate total expenses if expenses are loaded
    total_expenses = Decimal("0")
    expense_count = 0
    if hasattr(shipment, "expenses") and shipment.expenses:
        total_expenses = sum(e.amount for e in shipment.expenses if not e.is_deleted)
        expense_count = len([e for e in shipment.expenses if not e.is_deleted])

    return ShipmentResponse(
        id=shipment.id,
        tenant_id=shipment.tenant_id,
        shipment_number=shipment.shipment_number,
        client_id=shipment.client_id,
        vehicle_id=shipment.vehicle_id,
        driver_id=shipment.driver_id,
        origin_address=shipment.origin_address,
        origin_city=shipment.origin_city,
        destination_address=shipment.destination_address,
        destination_city=shipment.destination_city,
        scheduled_date=shipment.scheduled_date,
        pickup_date=shipment.pickup_date,
        delivery_date=shipment.delivery_date,
        description=shipment.description,
        weight_kg=shipment.weight_kg,
        quantity=shipment.quantity,
        estimated_distance_km=shipment.estimated_distance_km,
        actual_distance_km=shipment.actual_distance_km,
        freight_cost=shipment.freight_cost,
        currency=shipment.currency,
        status=shipment.status,
        notes=shipment.notes,
        client_name=shipment.client.name if shipment.client else None,
        vehicle_plate=shipment.vehicle.plate_number if shipment.vehicle else None,
        driver_name=shipment.driver.name if shipment.driver else None,
        total_expenses=total_expenses,
        expense_count=expense_count,
        created_at=shipment.created_at.isoformat(),
        updated_at=shipment.updated_at.isoformat(),
    )
