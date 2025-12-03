"""Add two-factor authentication fields

Revision ID: 021_add_two_factor_authentication
Revises: 020_add_super_admin_and_audit_logs
Create Date: 2025-12-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None


def upgrade():
    # Agregar campos de 2FA a la tabla users
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean, nullable=False, server_default='false'))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(32), nullable=True))
    op.add_column('users', sa.Column('backup_codes', JSONB, nullable=True))
    op.add_column('users', sa.Column('two_factor_verified_at', sa.DateTime(timezone=True), nullable=True))

    # Crear índice para búsqueda rápida de usuarios con 2FA habilitado
    op.create_index(
        'ix_users_two_factor_enabled',
        'users',
        ['two_factor_enabled'],
        unique=False
    )


def downgrade():
    # Eliminar índice
    op.drop_index('ix_users_two_factor_enabled', table_name='users')

    # Eliminar columnas
    op.drop_column('users', 'two_factor_verified_at')
    op.drop_column('users', 'backup_codes')
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
