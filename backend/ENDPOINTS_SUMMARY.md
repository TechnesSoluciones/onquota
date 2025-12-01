# Endpoints REST - Resumen Ejecutivo

## Analytics Endpoints (Opportunities)

### 1. Win Rate Analytics
**Endpoint**: `GET /api/v1/opportunities/analytics/win-rate`

**Query Parameters**:
- `user_id` (UUID, opcional): Filtrar por sales rep
- `date_from` (date, opcional): Fecha inicial
- `date_to` (date, opcional): Fecha final

**Response Example**:
```json
{
  "total_closed": 50,
  "won": 35,
  "lost": 15,
  "win_rate": "70.00",
  "total_won_value": "1750000.00",
  "total_lost_value": "450000.00",
  "average_won_value": "50000.00"
}
```

**RBAC**: Sales reps solo ven sus datos. Admins/Supervisors pueden filtrar por user.

---

### 2. Conversion Rates
**Endpoint**: `GET /api/v1/opportunities/analytics/conversion-rates`

**Query Parameters**:
- `user_id` (UUID, opcional): Filtrar por sales rep

**Response Example**:
```json
{
  "conversion_rates": {
    "LEAD": {
      "stage": "LEAD",
      "count": 100,
      "converted_to_next": 70,
      "conversion_rate": "70.00",
      "next_stage": "QUALIFIED"
    },
    "QUALIFIED": {
      "stage": "QUALIFIED",
      "count": 70,
      "converted_to_next": 50,
      "conversion_rate": "71.43",
      "next_stage": "PROPOSAL"
    }
  }
}
```

**RBAC**: Sales reps solo ven sus datos. Admins/Supervisors pueden filtrar por user.

---

### 3. Revenue Forecast
**Endpoint**: `GET /api/v1/opportunities/analytics/forecast`

**Query Parameters**:
- `days` (int, default: 90): Días a proyectar (30-365)
- `user_id` (UUID, opcional): Filtrar por sales rep

**Response Example**:
```json
{
  "forecast_period_days": 90,
  "end_date": "2025-02-26",
  "opportunity_count": 25,
  "best_case": "2500000.00",
  "weighted": "1750000.00",
  "conservative": "1200000.00",
  "monthly_breakdown": {
    "2025-12": {
      "best_case": "800000.00",
      "weighted": "560000.00",
      "count": 10
    },
    "2025-01": {
      "best_case": "1000000.00",
      "weighted": "700000.00",
      "count": 10
    }
  }
}
```

**RBAC**: Sales reps solo ven sus datos. Admins/Supervisors pueden filtrar por user.

---

### 4. Pipeline Health
**Endpoint**: `GET /api/v1/opportunities/analytics/pipeline-health`

**Query Parameters**:
- `user_id` (UUID, opcional): Filtrar por sales rep

**Response Example**:
```json
{
  "total_active_opportunities": 45,
  "total_pipeline_value": 2500000.00,
  "weighted_pipeline_value": 1750000.00,
  "stage_distribution": {
    "LEAD": {
      "count": 10,
      "value": "500000.00"
    },
    "QUALIFIED": {
      "count": 15,
      "value": "800000.00"
    }
  },
  "aging_analysis": {
    "0-30": 20,
    "31-60": 15,
    "61-90": 7,
    "90+": 3
  },
  "overdue_count": 5,
  "overdue_value": 250000.00
}
```

**RBAC**: Sales reps solo ven sus datos. Admins/Supervisors pueden filtrar por user.

---

## Export Endpoints

### 5. Export Opportunities to Excel
**Endpoint**: `GET /api/v1/opportunities/export/excel`

**Query Parameters**:
- `stage` (OpportunityStage, opcional): Filtrar por stage
- `user_id` (UUID, opcional): Filtrar por sales rep
- `date_from` (date, opcional): Filtrar desde fecha
- `date_to` (date, opcional): Filtrar hasta fecha

**Response**: Excel file (.xlsx) con 4 sheets:
1. All Opportunities
2. Summary by Stage
3. Summary by Sales Rep
4. Win Rate Analysis

**Headers**:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=opportunities_export_{tenant_id}.xlsx
```

**RBAC**: Sales reps solo exportan sus datos. Admins/Supervisors pueden filtrar.

**Ejemplo de uso**:
```bash
curl -X GET "http://localhost:8000/api/v1/opportunities/export/excel?stage=PROPOSAL" \
  -H "Authorization: Bearer eyJ..." \
  -o opportunities.xlsx
```

---

### 6. Export Account Plan to PDF
**Endpoint**: `GET /api/v1/accounts/plans/{plan_id}/export/pdf`

**Path Parameters**:
- `plan_id` (UUID, required): ID del account plan

**Response**: PDF file con secciones:
1. Plan Overview (header, info, metrics)
2. SWOT Matrix (2x2 color-coded)
3. Milestones Timeline (tabla con status)
4. Summary Statistics (agregados)

**Headers**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename=account_plan_{title}.pdf
```

**RBAC**: Todos los usuarios pueden exportar planes de su tenant.

**Ejemplo de uso**:
```bash
curl -X GET "http://localhost:8000/api/v1/accounts/plans/550e8400-e29b-41d4-a716-446655440000/export/pdf" \
  -H "Authorization: Bearer eyJ..." \
  -o account_plan.pdf
```

---

## Estructura de Archivos

```
backend/
├── modules/
│   ├── opportunities/
│   │   ├── router.py          (✨ 4 analytics endpoints + 1 export)
│   │   ├── schemas.py         (✨ 4 analytics response schemas)
│   │   ├── exporters.py       (✨ OpportunityExporter class)
│   │   ├── services.py        (ya existía - OpportunityAnalyticsService)
│   │   └── repository.py      (ya existía)
│   │
│   └── accounts/
│       ├── router.py          (✨ 1 export endpoint)
│       ├── exporters.py       (✨ AccountPlanExporter class)
│       ├── schemas.py         (ya existía)
│       └── repository.py      (ya existía)
│
└── exports/                   (✨ directorio para archivos temporales)
```

---

## Códigos de Status HTTP

### Success:
- `200 OK`: Analytics endpoints devuelven JSON
- `200 OK`: Export endpoints devuelven archivo (FileResponse)

### Errors:
- `401 Unauthorized`: Token inválido o faltante
- `403 Forbidden`: RBAC - usuario sin permisos
- `404 Not Found`: Recurso no encontrado (plan, opportunities)
- `422 Unprocessable Entity`: Validación de parámetros falló
- `500 Internal Server Error`: Error en procesamiento

---

## Límites y Consideraciones

### Analytics:
- Cálculos en tiempo real (no cached)
- Performance depende de cantidad de opportunities
- Para datasets grandes considerar paginación/caching

### Exports:
- Límite de 10,000 opportunities por export Excel
- PDFs tienen tamaño carta (letter) por defecto
- Archivos guardados en `/backend/exports/`
- No hay auto-cleanup (implementar si necesario)
- FileResponse hace streaming automático

---

## Seguridad

- ✅ RBAC validado en todos los endpoints
- ✅ Tenant isolation (tenant_id en queries)
- ✅ Input validation con Pydantic
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ Logging sin exponer datos sensibles
- ✅ Error messages genéricos para usuarios

---

## Performance Tips

1. **Analytics**:
   - Usar filtros de fecha para reducir dataset
   - Considerar índices en DB para queries frecuentes
   - Implementar Redis cache para queries repetidas

2. **Exports**:
   - Limitar cantidad de records exportados
   - Usar filtros antes de exportar
   - Comprimir archivos grandes
   - Implementar exports en background (Celery)

---

## Ejemplos de Integración Frontend

### React/TypeScript:

```typescript
// Win Rate Analytics
const fetchWinRate = async (filters?: {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.userId) params.append('user_id', filters.userId);
  if (filters?.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters?.dateTo) params.append('date_to', filters.dateTo);

  const response = await fetch(
    `/api/v1/opportunities/analytics/win-rate?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.json();
};

// Export to Excel
const exportToExcel = async () => {
  const response = await fetch(
    '/api/v1/opportunities/export/excel',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'opportunities.xlsx';
  a.click();
};

// Export Account Plan PDF
const exportPlanPDF = async (planId: string) => {
  const response = await fetch(
    `/api/v1/accounts/plans/${planId}/export/pdf`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'account_plan.pdf';
  a.click();
};
```

---

## Testing con Postman

### Collection Structure:
```
OnQuota Analytics & Exports
├── Analytics
│   ├── Get Win Rate
│   ├── Get Conversion Rates
│   ├── Get Revenue Forecast
│   └── Get Pipeline Health
└── Exports
    ├── Export Opportunities to Excel
    └── Export Account Plan to PDF
```

### Environment Variables:
```json
{
  "base_url": "http://localhost:8000",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "plan_id": "770e8400-e29b-41d4-a716-446655440002"
}
```

---

## Swagger UI

Acceder a documentación interactiva en:
```
http://localhost:8000/docs
```

Secciones relevantes:
- **Opportunities** > Analytics (4 endpoints)
- **Opportunities** > Export (1 endpoint)
- **Account Planner** > Export (1 endpoint)

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-11-28
