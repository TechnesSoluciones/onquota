"""
Analytics API endpoints
FastAPI router for SPA Analytics module
"""
from typing import Optional, List
from uuid import UUID
from pathlib import Path
import aiofiles
import os
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Query,
    Request,
)
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.exceptions import NotFoundError, ValidationError
from core.rate_limiter import limiter
from api.dependencies import get_current_user
from models.user import User
from modules.analytics.models import AnalysisStatus, FileType
from modules.analytics.schemas import (
    AnalysisCreate,
    AnalysisResponse,
    AnalysisListResponse,
    FileUploadResponse,
    ABCDetailResponse,
    AnalysisUpdate,
)
from modules.analytics.repository import AnalyticsRepository
from modules.analytics.tasks import process_analysis
from modules.analytics.exporters import ExcelExporter, PDFExporter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Upload configuration
UPLOAD_DIR = Path("uploads/analytics")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


async def save_upload_file(
    upload_file: UploadFile, tenant_id: UUID
) -> tuple[str, FileType]:
    """
    Save uploaded file to disk

    Args:
        upload_file: Uploaded file
        tenant_id: Tenant UUID

    Returns:
        Tuple of (file_path, file_type)

    Raises:
        ValidationError: If file validation fails
    """
    # Validate file extension
    file_extension = Path(upload_file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Determine file type
    if file_extension == ".csv":
        file_type = FileType.CSV
    else:
        file_type = FileType.EXCEL

    # Create tenant directory
    tenant_dir = UPLOAD_DIR / str(tenant_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{upload_file.filename}"
    file_path = tenant_dir / safe_filename

    # Save file with size validation
    total_size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await upload_file.read(8192):  # 8KB chunks
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                # Clean up partial file
                await f.close()
                os.remove(file_path)
                raise ValidationError(f"File too large. Maximum size: 50MB")
            await f.write(chunk)

    logger.info(f"File saved: {file_path} ({total_size} bytes)")
    return str(file_path), file_type


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_analysis_file(
    request: Request,
    file: UploadFile = File(..., description="Excel or CSV file with sales data"),
    name: str = Form(..., min_length=3, max_length=100, description="Analysis name"),
    description: Optional[str] = Form(None, max_length=500, description="Optional description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload sales data file for analysis

    **Accepts:**
    - Excel files (.xlsx, .xls)
    - CSV files (.csv)

    **File Requirements:**
    - Maximum size: 50MB
    - Must contain columns: product, quantity, unit_price
    - Optional columns: client, date, discount, cost

    **Process:**
    1. Validates and saves file
    2. Creates Analysis record with PENDING status
    3. Triggers background processing task
    4. Returns analysis_id for status polling

    **Rate Limit:** 10 uploads per minute per user

    **Security:** Files are isolated by tenant in separate directories
    """
    repo = AnalyticsRepository(db)

    try:
        # Save uploaded file
        file_path, file_type = await save_upload_file(file, current_user.tenant_id)

        # Create analysis record
        analysis = await repo.create_analysis(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            name=name,
            description=description,
            file_path=file_path,
            file_type=file_type,
        )

        # Trigger background processing
        process_analysis.delay(str(analysis.id), file_path)

        logger.info(
            f"Analysis {analysis.id} created and queued for processing by user {current_user.id}"
        )

        return FileUploadResponse(
            analysis_id=analysis.id,
            name=analysis.name,
            file_type=analysis.file_type,
            status=analysis.status,
            message="File uploaded successfully. Analysis is being processed in background.",
        )

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file. Please try again.",
        )


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get analysis by ID with full results

    **Returns:**
    - Analysis metadata (name, status, created_at, etc.)
    - Complete analysis results if COMPLETED
    - Error message if FAILED
    - Processing status if PENDING/PROCESSING

    **Status Values:**
    - `pending`: Waiting to be processed
    - `processing`: Currently being analyzed
    - `completed`: Analysis finished successfully
    - `failed`: Analysis failed (see error_message)

    **Authorization:** User must belong to same tenant as analysis
    """
    repo = AnalyticsRepository(db)

    try:
        analysis = await repo.get_analysis_by_id(analysis_id, current_user.tenant_id)
        return AnalysisResponse.model_validate(analysis)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )


@router.get("/analyses", response_model=AnalysisListResponse)
async def list_analyses(
    status_filter: Optional[AnalysisStatus] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List analyses with pagination and filtering

    **Query Parameters:**
    - `status`: Filter by analysis status (pending, processing, completed, failed)
    - `page`: Page number (starts at 1)
    - `page_size`: Items per page (1-100)

    **Returns:**
    - Paginated list of analyses
    - Total count and page information
    - Summary metrics for completed analyses

    **Sorting:** Results ordered by creation date (newest first)

    **Authorization:** Only returns analyses belonging to user's tenant
    """
    repo = AnalyticsRepository(db)

    analyses, total = await repo.get_analyses(
        tenant_id=current_user.tenant_id,
        status=status_filter,
        page=page,
        page_size=page_size,
    )

    return AnalysisListResponse.create(
        items=analyses, total=total, page=page, page_size=page_size
    )


@router.get("/analyses/{analysis_id}/abc")
async def get_abc_analysis(
    analysis_id: UUID,
    by: str = Query("product", regex="^(product|client)$", description="Classification type"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed ABC classification

    **ABC Analysis:**
    - **Category A:** Top performers (typically 20% of items, 70% of sales)
    - **Category B:** Medium performers (typically 30% of items, 20% of sales)
    - **Category C:** Low performers (typically 50% of items, 10% of sales)

    **Query Parameters:**
    - `by`: Classification type - "product" or "client"

    **Returns:**
    - ABC category statistics
    - Complete list of items with their categories
    - Sales contribution percentages

    **Use Cases:**
    - Inventory optimization (focus on Category A products)
    - Customer segmentation (prioritize Category A clients)
    - Resource allocation decisions

    **Authorization:** User must belong to same tenant as analysis
    """
    repo = AnalyticsRepository(db)

    try:
        analysis = await repo.get_analysis_by_id(analysis_id, current_user.tenant_id)

        if not analysis.is_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Analysis is not completed yet. Current status: {analysis.status}",
            )

        if not analysis.results:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Analysis completed but has no results",
            )

        # Get ABC data
        abc_key = f"by_{by}"
        abc_data = analysis.results.get("abc_analysis", {}).get(abc_key)

        if not abc_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ABC analysis by {by} not available. File may not contain '{by}' column.",
            )

        # Get items list
        items_key = f"top_{by}s"
        items = analysis.results.get(items_key, [])

        return ABCDetailResponse(
            analysis_id=analysis.id,
            analysis_name=analysis.name,
            by=by,
            categories=abc_data,
            items=items,
            total_items=len(items),
            created_at=analysis.created_at,
        )

    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )


@router.get("/analyses/{analysis_id}/export")
async def export_analysis(
    analysis_id: UUID,
    format: str = Query("excel", regex="^(excel|pdf)$", description="Export format"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export analysis results to Excel or PDF

    **Export Formats:**

    **Excel (.xlsx):**
    - Multiple worksheets with formatted data
    - Summary statistics
    - ABC classification details
    - Top products/clients
    - Discount and margin analysis
    - Monthly trends
    - Automated insights
    - Professional formatting with colors

    **PDF (.pdf):**
    - Executive summary report
    - Key metrics and statistics
    - ABC classification overview
    - Top 10 products
    - Key insights
    - Print-ready format

    **Query Parameters:**
    - `format`: "excel" or "pdf"

    **Returns:**
    - Downloadable file with analysis results

    **Authorization:** User must belong to same tenant as analysis
    """
    repo = AnalyticsRepository(db)

    try:
        analysis = await repo.get_analysis_by_id(analysis_id, current_user.tenant_id)

        if not analysis.is_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Analysis is not completed yet. Current status: {analysis.status}",
            )

        # Create exports directory
        exports_dir = Path("exports/analytics") / str(current_user.tenant_id)
        exports_dir.mkdir(parents=True, exist_ok=True)

        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = "".join(c if c.isalnum() else "_" for c in analysis.name)

        if format == "excel":
            filename = f"{safe_name}_{timestamp}.xlsx"
            output_path = exports_dir / filename
            ExcelExporter.export_analysis(analysis, str(output_path))
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:  # pdf
            filename = f"{safe_name}_{timestamp}.pdf"
            output_path = exports_dir / filename
            PDFExporter.export_summary(analysis, str(output_path))
            media_type = "application/pdf"

        logger.info(f"Exported analysis {analysis_id} to {format}: {output_path}")

        return FileResponse(
            path=str(output_path),
            media_type=media_type,
            filename=filename,
        )

    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )
    except Exception as e:
        logger.error(f"Error exporting analysis {analysis_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export analysis",
        )


@router.patch("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def update_analysis(
    analysis_id: UUID,
    data: AnalysisUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update analysis metadata (name, description)

    **Updatable Fields:**
    - name: Analysis name (3-100 characters)
    - description: Optional description (max 500 characters)

    **Note:** Cannot modify analysis results or status through this endpoint

    **Authorization:** User must belong to same tenant as analysis
    """
    repo = AnalyticsRepository(db)

    try:
        analysis = await repo.update_analysis(
            analysis_id=analysis_id,
            tenant_id=current_user.tenant_id,
            name=data.name,
            description=data.description,
        )
        return AnalysisResponse.model_validate(analysis)

    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete analysis (soft delete)

    **Behavior:**
    - Marks analysis as deleted (soft delete)
    - Analysis remains in database but is hidden from queries
    - Original file is preserved (for audit purposes)
    - Can be permanently deleted by cleanup job after 30 days

    **Note:** This operation cannot be undone through the API

    **Authorization:** User must belong to same tenant as analysis
    """
    repo = AnalyticsRepository(db)

    try:
        await repo.delete_analysis(analysis_id, current_user.tenant_id)
        return None

    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get analytics dashboard statistics

    **Returns:**
    - Count of analyses by status
    - Recent completed analyses (last 5)
    - Total rows processed
    - Quick access metrics

    **Use Case:**
    Dashboard overview and quick stats for analytics module

    **Authorization:** Returns stats for user's tenant only
    """
    repo = AnalyticsRepository(db)

    # Get status counts
    status_counts = await repo.get_status_counts(current_user.tenant_id)

    # Get recent analyses
    recent = await repo.get_recent_analyses(current_user.tenant_id, limit=5)

    # Calculate totals
    total_rows = sum(a.row_count for a in recent if a.row_count)
    total_sales = sum(
        a.results.get("summary", {}).get("total_sales", 0)
        for a in recent
        if a.results
    )

    return {
        "status_counts": status_counts,
        "recent_analyses": [
            {
                "id": str(a.id),
                "name": a.name,
                "created_at": a.created_at.isoformat(),
                "row_count": a.row_count,
                "total_sales": (
                    a.results.get("summary", {}).get("total_sales", 0)
                    if a.results
                    else None
                ),
            }
            for a in recent
        ],
        "total_rows_processed": total_rows,
        "total_sales_analyzed": total_sales,
    }
