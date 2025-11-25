"""create notifications table

Revision ID: 008_create_notifications_table
Revises: 007
Create Date: 2025-11-15 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008_create_notifications_table'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create notifications table for user alerts and system notifications

    Features:
    - In-app notifications
    - Email notification tracking
    - Read status tracking
    - Action URLs for deep linking
    - Related entity tracking
    - Multi-tenancy support
    """

    # Create NotificationType enum
    notification_type_enum = postgresql.ENUM(
        'INFO',
        'WARNING',
        'SUCCESS',
        'ERROR',
        name='notification_type',
        create_type=True
    )
    notification_type_enum.create(op.get_bind(), checkfirst=True)

    # Create NotificationCategory enum
    notification_category_enum = postgresql.ENUM(
        'SYSTEM',
        'QUOTE',
        'OPPORTUNITY',
        'MAINTENANCE',
        'PAYMENT',
        'CLIENT',
        'GENERAL',
        name='notification_category',
        create_type=True
    )
    notification_category_enum.create(op.get_bind(), checkfirst=True)

    # Create notifications table
    op.create_table(
        'notifications',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Multi-tenancy
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Recipient
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Notification Content
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.Text, nullable=False),

        # Type and Category
        sa.Column('type', notification_type_enum, nullable=False, server_default='INFO', index=True),
        sa.Column('category', notification_category_enum, nullable=False, server_default='GENERAL', index=True),

        # Action
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('action_label', sa.String(50), nullable=True),

        # Read Status
        sa.Column('is_read', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),

        # Email Tracking
        sa.Column('email_sent', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_error', sa.Text, nullable=True),

        # Related Entity
        sa.Column('related_entity_type', sa.String(50), nullable=True),
        sa.Column('related_entity_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),

        # Audit Fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create indexes for performance

    # Most common query: get user's unread notifications
    op.create_index(
        'idx_notifications_user_unread',
        'notifications',
        ['user_id', 'is_read', 'is_deleted'],
        unique=False
    )

    # Get user's notifications by type
    op.create_index(
        'idx_notifications_user_type',
        'notifications',
        ['user_id', 'type'],
        unique=False
    )

    # Get user's notifications by category
    op.create_index(
        'idx_notifications_user_category',
        'notifications',
        ['user_id', 'category'],
        unique=False
    )

    # Find notifications related to specific entities
    op.create_index(
        'idx_notifications_related_entity',
        'notifications',
        ['related_entity_type', 'related_entity_id'],
        unique=False
    )

    # Composite index for tenant-wide queries
    op.create_index(
        'idx_notifications_tenant_created',
        'notifications',
        ['tenant_id', 'created_at'],
        unique=False
    )

    # Index for cleanup queries (old read notifications)
    op.create_index(
        'idx_notifications_cleanup',
        'notifications',
        ['is_read', 'created_at'],
        unique=False,
        postgresql_where=sa.text("is_deleted = false")
    )

    # Partial index for unread notifications (most frequently queried)
    op.create_index(
        'idx_notifications_unread_only',
        'notifications',
        ['user_id', 'created_at'],
        unique=False,
        postgresql_where=sa.text("is_read = false AND is_deleted = false")
    )


def downgrade() -> None:
    """
    Drop notifications table and related objects
    """
    # Drop indexes
    op.drop_index('idx_notifications_unread_only', table_name='notifications')
    op.drop_index('idx_notifications_cleanup', table_name='notifications')
    op.drop_index('idx_notifications_tenant_created', table_name='notifications')
    op.drop_index('idx_notifications_related_entity', table_name='notifications')
    op.drop_index('idx_notifications_user_category', table_name='notifications')
    op.drop_index('idx_notifications_user_type', table_name='notifications')
    op.drop_index('idx_notifications_user_unread', table_name='notifications')

    # Drop table
    op.drop_table('notifications')

    # Drop enums
    notification_category_enum = postgresql.ENUM(
        'SYSTEM',
        'QUOTE',
        'OPPORTUNITY',
        'MAINTENANCE',
        'PAYMENT',
        'CLIENT',
        'GENERAL',
        name='notification_category'
    )
    notification_category_enum.drop(op.get_bind(), checkfirst=True)

    notification_type_enum = postgresql.ENUM(
        'INFO',
        'WARNING',
        'SUCCESS',
        'ERROR',
        name='notification_type'
    )
    notification_type_enum.drop(op.get_bind(), checkfirst=True)
