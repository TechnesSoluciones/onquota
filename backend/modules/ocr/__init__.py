"""
OCR Module - Optical Character Recognition for Receipts/Invoices

This module provides automatic data extraction from receipt and invoice images:
- Image upload and validation
- Preprocessing (grayscale, denoise, deskew, threshold)
- Text extraction using Tesseract OCR
- Intelligent data parsing (provider, amount, date, category)
- Asynchronous processing with Celery
- Confidence scoring and error handling

Components:
- models.py: OCRJob database model
- schemas.py: Pydantic request/response schemas
- repository.py: Database operations (CRUD)
- processor.py: Image preprocessing with OpenCV
- engine.py: OCR text extraction and parsing
- tasks.py: Celery async tasks
- router.py: FastAPI endpoints

Usage:
    from modules.ocr.router import router as ocr_router
    app.include_router(ocr_router)
"""

__version__ = "1.0.0"
__all__ = [
    "router",
    "OCRJob",
    "OCRJobStatus",
    "OCRRepository",
    "ImageProcessor",
    "OCREngine",
]

from modules.ocr.router import router
from models.ocr_job import OCRJob, OCRJobStatus
from modules.ocr.repository import OCRRepository
from modules.ocr.processor import ImageProcessor
from modules.ocr.engine import OCREngine
