# FRONTEND QUICK REFERENCE - OnQuota

Guia rapida de referencia para desarrolladores frontend.

---

## ESTRUCTURA DE ARCHIVOS - CHEAT SHEET

```
¿Donde pongo mi archivo?

┌─────────────────────────────────────────────────────────────────┐
│ TIPO DE ARCHIVO          │ UBICACION                           │
├─────────────────────────────────────────────────────────────────┤
│ Pagina Next.js            │ app/(dashboard)/[module]/page.tsx   │
│ Layout                    │ app/(dashboard)/layout.tsx          │
│ Loading state             │ app/(dashboard)/[module]/loading.tsx│
│ Error boundary            │ app/(dashboard)/[module]/error.tsx  │
│ Componente de feature     │ components/features/[module]/       │
│ Componente compartido     │ components/shared/                  │
│ Componente UI primitivo   │ components/ui/                      │
│ Layout component          │ components/layout/                  │
│ Custom hook               │ hooks/                              │
│ Data fetching hook        │ hooks/api/use-[resource].ts         │
│ API service               │ lib/api/services/[module].service.ts│
│ Validation schema         │ lib/validations/[module].schemas.ts │
│ Utility function          │ lib/utils/                          │
│ Type definition           │ types/api/[module].types.ts         │
│ Zustand store             │ store/[module].store.ts             │
│ Constant                  │ lib/constants/                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## NAMING CONVENTIONS - CHEAT SHEET

```typescript
// ARCHIVOS
kebab-case:          expense-form.tsx, use-expenses.ts

// COMPONENTES
PascalCase:          ExpenseForm, DataTable, Button

// FUNCIONES/VARIABLES
camelCase:           handleSubmit, userId, isLoading

// CONSTANTES
UPPER_SNAKE_CASE:    API_BASE_URL, MAX_FILE_SIZE

// TYPES/INTERFACES
PascalCase:          User, ExpenseCreateInput, ExpenseFormProps

// HOOKS
use + PascalCase:    useExpenses, useAuth, useDebounce

// EVENT HANDLERS
handle/on + Action:  handleClick, handleSubmit, onFormSubmit

// BOOLEAN VARIABLES
is/has/should:       isLoading, hasError, shouldShow
```

---

## IMPORT ORDER - TEMPLATE

```typescript
// 1. External libraries
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

// 2. Internal aliases
import { Button } from '@/components/ui/button'
import { expenseService } from '@/lib/api/services/expenses.service'
import { useAuth } from '@/hooks/use-auth'

// 3. Relative imports (avoid when possible)
import { ExpenseCard } from './expense-card'

// 4. Types
import type { Expense } from '@/types/api/expense.types'

// 5. Styles (if any)
import styles from './styles.module.css'
```

---

## COMPONENT PATTERNS - TEMPLATES

### Server Component (Default)

```typescript
// app/(dashboard)/expenses/page.tsx
import { expenseService } from '@/lib/api/services/expenses.service'
import { ExpenseList } from '@/components/features/expenses/expense-list'

export default async function ExpensesPage() {
  // Server-side data fetching
  const expenses = await expenseService.getAll()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
      </div>
      <ExpenseList initialData={expenses} />
    </div>
  )
}
```

### Client Component

```typescript
// components/features/expenses/expense-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expenseCreateSchema, type ExpenseCreateInput } from '@/lib/validations/expense.schemas'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCreateExpense } from '@/hooks/mutations/use-create-expense'
import { useToast } from '@/hooks/use-toast'

export function ExpenseForm() {
  const { toast } = useToast()
  const createExpense = useCreateExpense()

  const form = useForm<ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: {
      currency: 'USD',
      date: new Date()
    }
  })

  const onSubmit = async (data: ExpenseCreateInput) => {
    try {
      await createExpense.mutateAsync(data)
      toast({
        title: 'Success',
        description: 'Expense created successfully'
      })
      form.reset()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create expense'
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Expense description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createExpense.isPending}>
          {createExpense.isPending ? 'Creating...' : 'Create Expense'}
        </Button>
      </form>
    </Form>
  )
}
```

### Custom Hook (Data Fetching)

```typescript
// hooks/api/use-expenses.ts
import { useQuery } from '@tanstack/react-query'
import { expenseService } from '@/lib/api/services/expenses.service'
import { queryKeys } from '@/lib/api/query-keys'
import type { ExpenseFilters } from '@/types/api/expense.types'

export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters || {}),
    queryFn: () => expenseService.getAll(filters)
  })
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: () => expenseService.getById(id),
    enabled: !!id
  })
}
```

### Custom Hook (Mutation)

```typescript
// hooks/mutations/use-create-expense.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseService } from '@/lib/api/services/expenses.service'
import { queryKeys } from '@/lib/api/query-keys'
import type { ExpenseCreateInput } from '@/types/api/expense.types'

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ExpenseCreateInput) => expenseService.create(data),
    onSuccess: () => {
      // Invalidate all expense queries to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    }
  })
}
```

### API Service

```typescript
// lib/api/services/expenses.service.ts
import { apiClient } from '../client'
import type {
  Expense,
  ExpenseCreateInput,
  ExpenseUpdateInput,
  ExpenseListResponse,
  ExpenseFilters
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

  create: async (expense: ExpenseCreateInput): Promise<Expense> => {
    const { data } = await apiClient.post('/api/v1/expenses/', expense)
    return data
  },

  update: async (id: string, expense: ExpenseUpdateInput): Promise<Expense> => {
    const { data } = await apiClient.put(`/api/v1/expenses/${id}`, expense)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/expenses/${id}`)
  },

  approve: async (id: string): Promise<Expense> => {
    const { data } = await apiClient.post(`/api/v1/expenses/${id}/approve`)
    return data
  },

  reject: async (id: string, reason: string): Promise<Expense> => {
    const { data } = await apiClient.post(`/api/v1/expenses/${id}/reject`, {
      rejection_reason: reason
    })
    return data
  }
}
```

### Validation Schema (Zod)

```typescript
// lib/validations/expense.schemas.ts
import { z } from 'zod'

export const expenseCreateSchema = z.object({
  category_id: z.string().uuid().optional(),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number'
    })
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters'),
  date: z.date().max(new Date(), 'Date cannot be in the future'),
  receipt_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  receipt_number: z.string().max(100).optional(),
  vendor_name: z.string().max(255).optional(),
  notes: z.string().optional()
})

export const expenseUpdateSchema = expenseCreateSchema.partial()

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>
```

### Type Definition

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

## COMMON TASKS - CODE SNIPPETS

### 1. Crear una nueva pagina protegida

```typescript
// app/(dashboard)/my-page/page.tsx
export default function MyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Page</h1>
      {/* Content */}
    </div>
  )
}

// app/(dashboard)/my-page/loading.tsx
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
```

### 2. Crear un modal/dialog

```typescript
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function MyModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open Modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modal Title</DialogTitle>
          <DialogDescription>Modal description</DialogDescription>
        </DialogHeader>
        {/* Modal content */}
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Mostrar notificacion toast

```typescript
'use client'

import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

export function MyComponent() {
  const { toast } = useToast()

  const showSuccess = () => {
    toast({
      title: 'Success',
      description: 'Operation completed successfully',
    })
  }

  const showError = () => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Something went wrong',
    })
  }

  return (
    <div>
      <Button onClick={showSuccess}>Show Success</Button>
      <Button onClick={showError}>Show Error</Button>
    </div>
  )
}
```

### 4. Tabla con paginacion

```typescript
'use client'

import { useExpenses } from '@/hooks/api/use-expenses'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { useState } from 'react'

export function ExpenseTable() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useExpenses({ page, page_size: 20 })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <DataTable
        data={data.items}
        columns={expenseColumns}
      />
      <Pagination
        currentPage={data.page}
        totalPages={data.pages}
        onPageChange={setPage}
      />
    </div>
  )
}
```

### 5. Formulario con file upload

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function UploadForm() {
  const form = useForm()

  const onSubmit = async (data: any) => {
    const formData = new FormData()
    formData.append('file', data.file[0])
    formData.append('description', data.description)

    await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        type="file"
        accept="image/*,.pdf"
        {...form.register('file')}
      />
      <Input
        placeholder="Description"
        {...form.register('description')}
      />
      <Button type="submit">Upload</Button>
    </form>
  )
}
```

### 6. Proteger accion por rol

```typescript
'use client'

import { usePermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'

export function ExpenseActions({ expense }) {
  const canApprove = usePermission('expenses', 'approve')
  const canDelete = usePermission('expenses', 'delete')

  return (
    <div className="flex gap-2">
      {canApprove && (
        <Button onClick={() => handleApprove(expense.id)}>
          Approve
        </Button>
      )}
      {canDelete && (
        <Button variant="destructive" onClick={() => handleDelete(expense.id)}>
          Delete
        </Button>
      )}
    </div>
  )
}
```

### 7. Debounced search

```typescript
'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { useExpenses } from '@/hooks/api/use-expenses'
import { Input } from '@/components/ui/input'

export function ExpenseSearch() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const { data } = useExpenses({ search: debouncedSearch })

  return (
    <div>
      <Input
        placeholder="Search expenses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {/* Results */}
    </div>
  )
}
```

### 8. Optimistic update

```typescript
// hooks/mutations/use-update-expense.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseService } from '@/lib/api/services/expenses.service'
import { queryKeys } from '@/lib/api/query-keys'

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ExpenseUpdateInput) => expenseService.update(id, data),

    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.detail(id) })

      // Snapshot previous value
      const previousExpense = queryClient.getQueryData(queryKeys.expenses.detail(id))

      // Optimistically update
      queryClient.setQueryData(queryKeys.expenses.detail(id), (old: any) => ({
        ...old,
        ...newData
      }))

      return { previousExpense }
    },

    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(
        queryKeys.expenses.detail(id),
        context?.previousExpense
      )
    },

    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(id) })
    }
  })
}
```

---

## TAILWIND PATTERNS

### Layout

```typescript
// Container
<div className="container mx-auto px-4">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Flex
<div className="flex items-center justify-between">
<div className="flex flex-col space-y-4">

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
```

### Typography

```typescript
// Headings
<h1 className="text-3xl font-bold">
<h2 className="text-2xl font-semibold">
<h3 className="text-xl font-medium">

// Body text
<p className="text-base text-muted-foreground">

// Small text
<span className="text-sm text-muted-foreground">
```

### Cards

```typescript
<div className="rounded-lg border bg-card p-6 shadow-sm">
  <h3 className="font-semibold">Card Title</h3>
  <p className="text-sm text-muted-foreground">Card content</p>
</div>
```

### Forms

```typescript
<div className="space-y-4">
  <div className="space-y-2">
    <label className="text-sm font-medium">Label</label>
    <input className="flex h-10 w-full rounded-md border px-3 py-2" />
  </div>
</div>
```

---

## DEBUGGING TIPS

### React Query DevTools

```typescript
// app/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Console logging (production safe)

```typescript
// lib/utils/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    console.error(...args)
    // Send to error tracking service
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args)
    }
  }
}
```

### Type checking

```bash
# Check types without building
npm run type-check

# Watch mode
tsc --noEmit --watch
```

---

## PERFORMANCE CHECKLIST

- [ ] Use Server Components by default
- [ ] Lazy load heavy components
- [ ] Implement pagination (not infinite scroll for large lists)
- [ ] Optimize images with next/image
- [ ] Use React Query caching
- [ ] Debounce search inputs
- [ ] Implement virtualization for long lists (react-window)
- [ ] Code split by route (automatic with Next.js)
- [ ] Minimize bundle size (check with npm run analyze)
- [ ] Use Web Vitals monitoring

---

## ACCESSIBILITY CHECKLIST

- [ ] Semantic HTML
- [ ] Keyboard navigation support
- [ ] ARIA labels where needed
- [ ] Focus management in modals
- [ ] Color contrast ratios (WCAG AA)
- [ ] Alt text for images
- [ ] Form labels properly associated
- [ ] Error messages accessible

---

## USEFUL COMMANDS

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
npm run type-check         # Type check without building
npm run format             # Format with Prettier

# Testing
npm test                   # Run tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report

# Analysis
npm run analyze            # Analyze bundle size

# Shadcn UI
npx shadcn-ui@latest add [component]  # Add new component
```

---

## ENVIRONMENT VARIABLES

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=OnQuota
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Private (not exposed to browser)
API_SECRET_KEY=your-secret-key
```

**Importante**: Variables con `NEXT_PUBLIC_` son expuestas al cliente.
Nunca poner secrets con este prefijo.

---

## TROUBLESHOOTING

### Error: "use client" directive missing

**Solucion**: Agregar `'use client'` al inicio del archivo que usa hooks o interactividad

### Error: Cannot read property of undefined

**Solucion**: Usar optional chaining `?.` o verificar con `&&`

```typescript
// Antes
{data.items.map(item => ...)}

// Despues
{data?.items?.map(item => ...) || []}
```

### Error: Hydration mismatch

**Solucion**: Asegurar que Server y Client rendericen lo mismo inicialmente

```typescript
// Evitar
const MyComponent = () => {
  const isClient = typeof window !== 'undefined'
  return <div>{isClient ? 'Client' : 'Server'}</div>
}

// Usar
const MyComponent = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <div>Client only content</div>
}
```

### Error: Module not found

**Solucion**: Verificar path aliases en tsconfig.json

---

**Version**: 1.0
**Fecha**: Noviembre 2025
