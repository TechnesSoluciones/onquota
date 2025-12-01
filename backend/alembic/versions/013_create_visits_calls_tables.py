"""create visits and calls tables

Revision ID: 013
Revises: 012
Create Date: 2025-11-17 06:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create visits and calls tables for customer interaction tracking

    Features:
    - Visits with GPS check-in/check-out
    - Phone calls with duration tracking
    - Status management
    - Multi-tenancy support
    """

    # Create VisitStatus enum
    # Create visit_status enum type in database
    postgresql.ENUM(
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        name='visit_status',
        create_type=True
    ).create(op.get_bind(), checkfirst=True)

    # Create ENUM object for table definition (create_type=False to avoid duplicate)
    visit_status_enum = postgresql.ENUM(
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        name='visit_status',
        create_type=False
    )

    # Create CallType enum
    # Create call_type enum type in database
    postgresql.ENUM(
        'incoming',
        'outgoing',
        'missed',
        name='call_type',
        create_type=True
    ).create(op.get_bind(), checkfirst=True)

    # Create ENUM object for table definition (create_type=False to avoid duplicate)
    call_type_enum = postgresql.ENUM(
        'incoming',
        'outgoing',
        'missed',
        name='call_type',
        create_type=False
    )

    # Create CallStatus enum
    # Create call_status enum type in database
    postgresql.ENUM(
        'scheduled',
        'completed',
        'no_answer',
        'voicemail',
        'cancelled',
        name='call_status',
        create_type=True
    ).create(op.get_bind(), checkfirst=True)

    # Create ENUM object for table definition (create_type=False to avoid duplicate)
    call_status_enum = postgresql.ENUM(
        'scheduled',
        'completed',
        'no_answer',
        'voicemail',
        'cancelled',
        name='call_status',
        create_type=False
    )

    # Create visits table
    op.create_table(
        'visits',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # User (Sales Rep)
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_name', sa.String(200), nullable=True),

        # Client
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('client_name', sa.String(200), nullable=True),

        # Visit Details
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('status', visit_status_enum, nullable=False, server_default='scheduled', index=True),

        # Schedule
        sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('duration_minutes', sa.Numeric(10, 2), nullable=True),

        # Check-in (GPS)
        sa.Column('check_in_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('check_in_latitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('check_in_longitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('check_in_address', sa.String(500), nullable=True),

        # Check-out (GPS)
        sa.Column('check_out_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('check_out_latitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('check_out_longitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('check_out_address', sa.String(500), nullable=True),

        # Outcome
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('outcome', sa.String(200), nullable=True),
        sa.Column('follow_up_required', sa.Boolean, server_default='false'),
        sa.Column('follow_up_date', sa.DateTime(timezone=True), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('is_deleted', sa.Boolean, server_default='false', index=True),
    )

    # Create calls table
    op.create_table(
        'calls',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # User (Sales Rep)
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_name', sa.String(200), nullable=True),

        # Client
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('client_name', sa.String(200), nullable=True),
        sa.Column('phone_number', sa.String(50), nullable=True),

        # Call Details
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('call_type', call_type_enum, nullable=False, index=True),
        sa.Column('status', call_status_enum, nullable=False, server_default='scheduled', index=True),

        # Schedule
        sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=True, index=True),

        # Call Time
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Numeric(10, 2), nullable=True),

        # Outcome
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('outcome', sa.String(200), nullable=True),
        sa.Column('follow_up_required', sa.Boolean, server_default='false'),
        sa.Column('follow_up_date', sa.DateTime(timezone=True), nullable=True),

        # Recording
        sa.Column('recording_url', sa.String(500), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('is_deleted', sa.Boolean, server_default='false', index=True),
    )

    # Create indexes for visits
    op.create_index('idx_visits_tenant_user', 'visits', ['tenant_id', 'user_id'])
    op.create_index('idx_visits_tenant_client', 'visits', ['tenant_id', 'client_id'])
    op.create_index('idx_visits_tenant_status', 'visits', ['tenant_id', 'status'])
    op.create_index('idx_visits_scheduled_date_desc', 'visits', ['scheduled_date'], postgresql_ops={'scheduled_date': 'DESC'})

    # Create indexes for calls
    op.create_index('idx_calls_tenant_user', 'calls', ['tenant_id', 'user_id'])
    op.create_index('idx_calls_tenant_client', 'calls', ['tenant_id', 'client_id'])
    op.create_index('idx_calls_tenant_type', 'calls', ['tenant_id', 'call_type'])
    op.create_index('idx_calls_tenant_status', 'calls', ['tenant_id', 'status'])
    op.create_index('idx_calls_created_at_desc', 'calls', ['created_at'], postgresql_ops={'created_at': 'DESC'})


def downgrade() -> None:
    """Drop visits and calls tables"""

    # Drop indexes
    op.drop_index('idx_calls_created_at_desc', table_name='calls')
    op.drop_index('idx_calls_tenant_status', table_name='calls')
    op.drop_index('idx_calls_tenant_type', table_name='calls')
    op.drop_index('idx_calls_tenant_client', table_name='calls')
    op.drop_index('idx_calls_tenant_user', table_name='calls')

    op.drop_index('idx_visits_scheduled_date_desc', table_name='visits')
    op.drop_index('idx_visits_tenant_status', table_name='visits')
    op.drop_index('idx_visits_tenant_client', table_name='visits')
    op.drop_index('idx_visits_tenant_user', table_name='visits')

    # Drop tables
    op.drop_table('calls')
    op.drop_table('visits')

    # Drop enums
    sa.Enum(name='call_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='call_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='visit_status').drop(op.get_bind(), checkfirst=True)
