# Quick Start - Dashboard de Gastos

## Para Empezar

### 1. Iniciar el Dev Server
```bash
cd /Users/josegomez/Documents/Code/OnQuota/frontend
npm run dev
```
Accede a `http://localhost:3003/expenses` (o el puerto disponible mostrado)

### 2. Ver la Página
La página principal de gastos está en:
```
URL: http://localhost:3003/expenses
Ruta: /app/(dashboard)/expenses/page.tsx
```

## Estructura de Archivos

```
frontend/
├── hooks/
│   └── useExpenses.ts                    ← Hook de datos
├── components/
│   └── expenses/
│       └── ExpenseFilters.tsx            ← Componente de filtros
├── app/
│   └── (dashboard)/
│       └── expenses/
│           └── page.tsx                  ← Página principal
└── __tests__/
    ├── hooks/
    │   └── useExpenses.test.ts           ← Tests del hook
    └── components/
        └── ExpenseFilters.test.tsx       ← Tests del componente
```

## Flujo de Datos

```
1. Usuario abre http://localhost:3003/expenses

2. Page Component carga
   └─ Llama useExpenses() hook

3. useExpenses() Hook:
   └─ Ejecuta fetchExpenses()
      └─ Llama expensesApi.getExpenses()
         └─ GET /api/v1/expenses

4. Datos llegan del backend
   └─ Hook guarda en state (expenses, pagination)

5. Components se renderizan:
   ├─ ExpenseFilters (permite filtrar)
   └─ Table (muestra datos)

6. Usuario interactúa:
   ├─ Escribe en búsqueda → updateFilters()
   ├─ Selecciona estado → updateFilters()
   ├─ Cambia página → goToPage()
   └─ Click en Limpiar → clearFilters()
```

## Testing

### Ejecutar Tests
```bash
npm test
```

### Tests Disponibles
- `useExpenses.test.ts` - Tests del hook (5 tests)
- `ExpenseFilters.test.tsx` - Tests del componente (6 tests)

## API Endpoints Utilizados

### GET /api/v1/expenses
Obtiene lista paginada de gastos

**Parámetros Query:**
```
- status: "pending" | "approved" | "rejected"
- category_id: string
- user_id: string
- date_from: "YYYY-MM-DD"
- date_to: "YYYY-MM-DD"
- min_amount: number
- max_amount: number
- search: string
- page: number (default: 1)
- page_size: number (default: 20)
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "description": "Gasto",
      "amount": 100.00,
      "currency": "COP",
      "date": "2024-11-08",
      "status": "pending",
      "category": {
        "id": "uuid",
        "name": "Transporte"
      },
      "vendor_name": "Uber",
      ...
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "pages": 8
}
```

## Customización

### Cambiar Items por Página
En `/hooks/useExpenses.ts`:
```typescript
page_size: 20  // ← Cambiar aquí (default: 20)
```

### Agregar Nuevo Filtro
1. Añadir campo en `ExpenseFilters.tsx`
2. Añadir parámetro en `expensesApi.getExpenses()`
3. Llamar `updateFilters()` cuando cambie

### Modificar Columnas de la Tabla
En `/app/(dashboard)/expenses/page.tsx`:
```typescript
<table>
  <thead>
    <tr>
      {/* Agregar <th> aquí */}
    </tr>
  </thead>
  <tbody>
    {expenses.map((expense) => (
      <tr>
        {/* Agregar <td> aquí */}
      </tr>
    ))}
  </tbody>
</table>
```

## Componentes Utilizados

### De UI
- `Input` - Campos de texto
- `Select` - Dropdowns
- `Button` - Botones
- `Badge` - Etiquetas de estado
- `Label` - Etiquetas de formulario

### De Lucide React
- `Plus` - Icono de agregar
- `Search` - Icono de búsqueda
- `X` - Icono de cerrar
- `Loader2` - Spinner de carga
- `AlertCircle` - Icono de error

## Funciones Útiles del Hook

```typescript
const {
  expenses,           // Array de gastos
  pagination,         // { page, page_size, total, pages }
  filters,            // Filtros actuales
  isLoading,          // boolean
  error,              // null | string
  updateFilters,      // (newFilters) => void
  clearFilters,       // () => void
  goToPage,           // (page: number) => void
  refresh,            // () => void
} = useExpenses()
```

## Manejo de Errores

La aplicación maneja automáticamente:
- Errores de API (muestra alerta roja)
- Loading states (muestra spinner)
- Lista vacía (muestra mensaje)
- Paginación fuera de rango (desactiva botones)

## Performance

### Optimizaciones Incluidas
- `useCallback` para prevenir re-renders
- Paginación limita datos
- Reseteo automático de página al filtrar
- No re-fetch en cambios innecesarios

### Bundle Size
- Página `/expenses`: 13.2 kB
- First Load JS: 166 kB

## Próximos Pasos

Para extender la funcionalidad:

### 1. Agregar Vista de Detalle
```typescript
// /app/(dashboard)/expenses/[id]/page.tsx
export default function ExpenseDetailPage({ params }) {
  const { id } = params
  // Usar expensesApi.getExpense(id)
}
```

### 2. Agregar Formulario de Creación
```typescript
// /app/(dashboard)/expenses/new/page.tsx
export default function NewExpensePage() {
  // Usar expensesApi.createExpense()
}
```

### 3. Agregar Acciones en Tabla
```typescript
<td>
  <Button variant="ghost" size="sm">Editar</Button>
  <Button variant="ghost" size="sm">Eliminar</Button>
</td>
```

## Solución de Problemas

### El servidor no inicia
```bash
# Verificar puerto
lsof -i :3000

# Usar otro puerto
PORT=3005 npm run dev
```

### Errores de compilación
```bash
# Limpiar cache
rm -rf .next

# Rebuildar
npm run build
```

### Los datos no se cargan
1. Verificar que la API backend esté corriendo
2. Revisar console de browser (F12)
3. Verificar las credenciales de autenticación

## Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `useExpenses.ts` | Gestión de estado y datos |
| `ExpenseFilters.tsx` | Formulario de filtros |
| `page.tsx` | Página principal |
| `types/expense.ts` | Tipos TypeScript |
| `lib/api/expenses.ts` | Cliente API |
| `constants/expense-status.ts` | Constantes de estado |

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor

# Building
npm run build            # Build production
npm run build --no-lint  # Build sin linting

# Testing
npm test                 # Ejecuta tests
npm test -- --watch     # Watch mode

# Linting
npm run lint             # Ejecuta ESLint
npm run format           # Formatea código

# Tipos
npx tsc --noEmit        # Verifica tipos
```

---

## Status Actual

```
✅ Implementación: COMPLETADA
✅ Build: EXITOSO
✅ Tests: PASADOS
✅ Dev Server: CORRIENDO
```

Para preguntas o reportar issues, revisa los archivos de documentación:
- `EXPENSES_IMPLEMENTATION.md` - Documentación técnica completa
- `DASHBOARD_GASTOS_RESUMEN.md` - Resumen detallado

¡Listo para usar!
