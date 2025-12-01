"""create opportunities table

Revision ID: 010
Revises: 009
Create Date: 2025-11-15 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create opportunities table for sales pipeline management

    Features:
    - Sales opportunity tracking
    - Pipeline stage management
    - Weighted value calculations
    - Client and user relationships
    - Multi-tenancy support
    """

    # Create OpportunityStage enum
    

    # Create opportunities table
    op.create_table(
        'opportunities',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Basic Information
        sa.Column('name', sa.String(200), nullable=False, index=True),
        sa.Column('description', sa.Text, nullable=True),

        # Relationships
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Sales Information
        sa.Column('estimated_value', sa.Numeric(15, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('probability', sa.Numeric(5, 2), nullable=False),  # 0-100
        sa.Column('expected_close_date', sa.Date, nullable=True),
        sa.Column('actual_close_date', sa.Date, nullable=True),

        # Status Tracking
        sa.Column('stage', sa.Enum(
            'LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST',
            name='opportunity_stage'
        ), nullable=False, server_default='LEAD', index=True),
        sa.Column('loss_reason', sa.String(500), nullable=True),

        # Audit Fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes for performance
    op.create_index(
        'idx_opportunities_tenant_stage',
        'opportunities',
        ['tenant_id', 'stage'],
        unique=False
    )

    op.create_index(
        'idx_opportunities_assigned_stage',
        'opportunities',
        ['assigned_to', 'stage'],
        unique=False
    )

    op.create_index(
        'idx_opportunities_client_id',
        'opportunities',
        ['client_id'],
        unique=False
    )

    op.create_index(
        'idx_opportunities_expected_close_date',
        'opportunities',
        ['expected_close_date'],
        unique=False,
        postgresql_where=sa.text("is_deleted = false AND stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')")
    )

    # Composite index for common queries (tenant + assigned + not deleted)
    op.create_index(
        'idx_opportunities_tenant_assigned_active',
        'opportunities',
        ['tenant_id', 'assigned_to', 'is_deleted'],
        unique=False
    )


def downgrade() -> None:
    """
    Drop opportunities table and related objects
    """
    # Drop indexes
    op.drop_index('idx_opportunities_tenant_assigned_active', table_name='opportunities')
    op.drop_index('idx_opportunities_expected_close_date', table_name='opportunities')
    op.drop_index('idx_opportunities_client_id', table_name='opportunities')
    op.drop_index('idx_opportunities_assigned_stage', table_name='opportunities')
    op.drop_index('idx_opportunities_tenant_stage', table_name='opportunities')

    # Drop table
    op.drop_table('opportunities')

    # Drop enum
    op.execute('DROP TYPE opportunity_stage')
