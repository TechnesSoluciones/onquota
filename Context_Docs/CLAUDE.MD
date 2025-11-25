# CLAUDE.MD - Guía de Contexto para Claude AI

## 🎯 Propósito del Proyecto

OnQuota es un SaaS modular diseñado para vendedores y equipos de ventas, enfocado en:
- **Trazabilidad** de actividades comerciales
- **Control de gastos** con OCR automatizado
- **Analítica comercial** avanzada (SPA Analysis)
- **Gestión multi-tenant** con roles diferenciados

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico
- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: Next.js (React)
- **Base de Datos**: PostgreSQL
- **Cache**: Redis
- **Queue**: Celery + Redis
- **OCR**: Tesseract / Vision API
- **Analytics**: Pandas + Plotly/Dash

### Arquitectura
- Microservicios ligeros con API Gateway
- Modelo multi-tenant (tenant_id en todas las tablas)
- Comunicación REST (fase 1) → gRPC (fase 2)

## 🔐 Sistema de Autenticación

### Roles del Sistema
1. **Admin**: Acceso total, configuración de empresa
2. **SalesRep**: Registro de ventas, gastos y visitas
3. **Supervisor**: Revisión, aprobación y reportes
4. **Analyst**: Acceso a módulos de análisis SPA y métricas

### Tokens
- Access token JWT: 15 minutos
- Refresh token: 7 días
- OAuth2 con soporte SSO (fase 2)

## 📦 Módulos Principales

### 1. Gestión de Gastos (Expenses Service)
- Registro manual de gastos
- Upload de facturas con OCR
- Categorización automática
- Reportes por período

### 2. Transporte
- Combustible
- Peajes
- Mantenimiento vehicular

### 3. Ventas y Cotizaciones
- Creación de cotizaciones
- Seguimiento de estados (pendiente, ganada, perdida)
- Pipeline de ventas

### 4. SPA Analysis
- Upload de archivos Excel/CSV
- Análisis de descuentos y márgenes
- Cálculo de KPIs comerciales
- Visualizaciones interactivas

### 5. Account Planner
- Planes de cuenta por cliente
- Estrategias comerciales
- Seguimiento de objetivos

### 6. Cuotas y Métricas
- Definición de cuotas por vendedor
- Panel de cumplimiento
- Histórico de desempeño

### 7. Visitas y Llamadas
- Registro con geolocalización (GPS)
- Historial de interacciones
- Resumen de actividades

### 8. Gestión de Clientes (CRM)
- CRUD completo de clientes
- Historial de interacciones
- Datos de contacto y comerciales

### 9. Oportunidades
- Pipeline de oportunidades
- Gestión por etapas
- Probabilidad de cierre

## 🤖 Servicio OCR/AI

### Flujo de Procesamiento
1. Upload de imagen (jpg, png, pdf)
2. Limpieza con OpenCV
3. OCR con Tesseract/Vision API
4. Normalización con Regex + NLP
5. Extracción de datos:
   - Proveedor
   - Monto
   - Fecha
   - Categoría
   - Nivel de confianza (confidence)

### Output Esperado
```json
{
  "provider": "Texaco",
  "amount": 53.20,
  "date": "2025-10-22",
  "category": "Combustible",
  "confidence": 0.93
}
```

## 📊 Sistema de Alertas

### Tipos de Alertas
- Cotizaciones vencidas (>7 días sin respuesta)
- Cuotas no cumplidas
- Mantenimiento pendiente
- Recordatorio de visitas

### Canales
- Notificación in-app
- Push notification
- Email (SendGrid / AWS SES)

### Motor
- Celery Beat para tareas programadas
- Redis como message broker

## 📁 Estructura del Proyecto

```
onquota/
├── backend/
│   ├── api/              # FastAPI endpoints
│   ├── core/             # Config, middlewares, auth
│   ├── modules/
│   │   ├── expenses/
│   │   ├── sales/
│   │   ├── analytics/
│   │   ├── accounts/
│   │   ├── clients/
│   │   ├── opportunities/
│   │   └── notifications/
│   └── tests/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── store/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🛡️ Seguridad

- **Encriptación**: AES-256 para datos sensibles
- **Protocolo**: HTTPS obligatorio (TLS 1.3)
- **Auditoría**: Logs con usuario, acción y timestamp
- **Backup**: Automatizado diario
- **Compliance**: GDPR / ISO 27001

## 📏 Estándares de Código

### Testing
- **Unit tests**: Pytest con coverage > 80%
- **Integration tests**: Postman/Newman
- **Frontend**: Jest + React Testing Library
- **Load testing**: Locust / k6
- **Static analysis**: MyPy + Ruff + ESLint

### Métricas de Desempeño (KPIs Técnicos)
- API response time < 300 ms
- Uptime 99.5%
- OCR accuracy > 90%
- Background job latency < 2s
- DB query time P95 < 50 ms

## 🎨 Principios de Desarrollo

1. **API-First**: Diseño de API antes de implementación
2. **Modular**: Módulos desacoplados para fácil migración
3. **Documentado**: OpenAPI (Swagger UI) para toda la API
4. **Feature Flags**: Habilitación gradual de funcionalidades
5. **Asíncrono**: Procesamiento de tareas pesadas en background

## 💡 Cuando Trabajes en Este Proyecto

### Si estás desarrollando Backend:
- Usa FastAPI con async/await
- Implementa validación con Pydantic
- Respeta el esquema multi-tenant (tenant_id)
- Documenta endpoints con docstrings
- Escribe tests unitarios

### Si estás desarrollando Frontend:
- Usa TypeScript
- Implementa React Hooks
- Gestión de estado con Context API o Zustand
- Responsive design (mobile-first)
- Lazy loading de componentes

### Si estás trabajando con OCR:
- Valida calidad de imagen antes de procesar
- Implementa retry logic
- Guarda imágenes originales para auditoría
- Usa confidence threshold (> 0.85)

### Si estás trabajando con Analytics:
- Procesamiento asíncrono con Celery
- Cache de resultados frecuentes
- Paginación en grandes datasets
- Exportación a Excel/PDF

## 🚀 Comandos Útiles

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Docker
docker-compose up -d
docker-compose logs -f

# Tests
pytest tests/ -v --cov
npm test
```

## 📞 Consideraciones Importantes

- Todas las fechas en UTC
- Moneda en formato decimal (2 decimales)
- Imágenes máximo 10MB
- Rate limiting: 100 req/min por usuario
- Paginación default: 20 items
- Soft delete para datos críticos
- Versionado de API: /api/v1/

---

**Versión**: 1.0  
**Última actualización**: Noviembre 2025  
**Mantenedor**: Tech Lead OnQuota