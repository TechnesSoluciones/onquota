"""Create OCR jobs table

Revision ID: 007
Revises: 006
Create Date: 2025-11-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ocr_job_status enum
    op.execute("""
        CREATE TYPE ocr_job_status AS ENUM (
            'pending',
            'processing',
            'completed',
            'failed'
        )
    """)

    # Create ocr_jobs table
    op.create_table(
        'ocr_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),

        # Image storage
        sa.Column('image_path', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Numeric(10, 0), nullable=False),  # bytes
        sa.Column('mime_type', sa.String(50), nullable=False),

        # Processing status
        sa.Column('status', sa.Enum(
            'pending', 'processing', 'completed', 'failed',
            name='ocr_job_status'
        ), nullable=False, server_default='pending', index=True),

        # Extraction results
        sa.Column('confidence', sa.Numeric(4, 3), nullable=True),  # 0.000 to 1.000
        sa.Column('extracted_data', postgresql.JSONB, nullable=True, comment='JSON with provider, amount, date, category, items'),
        sa.Column('raw_text', sa.Text, nullable=True),

        # Error handling
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('retry_count', sa.Numeric(2, 0), nullable=False, server_default='0'),

        # Processing metadata
        sa.Column('processing_time_seconds', sa.Numeric(6, 2), nullable=True),
        sa.Column('ocr_engine', sa.String(50), nullable=False, server_default='tesseract'),

        # User confirmation
        sa.Column('is_confirmed', sa.String(10), nullable=False, server_default='false'),
        sa.Column('confirmed_data', postgresql.JSONB, nullable=True),

        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Foreign keys
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create indexes for performance
    op.create_index(
        'ix_ocr_jobs_tenant_status',
        'ocr_jobs',
        ['tenant_id', 'status'],
        unique=False
    )

    op.create_index(
        'ix_ocr_jobs_tenant_user',
        'ocr_jobs',
        ['tenant_id', 'user_id'],
        unique=False
    )

    op.create_index(
        'ix_ocr_jobs_created_at',
        'ocr_jobs',
        ['created_at'],
        unique=False
    )

    op.create_index(
        'ix_ocr_jobs_pending',
        'ocr_jobs',
        ['status', 'retry_count'],
        unique=False,
        postgresql_where=sa.text("status = 'pending' AND retry_count < 3 AND is_deleted = false")
    )

    # Create index for filtering confirmed jobs
    op.create_index(
        'ix_ocr_jobs_confirmed',
        'ocr_jobs',
        ['tenant_id', 'is_confirmed'],
        unique=False
    )

    # Create index for filtering active jobs
    op.create_index(
        'ix_ocr_jobs_active',
        'ocr_jobs',
        ['tenant_id', 'is_deleted'],
        unique=False
    )

    # Create GIN index for JSONB columns (fast JSON queries)
    op.create_index(
        'ix_ocr_jobs_extracted_data_gin',
        'ocr_jobs',
        ['extracted_data'],
        unique=False,
        postgresql_using='gin'
    )

    op.create_index(
        'ix_ocr_jobs_confirmed_data_gin',
        'ocr_jobs',
        ['confirmed_data'],
        unique=False,
        postgresql_using='gin'
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_ocr_jobs_confirmed_data_gin', table_name='ocr_jobs')
    op.drop_index('ix_ocr_jobs_extracted_data_gin', table_name='ocr_jobs')
    op.drop_index('ix_ocr_jobs_active', table_name='ocr_jobs')
    op.drop_index('ix_ocr_jobs_confirmed', table_name='ocr_jobs')
    op.drop_index('ix_ocr_jobs_pending', table_name='ocr_jobs')
    op.drop_index('ix_ocr_jobs_created_at', table_name='ocr_jobs')
    op.drop_index('ix_ocr_jobs_tenant_user', table_name='ocr_jobs')
    op.drop_index('ix_ocr_jobs_tenant_status', table_name='ocr_jobs')

    # Drop table
    op.drop_table('ocr_jobs')

    # Drop enum
    op.execute('DROP TYPE ocr_job_status')
