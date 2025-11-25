# OnQuota Backend API

FastAPI-based backend for OnQuota SaaS platform.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

## Setup

### 1. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp ../.env.example ../.env
# Edit .env with your configuration
```

### 4. Run database migrations

```bash
alembic upgrade head
```

## Running the Application

### Development

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

### Run all tests

```bash
pytest
```

### Run with coverage

```bash
pytest --cov=. --cov-report=html
```

### Run specific test types

```bash
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m "not slow"    # Skip slow tests
```

## Code Quality

### Format code

```bash
black .
isort .
```

### Lint code

```bash
ruff check .
mypy .
```

## Project Structure

```
backend/
├── api/                  # API endpoints
│   ├── v1/              # API version 1
│   └── dependencies.py  # Shared dependencies
├── core/                # Core functionality
│   ├── config.py        # Configuration
│   ├── security.py      # Security utilities
│   ├── logging.py       # Logging setup
│   └── exceptions.py    # Custom exceptions
├── modules/             # Business modules
│   ├── auth/           # Authentication
│   ├── expenses/       # Expenses management
│   ├── sales/          # Sales & quotes
│   ├── clients/        # CRM
│   ├── analytics/      # SPA analytics
│   ├── accounts/       # Account planning
│   ├── opportunities/  # Opportunities
│   ├── notifications/  # Notifications
│   └── transport/      # Transport expenses
├── models/             # SQLAlchemy models
├── schemas/            # Pydantic schemas
├── tests/              # Tests
│   ├── unit/
│   └── integration/
├── alembic/            # Database migrations
├── main.py             # Application entry point
├── requirements.txt    # Dependencies
└── README.md          # This file
```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: JWT secret key
- `CORS_ORIGINS`: Allowed CORS origins

## License

Proprietary - OnQuota 2025
