# Quick Start - OCR Module

## 1. Install Dependencies

### System Dependencies (Tesseract)

**macOS:**
```bash
brew install tesseract tesseract-lang
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng
```

**Docker:**
```dockerfile
RUN apt-get update && \
    apt-get install -y tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng && \
    rm -rf /var/lib/apt/lists/*
```

### Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

## 2. Setup

### Automated Setup (Recommended)

```bash
cd backend
./scripts/setup_ocr.sh
```

### Manual Setup

```bash
cd backend

# Create upload directory
mkdir -p uploads/ocr
chmod 755 uploads/ocr

# Run database migration
alembic upgrade head

# Verify installation
python3 scripts/verify_ocr_setup.py
```

---

## 3. Configuration

### Update .env file

```env
# OCR Settings
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=spa+eng
OCR_CONFIDENCE_THRESHOLD=0.75
MAX_IMAGE_SIZE_MB=10

# Celery (required)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Verify Tesseract Path

```bash
which tesseract
# Update TESSERACT_PATH in .env with output
```

---

## 4. Run Application

### Terminal 1: Start Redis (if not running)

```bash
redis-server
```

### Terminal 2: Start Celery Worker

```bash
cd backend
celery -A celery_tasks.celery_app worker --loglevel=info --concurrency=4
```

### Terminal 3: Start API Server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 5. Test OCR

### Create Test Receipt Image

```bash
# Using ImageMagick (if installed)
convert -size 400x200 xc:white \
  -font Arial -pointsize 20 -fill black \
  -annotate +50+50 "SHELL GAS STATION" \
  -annotate +50+80 "Total: \$75.50" \
  -annotate +50+110 "Date: 11/15/2025" \
  test_receipt.jpg

# Or use Python
python3 << 'EOF'
from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (400, 200), color='white')
draw = ImageDraw.Draw(img)
draw.text((50, 50), "SHELL GAS STATION", fill='black')
draw.text((50, 80), "Total: $75.50", fill='black')
draw.text((50, 110), "Date: 11/15/2025", fill='black')
img.save('test_receipt.jpg')
print("Created test_receipt.jpg")
EOF
```

### Test Upload Endpoint

```bash
# 1. First, authenticate and get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }' \
  -c cookies.txt

# 2. Upload receipt
curl -X POST http://localhost:8000/api/v1/ocr/process \
  -b cookies.txt \
  -F "file=@test_receipt.jpg"

# Save the job_id from response
```

### Check Job Status

```bash
# Replace {job_id} with actual ID from previous step
curl http://localhost:8000/api/v1/ocr/jobs/{job_id} \
  -b cookies.txt
```

### List All Jobs

```bash
curl http://localhost:8000/api/v1/ocr/jobs?page=1&page_size=10 \
  -b cookies.txt
```

### Confirm Extraction

```bash
curl -X PUT http://localhost:8000/api/v1/ocr/jobs/{job_id}/confirm \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "confirmed_data": {
      "provider": "Shell Gas Station",
      "amount": 75.50,
      "currency": "USD",
      "date": "2025-11-15",
      "category": "COMBUSTIBLE"
    },
    "create_expense": false
  }'
```

---

## 6. API Documentation

### View Interactive Docs

Open in browser:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### OCR Endpoints

Navigate to the **OCR** section in the docs to see:
- POST /api/v1/ocr/process
- GET /api/v1/ocr/jobs/{job_id}
- GET /api/v1/ocr/jobs
- PUT /api/v1/ocr/jobs/{job_id}/confirm
- DELETE /api/v1/ocr/jobs/{job_id}
- GET /api/v1/ocr/stats

---

## 7. Run Tests

```bash
cd backend

# Run all OCR tests
pytest tests/unit/test_ocr.py -v

# Run with coverage
pytest tests/unit/test_ocr.py --cov=modules.ocr --cov-report=html

# Run specific test
pytest tests/unit/test_ocr.py::test_create_ocr_job -v

# View coverage report
open htmlcov/index.html
```

---

## 8. Monitoring

### Check Celery Queue

```bash
# Active tasks
celery -A celery_tasks.celery_app inspect active

# Registered tasks
celery -A celery_tasks.celery_app inspect registered

# Worker stats
celery -A celery_tasks.celery_app inspect stats
```

### Check Database

```sql
-- Connect to PostgreSQL
psql -U postgres -d onquota

-- View OCR jobs
SELECT id, status, confidence, created_at
FROM ocr_jobs
WHERE is_deleted = false
ORDER BY created_at DESC
LIMIT 10;

-- Statistics
SELECT
  status,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM ocr_jobs
WHERE is_deleted = false
GROUP BY status;
```

### View Logs

```bash
# Application logs
tail -f logs/app.log

# OCR-specific logs
grep "ocr" logs/app.log

# Celery worker logs
# (visible in Celery worker terminal)
```

---

## 9. Python Client Example

```python
import httpx
import time
from pathlib import Path

# Configuration
API_URL = "http://localhost:8000/api/v1"
EMAIL = "your@email.com"
PASSWORD = "yourpassword"

# 1. Login
response = httpx.post(
    f"{API_URL}/auth/login",
    json={"email": EMAIL, "password": PASSWORD}
)
cookies = response.cookies

# 2. Upload receipt
with open("test_receipt.jpg", "rb") as f:
    response = httpx.post(
        f"{API_URL}/ocr/process",
        files={"file": ("receipt.jpg", f, "image/jpeg")},
        cookies=cookies
    )
job = response.json()
print(f"Job created: {job['id']}")

# 3. Poll for completion
job_id = job['id']
while True:
    response = httpx.get(
        f"{API_URL}/ocr/jobs/{job_id}",
        cookies=cookies
    )
    job = response.json()

    print(f"Status: {job['status']}")

    if job['status'] in ['COMPLETED', 'FAILED']:
        break

    time.sleep(2)

# 4. Display results
if job['status'] == 'COMPLETED':
    data = job['extracted_data']
    print(f"\nExtracted Data:")
    print(f"  Provider: {data['provider']}")
    print(f"  Amount: ${data['amount']}")
    print(f"  Date: {data['date']}")
    print(f"  Category: {data['category']}")
    print(f"  Confidence: {job['confidence']}")

    # 5. Confirm extraction
    response = httpx.put(
        f"{API_URL}/ocr/jobs/{job_id}/confirm",
        json={
            "confirmed_data": data,
            "create_expense": True
        },
        cookies=cookies
    )
    print("\nExpense created!")
else:
    print(f"\nError: {job['error_message']}")
```

---

## 10. JavaScript/React Example

```javascript
// OCRUpload.jsx
import React, { useState } from 'react';

const OCRUpload = () => {
  const [file, setFile] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);

    // Upload file
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch('/api/v1/ocr/process', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const uploadJob = await uploadRes.json();

    // Poll for results
    const pollJob = async () => {
      const res = await fetch(`/api/v1/ocr/jobs/${uploadJob.id}`, {
        credentials: 'include',
      });
      const jobData = await res.json();

      if (jobData.status === 'COMPLETED') {
        setJob(jobData);
        setLoading(false);
      } else if (jobData.status === 'FAILED') {
        alert(`Error: ${jobData.error_message}`);
        setLoading(false);
      } else {
        setTimeout(pollJob, 2000);
      }
    };

    pollJob();
  };

  const handleConfirm = async () => {
    await fetch(`/api/v1/ocr/jobs/${job.id}/confirm`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmed_data: job.extracted_data,
        create_expense: true,
      }),
      credentials: 'include',
    });
    alert('Expense created!');
  };

  return (
    <div>
      <h2>Upload Receipt</h2>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit" disabled={!file || loading}>
          {loading ? 'Processing...' : 'Upload'}
        </button>
      </form>

      {job && (
        <div>
          <h3>Extracted Data</h3>
          <p>Provider: {job.extracted_data.provider}</p>
          <p>Amount: ${job.extracted_data.amount}</p>
          <p>Date: {job.extracted_data.date}</p>
          <p>Category: {job.extracted_data.category}</p>
          <p>Confidence: {job.confidence}</p>
          <button onClick={handleConfirm}>Confirm & Create Expense</button>
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
```

---

## 11. Troubleshooting

### Tesseract Not Found

```bash
# Check if installed
tesseract --version

# Find path
which tesseract

# Update .env
TESSERACT_PATH=/usr/local/bin/tesseract
```

### Celery Worker Not Processing

```bash
# Check Redis
redis-cli ping

# Restart Celery
pkill -f celery
celery -A celery_tasks.celery_app worker --loglevel=info
```

### Low Confidence Scores

- Use higher resolution images (300+ DPI)
- Ensure good lighting
- Avoid blurry or tilted images
- Use flash when photographing receipts

### Upload Directory Permissions

```bash
chmod 755 uploads
chmod 755 uploads/ocr
```

---

## 12. Production Deployment

### Environment Variables

```env
# Production .env
DEBUG=False
ENVIRONMENT=production
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=spa+eng
OCR_CONFIDENCE_THRESHOLD=0.85
MAX_IMAGE_SIZE_MB=10
```

### Celery Beat (Maintenance Tasks)

```python
# Add to celery_tasks/__init__.py
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'cleanup-ocr-files': {
        'task': 'modules.ocr.tasks.cleanup_old_ocr_files',
        'schedule': crontab(hour=3, minute=0),
        'args': (30,),
    },
    'reprocess-failed': {
        'task': 'modules.ocr.tasks.reprocess_failed_jobs',
        'schedule': crontab(hour='*/6'),
        'args': (10,),
    },
}
```

Start beat:
```bash
celery -A celery_tasks.celery_app beat --loglevel=info
```

### Monitoring

```bash
# Flower (Celery monitoring)
pip install flower
celery -A celery_tasks.celery_app flower --port=5555

# Open http://localhost:5555
```

---

## 13. Next Steps

1. Configure monitoring (Prometheus/Grafana)
2. Set up backup strategy for image files
3. Review rate limits and quotas
4. Train team on OCR workflows
5. Gather user feedback
6. Iterate on accuracy improvements

---

## 14. Support

- Documentation: `/backend/modules/ocr/README.md`
- API Docs: http://localhost:8000/docs
- Test Suite: `pytest tests/unit/test_ocr.py -v`
- Verification: `python3 scripts/verify_ocr_setup.py`

---

**Ready to use!** Start with step 1 and follow through to get OCR working in your OnQuota installation.
