# OnQuota Testing Guide

## Overview

This guide provides comprehensive instructions for running tests across the OnQuota project. The test suite includes:

- **Backend Unit Tests**: Testing individual functions and components
- **Backend Integration Tests**: Testing API endpoints and database interactions
- **Frontend Unit Tests**: Component and hook tests using Jest
- **E2E Tests**: Full user workflow testing with Playwright

## Current Coverage Goals

- **Backend**: 80%+ code coverage
- **Frontend**: 70%+ code coverage

---

## Backend Testing (Python/Pytest)

### Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov pytest-mock

# Create test database
# Update DATABASE_TEST_URL in backend/tests/conftest.py if needed
```

### Running Tests

#### Run all tests
```bash
pytest --cov=. --cov-report=html
```

#### Run only unit tests
```bash
pytest tests/unit/ -v
```

#### Run only integration tests
```bash
pytest tests/integration/ -v
```

#### Run specific test file
```bash
pytest tests/unit/test_transport_repository.py -v
```

#### Run specific test class
```bash
pytest tests/unit/test_transport_repository.py::TestVehicleOperations -v
```

#### Run with markers
```bash
# Run only security tests
pytest -m security -v

# Run all except slow tests
pytest -m "not slow" -v
```

#### Run with coverage report
```bash
pytest --cov=. --cov-report=html --cov-report=term-missing

# View HTML coverage report
open htmlcov/index.html
```

#### Run with specific coverage threshold
```bash
pytest --cov=. --cov-fail-under=80
```

#### Parallel execution (faster)
```bash
pip install pytest-xdist
pytest -n auto  # Uses all CPU cores
```

### Test Structure

Backend tests are organized as follows:

```
backend/
├── tests/
│   ├── conftest.py                          # Pytest fixtures and configuration
│   ├── unit/
│   │   ├── test_transport_repository.py     # Vehicle/Shipment CRUD tests
│   │   ├── test_transport_advanced.py       # Edge cases and boundary tests
│   │   ├── test_auth_repository.py          # Authentication tests
│   │   ├── test_auth_advanced.py            # Password/token security tests
│   │   ├── test_client_repository.py
│   │   ├── test_sales_repository.py
│   │   ├── test_expense_repository.py
│   │   ├── test_dashboard_repository.py
│   │   ├── test_security.py                 # Security testing
│   │   └── test_exception_handlers.py
│   └── integration/
│       ├── test_transport_api.py            # Complete workflows
│       ├── test_auth_flow.py                # Auth integration tests
│       ├── test_sales_integration.py
│       ├── test_dashboard_integration.py
│       ├── test_security_integration.py
│       ├── test_csrf_integration.py
│       ├── test_rate_limiting.py
│       └── test_logging_integration.py
```

### Key Testing Areas

#### 1. Transport Module
- Vehicle CRUD operations
- Shipment management
- Expense tracking
- Fleet statistics
- Maintenance scheduling

**Key test files**:
- `/backend/tests/unit/test_transport_repository.py` (1000+ lines)
- `/backend/tests/unit/test_transport_advanced.py` (600+ lines)
- `/backend/tests/integration/test_transport_api.py` (500+ lines)

#### 2. Authentication Module
- User registration and login
- Password hashing and verification
- Token management (JWT, refresh tokens)
- Session management
- Role-based access control

**Key test files**:
- `/backend/tests/unit/test_auth_repository.py`
- `/backend/tests/unit/test_auth_advanced.py` (400+ lines)
- `/backend/tests/integration/test_auth_flow.py`

#### 3. Security Testing
- CSRF protection
- Rate limiting
- SQL injection prevention
- XSS protection
- Authentication bypass attempts

**Key test files**:
- `/backend/tests/unit/test_security.py`
- `/backend/tests/unit/test_csrf_protection.py`
- `/backend/tests/integration/test_security_integration.py`

#### 4. Edge Cases & Boundary Values
- Zero values
- Very large numbers
- Unicode/special characters
- Empty collections
- Null values
- Date boundary conditions
- Decimal precision
- Multi-tenant isolation

### Writing New Backend Tests

#### Test Structure (AAA Pattern)

```python
@pytest.mark.asyncio
async def test_example_functionality():
    # Arrange - Set up test data
    tenant = await create_test_tenant(db_session)
    user = await create_test_user(db_session, tenant)

    # Act - Perform the action
    result = await repo.create_something(
        tenant_id=tenant.id,
        field1="value1",
    )

    # Assert - Verify results
    assert result.id is not None
    assert result.field1 == "value1"
```

#### Common Fixtures

```python
@pytest.fixture
async def tenant(db_session: AsyncSession) -> Tenant:
    """Create test tenant"""
    tenant = Tenant(id=uuid4(), name="Test", subdomain="test")
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant

@pytest.fixture
def repo(db_session: AsyncSession) -> TransportRepository:
    """Create repository instance"""
    return TransportRepository(db_session)
```

---

## Frontend Testing (Node/Jest)

### Setup

```bash
cd frontend

# Install dependencies
npm install

# Ensure testing libraries are installed
npm install --save-dev @testing-library/react @testing-library/jest-dom jest @types/jest
```

### Running Tests

#### Run all tests
```bash
npm test
```

#### Run tests in watch mode
```bash
npm test -- --watch
```

#### Run tests with coverage
```bash
npm test -- --coverage
```

#### Run specific test file
```bash
npm test -- KPICards.test.tsx
```

#### Run tests matching pattern
```bash
npm test -- --testNamePattern="should render"
```

#### Run with coverage threshold enforcement
```bash
npm test -- --coverage --collectCoverageFrom='app/**/*.{ts,tsx}'
```

#### Update snapshots
```bash
npm test -- -u
```

#### Debug tests in VS Code
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

### Test Structure

Frontend tests are organized as follows:

```
frontend/
├── __tests__/
│   ├── auth/
│   │   ├── login.test.tsx          # Login component tests
│   │   └── register.test.tsx       # Registration component tests
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── KPICards.test.tsx   # KPI display tests (20+ tests)
│   │   ├── sales/
│   │   │   └── CreateSaleModal.test.tsx  # Sales form tests (25+ tests)
│   │   └── transport/
│   │       ├── VehicleList.test.tsx
│   │       └── ShipmentForm.test.tsx
│   └── hooks/
│       ├── useAuth.test.ts         # Authentication hook tests
│       ├── useSales.test.ts        # Sales management tests (50+ tests)
│       ├── useTransport.test.ts    # Transport management tests (60+ tests)
│       ├── useExpenses.test.ts
│       └── useClients.test.ts
├── e2e/
│   ├── auth.spec.ts                # Auth E2E tests (12+ scenarios)
│   ├── sales-flow.spec.ts          # Sales workflow tests (12+ scenarios)
│   ├── transport-flow.spec.ts
│   └── expense-flow.spec.ts
├── jest.config.js                  # Jest configuration
└── jest.setup.js                   # Jest setup file
```

### Coverage Thresholds

```javascript
coverageThreshold: {
  global: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
  },
  './app/': {
    statements: 75,
    branches: 70,
    functions: 75,
    lines: 75,
  },
  './components/': {
    statements: 75,
    branches: 70,
    functions: 75,
    lines: 75,
  },
  './hooks/': {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
}
```

### Writing New Frontend Tests

#### Component Test Example

```typescript
describe('MyComponent', () => {
  it('renders correctly', () => {
    // Arrange
    const props = { title: 'Test' }

    // Act
    render(<MyComponent {...props} />)

    // Assert
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    // Arrange
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    // Act
    await userEvent.click(screen.getByText('Click me'))

    // Assert
    expect(handleClick).toHaveBeenCalled()
  })
})
```

#### Hook Test Example

```typescript
describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook())

    expect(result.current.data).toEqual([])
  })

  it('updates state on action', async () => {
    const { result } = renderHook(() => useMyHook())

    act(() => {
      result.current.fetchData()
    })

    await waitFor(() => {
      expect(result.current.data).not.toEqual([])
    })
  })
})
```

### Mocking Best Practices

```typescript
// Mock API calls
jest.mock('@/lib/api/client')
const mockApi = require('@/lib/api/client').apiClient

mockApi.get.mockResolvedValue({ data: mockData })

// Mock hooks
jest.mock('@/hooks/useAuth')
const mockUseAuth = require('@/hooks/useAuth').useAuth
mockUseAuth.mockReturnValue({ isLoggedIn: true })

// Mock Next.js router
jest.mock('next/navigation')
const mockUseRouter = require('next/navigation').useRouter
mockUseRouter.mockReturnValue({ push: jest.fn() })
```

---

## E2E Testing (Playwright)

### Setup

```bash
cd frontend

# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install

# Create playwright config (if not exists)
npx playwright init
```

### Running E2E Tests

#### Run all E2E tests
```bash
npx playwright test
```

#### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

#### Run with UI mode
```bash
npx playwright test --ui
```

#### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

#### Run specific test
```bash
npx playwright test -g "login with invalid credentials"
```

#### Debug a test
```bash
npx playwright test --debug
```

#### Run against different browsers
```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=chromium
```

#### Run with trace recording
```bash
npx playwright test --trace on
```

#### View test report
```bash
npx playwright show-report
```

### E2E Test Files

- `/frontend/e2e/auth.spec.ts` - Authentication flows (12+ scenarios)
  - Registration and login
  - Invalid credentials
  - Password validation
  - Forgot password
  - Logout
  - Session persistence

- `/frontend/e2e/sales-flow.spec.ts` - Sales workflow (14+ scenarios)
  - Create quote
  - Add multiple items
  - Apply discounts
  - Edit and send quotes
  - Change status
  - Bulk operations
  - Export/PDF generation

- `/frontend/e2e/transport-flow.spec.ts` - Vehicle/shipment management
  - Create vehicles
  - Track shipments
  - Log expenses
  - Schedule maintenance
  - Generate reports

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('user can perform action', async ({ page }) => {
    // Navigate
    await page.goto('http://localhost:3000/page')

    // Interact
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button:has-text("Submit")')

    // Assert
    await expect(page).toHaveURL(/\/success/)
    await expect(page.locator('text=Success')).toBeVisible()
  })
})
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to main/develop branches
- Pull requests
- Scheduled nightly builds

### Running Tests Locally Before Commit

```bash
# Backend tests
cd backend && pytest --cov=. --cov-fail-under=80

# Frontend tests
cd frontend && npm test -- --coverage

# E2E tests
cd frontend && npx playwright test
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

cd backend && pytest tests/unit/ -q || exit 1
cd ../frontend && npm test -- --watchAll=false || exit 1
```

---

## Coverage Reports

### Backend Coverage Report

```bash
cd backend
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

Coverage report includes:
- Statement coverage
- Branch coverage
- Missing line indicators
- Coverage by file

### Frontend Coverage Report

```bash
cd frontend
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## Troubleshooting

### Backend Issues

**AsyncIO errors**
```bash
# Ensure asyncio_mode is set in pytest.ini
pytest -v --asyncio-mode=auto
```

**Database connection errors**
```bash
# Check TEST_DATABASE_URL in conftest.py
# Ensure test database exists and is accessible
```

**Import errors**
```bash
# Add backend to Python path
export PYTHONPATH="${PYTHONPATH}:/path/to/backend"
```

### Frontend Issues

**Module resolution errors**
```bash
# Clear Jest cache
npm test -- --clearCache
```

**Snapshot mismatches**
```bash
# Update snapshots after intentional changes
npm test -- -u
```

**Timeout errors**
```bash
# Increase Jest timeout
jest.setTimeout(10000)
```

### E2E Issues

**Element not found**
```typescript
// Use proper selectors and waits
await page.waitForSelector('[data-testid="element"]')
await page.locator('[data-testid="element"]').waitFor()
```

**Flaky tests**
```typescript
// Add proper waits
await page.waitForLoadState('networkidle')
await expect(element).toBeVisible({ timeout: 5000 })
```

---

## Best Practices

### Testing Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test**: Each test should verify one thing
3. **Descriptive names**: Test names should clearly state what they test
4. **Mock external dependencies**: Don't test third-party libraries
5. **Use fixtures**: Reuse common test data setup
6. **Test edge cases**: Boundary values, null inputs, empty collections
7. **Keep tests independent**: Tests shouldn't rely on other tests
8. **Use meaningful assertions**: Avoid generic assertions

### Coverage Goals

- **Lines**: All code should be executed at least once
- **Branches**: Both if/else paths should be tested
- **Functions**: Every function should be called in tests
- **Statements**: Related to line coverage

### Test Naming Convention

```python
# Backend tests
test_<function>_<scenario>_<expected_result>
test_create_vehicle_with_all_fields_returns_vehicle_object
test_get_vehicles_filter_by_status_returns_matching_vehicles
test_update_nonexistent_vehicle_returns_none

# Frontend tests
it('renders <component> correctly', () => {})
it('handles <user action> <scenario>', () => {})
it('displays <expected result> when <condition>', () => {})
```

---

## Performance Testing

### Backend Performance

```bash
# Run with timing information
pytest --durations=10

# Profile with pytest-benchmark
pip install pytest-benchmark
pytest tests/performance/ --benchmark-only
```

### Frontend Performance

```bash
# Test component render times
npm test -- --testPathPattern=performance

# Use React Profiler in development
import { Profiler } from 'react'
```

---

## Continuous Integration

Tests must pass locally before creating a pull request:

```bash
# Run all test suites
./scripts/test-all.sh

# Individual suites
cd backend && pytest --cov=.
cd frontend && npm test -- --coverage
cd frontend && npx playwright test
```

---

## Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Python Async Testing](https://pytest-asyncio.readthedocs.io/)

---

## Contact & Support

For testing issues or questions:
- Check existing test examples in the repository
- Review test documentation in code comments
- Consult the CI/CD logs for failures
