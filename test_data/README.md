# Datos de Prueba - OnQuota

Este directorio contiene archivos de prueba para todas las funcionalidades del sistema OnQuota.

## 📁 Estructura

```
test_data/
├── ocr/                    # Facturas y recibos para OCR
├── analytics/              # Datasets CSV/Excel para Analytics
└── README.md              # Este archivo
```

## 🧾 Archivos OCR

Facturas de texto simuladas para probar el módulo de OCR:

### 1. `factura_ejemplo.txt` - Gasolinera Texaco
- **Proveedor:** Texaco Estación de Servicio
- **Monto:** $35.71
- **Fecha:** 15/11/2025
- **Categoría:** Combustible
- **RUC:** 1234567890001

**Uso:**
```bash
# Desde la interfaz web
1. Ir a /ocr/upload
2. Subir factura_ejemplo.txt
3. El sistema debería extraer:
   - Provider: "TEXACO"
   - Amount: 35.71
   - Date: 2025-11-15
   - Category: "Combustible"
```

### 2. `recibo_restaurante.txt` - Restaurante La Casa Grande
- **Proveedor:** Restaurante La Casa Grande
- **Monto:** $34.50
- **Categoría:** Alimentación
- **Incluye:** IVA 12% + Servicio 10%

### 3. `peaje_autopista.txt` - Peaje Santa Elena
- **Monto:** $3.50
- **Categoría:** Transporte/Peajes
- **Vehículo:** XYZ-7890

### 4. `supermercado.txt` - Supermercado Mi Comisariato
- **Monto:** $88.95
- **Categoría:** Compras/Alimentación
- **17 artículos** con descuento de tarjeta cliente

### 5. `parking.txt` - Estacionamiento Plaza Mall
- **Monto:** $4.00
- **Tiempo:** 4 horas 15 minutos
- **Categoría:** Estacionamiento

### 6. `farmacia.txt` - Farmacias Cruz Azul
- **Monto:** $84.04
- **Categoría:** Salud/Medicamentos
- **Incluye:** Medicamentos con receta + OTC

---

## 📊 Archivos Analytics (SPA)

Datasets CSV para análisis de ventas:

### 1. `ventas_ejemplo.csv`
**Descripción:** Dataset de ventas de productos tecnológicos y accesorios

**Especificaciones:**
- **Registros:** 48 transacciones
- **Período:** Enero-Febrero 2025
- **Productos:** 40 SKUs diferentes
- **Vendedores:** 4 (Juan Perez, Maria Garcia, Carlos Lopez, Ana Martinez)
- **Clientes:** 5 empresas

**Columnas:**
- `Codigo` - SKU del producto
- `Descripcion` - Nombre del producto
- `Cantidad` - Unidades vendidas
- `Precio_Unitario` - Precio por unidad
- `Descuento` - Porcentaje de descuento (0-35%)
- `Total` - Monto total (después de descuento)
- `Fecha` - Fecha de venta
- `Cliente` - Nombre del cliente
- `Vendedor` - Nombre del vendedor
- `Categoria` - Categoría del producto

**Análisis esperados:**
- **ABC Analysis:**
  - A (70%): ~8-10 productos top
  - B (20%): ~12-15 productos medios
  - C (10%): ~18-20 productos bajos
- **Top producto:** Laptop Dell XPS 15
- **Descuento promedio:** ~15-18%
- **Mejor vendedor:** Juan Perez
- **Mejor cliente:** Corporativo SA

**Uso:**
```bash
# Desde la interfaz web
1. Ir a /analytics/upload
2. Subir ventas_ejemplo.csv
3. El sistema generará:
   - Clasificación ABC (Pareto)
   - Top 10 productos
   - Análisis de descuentos
   - Ventas por vendedor
   - Ventas por categoría
   - Tendencias mensuales
   - Export a Excel (8 hojas)
```

### 2. `ventas_grandes.csv`
**Descripción:** Dataset de ventas B2B (enterprise)

**Especificaciones:**
- **Registros:** 31 transacciones
- **Período:** Enero-Febrero 2025
- **Ticket promedio:** $8,000-$15,000
- **Productos:** Servidores, Storage, Redes, Software

**Columnas:**
- `SKU` - Código del producto
- `Product_Name` - Nombre del producto
- `Qty` - Cantidad
- `Unit_Price` - Precio unitario
- `Discount_Pct` - Descuento %
- `Net_Amount` - Total neto
- `Sale_Date` - Fecha
- `Customer_ID` - ID del cliente
- `Region` - Región de venta
- `Category` - Categoría

**Productos incluidos:**
- Servidores Dell PowerEdge
- Storage NetApp
- Switches Cisco
- Firewalls Fortinet
- Licencias VMware, Microsoft 365
- UPS, Racks, Cableado

---

## 🚀 Cómo Usar los Datos de Prueba

### Opción 1: Interfaz Web

1. **Iniciar Docker:**
   ```bash
   cd /path/to/OnQuota
   docker-compose up -d
   ```

2. **Crear cuenta:**
   - Ir a http://localhost:3000/register
   - Crear empresa y usuario admin

3. **Probar OCR:**
   - Ir a http://localhost:3000/ocr/upload
   - Arrastrar archivos de `test_data/ocr/`
   - Revisar resultados extraídos

4. **Probar Analytics:**
   - Ir a http://localhost:3000/analytics/upload
   - Subir `ventas_ejemplo.csv` o `ventas_grandes.csv`
   - Esperar procesamiento (~10-30 segundos)
   - Ver dashboard de análisis

### Opción 2: API (cURL)

**1. Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa.com",
    "password": "tu-password"
  }' \
  -c cookies.txt
```

**2. Subir archivo OCR:**
```bash
curl -X POST http://localhost:8000/api/v1/ocr/upload \
  -b cookies.txt \
  -F "file=@test_data/ocr/factura_ejemplo.txt"
```

**3. Subir archivo Analytics:**
```bash
curl -X POST http://localhost:8000/api/v1/analytics/upload \
  -b cookies.txt \
  -F "file=@test_data/analytics/ventas_ejemplo.csv"
```

### Opción 3: Python Script

```python
import requests

# Login
session = requests.Session()
login_response = session.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "admin@empresa.com", "password": "password"}
)

# Upload OCR
with open("test_data/ocr/factura_ejemplo.txt", "rb") as f:
    ocr_response = session.post(
        "http://localhost:8000/api/v1/ocr/upload",
        files={"file": f}
    )
    print(f"OCR Job ID: {ocr_response.json()['id']}")

# Upload Analytics
with open("test_data/analytics/ventas_ejemplo.csv", "rb") as f:
    analytics_response = session.post(
        "http://localhost:8000/api/v1/analytics/upload",
        files={"file": f}
    )
    print(f"Analysis ID: {analytics_response.json()['id']}")
```

---

## 📝 Resultados Esperados

### OCR - Factura Texaco
```json
{
  "id": "uuid",
  "status": "completed",
  "extracted_data": {
    "provider": "TEXACO",
    "amount": 35.71,
    "date": "2025-11-15",
    "category": "Combustible",
    "confidence": 0.92
  }
}
```

### Analytics - Ventas Ejemplo
```json
{
  "id": "uuid",
  "status": "completed",
  "summary": {
    "total_sales": 150000.00,
    "total_transactions": 48,
    "average_ticket": 3125.00,
    "total_discount_given": 22500.00,
    "abc_classification": {
      "A": 10,
      "B": 15,
      "C": 15
    }
  }
}
```

---

## 🧪 Casos de Prueba Recomendados

### Test 1: OCR Happy Path
1. Subir `factura_ejemplo.txt`
2. Verificar extracción correcta de monto
3. Verificar categorización automática

### Test 2: OCR Edge Cases
1. Subir archivo muy grande (>10MB) → Debería fallar
2. Subir archivo sin datos → Confidence bajo
3. Subir formato no soportado → Error 400

### Test 3: Analytics ABC
1. Subir `ventas_ejemplo.csv`
2. Verificar que "Laptop Dell XPS 15" esté en categoría A
3. Verificar distribución 70-20-10

### Test 4: Analytics Descuentos
1. Subir `ventas_ejemplo.csv`
2. Verificar productos con descuento >20%
3. Verificar impacto en margen

### Test 5: Export
1. Procesar cualquier dataset
2. Descargar Excel → Verificar 8 hojas
3. Descargar PDF → Verificar gráficos

---

## 🔧 Troubleshooting

### OCR no extrae datos
- Verificar que Tesseract esté instalado en el contenedor
- Verificar idioma configurado: `eng+spa`
- Revisar logs: `docker-compose logs celery_worker`

### Analytics falla al procesar
- Verificar que columnas existan en CSV
- Verificar formato de fechas (YYYY-MM-DD)
- Verificar que montos sean numéricos

### Archivos no se suben
- Verificar tamaño (<50MB para analytics, <10MB para OCR)
- Verificar extensión (.csv, .xlsx para analytics)
- Verificar permisos del directorio `uploads/`

---

## 📚 Recursos Adicionales

- **API Docs:** http://localhost:8000/docs
- **Grafana Dashboards:** http://localhost:3001 (admin/admin)
- **Flower (Celery):** http://localhost:5555
- **Logs:** `docker-compose logs -f backend celery_worker`

---

## 🎯 Métricas de Éxito

Después de procesar estos datos de prueba, deberías ver:

- **OCR:** 6 trabajos completados, confidence >85%
- **Analytics:** 2 análisis completados con todos los insights
- **Celery:** 8+ tareas ejecutadas sin errores
- **Redis:** Cache poblado con resultados

---

**Última actualización:** 15/11/2025
**Versión:** 1.0
