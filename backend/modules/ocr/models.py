"""
OCR Job model for tracking receipt/invoice processing
Stores image metadata, processing status, and extracted data
"""
from enum import Enum
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from models.base import BaseModel


class OCRJobStatus(str, Enum):
    """OCR Job processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class OCRJob(BaseModel):
    """
    OCR Job model
    Tracks receipt/invoice image processing with OCR extraction

    Workflow:
    1. PENDING - User uploaded image, waiting for processing
    2. PROCESSING - Celery task is extracting data
    3. COMPLETED - Successfully extracted data
    4. FAILED - Error during processing (with error_message)
    """

    __tablename__ = "ocr_jobs"

    # User who created the job
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Image storage
    image_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Numeric(10, 0), nullable=False)  # bytes
    mime_type = Column(String(50), nullable=False)

    # Processing status
    status = Column(
        SQLEnum(OCRJobStatus, name="ocr_job_status"),
        default=OCRJobStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Extraction results
    confidence = Column(
        Numeric(4, 3),  # 0.000 to 1.000
        nullable=True,
    )

    extracted_data = Column(
        JSONB,
        nullable=True,
        comment="JSON with provider, amount, date, category, items",
    )

    raw_text = Column(Text, nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Numeric(2, 0), default=0, nullable=False)

    # Processing metadata
    processing_time_seconds = Column(Numeric(6, 2), nullable=True)
    ocr_engine = Column(
        String(50),
        default="tesseract",
        nullable=False,
    )

    # User confirmation
    is_confirmed = Column(String(10), default="false", nullable=False)
    confirmed_data = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<OCRJob(id={self.id}, status={self.status}, confidence={self.confidence})>"

    @property
    def is_completed(self) -> bool:
        """Check if job is successfully completed"""
        return self.status == OCRJobStatus.COMPLETED

    @property
    def is_failed(self) -> bool:
        """Check if job failed"""
        return self.status == OCRJobStatus.FAILED

    @property
    def is_processing(self) -> bool:
        """Check if job is currently processing"""
        return self.status == OCRJobStatus.PROCESSING

    def get_final_data(self) -> dict:
        """Get final extracted data (confirmed_data or extracted_data)"""
        return self.confirmed_data if self.confirmed_data else self.extracted_data
