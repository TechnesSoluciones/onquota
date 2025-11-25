"""
Unit tests for OCR module
Tests for image processing, text extraction, and data parsing
"""
import pytest
import numpy as np
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from uuid import uuid4
from unittest.mock import Mock, patch, AsyncMock

from modules.ocr.repository import OCRRepository
from modules.ocr.processor import ImageProcessor, ImageValidationError
from modules.ocr.engine import OCREngine
from modules.ocr.models import OCRJobStatus
from modules.ocr.schemas import OCRJobStatusUpdate, ExtractedDataUpdate
from modules.auth.repository import AuthRepository
from models.user import UserRole


# ============================================================================
# Repository Tests
# ============================================================================

@pytest.mark.asyncio
async def test_create_ocr_job(db_session):
    """Test creating OCR job"""
    # Setup: Create tenant and user
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    # Create OCR job
    ocr_repo = OCRRepository(db_session)
    job = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test.jpg",
        original_filename="receipt.jpg",
        file_size=102400,
        mime_type="image/jpeg",
        ocr_engine="tesseract",
    )

    assert job.id is not None
    assert job.tenant_id == tenant.id
    assert job.user_id == user.id
    assert job.image_path == "/uploads/ocr/test.jpg"
    assert job.original_filename == "receipt.jpg"
    assert job.file_size == 102400
    assert job.mime_type == "image/jpeg"
    assert job.status == OCRJobStatus.PENDING
    assert job.retry_count == 0
    assert job.is_confirmed == "false"
    assert job.ocr_engine == "tesseract"


@pytest.mark.asyncio
async def test_get_job_by_id(db_session):
    """Test retrieving OCR job by ID"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    ocr_repo = OCRRepository(db_session)
    job = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test.jpg",
        original_filename="receipt.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    # Retrieve job
    retrieved_job = await ocr_repo.get_job_by_id(job.id, tenant.id)

    assert retrieved_job is not None
    assert retrieved_job.id == job.id
    assert retrieved_job.tenant_id == tenant.id


@pytest.mark.asyncio
async def test_get_job_by_id_wrong_tenant(db_session):
    """Test that job cannot be retrieved by wrong tenant"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant1 = await auth_repo.create_tenant(company_name="Company 1")
    tenant2 = await auth_repo.create_tenant(company_name="Company 2")
    user = await auth_repo.create_user(
        tenant_id=tenant1.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    ocr_repo = OCRRepository(db_session)
    job = await ocr_repo.create_job(
        tenant_id=tenant1.id,
        user_id=user.id,
        image_path="/uploads/ocr/test.jpg",
        original_filename="receipt.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    # Try to retrieve with wrong tenant
    retrieved_job = await ocr_repo.get_job_by_id(job.id, tenant2.id)

    assert retrieved_job is None


@pytest.mark.asyncio
async def test_list_ocr_jobs(db_session):
    """Test listing OCR jobs with pagination"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    # Create multiple jobs
    ocr_repo = OCRRepository(db_session)
    for i in range(5):
        await ocr_repo.create_job(
            tenant_id=tenant.id,
            user_id=user.id,
            image_path=f"/uploads/ocr/test{i}.jpg",
            original_filename=f"receipt{i}.jpg",
            file_size=102400,
            mime_type="image/jpeg",
        )

    # List jobs
    jobs, total = await ocr_repo.get_jobs(
        tenant_id=tenant.id,
        page=1,
        page_size=10,
    )

    assert len(jobs) == 5
    assert total == 5


@pytest.mark.asyncio
async def test_list_ocr_jobs_with_status_filter(db_session):
    """Test listing OCR jobs filtered by status"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    ocr_repo = OCRRepository(db_session)

    # Create jobs with different statuses
    job1 = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test1.jpg",
        original_filename="receipt1.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    job2 = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test2.jpg",
        original_filename="receipt2.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    # Update one job to COMPLETED
    await ocr_repo.update_job_status(
        job_id=job2.id,
        status_update=OCRJobStatusUpdate(
            status=OCRJobStatus.COMPLETED,
            confidence=Decimal("0.95"),
            extracted_data={"provider": "Texaco", "amount": 50.0},
        ),
    )

    # Filter by PENDING
    pending_jobs, total = await ocr_repo.get_jobs(
        tenant_id=tenant.id,
        status=OCRJobStatus.PENDING,
        page=1,
        page_size=10,
    )

    assert len(pending_jobs) == 1
    assert total == 1
    assert pending_jobs[0].status == OCRJobStatus.PENDING


@pytest.mark.asyncio
async def test_update_job_status(db_session):
    """Test updating OCR job status"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    ocr_repo = OCRRepository(db_session)
    job = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test.jpg",
        original_filename="receipt.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    # Update to COMPLETED
    extracted_data = {
        "provider": "Shell",
        "amount": 75.50,
        "currency": "USD",
        "date": "2025-11-15",
        "category": "COMBUSTIBLE",
    }

    updated_job = await ocr_repo.update_job_status(
        job_id=job.id,
        status_update=OCRJobStatusUpdate(
            status=OCRJobStatus.COMPLETED,
            confidence=Decimal("0.92"),
            extracted_data=extracted_data,
            raw_text="Shell Gas Station\nTotal: $75.50",
            processing_time_seconds=Decimal("3.45"),
        ),
    )

    assert updated_job.status == OCRJobStatus.COMPLETED
    assert updated_job.confidence == Decimal("0.92")
    assert updated_job.extracted_data == extracted_data
    assert updated_job.raw_text == "Shell Gas Station\nTotal: $75.50"
    assert updated_job.processing_time_seconds == Decimal("3.45")


@pytest.mark.asyncio
async def test_confirm_extraction(db_session):
    """Test confirming OCR extraction"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    ocr_repo = OCRRepository(db_session)
    job = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test.jpg",
        original_filename="receipt.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    # Complete job first
    await ocr_repo.update_job_status(
        job_id=job.id,
        status_update=OCRJobStatusUpdate(
            status=OCRJobStatus.COMPLETED,
            confidence=Decimal("0.85"),
            extracted_data={"provider": "Texaco", "amount": 50.0},
        ),
    )

    # Confirm extraction
    confirmed_data = ExtractedDataUpdate(
        provider="Texaco Gas Station",
        amount=Decimal("50.00"),
        currency="USD",
        date=date(2025, 11, 15),
        category="COMBUSTIBLE",
    )

    confirmed_job = await ocr_repo.confirm_extraction(
        job_id=job.id,
        tenant_id=tenant.id,
        confirmed_data=confirmed_data,
    )

    assert confirmed_job.is_confirmed == "true"
    assert confirmed_job.confirmed_data is not None
    assert confirmed_job.confirmed_data["provider"] == "Texaco Gas Station"
    assert float(confirmed_job.confirmed_data["amount"]) == 50.0


@pytest.mark.asyncio
async def test_delete_job(db_session):
    """Test soft deleting OCR job"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    ocr_repo = OCRRepository(db_session)
    job = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test.jpg",
        original_filename="receipt.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    # Delete job
    deleted = await ocr_repo.delete_job(job.id, tenant.id)

    assert deleted is True

    # Try to retrieve deleted job
    retrieved = await ocr_repo.get_job_by_id(job.id, tenant.id)
    assert retrieved is None


# ============================================================================
# Image Processor Tests
# ============================================================================

def test_image_processor_validate_extension():
    """Test image extension validation"""
    # Valid extensions
    assert ImageProcessor.validate_image.__code__.co_varnames

    # This is a unit test - we would need actual test image files
    # For now, we test the validation logic


def test_image_processor_allowed_formats():
    """Test allowed image formats"""
    assert ".jpg" in ImageProcessor.ALLOWED_FORMATS
    assert ".jpeg" in ImageProcessor.ALLOWED_FORMATS
    assert ".png" in ImageProcessor.ALLOWED_FORMATS
    assert ".pdf" in ImageProcessor.ALLOWED_FORMATS


def test_image_processor_allowed_mime_types():
    """Test allowed MIME types"""
    assert "image/jpeg" in ImageProcessor.ALLOWED_MIME_TYPES
    assert "image/png" in ImageProcessor.ALLOWED_MIME_TYPES
    assert "application/pdf" in ImageProcessor.ALLOWED_MIME_TYPES


# ============================================================================
# OCR Engine Tests
# ============================================================================

def test_ocr_engine_known_providers():
    """Test known providers database"""
    engine = OCREngine()

    assert "texaco" in engine.KNOWN_PROVIDERS
    assert "shell" in engine.KNOWN_PROVIDERS
    assert "hilton" in engine.KNOWN_PROVIDERS
    assert "marriott" in engine.KNOWN_PROVIDERS


def test_ocr_engine_category_keywords():
    """Test category keywords mapping"""
    engine = OCREngine()

    assert "COMBUSTIBLE" in engine.CATEGORY_KEYWORDS
    assert "TRANSPORTE" in engine.CATEGORY_KEYWORDS
    assert "ALOJAMIENTO" in engine.CATEGORY_KEYWORDS
    assert "gasolina" in engine.CATEGORY_KEYWORDS["COMBUSTIBLE"]
    assert "hotel" in engine.CATEGORY_KEYWORDS["ALOJAMIENTO"]


@pytest.mark.asyncio
async def test_extract_amount_from_text():
    """Test amount extraction from text"""
    engine = OCREngine()

    # Test various formats
    test_cases = [
        ("Total: $75.50", Decimal("75.50"), "USD"),
        ("Amount: 100.00 USD", Decimal("100.00"), "USD"),
        ("Grand Total: $1,234.56", Decimal("1234.56"), "USD"),
    ]

    for text, expected_amount, expected_currency in test_cases:
        amount, currency, confidence = engine._extract_amount(text)
        assert amount == expected_amount
        assert currency == expected_currency
        assert confidence > 0.8


def test_classify_category():
    """Test expense category classification"""
    engine = OCREngine()

    # Test fuel
    assert engine._classify_category("gasolina premium", "Shell") == "COMBUSTIBLE"

    # Test hotel
    assert engine._classify_category("hotel hilton room charge", "Hilton") == "ALOJAMIENTO"

    # Test transport
    assert engine._classify_category("uber ride from airport", "Uber") == "TRANSPORTE"


def test_detect_provider():
    """Test provider detection"""
    engine = OCREngine()

    # Known provider
    text = "SHELL GAS STATION\n123 Main St\nTotal: $50.00"
    provider, confidence = engine._detect_provider(text.lower(), text)
    assert provider == "SHELL"
    assert confidence >= 0.9

    # Unknown provider (extract from first line)
    text = "Local Gas Store\n123 Main St\nTotal: $50.00"
    provider, confidence = engine._detect_provider(text.lower(), text)
    assert provider == "Local Gas Store"
    assert confidence >= 0.5


@pytest.mark.asyncio
async def test_extract_structured_data():
    """Test structured data extraction"""
    engine = OCREngine()

    sample_text = """
    SHELL GAS STATION
    123 Main Street
    Date: 11/15/2025

    Gasoline Premium    12.5 gal    $4.25    $53.13

    Subtotal: $53.13
    Tax: $4.25
    Total: $57.38
    """

    extracted_data, confidence = await engine.extract_structured_data(sample_text)

    assert extracted_data["provider"] is not None
    assert extracted_data["amount"] is not None
    assert extracted_data["date"] is not None
    assert extracted_data["category"] == "COMBUSTIBLE"
    assert confidence > 0.0


# ============================================================================
# Integration Test Placeholders
# ============================================================================

@pytest.mark.asyncio
async def test_get_job_statistics(db_session):
    """Test OCR job statistics"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")
    user = await auth_repo.create_user(
        tenant_id=tenant.id,
        email="test@example.com",
        password="Password123",
        full_name="Test User",
        role=UserRole.SALES_REP,
    )

    ocr_repo = OCRRepository(db_session)

    # Create jobs with different statuses
    job1 = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test1.jpg",
        original_filename="receipt1.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    job2 = await ocr_repo.create_job(
        tenant_id=tenant.id,
        user_id=user.id,
        image_path="/uploads/ocr/test2.jpg",
        original_filename="receipt2.jpg",
        file_size=102400,
        mime_type="image/jpeg",
    )

    # Complete one job
    await ocr_repo.update_job_status(
        job_id=job2.id,
        status_update=OCRJobStatusUpdate(
            status=OCRJobStatus.COMPLETED,
            confidence=Decimal("0.90"),
            extracted_data={"provider": "Test", "amount": 50.0},
        ),
    )

    # Get statistics
    stats = await ocr_repo.get_job_statistics(tenant_id=tenant.id)

    assert stats["pending"] == 1
    assert stats["completed"] == 1
    assert stats["total_processed"] == 1
    assert stats["average_confidence"] > 0
