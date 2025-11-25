# Quick Start - Modales de Gastos

## Uso Rápido

### Para Crear un Gasto

```typescript
import { CreateExpenseModal } from '@/components/expenses/CreateExpenseModal'
import { useState } from 'react'

export default function Page() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Nuevo Gasto</button>

      <CreateExpenseModal
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          // Actualizar lista de gastos aquí
          console.log('Gasto creado!')
        }}
      />
    </>
  )
}
```

### Para Editar un Gasto

```typescript
import { EditExpenseModal } from '@/components/expenses/EditExpenseModal'
import { useState } from 'react'
import type { ExpenseWithCategory } from '@/types/expense'

export default function Page() {
  const [open, setOpen] = useState(false)
  const [expense, setExpense] = useState<ExpenseWithCategory | null>(null)

  const handleEdit = (e: ExpenseWithCategory) => {
    setExpense(e)
    setOpen(true)
  }

  return (
    <>
      <button onClick={() => handleEdit(gastoSeleccionado)}>Editar</button>

      <EditExpenseModal
        open={open}
        onOpenChange={setOpen}
        expense={expense}
        onSuccess={() => {
          // Actualizar lista de gastos aquí
          console.log('Gasto actualizado!')
        }}
      />
    </>
  )
}
```

## Validación

### Usar Directamente

```typescript
import { createExpenseSchema, updateExpenseSchema } from '@/lib/validations/expense'

const data = {
  amount: 100,
  currency: 'COP',
  date: '2024-11-08',
  description: 'Almuerzo de trabajo',
  category_id: 'xxx-xxx-xxx'
}

// Crear
try {
  const validated = createExpenseSchema.parse(data)
  console.log('Válido:', validated)
} catch (error) {
  console.log('Error:', error)
}

// Editar (parcial)
try {
  const validated = updateExpenseSchema.parse({ amount: 200 })
  console.log('Válido:', validated)
} catch (error) {
  console.log('Error:', error)
}
```

## Tipos

### CreateExpenseFormData

```typescript
type CreateExpenseFormData = {
  amount: number
  currency: string
  date: string
  category_id?: string
  description: string
  vendor_name?: string
  receipt_url?: string
  receipt_number?: string
  notes?: string
}
```

### UpdateExpenseFormData

```typescript
type UpdateExpenseFormData = Partial<CreateExpenseFormData>
```

### ExpenseWithCategory

```typescript
type ExpenseWithCategory = {
  id: string
  tenant_id: string
  user_id: string
  category_id: string | null
  amount: number | string
  currency: string
  description: string
  date: string
  receipt_url: string | null
  receipt_number: string | null
  vendor_name: string | null
  status: ExpenseStatus
  approved_by: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  category: ExpenseCategoryResponse | null
}
```

## Campos del Formulario

### Obligatorios
- **amount**: Número mayor a 0, mínimo 0.01
- **currency**: Código de 3 caracteres (COP, USD, EUR)
- **date**: Fecha ISO, no puede ser futura
- **description**: 5-500 caracteres

### Opcionales
- **category_id**: UUID de categoría
- **vendor_name**: 0-255 caracteres
- **receipt_url**: URL válida
- **receipt_number**: 0-100 caracteres
- **notes**: 0-1000 caracteres

## Mensajes de Error Predeterminados

```
Validación:
- "El monto debe ser mayor a 0"
- "El monto mínimo es 0.01"
- "Moneda debe tener 3 caracteres"
- "La fecha no puede ser futura"
- "La descripción debe tener al menos 5 caracteres"
- "La descripción no puede exceder 500 caracteres"

API:
- "No se pudieron cargar las categorías"
- "Gasto creado correctamente"
- "Gasto actualizado correctamente"
- "Error al crear el gasto"
- "Error al actualizar el gasto"
```

## API Endpoints

```
GET    /api/v1/expense-categories       # Obtener categorías
POST   /api/v1/expenses                 # Crear gasto
PUT    /api/v1/expenses/{id}            # Actualizar gasto
```

## Estado del Modal

### CreateExpenseModal Props

```typescript
interface CreateExpenseModalProps {
  open: boolean                      // ¿Está abierto?
  onOpenChange: (open: boolean) => void  // Callback de apertura/cierre
  onSuccess: () => void              // Callback de éxito
}
```

### EditExpenseModal Props

```typescript
interface EditExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseWithCategory | null   // Gasto a editar
  onSuccess: () => void
}
```

## Ejemplo Completo

```typescript
'use client'

import { useState } from 'react'
import { CreateExpenseModal } from '@/components/expenses/CreateExpenseModal'
import { EditExpenseModal } from '@/components/expenses/EditExpenseModal'
import { useExpenses } from '@/hooks/useExpenses'
import type { ExpenseWithCategory } from '@/types/expense'

export default function GastosPage() {
  const { refresh, expenses } = useExpenses()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithCategory | null>(null)

  return (
    <div>
      <h1>Gastos</h1>
      
      <button onClick={() => setCreateOpen(true)}>
        Nuevo Gasto
      </button>

      <table>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.description}</td>
              <td>
                <button
                  onClick={() => {
                    setSelectedExpense(expense)
                    setEditOpen(true)
                  }}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <CreateExpenseModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          refresh()
          setCreateOpen(false)
        }}
      />

      <EditExpenseModal
        open={editOpen}
        onOpenChange={setEditOpen}
        expense={selectedExpense}
        onSuccess={() => {
          refresh()
          setEditOpen(false)
          setSelectedExpense(null)
        }}
      />
    </div>
  )
}
```

## Archivo de Página Actualizado

Ver el archivo `/app/(dashboard)/expenses/page.tsx` para ver cómo se integran los modales.

## Customización

### Cambiar Divisas Disponibles

En `CreateExpenseModal.tsx`, modifica el Select:

```typescript
<SelectContent>
  <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
  <SelectItem value="USD">USD - Dólar</SelectItem>
  <SelectItem value="EUR">EUR - Euro</SelectItem>
  <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
</SelectContent>
```

### Cambiar Validaciones

En `/lib/validations/expense.ts`, modifica el schema:

```typescript
export const createExpenseSchema = z.object({
  amount: z.number().positive().min(0.10), // Cambiar mínimo
  description: z.string().min(10).max(200), // Cambiar rango
  // ...
})
```

### Agregar Campos

1. Agregar al schema Zod
2. Agregar al formulario (CreateExpenseModal y EditExpenseModal)
3. Incluir en la conversión de datos antes de enviar

## Troubleshooting

### Modal no abre
- Verificar que `open` sea `true`
- Verificar que `onOpenChange` esté correctamente implementado

### No se cargan categorías
- Verificar conexión a API
- Revisar la respuesta en Network DevTools
- Ver console para errores

### Validación no funciona
- Verificar que react-hook-form esté instalado
- Verificar que @hookform/resolvers esté instalado
- Verificar que zod esté instalado

### Toast no aparece
- Verificar que useToast() esté disponible
- Verificar que Toaster esté en layout root

## Performance

- Los modales cargan categorías solo cuando se abren
- El formulario se resetea automáticamente después de éxito
- Los errores de validación se mostran en tiempo real
- El estado de loading previene múltiples envíos

## Accesibilidad

- IDs HTML únicos para cada campo
- Labels asociados correctamente
- aria-invalid en campos con error
- Mensajes de error claros
- Navegación por teclado completa
- Focus management en modal

## Próximos Pasos

1. Probar en desarrollo con `npm run dev`
2. Completar testing manual
3. Implementar tests unitarios si lo requiere
4. Deploy a producción

