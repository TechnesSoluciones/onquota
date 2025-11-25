# OCR Module - Quick Start Guide

## Inicio Rápido en 5 Minutos

### 1. Instalar Tesseract

**macOS:**
```bash
brew install tesseract tesseract-lang
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng
```

**Verificar instalación:**
```bash
tesseract --version
# Tesseract Open Source OCR Engine v5.x
```

### 2. Configurar Variables de Entorno

Crear/editar `.env` en la raíz del backend:

```env
# OCR Configuration
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=spa+eng
OCR_CONFIDENCE_THRESHOLD=0.85
MAX_IMAGE_SIZE_MB=10
```

**macOS:** Si Tesseract está en otro path:
```bash
which tesseract
# Actualizar TESSERACT_PATH con el resultado
```

### 3. Aplicar Migración de Base de Datos

```bash
cd /Users/josegomez/Documents/Code/OnQuota/backend
alembic upgrade head
```

Esto creará la tabla `ocr_jobs` y todos sus índices.

### 4. Iniciar Servicios

**Terminal 1 - FastAPI:**
```bash
cd /Users/josegomez/Documents/Code/OnQuota/backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
cd /Users/josegomez/Documents/Code/OnQuota/backend
celery -A celery_tasks.celery_app worker --loglevel=info --concurrency=4
```

**Terminal 3 - Redis (si no está corriendo):**
```bash
redis-server
```

### 5. Probar el API

**Paso 1: Autenticarse**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

Guardar el `access_token` de la respuesta.

**Paso 2: Subir una factura**
```bash
curl -X POST "http://localhost:8000/api/v1/ocr/process" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE" \
  -F "file=@/path/to/receipt.jpg"
```

Respuesta:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "PENDING",
  "original_filename": "receipt.jpg",
  "created_at": "2025-11-15T10:30:00Z"
}
```

**Paso 3: Verificar el estado**
```bash
curl "http://localhost:8000/api/v1/ocr/jobs/123e4567-e89b-12d3-a456-426614174000" \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

Respuesta (cuando COMPLETED):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
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
        "total": 75.50
      }
    ]
  },
  "processing_time_seconds": 3.45
}
```

---

## Uso desde Python

```python
import httpx
import time

# 1. Login
response = httpx.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "admin@example.com", "password": "password"}
)
token = response.json()["access_token"]

# 2. Upload receipt
with open("receipt.jpg", "rb") as f:
    files = {"file": ("receipt.jpg", f, "image/jpeg")}
    response = httpx.post(
        "http://localhost:8000/api/v1/ocr/process",
        files=files,
        cookies={"access_token": token}
    )
    job = response.json()
    job_id = job["id"]

print(f"Job created: {job_id}")

# 3. Poll for completion
while True:
    response = httpx.get(
        f"http://localhost:8000/api/v1/ocr/jobs/{job_id}",
        cookies={"access_token": token}
    )
    job = response.json()

    print(f"Status: {job['status']}")

    if job["status"] in ["COMPLETED", "FAILED"]:
        break

    time.sleep(2)

# 4. Display results
if job["status"] == "COMPLETED":
    data = job["extracted_data"]
    print(f"\nProvider: {data['provider']}")
    print(f"Amount: ${data['amount']} {data['currency']}")
    print(f"Date: {data['date']}")
    print(f"Category: {data['category']}")
    print(f"Confidence: {job['confidence']:.2%}")
else:
    print(f"\nError: {job['error_message']}")
```

---

## Uso desde JavaScript/TypeScript

```typescript
// 1. Upload receipt
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const uploadResponse = await fetch('/api/v1/ocr/process', {
  method: 'POST',
  body: formData,
  credentials: 'include' // Important for cookies
});

const job = await uploadResponse.json();
console.log('Job created:', job.id);

// 2. Poll for completion
let completed = false;
while (!completed) {
  const statusResponse = await fetch(`/api/v1/ocr/jobs/${job.id}`, {
    credentials: 'include'
  });

  const jobStatus = await statusResponse.json();
  console.log('Status:', jobStatus.status);

  if (jobStatus.status === 'COMPLETED') {
    console.log('Extracted data:', jobStatus.extracted_data);
    completed = true;
  } else if (jobStatus.status === 'FAILED') {
    console.error('Error:', jobStatus.error_message);
    completed = true;
  } else {
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

---

## Testing

### Ejecutar Tests Unitarios

```bash
cd /Users/josegomez/Documents/Code/OnQuota/backend

# Todos los tests de OCR
pytest tests/unit/test_ocr.py -v

# Test específico
pytest tests/unit/test_ocr.py::test_create_ocr_job -v

# Con cobertura
pytest tests/unit/test_ocr.py --cov=modules.ocr --cov-report=html

# Ver reporte
open htmlcov/index.html
```

### Test Manual con Imagen de Prueba

1. **Descargar imagen de prueba:**
   ```bash
   curl -o test_receipt.jpg https://example.com/sample_receipt.jpg
   ```

2. **O crear una imagen de prueba simple:**
   ```bash
   # Usando ImageMagick
   convert -size 800x600 xc:white \
     -pointsize 32 -draw "text 50,100 'Shell Gas Station'" \
     -pointsize 24 -draw "text 50,150 'Date: 11/15/2025'" \
     -pointsize 24 -draw "text 50,200 'Total: \$75.50'" \
     test_receipt.jpg
   ```

3. **Subir al API:**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/ocr/process" \
     -H "Cookie: access_token=$TOKEN" \
     -F "file=@test_receipt.jpg"
   ```

---

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'pytesseract'"

**Solución:**
```bash
pip install pytesseract opencv-python Pillow
```

### Error: "TesseractNotFoundError"

**Solución:**
```bash
# Instalar Tesseract
brew install tesseract  # macOS
sudo apt-get install tesseract-ocr  # Ubuntu

# Verificar path
which tesseract

# Actualizar .env
TESSERACT_PATH=/usr/local/bin/tesseract  # o el path correcto
```

### Error: "Connection refused" (Celery)

**Solución:**
```bash
# Verificar que Redis esté corriendo
redis-cli ping
# Debe responder: PONG

# Si no está corriendo
redis-server

# Verificar que Celery worker esté activo
celery -A celery_tasks.celery_app inspect active
```

### Job Stuck en "PENDING"

**Causas comunes:**
1. Celery worker no está corriendo
2. Redis no está disponible
3. Error en la configuración de Celery

**Solución:**
```bash
# 1. Verificar worker
celery -A celery_tasks.celery_app status

# 2. Ver logs del worker
celery -A celery_tasks.celery_app worker --loglevel=debug

# 3. Reiniciar worker
# Ctrl+C para detener
celery -A celery_tasks.celery_app worker --loglevel=info
```

### Baja Confidence Score (< 0.5)

**Causas:**
- Imagen borrosa o de baja calidad
- Texto muy pequeño
- Mal iluminación
- Formato no estándar

**Soluciones:**
1. Asegurar que la imagen tenga al menos 300x300px
2. Usar mejor iluminación al fotografiar
3. Evitar ángulos inclinados
4. Usar scanner en lugar de foto (mejor calidad)
5. Aumentar DPI a 300+ para documentos escaneados

### Job en "FAILED"

**Ver error:**
```bash
curl "http://localhost:8000/api/v1/ocr/jobs/{job_id}" \
  -H "Cookie: access_token=$TOKEN" \
  | jq '.error_message'
```

**Errores comunes:**

1. **"Insufficient text extracted"**
   - Imagen no contiene texto legible
   - Probar con otra imagen

2. **"Invalid image file"**
   - Archivo corrupto
   - Formato no soportado

3. **"File too large"**
   - Imagen > 10MB
   - Reducir tamaño o comprimir

---

## Monitoreo

### Ver Jobs Activos en Celery

```bash
celery -A celery_tasks.celery_app inspect active
```

### Ver Jobs en Cola

```bash
celery -A celery_tasks.celery_app inspect reserved
```

### Flower (UI para Celery)

**Iniciar Flower:**
```bash
celery -A celery_tasks.celery_app flower --port=5555
```

**Abrir en navegador:**
```
http://localhost:5555
```

Desde Flower puedes ver:
- Tasks activas
- Tasks completadas
- Workers conectados
- Gráficos de performance
- Logs en tiempo real

### Ver Estadísticas de OCR

```bash
curl "http://localhost:8000/api/v1/ocr/stats" \
  -H "Cookie: access_token=$TOKEN"
```

---

## Desarrollo

### Estructura del Código

```
modules/ocr/
├── __init__.py          # Exports del módulo
├── models.py            # SQLAlchemy model (OCRJob)
├── schemas.py           # Pydantic schemas
├── repository.py        # Database operations
├── processor.py         # Image preprocessing
├── engine.py            # OCR text extraction
├── tasks.py             # Celery async tasks
└── router.py            # FastAPI endpoints
```

### Agregar Nuevo Proveedor

Editar `modules/ocr/engine.py`:

```python
KNOWN_PROVIDERS = {
    # ... proveedores existentes ...
    "nuevo_proveedor",  # Agregar aquí
}
```

### Agregar Nueva Categoría

Editar `modules/ocr/engine.py`:

```python
CATEGORY_KEYWORDS = {
    # ... categorías existentes ...
    "NUEVA_CATEGORIA": ["keyword1", "keyword2", "keyword3"],
}
```

### Modificar Pipeline de Procesamiento

Editar `modules/ocr/processor.py`, método `preprocess()`:

```python
def preprocess(image_path: str, output_path: Optional[str] = None) -> np.ndarray:
    # ... código existente ...

    # Agregar nuevo paso
    processed = my_new_processing_step(processed)

    return processed
```

---

## Recursos

### Documentación Completa
- `/modules/ocr/README.md` - Documentación detallada
- `/modules/ocr/IMPLEMENTATION_SUMMARY.md` - Resumen de implementación

### Links Útiles
- Tesseract Docs: https://tesseract-ocr.github.io/
- OpenCV Docs: https://docs.opencv.org/
- Celery Docs: https://docs.celeryproject.org/
- FastAPI Docs: https://fastapi.tiangolo.com/

### Soporte
- Issues: https://github.com/onquota/backend/issues
- Email: support@onquota.com

---

## Próximos Pasos

Después de configurar el módulo:

1. Integrar con el módulo de Expenses para auto-crear gastos
2. Configurar tareas programadas en Celery Beat
3. Implementar Google Cloud Vision como alternativa
4. Agregar WebSocket para updates en tiempo real
5. Configurar S3 para almacenamiento en producción

---

**Version:** 1.0.0
**Última actualización:** 2025-11-15
