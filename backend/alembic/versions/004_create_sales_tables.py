"""Add quotes and quote_items tables for Sales & Quotes module

Revision ID: 004
Revises: 003
Create Date: 2025-11-08 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create sale_status enum
    op.execute("CREATE TYPE sale_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired')")

    # Create quotes table
    op.create_table(
        'quotes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sales_rep_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quote_number', sa.String(50), nullable=False, unique=True),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('status', postgresql.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', name='sale_status'), nullable=False, server_default='draft'),
        sa.Column('valid_until', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sales_rep_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create indexes for quotes
    op.create_index('ix_quotes_tenant_id', 'quotes', ['tenant_id'])
    op.create_index('ix_quotes_client_id', 'quotes', ['client_id'])
    op.create_index('ix_quotes_sales_rep_id', 'quotes', ['sales_rep_id'])
    op.create_index('ix_quotes_quote_number', 'quotes', ['quote_number'])
    op.create_index('ix_quotes_status', 'quotes', ['status'])
    op.create_index('ix_quotes_valid_until', 'quotes', ['valid_until'])
    op.create_index('ix_quotes_is_deleted', 'quotes', ['is_deleted'])

    # Create quote_items table
    op.create_table(
        'quote_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quote_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Numeric(10, 2), nullable=False),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='CASCADE'),
    )

    # Create indexes for quote_items
    op.create_index('ix_quote_items_tenant_id', 'quote_items', ['tenant_id'])
    op.create_index('ix_quote_items_quote_id', 'quote_items', ['quote_id'])
    op.create_index('ix_quote_items_is_deleted', 'quote_items', ['is_deleted'])

    # Add check constraint for discount_percent (0-100)
    op.create_check_constraint(
        'ck_quote_items_discount_percent',
        'quote_items',
        'discount_percent >= 0 AND discount_percent <= 100'
    )


def downgrade() -> None:
    # Drop tables
    op.drop_table('quote_items')
    op.drop_table('quotes')

    # Drop enum
    op.execute('DROP TYPE sale_status')
