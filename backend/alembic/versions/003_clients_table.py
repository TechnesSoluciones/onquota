"""Add clients table

Revision ID: 003
Revises: 002
Create Date: 2025-11-06 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create client_status enum
    op.execute("""
        CREATE TYPE client_status AS ENUM (
            'lead',
            'prospect',
            'active',
            'inactive',
            'lost'
        )
    """)

    # Create client_type enum
    op.execute("""
        CREATE TYPE client_type AS ENUM (
            'individual',
            'company'
        )
    """)

    # Create industry enum
    op.execute("""
        CREATE TYPE industry AS ENUM (
            'technology',
            'healthcare',
            'finance',
            'retail',
            'manufacturing',
            'education',
            'real_estate',
            'hospitality',
            'transportation',
            'energy',
            'agriculture',
            'construction',
            'consulting',
            'other'
        )
    """)

    # Create clients table
    op.create_table(
        'clients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Basic Information
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('client_type', postgresql.ENUM('individual', 'company', name='client_type'), nullable=False, server_default='company'),

        # Contact Information
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('mobile', sa.String(50), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),

        # Address
        sa.Column('address_line1', sa.String(255), nullable=True),
        sa.Column('address_line2', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('postal_code', sa.String(20), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),

        # Business Information
        sa.Column('industry', postgresql.ENUM(
            'technology', 'healthcare', 'finance', 'retail', 'manufacturing',
            'education', 'real_estate', 'hospitality', 'transportation', 'energy',
            'agriculture', 'construction', 'consulting', 'other',
            name='industry'
        ), nullable=True),
        sa.Column('tax_id', sa.String(50), nullable=True),

        # CRM Status
        sa.Column('status', postgresql.ENUM('lead', 'prospect', 'active', 'inactive', 'lost', name='client_status'), nullable=False, server_default='lead'),

        # Contact Person (for companies)
        sa.Column('contact_person_name', sa.String(255), nullable=True),
        sa.Column('contact_person_email', sa.String(255), nullable=True),
        sa.Column('contact_person_phone', sa.String(50), nullable=True),

        # Additional Information
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('tags', sa.String(500), nullable=True),

        # Sales Information
        sa.Column('lead_source', sa.String(100), nullable=True),
        sa.Column('first_contact_date', sa.Date(), nullable=True),
        sa.Column('conversion_date', sa.Date(), nullable=True),

        # Social Media
        sa.Column('linkedin_url', sa.String(255), nullable=True),
        sa.Column('twitter_handle', sa.String(100), nullable=True),

        # Preferences
        sa.Column('preferred_language', sa.String(10), nullable=False, server_default='en'),
        sa.Column('preferred_currency', sa.String(3), nullable=False, server_default='USD'),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign Keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    )

    # Create indexes for clients
    op.create_index('ix_clients_tenant_id', 'clients', ['tenant_id'])
    op.create_index('ix_clients_name', 'clients', ['name'])
    op.create_index('ix_clients_email', 'clients', ['email'])
    op.create_index('ix_clients_status', 'clients', ['status'])
    op.create_index('ix_clients_industry', 'clients', ['industry'])
    op.create_index('ix_clients_is_deleted', 'clients', ['is_deleted'])
    op.create_index('ix_clients_is_active', 'clients', ['is_active'])

    # Composite indexes for common query patterns
    op.create_index('ix_clients_tenant_status', 'clients', ['tenant_id', 'status'])
    op.create_index('ix_clients_tenant_industry', 'clients', ['tenant_id', 'industry'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_clients_tenant_industry', table_name='clients')
    op.drop_index('ix_clients_tenant_status', table_name='clients')
    op.drop_index('ix_clients_is_active', table_name='clients')
    op.drop_index('ix_clients_is_deleted', table_name='clients')
    op.drop_index('ix_clients_industry', table_name='clients')
    op.drop_index('ix_clients_status', table_name='clients')
    op.drop_index('ix_clients_email', table_name='clients')
    op.drop_index('ix_clients_name', table_name='clients')
    op.drop_index('ix_clients_tenant_id', table_name='clients')

    # Drop table
    op.drop_table('clients')

    # Drop enums
    op.execute('DROP TYPE industry')
    op.execute('DROP TYPE client_type')
    op.execute('DROP TYPE client_status')
