"""
Repository for Analytics CRUD operations
Handles database operations for Analysis model
"""
from typing import Optional, Tuple, List
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from models.analysis import Analysis, AnalysisStatus, FileType
from modules.analytics.schemas import AnalysisCreate
from core.exceptions import NotFoundError, ValidationError
import logging

logger = logging.getLogger(__name__)


class AnalyticsRepository:
    """Repository for managing analytics analyses"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_analysis(
        self,
        tenant_id: UUID,
        user_id: UUID,
        name: str,
        description: Optional[str],
        file_path: str,
        file_type: FileType,
    ) -> Analysis:
        """
        Create a new analysis record

        Args:
            tenant_id: Tenant UUID
            user_id: User UUID who created the analysis
            name: Analysis name
            description: Optional description
            file_path: Path to uploaded file
            file_type: Type of file (CSV or EXCEL)

        Returns:
            Created Analysis instance

        Raises:
            ValidationError: If validation fails
        """
        try:
            analysis = Analysis(
                tenant_id=tenant_id,
                user_id=user_id,
                name=name,
                description=description,
                file_path=file_path,
                file_type=file_type,
                status=AnalysisStatus.PENDING,
            )

            self.db.add(analysis)
            await self.db.commit()
            await self.db.refresh(analysis)

            logger.info(f"Created analysis {analysis.id} for tenant {tenant_id}")
            return analysis

        except IntegrityError as e:
            await self.db.rollback()
            logger.error(f"Database integrity error creating analysis: {e}")
            raise ValidationError("Failed to create analysis due to database constraint")

    async def get_analysis_by_id(
        self, analysis_id: UUID, tenant_id: UUID
    ) -> Analysis:
        """
        Get analysis by ID

        Args:
            analysis_id: Analysis UUID
            tenant_id: Tenant UUID

        Returns:
            Analysis instance

        Raises:
            NotFoundError: If analysis not found
        """
        query = select(Analysis).where(
            and_(
                Analysis.id == analysis_id,
                Analysis.tenant_id == tenant_id,
                Analysis.is_deleted == False,
            )
        )

        result = await self.db.execute(query)
        analysis = result.scalar_one_or_none()

        if not analysis:
            raise NotFoundError("Analysis not found")

        return analysis

    async def get_analyses(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        status: Optional[AnalysisStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Analysis], int]:
        """
        Get paginated list of analyses with filters

        Args:
            tenant_id: Tenant UUID
            user_id: Optional filter by user
            status: Optional filter by status
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (analyses list, total count)
        """
        # Build base query
        filters = [
            Analysis.tenant_id == tenant_id,
            Analysis.is_deleted == False,
        ]

        # Apply optional filters
        if user_id:
            filters.append(Analysis.user_id == user_id)
        if status:
            filters.append(Analysis.status == status)

        query = select(Analysis).where(and_(*filters))

        # Get total count
        count_query = select(func.count()).select_from(
            select(Analysis.id).where(and_(*filters)).subquery()
        )
        result = await self.db.execute(count_query)
        total = result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(desc(Analysis.created_at))
        query = query.offset((page - 1) * page_size).limit(page_size)

        # Execute query
        result = await self.db.execute(query)
        analyses = result.scalars().all()

        logger.info(
            f"Retrieved {len(analyses)} analyses for tenant {tenant_id} (total: {total})"
        )

        return list(analyses), total

    async def update_analysis_status(
        self,
        analysis_id: UUID,
        status: AnalysisStatus,
        results: Optional[dict] = None,
        row_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Analysis:
        """
        Update analysis status and results

        Args:
            analysis_id: Analysis UUID
            status: New status
            results: Optional analysis results JSON
            row_count: Optional number of rows processed
            error_message: Optional error message if failed

        Returns:
            Updated Analysis instance

        Raises:
            NotFoundError: If analysis not found
        """
        query = select(Analysis).where(Analysis.id == analysis_id)
        result = await self.db.execute(query)
        analysis = result.scalar_one_or_none()

        if not analysis:
            raise NotFoundError("Analysis not found")

        # Update fields
        analysis.status = status

        if results is not None:
            analysis.results = results

        if row_count is not None:
            analysis.row_count = row_count

        if error_message is not None:
            analysis.error_message = error_message

        await self.db.commit()
        await self.db.refresh(analysis)

        logger.info(f"Updated analysis {analysis_id} status to {status}")
        return analysis

    async def update_analysis(
        self,
        analysis_id: UUID,
        tenant_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Analysis:
        """
        Update analysis metadata

        Args:
            analysis_id: Analysis UUID
            tenant_id: Tenant UUID
            name: Optional new name
            description: Optional new description

        Returns:
            Updated Analysis instance

        Raises:
            NotFoundError: If analysis not found
        """
        analysis = await self.get_analysis_by_id(analysis_id, tenant_id)

        if name is not None:
            analysis.name = name

        if description is not None:
            analysis.description = description

        await self.db.commit()
        await self.db.refresh(analysis)

        logger.info(f"Updated analysis {analysis_id} metadata")
        return analysis

    async def delete_analysis(self, analysis_id: UUID, tenant_id: UUID) -> bool:
        """
        Soft delete an analysis

        Args:
            analysis_id: Analysis UUID
            tenant_id: Tenant UUID

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If analysis not found
        """
        analysis = await self.get_analysis_by_id(analysis_id, tenant_id)
        analysis.soft_delete()
        await self.db.commit()

        logger.info(f"Soft deleted analysis {analysis_id}")
        return True

    async def get_recent_analyses(
        self, tenant_id: UUID, limit: int = 5
    ) -> List[Analysis]:
        """
        Get recent completed analyses

        Args:
            tenant_id: Tenant UUID
            limit: Maximum number of analyses to return

        Returns:
            List of recent analyses
        """
        query = (
            select(Analysis)
            .where(
                and_(
                    Analysis.tenant_id == tenant_id,
                    Analysis.status == AnalysisStatus.COMPLETED,
                    Analysis.is_deleted == False,
                )
            )
            .order_by(desc(Analysis.updated_at))
            .limit(limit)
        )

        result = await self.db.execute(query)
        analyses = result.scalars().all()

        return list(analyses)

    async def get_status_counts(self, tenant_id: UUID) -> dict:
        """
        Get count of analyses by status

        Args:
            tenant_id: Tenant UUID

        Returns:
            Dictionary with status counts
        """
        query = (
            select(
                Analysis.status, func.count(Analysis.id).label("count")
            )
            .where(
                and_(
                    Analysis.tenant_id == tenant_id,
                    Analysis.is_deleted == False,
                )
            )
            .group_by(Analysis.status)
        )

        result = await self.db.execute(query)
        rows = result.all()

        # Convert to dict
        status_counts = {row.status.value: row.count for row in rows}

        # Ensure all statuses are present
        for status in AnalysisStatus:
            if status.value not in status_counts:
                status_counts[status.value] = 0

        return status_counts
