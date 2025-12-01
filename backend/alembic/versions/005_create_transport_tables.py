"""Add vehicles, shipments, and shipment_expenses tables for Transport module

Revision ID: 005
Revises: 004
Create Date: 2025-11-10 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create vehicle_type enum

    # Create vehicle_status enum

    # Create shipment_status enum

    # Create expense_type enum (for shipment expenses)

    # Create vehicles table
    op.create_table(
        'vehicles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plate_number', sa.String(20), nullable=False),
        sa.Column('brand', sa.String(100), nullable=False, comment='Vehicle brand (e.g., Toyota)'),
        sa.Column('model', sa.String(100), nullable=False, comment='Vehicle model'),
        sa.Column('year', sa.String(4), nullable=True, comment='Manufacturing year'),
        sa.Column(
            'vehicle_type',
            postgresql.ENUM('car', 'van', 'truck', 'motorcycle', 'other', name='vehicle_type'),
            nullable=False,
            server_default='car',
            comment='Type of vehicle'
        ),
        sa.Column(
            'status',
            postgresql.ENUM('active', 'maintenance', 'inactive', name='vehicle_status'),
            nullable=False,
            server_default='active',
            comment='Current status'
        ),
        sa.Column('assigned_driver_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Assigned driver user_id'),
        sa.Column('capacity_kg', sa.Numeric(10, 2), nullable=True, comment='Load capacity in kilograms'),
        sa.Column('fuel_type', sa.String(50), nullable=True, comment='Fuel type (Gasolina, Diesel, Eléctrico)'),
        sa.Column('fuel_efficiency_km_l', sa.Numeric(5, 2), nullable=True, comment='Fuel efficiency in km per liter'),
        sa.Column('last_maintenance_date', sa.Date(), nullable=True, comment='Last maintenance date'),
        sa.Column('next_maintenance_date', sa.Date(), nullable=True, comment='Next scheduled maintenance'),
        sa.Column('mileage_km', sa.Numeric(10, 2), nullable=True, comment='Current mileage in km'),
        sa.Column('notes', sa.Text(), nullable=True, comment='Additional notes'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_driver_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes for vehicles
    op.create_index('ix_vehicles_tenant_id', 'vehicles', ['tenant_id'])
    op.create_index('ix_vehicles_plate_number', 'vehicles', ['plate_number'])
    op.create_index('ix_vehicles_status', 'vehicles', ['status'])
    op.create_index('ix_vehicles_assigned_driver_id', 'vehicles', ['assigned_driver_id'])
    op.create_index('ix_vehicles_is_deleted', 'vehicles', ['is_deleted'])

    # Create shipments table
    op.create_table(
        'shipments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shipment_number', sa.String(50), nullable=False, unique=True, comment='Unique shipment number'),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Client receiving the shipment'),
        sa.Column('vehicle_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Assigned vehicle'),
        sa.Column('driver_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Assigned driver'),
        # Locations
        sa.Column('origin_address', sa.String(255), nullable=False, comment='Origin address'),
        sa.Column('origin_city', sa.String(100), nullable=False, comment='Origin city'),
        sa.Column('destination_address', sa.String(255), nullable=False, comment='Destination address'),
        sa.Column('destination_city', sa.String(100), nullable=False, comment='Destination city'),
        # Dates
        sa.Column('scheduled_date', sa.Date(), nullable=False, comment='Scheduled pickup/delivery date'),
        sa.Column('pickup_date', sa.Date(), nullable=True, comment='Actual pickup date'),
        sa.Column('delivery_date', sa.Date(), nullable=True, comment='Actual delivery date'),
        # Cargo Details
        sa.Column('description', sa.Text(), nullable=True, comment='Cargo description'),
        sa.Column('weight_kg', sa.Numeric(10, 2), nullable=True, comment='Weight in kg'),
        sa.Column('quantity', sa.Numeric(10, 2), nullable=True, comment='Quantity of items'),
        # Costs
        sa.Column('estimated_distance_km', sa.Numeric(10, 2), nullable=True, comment='Estimated distance in km'),
        sa.Column('actual_distance_km', sa.Numeric(10, 2), nullable=True, comment='Actual distance traveled'),
        sa.Column('freight_cost', sa.Numeric(12, 2), nullable=False, server_default='0', comment='Freight cost charged'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD', comment='Currency'),
        # Status
        sa.Column(
            'status',
            postgresql.ENUM('pending', 'in_transit', 'delivered', 'cancelled', name='shipment_status'),
            nullable=False,
            server_default='pending',
            comment='Current status'
        ),
        sa.Column('notes', sa.Text(), nullable=True, comment='Additional notes'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['driver_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes for shipments
    op.create_index('ix_shipments_tenant_id', 'shipments', ['tenant_id'])
    op.create_index('ix_shipments_shipment_number', 'shipments', ['shipment_number'])
    op.create_index('ix_shipments_client_id', 'shipments', ['client_id'])
    op.create_index('ix_shipments_vehicle_id', 'shipments', ['vehicle_id'])
    op.create_index('ix_shipments_driver_id', 'shipments', ['driver_id'])
    op.create_index('ix_shipments_status', 'shipments', ['status'])
    op.create_index('ix_shipments_scheduled_date', 'shipments', ['scheduled_date'])
    op.create_index('ix_shipments_delivery_date', 'shipments', ['delivery_date'])
    op.create_index('ix_shipments_is_deleted', 'shipments', ['is_deleted'])

    # Create shipment_expenses table
    op.create_table(
        'shipment_expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shipment_id', postgresql.UUID(as_uuid=True), nullable=False, comment='Related shipment'),
        sa.Column(
            'expense_type',
            postgresql.ENUM('fuel', 'toll', 'parking', 'maintenance', 'other', name='expense_type'),
            nullable=False,
            comment='Type of expense'
        ),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False, comment='Expense amount'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD', comment='Currency'),
        sa.Column('expense_date', sa.Date(), nullable=False, comment='Date of expense'),
        sa.Column('description', sa.Text(), nullable=True, comment='Expense description'),
        sa.Column('location', sa.String(255), nullable=True, comment='Location where expense occurred'),
        sa.Column('receipt_url', sa.String(500), nullable=True, comment='URL to receipt/invoice'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id'], ondelete='CASCADE'),
    )

    # Create indexes for shipment_expenses
    op.create_index('ix_shipment_expenses_tenant_id', 'shipment_expenses', ['tenant_id'])
    op.create_index('ix_shipment_expenses_shipment_id', 'shipment_expenses', ['shipment_id'])
    op.create_index('ix_shipment_expenses_expense_type', 'shipment_expenses', ['expense_type'])
    op.create_index('ix_shipment_expenses_expense_date', 'shipment_expenses', ['expense_date'])
    op.create_index('ix_shipment_expenses_is_deleted', 'shipment_expenses', ['is_deleted'])

    # Add check constraints
    op.create_check_constraint(
        'ck_vehicles_capacity_positive',
        'vehicles',
        'capacity_kg IS NULL OR capacity_kg >= 0'
    )

    op.create_check_constraint(
        'ck_vehicles_fuel_efficiency_positive',
        'vehicles',
        'fuel_efficiency_km_l IS NULL OR fuel_efficiency_km_l >= 0'
    )

    op.create_check_constraint(
        'ck_vehicles_mileage_positive',
        'vehicles',
        'mileage_km IS NULL OR mileage_km >= 0'
    )

    op.create_check_constraint(
        'ck_shipments_weight_positive',
        'shipments',
        'weight_kg IS NULL OR weight_kg >= 0'
    )

    op.create_check_constraint(
        'ck_shipments_quantity_positive',
        'shipments',
        'quantity IS NULL OR quantity >= 0'
    )

    op.create_check_constraint(
        'ck_shipments_distance_positive',
        'shipments',
        '(estimated_distance_km IS NULL OR estimated_distance_km >= 0) AND (actual_distance_km IS NULL OR actual_distance_km >= 0)'
    )

    op.create_check_constraint(
        'ck_shipments_freight_cost_positive',
        'shipments',
        'freight_cost >= 0'
    )

    op.create_check_constraint(
        'ck_shipment_expenses_amount_positive',
        'shipment_expenses',
        'amount >= 0'
    )


def downgrade() -> None:
    # Drop tables
    op.drop_table('shipment_expenses')
    op.drop_table('shipments')
    op.drop_table('vehicles')

    # Drop enums
    op.execute('DROP TYPE expense_type')
    op.execute('DROP TYPE shipment_status')
    op.execute('DROP TYPE vehicle_status')
    op.execute('DROP TYPE vehicle_type')
