"""create account planner tables

Revision ID: 012
Revises: 010
Create Date: 2025-11-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '012'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create account planner tables for strategic account management

    Features:
    - Account planning with goals and timeline
    - Milestone tracking for key deliverables
    - SWOT analysis integration
    - Multi-tenancy support
    - Comprehensive audit trails
    """

    # Create PlanStatus enum
    op.execute("""
        CREATE TYPE plan_status AS ENUM (
            'draft',
            'active',
            'completed',
            'cancelled'
        )
    """)

    # Create MilestoneStatus enum
    op.execute("""
        CREATE TYPE milestone_status AS ENUM (
            'pending',
            'in_progress',
            'completed',
            'cancelled'
        )
    """)

    # Create SWOTCategory enum
    op.execute("""
        CREATE TYPE swot_category AS ENUM (
            'strength',
            'weakness',
            'opportunity',
            'threat'
        )
    """)

    # Create account_plans table
    op.create_table(
        'account_plans',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Basic Information
        sa.Column('title', sa.String(200), nullable=False, index=True),
        sa.Column('description', sa.Text, nullable=True),

        # Relationships
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Status and Timeline
        sa.Column('status', sa.Enum(
            'draft', 'active', 'completed', 'cancelled',
            name='plan_status'
        ), nullable=False, server_default='draft', index=True),
        sa.Column('start_date', sa.Date, nullable=False),
        sa.Column('end_date', sa.Date, nullable=True),

        # Financial Goals
        sa.Column('revenue_goal', sa.Numeric(15, 2), nullable=True),

        # Audit Fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    )

    # Create milestones table
    op.create_table(
        'milestones',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Basic Information
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),

        # Relationship to Plan
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Timeline
        sa.Column('due_date', sa.Date, nullable=False),
        sa.Column('completion_date', sa.Date, nullable=True),

        # Status
        sa.Column('status', sa.Enum(
            'pending', 'in_progress', 'completed', 'cancelled',
            name='milestone_status'
        ), nullable=False, server_default='pending', index=True),

        # Audit Fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['account_plans.id'], ondelete='CASCADE'),
    )

    # Create swot_items table
    op.create_table(
        'swot_items',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Relationship to Plan
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # SWOT Category
        sa.Column('category', sa.Enum(
            'strength', 'weakness', 'opportunity', 'threat',
            name='swot_category'
        ), nullable=False, index=True),

        # Content
        sa.Column('description', sa.Text, nullable=False),

        # Audit Fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['account_plans.id'], ondelete='CASCADE'),
    )

    # ========================================================================
    # Performance Indexes
    # ========================================================================

    # Account Plans indexes
    op.create_index(
        'idx_account_plans_tenant_client',
        'account_plans',
        ['tenant_id', 'client_id'],
        unique=False
    )

    op.create_index(
        'idx_account_plans_tenant_status',
        'account_plans',
        ['tenant_id', 'status'],
        unique=False
    )

    op.create_index(
        'idx_account_plans_created_by',
        'account_plans',
        ['created_by'],
        unique=False
    )

    op.create_index(
        'idx_account_plans_active',
        'account_plans',
        ['tenant_id', 'status', 'is_deleted'],
        unique=False,
        postgresql_where=sa.text("is_deleted = false AND status = 'active'")
    )

    # Milestones indexes
    op.create_index(
        'idx_milestones_plan_id',
        'milestones',
        ['plan_id'],
        unique=False
    )

    op.create_index(
        'idx_milestones_tenant_status',
        'milestones',
        ['tenant_id', 'status'],
        unique=False
    )

    op.create_index(
        'idx_milestones_due_date',
        'milestones',
        ['due_date'],
        unique=False,
        postgresql_where=sa.text("is_deleted = false AND status NOT IN ('completed', 'cancelled')")
    )

    op.create_index(
        'idx_milestones_plan_status',
        'milestones',
        ['plan_id', 'status'],
        unique=False,
        postgresql_where=sa.text("is_deleted = false")
    )

    # SWOT Items indexes
    op.create_index(
        'idx_swot_items_plan_id',
        'swot_items',
        ['plan_id'],
        unique=False
    )

    op.create_index(
        'idx_swot_items_plan_category',
        'swot_items',
        ['plan_id', 'category'],
        unique=False,
        postgresql_where=sa.text("is_deleted = false")
    )

    op.create_index(
        'idx_swot_items_tenant_category',
        'swot_items',
        ['tenant_id', 'category'],
        unique=False
    )


def downgrade() -> None:
    """
    Drop account planner tables and related objects
    """
    # Drop SWOT Items indexes
    op.drop_index('idx_swot_items_tenant_category', table_name='swot_items')
    op.drop_index('idx_swot_items_plan_category', table_name='swot_items')
    op.drop_index('idx_swot_items_plan_id', table_name='swot_items')

    # Drop Milestones indexes
    op.drop_index('idx_milestones_plan_status', table_name='milestones')
    op.drop_index('idx_milestones_due_date', table_name='milestones')
    op.drop_index('idx_milestones_tenant_status', table_name='milestones')
    op.drop_index('idx_milestones_plan_id', table_name='milestones')

    # Drop Account Plans indexes
    op.drop_index('idx_account_plans_active', table_name='account_plans')
    op.drop_index('idx_account_plans_created_by', table_name='account_plans')
    op.drop_index('idx_account_plans_tenant_status', table_name='account_plans')
    op.drop_index('idx_account_plans_tenant_client', table_name='account_plans')

    # Drop tables (in reverse order due to foreign keys)
    op.drop_table('swot_items')
    op.drop_table('milestones')
    op.drop_table('account_plans')

    # Drop enums
    op.execute('DROP TYPE swot_category')
    op.execute('DROP TYPE milestone_status')
    op.execute('DROP TYPE plan_status')
