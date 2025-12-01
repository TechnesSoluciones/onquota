"""
Celery tasks for asynchronous analytics processing
Handles background processing of uploaded sales data files
"""
from celery import shared_task
from uuid import UUID
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def process_analysis(self, analysis_id: str, file_path: str):
    """
    Process sales data analysis asynchronously

    This task:
    1. Validates and parses the uploaded file
    2. Runs comprehensive sales analysis
    3. Generates insights and metrics
    4. Updates the Analysis record with results

    Args:
        self: Celery task instance (bound)
        analysis_id: UUID of the Analysis record
        file_path: Path to the uploaded file

    Returns:
        dict: Analysis results summary

    Raises:
        Exception: On processing errors (will trigger retry)
    """
    from modules.analytics.parser import ExcelParser
    from modules.analytics.analyzer import SalesAnalyzer
    from models.analysis import AnalysisStatus
    from modules.analytics.repository import AnalyticsRepository
    from core.database import AsyncSessionLocal

    logger.info(f"Starting analysis processing for {analysis_id}")

    try:
        # Create async database session
        async def run_async_task():
            async with AsyncSessionLocal() as db:
                repo = AnalyticsRepository(db)

                # Step 1: Update status to PROCESSING
                await repo.update_analysis_status(
                    analysis_id=UUID(analysis_id),
                    status=AnalysisStatus.PROCESSING,
                )
                logger.info(f"Analysis {analysis_id} status updated to PROCESSING")

                # Step 2: Validate file
                is_valid, error_msg = ExcelParser.validate_file(file_path)
                if not is_valid:
                    await repo.update_analysis_status(
                        analysis_id=UUID(analysis_id),
                        status=AnalysisStatus.FAILED,
                        error_message=f"File validation failed: {error_msg}",
                    )
                    logger.error(f"File validation failed for {analysis_id}: {error_msg}")
                    return {"status": "failed", "error": error_msg}

                # Step 3: Parse file
                try:
                    df = ExcelParser.parse(file_path)
                    row_count = len(df)
                    logger.info(f"Successfully parsed {row_count} rows from {file_path}")
                except Exception as parse_error:
                    error_message = f"File parsing error: {str(parse_error)}"
                    await repo.update_analysis_status(
                        analysis_id=UUID(analysis_id),
                        status=AnalysisStatus.FAILED,
                        error_message=error_message,
                    )
                    logger.error(f"Parsing failed for {analysis_id}: {parse_error}")
                    return {"status": "failed", "error": error_message}

                # Step 4: Run analysis
                try:
                    analyzer = SalesAnalyzer(df)
                    results = analyzer.generate_full_report()
                    logger.info(f"Analysis completed for {analysis_id}")
                except Exception as analysis_error:
                    error_message = f"Analysis error: {str(analysis_error)}"
                    await repo.update_analysis_status(
                        analysis_id=UUID(analysis_id),
                        status=AnalysisStatus.FAILED,
                        error_message=error_message,
                    )
                    logger.error(f"Analysis failed for {analysis_id}: {analysis_error}")
                    return {"status": "failed", "error": error_message}

                # Step 5: Update with results
                await repo.update_analysis_status(
                    analysis_id=UUID(analysis_id),
                    status=AnalysisStatus.COMPLETED,
                    results=results,
                    row_count=row_count,
                )

                logger.info(
                    f"Analysis {analysis_id} completed successfully. "
                    f"Processed {row_count} rows"
                )

                return {
                    "status": "completed",
                    "analysis_id": analysis_id,
                    "row_count": row_count,
                    "total_sales": results.get("summary", {}).get("total_sales", 0),
                }

        # Run the async task in event loop
        import asyncio
        return asyncio.run(run_async_task())

    except Exception as exc:
        logger.error(
            f"Critical error processing analysis {analysis_id}: {exc}",
            exc_info=True
        )

        # Retry the task (up to max_retries times)
        try:
            raise self.retry(exc=exc, countdown=120)
        except self.MaxRetriesExceededError:
            # Max retries exceeded, mark as failed
            logger.error(f"Max retries exceeded for analysis {analysis_id}")

            async def mark_failed():
                async with AsyncSessionLocal() as db:
                    repo = AnalyticsRepository(db)
                    await repo.update_analysis_status(
                        analysis_id=UUID(analysis_id),
                        status=AnalysisStatus.FAILED,
                        error_message=f"Processing failed after multiple retries: {str(exc)}",
                    )

            import asyncio
            asyncio.run(mark_failed())

            return {
                "status": "failed",
                "error": "Maximum retries exceeded",
                "details": str(exc),
            }


@shared_task
def cleanup_old_analysis_files(days_old: int = 30):
    """
    Clean up old analysis files from storage

    Args:
        days_old: Delete files older than this many days

    Returns:
        dict: Cleanup statistics
    """
    from datetime import datetime, timedelta
    from models.analysis import Analysis
    from core.database import AsyncSessionLocal
    import os

    logger.info(f"Starting cleanup of analysis files older than {days_old} days")

    async def run_cleanup():
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select, and_

            cutoff_date = datetime.utcnow() - timedelta(days=days_old)

            # Find old deleted analyses
            query = select(Analysis).where(
                and_(
                    Analysis.is_deleted == True,
                    Analysis.deleted_at < cutoff_date,
                )
            )

            result = await db.execute(query)
            old_analyses = result.scalars().all()

            deleted_count = 0
            error_count = 0

            for analysis in old_analyses:
                try:
                    # Delete physical file
                    if analysis.file_path and os.path.exists(analysis.file_path):
                        os.remove(analysis.file_path)
                        logger.info(f"Deleted file: {analysis.file_path}")

                    # Hard delete from database
                    await db.delete(analysis)
                    deleted_count += 1

                except Exception as e:
                    logger.error(f"Error deleting analysis {analysis.id}: {e}")
                    error_count += 1

            await db.commit()

            logger.info(
                f"Cleanup completed. Deleted: {deleted_count}, Errors: {error_count}"
            )

            return {
                "deleted_count": deleted_count,
                "error_count": error_count,
                "cutoff_date": cutoff_date.isoformat(),
            }

    import asyncio
    return asyncio.run(run_cleanup())


@shared_task
def reprocess_failed_analysis(analysis_id: str):
    """
    Retry processing a failed analysis

    Args:
        analysis_id: UUID of the failed Analysis

    Returns:
        dict: Reprocessing result
    """
    from models.analysis import AnalysisStatus
    from modules.analytics.repository import AnalyticsRepository
    from core.database import AsyncSessionLocal

    logger.info(f"Reprocessing failed analysis {analysis_id}")

    async def run_reprocess():
        async with AsyncSessionLocal() as db:
            repo = AnalyticsRepository(db)

            # Get the analysis
            try:
                analysis = await repo.get_analysis_by_id(
                    UUID(analysis_id), None  # Skip tenant check for admin task
                )
            except Exception as e:
                logger.error(f"Analysis {analysis_id} not found: {e}")
                return {"status": "error", "message": "Analysis not found"}

            # Check if it's actually failed
            if analysis.status != AnalysisStatus.FAILED:
                return {
                    "status": "error",
                    "message": f"Analysis status is {analysis.status}, not FAILED",
                }

            # Reset status to PENDING
            await repo.update_analysis_status(
                analysis_id=UUID(analysis_id),
                status=AnalysisStatus.PENDING,
                error_message=None,
            )

            # Trigger processing task
            process_analysis.delay(analysis_id, analysis.file_path)

            logger.info(f"Reprocessing triggered for analysis {analysis_id}")
            return {
                "status": "success",
                "message": "Analysis reprocessing started",
                "analysis_id": analysis_id,
            }

    import asyncio
    return asyncio.run(run_reprocess())


@shared_task
def generate_analysis_summary_report(tenant_id: str, start_date: str, end_date: str):
    """
    Generate summary report for all analyses in a date range

    Args:
        tenant_id: UUID of the tenant
        start_date: Start date (ISO format)
        end_date: End date (ISO format)

    Returns:
        dict: Summary report data
    """
    from datetime import datetime
    from sqlalchemy import select, and_, between
    from models.analysis import Analysis, AnalysisStatus
    from core.database import AsyncSessionLocal

    logger.info(f"Generating summary report for tenant {tenant_id}")

    async def run_report():
        async with AsyncSessionLocal() as db:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)

            # Query all completed analyses in date range
            query = select(Analysis).where(
                and_(
                    Analysis.tenant_id == UUID(tenant_id),
                    Analysis.status == AnalysisStatus.COMPLETED,
                    Analysis.is_deleted == False,
                    between(Analysis.created_at, start, end),
                )
            )

            result = await db.execute(query)
            analyses = result.scalars().all()

            # Aggregate statistics
            total_analyses = len(analyses)
            total_rows_processed = sum(
                a.row_count for a in analyses if a.row_count
            )
            total_sales = sum(
                a.results.get("summary", {}).get("total_sales", 0)
                for a in analyses
                if a.results
            )

            summary = {
                "tenant_id": tenant_id,
                "period": {"start": start_date, "end": end_date},
                "total_analyses": total_analyses,
                "total_rows_processed": total_rows_processed,
                "total_sales_analyzed": total_sales,
                "analyses": [
                    {
                        "id": str(a.id),
                        "name": a.name,
                        "created_at": a.created_at.isoformat(),
                        "row_count": a.row_count,
                        "total_sales": (
                            a.results.get("summary", {}).get("total_sales", 0)
                            if a.results
                            else 0
                        ),
                    }
                    for a in analyses
                ],
            }

            logger.info(
                f"Summary report generated for tenant {tenant_id}: "
                f"{total_analyses} analyses"
            )

            return summary

    import asyncio
    return asyncio.run(run_report())
