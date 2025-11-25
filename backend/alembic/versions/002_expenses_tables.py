"""Add expenses and categories tables

Revision ID: 002
Revises: 001
Create Date: 2025-11-06 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create expense_status enum
    op.execute("CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected')")

    # Create expense_categories table
    op.create_table(
        'expense_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    )

    # Create indexes for expense_categories
    op.create_index('ix_expense_categories_tenant_id', 'expense_categories', ['tenant_id'])
    op.create_index('ix_expense_categories_is_active', 'expense_categories', ['is_active'])
    op.create_index('ix_expense_categories_is_deleted', 'expense_categories', ['is_deleted'])

    # Create expenses table
    op.create_table(
        'expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('receipt_url', sa.String(500), nullable=True),
        sa.Column('receipt_number', sa.String(100), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'rejected', name='expense_status'), nullable=False, server_default='pending'),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('vendor_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes for expenses
    op.create_index('ix_expenses_tenant_id', 'expenses', ['tenant_id'])
    op.create_index('ix_expenses_user_id', 'expenses', ['user_id'])
    op.create_index('ix_expenses_category_id', 'expenses', ['category_id'])
    op.create_index('ix_expenses_date', 'expenses', ['date'])
    op.create_index('ix_expenses_status', 'expenses', ['status'])
    op.create_index('ix_expenses_is_deleted', 'expenses', ['is_deleted'])


def downgrade() -> None:
    # Drop tables
    op.drop_table('expenses')
    op.drop_table('expense_categories')

    # Drop enums
    op.execute('DROP TYPE expense_status')
