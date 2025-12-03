"""increase two_factor_secret column size for encrypted secrets

Revision ID: 022
Revises: 021
Create Date: 2025-12-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade():
    """
    Increase two_factor_secret column size from 32 to 255 characters
    to accommodate encrypted secrets using Fernet
    """
    # Alter column type
    op.alter_column('users', 'two_factor_secret',
                    existing_type=sa.String(32),
                    type_=sa.String(255),
                    existing_nullable=True)


def downgrade():
    """
    Downgrade to original size
    Warning: This may truncate encrypted secrets if they exist
    """
    op.alter_column('users', 'two_factor_secret',
                    existing_type=sa.String(255),
                    type_=sa.String(32),
                    existing_nullable=True)
