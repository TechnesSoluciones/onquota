"""create lta table

Revision ID: 019
Revises: 018
Create Date: 2025-12-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create lta_agreements table
    op.create_table(
        'lta_agreements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bpid', sa.String(50), nullable=True),
        sa.Column('agreement_number', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='RESTRICT'),
    )

    # Create indexes
    op.create_index('ix_lta_agreements_tenant_id', 'lta_agreements', ['tenant_id'])
    op.create_index('ix_lta_agreements_client_id', 'lta_agreements', ['client_id'])
    op.create_index('ix_lta_agreements_bpid', 'lta_agreements', ['bpid'])
    op.create_index('ix_lta_agreements_agreement_number', 'lta_agreements', ['agreement_number'])
    op.create_index('ix_lta_agreements_is_active', 'lta_agreements', ['is_active'])
    op.create_index('ix_lta_agreements_deleted_at', 'lta_agreements', ['deleted_at'])

    # Create unique constraints
    op.create_unique_constraint('uq_lta_client', 'lta_agreements', ['client_id'])
    op.create_unique_constraint('uq_lta_agreement_number', 'lta_agreements', ['agreement_number'])


def downgrade() -> None:
    op.drop_table('lta_agreements')
