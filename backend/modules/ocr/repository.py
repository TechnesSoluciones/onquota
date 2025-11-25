"""
Repository layer for OCR jobs
Handles all database operations for OCR module
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from modules.ocr.models import OCRJob, OCRJobStatus
from modules.ocr.schemas import OCRJobStatusUpdate, ExtractedDataUpdate
from core.logging import get_logger

logger = get_logger(__name__)


class OCRRepository:
    """Repository for OCR job operations"""

    def __init__(self, db: AsyncSession):
        """
        Initialize repository

        Args:
            db: Async database session
        """
        self.db = db

    async def create_job(
        self,
        tenant_id: UUID,
        user_id: UUID,
        image_path: str,
        original_filename: str,
        file_size: int,
        mime_type: str,
        ocr_engine: str = "tesseract",
    ) -> OCRJob:
        """
        Create new OCR job

        Args:
            tenant_id: Tenant ID
            user_id: User ID
            image_path: Path to stored image
            original_filename: Original filename
            file_size: File size in bytes
            mime_type: MIME type
            ocr_engine: OCR engine to use

        Returns:
            Created OCRJob instance
        """
        job = OCRJob(
            tenant_id=tenant_id,
            user_id=user_id,
            image_path=image_path,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=mime_type,
            status=OCRJobStatus.PENDING,
            ocr_engine=ocr_engine,
            retry_count=0,
            is_confirmed="false",
        )

        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        logger.info(f"Created OCR job {job.id} for tenant {tenant_id}")
        return job

    async def get_job_by_id(
        self,
        job_id: UUID,
        tenant_id: UUID,
    ) -> Optional[OCRJob]:
        """
        Get OCR job by ID

        Args:
            job_id: Job ID
            tenant_id: Tenant ID (for security)

        Returns:
            OCRJob instance or None
        """
        query = select(OCRJob).where(
            and_(
                OCRJob.id == job_id,
                OCRJob.tenant_id == tenant_id,
                OCRJob.is_deleted == False,
            )
        )

        result = await self.db.execute(query)
        job = result.scalar_one_or_none()

        if job:
            logger.debug(f"Retrieved OCR job {job_id}")
        else:
            logger.warning(f"OCR job {job_id} not found for tenant {tenant_id}")

        return job

    async def get_jobs(
        self,
        tenant_id: UUID,
        status: Optional[OCRJobStatus] = None,
        user_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[OCRJob], int]:
        """
        Get paginated list of OCR jobs

        Args:
            tenant_id: Tenant ID
            status: Filter by status (optional)
            user_id: Filter by user (optional)
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (jobs list, total count)
        """
        # Build base query
        conditions = [
            OCRJob.tenant_id == tenant_id,
            OCRJob.is_deleted == False,
        ]

        if status:
            conditions.append(OCRJob.status == status)

        if user_id:
            conditions.append(OCRJob.user_id == user_id)

        # Count query
        count_query = select(func.count(OCRJob.id)).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Jobs query with pagination
        offset = (page - 1) * page_size
        jobs_query = (
            select(OCRJob)
            .where(and_(*conditions))
            .order_by(OCRJob.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )

        result = await self.db.execute(jobs_query)
        jobs = result.scalars().all()

        logger.info(f"Retrieved {len(jobs)} OCR jobs for tenant {tenant_id} (page {page}/{(total + page_size - 1) // page_size})")

        return list(jobs), total

    async def update_job_status(
        self,
        job_id: UUID,
        status_update: OCRJobStatusUpdate,
    ) -> Optional[OCRJob]:
        """
        Update OCR job status and results

        Args:
            job_id: Job ID
            status_update: Status update data

        Returns:
            Updated OCRJob instance or None
        """
        query = select(OCRJob).where(OCRJob.id == job_id)
        result = await self.db.execute(query)
        job = result.scalar_one_or_none()

        if not job:
            logger.error(f"OCR job {job_id} not found for status update")
            return None

        # Update fields
        job.status = status_update.status

        if status_update.confidence is not None:
            job.confidence = status_update.confidence

        if status_update.extracted_data is not None:
            job.extracted_data = status_update.extracted_data

        if status_update.raw_text is not None:
            job.raw_text = status_update.raw_text

        if status_update.error_message is not None:
            job.error_message = status_update.error_message

        if status_update.processing_time_seconds is not None:
            job.processing_time_seconds = status_update.processing_time_seconds

        # Increment retry count if failed
        if status_update.status == OCRJobStatus.FAILED:
            job.retry_count += 1

        await self.db.commit()
        await self.db.refresh(job)

        logger.info(f"Updated OCR job {job_id} status to {status_update.status}")
        return job

    async def confirm_extraction(
        self,
        job_id: UUID,
        tenant_id: UUID,
        confirmed_data: ExtractedDataUpdate,
    ) -> Optional[OCRJob]:
        """
        Confirm and optionally edit extracted data

        Args:
            job_id: Job ID
            tenant_id: Tenant ID
            confirmed_data: User-confirmed data

        Returns:
            Updated OCRJob instance or None
        """
        job = await self.get_job_by_id(job_id, tenant_id)

        if not job:
            return None

        if job.status != OCRJobStatus.COMPLETED:
            logger.warning(f"Cannot confirm job {job_id} - status is {job.status}")
            return None

        # Convert to dict
        confirmed_dict = confirmed_data.model_dump()

        # Convert date to ISO string
        if confirmed_dict.get("date"):
            confirmed_dict["date"] = confirmed_dict["date"].isoformat()

        # Convert Decimals to float for JSON
        for key in ["amount", "tax_amount", "subtotal"]:
            if key in confirmed_dict and confirmed_dict[key] is not None:
                confirmed_dict[key] = float(confirmed_dict[key])

        # Convert items
        if confirmed_dict.get("items"):
            for item in confirmed_dict["items"]:
                for key in ["quantity", "unit_price", "total"]:
                    if key in item and item[key] is not None:
                        item[key] = float(item[key])

        job.confirmed_data = confirmed_dict
        job.is_confirmed = "true"

        await self.db.commit()
        await self.db.refresh(job)

        logger.info(f"Confirmed extraction for OCR job {job_id}")
        return job

    async def delete_job(
        self,
        job_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """
        Soft delete OCR job

        Args:
            job_id: Job ID
            tenant_id: Tenant ID

        Returns:
            True if deleted, False if not found
        """
        job = await self.get_job_by_id(job_id, tenant_id)

        if not job:
            return False

        job.soft_delete()
        await self.db.commit()

        logger.info(f"Soft deleted OCR job {job_id}")
        return True

    async def get_pending_jobs(self, limit: int = 10) -> List[OCRJob]:
        """
        Get pending jobs for processing

        Args:
            limit: Maximum number of jobs to return

        Returns:
            List of pending OCRJob instances
        """
        query = (
            select(OCRJob)
            .where(
                and_(
                    OCRJob.status == OCRJobStatus.PENDING,
                    OCRJob.is_deleted == False,
                    OCRJob.retry_count < 3,  # Max 3 retries
                )
            )
            .order_by(OCRJob.created_at.asc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        jobs = result.scalars().all()

        logger.info(f"Retrieved {len(jobs)} pending OCR jobs")
        return list(jobs)

    async def get_job_statistics(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
    ) -> dict:
        """
        Get OCR job statistics for tenant

        Args:
            tenant_id: Tenant ID
            user_id: Filter by user (optional)

        Returns:
            Dictionary with statistics
        """
        conditions = [
            OCRJob.tenant_id == tenant_id,
            OCRJob.is_deleted == False,
        ]

        if user_id:
            conditions.append(OCRJob.user_id == user_id)

        # Count by status
        stats = {}
        for status in OCRJobStatus:
            count_query = select(func.count(OCRJob.id)).where(
                and_(
                    *conditions,
                    OCRJob.status == status,
                )
            )
            result = await self.db.execute(count_query)
            stats[status.value] = result.scalar_one()

        # Average confidence for completed jobs
        avg_conf_query = select(func.avg(OCRJob.confidence)).where(
            and_(
                *conditions,
                OCRJob.status == OCRJobStatus.COMPLETED,
                OCRJob.confidence.isnot(None),
            )
        )
        result = await self.db.execute(avg_conf_query)
        avg_confidence = result.scalar_one()
        stats["average_confidence"] = float(avg_confidence) if avg_confidence else 0.0

        # Total processed
        stats["total_processed"] = stats.get("completed", 0) + stats.get("failed", 0)

        logger.debug(f"Retrieved OCR statistics for tenant {tenant_id}: {stats}")
        return stats
