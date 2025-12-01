"""
Analysis model for SPA Analytics
Stores analysis metadata and results in JSON format
"""
from enum import Enum
from sqlalchemy import Column, String, Text, Integer, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from uuid import uuid4
from models.base import BaseModel


class AnalysisStatus(str, Enum):
    """Status of analysis processing"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileType(str, Enum):
    """Supported file types for analysis"""

    CSV = "csv"
    EXCEL = "excel"


class Analysis(BaseModel):
    """
    Analysis model for storing sales data analysis results

    Attributes:
        id: Unique identifier (UUID)
        tenant_id: Tenant foreign key (from BaseModel)
        user_id: User who created the analysis
        name: Analysis name/title
        description: Optional description
        file_path: Path to uploaded file
        file_type: Type of file (CSV or EXCEL)
        status: Processing status
        row_count: Number of rows processed
        results: JSON containing analysis results
        error_message: Error details if failed
        created_at: Creation timestamp (from BaseModel)
        updated_at: Last update timestamp (from BaseModel)
        is_deleted: Soft delete flag (from BaseModel)
        deleted_at: Deletion timestamp (from BaseModel)

    Results JSON Structure:
    {
        "summary": {
            "total_rows": int,
            "total_sales": float,
            "avg_sale": float,
            "median_sale": float,
            "std_dev": float,
            "percentiles": {"p25": float, "p50": float, "p75": float, "p95": float}
        },
        "abc_analysis": {
            "by_product": {
                "A": {"count": int, "percentage": float, "sales": float, "sales_pct": float},
                "B": {...},
                "C": {...}
            },
            "by_client": {...}  # If client column exists
        },
        "top_products": [
            {"name": str, "sales": float, "quantity": int, "avg_price": float, "category": str},
            ...
        ],
        "top_clients": [...],  # If client column exists
        "discount_analysis": {
            "total_discounts": float,
            "avg_discount_pct": float,
            "discount_by_category": {"A": float, "B": float, "C": float},
            "top_discounted_products": [...]
        },  # If discount column exists
        "margin_analysis": {
            "total_margin": float,
            "avg_margin_pct": float,
            "margin_by_category": {"A": float, "B": float, "C": float},
            "top_margin_products": [...],
            "bottom_margin_products": [...]
        },  # If cost column exists
        "monthly_trends": [
            {
                "month": str,
                "sales": float,
                "quantity": int,
                "avg_price": float,
                "growth_pct": float
            },
            ...
        ],  # If date column exists
        "insights": [str, str, ...]  # Automated insights
    }
    """

    __tablename__ = "analyses"

    # User relationship
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Analysis metadata
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # File information
    file_path = Column(String(500), nullable=False)
    file_type = Column(
        SQLEnum(FileType, name="file_type"),
        nullable=False,
        index=True,
    )

    # Processing status
    status = Column(
        SQLEnum(AnalysisStatus, name="analysis_status"),
        default=AnalysisStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Results
    row_count = Column(Integer, nullable=True)
    results = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", backref="analyses")

    def __repr__(self):
        return f"<Analysis(id={self.id}, name='{self.name}', status='{self.status}')>"

    @property
    def is_completed(self) -> bool:
        """Check if analysis is completed"""
        return self.status == AnalysisStatus.COMPLETED

    @property
    def is_failed(self) -> bool:
        """Check if analysis failed"""
        return self.status == AnalysisStatus.FAILED

    @property
    def is_processing(self) -> bool:
        """Check if analysis is currently processing"""
        return self.status == AnalysisStatus.PROCESSING

    def get_abc_category(self, item_name: str, by: str = "product") -> str:
        """
        Get ABC category for a specific product or client

        Args:
            item_name: Name of product or client
            by: Type of analysis ("product" or "client")

        Returns:
            ABC category ("A", "B", "C") or None if not found
        """
        if not self.results or not self.is_completed:
            return None

        key = f"by_{by}"
        abc_data = self.results.get("abc_analysis", {}).get(key, {})

        # Search in top items for the category
        top_items = self.results.get(f"top_{by}s", [])
        for item in top_items:
            if item.get("name") == item_name:
                return item.get("category")

        return None
