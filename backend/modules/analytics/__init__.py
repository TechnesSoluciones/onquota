"""
SPA Analytics Module

Provides sales performance analysis from Excel/CSV files including:
- ABC Classification (Pareto Analysis)
- KPIs and summary statistics
- Discount and margin analysis
- Top performers identification
- Monthly trends and insights
"""

from models.analysis import Analysis, AnalysisStatus, FileType
from modules.analytics.schemas import (
    AnalysisCreate,
    AnalysisResponse,
    AnalysisListResponse,
    ABCClassification,
    AnalysisSummary,
)
from modules.analytics.router import router as analytics_router

__all__ = [
    "Analysis",
    "AnalysisStatus",
    "FileType",
    "AnalysisCreate",
    "AnalysisResponse",
    "AnalysisListResponse",
    "ABCClassification",
    "AnalysisSummary",
    "analytics_router",
]
