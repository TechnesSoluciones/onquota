# FRONTEND ARCHITECTURE - OnQuota

## Documento Arquitectonico Frontend v1.0

**Proyecto**: OnQuota SaaS
**Stack**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
**Fecha**: Noviembre 2025
**Autor**: Arquitecto de Software
**Estado**: Documento Oficial de Referencia

---

## Tabla de Contenidos

1. [Vision General de Arquitectura](#1-vision-general-de-arquitectura)
2. [Estructura de Carpetas](#2-estructura-de-carpetas)
3. [Decisiones Arquitectonicas](#3-decisiones-arquitectonicas)
4. [Patrones y Convenciones](#4-patrones-y-convenciones)
5. [Performance y Optimizacion](#5-performance-y-optimizacion)
6. [Seguridad Frontend](#6-seguridad-frontend)
7. [Developer Experience](#7-developer-experience)
8. [Guia de Implementacion](#8-guia-de-implementacion)
9. [Checklist de Seguridad](#9-checklist-de-seguridad)

---

## 1. VISION GENERAL DE ARQUITECTURA

### 1.1 Diagrama de Arquitectura

```
┌──────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS 14 APP                             │
│                         (App Router)                                  │
└──────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼────────┐        ┌─────────▼──────┐        ┌──────────▼────────┐
│  Server        │        │  Client        │        │  Middleware       │
│  Components    │        │  Components    │        │  (Auth Guard)     │
│  (RSC)         │        │  (Interactive) │        │                   │
└───────┬────────┘        └─────────┬──────┘        └──────────┬────────┘
        │                           │                           │
        │                           │                           │
┌───────▼───────────────────────────▼───────────────────────────▼────────┐
│                        PRESENTATION LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Pages   │  │ Layouts  │  │Templates │  │  Modals  │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        COMPONENT LAYER                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Features │  │  Shared  │  │  UI Kit  │  │  Forms   │             │
│  │Components│  │Components│  │(shadcn)  │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Hooks   │  │  Utils   │  │Validators│  │Formatters│             │
│  │  (use*)  │  │          │  │  (Zod)   │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        STATE MANAGEMENT LAYER                          │
│  ┌──────────────────┐          ┌──────────────────┐                   │
│  │  Zustand Stores  │          │  React Context   │                   │
│  │  (Global State)  │          │  (Theme, User)   │                   │
│  └──────────────────┘          └──────────────────┘                   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        DATA ACCESS LAYER                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  API Services    │  │  Query Helpers   │  │  Cache Manager   │   │
│  │  (axios client)  │  │  (SWR/React Q.)  │  │  (localStorage)  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────┐
                        │   FastAPI Backend  │
                        │   /api/v1/*        │
                        └────────────────────┘
```

### 1.2 Flujo de Datos

```
┌─────────────┐
│   User      │
│  Action     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Component      │  ───────►  State Change (Zustand/Context)
│  Event Handler  │                    │
└─────────────────┘                    │
       │                               │
       ▼                               ▼
┌─────────────────┐            ┌──────────────┐
│  API Service    │            │  UI Update   │
│  Call           │            │  (Re-render) │
└──────┬──────────┘            └──────────────┘
       │
       ▼
┌─────────────────┐
│  Backend API    │
│  (FastAPI)      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Response       │
│  Processing     │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Update Store   │ ───────► UI Re-render
└─────────────────┘
```

### 1.3 Principios Arquitectonicos

1. **Separation of Concerns**: Capas claramente definidas
2. **Composition over Inheritance**: Componentes componibles
3. **Server-First**: Maximizar Server Components
4. **Progressive Enhancement**: Funcional sin JavaScript
5. **Type Safety**: TypeScript estricto en todo momento
6. **Performance Budget**: Bundle inicial < 500KB
7. **Accessibility First**: WCAG 2.1 AA compliance
8. **Mobile First**: Responsive desde el inicio

---

## 2. ESTRUCTURA DE CARPETAS

### 2.1 Estructura Completa

```
frontend/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Route Group: Autenticacion
│   │   ├── layout.tsx            # Layout especifico de auth
│   │   ├── login/
│   │   │   ├── page.tsx          # Server Component
│   │   │   └── loading.tsx       # Loading UI
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/              # Route Group: Dashboard protegido
│   │   ├── layout.tsx            # Dashboard layout (sidebar, header)
│   │   ├── loading.tsx           # Loading global
│   │   ├── error.tsx             # Error boundary
│   │   ├── page.tsx              # Dashboard home
│   │   │
│   │   ├── expenses/             # Modulo Gastos
│   │   │   ├── page.tsx          # Lista de gastos (Server Component)
│   │   │   ├── loading.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Detalle de gasto
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx  # Editar gasto
│   │   │   └── new/
│   │   │       └── page.tsx      # Crear gasto
│   │   │
│   │   ├── clients/              # Modulo Clientes
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   │
│   │   ├── sales/                # Modulo Ventas
│   │   │   ├── page.tsx
│   │   │   ├── quotations/
│   │   │   │   └── page.tsx
│   │   │   └── opportunities/
│   │   │       └── page.tsx
│   │   │
│   │   ├── analytics/            # Modulo Analitica
│   │   │   ├── page.tsx
│   │   │   └── spa/
│   │   │       └── page.tsx
│   │   │
│   │   ├── quotas/               # Modulo Cuotas
│   │   │   └── page.tsx
│   │   │
│   │   ├── activities/           # Visitas y Llamadas
│   │   │   ├── visits/
│   │   │   │   └── page.tsx
│   │   │   └── calls/
│   │   │       └── page.tsx
│   │   │
│   │   └── settings/             # Configuracion
│   │       ├── page.tsx
│   │       ├── profile/
│   │       │   └── page.tsx
│   │       └── team/
│   │           └── page.tsx
│   │
│   ├── api/                      # API Routes (si necesario)
│   │   └── webhooks/
│   │       └── route.ts
│   │
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (redirect)
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   └── globals.css               # Global styles
│
├── components/                   # Componentes organizados por tipo
│   ├── features/                 # Feature-specific components
│   │   ├── expenses/
│   │   │   ├── expense-form.tsx
│   │   │   ├── expense-list.tsx
│   │   │   ├── expense-card.tsx
│   │   │   ├── expense-filters.tsx
│   │   │   ├── expense-stats.tsx
│   │   │   └── ocr-upload.tsx
│   │   │
│   │   ├── clients/
│   │   │   ├── client-form.tsx
│   │   │   ├── client-list.tsx
│   │   │   ├── client-card.tsx
│   │   │   └── client-filters.tsx
│   │   │
│   │   ├── sales/
│   │   │   ├── quotation-form.tsx
│   │   │   ├── opportunity-pipeline.tsx
│   │   │   └── sales-funnel.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── spa-upload.tsx
│   │   │   ├── spa-results.tsx
│   │   │   └── charts/
│   │   │       ├── revenue-chart.tsx
│   │   │       └── expense-chart.tsx
│   │   │
│   │   └── auth/
│   │       ├── login-form.tsx
│   │       └── register-form.tsx
│   │
│   ├── layout/                   # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   ├── dashboard-shell.tsx
│   │   └── mobile-nav.tsx
│   │
│   ├── shared/                   # Shared business components
│   │   ├── data-table.tsx
│   │   ├── empty-state.tsx
│   │   ├── error-message.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── pagination.tsx
│   │   ├── search-input.tsx
│   │   ├── status-badge.tsx
│   │   ├── user-avatar.tsx
│   │   └── confirmation-modal.tsx
│   │
│   └── ui/                       # shadcn/ui components (primitives)
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── label.tsx
│       ├── toast.tsx
│       ├── card.tsx
│       ├── tabs.tsx
│       └── ... (otros shadcn components)
│
├── lib/                          # Utilidades y configuracion
│   ├── api/                      # API client y servicios
│   │   ├── client.ts             # Axios instance configurado
│   │   ├── interceptors.ts       # Request/Response interceptors
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── expenses.service.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── sales.service.ts
│   │   │   └── analytics.service.ts
│   │   └── query-keys.ts         # React Query keys
│   │
│   ├── auth/                     # Autenticacion
│   │   ├── session.ts            # Session management
│   │   ├── tokens.ts             # Token storage/retrieval
│   │   └── permissions.ts        # Role-based permissions
│   │
│   ├── validations/              # Schemas de validacion Zod
│   │   ├── auth.schemas.ts
│   │   ├── expense.schemas.ts
│   │   ├── client.schemas.ts
│   │   └── common.schemas.ts
│   │
│   ├── utils/                    # Funciones utilitarias
│   │   ├── cn.ts                 # classNames merger (tailwind-merge)
│   │   ├── formatters.ts         # Date, currency, number formatters
│   │   ├── validators.ts         # Custom validators
│   │   ├── errors.ts             # Error handling utilities
│   │   └── storage.ts            # LocalStorage wrapper
│   │
│   └── constants/                # Constantes de la aplicacion
│       ├── routes.ts             # Rutas de la app
│       ├── api-endpoints.ts      # Backend API endpoints
│       ├── roles.ts              # User roles constants
│       └── config.ts             # App configuration
│
├── hooks/                        # Custom React Hooks
│   ├── use-auth.ts               # Autenticacion hook
│   ├── use-user.ts               # Current user hook
│   ├── use-debounce.ts           # Debounce hook
│   ├── use-media-query.ts        # Responsive hook
│   ├── use-toast.ts              # Toast notifications hook
│   ├── use-pagination.ts         # Pagination hook
│   │
│   ├── api/                      # Data fetching hooks
│   │   ├── use-expenses.ts       # useQuery para expenses
│   │   ├── use-clients.ts
│   │   ├── use-sales.ts
│   │   └── use-analytics.ts
│   │
│   └── mutations/                # Mutation hooks
│       ├── use-create-expense.ts
│       ├── use-update-expense.ts
│       └── use-delete-expense.ts
│
├── store/                        # Zustand stores
│   ├── auth.store.ts             # Authentication state
│   ├── ui.store.ts               # UI state (sidebar, modals)
│   ├── filters.store.ts          # Filtros globales
│   └── notifications.store.ts    # Notifications queue
│
├── types/                        # TypeScript types
│   ├── api/                      # API response types
│   │   ├── auth.types.ts
│   │   ├── expense.types.ts
│   │   ├── client.types.ts
│   │   └── common.types.ts
│   │
│   ├── models/                   # Domain models
│   │   ├── user.model.ts
│   │   ├── expense.model.ts
│   │   └── client.model.ts
│   │
│   └── index.ts                  # Barrel exports
│
├── middleware.ts                 # Next.js middleware (auth guard)
│
├── public/                       # Assets estaticos
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── styles/                       # Estilos globales
│   └── globals.css
│
├── config/                       # Configuracion del proyecto
│   ├── site.ts                   # Site metadata
│   └── navigation.ts             # Navigation config
│
├── .env.local                    # Variables de entorno
├── .env.example                  # Template de .env
├── next.config.js                # Next.js config
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind config
├── postcss.config.js             # PostCSS config
├── .eslintrc.json                # ESLint config
├── .prettierrc                   # Prettier config
├── jest.config.js                # Jest config
├── package.json
└── README.md
```

### 2.2 Explicacion de Estructura

#### App Directory (Next.js 14 App Router)

**Route Groups**:
- `(auth)/`: Agrupa rutas publicas sin layout de dashboard
- `(dashboard)/`: Agrupa rutas protegidas con layout compartido

**Ventajas**:
- Layouts anidados automaticos
- Loading y error states por ruta
- Server Components por defecto
- Data fetching co-localizado
- File-based routing

#### Components Directory

**Organizacion por tipo**:
1. **features/**: Componentes especificos de dominio (expenses, clients, etc.)
2. **layout/**: Componentes de estructura (header, sidebar)
3. **shared/**: Componentes reutilizables de negocio
4. **ui/**: Componentes primitivos de shadcn/ui

**Razon**: Facilita encontrar componentes y evita la "component hell"

#### Lib Directory

Contiene toda la logica de negocio NO relacionada con UI:
- API services
- Validaciones
- Utilidades
- Constantes

#### Hooks Directory

Todos los custom hooks centralizados, divididos en:
- Hooks genericos (use-debounce, use-media-query)
- Hooks de datos (use-expenses, use-clients)
- Hooks de mutaciones (use-create-*, use-update-*)

#### Store Directory

Estado global con Zustand. Solo para:
- Auth state
- UI state (sidebar abierto/cerrado)
- Filtros globales persistentes
- Notifications queue

**Importante**: NO usar Zustand para datos del servidor (usar React Query/SWR)

---

## 3. DECISIONES ARQUITECTONICAS

### 3.1 State Management

#### Decision: Zustand + React Context (hibrido)

**Zustand para**:
- Authentication state
- Global UI state (sidebar, theme, locale)
- Filtros persistentes entre paginas
- Notification queue

**React Context para**:
- User data (read-only, provisto desde server)
- Theme provider
- Tenant information

**Server State (NO usar Zustand/Context)**:
- React Query o SWR para datos del backend
- Cache automatico
- Revalidacion automativa
- Optimistic updates

**Justificacion**:
```typescript
// INCORRECTO: Guardar datos del servidor en Zustand
const useExpenseStore = create((set) => ({
  expenses: [],
  setExpenses: (expenses) => set({ expenses })
}))

// CORRECTO: Usar React Query para datos del servidor
function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: expenseService.getAll
  })
}

// Zustand solo para UI state
const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}))
```

**Trade-offs**:
- **Pro**: Separacion clara entre client state y server state
- **Pro**: Cache automatico con React Query
- **Pro**: Zustand es ligero (~1KB)
- **Con**: Dos sistemas de state (learning curve)
- **Con**: React Query agrega ~40KB al bundle

**Decision final**: Usar React Query (ya incluido en el stack moderno)

#### Server Components vs Client Components

**Estrategia**: Server-first, Client cuando sea necesario

**Server Components (RSC) para**:
- Listados de datos
- Paginas de detalle
- Layouts estaticos
- Componentes sin interactividad

**Client Components para**:
- Forms con validacion
- Componentes con useState/useEffect
- Event handlers (onClick, onChange)
- Componentes con animaciones
- Componentes que usan browser APIs

**Patron de implementacion**:
```typescript
// app/expenses/page.tsx - SERVER COMPONENT
import { ExpenseList } from '@/components/features/expenses/expense-list'

export default async function ExpensesPage() {
  // Data fetching en el servidor
  const expenses = await expenseService.getAll()

  return (
    <div>
      <h1>Gastos</h1>
      {/* Pasar datos al Client Component */}
      <ExpenseList initialData={expenses} />
    </div>
  )
}

// components/features/expenses/expense-list.tsx - CLIENT COMPONENT
'use client'

export function ExpenseList({ initialData }) {
  const [filters, setFilters] = useState({})

  // useQuery con initialData del servidor
  const { data: expenses } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expenseService.getAll(filters),
    initialData
  })

  return <div>{/* Renderizar lista */}</div>
}
```

**Trade-offs**:
- **Pro**: Mejor performance (menos JavaScript al cliente)
- **Pro**: SEO mejorado
- **Pro**: Menor tiempo de hidratacion
- **Con**: Curva de aprendizaje
- **Con**: No todos los patterns de React funcionan

### 3.2 API Integration

#### Patron de Servicios API

**Estructura**:
```typescript
// lib/api/client.ts
import axios from 'axios'
import { getAccessToken, refreshAccessToken } from '@/lib/auth/tokens'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: Agregar token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Refresh token automatico
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si es 401 y no es retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Redirect a login
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
```

**Servicio por modulo**:
```typescript
// lib/api/services/expenses.service.ts
import { apiClient } from '../client'
import type {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseListResponse
} from '@/types/api/expense.types'

export const expenseService = {
  getAll: async (filters?: ExpenseFilters): Promise<ExpenseListResponse> => {
    const { data } = await apiClient.get('/api/v1/expenses/', { params: filters })
    return data
  },

  getById: async (id: string): Promise<Expense> => {
    const { data } = await apiClient.get(`/api/v1/expenses/${id}`)
    return data
  },

  create: async (expense: ExpenseCreate): Promise<Expense> => {
    const { data } = await apiClient.post('/api/v1/expenses/', expense)
    return data
  },

  update: async (id: string, expense: ExpenseUpdate): Promise<Expense> => {
    const { data } = await apiClient.put(`/api/v1/expenses/${id}`, expense)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/expenses/${id}`)
  },

  approve: async (id: string): Promise<Expense> => {
    const { data } = await apiClient.post(`/api/v1/expenses/${id}/approve`)
    return data
  }
}
```

#### Manejo de Tokens JWT

**Decision**: httpOnly Cookies (RECOMENDADO)

**Comparacion**:

| Aspecto | localStorage | httpOnly Cookies |
|---------|--------------|------------------|
| Seguridad XSS | Vulnerable | Protegido |
| Seguridad CSRF | Seguro | Necesita CSRF token |
| SSR Compatible | No | Si |
| Auto-envio | No (manual) | Si (automatico) |
| Expiracion | Manual | Automatica |

**Implementacion recomendada**:

```typescript
// lib/auth/tokens.ts

// Backend debe setear cookies httpOnly
// Frontend solo necesita funciones de lectura del estado

export function isAuthenticated(): boolean {
  // Cookie httpOnly se envia automaticamente
  // Frontend verifica si tiene session valida
  return document.cookie.includes('session=')
}

// No es necesario guardar access token en frontend
// Se maneja via cookies automaticamente

export async function refreshAccessToken(): Promise<void> {
  // POST a /auth/refresh
  // Backend rotara las cookies automaticamente
  await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include' // Enviar cookies
  })
}

export async function logout(): Promise<void> {
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include'
  })
  window.location.href = '/login'
}
```

**Alternativa (si backend no soporta cookies)**:

```typescript
// lib/auth/tokens.ts - Usando localStorage (menos seguro)

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  })

  if (!response.ok) {
    clearTokens()
    throw new Error('Token refresh failed')
  }

  const data = await response.json()
  setAccessToken(data.access_token)
  setRefreshToken(data.refresh_token)

  return data.access_token
}
```

**Recomendacion para OnQuota**:
Modificar backend FastAPI para soportar httpOnly cookies. Es la opcion mas segura y compatible con SSR.

#### Error Handling Centralizado

```typescript
// lib/utils/errors.ts

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function handleAPIError(error: unknown): APIError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 500
    const message = error.response?.data?.message ?? error.message
    const code = error.response?.data?.code
    const details = error.response?.data?.details

    return new APIError(message, status, code, details)
  }

  if (error instanceof Error) {
    return new APIError(error.message, 500)
  }

  return new APIError('Unknown error occurred', 500)
}

// Hook para manejo de errores
export function useErrorHandler() {
  const { toast } = useToast()

  return useCallback((error: unknown) => {
    const apiError = handleAPIError(error)

    // Logging (en produccion, enviar a Sentry/LogRocket)
    console.error('API Error:', apiError)

    // Mostrar toast al usuario
    toast({
      variant: 'destructive',
      title: 'Error',
      description: apiError.message
    })
  }, [toast])
}
```

#### Cache Strategy

**Decision**: React Query con cache agresivo

```typescript
// lib/api/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false
    }
  }
})

// Query keys centralizados
// lib/api/query-keys.ts
export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters: ExpenseFilters) => [...queryKeys.expenses.lists(), filters] as const,
    details: () => [...queryKeys.expenses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.expenses.details(), id] as const
  },
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters: ClientFilters) => [...queryKeys.clients.lists(), filters] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clients.details(), id] as const
  }
}
```

### 3.3 Forms y Validacion

**Stack decidido**: React Hook Form + Zod

**Patron de implementacion**:

```typescript
// lib/validations/expense.schemas.ts
import { z } from 'zod'

export const expenseCreateSchema = z.object({
  category_id: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive').multipleOf(0.01),
  currency: z.string().length(3).default('USD'),
  description: z.string().min(1, 'Description is required').max(5000),
  date: z.date().max(new Date(), 'Date cannot be in the future'),
  receipt_url: z.string().url().optional(),
  receipt_number: z.string().max(100).optional(),
  vendor_name: z.string().max(255).optional(),
  notes: z.string().optional()
})

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>

// components/features/expenses/expense-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expenseCreateSchema, type ExpenseCreateInput } from '@/lib/validations/expense.schemas'

export function ExpenseForm() {
  const form = useForm<ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: {
      currency: 'USD',
      date: new Date()
    }
  })

  const onSubmit = async (data: ExpenseCreateInput) => {
    try {
      await expenseService.create(data)
      toast({ title: 'Expense created successfully' })
    } catch (error) {
      handleError(error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Otros campos */}
        <Button type="submit">Create Expense</Button>
      </form>
    </Form>
  )
}
```

**Sincronizacion Pydantic → Zod**:

```typescript
// Script de generacion (ejecutar cuando schemas de backend cambien)
// scripts/generate-zod-schemas.ts

/**
 * Este script lee los schemas Pydantic del backend
 * y genera automaticamente los schemas Zod equivalentes
 *
 * Uso: npm run generate:schemas
 */

// Por ahora: MANUAL
// Futuro: Automatizar con ts-to-zod o schema-to-zod
```

**Validacion reutilizable**:

```typescript
// lib/validations/common.schemas.ts
import { z } from 'zod'

// Validators comunes
export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number')
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const currencySchema = z.string().length(3, 'Currency must be 3 characters')

// Reutilizar en otros schemas
import { emailSchema, passwordSchema } from './common.schemas'

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string() // No validar complejidad en login
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // ...
})
```

### 3.4 Routing y Navegacion

#### Middleware de Autenticacion

```typescript
// middleware.ts (root level)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/login', '/register', '/forgot-password']
const authRoutes = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si hay session cookie
  const sessionToken = request.cookies.get('session')?.value
  const isAuthenticated = !!sessionToken

  // Ruta publica: permitir
  if (publicRoutes.includes(pathname)) {
    // Si esta autenticado y trata de acceder a login/register, redirect a dashboard
    if (isAuthenticated && authRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Ruta protegida: verificar autenticacion
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verificar permisos por rol (opcional)
  // const userRole = await getUserRoleFromToken(sessionToken)
  // if (!hasPermission(userRole, pathname)) {
  //   return NextResponse.redirect(new URL('/unauthorized', request.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

#### Layout Hierarchy

```typescript
// app/layout.tsx - ROOT LAYOUT
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

// app/providers.tsx - Providers wrapper
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { queryClient } from '@/lib/api/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// app/(dashboard)/layout.tsx - DASHBOARD LAYOUT
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 3.5 Component Architecture

**Decision**: Feature-based + Atomic Design (hibrido)

**Niveles**:
1. **ui/**: Atomos (Button, Input) - shadcn/ui
2. **shared/**: Moleculas (DataTable, EmptyState)
3. **features/**: Organismos especificos de dominio
4. **layout/**: Templates (DashboardShell, Header)
5. **app/**: Paginas (combinacion de todo)

**Patron de composicion**:

```typescript
// components/ui/button.tsx - ATOMO
export const Button = ({ children, ...props }) => {
  return <button {...props}>{children}</button>
}

// components/shared/data-table.tsx - MOLECULA
export function DataTable<T>({
  data,
  columns,
  onRowClick
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        {/* Renderizar headers */}
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow onClick={() => onRowClick(row)}>
            {/* Renderizar celdas */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// components/features/expenses/expense-list.tsx - ORGANISMO
export function ExpenseList() {
  const { data: expenses } = useExpenses()

  return (
    <DataTable
      data={expenses}
      columns={expenseColumns}
      onRowClick={(expense) => router.push(`/expenses/${expense.id}`)}
    />
  )
}

// app/(dashboard)/expenses/page.tsx - PAGINA
export default function ExpensesPage() {
  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="flex justify-between">
          <h1>Expenses</h1>
          <Button>New Expense</Button>
        </div>
        <ExpenseList />
      </div>
    </DashboardShell>
  )
}
```

---

## 4. PATRONES Y CONVENCIONES

### 4.1 Naming Conventions

#### Archivos

```
kebab-case para archivos
- expense-form.tsx
- use-expenses.ts
- expense.service.ts
- expense.schemas.ts

PascalCase para componentes (opcional, pero consistente)
- ExpenseForm.tsx (si prefieres, pero mantener consistencia)
```

#### Componentes

```typescript
// PascalCase
export function ExpenseForm() {}
export const DataTable = () => {}
```

#### Funciones y variables

```typescript
// camelCase
const handleSubmit = () => {}
const userId = '123'
const isLoading = true
```

#### Constantes

```typescript
// UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.onquota.com'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
```

#### Types e Interfaces

```typescript
// PascalCase
type User = { ... }
interface UserProps { ... }

// Sufijos especificos
type ExpenseCreateInput = { ... }     // Form input
type ExpenseResponse = { ... }        // API response
interface ExpenseFormProps { ... }    // Component props
```

#### Custom Hooks

```typescript
// Prefijo "use"
function useExpenses() { ... }
function useAuth() { ... }
function useDebounce() { ... }
```

#### Event Handlers

```typescript
// Prefijo "handle" o "on"
const handleClick = () => {}
const handleSubmit = () => {}
const onFormSubmit = () => {}
```

### 4.2 Folder Organization

**Reglas**:
1. Un componente por archivo
2. Co-locate archivos relacionados
3. Usar index.ts para barrel exports (con moderacion)
4. Agrupar por feature, no por tipo de archivo

**Ejemplo**:

```
components/features/expenses/
├── expense-form.tsx
├── expense-list.tsx
├── expense-card.tsx
├── expense-filters.tsx
├── hooks/
│   ├── use-expense-form.ts
│   └── use-expense-filters.ts
├── utils/
│   └── expense-formatters.ts
└── index.ts  # Barrel export (opcional)
```

### 4.3 Import Paths

**Configuracion de aliases** (ya en tsconfig.json):

```json
{
  "paths": {
    "@/*": ["./*"],
    "@/components/*": ["./components/*"],
    "@/lib/*": ["./lib/*"],
    "@/hooks/*": ["./hooks/*"],
    "@/types/*": ["./types/*"],
    "@/store/*": ["./store/*"],
    "@/styles/*": ["./styles/*"]
  }
}
```

**Orden de imports**:

```typescript
// 1. External libraries
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal aliases
import { Button } from '@/components/ui/button'
import { expenseService } from '@/lib/api/services/expenses.service'
import { useAuth } from '@/hooks/use-auth'

// 3. Relative imports (evitar cuando sea posible)
import { ExpenseCard } from './expense-card'

// 4. Types
import type { Expense } from '@/types/api/expense.types'

// 5. Styles (si aplica)
import styles from './styles.module.css'
```

### 4.4 Error Boundaries

```typescript
// app/error.tsx - Error Boundary de Next.js
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}

// components/shared/error-boundary.tsx - Custom Error Boundary
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Enviar a servicio de logging (Sentry, LogRocket)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h3 className="font-semibold text-destructive">Error</h3>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
```

### 4.5 Loading States

```typescript
// app/(dashboard)/expenses/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

// components/shared/loading-spinner.tsx
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex justify-center">
      <div className={cn('animate-spin rounded-full border-2 border-primary border-t-transparent', sizeClasses[size])} />
    </div>
  )
}
```

### 4.6 TypeScript Types Organization

```typescript
// types/api/expense.types.ts
export interface Expense {
  id: string
  tenant_id: string
  user_id: string
  category_id?: string
  amount: number
  currency: string
  description: string
  date: string
  receipt_url?: string
  receipt_number?: string
  vendor_name?: string
  status: ExpenseStatus
  approved_by?: string
  rejection_reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface ExpenseCreateInput {
  category_id?: string
  amount: number
  currency?: string
  description: string
  date: Date
  receipt_url?: string
  receipt_number?: string
  vendor_name?: string
  notes?: string
}

export interface ExpenseUpdateInput extends Partial<ExpenseCreateInput> {}

export interface ExpenseListResponse {
  items: Expense[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ExpenseFilters {
  page?: number
  page_size?: number
  status?: ExpenseStatus
  category_id?: string
  date_from?: string
  date_to?: string
  search?: string
}
```

---

## 5. PERFORMANCE Y OPTIMIZACION

### 5.1 Code Splitting

**Estrategias**:

1. **Route-based splitting** (automatico con Next.js)
2. **Component-based splitting** (lazy loading)
3. **Library splitting** (dynamic imports)

```typescript
// Lazy load de componentes pesados
import dynamic from 'next/dynamic'

const ExpenseChart = dynamic(() => import('@/components/features/analytics/expense-chart'), {
  loading: () => <LoadingSpinner />,
  ssr: false // No renderizar en servidor si usa browser APIs
})

// Lazy load de librerias
const ReactPDF = dynamic(() => import('@react-pdf/renderer'), {
  ssr: false
})
```

### 5.2 Lazy Loading

```typescript
// Imagenes
import Image from 'next/image'

<Image
  src="/expense-placeholder.jpg"
  alt="Expense"
  width={300}
  height={200}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// Componentes fuera del viewport
import { lazy, Suspense } from 'react'

const ExpenseComments = lazy(() => import('./expense-comments'))

export function ExpenseDetail() {
  return (
    <div>
      {/* Contenido principal */}
      <Suspense fallback={<LoadingSpinner />}>
        <ExpenseComments />
      </Suspense>
    </div>
  )
}
```

### 5.3 Image Optimization

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['api.onquota.com', 's3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  }
}

// Uso
<Image
  src={expense.receipt_url}
  alt="Receipt"
  width={800}
  height={600}
  quality={85}
  priority={false} // true solo para above-the-fold
/>
```

### 5.4 Bundle Size Management

**Analisis del bundle**:

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^14.0.0"
  }
}
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // ... config
})
```

**Estrategias de optimizacion**:

1. **Tree shaking**: Importar solo lo necesario
```typescript
// MAL
import _ from 'lodash'

// BIEN
import debounce from 'lodash/debounce'
```

2. **Evitar librerias pesadas**:
```typescript
// MAL: moment.js (288KB)
import moment from 'moment'

// BIEN: date-fns (tree-shakeable)
import { format, parseISO } from 'date-fns'
```

3. **Comprimir respuestas**:
```typescript
// next.config.js
module.exports = {
  compress: true, // Gzip compression
}
```

### 5.5 Server vs Client Components Strategy

**Regla general**: Server por defecto, Client solo cuando sea necesario

```typescript
// ✅ CORRECTO: Server Component
// app/expenses/page.tsx
import { expenseService } from '@/lib/api/services/expenses.service'
import { ExpenseList } from '@/components/features/expenses/expense-list-client'

export default async function ExpensesPage() {
  const expenses = await expenseService.getAll()

  return <ExpenseList initialData={expenses} />
}

// ✅ CORRECTO: Client Component con interactividad
// components/features/expenses/expense-list-client.tsx
'use client'

export function ExpenseList({ initialData }) {
  const [filters, setFilters] = useState({})

  return (
    <div>
      <ExpenseFilters onChange={setFilters} />
      <ExpenseTable data={initialData} filters={filters} />
    </div>
  )
}

// ❌ INCORRECTO: Client Component sin razon
'use client'

export function ExpenseDetail({ expense }) {
  // No usa hooks ni interactividad
  return <div>{expense.description}</div>
}

// ✅ CORRECTO: Server Component
export function ExpenseDetail({ expense }) {
  return <div>{expense.description}</div>
}
```

**Performance impact**:
- Server Component: 0KB JavaScript al cliente
- Client Component: ~50KB+ JavaScript al cliente

**Target**: 70% Server Components, 30% Client Components

---

## 6. SEGURIDAD FRONTEND

### 6.1 Protected Routes

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('session')

  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

### 6.2 Role-based UI Rendering

```typescript
// lib/auth/permissions.ts
import { UserRole } from '@/types/api/auth.types'

export const permissions = {
  expenses: {
    create: [UserRole.ADMIN, UserRole.SALES_REP],
    approve: [UserRole.ADMIN, UserRole.SUPERVISOR],
    delete: [UserRole.ADMIN]
  },
  clients: {
    create: [UserRole.ADMIN, UserRole.SALES_REP],
    delete: [UserRole.ADMIN]
  }
}

export function hasPermission(userRole: UserRole, resource: string, action: string): boolean {
  const allowedRoles = permissions[resource]?.[action] || []
  return allowedRoles.includes(userRole)
}

// hooks/use-permission.ts
export function usePermission(resource: string, action: string): boolean {
  const { user } = useAuth()

  if (!user) return false

  return hasPermission(user.role, resource, action)
}

// Uso en componentes
export function ExpenseActions({ expense }) {
  const canApprove = usePermission('expenses', 'approve')
  const canDelete = usePermission('expenses', 'delete')

  return (
    <div>
      {canApprove && <Button onClick={handleApprove}>Approve</Button>}
      {canDelete && <Button onClick={handleDelete}>Delete</Button>}
    </div>
  )
}
```

### 6.3 CSRF Protection

```typescript
// lib/api/client.ts
apiClient.interceptors.request.use((config) => {
  // Si usas cookies, agregar CSRF token
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }

  return config
})
```

### 6.4 XSS Prevention

**Reglas**:

1. **NUNCA usar dangerouslySetInnerHTML** sin sanitizacion
```typescript
// ❌ PELIGROSO
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SEGURO: Usar libreria de sanitizacion
import DOMPurify from 'isomorphic-dompurify'

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

2. **React escapa automaticamente** (usar por defecto)
```typescript
// ✅ SEGURO
<div>{userInput}</div>
```

3. **Validar inputs con Zod**
```typescript
const userInputSchema = z.string().max(500).regex(/^[a-zA-Z0-9\s]+$/)
```

### 6.5 Secure Token Storage

**Opcion 1: httpOnly Cookies (RECOMENDADO)**
```typescript
// Backend setea cookies httpOnly
// Frontend no puede acceder via JavaScript
// Automaticamente protegido contra XSS
```

**Opcion 2: localStorage (menos seguro, pero practico)**
```typescript
// lib/utils/storage.ts
const ALLOWED_KEYS = ['theme', 'sidebar_state'] as const

export function setItem(key: typeof ALLOWED_KEYS[number], value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.error('localStorage.setItem error:', error)
  }
}

export function getItem(key: typeof ALLOWED_KEYS[number]): string | null {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error('localStorage.getItem error:', error)
    return null
  }
}

// NUNCA guardar tokens en localStorage directamente
// Si es necesario, encriptar antes de guardar
```

### 6.6 Input Sanitization

```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  })
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-z0-9._-]/gi, '_').substring(0, 255)
}

export function sanitizeSearchQuery(query: string): string {
  // Remover caracteres especiales que puedan causar problemas
  return query.replace(/[<>\"\']/g, '').trim().substring(0, 100)
}
```

---

## 7. DEVELOPER EXPERIENCE

### 7.1 ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "react/no-unescaped-entities": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 7.2 Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 7.3 TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}
```

### 7.4 Path Aliases (ya configurado)

```json
// tsconfig.json
{
  "paths": {
    "@/*": ["./*"],
    "@/components/*": ["./components/*"],
    "@/lib/*": ["./lib/*"],
    "@/hooks/*": ["./hooks/*"],
    "@/types/*": ["./types/*"],
    "@/store/*": ["./store/*"]
  }
}
```

### 7.5 Hot Reload Optimization

```javascript
// next.config.js
module.exports = {
  // Turbopack (experimental, mas rapido que Webpack)
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}
```

### 7.6 VS Code Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## 8. GUIA DE IMPLEMENTACION

### 8.1 Fase 1: Setup Inicial (Semana 1)

**Checklist**:

- [ ] Configurar estructura de carpetas
- [ ] Instalar dependencias (ya hecho via package.json)
- [ ] Configurar ESLint + Prettier
- [ ] Configurar path aliases en tsconfig.json
- [ ] Crear componentes base de shadcn/ui necesarios
- [ ] Configurar middleware de autenticacion
- [ ] Crear layout de dashboard base
- [ ] Configurar React Query client
- [ ] Crear API client con interceptors

**Pasos**:

```bash
# 1. Instalar dependencias adicionales
npm install @tanstack/react-query
npm install isomorphic-dompurify

# 2. Generar componentes shadcn/ui base
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add toast

# 3. Crear archivos base
mkdir -p lib/api/services
mkdir -p lib/auth
mkdir -p lib/validations
mkdir -p hooks/api
mkdir -p store
mkdir -p types/api
```

### 8.2 Fase 2: Autenticacion (Semana 2)

**Implementacion**:

1. **Crear tipos de Auth**
```typescript
// types/api/auth.types.ts
export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
}

export enum UserRole {
  ADMIN = 'admin',
  SALES_REP = 'sales_rep',
  SUPERVISOR = 'supervisor',
  ANALYST = 'analyst'
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  company_name: string
  email: string
  password: string
  full_name: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}
```

2. **Crear servicio de Auth**
```typescript
// lib/api/services/auth.service.ts
import { apiClient } from '../client'
import type { User, LoginCredentials, RegisterData, TokenResponse } from '@/types/api/auth.types'

export const authService = {
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const { data } = await apiClient.post('/api/v1/auth/login', credentials)
    return data
  },

  register: async (registerData: RegisterData): Promise<TokenResponse> => {
    const { data } = await apiClient.post('/api/v1/auth/register', registerData)
    return data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout', { refresh_token: refreshToken })
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get('/api/v1/auth/me')
    return data
  },

  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const { data } = await apiClient.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
    return data
  }
}
```

3. **Crear auth store**
```typescript
// store/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/api/auth.types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false })
    }),
    {
      name: 'auth-storage'
    }
  )
)
```

4. **Crear hook useAuth**
```typescript
// hooks/use-auth.ts
'use client'

import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/lib/api/services/auth.service'
import { useRouter } from 'next/navigation'
import { setAccessToken, setRefreshToken, clearTokens } from '@/lib/auth/tokens'

export function useAuth() {
  const router = useRouter()
  const { user, isAuthenticated, setUser, logout: clearUser } = useAuthStore()

  const login = async (email: string, password: string) => {
    const tokens = await authService.login({ email, password })
    setAccessToken(tokens.access_token)
    setRefreshToken(tokens.refresh_token)

    const user = await authService.getCurrentUser()
    setUser(user)

    router.push('/dashboard')
  }

  const logout = async () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      await authService.logout(refreshToken)
    }

    clearTokens()
    clearUser()
    router.push('/login')
  }

  return {
    user,
    isAuthenticated,
    login,
    logout
  }
}
```

5. **Crear forms de login y register**
```typescript
// components/features/auth/login-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations/auth.schemas'
import { useAuth } from '@/hooks/use-auth'

export function LoginForm() {
  const { login } = useAuth()
  const form = useForm({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data) => {
    await login(data.email, data.password)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

### 8.3 Fase 3: Modulo Expenses (Semana 3-4)

**Implementacion**:

1. Crear tipos
2. Crear servicio API
3. Crear schemas de validacion Zod
4. Crear hooks de datos (useExpenses, useCreateExpense)
5. Crear componentes:
   - ExpenseList
   - ExpenseForm
   - ExpenseCard
   - ExpenseFilters
6. Crear paginas:
   - /expenses (lista)
   - /expenses/new (crear)
   - /expenses/[id] (detalle)
   - /expenses/[id]/edit (editar)

### 8.4 Fase 4: Modulo Clients (Semana 5-6)

Similar a Expenses, seguir el mismo patron.

### 8.5 Fase 5: Modulos Restantes (Semana 7+)

Continuar con el patron establecido para:
- Sales (Quotations, Opportunities)
- Analytics (SPA Upload)
- Quotas
- Activities (Visits, Calls)

---

## 9. CHECKLIST DE SEGURIDAD

### Frontend Security Checklist

#### Autenticacion y Autorizacion
- [ ] Tokens almacenados de forma segura (httpOnly cookies preferido)
- [ ] Refresh tokens rotados en cada uso
- [ ] Middleware de autenticacion protege rutas
- [ ] Role-based UI rendering implementado
- [ ] Logout limpia todos los tokens y cache

#### Validacion de Inputs
- [ ] Todos los forms usan validacion Zod
- [ ] Inputs sanitizados antes de enviar al backend
- [ ] File uploads validados (tipo, tamano)
- [ ] URLs validadas antes de redirect

#### XSS Prevention
- [ ] NUNCA usar dangerouslySetInnerHTML sin sanitizacion
- [ ] User-generated content sanitizado con DOMPurify
- [ ] CSP headers configurados (via backend)

#### CSRF Protection
- [ ] CSRF tokens en requests de mutacion (si se usan cookies)
- [ ] SameSite cookie attribute configurado (backend)

#### Exposure de Datos
- [ ] NO exponer API keys en codigo cliente
- [ ] Variables sensibles en .env.local (NO committed)
- [ ] NO loggear datos sensibles en console.log (produccion)

#### Dependencias
- [ ] Dependencias actualizadas regularmente
- [ ] npm audit ejecutado periodicamente
- [ ] Solo usar paquetes de sources confiables

#### Performance y DOS Prevention
- [ ] Rate limiting en forms (debounce)
- [ ] File upload size limits
- [ ] Pagination en listas grandes
- [ ] Lazy loading de componentes pesados

#### Network Security
- [ ] HTTPS en produccion (obligatorio)
- [ ] Requests a backend sobre HTTPS
- [ ] CORS configurado correctamente (backend)

#### Error Handling
- [ ] NO exponer stack traces al usuario
- [ ] Error messages genericos al usuario
- [ ] Errores detallados solo en logs (servidor)

#### Monitoring y Logging
- [ ] Logging de acciones criticas (login, logout)
- [ ] Integracion con servicio de error tracking (Sentry)
- [ ] Analytics de uso (opcional)

---

## RESUMEN EJECUTIVO

### Stack Final
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (UI) + React Query (Server)
- **Forms**: React Hook Form + Zod
- **API**: Axios + Interceptors
- **Auth**: JWT + httpOnly Cookies (recomendado)

### Performance Targets
- Bundle inicial: < 500KB
- Lighthouse Score: > 90
- Time to Interactive: < 3s
- Server Components: 70%+

### Security Priorities
1. httpOnly cookies para tokens
2. Input sanitization obligatoria
3. Role-based access control
4. XSS y CSRF protection
5. Regular dependency audits

### Developer Experience
- Type-safe en todo momento
- ESLint + Prettier configurados
- Hot reload optimizado
- Clear folder structure
- Comprehensive documentation

### Next Steps
1. Setup inicial (Semana 1)
2. Implementar autenticacion (Semana 2)
3. Modulo Expenses (Semana 3-4)
4. Modulo Clients (Semana 5-6)
5. Modulos restantes (Semana 7+)

---

**Documento version**: 1.0
**Ultima actualizacion**: Noviembre 2025
**Mantenedor**: Arquitecto Frontend OnQuota

Este documento es la referencia oficial para el desarrollo frontend de OnQuota.
Debe ser actualizado cuando se tomen nuevas decisiones arquitectonicas.
