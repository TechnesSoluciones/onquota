"""create sales module tables

Revision ID: 016
Revises: 015
Create Date: 2025-11-30

This migration creates the complete Sales module with three sub-modules:
1. Quotations Registry
2. Sales Controls (Purchase Orders)
3. Quota Tracking

Tables created:
- quotations
- sales_controls
- sales_control_lines (for quota tracking integration)
- sales_product_lines (catalog)
- quotas
- quota_lines

ENUMs created:
- quote_status
- sales_control_status
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================
    # 1. CREATE ENUMS
    # ============================================

    # QuoteStatus ENUM - Create in database
    postgresql.ENUM(
        'cotizado',
        'ganado',
        'perdido',
        'ganado_parcialmente',
        name='quote_status',
        create_type=True
    ).create(op.get_bind())

    # QuoteStatus ENUM object for table definition (create_type=False to avoid duplicate)
    quote_status_enum = postgresql.ENUM(
        'cotizado',
        'ganado',
        'perdido',
        'ganado_parcialmente',
        name='quote_status',
        create_type=False
    )

    # SalesControlStatus ENUM - Create in database
    postgresql.ENUM(
        'pending',
        'in_production',
        'delivered',
        'invoiced',
        'paid',
        'cancelled',
        name='sales_control_status',
        create_type=True
    ).create(op.get_bind())

    # SalesControlStatus ENUM object for table definition (create_type=False to avoid duplicate)
    sales_control_status_enum = postgresql.ENUM(
        'pending',
        'in_production',
        'delivered',
        'invoiced',
        'paid',
        'cancelled',
        name='sales_control_status',
        create_type=False
    )

    # ============================================
    # 2. CREATE QUOTATIONS TABLE
    # ============================================

    op.create_table(
        'quotations',
        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Quote Identification
        sa.Column('quote_number', sa.String(100), nullable=False),
        sa.Column('quote_date', sa.Date, nullable=False),

        # Relationships
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=False),

        # Denormalized fields for performance
        sa.Column('client_name', sa.String(255), nullable=True),
        sa.Column('sales_rep_name', sa.String(255), nullable=True),

        # Financial
        sa.Column('quoted_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),

        # Status
        sa.Column('status', quote_status_enum, nullable=False, server_default='cotizado'),

        # Additional Information
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('products_description', sa.Text, nullable=True),

        # Win/Loss tracking
        sa.Column('won_date', sa.Date, nullable=True),
        sa.Column('lost_date', sa.Date, nullable=True),
        sa.Column('lost_reason', sa.String(500), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='CASCADE'),

        # Unique Constraints
        sa.UniqueConstraint('tenant_id', 'quote_number', name='uk_quotations_tenant_quote_number'),

        # Check Constraints
        sa.CheckConstraint('quoted_amount >= 0', name='chk_quotations_amount_positive'),
    )

    # Indexes for quotations
    op.create_index('idx_quotations_tenant_id', 'quotations', ['tenant_id'])
    op.create_index('idx_quotations_client_id', 'quotations', ['client_id'])
    op.create_index('idx_quotations_opportunity_id', 'quotations', ['opportunity_id'])
    op.create_index('idx_quotations_assigned_to', 'quotations', ['assigned_to'])
    op.create_index('idx_quotations_status', 'quotations', ['status'])
    op.create_index('idx_quotations_quote_date', 'quotations', [sa.text('quote_date DESC')])
    op.create_index('idx_quotations_tenant_status', 'quotations', ['tenant_id', 'status'])
    op.create_index('idx_quotations_tenant_client', 'quotations', ['tenant_id', 'client_id'])
    op.create_index('idx_quotations_tenant_date', 'quotations', ['tenant_id', sa.text('quote_date DESC')])
    op.create_index('idx_quotations_not_deleted', 'quotations', ['tenant_id'], postgresql_where=sa.text('is_deleted = false'))

    # ============================================
    # 3. CREATE SALES_CONTROLS TABLE
    # ============================================

    op.create_table(
        'sales_controls',
        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Control Identification
        sa.Column('folio_number', sa.String(50), nullable=False),
        sa.Column('client_po_number', sa.String(100), nullable=True),

        # Dates
        sa.Column('po_reception_date', sa.Date, nullable=False),
        sa.Column('system_entry_date', sa.Date, nullable=False),
        sa.Column('promise_date', sa.Date, nullable=False),
        sa.Column('actual_delivery_date', sa.Date, nullable=True),

        # Lead time calculation
        sa.Column('lead_time_days', sa.Integer, nullable=True),

        # Relationships
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quotation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=False),

        # Denormalized fields for performance
        sa.Column('client_name', sa.String(255), nullable=True),
        sa.Column('sales_rep_name', sa.String(255), nullable=True),

        # Financial
        sa.Column('sales_control_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),

        # Status
        sa.Column('status', sales_control_status_enum, nullable=False, server_default='pending'),

        # Additional Information
        sa.Column('concept', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),

        # Invoice tracking
        sa.Column('invoice_number', sa.String(100), nullable=True),
        sa.Column('invoice_date', sa.Date, nullable=True),
        sa.Column('payment_date', sa.Date, nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='CASCADE'),

        # Unique Constraints
        sa.UniqueConstraint('tenant_id', 'folio_number', name='uk_sales_controls_tenant_folio'),

        # Check Constraints
        sa.CheckConstraint('sales_control_amount >= 0', name='chk_sales_controls_amount_positive'),
    )

    # Indexes for sales_controls
    op.create_index('idx_sales_controls_tenant_id', 'sales_controls', ['tenant_id'])
    op.create_index('idx_sales_controls_client_id', 'sales_controls', ['client_id'])
    op.create_index('idx_sales_controls_quotation_id', 'sales_controls', ['quotation_id'])
    op.create_index('idx_sales_controls_assigned_to', 'sales_controls', ['assigned_to'])
    op.create_index('idx_sales_controls_status', 'sales_controls', ['status'])
    op.create_index('idx_sales_controls_po_date', 'sales_controls', [sa.text('po_reception_date DESC')])
    op.create_index('idx_sales_controls_promise_date', 'sales_controls', ['promise_date'])
    op.create_index('idx_sales_controls_tenant_status', 'sales_controls', ['tenant_id', 'status'])
    op.create_index('idx_sales_controls_tenant_client', 'sales_controls', ['tenant_id', 'client_id'])
    op.create_index('idx_sales_controls_tenant_date', 'sales_controls', ['tenant_id', sa.text('po_reception_date DESC')])
    op.create_index('idx_sales_controls_not_deleted', 'sales_controls', ['tenant_id'], postgresql_where=sa.text('is_deleted = false'))

    # ============================================
    # 4. CREATE SALES_PRODUCT_LINES TABLE (Catalog)
    # ============================================

    op.create_table(
        'sales_product_lines',
        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Product Line Information
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(50), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('color', sa.String(20), nullable=True),  # Hex color for UI
        sa.Column('display_order', sa.Integer, nullable=False, server_default='0'),

        # Status
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),

        # Unique Constraints
        sa.UniqueConstraint('tenant_id', 'name', name='uk_product_lines_tenant_name'),
    )

    # Indexes for sales_product_lines
    op.create_index('idx_sales_product_lines_tenant_id', 'sales_product_lines', ['tenant_id'])
    op.create_index('idx_sales_product_lines_active', 'sales_product_lines', ['tenant_id', 'is_active'])
    op.create_index('idx_sales_product_lines_order', 'sales_product_lines', ['tenant_id', 'display_order'])

    # ============================================
    # 5. CREATE QUOTAS TABLE
    # ============================================

    op.create_table(
        'quotas',
        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Period (year and month)
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('month', sa.Integer, nullable=False),

        # Relationship to user (sales rep)
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Denormalized field for performance
        sa.Column('user_name', sa.String(255), nullable=True),

        # Totals (aggregated from quota_lines)
        sa.Column('total_quota', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('total_achieved', sa.Numeric(15, 2), nullable=False, server_default='0'),

        # Calculated percentage
        sa.Column('achievement_percentage', sa.Numeric(5, 2), nullable=False, server_default='0'),

        # Notes
        sa.Column('notes', sa.Text, nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),

        # Unique Constraints
        sa.UniqueConstraint('tenant_id', 'user_id', 'year', 'month', name='uk_quotas_tenant_user_period'),

        # Check Constraints
        sa.CheckConstraint('month >= 1 AND month <= 12', name='chk_quotas_month_valid'),
        sa.CheckConstraint('year >= 2000 AND year <= 2100', name='chk_quotas_year_valid'),
        sa.CheckConstraint('total_quota >= 0', name='chk_quotas_total_quota_positive'),
        sa.CheckConstraint('total_achieved >= 0', name='chk_quotas_total_achieved_positive'),
    )

    # Indexes for quotas
    op.create_index('idx_quotas_tenant_id', 'quotas', ['tenant_id'])
    op.create_index('idx_quotas_user_id', 'quotas', ['user_id'])
    op.create_index('idx_quotas_period', 'quotas', ['year', 'month'])
    op.create_index('idx_quotas_tenant_user', 'quotas', ['tenant_id', 'user_id'])
    op.create_index('idx_quotas_tenant_period', 'quotas', ['tenant_id', 'year', 'month'])
    op.create_index('idx_quotas_not_deleted', 'quotas', ['tenant_id'], postgresql_where=sa.text('is_deleted = false'))

    # ============================================
    # 6. CREATE QUOTA_LINES TABLE
    # ============================================

    op.create_table(
        'quota_lines',
        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Relationships
        sa.Column('quota_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_line_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Denormalized field for performance
        sa.Column('product_line_name', sa.String(200), nullable=True),

        # Amounts
        sa.Column('quota_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('achieved_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),

        # Calculated percentage
        sa.Column('achievement_percentage', sa.Numeric(5, 2), nullable=False, server_default='0'),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['quota_id'], ['quotas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_line_id'], ['sales_product_lines.id'], ondelete='CASCADE'),

        # Unique Constraints
        sa.UniqueConstraint('quota_id', 'product_line_id', name='uk_quota_lines_quota_product'),

        # Check Constraints
        sa.CheckConstraint('quota_amount >= 0', name='chk_quota_lines_quota_positive'),
        sa.CheckConstraint('achieved_amount >= 0', name='chk_quota_lines_achieved_positive'),
    )

    # Indexes for quota_lines
    op.create_index('idx_quota_lines_tenant_id', 'quota_lines', ['tenant_id'])
    op.create_index('idx_quota_lines_quota_id', 'quota_lines', ['quota_id'])
    op.create_index('idx_quota_lines_product_line_id', 'quota_lines', ['product_line_id'])

    # ============================================
    # 7. CREATE SALES_CONTROL_LINES TABLE
    # ============================================

    op.create_table(
        'sales_control_lines',
        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Relationships
        sa.Column('sales_control_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_line_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Denormalized field for performance
        sa.Column('product_line_name', sa.String(200), nullable=True),

        # Amount for this product line
        sa.Column('line_amount', sa.Numeric(15, 2), nullable=False),

        # Description
        sa.Column('description', sa.Text, nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sales_control_id'], ['sales_controls.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_line_id'], ['sales_product_lines.id'], ondelete='CASCADE'),

        # Check Constraints
        sa.CheckConstraint('line_amount >= 0', name='chk_sales_control_lines_amount_positive'),
    )

    # Indexes for sales_control_lines
    op.create_index('idx_sales_control_lines_tenant_id', 'sales_control_lines', ['tenant_id'])
    op.create_index('idx_sales_control_lines_control_id', 'sales_control_lines', ['sales_control_id'])
    op.create_index('idx_sales_control_lines_product_line_id', 'sales_control_lines', ['product_line_id'])


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign key dependencies)
    op.drop_table('sales_control_lines')
    op.drop_table('quota_lines')
    op.drop_table('quotas')
    op.drop_table('sales_product_lines')
    op.drop_table('sales_controls')
    op.drop_table('quotations')

    # Drop ENUMs
    op.execute('DROP TYPE IF EXISTS sales_control_status')
    op.execute('DROP TYPE IF EXISTS quote_status')
