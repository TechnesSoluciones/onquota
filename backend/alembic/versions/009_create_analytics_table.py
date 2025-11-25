"""Create analytics table

Revision ID: 009
Revises: 008_create_notifications_table
Create Date: 2025-11-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008_create_notifications_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create analysis_status enum
    op.execute("""
        CREATE TYPE analysis_status AS ENUM (
            'pending',
            'processing',
            'completed',
            'failed'
        )
    """)

    # Create file_type enum
    op.execute("""
        CREATE TYPE file_type AS ENUM (
            'csv',
            'excel'
        )
    """)

    # Create analyses table
    op.create_table(
        'analyses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_type', sa.Enum(
            'csv', 'excel',
            name='file_type'
        ), nullable=False, index=True),
        sa.Column('status', sa.Enum(
            'pending', 'processing', 'completed', 'failed',
            name='analysis_status'
        ), nullable=False, server_default='pending', index=True),
        sa.Column('row_count', sa.Integer, nullable=True),
        sa.Column('results', postgresql.JSONB, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create composite indexes for common queries
    op.create_index(
        'ix_analyses_tenant_status',
        'analyses',
        ['tenant_id', 'status'],
        unique=False
    )

    op.create_index(
        'ix_analyses_tenant_user',
        'analyses',
        ['tenant_id', 'user_id'],
        unique=False
    )

    op.create_index(
        'ix_analyses_tenant_created',
        'analyses',
        ['tenant_id', 'created_at'],
        unique=False
    )

    # Index for filtering active analyses
    op.create_index(
        'ix_analyses_active',
        'analyses',
        ['tenant_id', 'is_deleted'],
        unique=False
    )

    # Index for filtering completed analyses with results
    op.create_index(
        'ix_analyses_completed',
        'analyses',
        ['tenant_id', 'status'],
        unique=False,
        postgresql_where=sa.text("status = 'completed' AND is_deleted = false")
    )

    # GIN index for JSONB results for efficient querying
    op.execute("""
        CREATE INDEX ix_analyses_results_gin
        ON analyses USING GIN (results)
        WHERE results IS NOT NULL
    """)


def downgrade() -> None:
    # Drop indexes
    op.execute('DROP INDEX IF EXISTS ix_analyses_results_gin')
    op.drop_index('ix_analyses_completed', table_name='analyses')
    op.drop_index('ix_analyses_active', table_name='analyses')
    op.drop_index('ix_analyses_tenant_created', table_name='analyses')
    op.drop_index('ix_analyses_tenant_user', table_name='analyses')
    op.drop_index('ix_analyses_tenant_status', table_name='analyses')

    # Drop table
    op.drop_table('analyses')

    # Drop enums
    op.execute('DROP TYPE file_type')
    op.execute('DROP TYPE analysis_status')
