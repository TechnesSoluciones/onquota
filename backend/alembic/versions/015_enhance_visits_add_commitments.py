"""enhance visits and add commitments module

Revision ID: 015
Revises: 014
Create Date: 2025-11-29 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '015'
down_revision = '014'
branch_label = None
depends_on = None


def upgrade() -> None:
    """
    Enhance visits module with:
    - Visit type (presencial/virtual)
    - Contact person tracking
    - Topic catalog and details
    - Visit-Opportunity relationship
    - Commitments/follow-ups module
    """

    # Create ENUM types in database
    visit_type_enum = ENUM('presencial', 'virtual', name='visit_type', create_type=False)
    visit_type_enum.create(op.get_bind(), checkfirst=True)

    commitment_type_enum = ENUM(
        'follow_up', 'send_quote', 'technical_visit', 'demo',
        'documentation', 'other',
        name='commitment_type',
        create_type=False
    )
    commitment_type_enum.create(op.get_bind(), checkfirst=True)

    commitment_priority_enum = ENUM('low', 'medium', 'high', 'urgent', name='commitment_priority', create_type=False)
    commitment_priority_enum.create(op.get_bind(), checkfirst=True)

    commitment_status_enum = ENUM(
        'pending', 'in_progress', 'completed', 'cancelled', 'overdue',
        name='commitment_status',
        create_type=False
    )
    commitment_status_enum.create(op.get_bind(), checkfirst=True)

    # ========================================================================
    # 1. Modify visits table - Add new fields
    # ========================================================================
    op.add_column('visits', sa.Column('visit_type', visit_type_enum, nullable=True))
    op.add_column('visits', sa.Column('contact_person_name', sa.String(200), nullable=True))
    op.add_column('visits', sa.Column('contact_person_role', sa.String(200), nullable=True))
    op.add_column('visits', sa.Column('general_notes', sa.Text, nullable=True))

    # Rename 'scheduled_date' to 'visit_date' for clarity (manual entry)
    op.alter_column('visits', 'scheduled_date', new_column_name='visit_date')

    # Add index for visit_type
    op.create_index('ix_visits_visit_type', 'visits', ['visit_type'])

    # ========================================================================
    # 2. Create visit_topics table (Catalog)
    # ========================================================================
    op.create_table(
        'visit_topics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
    )

    # Create indexes
    op.create_index('ix_visit_topics_tenant_id', 'visit_topics', ['tenant_id'])
    op.create_index('ix_visit_topics_is_active', 'visit_topics', ['is_active'])
    op.create_index('ix_visit_topics_tenant_active', 'visit_topics', ['tenant_id', 'is_active'])

    # ========================================================================
    # 3. Create visit_topic_details table (M2M relationship + details)
    # ========================================================================
    op.create_table(
        'visit_topic_details',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('visit_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('topic_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('details', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, default=datetime.utcnow),

        # Foreign keys
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['topic_id'], ['visit_topics.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('ix_visit_topic_details_visit_id', 'visit_topic_details', ['visit_id'])
    op.create_index('ix_visit_topic_details_topic_id', 'visit_topic_details', ['topic_id'])

    # ========================================================================
    # 4. Create visit_opportunities table (Visit-Lead relationship)
    # ========================================================================
    op.create_table(
        'visit_opportunities',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('visit_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('opportunity_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, default=datetime.utcnow),

        # Foreign keys
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('ix_visit_opportunities_visit_id', 'visit_opportunities', ['visit_id'])
    op.create_index('ix_visit_opportunities_opportunity_id', 'visit_opportunities', ['opportunity_id'])

    # Unique constraint to prevent duplicate relationships
    op.create_unique_constraint(
        'uq_visit_opportunity',
        'visit_opportunities',
        ['visit_id', 'opportunity_id']
    )

    # ========================================================================
    # 5. Create commitments table (Follow-ups and commitments)
    # ========================================================================
    op.create_table(
        'commitments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False, index=True),

        # Relationships
        sa.Column('visit_id', UUID(as_uuid=True), nullable=True, index=True),  # Optional
        sa.Column('client_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('assigned_to_user_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('created_by_user_id', UUID(as_uuid=True), nullable=False, index=True),

        # Commitment details
        sa.Column('type', commitment_type_enum, nullable=False, index=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('priority', commitment_priority_enum, nullable=False, default='medium', index=True),
        sa.Column('status', commitment_status_enum, nullable=False, default='pending', index=True),

        # Completion tracking
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completion_notes', sa.Text, nullable=True),

        # Reminders (for future email automation)
        sa.Column('reminder_sent', sa.Boolean, default=False, nullable=False),
        sa.Column('reminder_date', sa.DateTime(timezone=True), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.Column('is_deleted', sa.Boolean, default=False, nullable=False, index=True),

        # Foreign keys
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
    )

    # Create indexes for performance
    op.create_index('ix_commitments_tenant_id', 'commitments', ['tenant_id'])
    op.create_index('ix_commitments_client_id', 'commitments', ['client_id'])
    op.create_index('ix_commitments_assigned_to', 'commitments', ['assigned_to_user_id'])
    op.create_index('ix_commitments_created_by', 'commitments', ['created_by_user_id'])
    op.create_index('ix_commitments_type', 'commitments', ['type'])
    op.create_index('ix_commitments_due_date', 'commitments', ['due_date'])
    op.create_index('ix_commitments_priority', 'commitments', ['priority'])
    op.create_index('ix_commitments_status', 'commitments', ['status'])
    op.create_index('ix_commitments_is_deleted', 'commitments', ['is_deleted'])

    # Composite indexes for common queries
    op.create_index('ix_commitments_tenant_status', 'commitments', ['tenant_id', 'status', 'is_deleted'])
    op.create_index('ix_commitments_assigned_status', 'commitments', ['assigned_to_user_id', 'status', 'is_deleted'])
    op.create_index('ix_commitments_due_status', 'commitments', ['due_date', 'status'])


def downgrade() -> None:
    """Reverse the migration"""

    # Drop tables
    op.drop_table('commitments')
    op.drop_table('visit_opportunities')
    op.drop_table('visit_topic_details')
    op.drop_table('visit_topics')

    # Remove columns from visits
    op.drop_index('ix_visits_visit_type', 'visits')
    op.drop_column('visits', 'general_notes')
    op.drop_column('visits', 'contact_person_role')
    op.drop_column('visits', 'contact_person_name')
    op.drop_column('visits', 'visit_type')

    # Rename back
    op.alter_column('visits', 'visit_date', new_column_name='scheduled_date')

    # Drop ENUM types
    sa.Enum(name='commitment_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='commitment_priority').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='commitment_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='visit_type').drop(op.get_bind(), checkfirst=True)
