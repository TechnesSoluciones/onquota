# Implementación de Modales de Crear y Editar Gastos

## Resumen General

Se ha implementado un sistema completo de modales para crear y editar gastos en la aplicación OnQuota con validación Zod, formularios interactivos y manejo de errores robusto.

## Archivos Creados

### 1. Validación Zod
**Archivo**: `/lib/validations/expense.ts`
- **Descripción**: Esquemas de validación Zod para crear y actualizar gastos
- **Campos Validados**:
  - `amount`: Número positivo, mínimo 0.01
  - `currency`: Código de moneda (3 caracteres, default: 'COP')
  - `date`: Fecha que no puede ser futura
  - `category_id`: UUID opcional de categoría
  - `description`: String 5-500 caracteres (obligatorio)
  - `vendor_name`: String opcional, máximo 255 caracteres
  - `receipt_url`: URL opcional
  - `receipt_number`: String opcional, máximo 100 caracteres
  - `notes`: String opcional, máximo 1000 caracteres

**Tipos Exportados**:
- `CreateExpenseFormData`: Tipo para crear gastos
- `UpdateExpenseFormData`: Tipo para editar gastos (todos los campos opcionales)

### 2. Modal de Crear Gasto
**Archivo**: `/components/expenses/CreateExpenseModal.tsx`

**Características**:
- Dialog modal responsive (max-width: 2xl)
- Scroll automático para contenido largo
- Carga dinámicamente categorías del backend
- Validación completa con react-hook-form + Zod
- Control de Select con react-hook-form Controller
- Loading state durante la petición
- Toast notifications para éxito/error
- Campos organizados en grid responsivo (2 columnas en desktop, 1 en mobile)
- IDs HTML únicos para accesibilidad
- Atributos aria-invalid para formularios accesibles
- Botones con estados deshabilitados durante loading

**Props**:
```typescript
interface CreateExpenseModalProps {
  open: boolean                    // Estado del modal
  onOpenChange: (open: boolean) => void  // Controlador de apertura/cierre
  onSuccess: () => void           // Callback después de crear
}
```

**Flujo**:
1. Modal se abre → Carga categorías del backend
2. Usuario completa el formulario
3. Al enviar → Valida con Zod
4. Convierte strings vacíos a undefined
5. Realiza POST a `/api/v1/expenses`
6. Muestra toast de éxito/error
7. Cierra modal y ejecuta callback

### 3. Modal de Editar Gasto
**Archivo**: `/components/expenses/EditExpenseModal.tsx`

**Características**:
- Similar a CreateExpenseModal pero para editar
- Pre-carga datos del gasto existente
- Carga categorías dinámicamente
- Validación parcial (campos opcionales)
- PUT request a `/api/v1/expenses/{id}`
- Manejo seguro del estado con guardias (if !expense return null)

**Props**:
```typescript
interface EditExpenseModalProps {
  open: boolean                         // Estado del modal
  onOpenChange: (open: boolean) => void // Controlador
  expense: ExpenseWithCategory | null   // Gasto a editar
  onSuccess: () => void                // Callback después de editar
}
```

**Diferencias con Create**:
- Recibe gasto actual como prop
- Pre-rellena el formulario con datos existentes
- Validación con updateExpenseSchema (parcial)
- Convierte datos al backend correctamente

### 4. Integración en Página de Gastos
**Archivo**: `/app/(dashboard)/expenses/page.tsx` (Actualizado)

**Cambios Realizados**:
1. Importaciones añadidas:
   - `CreateExpenseModal` y `EditExpenseModal`
   - `useState` para manejar estados modales
   - Tipo `ExpenseWithCategory`
   - Ícono `Edit` de lucide-react

2. Estados añadidos:
   ```typescript
   const [createModalOpen, setCreateModalOpen] = useState(false)
   const [editModalOpen, setEditModalOpen] = useState(false)
   const [selectedExpense, setSelectedExpense] = useState<ExpenseWithCategory | null>(null)
   ```

3. Botón "Nuevo Gasto":
   - Cambiado de Link a Button
   - Abre modal de crear en lugar de navegar

4. Botón de Acciones por Fila:
   - Remplacé el botón "Ver" con "Editar"
   - Abre modal de editar con el gasto seleccionado

5. Componentes Modales:
   - `CreateExpenseModal` con callback `refresh()`
   - `EditExpenseModal` con callback `refresh()` + limpieza de estado

## Funcionalidades Implementadas

### Validación
- Validación completa en tiempo real con react-hook-form
- Esquemas Zod para create y update
- Mensajes de error personalizados en español
- Indicadores visuales de campos obligatorios (*)

### Manejo de Estados
- Loading state durante peticiones
- Deshabilitación de formulario en loading
- Spinner animado en botón de envío
- Limpiezaautomática de formulario después de éxito

### UX/Accesibilidad
- Modales responsivos con scroll
- Labels HTML asociados a inputs
- Atributos aria-invalid para screen readers
- Focus visible en botones
- Caracteres restantes indicados en campos grandes
- Mensajes de error debajo de cada campo

### Integración Backend
- Consumo de API correctamente tipado
- Manejo de errores de respuesta
- Conversión de tipos (strings a numbers, etc.)
- Conversión de strings vacíos a undefined
- Refresh automático de lista después de cambios

## Dependencias Utilizadas

```json
{
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.x",
  "zod": "^3.x",
  "lucide-react": "^x.x",
  "@radix-ui/react-dialog": "components/ui/dialog",
  "@radix-ui/react-select": "components/ui/select"
}
```

## Ejemplos de Uso

### Uso en el componente de Gastos
```typescript
// Estados
const [createModalOpen, setCreateModalOpen] = useState(false)
const [editModalOpen, setEditModalOpen] = useState(false)
const [selectedExpense, setSelectedExpense] = useState<ExpenseWithCategory | null>(null)

// Botón crear
<Button onClick={() => setCreateModalOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Nuevo Gasto
</Button>

// Botón editar en tabla
<Button
  onClick={() => {
    setSelectedExpense(expense)
    setEditModalOpen(true)
  }}
>
  <Edit className="h-4 w-4 mr-2" />
  Editar
</Button>

// Modales
<CreateExpenseModal
  open={createModalOpen}
  onOpenChange={setCreateModalOpen}
  onSuccess={() => refresh()}
/>

<EditExpenseModal
  open={editModalOpen}
  onOpenChange={setEditModalOpen}
  expense={selectedExpense}
  onSuccess={() => {
    refresh()
    setSelectedExpense(null)
  }}
/>
```

## Estructura de Formulario

### Modal de Crear
```
Row 1 (2 cols):
  - Monto * (number)
  - Moneda * (select: COP, USD, EUR)

Row 2 (2 cols):
  - Fecha del Gasto * (date)
  - Categoría (select from backend)

Full Width:
  - Descripción * (textarea, 5-500 chars)

Row 3 (2 cols):
  - Proveedor (text, optional)
  - Número de Recibo (text, optional)

Full Width:
  - URL de Recibo (url, optional)

Full Width:
  - Notas Adicionales (textarea, optional, max 1000)
```

## Mensajes de Error

Todos los mensajes de validación y error están en español:

```
Validación:
- "El monto debe ser mayor a 0"
- "El monto mínimo es 0.01"
- "Moneda debe tener 3 caracteres"
- "La fecha no puede ser futura"
- "Categoría inválida"
- "La descripción debe tener al menos 5 caracteres"
- "La descripción no puede exceder 500 caracteres"

API:
- "No se pudieron cargar las categorías"
- "Gasto creado correctamente"
- "Gasto actualizado correctamente"
- "Error al crear el gasto"
- "Error al actualizar el gasto"
```

## Notas Técnicas

### Conversión de Tipos
- Empty strings se convierten a undefined para campos opcionales
- Numbers se convierten explícitamente al enviar
- Fechas se manejan como strings ISO

### Manejo de Errores
- Try-catch con tipos correctos (error: unknown)
- Type casting seguro de errores
- Fallback a mensaje genérico si no hay detalles

### Performance
- Carga de categorías solo cuando modal está abierto
- Memoización de efectos para evitar re-renders innecesarios
- Reseteo de formulario automático

### Accesibilidad
- IDs únicos para inputs (normal y edit)
- Labels HTML correctos
- Indicadores visuales de campos requeridos
- Atributos aria-invalid
- Control de foco en modales

## Testing

Para probar manualmente:

1. **Crear Gasto**:
   - Click en "Nuevo Gasto"
   - Llenar formulario
   - Click "Crear Gasto"
   - Verificar toast de éxito
   - Verificar que aparece en tabla

2. **Editar Gasto**:
   - Click en "Editar" en una fila
   - Modificar datos
   - Click "Guardar Cambios"
   - Verificar toast de éxito
   - Verificar cambios en tabla

3. **Validación**:
   - Intentar crear sin datos
   - Ver errores en campos
   - Intentar fecha futura
   - Ver error "La fecha no puede ser futura"

4. **Categorías**:
   - Modales deben cargar categorías del backend
   - Si hay error, mostrar toast

## URLs de API Utilizadas

- `GET /api/v1/expense-categories` - Obtener categorías
- `POST /api/v1/expenses` - Crear gasto
- `PUT /api/v1/expenses/{id}` - Actualizar gasto

## Mejoras Futuras Posibles

1. Agregar upload de archivo de recibo
2. Autocompletado de proveedores
3. Previsualización de recibo URL
4. Historial de monedas usadas recientemente
5. Guardado automático en localStorage
6. Validación en tiempo real más agresiva
7. Soporte para múltiples divisas con conversión

