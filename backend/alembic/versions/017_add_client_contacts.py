"""add_client_contacts

Revision ID: 017
Revises: 016
Create Date: 2025-11-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create client_contacts table
    op.create_table(
        'client_contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('position', sa.String(length=200), nullable=True, comment='Job title/position in company'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false', comment='Primary contact for this client'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_client_contacts_tenant_id', 'client_contacts', ['tenant_id'])
    op.create_index('ix_client_contacts_client_id', 'client_contacts', ['client_id'])
    op.create_index('ix_client_contacts_email', 'client_contacts', ['email'])
    op.create_index('ix_client_contacts_is_deleted', 'client_contacts', ['is_deleted'])
    op.create_index('ix_client_contacts_deleted_at', 'client_contacts', ['deleted_at'])


def downgrade() -> None:
    op.drop_index('ix_client_contacts_deleted_at', table_name='client_contacts')
    op.drop_index('ix_client_contacts_is_deleted', table_name='client_contacts')
    op.drop_index('ix_client_contacts_email', table_name='client_contacts')
    op.drop_index('ix_client_contacts_client_id', table_name='client_contacts')
    op.drop_index('ix_client_contacts_tenant_id', table_name='client_contacts')
    op.drop_table('client_contacts')
