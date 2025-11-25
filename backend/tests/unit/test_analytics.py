"""
Unit tests for Analytics module
Tests for parser, analyzer, repository, and tasks
"""
import pytest
import pandas as pd
import numpy as np
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta
from decimal import Decimal
import tempfile
import os

from modules.analytics.parser import ExcelParser
from modules.analytics.analyzer import SalesAnalyzer
from modules.analytics.models import Analysis, AnalysisStatus, FileType
from modules.analytics.repository import AnalyticsRepository
from modules.analytics.exporters import ExcelExporter, PDFExporter


class TestExcelParser:
    """Tests for ExcelParser class"""

    def test_validate_file_not_found(self):
        """Test validation with non-existent file"""
        is_valid, error = ExcelParser.validate_file("/non/existent/file.xlsx")
        assert not is_valid
        assert "not found" in error.lower()

    def test_validate_file_unsupported_extension(self, tmp_path):
        """Test validation with unsupported file type"""
        test_file = tmp_path / "test.txt"
        test_file.write_text("test")

        is_valid, error = ExcelParser.validate_file(str(test_file))
        assert not is_valid
        assert "unsupported" in error.lower()

    def test_validate_file_too_large(self, tmp_path):
        """Test validation with file too large"""
        test_file = tmp_path / "large.xlsx"

        # Create a file larger than 50MB
        large_data = b"x" * (51 * 1024 * 1024)
        test_file.write_bytes(large_data)

        is_valid, error = ExcelParser.validate_file(str(test_file))
        assert not is_valid
        assert "too large" in error.lower()

    def test_validate_file_empty(self, tmp_path):
        """Test validation with empty file"""
        test_file = tmp_path / "empty.xlsx"
        test_file.write_bytes(b"")

        is_valid, error = ExcelParser.validate_file(str(test_file))
        assert not is_valid
        assert "empty" in error.lower()

    def test_detect_column_mapping_standard_names(self):
        """Test column detection with standard names"""
        df = pd.DataFrame(columns=["product", "quantity", "unit_price"])
        mapping = ExcelParser.detect_column_mapping(df)

        assert mapping["product"] == "product"
        assert mapping["quantity"] == "quantity"
        assert mapping["unit_price"] == "unit_price"

    def test_detect_column_mapping_spanish_names(self):
        """Test column detection with Spanish column names"""
        df = pd.DataFrame(columns=["Producto", "Cantidad", "Precio"])
        mapping = ExcelParser.detect_column_mapping(df)

        assert "product" in mapping
        assert "quantity" in mapping
        assert "unit_price" in mapping

    def test_detect_column_mapping_with_optional(self):
        """Test column detection including optional columns"""
        df = pd.DataFrame(
            columns=[
                "product",
                "quantity",
                "unit_price",
                "client",
                "date",
                "discount",
                "cost",
            ]
        )
        mapping = ExcelParser.detect_column_mapping(df)

        assert len(mapping) == 7
        assert "client" in mapping
        assert "date" in mapping
        assert "discount" in mapping
        assert "cost" in mapping

    def test_clean_dataframe_removes_empty_rows(self):
        """Test that cleaning removes empty rows"""
        df = pd.DataFrame(
            {
                "product": ["A", None, "B", None],
                "quantity": [1, None, 2, None],
                "unit_price": [10, None, 20, None],
            }
        )

        cleaned = ExcelParser.clean_dataframe(df)
        assert len(cleaned) == 2

    def test_clean_dataframe_removes_duplicates(self):
        """Test that cleaning removes duplicate rows"""
        df = pd.DataFrame(
            {
                "product": ["A", "A", "B"],
                "quantity": [1, 1, 2],
                "unit_price": [10, 10, 20],
            }
        )

        cleaned = ExcelParser.clean_dataframe(df)
        assert len(cleaned) == 2

    def test_parse_csv_file(self, tmp_path):
        """Test parsing a CSV file"""
        # Create test CSV
        csv_file = tmp_path / "test.csv"
        csv_data = """product,quantity,unit_price
Product A,10,50.00
Product B,20,100.00
Product C,5,25.00"""
        csv_file.write_text(csv_data)

        # Parse
        df = ExcelParser.parse(str(csv_file))

        assert len(df) == 3
        assert "product" in df.columns
        assert "quantity" in df.columns
        assert "unit_price" in df.columns
        assert "total" in df.columns  # Derived column

    def test_parse_calculates_derived_columns(self, tmp_path):
        """Test that parsing calculates derived columns"""
        csv_file = tmp_path / "test.csv"
        csv_data = """product,quantity,unit_price,discount,cost
Product A,10,100.00,10,60.00"""
        csv_file.write_text(csv_data)

        df = ExcelParser.parse(str(csv_file))

        assert "total" in df.columns
        assert "discount_amount" in df.columns
        assert "total_after_discount" in df.columns
        assert "margin" in df.columns
        assert "margin_pct" in df.columns

        # Check calculations
        assert df.iloc[0]["total"] == 1000.00  # 10 * 100
        assert df.iloc[0]["discount_amount"] == 100.00  # 1000 * 0.10
        assert df.iloc[0]["total_after_discount"] == 900.00  # 1000 - 100
        assert df.iloc[0]["margin"] == 300.00  # 900 - (10 * 60)

    def test_parse_rejects_missing_required_columns(self, tmp_path):
        """Test that parsing rejects files without required columns"""
        csv_file = tmp_path / "invalid.csv"
        csv_data = """product,quantity
Product A,10"""
        csv_file.write_text(csv_data)

        with pytest.raises(ValueError, match="Missing required columns"):
            ExcelParser.parse(str(csv_file))


class TestSalesAnalyzer:
    """Tests for SalesAnalyzer class"""

    @pytest.fixture
    def sample_data(self):
        """Create sample sales data for testing"""
        return pd.DataFrame(
            {
                "product": ["A", "B", "C", "D", "E"] * 20,
                "client": ["Client 1", "Client 2", "Client 3", "Client 1", "Client 2"]
                * 20,
                "quantity": [100, 50, 25, 10, 5] * 20,
                "unit_price": [10.0, 20.0, 30.0, 40.0, 50.0] * 20,
                "total": [1000.0, 1000.0, 750.0, 400.0, 250.0] * 20,
                "total_after_discount": [1000.0, 1000.0, 750.0, 400.0, 250.0] * 20,
                "date": pd.date_range("2024-01-01", periods=100),
                "discount": [0, 0, 0, 0, 0] * 20,
                "discount_amount": [0, 0, 0, 0, 0] * 20,
                "cost": [5.0, 10.0, 15.0, 20.0, 25.0] * 20,
                "total_cost": [500.0, 500.0, 375.0, 200.0, 125.0] * 20,
                "margin": [500.0, 500.0, 375.0, 200.0, 125.0] * 20,
                "margin_pct": [50.0, 50.0, 50.0, 50.0, 50.0] * 20,
            }
        )

    def test_analyzer_initialization(self, sample_data):
        """Test analyzer initializes correctly"""
        analyzer = SalesAnalyzer(sample_data)

        assert analyzer.df is not None
        assert len(analyzer.df) == len(sample_data)
        assert analyzer.has_client is True
        assert analyzer.has_date is True
        assert analyzer.has_discount is True
        assert analyzer.has_cost is True

    def test_analyzer_empty_dataframe_raises_error(self):
        """Test that empty DataFrame raises error"""
        with pytest.raises(ValueError, match="DataFrame is empty"):
            SalesAnalyzer(pd.DataFrame())

    def test_calculate_summary_stats(self, sample_data):
        """Test summary statistics calculation"""
        analyzer = SalesAnalyzer(sample_data)
        stats = analyzer.calculate_summary_stats()

        assert "total_rows" in stats
        assert "total_sales" in stats
        assert "avg_sale" in stats
        assert "median_sale" in stats
        assert "std_dev" in stats
        assert "percentiles" in stats

        assert stats["total_rows"] == 100
        assert stats["total_sales"] > 0

    def test_abc_analysis_by_product(self, sample_data):
        """Test ABC analysis by product"""
        analyzer = SalesAnalyzer(sample_data)
        abc = analyzer.abc_analysis(by="product")

        assert "A" in abc
        assert "B" in abc
        assert "C" in abc

        # Check structure
        for category in ["A", "B", "C"]:
            assert "count" in abc[category]
            assert "percentage" in abc[category]
            assert "sales" in abc[category]
            assert "sales_pct" in abc[category]

        # Verify totals
        total_count = sum(abc[cat]["count"] for cat in ["A", "B", "C"])
        total_pct = sum(abc[cat]["sales_pct"] for cat in ["A", "B", "C"])

        assert total_count == 5  # 5 unique products
        assert 99 <= total_pct <= 101  # Should be ~100%

    def test_abc_analysis_by_client(self, sample_data):
        """Test ABC analysis by client"""
        analyzer = SalesAnalyzer(sample_data)
        abc = analyzer.abc_analysis(by="client")

        assert "A" in abc
        assert len(abc) == 3  # A, B, C categories

    def test_top_performers_products(self, sample_data):
        """Test top performers calculation for products"""
        analyzer = SalesAnalyzer(sample_data)
        top = analyzer.top_performers(by="product", limit=3)

        assert len(top) <= 3
        assert all("name" in item for item in top)
        assert all("sales" in item for item in top)
        assert all("category" in item for item in top)

        # Verify sorting (descending by sales)
        if len(top) > 1:
            assert top[0]["sales"] >= top[1]["sales"]

    def test_discount_analysis(self, sample_data):
        """Test discount analysis"""
        # Add some discounts
        sample_data.loc[0:10, "discount"] = 10
        sample_data.loc[0:10, "discount_amount"] = (
            sample_data.loc[0:10, "total"] * 0.10
        )

        analyzer = SalesAnalyzer(sample_data)
        discount = analyzer.discount_analysis()

        assert "total_discounts" in discount
        assert "avg_discount_pct" in discount
        assert "discount_by_category" in discount
        assert discount["total_discounts"] > 0

    def test_margin_analysis(self, sample_data):
        """Test margin analysis"""
        analyzer = SalesAnalyzer(sample_data)
        margin = analyzer.margin_analysis()

        assert "total_margin" in margin
        assert "avg_margin_pct" in margin
        assert "margin_by_category" in margin
        assert "top_margin_products" in margin
        assert "bottom_margin_products" in margin

        assert margin["total_margin"] > 0
        assert 0 <= margin["avg_margin_pct"] <= 100

    def test_monthly_trends(self, sample_data):
        """Test monthly trends calculation"""
        analyzer = SalesAnalyzer(sample_data)
        trends = analyzer.monthly_trends()

        assert len(trends) > 0
        assert all("month" in t for t in trends)
        assert all("sales" in t for t in trends)
        assert all("quantity" in t for t in trends)

        # Check growth calculation
        if len(trends) > 1:
            assert "growth_pct" in trends[1]

    def test_generate_insights(self, sample_data):
        """Test insights generation"""
        analyzer = SalesAnalyzer(sample_data)
        insights = analyzer.generate_insights()

        assert isinstance(insights, list)
        assert len(insights) > 0
        assert all(isinstance(i, str) for i in insights)

    def test_generate_full_report(self, sample_data):
        """Test full report generation"""
        analyzer = SalesAnalyzer(sample_data)
        report = analyzer.generate_full_report()

        assert "summary" in report
        assert "abc_analysis" in report
        assert "top_products" in report
        assert "top_clients" in report
        assert "discount_analysis" in report
        assert "margin_analysis" in report
        assert "monthly_trends" in report
        assert "insights" in report


@pytest.mark.asyncio
class TestAnalyticsRepository:
    """Tests for AnalyticsRepository"""

    async def test_create_analysis(self, db_session):
        """Test creating an analysis"""
        # Create tenant and user first
        from models.tenant import Tenant
        from models.user import User, UserRole
        from core.security import get_password_hash

        tenant = Tenant(company_name="Test Company", domain="test.com")
        db_session.add(tenant)
        await db_session.flush()

        user = User(
            tenant_id=tenant.id,
            email="test@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Test User",
            role=UserRole.ADMIN,
        )
        db_session.add(user)
        await db_session.flush()

        # Create analysis
        repo = AnalyticsRepository(db_session)
        analysis = await repo.create_analysis(
            tenant_id=tenant.id,
            user_id=user.id,
            name="Test Analysis",
            description="Test description",
            file_path="/path/to/file.xlsx",
            file_type=FileType.EXCEL,
        )

        assert analysis.id is not None
        assert analysis.name == "Test Analysis"
        assert analysis.status == AnalysisStatus.PENDING
        assert analysis.file_type == FileType.EXCEL

    async def test_get_analysis_by_id(self, db_session):
        """Test getting analysis by ID"""
        from models.tenant import Tenant
        from models.user import User, UserRole
        from core.security import get_password_hash

        tenant = Tenant(company_name="Test Company", domain="test.com")
        db_session.add(tenant)
        await db_session.flush()

        user = User(
            tenant_id=tenant.id,
            email="test@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Test User",
            role=UserRole.ADMIN,
        )
        db_session.add(user)
        await db_session.flush()

        repo = AnalyticsRepository(db_session)
        created = await repo.create_analysis(
            tenant_id=tenant.id,
            user_id=user.id,
            name="Test",
            description=None,
            file_path="/path/to/file.csv",
            file_type=FileType.CSV,
        )

        # Get by ID
        retrieved = await repo.get_analysis_by_id(created.id, tenant.id)

        assert retrieved.id == created.id
        assert retrieved.name == created.name

    async def test_update_analysis_status(self, db_session):
        """Test updating analysis status"""
        from models.tenant import Tenant
        from models.user import User, UserRole
        from core.security import get_password_hash

        tenant = Tenant(company_name="Test Company", domain="test.com")
        db_session.add(tenant)
        await db_session.flush()

        user = User(
            tenant_id=tenant.id,
            email="test@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Test User",
            role=UserRole.ADMIN,
        )
        db_session.add(user)
        await db_session.flush()

        repo = AnalyticsRepository(db_session)
        analysis = await repo.create_analysis(
            tenant_id=tenant.id,
            user_id=user.id,
            name="Test",
            description=None,
            file_path="/path/to/file.csv",
            file_type=FileType.CSV,
        )

        # Update status
        results = {"summary": {"total_sales": 1000}}
        updated = await repo.update_analysis_status(
            analysis_id=analysis.id,
            status=AnalysisStatus.COMPLETED,
            results=results,
            row_count=100,
        )

        assert updated.status == AnalysisStatus.COMPLETED
        assert updated.results == results
        assert updated.row_count == 100

    async def test_get_analyses_pagination(self, db_session):
        """Test getting analyses with pagination"""
        from models.tenant import Tenant
        from models.user import User, UserRole
        from core.security import get_password_hash

        tenant = Tenant(company_name="Test Company", domain="test.com")
        db_session.add(tenant)
        await db_session.flush()

        user = User(
            tenant_id=tenant.id,
            email="test@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Test User",
            role=UserRole.ADMIN,
        )
        db_session.add(user)
        await db_session.flush()

        repo = AnalyticsRepository(db_session)

        # Create multiple analyses
        for i in range(5):
            await repo.create_analysis(
                tenant_id=tenant.id,
                user_id=user.id,
                name=f"Analysis {i}",
                description=None,
                file_path=f"/path/{i}.csv",
                file_type=FileType.CSV,
            )

        # Get first page
        analyses, total = await repo.get_analyses(
            tenant_id=tenant.id, page=1, page_size=3
        )

        assert len(analyses) == 3
        assert total == 5

        # Get second page
        analyses, total = await repo.get_analyses(
            tenant_id=tenant.id, page=2, page_size=3
        )

        assert len(analyses) == 2
        assert total == 5

    async def test_delete_analysis(self, db_session):
        """Test soft deleting an analysis"""
        from models.tenant import Tenant
        from models.user import User, UserRole
        from core.security import get_password_hash

        tenant = Tenant(company_name="Test Company", domain="test.com")
        db_session.add(tenant)
        await db_session.flush()

        user = User(
            tenant_id=tenant.id,
            email="test@test.com",
            hashed_password=get_password_hash("password"),
            full_name="Test User",
            role=UserRole.ADMIN,
        )
        db_session.add(user)
        await db_session.flush()

        repo = AnalyticsRepository(db_session)
        analysis = await repo.create_analysis(
            tenant_id=tenant.id,
            user_id=user.id,
            name="Test",
            description=None,
            file_path="/path/to/file.csv",
            file_type=FileType.CSV,
        )

        # Delete
        result = await repo.delete_analysis(analysis.id, tenant.id)
        assert result is True

        # Verify it's soft deleted
        from core.exceptions import NotFoundError

        with pytest.raises(NotFoundError):
            await repo.get_analysis_by_id(analysis.id, tenant.id)


class TestExporters:
    """Tests for Excel and PDF exporters"""

    @pytest.fixture
    def mock_analysis(self):
        """Create mock analysis with results"""
        analysis = Analysis(
            id=uuid4(),
            tenant_id=uuid4(),
            user_id=uuid4(),
            name="Test Analysis",
            description="Test description",
            file_path="/path/to/file.xlsx",
            file_type=FileType.EXCEL,
            status=AnalysisStatus.COMPLETED,
            row_count=100,
            results={
                "summary": {
                    "total_rows": 100,
                    "total_sales": 50000.0,
                    "avg_sale": 500.0,
                    "median_sale": 450.0,
                    "std_dev": 100.0,
                    "min_sale": 100.0,
                    "max_sale": 1000.0,
                    "percentiles": {"p25": 300, "p50": 450, "p75": 600, "p95": 900},
                },
                "abc_analysis": {
                    "by_product": {
                        "A": {
                            "count": 20,
                            "percentage": 20.0,
                            "sales": 35000.0,
                            "sales_pct": 70.0,
                        },
                        "B": {
                            "count": 30,
                            "percentage": 30.0,
                            "sales": 10000.0,
                            "sales_pct": 20.0,
                        },
                        "C": {
                            "count": 50,
                            "percentage": 50.0,
                            "sales": 5000.0,
                            "sales_pct": 10.0,
                        },
                    }
                },
                "top_products": [
                    {
                        "name": "Product A",
                        "sales": 10000.0,
                        "quantity": 100,
                        "avg_price": 100.0,
                        "category": "A",
                        "percentage_of_total": 20.0,
                    }
                ],
                "insights": ["Test insight 1", "Test insight 2"],
            },
        )
        return analysis

    def test_excel_export_creates_file(self, mock_analysis, tmp_path):
        """Test Excel export creates file"""
        output_path = tmp_path / "export.xlsx"

        result_path = ExcelExporter.export_analysis(
            mock_analysis, str(output_path)
        )

        assert Path(result_path).exists()
        assert Path(result_path).suffix == ".xlsx"

    def test_excel_export_incomplete_analysis_raises_error(self, tmp_path):
        """Test Excel export fails for incomplete analysis"""
        analysis = Analysis(
            id=uuid4(),
            tenant_id=uuid4(),
            user_id=uuid4(),
            name="Test",
            description=None,
            file_path="/path/to/file.xlsx",
            file_type=FileType.EXCEL,
            status=AnalysisStatus.PENDING,
        )

        output_path = tmp_path / "export.xlsx"

        with pytest.raises(ValueError, match="must be completed"):
            ExcelExporter.export_analysis(analysis, str(output_path))

    def test_pdf_export_creates_file(self, mock_analysis, tmp_path):
        """Test PDF export creates file"""
        output_path = tmp_path / "export.pdf"

        result_path = PDFExporter.export_summary(mock_analysis, str(output_path))

        assert Path(result_path).exists()
        assert Path(result_path).suffix == ".pdf"

    def test_pdf_export_incomplete_analysis_raises_error(self, tmp_path):
        """Test PDF export fails for incomplete analysis"""
        analysis = Analysis(
            id=uuid4(),
            tenant_id=uuid4(),
            user_id=uuid4(),
            name="Test",
            description=None,
            file_path="/path/to/file.xlsx",
            file_type=FileType.EXCEL,
            status=AnalysisStatus.PROCESSING,
        )

        output_path = tmp_path / "export.pdf"

        with pytest.raises(ValueError, match="must be completed"):
            PDFExporter.export_summary(analysis, str(output_path))
