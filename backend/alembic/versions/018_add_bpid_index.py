"""add_bpid_index_to_clients

Revision ID: 018
Revises: 017
Create Date: 2025-11-30

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add indexes to bpid field in clients table for SPA linking performance

    Creates:
    1. Unique composite index on (tenant_id, bpid) where bpid is not null
       - Ensures BPID uniqueness per tenant
       - Allows NULL values (multiple clients without BPID)
    2. Regular index on bpid for lookup performance
    """
    # Add unique constraint on bpid (tenant-scoped uniqueness)
    # Note: We use a partial unique index to allow NULL values
    op.create_index(
        'ix_clients_bpid_unique',
        'clients',
        ['tenant_id', 'bpid'],
        unique=True,
        postgresql_where=sa.text('bpid IS NOT NULL AND is_deleted = false')
    )

    # Add regular index for lookups
    op.create_index('ix_clients_bpid', 'clients', ['bpid'])


def downgrade() -> None:
    """Remove bpid indexes"""
    op.drop_index('ix_clients_bpid', table_name='clients')
    op.drop_index('ix_clients_bpid_unique', table_name='clients')
