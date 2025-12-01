"""
Celery tasks for asynchronous OCR processing
Handles image preprocessing, text extraction, and data parsing
"""
import time
from decimal import Decimal
from uuid import UUID
from pathlib import Path
from celery import shared_task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from core.config import settings
from core.logging import get_logger
from models.ocr_job import OCRJobStatus
from modules.ocr.schemas import OCRJobStatusUpdate
from modules.ocr.repository import OCRRepository
from modules.ocr.processor import ImageProcessor, ImageValidationError
from modules.ocr.engine import OCREngine

logger = get_logger(__name__)

# Create async engine for Celery tasks
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# Create async session maker
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncSession:
    """Get async database session for Celery tasks"""
    return AsyncSessionLocal()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_ocr_job(self, job_id: str, image_path: str):
    """
    Process OCR job asynchronously

    Workflow:
    1. Update status to PROCESSING
    2. Validate image
    3. Preprocess image (grayscale, denoise, deskew, threshold)
    4. Extract raw text with Tesseract
    5. Parse structured data (provider, amount, date, category)
    6. Calculate confidence score
    7. Update job with results (COMPLETED or FAILED)
    8. Retry up to 3 times on failure

    Args:
        job_id: UUID of OCR job
        image_path: Path to uploaded image

    Raises:
        Exception: Any processing errors (triggers retry)
    """
    import asyncio

    # Run async processing in event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        result = loop.run_until_complete(
            _process_ocr_job_async(job_id, image_path)
        )
        return result
    except Exception as exc:
        logger.error(f"OCR job {job_id} failed: {exc}", exc_info=True)

        # Update job status to FAILED
        try:
            loop.run_until_complete(
                _update_job_failed(job_id, str(exc))
            )
        except Exception as update_error:
            logger.error(f"Failed to update job status: {update_error}")

        # Retry task
        raise self.retry(exc=exc, countdown=60)
    finally:
        loop.close()


async def _process_ocr_job_async(job_id: str, image_path: str) -> dict:
    """
    Async OCR processing logic

    Args:
        job_id: UUID of OCR job
        image_path: Path to uploaded image

    Returns:
        Processing results dictionary
    """
    start_time = time.time()

    async with AsyncSessionLocal() as db:
        repo = OCRRepository(db)

        # Get job
        job_uuid = UUID(job_id)
        job = await repo.get_job_by_id(job_uuid, None)  # Skip tenant check for background task

        if not job:
            raise ValueError(f"OCR job {job_id} not found")

        logger.info(f"Processing OCR job {job_id}: {image_path}")

        try:
            # Update status to PROCESSING
            await repo.update_job_status(
                job_id=job_uuid,
                status_update=OCRJobStatusUpdate(
                    status=OCRJobStatus.PROCESSING,
                ),
            )

            # Step 1: Validate image
            logger.debug(f"Validating image: {image_path}")
            is_valid, error_msg = ImageProcessor.validate_image(image_path)
            if not is_valid:
                raise ImageValidationError(error_msg)

            # Step 2: Preprocess image
            logger.debug(f"Preprocessing image: {image_path}")
            preprocessed_image = ImageProcessor.preprocess(image_path)

            # Step 3: Extract text with OCR engine
            logger.debug(f"Extracting text from image")
            ocr_engine = OCREngine(lang=settings.TESSERACT_LANG)
            raw_text = await ocr_engine.extract_text(preprocessed_image)

            if not raw_text or len(raw_text.strip()) < 10:
                raise ValueError("Insufficient text extracted from image. Please ensure image is clear and contains readable text.")

            # Step 4: Extract structured data
            logger.debug(f"Parsing structured data from text")
            extracted_data, confidence = await ocr_engine.extract_structured_data(raw_text)

            # Calculate processing time
            processing_time = time.time() - start_time

            # Step 5: Update job with results
            logger.info(
                f"OCR job {job_id} completed successfully. "
                f"Confidence: {confidence:.3f}, Time: {processing_time:.2f}s"
            )

            await repo.update_job_status(
                job_id=job_uuid,
                status_update=OCRJobStatusUpdate(
                    status=OCRJobStatus.COMPLETED,
                    confidence=Decimal(str(round(confidence, 3))),
                    extracted_data=extracted_data,
                    raw_text=raw_text,
                    processing_time_seconds=Decimal(str(round(processing_time, 2))),
                ),
            )

            return {
                "job_id": job_id,
                "status": "completed",
                "confidence": confidence,
                "processing_time": processing_time,
            }

        except Exception as e:
            # Calculate processing time even on failure
            processing_time = time.time() - start_time

            logger.error(
                f"OCR job {job_id} failed after {processing_time:.2f}s: {e}",
                exc_info=True,
            )

            # Update job status to FAILED
            await repo.update_job_status(
                job_id=job_uuid,
                status_update=OCRJobStatusUpdate(
                    status=OCRJobStatus.FAILED,
                    error_message=str(e),
                    processing_time_seconds=Decimal(str(round(processing_time, 2))),
                ),
            )

            raise


async def _update_job_failed(job_id: str, error_message: str):
    """
    Update job status to FAILED (used in error handler)

    Args:
        job_id: UUID of OCR job
        error_message: Error message
    """
    async with AsyncSessionLocal() as db:
        repo = OCRRepository(db)
        job_uuid = UUID(job_id)

        await repo.update_job_status(
            job_id=job_uuid,
            status_update=OCRJobStatusUpdate(
                status=OCRJobStatus.FAILED,
                error_message=error_message,
            ),
        )


@shared_task
def cleanup_old_ocr_files(days: int = 30):
    """
    Cleanup old OCR image files (maintenance task)

    Deletes image files older than specified days.
    Jobs remain in database (soft deleted).

    Args:
        days: Delete files older than this many days

    Returns:
        Number of files deleted
    """
    import asyncio
    from datetime import datetime, timedelta

    logger.info(f"Starting OCR file cleanup (older than {days} days)")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        deleted_count = loop.run_until_complete(
            _cleanup_old_ocr_files_async(days)
        )
        logger.info(f"Deleted {deleted_count} old OCR files")
        return deleted_count
    finally:
        loop.close()


async def _cleanup_old_ocr_files_async(days: int) -> int:
    """
    Async cleanup logic

    Args:
        days: Delete files older than this many days

    Returns:
        Number of files deleted
    """
    from datetime import datetime, timedelta

    async with AsyncSessionLocal() as db:
        repo = OCRRepository(db)

        # Get all jobs (no tenant filter for maintenance)
        # In production, you might want to query by created_at
        deleted_count = 0
        upload_dir = Path("uploads/ocr")

        if not upload_dir.exists():
            return 0

        # Calculate cutoff date
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Iterate through tenant directories
        for tenant_dir in upload_dir.iterdir():
            if not tenant_dir.is_dir():
                continue

            # Check each file
            for file_path in tenant_dir.iterdir():
                if not file_path.is_file():
                    continue

                # Get file modification time
                file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)

                # Delete if older than cutoff
                if file_mtime < cutoff_date:
                    try:
                        file_path.unlink()
                        deleted_count += 1
                        logger.debug(f"Deleted old file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete {file_path}: {e}")

        return deleted_count


@shared_task
def reprocess_failed_jobs(max_jobs: int = 10):
    """
    Reprocess failed OCR jobs (maintenance task)

    Retries failed jobs that haven't exceeded retry limit.

    Args:
        max_jobs: Maximum number of jobs to reprocess

    Returns:
        Number of jobs reprocessed
    """
    import asyncio

    logger.info(f"Starting reprocessing of failed OCR jobs (max: {max_jobs})")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        reprocessed_count = loop.run_until_complete(
            _reprocess_failed_jobs_async(max_jobs)
        )
        logger.info(f"Reprocessed {reprocessed_count} failed OCR jobs")
        return reprocessed_count
    finally:
        loop.close()


async def _reprocess_failed_jobs_async(max_jobs: int) -> int:
    """
    Async reprocess logic

    Args:
        max_jobs: Maximum number of jobs to reprocess

    Returns:
        Number of jobs reprocessed
    """
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, and_
        from models.ocr_job import OCRJob

        # Query failed jobs with retry count < 3
        query = (
            select(OCRJob)
            .where(
                and_(
                    OCRJob.status == OCRJobStatus.FAILED,
                    OCRJob.retry_count < 3,
                    OCRJob.is_deleted == False,
                )
            )
            .limit(max_jobs)
        )

        result = await db.execute(query)
        failed_jobs = result.scalars().all()

        reprocessed_count = 0

        for job in failed_jobs:
            try:
                logger.info(f"Reprocessing failed job {job.id}")

                # Trigger processing task
                process_ocr_job.delay(str(job.id), job.image_path)
                reprocessed_count += 1

            except Exception as e:
                logger.error(f"Failed to reprocess job {job.id}: {e}")

        return reprocessed_count
