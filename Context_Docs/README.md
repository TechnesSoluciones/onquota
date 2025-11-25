# OnQuota - Sales Management SaaS Platform

Multi-tenant SaaS platform for sales team management with advanced analytics, OCR expense processing, and comprehensive CRM capabilities.

## 🚀 Features

- **Multi-tenant Architecture**: Isolated data per organization
- **Expense Management**: Manual and OCR-powered expense tracking
- **CRM**: Complete client relationship management
- **Sales & Quotes**: Quote management and sales pipeline
- **SPA Analytics**: Advanced discount and margin analysis
- **Account Planning**: Strategic account management
- **Quotas & Metrics**: Sales quota tracking and performance metrics
- **Activities Tracking**: Visits and calls with GPS tracking
- **Notifications**: Multi-channel alert system

## 📋 Project Status

**Current Phase**: Phase 0 - Foundation Setup ✅
**Version**: 1.0.0-alpha
**Last Updated**: November 2025

### Development Progress

- [x] Phase 0: Foundation & Setup (Week 1)
  - [x] Repository structure
  - [ ] Docker infrastructure
  - [ ] CI/CD pipeline
  - [ ] Backend base
- [ ] Phase 1: MVP (Weeks 2-10)
- [ ] Phase 2: Additional Features (Weeks 11-18)
- [ ] Phase 3: Optimization & Launch (Weeks 19-24)

See [TASK.MD](./Context_Docs/TASK.MD) for detailed progress tracking.

## 🏗️ Architecture

### Tech Stack

**Backend**:
- FastAPI (Python 3.11+)
- PostgreSQL 15+
- Redis 7+
- Celery (Background tasks)
- SQLAlchemy 2.0 (ORM)
- Alembic (Migrations)

**Frontend**:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (State management)
- React Hook Form + Zod

**Infrastructure**:
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- AWS/GCP (Production)

## 📁 Project Structure

```
OnQuota/
├── backend/              # FastAPI backend
│   ├── api/             # API endpoints
│   ├── core/            # Core functionality
│   ├── modules/         # Business modules
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── tests/           # Tests
│   └── main.py          # Entry point
├── frontend/            # Next.js frontend
│   ├── app/            # App router pages
│   ├── components/     # React components
│   ├── lib/            # Utilities
│   ├── hooks/          # Custom hooks
│   ├── store/          # State management
│   └── types/          # TypeScript types
├── Context_Docs/        # Project documentation
│   ├── README.MD       # Project overview
│   ├── TASK.MD         # Task tracking
│   ├── PLANNING.MD     # Planning docs
│   └── PRD OnQuota.docx # Product requirements
├── docker-compose.yml   # Docker services (TODO)
├── .env.example        # Environment template
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd OnQuota
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Backend setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. **Frontend setup**
```bash
cd frontend
npm install
```

5. **Run with Docker (Recommended)**
```bash
docker-compose up -d
```

Or run services separately:

**Backend**:
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend**:
```bash
cd frontend
npm run dev
```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📚 Documentation

- [Task Tracking](./Context_Docs/TASK.MD) - Development tasks and progress
- [Planning Guide](./Context_Docs/PLANNING.MD) - Project planning and roadmap
- [Claude Guide](./Context_Docs/CLAUDE.MD) - AI assistant context
- [Backend README](./backend/README.md) - Backend documentation
- [Frontend README](./frontend/README.md) - Frontend documentation

## 🧪 Testing

**Backend**:
```bash
cd backend
pytest
pytest --cov=. --cov-report=html
```

**Frontend**:
```bash
cd frontend
npm run test
npm run test:coverage
```

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant data isolation
- HTTPS/TLS 1.3 enforcement
- Rate limiting
- GDPR compliance

## 🤝 Contributing

This is a private project. For internal team members:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add some feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a Pull Request

## 📄 License

Proprietary - OnQuota 2025. All rights reserved.

## 👥 Team

- **Tech Lead**: TBD
- **Backend Developers**: TBD
- **Frontend Developers**: TBD
- **DevOps**: TBD
- **QA**: TBD

## 📞 Contact

For questions or support, contact: [your-email@onquota.com]

---

**Version**: 1.0.0-alpha
**Last Updated**: November 2025
**Status**: In Development 🚧
