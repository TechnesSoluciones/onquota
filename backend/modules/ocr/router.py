"""
OCR Router - FastAPI endpoints for receipt/invoice processing
Handles image upload, job management, and data confirmation
"""
import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.config import settings
from core.logging import get_logger
from core.exceptions import NotFoundError, ValidationError, ForbiddenError
from api.dependencies import get_current_user
from models.user import User
from models.ocr_job import OCRJobStatus
from modules.ocr.schemas import (
    OCRJobResponse,
    OCRJobListResponse,
    OCRJobListItem,
    OCRJobConfirm,
    OCRJobCreate,
)
from modules.ocr.repository import OCRRepository
from modules.ocr.processor import ImageProcessor, ImageValidationError

logger = get_logger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])

# Storage configuration
UPLOAD_DIR = Path("uploads/ocr")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}


def validate_file_upload(file: UploadFile) -> None:
    """
    Validate uploaded file

    Args:
        file: Uploaded file

    Raises:
        ValidationError: If file validation fails
    """
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(
            f"Invalid MIME type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )


async def save_upload_file(
    file: UploadFile,
    tenant_id: uuid.UUID,
) -> tuple[str, int]:
    """
    Save uploaded file to storage

    Args:
        file: Uploaded file
        tenant_id: Tenant ID for organizing files

    Returns:
        Tuple of (file_path, file_size)

    Raises:
        ValidationError: If file is too large or save fails
    """
    # Create tenant directory
    tenant_dir = UPLOAD_DIR / str(tenant_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = tenant_dir / unique_filename

    # Save file in chunks
    file_size = 0
    max_size = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024

    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(8192):  # 8KB chunks
                file_size += len(chunk)

                # Check size limit
                if file_size > max_size:
                    # Delete partial file
                    if file_path.exists():
                        file_path.unlink()
                    raise ValidationError(
                        f"File too large. Maximum size: {settings.MAX_IMAGE_SIZE_MB}MB"
                    )

                f.write(chunk)

        logger.info(f"Saved file: {file_path} ({file_size} bytes)")
        return str(file_path), file_size

    except Exception as e:
        # Clean up on error
        if file_path.exists():
            file_path.unlink()
        logger.error(f"Failed to save file: {e}")
        raise ValidationError(f"Failed to save file: {str(e)}")


@router.post(
    "/process",
    response_model=OCRJobResponse,
    status_code=status.HTTP_201_CREATED,
)
async def process_receipt(
    file: UploadFile = File(..., description="Receipt/invoice image (JPG, PNG, or PDF)"),
    ocr_engine: str = Query(default="tesseract", description="OCR engine to use"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and process receipt/invoice image with OCR

    **Workflow:**
    1. Validate file (format, size)
    2. Save to storage (/uploads/ocr/{tenant_id}/{filename})
    3. Create OCRJob in database (status=PENDING)
    4. Trigger async Celery task for processing
    5. Return job_id for status polling

    **Supported formats:** JPG, PNG, PDF

    **Max file size:** 10MB

    **Processing:** Asynchronous via Celery. Use GET /ocr/jobs/{job_id} to check status.

    Args:
        file: Image file upload
        ocr_engine: OCR engine to use (tesseract or google_vision)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created OCR job with PENDING status

    Raises:
        ValidationError: If file validation fails
    """
    logger.info(f"Processing OCR request from user {current_user.id}")

    # Validate file
    validate_file_upload(file)

    # Save file
    file_path, file_size = await save_upload_file(file, current_user.tenant_id)

    try:
        # Validate image with ImageProcessor
        is_valid, error_msg = ImageProcessor.validate_image(file_path)
        if not is_valid:
            # Clean up file
            Path(file_path).unlink(missing_ok=True)
            raise ValidationError(f"Image validation failed: {error_msg}")

        # Create OCR job
        repo = OCRRepository(db)
        job = await repo.create_job(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            image_path=file_path,
            original_filename=file.filename,
            file_size=file_size,
            mime_type=file.content_type,
            ocr_engine=ocr_engine,
        )

        # Trigger async processing task
        from modules.ocr.tasks import process_ocr_job
        process_ocr_job.delay(str(job.id), file_path)

        logger.info(f"Created OCR job {job.id} for file {file.filename}")

        return job

    except Exception as e:
        # Clean up file on error
        Path(file_path).unlink(missing_ok=True)
        logger.error(f"Failed to create OCR job: {e}")
        raise


@router.get("/jobs/{job_id}", response_model=OCRJobResponse)
async def get_ocr_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get OCR job status and results

    Use this endpoint to poll job status after uploading a receipt.

    **Job statuses:**
    - PENDING: Waiting for processing
    - PROCESSING: OCR extraction in progress
    - COMPLETED: Successfully extracted data
    - FAILED: Error during processing (see error_message)

    Args:
        job_id: OCR job ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        OCR job with current status and extracted data (if completed)

    Raises:
        NotFoundError: If job not found or belongs to different tenant
    """
    repo = OCRRepository(db)
    job = await repo.get_job_by_id(job_id, current_user.tenant_id)

    if not job:
        raise NotFoundError(resource="OCR job", resource_id=str(job_id))

    logger.debug(f"Retrieved OCR job {job_id} (status: {job.status})")

    return job


@router.get("/jobs", response_model=OCRJobListResponse)
async def list_ocr_jobs(
    status: Optional[OCRJobStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List OCR jobs with pagination and filters

    Returns paginated list of OCR jobs for the current tenant.

    **Filters:**
    - status: Filter by job status (PENDING, PROCESSING, COMPLETED, FAILED)

    **Pagination:**
    - page: Page number (1-indexed)
    - page_size: Items per page (max 100)

    Args:
        status: Optional status filter
        page: Page number
        page_size: Items per page
        current_user: Current authenticated user
        db: Database session

    Returns:
        Paginated list of OCR jobs with metadata
    """
    repo = OCRRepository(db)

    jobs, total = await repo.get_jobs(
        tenant_id=current_user.tenant_id,
        status=status,
        user_id=None,  # All users in tenant
        page=page,
        page_size=page_size,
    )

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    # Convert to list items
    items = [OCRJobListItem.from_ocr_job(job) for job in jobs]

    logger.info(f"Retrieved {len(items)} OCR jobs for tenant {current_user.tenant_id}")

    return OCRJobListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.put("/jobs/{job_id}/confirm", response_model=OCRJobResponse)
async def confirm_extraction(
    job_id: uuid.UUID,
    confirm_data: OCRJobConfirm,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm and optionally edit OCR extracted data

    After reviewing OCR results, users can:
    1. Confirm extracted data as-is
    2. Edit/correct any fields
    3. Optionally create an expense from confirmed data

    **Note:** Job must be in COMPLETED status to confirm.

    Args:
        job_id: OCR job ID
        confirm_data: Confirmed/edited data and options
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated OCR job with confirmed data

    Raises:
        NotFoundError: If job not found
        ValidationError: If job is not in COMPLETED status
    """
    repo = OCRRepository(db)

    # Confirm extraction
    job = await repo.confirm_extraction(
        job_id=job_id,
        tenant_id=current_user.tenant_id,
        confirmed_data=confirm_data.confirmed_data,
    )

    if not job:
        raise NotFoundError(resource="OCR job", resource_id=str(job_id))

    logger.info(f"Confirmed OCR job {job_id}")

    # Create expense from confirmed OCR data if requested
    if confirm_data.create_expense:
        logger.info(f"Creating expense from OCR job {job_id}")

        try:
            from modules.expenses.repository import ExpenseRepository
            from datetime import date as date_type

            # Extract confirmed data
            data = confirm_data.confirmed_data

            # Validate required fields for expense creation
            if not data.amount or not data.date:
                logger.error("Cannot create expense: missing required fields (amount or date)")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot create expense: amount and date are required"
                )

            # Create expense repository
            expense_repo = ExpenseRepository(db)

            # Prepare expense data
            expense_amount = data.amount
            expense_date = data.date if isinstance(data.date, date_type) else date_type.fromisoformat(str(data.date))
            expense_description = data.description or f"Expense from receipt: {job.original_filename}"

            # Create expense
            expense = await expense_repo.create_expense(
                tenant_id=current_user.tenant_id,
                user_id=current_user.id,
                amount=expense_amount,
                currency=data.currency or "USD",
                description=expense_description,
                expense_date=expense_date,
                category_id=None,  # User can assign category later
                receipt_url=job.image_path,  # Link to OCR image
                receipt_number=data.receipt_number,
                vendor_name=data.provider,
                notes=f"Auto-created from OCR job {job_id}",
            )

            logger.info(
                f"Successfully created expense {expense.id} from OCR job {job_id}"
            )

        except Exception as e:
            logger.error(f"Failed to create expense from OCR job {job_id}: {e}")
            # Don't fail the confirmation, just log the error
            # The OCR job is still confirmed, expense creation can be retried manually

    return job


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ocr_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete OCR job (soft delete)

    Marks job as deleted without removing from database.
    The associated image file is NOT deleted (for audit purposes).

    Args:
        job_id: OCR job ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        NotFoundError: If job not found
    """
    repo = OCRRepository(db)

    deleted = await repo.delete_job(job_id, current_user.tenant_id)

    if not deleted:
        raise NotFoundError(resource="OCR job", resource_id=str(job_id))

    logger.info(f"Deleted OCR job {job_id}")


@router.get("/stats", response_model=dict)
async def get_ocr_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get OCR processing statistics for tenant

    Returns statistics about OCR job processing including:
    - Count by status
    - Average confidence score
    - Total processed jobs

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dictionary with OCR statistics
    """
    repo = OCRRepository(db)

    stats = await repo.get_job_statistics(
        tenant_id=current_user.tenant_id,
        user_id=None,  # All users in tenant
    )

    logger.info(f"Retrieved OCR stats for tenant {current_user.tenant_id}")

    return stats
