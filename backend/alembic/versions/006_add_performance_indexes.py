"""add performance indexes

Revision ID: 006
Revises: 005
Create Date: 2025-11-14

PERFORMANCE OPTIMIZATION: Add indexes for frequently queried columns
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add performance indexes for frequently queried columns

    These indexes optimize:
    - Dashboard KPI queries (tenant_id + date/status filters)
    - List queries with filtering and sorting
    - Foreign key lookups
    - Multi-tenant data isolation queries
    """

    # ========================================================================
    # Quotes Table Indexes
    # ========================================================================

    # Composite index for tenant + status (dashboard KPIs, filtered lists)
    op.create_index(
        'idx_quotes_tenant_status',
        'quotes',
        ['tenant_id', 'status'],
        unique=False
    )

    # Composite index for tenant + created_at (date range queries)
    op.create_index(
        'idx_quotes_tenant_created',
        'quotes',
        ['tenant_id', 'created_at'],
        unique=False
    )

    # Composite index for tenant + client (client quote history)
    op.create_index(
        'idx_quotes_tenant_client',
        'quotes',
        ['tenant_id', 'client_id'],
        unique=False
    )

    # Composite index for tenant + sales_rep (sales rep performance)
    op.create_index(
        'idx_quotes_tenant_sales_rep',
        'quotes',
        ['tenant_id', 'sales_rep_id'],
        unique=False
    )

    # Index for valid_until (expiration checks)
    op.create_index(
        'idx_quotes_valid_until',
        'quotes',
        ['valid_until'],
        unique=False
    )

    # ========================================================================
    # Expenses Table Indexes
    # ========================================================================

    # Composite index for tenant + date (date range queries, monthly aggregations)
    op.create_index(
        'idx_expenses_tenant_date',
        'expenses',
        ['tenant_id', 'date'],
        unique=False
    )

    # Composite index for tenant + status (pending approvals, filtered lists)
    op.create_index(
        'idx_expenses_tenant_status',
        'expenses',
        ['tenant_id', 'status'],
        unique=False
    )

    # Composite index for tenant + user (user expense history)
    op.create_index(
        'idx_expenses_tenant_user',
        'expenses',
        ['tenant_id', 'user_id'],
        unique=False
    )

    # Composite index for tenant + category (category analytics)
    op.create_index(
        'idx_expenses_tenant_category',
        'expenses',
        ['tenant_id', 'category_id'],
        unique=False
    )

    # ========================================================================
    # Clients Table Indexes
    # ========================================================================

    # Composite index for tenant + status (active clients count)
    op.create_index(
        'idx_clients_tenant_status',
        'clients',
        ['tenant_id', 'status'],
        unique=False
    )

    # Composite index for tenant + created_at (new clients tracking)
    op.create_index(
        'idx_clients_tenant_created',
        'clients',
        ['tenant_id', 'created_at'],
        unique=False
    )

    # Index for email (unique constraint already exists, this speeds up lookups)
    op.create_index(
        'idx_clients_email',
        'clients',
        ['email'],
        unique=False
    )

    # ========================================================================
    # Quote Items Table Indexes
    # ========================================================================

    # Composite index for tenant + quote (quote items lookup)
    op.create_index(
        'idx_quote_items_tenant_quote',
        'quote_items',
        ['tenant_id', 'quote_id'],
        unique=False
    )

    # ========================================================================
    # Expense Categories Table Indexes
    # ========================================================================

    # Composite index for tenant + is_active (active categories lookup)
    op.create_index(
        'idx_expense_categories_tenant_active',
        'expense_categories',
        ['tenant_id', 'is_active'],
        unique=False
    )

    # ========================================================================
    # Refresh Tokens Table Indexes
    # ========================================================================

    # Composite index for user + expires_at (token validation)
    op.create_index(
        'idx_refresh_tokens_user_expires',
        'refresh_tokens',
        ['user_id', 'expires_at'],
        unique=False
    )

    # Index for expires_at (cleanup of expired tokens)
    op.create_index(
        'idx_refresh_tokens_expires',
        'refresh_tokens',
        ['expires_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove performance indexes"""

    # Refresh Tokens
    op.drop_index('idx_refresh_tokens_expires', table_name='refresh_tokens')
    op.drop_index('idx_refresh_tokens_user_expires', table_name='refresh_tokens')

    # Expense Categories
    op.drop_index('idx_expense_categories_tenant_active', table_name='expense_categories')

    # Quote Items
    op.drop_index('idx_quote_items_tenant_quote', table_name='quote_items')

    # Clients
    op.drop_index('idx_clients_email', table_name='clients')
    op.drop_index('idx_clients_tenant_created', table_name='clients')
    op.drop_index('idx_clients_tenant_status', table_name='clients')

    # Expenses
    op.drop_index('idx_expenses_tenant_category', table_name='expenses')
    op.drop_index('idx_expenses_tenant_user', table_name='expenses')
    op.drop_index('idx_expenses_tenant_status', table_name='expenses')
    op.drop_index('idx_expenses_tenant_date', table_name='expenses')

    # Quotes
    op.drop_index('idx_quotes_valid_until', table_name='quotes')
    op.drop_index('idx_quotes_tenant_sales_rep', table_name='quotes')
    op.drop_index('idx_quotes_tenant_client', table_name='quotes')
    op.drop_index('idx_quotes_tenant_created', table_name='quotes')
    op.drop_index('idx_quotes_tenant_status', table_name='quotes')
