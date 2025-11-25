# Integration Tests

Pruebas de integración end-to-end para los módulos de OnQuota.

## 📋 Descripción

Este directorio contiene tests de integración completos que verifican flujos end-to-end de los principales módulos del sistema:

### Módulos Cubiertos

1. **Sales (Ventas/Cotizaciones)** - 10 tests
   - Creación de cotizaciones con items
   - Actualización de cotizaciones
   - Transiciones de estado (DRAFT → SENT → ACCEPTED/REJECTED)
   - Validación de transiciones inválidas
   - Filtrado de cotizaciones
   - RBAC: Sales reps solo ven sus propias cotizaciones
   - CRUD de items de cotización
   - Cálculo de totales con descuentos

2. **Dashboard (Métricas y Analytics)** - 8 tests
   - KPIs con datos reales
   - Ingresos mensuales con comparación YoY
   - Gastos mensuales con comparación YoY
   - Ranking de top clientes
   - Timeline de actividad reciente
   - Resumen completo del dashboard
   - Cálculo de tasa de conversión
   - Cálculo de cambios Month-over-Month

## 🚀 Setup

### Prerequisitos

- Python 3.11+
- PostgreSQL 14+
- Redis (opcional, para algunos tests)

### 1. Crear entorno virtual

```bash
cd /Users/josegomez/Documents/Code/OnQuota/backend
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar base de datos de pruebas

Crear base de datos PostgreSQL para tests:

```bash
createdb test_db
createuser test_user --password
# Password: test_password
```

O usando psql:

```sql
CREATE DATABASE test_db;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE test_db TO test_user;
```

### 4. Configurar variables de entorno

Crear archivo `.env.test` en la raíz del proyecto backend:

```env
# Database
DATABASE_URL=postgresql+asyncpg://test_user:test_password@localhost:5432/test_db

# JWT
SECRET_KEY=test-secret-key-do-not-use-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Environment
ENVIRONMENT=test
DEBUG=True
```

## 🧪 Ejecutar Tests

### Ejecutar todos los tests de integración

```bash
pytest tests/integration/ -v
```

### Ejecutar solo tests de Sales

```bash
pytest tests/integration/test_sales_integration.py -v
```

### Ejecutar solo tests de Dashboard

```bash
pytest tests/integration/test_dashboard_integration.py -v
```

### Ejecutar un test específico

```bash
pytest tests/integration/test_sales_integration.py::test_create_quote_with_items -v
```

### Ejecutar tests con coverage

```bash
pytest tests/integration/ --cov=modules --cov-report=html
```

El reporte HTML estará disponible en `htmlcov/index.html`

### Ejecutar tests en modo verbose con logs

```bash
pytest tests/integration/ -v -s --log-cli-level=INFO
```

## 📊 Estructura de Tests

```
tests/integration/
├── __init__.py
├── conftest.py                    # Fixtures compartidas
├── README.md                      # Este archivo
├── test_sales_integration.py      # 10 tests de Sales
└── test_dashboard_integration.py  # 8 tests de Dashboard
```

## 🔧 Fixtures Disponibles

Las fixtures compartidas están definidas en `conftest.py`:

- **`db_session`** - Sesión de base de datos limpia para cada test
- **`setup_test_data`** - Crea tenant, usuarios (admin, supervisor, 2 sales reps), 3 clientes, 2 categorías de gastos
- **`sales_repo`** - Instancia de SalesRepository
- **`expense_repo`** - Instancia de ExpenseRepository
- **`client_repo`** - Instancia de ClientRepository

### Helper Functions

- `create_quote_data()` - Genera datos para crear cotización
- `create_quote_items()` - Genera lista de items de cotización
- `create_expense_data()` - Genera datos para crear gasto

## 📝 Ejemplo de Uso

```python
@pytest.mark.asyncio
async def test_example(db_session, setup_test_data, sales_repo):
    """Ejemplo de test"""
    data = await setup_test_data

    # Usar datos del setup
    quote = await sales_repo.create_quote(
        tenant_id=data["tenant"].id,
        client_id=data["client1"].id,
        sales_rep_id=data["sales_rep1"].id,
        # ... otros campos
    )

    # Verificaciones
    assert quote.id is not None
    assert quote.status == SaleStatus.DRAFT
```

## 🎯 Cobertura de Tests

### Sales Integration Tests (10 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | `test_create_quote_with_items` | Crear cotización completa con items |
| 2 | `test_update_quote_draft` | Actualizar cotización en DRAFT |
| 3 | `test_quote_status_transition_draft_to_sent` | DRAFT → SENT |
| 4 | `test_quote_status_transition_sent_to_accepted` | SENT → ACCEPTED |
| 5 | `test_quote_status_transition_sent_to_rejected` | SENT → REJECTED |
| 6 | `test_quote_invalid_status_transition` | Validar transición inválida |
| 7 | `test_list_quotes_with_filters` | Filtrado de cotizaciones |
| 8 | `test_rbac_sales_rep_sees_only_own_quotes` | RBAC por rol |
| 9 | `test_quote_items_crud` | CRUD de items |
| 10 | `test_quote_total_calculation_with_discounts` | Cálculos con descuentos |

### Dashboard Integration Tests (8 tests)

| # | Test | Descripción |
|---|------|-------------|
| 1 | `test_dashboard_kpis_with_real_data` | KPIs con datos reales |
| 2 | `test_revenue_monthly_yoy_comparison` | Ingresos YoY |
| 3 | `test_expenses_monthly_yoy_comparison` | Gastos YoY |
| 4 | `test_top_clients_ranking` | Ranking de clientes |
| 5 | `test_recent_activity_timeline` | Timeline de actividad |
| 6 | `test_dashboard_summary` | Resumen completo |
| 7 | `test_conversion_rate_calculation` | Tasa de conversión |
| 8 | `test_month_over_month_changes` | Cambios MoM |

## 🐛 Troubleshooting

### Error: `ModuleNotFoundError`

Asegúrate de estar en el directorio `backend` y que el entorno virtual esté activado.

```bash
cd /Users/josegomez/Documents/Code/OnQuota/backend
source venv/bin/activate
export PYTHONPATH=$PYTHONPATH:$(pwd)
```

### Error: `sqlalchemy.exc.OperationalError: could not connect to server`

Verifica que PostgreSQL esté corriendo y que las credenciales en `.env.test` sean correctas.

```bash
# Verificar si PostgreSQL está corriendo
pg_isready -h localhost -p 5432

# Verificar conexión
psql -h localhost -U test_user -d test_db
```

### Error: `asyncpg.exceptions.InvalidCatalogNameError: database "test_db" does not exist`

Crea la base de datos:

```bash
createdb test_db
```

### Tests lentos

Los tests de integración crean y destruyen tablas en cada test. Para acelerar:

1. Usar base de datos en memoria (SQLite para tests unitarios)
2. Usar transacciones con rollback en lugar de recrear tablas
3. Ejecutar tests en paralelo con pytest-xdist:

```bash
pip install pytest-xdist
pytest tests/integration/ -n auto
```

## 📚 Recursos

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)

## ✅ Validación Pre-commit

Antes de hacer commit, ejecuta:

```bash
# Tests
pytest tests/integration/ -v

# Linting
ruff check .

# Type checking
mypy modules/

# Formatting
black --check .
isort --check-only .
```

## 🔄 CI/CD

Los tests de integración deben ejecutarse en el pipeline de CI/CD:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run integration tests
        run: pytest tests/integration/ -v
```

---

**Nota**: Estos tests están diseñados para correr en un entorno de prueba aislado. NO ejecutar contra base de datos de producción.
