"""add_spa_module

Revision ID: 014
Revises: 013
Create Date: 2025-11-29

Migración para módulo SPA:
1. Agrega columna bpid a tabla clients
2. Crea tabla spa_agreements
3. Crea tabla spa_upload_logs
4. Crea índices para performance
5. Crea constraints
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Aplicar migración."""

    # 1. Agregar columna bpid a tabla clients
    op.add_column(
        'clients',
        sa.Column('bpid', sa.String(50), nullable=True, comment='Business Partner ID')
    )

    # Crear índice en bpid para búsquedas rápidas
    op.create_index(
        'ix_clients_bpid_tenant',
        'clients',
        ['bpid', 'tenant_id'],
        unique=False
    )

    # 2. Crear tabla spa_agreements
    op.create_table(
        'spa_agreements',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),

        # Foreign Keys
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), nullable=False, comment='Batch de upload'),

        # Client Info (denormalizado para performance)
        sa.Column('bpid', sa.String(50), nullable=False, comment='Business Partner ID'),
        sa.Column('ship_to_name', sa.String(255), nullable=False),

        # Product Info
        sa.Column('article_number', sa.String(100), nullable=False, comment='SKU o Part Number'),
        sa.Column('article_description', sa.String(500), nullable=True),

        # Pricing
        sa.Column(
            'list_price',
            sa.Numeric(precision=18, scale=4),
            nullable=False,
            comment='Precio de lista'
        ),
        sa.Column(
            'app_net_price',
            sa.Numeric(precision=18, scale=4),
            nullable=False,
            comment='Precio neto aprobado'
        ),
        sa.Column(
            'discount_percent',
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            comment='Porcentaje de descuento calculado'
        ),
        sa.Column('uom', sa.String(10), nullable=False, server_default='EA'),

        # Validity Period
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column(
            'is_active',
            sa.Boolean(),
            nullable=False,
            server_default='true',
            comment='True si hoy está entre start_date y end_date'
        ),

        # Audit Fields
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),

        # Constraints
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='RESTRICT'),

        # Check Constraints
        sa.CheckConstraint('list_price >= 0', name='check_list_price_positive'),
        sa.CheckConstraint('app_net_price >= 0', name='check_app_net_price_positive'),
        sa.CheckConstraint(
            'discount_percent >= 0 AND discount_percent <= 100',
            name='check_discount_percent_range'
        ),
        sa.CheckConstraint('end_date >= start_date', name='check_date_range')
    )

    # Índices para tabla spa_agreements

    # Búsqueda por tenant
    op.create_index(
        'ix_spa_agreements_tenant_id',
        'spa_agreements',
        ['tenant_id']
    )

    # Búsqueda por cliente
    op.create_index(
        'ix_spa_agreements_client_id',
        'spa_agreements',
        ['client_id']
    )

    # Búsqueda por artículo
    op.create_index(
        'ix_spa_agreements_article_number',
        'spa_agreements',
        ['article_number']
    )

    # Búsqueda por BPID
    op.create_index(
        'ix_spa_agreements_bpid',
        'spa_agreements',
        ['bpid']
    )

    # Búsqueda de descuentos activos (query más común)
    op.create_index(
        'ix_spa_agreements_active_lookup',
        'spa_agreements',
        ['tenant_id', 'client_id', 'article_number', 'is_active'],
        unique=False,
        postgresql_where=sa.text('deleted_at IS NULL')
    )

    # Búsqueda por fechas (para tareas programadas)
    op.create_index(
        'ix_spa_agreements_dates',
        'spa_agreements',
        ['start_date', 'end_date']
    )

    # Búsqueda por batch (para tracking de uploads)
    op.create_index(
        'ix_spa_agreements_batch_id',
        'spa_agreements',
        ['batch_id']
    )

    # Soft delete
    op.create_index(
        'ix_spa_agreements_deleted_at',
        'spa_agreements',
        ['deleted_at']
    )

    # 3. Crear tabla spa_upload_logs
    op.create_table(
        'spa_upload_logs',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),

        # Upload Info
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Statistics
        sa.Column('total_rows', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('success_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'duration_seconds',
            sa.Numeric(precision=10, scale=2),
            nullable=True,
            comment='Duración del procesamiento en segundos'
        ),

        # Error Tracking
        sa.Column('error_message', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),

        # Constraints
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='RESTRICT'),

        # Check Constraints
        sa.CheckConstraint('total_rows >= 0', name='check_total_rows_positive'),
        sa.CheckConstraint('success_count >= 0', name='check_success_count_positive'),
        sa.CheckConstraint('error_count >= 0', name='check_error_count_positive'),
        sa.CheckConstraint(
            'success_count + error_count <= total_rows',
            name='check_counts_sum'
        )
    )

    # Índices para tabla spa_upload_logs

    op.create_index(
        'ix_spa_upload_logs_tenant_id',
        'spa_upload_logs',
        ['tenant_id']
    )

    op.create_index(
        'ix_spa_upload_logs_batch_id',
        'spa_upload_logs',
        ['batch_id'],
        unique=True
    )

    op.create_index(
        'ix_spa_upload_logs_uploaded_by',
        'spa_upload_logs',
        ['uploaded_by']
    )

    op.create_index(
        'ix_spa_upload_logs_created_at',
        'spa_upload_logs',
        ['created_at'],
        postgresql_using='btree'
    )


def downgrade() -> None:
    """Revertir migración."""

    # Eliminar índices de spa_upload_logs
    op.drop_index('ix_spa_upload_logs_created_at', table_name='spa_upload_logs')
    op.drop_index('ix_spa_upload_logs_uploaded_by', table_name='spa_upload_logs')
    op.drop_index('ix_spa_upload_logs_batch_id', table_name='spa_upload_logs')
    op.drop_index('ix_spa_upload_logs_tenant_id', table_name='spa_upload_logs')

    # Eliminar tabla spa_upload_logs
    op.drop_table('spa_upload_logs')

    # Eliminar índices de spa_agreements
    op.drop_index('ix_spa_agreements_deleted_at', table_name='spa_agreements')
    op.drop_index('ix_spa_agreements_batch_id', table_name='spa_agreements')
    op.drop_index('ix_spa_agreements_dates', table_name='spa_agreements')
    op.drop_index('ix_spa_agreements_active_lookup', table_name='spa_agreements')
    op.drop_index('ix_spa_agreements_bpid', table_name='spa_agreements')
    op.drop_index('ix_spa_agreements_article_number', table_name='spa_agreements')
    op.drop_index('ix_spa_agreements_client_id', table_name='spa_agreements')
    op.drop_index('ix_spa_agreements_tenant_id', table_name='spa_agreements')

    # Eliminar tabla spa_agreements
    op.drop_table('spa_agreements')

    # Eliminar índice y columna bpid de clients
    op.drop_index('ix_clients_bpid_tenant', table_name='clients')
    op.drop_column('clients', 'bpid')
