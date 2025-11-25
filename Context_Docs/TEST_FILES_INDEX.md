# 📋 Índice de Archivos de Prueba - OnQuota

Este documento lista todos los archivos de prueba disponibles para probar el sistema OnQuota.

---

## 📁 Estructura de Archivos de Prueba

```
OnQuota/
├── test_data/
│   ├── README.md                      # Guía completa de uso
│   ├── ocr/                           # 6 facturas de prueba
│   │   ├── factura_ejemplo.txt
│   │   ├── recibo_restaurante.txt
│   │   ├── peaje_autopista.txt
│   │   ├── supermercado.txt
│   │   ├── parking.txt
│   │   └── farmacia.txt
│   └── analytics/                     # 2 datasets CSV
│       ├── ventas_ejemplo.csv
│       └── ventas_grandes.csv
├── backend/
│   └── seed_database.py               # Script para datos iniciales
├── .env                                # Variables de entorno (desarrollo)
├── .env.example                        # Template de variables
├── QUICKSTART.md                       # Guía de inicio rápido
└── TEST_FILES_INDEX.md                 # Este archivo
```

---

## 🧾 Archivos OCR (6 archivos)

### 1. `factura_ejemplo.txt` - Gasolinera Texaco
**Tipo:** Factura de combustible
**Tamaño:** 1.1 KB

**Datos a extraer:**
- **Proveedor:** Texaco Estación de Servicio
- **Monto:** $35.71
- **Fecha:** 15/11/2025
- **Categoría:** Combustible
- **RUC:** 1234567890001
- **Producto:** Super 95 (12.5 litros × $2.55)
- **Placa:** ABC-1234

**Test esperado:** ✅ Confidence >90%

---

### 2. `recibo_restaurante.txt` - Restaurante La Casa Grande
**Tipo:** Factura de restaurante
**Tamaño:** 2.0 KB

**Datos a extraer:**
- **Proveedor:** Restaurante La Casa Grande
- **Monto:** $34.50
- **Fecha:** 15/11/2025
- **Categoría:** Alimentación
- **RUC:** 0987654321001
- **Items:** Almuerzo ejecutivo, bebidas, postre, café
- **IVA:** 12% + Servicio 10%

**Test esperado:** ✅ Confidence >85%

---

### 3. `peaje_autopista.txt` - Autopista del Sol
**Tipo:** Ticket de peaje
**Tamaño:** 1.8 KB

**Datos a extraer:**
- **Proveedor:** Concesionaria Autopista del Sol
- **Monto:** $3.50
- **Fecha:** 15/11/2025
- **Categoría:** Peaje/Transporte
- **Ticket:** 00045623
- **Placa:** XYZ-7890
- **Categoría:** Vehículo liviano

**Test esperado:** ✅ Confidence >88%

---

### 4. `supermercado.txt` - Mi Comisariato
**Tipo:** Factura de supermercado
**Tamaño:** 3.2 KB

**Datos a extraer:**
- **Proveedor:** Supermercados Mi Comisariato
- **Monto:** $88.95
- **Fecha:** 15/11/2025
- **Categoría:** Compras/Suministros
- **RUC:** 1234509876001
- **Items:** 17 productos
- **Descuento:** $4.33 (tarjeta cliente)
- **IVA 0%:** $26.10
- **IVA 12%:** $6.73

**Test esperado:** ✅ Confidence >82% (archivo más complejo)

---

### 5. `parking.txt` - Estacionamiento Plaza Mall
**Tipo:** Ticket de estacionamiento
**Tamaño:** 1.9 KB

**Datos a extraer:**
- **Proveedor:** Estacionamiento Plaza Mall
- **Monto:** $4.00
- **Fecha:** 15/11/2025
- **Categoría:** Estacionamiento
- **Ticket:** PA-2025-115-04523
- **Placa:** PQR-4567
- **Tiempo:** 4 horas 15 minutos
- **Entrada:** 10:30:15
- **Salida:** 14:45:32

**Test esperado:** ✅ Confidence >90%

---

### 6. `farmacia.txt` - Farmacias Cruz Azul
**Tipo:** Factura de farmacia
**Tamaño:** 4.4 KB

**Datos a extraer:**
- **Proveedor:** Farmacias Cruz Azul S.A.
- **Monto:** $84.04
- **Fecha:** 15/11/2025
- **Categoría:** Salud/Medicamentos
- **RUC:** 0912345678001
- **Items:** Medicamentos con receta + OTC
- **Descuento tercera edad:** 10% ($8.86)
- **Cliente:** Juan Carlos Pérez López
- **Puntos ganados:** 84

**Test esperado:** ✅ Confidence >80% (archivo más complejo)

---

## 📊 Archivos Analytics (2 archivos)

### 1. `ventas_ejemplo.csv` - Ventas B2B Tecnología
**Tipo:** Dataset de ventas
**Tamaño:** 4.6 KB
**Formato:** CSV (UTF-8)

**Especificaciones:**
- **Registros:** 48 transacciones
- **Período:** Enero-Febrero 2025 (2 meses)
- **Productos:** 40 SKUs únicos
- **Categorías:** Tecnología, Accesorios, Oficina, Componentes, etc.

**Vendedores (4):**
- Juan Perez
- Maria Garcia
- Carlos Lopez
- Ana Martinez

**Clientes (5):**
- Empresa ABC
- Tech Solutions
- Distribuidora XYZ
- Corporativo SA
- (Varios)

**Columnas (10):**
1. `Codigo` - SKU del producto
2. `Descripcion` - Nombre del producto
3. `Cantidad` - Unidades vendidas
4. `Precio_Unitario` - Precio por unidad (USD)
5. `Descuento` - Porcentaje de descuento (0-35%)
6. `Total` - Monto total después de descuento
7. `Fecha` - Fecha de venta (YYYY-MM-DD)
8. `Cliente` - Nombre del cliente
9. `Vendedor` - Nombre del vendedor
10. `Categoria` - Categoría del producto

**Análisis esperados:**
- **ABC Classification:**
  - Clase A (70%): ~10 productos (ej: Laptop Dell XPS 15)
  - Clase B (20%): ~15 productos
  - Clase C (10%): ~15 productos

- **Top 5 Productos por Ventas:**
  1. Laptop Dell XPS 15 → $54,668
  2. Monitor Samsung 27" → $13,489
  3. Auriculares Sony WH-1000XM4 → $10,152
  4. Disco SSD NVMe 1TB → $4,680
  5. Memoria RAM DDR5 32GB → $4,590

- **Descuento Promedio:** ~16.5%
- **Ticket Promedio:** ~$3,200
- **Ventas Totales:** ~$154,000

**Uso recomendado:**
```bash
# Subir a Analytics
POST /api/v1/analytics/upload
Content-Type: multipart/form-data
file: ventas_ejemplo.csv

# Esperar ~15-30 segundos de procesamiento
# Revisar dashboard con gráficos
```

---

### 2. `ventas_grandes.csv` - Ventas Enterprise B2B
**Tipo:** Dataset de ventas corporativas
**Tamaño:** 2.9 KB
**Formato:** CSV (UTF-8)

**Especificaciones:**
- **Registros:** 31 transacciones
- **Período:** Enero-Febrero 2025
- **Ticket Promedio:** $8,000-$15,000
- **Productos:** Hardware enterprise (Servidores, Storage, Redes)

**Categorías principales:**
- Servidores (Dell PowerEdge)
- Redes (Cisco, Ubiquiti)
- Storage (NetApp)
- Seguridad (Fortinet, Axis)
- Software (VMware, Microsoft, Adobe)
- Infraestructura (Racks, UPS, Cableado)

**Clientes (5):**
- CUST001, CUST002, CUST003, CUST004, CUST005

**Regiones:**
- Norte, Centro, Sur, Este, Oeste

**Columnas (10):**
1. `SKU` - Código del producto
2. `Product_Name` - Nombre del producto
3. `Qty` - Cantidad
4. `Unit_Price` - Precio unitario (USD)
5. `Discount_Pct` - Descuento %
6. `Net_Amount` - Total neto
7. `Sale_Date` - Fecha
8. `Customer_ID` - ID del cliente
9. `Region` - Región de venta
10. `Category` - Categoría

**Productos destacados:**
- Servidor Dell PowerEdge R750 → $4,500 c/u
- Storage NetApp FAS2750 → $12,000 c/u
- Switch Cisco Catalyst 9300 → $2,800 c/u
- Firewall Fortinet FortiGate → $3,200 c/u
- Licencias VMware vSphere → $280 c/u

**Análisis esperados:**
- **Ventas Totales:** ~$286,000
- **Ticket Promedio:** ~$9,200
- **Descuento Promedio:** ~15%
- **Mejor producto:** Servidor Dell PowerEdge R750
- **Mejor región:** Centro

---

## 🗄️ Base de Datos - Seed Data

### `backend/seed_database.py`
**Tipo:** Script Python para inicializar BD
**Tamaño:** ~15 KB

**Crea automáticamente:**

#### 1. Tenant (Empresa)
- **Nombre:** Empresa Demo OnQuota
- **Dominio:** demo.onquota.com

#### 2. Usuarios (6)
| Email | Rol | Password | Nombre |
|-------|-----|----------|--------|
| admin@demo.com | Admin | Admin123! | Administrador Principal |
| juan.perez@demo.com | Sales Rep | Sales123! | Juan Pérez |
| maria.garcia@demo.com | Sales Rep | Sales123! | María García |
| carlos.lopez@demo.com | Sales Rep | Sales123! | Carlos López |
| supervisor@demo.com | Supervisor | Super123! | Ana Martínez |
| analyst@demo.com | Analyst | Analyst123! | Roberto Sánchez |

#### 3. Clientes (5)
- Empresa ABC (Tecnología)
- Tech Solutions (Tecnología)
- Distribuidora XYZ (Retail)
- Corporativo SA (Finanzas)
- Servicios Integrales (Servicios) - Prospect

#### 4. Vehículos (3)
- ABC-1234 - Chevrolet Sail 2020 (Gasolina)
- XYZ-5678 - Toyota Hilux 2021 (Diesel)
- PQR-9012 - Nissan Versa 2019 (Gasolina)

#### 5. Gastos (5)
- $35.71 - Combustible (APROBADO)
- $34.50 - Alimentación (APROBADO)
- $3.50 - Peaje (APROBADO)
- $4.00 - Estacionamiento (APROBADO)
- $150.00 - Suministros (PENDIENTE)

#### 6. Cotizaciones (2)
- Q-2025-001 - Equipos de Cómputo (PENDIENTE)
- Q-2025-002 - Infraestructura de Redes (GANADA)

#### 7. Envíos (2)
- SH-2025-001 - Quito (ENTREGADO)
- SH-2025-002 - Guayaquil (EN TRÁNSITO)

#### 8. Oportunidades (3)
- Renovación Licencias Microsoft 365 - $15,000 (75%)
- Implementación Sistema ERP - $45,000 (50%)
- Consultoría IT - $25,000 (80%)

**Ejecutar:**
```bash
docker-compose exec backend python seed_database.py
```

---

## 🚀 Cómo Usar los Archivos de Prueba

### Opción 1: Interfaz Web (Recomendado)

1. **Iniciar Docker:**
   ```bash
   docker-compose up -d
   ```

2. **Aplicar migraciones:**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

3. **Cargar seed data:**
   ```bash
   docker-compose exec backend python seed_database.py
   ```

4. **Login:**
   - URL: http://localhost:3000
   - Email: admin@demo.com
   - Password: Admin123!

5. **Probar OCR:**
   - Ir a `/ocr/upload`
   - Arrastrar archivos de `test_data/ocr/`

6. **Probar Analytics:**
   - Ir a `/analytics/upload`
   - Subir `test_data/analytics/ventas_ejemplo.csv`

### Opción 2: API con cURL

```bash
# 1. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin123!"}' \
  -c cookies.txt

# 2. Upload OCR
curl -X POST http://localhost:8000/api/v1/ocr/upload \
  -b cookies.txt \
  -F "file=@test_data/ocr/factura_ejemplo.txt"

# 3. Upload Analytics
curl -X POST http://localhost:8000/api/v1/analytics/upload \
  -b cookies.txt \
  -F "file=@test_data/analytics/ventas_ejemplo.csv"
```

### Opción 3: Python Script

```python
import requests

session = requests.Session()

# Login
session.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "admin@demo.com", "password": "Admin123!"}
)

# Upload OCR
with open("test_data/ocr/factura_ejemplo.txt", "rb") as f:
    response = session.post(
        "http://localhost:8000/api/v1/ocr/upload",
        files={"file": f}
    )
    print(response.json())

# Upload Analytics
with open("test_data/analytics/ventas_ejemplo.csv", "rb") as f:
    response = session.post(
        "http://localhost:8000/api/v1/analytics/upload",
        files={"file": f}
    )
    print(response.json())
```

---

## ✅ Checklist de Pruebas

### OCR Service
- [ ] Subir factura_ejemplo.txt → Extraer monto $35.71
- [ ] Subir recibo_restaurante.txt → Categoría: Alimentación
- [ ] Subir peaje_autopista.txt → Placa: XYZ-7890
- [ ] Subir supermercado.txt → 17 items
- [ ] Subir parking.txt → Tiempo: 4h 15min
- [ ] Subir farmacia.txt → Descuento tercera edad 10%

### Analytics Service
- [ ] Subir ventas_ejemplo.csv → 48 transacciones
- [ ] Ver clasificación ABC → Laptop en clase A
- [ ] Ver top 10 productos
- [ ] Análisis de descuentos → Promedio ~16%
- [ ] Exportar a Excel → 8 hojas
- [ ] Exportar a PDF → Con gráficos

### CRM & Ventas
- [ ] Login como admin@demo.com
- [ ] Ver 5 clientes pre-cargados
- [ ] Crear nueva cotización
- [ ] Ver 3 oportunidades en pipeline
- [ ] Gestionar 2 envíos

### Reportes & Analytics
- [ ] Dashboard general con KPIs
- [ ] Gastos por categoría
- [ ] Ventas por vendedor
- [ ] Cumplimiento de cuotas

---

## 📚 Documentación Adicional

- **Guía de Inicio Rápido:** `QUICKSTART.md`
- **Guía de Datos de Prueba:** `test_data/README.md`
- **Progreso del Proyecto:** `PROGRESO_ACTUAL.md`
- **API Docs:** http://localhost:8000/docs
- **Grafana:** http://localhost:3001

---

**Última actualización:** 15/11/2025
**Versión:** 1.0
**Total de archivos de prueba:** 10 archivos (6 OCR + 2 Analytics + 1 Seed + 1 Config)
