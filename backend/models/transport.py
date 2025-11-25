"""
Transport Models
Database models for transport/shipment management
"""
from sqlalchemy import Column, String, Numeric, ForeignKey, Text, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import date
from enum import Enum as PyEnum
import uuid

from models.base import BaseModel


class VehicleType(str, PyEnum):
    """Vehicle type enumeration"""

    CAR = "car"
    VAN = "van"
    TRUCK = "truck"
    MOTORCYCLE = "motorcycle"
    OTHER = "other"


class VehicleStatus(str, PyEnum):
    """Vehicle status enumeration"""

    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"


class ShipmentStatus(str, PyEnum):
    """Shipment status enumeration"""

    PENDING = "pending"  # Created, not started
    IN_TRANSIT = "in_transit"  # En ruta
    DELIVERED = "delivered"  # Entregado
    CANCELLED = "cancelled"  # Cancelado


class ExpenseType(str, PyEnum):
    """Shipment expense type"""

    FUEL = "fuel"  # Combustible
    TOLL = "toll"  # Peajes
    PARKING = "parking"  # Estacionamiento
    MAINTENANCE = "maintenance"  # Mantenimiento
    OTHER = "other"  # Otros


class Vehicle(BaseModel):
    """
    Vehicle Model
    Represents a vehicle in the fleet
    """

    __tablename__ = "vehicles"

    # Multi-tenancy
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)

    # Basic Information
    plate_number = Column(
        String(20), nullable=False, index=True, comment="License plate number"
    )
    brand = Column(String(100), nullable=False, comment="Vehicle brand (e.g., Toyota)")
    model = Column(String(100), nullable=False, comment="Vehicle model")
    year = Column(String(4), nullable=True, comment="Manufacturing year")
    vehicle_type = Column(
        SQLEnum(VehicleType),
        nullable=False,
        default=VehicleType.CAR,
        comment="Type of vehicle",
    )

    # Status and Assignment
    status = Column(
        SQLEnum(VehicleStatus),
        nullable=False,
        default=VehicleStatus.ACTIVE,
        index=True,
        comment="Current status",
    )
    assigned_driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Assigned driver user_id",
    )

    # Specifications
    capacity_kg = Column(
        Numeric(10, 2), nullable=True, comment="Load capacity in kilograms"
    )
    fuel_type = Column(String(50), nullable=True, comment="Fuel type (Gasolina, Diesel, Eléctrico)")
    fuel_efficiency_km_l = Column(
        Numeric(5, 2), nullable=True, comment="Fuel efficiency in km per liter"
    )

    # Maintenance
    last_maintenance_date = Column(Date, nullable=True, comment="Last maintenance date")
    next_maintenance_date = Column(
        Date, nullable=True, comment="Next scheduled maintenance"
    )
    mileage_km = Column(Numeric(10, 2), nullable=True, comment="Current mileage in km")

    # Notes
    notes = Column(Text, nullable=True, comment="Additional notes")

    # Relationships
    driver = relationship("User", foreign_keys=[assigned_driver_id])
    shipments = relationship("Shipment", back_populates="vehicle")

    def __repr__(self):
        return f"<Vehicle {self.plate_number} - {self.brand} {self.model}>"


class Shipment(BaseModel):
    """
    Shipment Model
    Represents a freight/shipment delivery
    """

    __tablename__ = "shipments"

    # Multi-tenancy
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)

    # Shipment Information
    shipment_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique shipment number",
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=True,
        comment="Client receiving the shipment",
    )
    vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id"),
        nullable=True,
        comment="Assigned vehicle",
    )
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Assigned driver",
    )

    # Locations
    origin_address = Column(String(255), nullable=False, comment="Origin address")
    origin_city = Column(String(100), nullable=False, comment="Origin city")
    destination_address = Column(
        String(255), nullable=False, comment="Destination address"
    )
    destination_city = Column(String(100), nullable=False, comment="Destination city")

    # Dates
    scheduled_date = Column(
        Date, nullable=False, comment="Scheduled pickup/delivery date"
    )
    pickup_date = Column(Date, nullable=True, comment="Actual pickup date")
    delivery_date = Column(Date, nullable=True, comment="Actual delivery date")

    # Cargo Details
    description = Column(Text, nullable=True, comment="Cargo description")
    weight_kg = Column(Numeric(10, 2), nullable=True, comment="Weight in kg")
    quantity = Column(Numeric(10, 2), nullable=True, comment="Quantity of items")

    # Costs
    estimated_distance_km = Column(
        Numeric(10, 2), nullable=True, comment="Estimated distance in km"
    )
    actual_distance_km = Column(
        Numeric(10, 2), nullable=True, comment="Actual distance traveled"
    )
    freight_cost = Column(
        Numeric(12, 2), nullable=False, default=0, comment="Freight cost charged"
    )
    currency = Column(String(3), nullable=False, default="USD", comment="Currency")

    # Status
    status = Column(
        SQLEnum(ShipmentStatus),
        nullable=False,
        default=ShipmentStatus.PENDING,
        index=True,
        comment="Current status",
    )

    # Notes
    notes = Column(Text, nullable=True, comment="Additional notes")

    # Relationships
    client = relationship("Client", foreign_keys=[client_id])
    vehicle = relationship("Vehicle", back_populates="shipments")
    driver = relationship("User", foreign_keys=[driver_id])
    expenses = relationship("ShipmentExpense", back_populates="shipment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Shipment {self.shipment_number} - {self.status.value}>"


class ShipmentExpense(BaseModel):
    """
    Shipment Expense Model
    Represents expenses related to a shipment (fuel, tolls, etc.)
    """

    __tablename__ = "shipment_expenses"

    # Multi-tenancy
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)

    # Relationships
    shipment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("shipments.id"),
        nullable=False,
        index=True,
        comment="Related shipment",
    )

    # Expense Details
    expense_type = Column(
        SQLEnum(ExpenseType),
        nullable=False,
        comment="Type of expense",
    )
    amount = Column(Numeric(10, 2), nullable=False, comment="Expense amount")
    currency = Column(String(3), nullable=False, default="USD", comment="Currency")
    expense_date = Column(Date, nullable=False, comment="Date of expense")

    # Details
    description = Column(Text, nullable=True, comment="Expense description")
    location = Column(String(255), nullable=True, comment="Location where expense occurred")
    receipt_url = Column(String(500), nullable=True, comment="URL to receipt/invoice")

    # Relationships
    shipment = relationship("Shipment", back_populates="expenses")

    def __repr__(self):
        return f"<ShipmentExpense {self.expense_type.value} - {self.amount}>"
