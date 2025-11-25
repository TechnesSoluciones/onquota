# OCR Module - Optical Character Recognition for Receipts/Invoices

## Overview

The OCR module provides automatic data extraction from receipt and invoice images using Tesseract OCR and intelligent data parsing. It processes images asynchronously using Celery and returns structured data with confidence scores.

## Features

- **Image Upload & Validation**: Supports JPG, PNG, and PDF files (max 10MB)
- **Preprocessing**: Automatic image enhancement (grayscale, denoise, deskew, threshold)
- **OCR Extraction**: Text extraction using Tesseract OCR (multi-language support)
- **Intelligent Parsing**: Extracts provider, amount, date, category, and line items
- **Async Processing**: Background processing with Celery (no API blocking)
- **Confidence Scoring**: Each extraction includes confidence score (0-1)
- **User Confirmation**: Users can review and edit extracted data
- **Multi-tenant**: Fully isolated by tenant_id

## Architecture

```
modules/ocr/
├── __init__.py         # Module exports
├── models.py           # OCRJob SQLAlchemy model
├── schemas.py          # Pydantic validation schemas
├── repository.py       # Database CRUD operations
├── processor.py        # Image preprocessing (OpenCV)
├── engine.py           # OCR text extraction (Tesseract)
├── tasks.py            # Celery async tasks
└── router.py           # FastAPI endpoints
```

## Database Schema

### Table: `ocr_jobs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Multi-tenant isolation |
| user_id | UUID | User who uploaded |
| image_path | String(500) | File path on server |
| original_filename | String(255) | Original filename |
| file_size | Numeric | File size in bytes |
| mime_type | String(50) | MIME type |
| status | Enum | PENDING, PROCESSING, COMPLETED, FAILED |
| confidence | Numeric(4,3) | Confidence score (0.000-1.000) |
| extracted_data | JSONB | Extracted structured data |
| raw_text | Text | Raw OCR text |
| error_message | Text | Error details (if failed) |
| retry_count | Numeric(2,0) | Retry attempts |
| processing_time_seconds | Numeric(6,2) | Processing duration |
| ocr_engine | String(50) | OCR engine used |
| is_confirmed | String(10) | User confirmation status |
| confirmed_data | JSONB | User-confirmed data |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |
| is_deleted | Boolean | Soft delete flag |
| deleted_at | DateTime | Deletion timestamp |

### Indexes

- `ix_ocr_jobs_tenant_status`: Fast filtering by tenant and status
- `ix_ocr_jobs_tenant_user`: Filter by tenant and user
- `ix_ocr_jobs_created_at`: Sort by creation date
- `ix_ocr_jobs_pending`: Find pending jobs for processing
- `ix_ocr_jobs_extracted_data_gin`: Fast JSON queries (GIN index)

## API Endpoints

### POST /api/v1/ocr/process

Upload and process receipt/invoice image.

**Request:**
- Multipart form data
- `file`: Image file (JPG, PNG, PDF)
- `ocr_engine`: Optional OCR engine ("tesseract" or "google_vision")

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "status": "PENDING",
  "original_filename": "receipt.jpg",
  "created_at": "2025-11-15T10:30:00Z"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/ocr/process" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -F "file=@receipt.jpg"
```

### GET /api/v1/ocr/jobs/{job_id}

Get OCR job status and results.

**Response (COMPLETED):**
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "confidence": 0.92,
  "extracted_data": {
    "provider": "Shell Gas Station",
    "amount": 75.50,
    "currency": "USD",
    "date": "2025-11-15",
    "category": "COMBUSTIBLE",
    "receipt_number": "INV-12345",
    "items": [
      {
        "description": "Gasoline Premium",
        "quantity": 12.5,
        "unit_price": 4.25,
        "total": 53.13
      }
    ],
    "tax_amount": 6.04,
    "subtotal": 69.46
  },
  "processing_time_seconds": 3.45
}
```

### GET /api/v1/ocr/jobs

List OCR jobs with pagination.

**Query Parameters:**
- `status`: Filter by status (PENDING, PROCESSING, COMPLETED, FAILED)
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "items": [...],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

### PUT /api/v1/ocr/jobs/{job_id}/confirm

Confirm and optionally edit OCR results.

**Request:**
```json
{
  "confirmed_data": {
    "provider": "Shell Gas Station",
    "amount": 75.50,
    "currency": "USD",
    "date": "2025-11-15",
    "category": "COMBUSTIBLE"
  },
  "create_expense": false
}
```

### DELETE /api/v1/ocr/jobs/{job_id}

Soft delete OCR job (image file is retained).

**Response:** 204 No Content

### GET /api/v1/ocr/stats

Get OCR statistics for tenant.

**Response:**
```json
{
  "pending": 5,
  "processing": 2,
  "completed": 150,
  "failed": 3,
  "average_confidence": 0.87,
  "total_processed": 153
}
```

## Image Processing Pipeline

1. **Validation**: Check format, size, and readability
2. **Grayscale Conversion**: Convert to single channel
3. **Resize**: Scale down large images (max 3000px)
4. **Denoising**: Remove image noise (fastNlMeansDenoising)
5. **Contrast Enhancement**: Apply CLAHE algorithm
6. **Deskewing**: Detect and correct rotation (Hough Line Transform)
7. **Binarization**: Adaptive thresholding for OCR

## OCR Data Extraction

### Provider Detection
1. Match against known providers database (Texaco, Shell, Hilton, etc.)
2. Extract from first 5 lines if not found
3. Return confidence score (0.95 for known, 0.6 for extracted)

### Amount Extraction
Supports multiple formats:
- `Total: $XX.XX`
- `Amount: XX.XX USD`
- `Grand Total: $1,234.56`

### Date Extraction
Supports formats:
- `DD/MM/YYYY`, `MM/DD/YYYY`
- `YYYY-MM-DD`
- `DD-MMM-YYYY` (e.g., 22-Oct-2025)
- `Month DD, YYYY` (e.g., October 22, 2025)

### Category Classification
Categories:
- **COMBUSTIBLE**: Gas stations, fuel
- **TRANSPORTE**: Taxi, Uber, bus, toll
- **ALOJAMIENTO**: Hotels, lodging
- **ALIMENTACION**: Restaurants, food
- **OFICINA**: Office supplies
- **MANTENIMIENTO**: Repairs, maintenance
- **EQUIPAMIENTO**: Equipment, hardware
- **OTROS**: Default fallback

## Celery Tasks

### `process_ocr_job(job_id, image_path)`

Main processing task (async).

**Workflow:**
1. Update status to PROCESSING
2. Validate image
3. Preprocess image
4. Extract text with Tesseract
5. Parse structured data
6. Update job with results
7. Retry up to 3 times on failure

**Retry Policy:**
- Max retries: 3
- Retry delay: 60 seconds

### `cleanup_old_ocr_files(days=30)`

Maintenance task to delete old image files.

**Recommended Schedule:** Daily at 3 AM

```python
# celerybeat_schedule.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-ocr-files': {
        'task': 'modules.ocr.tasks.cleanup_old_ocr_files',
        'schedule': crontab(hour=3, minute=0),
        'args': (30,),  # 30 days
    },
}
```

### `reprocess_failed_jobs(max_jobs=10)`

Retry failed jobs that haven't exceeded retry limit.

**Recommended Schedule:** Every 6 hours

## Configuration

### Environment Variables

```env
# OCR Settings
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=spa+eng
OCR_CONFIDENCE_THRESHOLD=0.75
MAX_IMAGE_SIZE_MB=10

# Optional: Google Vision API
GOOGLE_VISION_API_KEY=your_api_key_here
```

### Install Tesseract

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng
```

**macOS:**
```bash
brew install tesseract tesseract-lang
```

**Docker:**
```dockerfile
RUN apt-get update && \
    apt-get install -y tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng && \
    rm -rf /var/lib/apt/lists/*
```

## Testing

Run OCR tests:

```bash
# All OCR tests
pytest tests/unit/test_ocr.py -v

# Specific test
pytest tests/unit/test_ocr.py::test_create_ocr_job -v

# With coverage
pytest tests/unit/test_ocr.py --cov=modules.ocr --cov-report=html
```

## Usage Example

### Python Client

```python
import httpx

# Upload receipt
with open("receipt.jpg", "rb") as f:
    files = {"file": ("receipt.jpg", f, "image/jpeg")}
    response = httpx.post(
        "http://localhost:8000/api/v1/ocr/process",
        files=files,
        cookies={"access_token": token}
    )
    job = response.json()

# Poll for completion
import time
while True:
    response = httpx.get(
        f"http://localhost:8000/api/v1/ocr/jobs/{job['id']}",
        cookies={"access_token": token}
    )
    job = response.json()

    if job["status"] in ["COMPLETED", "FAILED"]:
        break

    time.sleep(2)

# Confirm extraction
if job["status"] == "COMPLETED":
    confirm_data = {
        "confirmed_data": job["extracted_data"],
        "create_expense": True
    }
    response = httpx.put(
        f"http://localhost:8000/api/v1/ocr/jobs/{job['id']}/confirm",
        json=confirm_data,
        cookies={"access_token": token}
    )
```

## Performance Optimization

### Image Preprocessing
- Resize large images to max 3000px
- Process in memory (no intermediate files)
- Parallel processing with Celery workers

### Database
- GIN indexes for fast JSON queries
- Partial indexes for pending jobs
- Connection pooling (5-10 connections)

### Caching
- Cache known providers list
- Cache category keywords
- Redis for distributed locks

## Error Handling

### Common Errors

**Image too large:**
```json
{
  "detail": "File too large. Maximum size: 10MB"
}
```

**Invalid format:**
```json
{
  "detail": "Invalid file type. Allowed types: .jpg, .jpeg, .png, .pdf"
}
```

**Processing failed:**
```json
{
  "status": "FAILED",
  "error_message": "Insufficient text extracted from image. Please ensure image is clear and contains readable text.",
  "retry_count": 3
}
```

### Retry Logic

Jobs are automatically retried up to 3 times with 60-second delays. After 3 failures, status remains FAILED and manual intervention is required.

## Security Considerations

1. **Multi-tenant Isolation**: All queries filtered by tenant_id
2. **File Validation**: Strict format and size checks
3. **Path Sanitization**: Prevent directory traversal
4. **Authentication Required**: All endpoints require valid JWT token
5. **Rate Limiting**: Prevent abuse (configured in main.py)

## Monitoring

### Key Metrics

- OCR jobs processed per day
- Average confidence score
- Processing time percentiles (p50, p95, p99)
- Failure rate by category
- Storage usage (image files)

### Logs

All OCR operations are logged with structured logging:

```json
{
  "event": "ocr_job_completed",
  "job_id": "uuid",
  "confidence": 0.92,
  "processing_time": 3.45,
  "provider": "Shell"
}
```

## Future Enhancements

- [ ] Google Cloud Vision integration
- [ ] PDF multi-page support
- [ ] Batch processing endpoint
- [ ] Real-time WebSocket updates
- [ ] ML model for category prediction
- [ ] Duplicate receipt detection
- [ ] Auto-create expenses from confirmed data
- [ ] Export to accounting software (QuickBooks, Xero)

## Troubleshooting

### Tesseract not found

```bash
# Check if Tesseract is installed
tesseract --version

# Update TESSERACT_PATH in .env
TESSERACT_PATH=/usr/local/bin/tesseract
```

### Low confidence scores

- Ensure image is clear and well-lit
- Check image resolution (min 300x300px)
- Try preprocessing manually before upload
- Use higher DPI for scanned documents (300+ DPI)

### Processing stuck in PENDING

- Check Celery worker status: `celery -A celery_tasks.celery_app status`
- Restart worker: `celery -A celery_tasks.celery_app worker --loglevel=info`
- Check task queue: `celery -A celery_tasks.celery_app inspect active`

## Support

For issues or questions:
- Email: support@onquota.com
- Docs: https://docs.onquota.com/ocr
- GitHub: https://github.com/onquota/backend/issues
