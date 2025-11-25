# Guías de Implementación OnQuota

**Versión:** 1.0
**Fecha:** 2025-11-09

---

## Tabla de Contenidos

1. [Guía: Crear un Nuevo Módulo Completo](#guía-crear-un-nuevo-módulo-completo)
2. [Guía: Implementar un Endpoint REST](#guía-implementar-un-endpoint-rest)
3. [Guía: Crear un Componente de Formulario](#guía-crear-un-componente-de-formulario)
4. [Guía: Implementar Filtros y Paginación](#guía-implementar-filtros-y-paginación)
5. [Guía: Crear Dashboard con Estadísticas](#guía-crear-dashboard-con-estadísticas)
6. [Guía: Implementar RBAC en Endpoints](#guía-implementar-rbac-en-endpoints)
7. [Guía: Agregar una Migración de Base de Datos](#guía-agregar-una-migración-de-base-de-datos)
8. [Guía: Testing Backend](#guía-testing-backend)
9. [Guía: Testing Frontend](#guía-testing-frontend)
10. [Guía: Desplegar a Producción](#guía-desplegar-a-producción)

---

## Guía: Crear un Nuevo Módulo Completo

Esta guía te llevará paso a paso para crear un módulo completo en OnQuota, usando como ejemplo un módulo de "Tareas" (Tasks).

### Paso 1: Definir el Modelo de Datos

#### 1.1. Crear el Modelo SQLAlchemy

**Archivo:** `/backend/models/task.py`

```python
from sqlalchemy import Column, String, Text, Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from models.base import BaseModel

class TaskStatus(str, enum.Enum):
    """Estados posibles de una tarea"""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskPriority(str, enum.Enum):
    """Prioridades de tarea"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Task(BaseModel):
    """
    Modelo de Tarea

    Representa una tarea asignada a un usuario dentro del sistema.
    """
    __tablename__ = "tasks"

    # Campos específicos
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.TODO, index=True)
    priority = Column(Enum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM, index=True)

    # Relaciones
    assigned_to = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    created_by = Column(UUID, ForeignKey("users.id"), nullable=False)

    # Fechas
    due_date = Column(Date, nullable=True, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relaciones ORM
    assignee = relationship("User", foreign_keys=[assigned_to], backref="assigned_tasks")
    creator = relationship("User", foreign_keys=[created_by], backref="created_tasks")

    def __repr__(self):
        return f"<Task {self.title} ({self.status})>"
```

**Puntos clave:**
- Hereda de `BaseModel` (incluye: id, tenant_id, created_at, updated_at, is_deleted)
- Usa Enums para campos con valores fijos
- Indexa campos que usarás en queries (status, assigned_to, due_date)
- Define relaciones con `relationship()` para facilitar joins

#### 1.2. Registrar el Modelo

**Archivo:** `/backend/models/__init__.py`

```python
from models.task import Task, TaskStatus, TaskPriority

__all__ = [
    # ... otros modelos
    "Task",
    "TaskStatus",
    "TaskPriority",
]
```

### Paso 2: Crear los Schemas Pydantic

**Archivo:** `/backend/schemas/task.py`

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from schemas.task import TaskStatus, TaskPriority

# ==================== Schemas de Item ====================

class TaskBase(BaseModel):
    """Base schema con campos comunes"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[date] = None

class TaskCreate(TaskBase):
    """Schema para crear tarea"""
    assigned_to: UUID

    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v):
        if v and v < date.today():
            raise ValueError('due_date no puede ser en el pasado')
        return v

class TaskUpdate(BaseModel):
    """Schema para actualizar tarea (todos los campos opcionales)"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_to: Optional[UUID] = None
    due_date: Optional[date] = None

class TaskResponse(TaskBase):
    """Schema de respuesta con todos los datos"""
    id: UUID
    tenant_id: UUID
    assigned_to: UUID
    created_by: UUID
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==================== Schemas Avanzados ====================

class TaskWithAssignee(TaskResponse):
    """Incluye datos del usuario asignado"""
    assignee_name: str
    assignee_email: str

class TaskStatusUpdate(BaseModel):
    """Para cambiar solo el estado"""
    status: TaskStatus

class TaskStats(BaseModel):
    """Estadísticas de tareas"""
    total_tasks: int
    todo_count: int
    in_progress_count: int
    completed_count: int
    cancelled_count: int
    overdue_count: int
    by_priority: List[dict]

class TaskListResponse(BaseModel):
    """Respuesta paginada"""
    items: List[TaskWithAssignee]
    total: int
    page: int
    page_size: int
    pages: int
```

**Puntos clave:**
- Separar schemas por propósito (Create, Update, Response)
- `TaskUpdate`: todos los campos opcionales para updates parciales
- Validaciones con `@field_validator`
- `Config.from_attributes = True` para trabajar con ORM

### Paso 3: Crear el Repository

**Archivo:** `/backend/modules/tasks/repository.py`

```python
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional, Tuple
from datetime import date, datetime
from uuid import UUID

from models.task import Task, TaskStatus, TaskPriority
from models.user import User
from schemas.task import TaskCreate, TaskUpdate, TaskStats

class TaskRepository:
    """Repository para gestión de tareas"""

    def __init__(self, db: Session):
        self.db = db

    # ==================== CRUD Básico ====================

    async def create(self, tenant_id: str, data: TaskCreate, created_by: UUID) -> Task:
        """Crear nueva tarea"""
        task = Task(
            tenant_id=tenant_id,
            created_by=created_by,
            **data.model_dump()
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    async def get_by_id(self, tenant_id: str, task_id: UUID) -> Optional[Task]:
        """Obtener tarea por ID"""
        return self.db.query(Task).filter(
            Task.tenant_id == tenant_id,
            Task.id == task_id,
            Task.is_deleted == False
        ).options(
            joinedload(Task.assignee),
            joinedload(Task.creator)
        ).first()

    async def get_all(
        self,
        tenant_id: str,
        filters: dict,
        page: int,
        page_size: int,
        current_user: User
    ) -> Tuple[List[Task], int]:
        """
        Listar tareas con filtros y paginación
        RBAC: Usuarios ven solo tareas asignadas a ellos o creadas por ellos
        """
        query = self.db.query(Task).filter(
            Task.tenant_id == tenant_id,
            Task.is_deleted == False
        )

        # RBAC
        if current_user.role not in ["admin", "supervisor"]:
            query = query.filter(
                or_(
                    Task.assigned_to == current_user.id,
                    Task.created_by == current_user.id
                )
            )

        # Filtros
        if filters.get("status"):
            query = query.filter(Task.status == filters["status"])

        if filters.get("priority"):
            query = query.filter(Task.priority == filters["priority"])

        if filters.get("assigned_to"):
            query = query.filter(Task.assigned_to == filters["assigned_to"])

        if filters.get("overdue_only"):
            query = query.filter(
                Task.due_date < date.today(),
                Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS])
            )

        # Total
        total = query.count()

        # Paginación y ordenamiento
        items = query.order_by(Task.due_date.asc().nullslast(), Task.priority.desc()) \
                     .offset((page - 1) * page_size) \
                     .limit(page_size) \
                     .options(joinedload(Task.assignee)) \
                     .all()

        return items, total

    async def update(self, tenant_id: str, task_id: UUID, data: TaskUpdate) -> Optional[Task]:
        """Actualizar tarea"""
        task = await self.get_by_id(tenant_id, task_id)
        if not task:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Si se marca como completada, guardar timestamp
        if update_data.get("status") == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED:
            update_data["completed_at"] = datetime.utcnow()

        for key, value in update_data.items():
            setattr(task, key, value)

        self.db.commit()
        self.db.refresh(task)
        return task

    async def delete(self, tenant_id: str, task_id: UUID) -> bool:
        """Eliminar tarea (soft delete)"""
        task = await self.get_by_id(tenant_id, task_id)
        if not task:
            return False

        task.is_deleted = True
        self.db.commit()
        return True

    # ==================== Métodos Avanzados ====================

    async def update_status(self, tenant_id: str, task_id: UUID, new_status: TaskStatus) -> Optional[Task]:
        """Cambiar solo el estado"""
        task = await self.get_by_id(tenant_id, task_id)
        if not task:
            return None

        task.status = new_status
        if new_status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(task)
        return task

    async def get_stats(self, tenant_id: str, current_user: User) -> TaskStats:
        """Obtener estadísticas de tareas"""
        query = self.db.query(Task).filter(
            Task.tenant_id == tenant_id,
            Task.is_deleted == False
        )

        # RBAC
        if current_user.role not in ["admin", "supervisor"]:
            query = query.filter(
                or_(
                    Task.assigned_to == current_user.id,
                    Task.created_by == current_user.id
                )
            )

        total_tasks = query.count()

        # Por estado
        todo_count = query.filter(Task.status == TaskStatus.TODO).count()
        in_progress_count = query.filter(Task.status == TaskStatus.IN_PROGRESS).count()
        completed_count = query.filter(Task.status == TaskStatus.COMPLETED).count()
        cancelled_count = query.filter(Task.status == TaskStatus.CANCELLED).count()

        # Tareas vencidas
        overdue_count = query.filter(
            Task.due_date < date.today(),
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS])
        ).count()

        # Por prioridad
        by_priority = self.db.query(
            Task.priority,
            func.count(Task.id).label("count")
        ).filter(
            Task.tenant_id == tenant_id,
            Task.is_deleted == False
        ).group_by(Task.priority).all()

        by_priority_list = [
            {"priority": p.priority.value, "count": p.count}
            for p in by_priority
        ]

        return TaskStats(
            total_tasks=total_tasks,
            todo_count=todo_count,
            in_progress_count=in_progress_count,
            completed_count=completed_count,
            cancelled_count=cancelled_count,
            overdue_count=overdue_count,
            by_priority=by_priority_list
        )
```

**Puntos clave:**
- Inyección de dependencia: `Session` en `__init__`
- Siempre filtrar por `tenant_id` y `is_deleted == False`
- RBAC en métodos de lectura
- Usar `joinedload()` para evitar N+1 queries
- Paginación con `offset()` y `limit()`
- Soft delete: marcar `is_deleted = True`

### Paso 4: Crear el Router

**Archivo:** `/backend/modules/tasks/router.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from core.dependencies import get_db, get_current_user, get_tenant_id
from models.user import User
from modules.tasks.repository import TaskRepository
from schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskWithAssignee,
    TaskStatusUpdate,
    TaskStats,
    TaskListResponse
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

# ==================== Endpoints CRUD ====================

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id)
):
    """
    Crear nueva tarea

    - **title**: Título de la tarea (requerido)
    - **assigned_to**: UUID del usuario asignado (requerido)
    - **priority**: Prioridad (default: MEDIUM)
    - **due_date**: Fecha límite (opcional)
    """
    repo = TaskRepository(db)
    task = await repo.create(tenant_id, data, current_user.id)
    return task

@router.get("", response_model=TaskListResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[UUID] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id)
):
    """
    Listar tareas con filtros

    **Filtros disponibles:**
    - status: TODO, IN_PROGRESS, COMPLETED, CANCELLED
    - priority: LOW, MEDIUM, HIGH, URGENT
    - assigned_to: UUID del usuario
    - overdue_only: true para ver solo tareas vencidas

    **RBAC:** Usuarios regulares solo ven sus tareas
    """
    repo = TaskRepository(db)

    filters = {
        "status": status,
        "priority": priority,
        "assigned_to": assigned_to,
        "overdue_only": overdue_only
    }

    items, total = await repo.get_all(tenant_id, filters, page, page_size, current_user)

    # Transformar a TaskWithAssignee
    items_with_assignee = [
        TaskWithAssignee(
            **item.__dict__,
            assignee_name=f"{item.assignee.first_name} {item.assignee.last_name}",
            assignee_email=item.assignee.email
        )
        for item in items
    ]

    pages = (total + page_size - 1) // page_size

    return TaskListResponse(
        items=items_with_assignee,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )

@router.get("/{task_id}", response_model=TaskWithAssignee)
async def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id)
):
    """Obtener detalle de una tarea"""
    repo = TaskRepository(db)
    task = await repo.get_by_id(tenant_id, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )

    # RBAC: Verificar que el usuario tenga acceso
    if current_user.role not in ["admin", "supervisor"]:
        if task.assigned_to != current_user.id and task.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver esta tarea"
            )

    return TaskWithAssignee(
        **task.__dict__,
        assignee_name=f"{task.assignee.first_name} {task.assignee.last_name}",
        assignee_email=task.assignee.email
    )

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id)
):
    """Actualizar tarea"""
    repo = TaskRepository(db)
    task = await repo.update(tenant_id, task_id, data)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )

    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id)
):
    """Eliminar tarea (soft delete)"""
    repo = TaskRepository(db)
    success = await repo.delete(tenant_id, task_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )

    return None

# ==================== Endpoints Avanzados ====================

@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: UUID,
    data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id)
):
    """Cambiar solo el estado de la tarea"""
    repo = TaskRepository(db)
    task = await repo.update_status(tenant_id, task_id, data.status)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )

    return task

@router.get("/stats/overview", response_model=TaskStats)
async def get_task_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_tenant_id)
):
    """Obtener estadísticas de tareas"""
    repo = TaskRepository(db)
    stats = await repo.get_stats(tenant_id, current_user)
    return stats
```

**Puntos clave:**
- Usar dependencias de FastAPI para inyección
- Documentar cada endpoint con docstrings
- Manejar errores con `HTTPException`
- Validar permisos (RBAC) en endpoints que lo requieran
- Status codes apropiados (201 para creación, 204 para delete)

#### 4.1. Registrar el Router

**Archivo:** `/backend/main.py`

```python
from modules.tasks.router import router as tasks_router

app.include_router(tasks_router, prefix="/api/v1")
```

### Paso 5: Crear la Migración

```bash
cd backend
alembic revision -m "create_tasks_table"
```

**Archivo generado:** `/backend/alembic/versions/XXX_create_tasks_table.py`

```python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = 'XXX'
down_revision = 'YYY'  # Última migración
branch_labels = None
depends_on = None

def upgrade():
    # Crear enum para status
    op.execute("""
        CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
    """)

    # Crear enum para priority
    op.execute("""
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    """)

    # Crear tabla tasks
    op.create_table(
        'tasks',
        sa.Column('id', UUID, primary_key=True),
        sa.Column('tenant_id', UUID, nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False, index=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('status', sa.Enum('todo', 'in_progress', 'completed', 'cancelled', name='task_status'), nullable=False, index=True),
        sa.Column('priority', sa.Enum('low', 'medium', 'high', 'urgent', name='task_priority'), nullable=False, index=True),
        sa.Column('assigned_to', UUID, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('created_by', UUID, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('due_date', sa.Date, nullable=True, index=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false')
    )

def downgrade():
    op.drop_table('tasks')
    op.execute('DROP TYPE task_status')
    op.execute('DROP TYPE task_priority')
```

Ejecutar migración:
```bash
alembic upgrade head
```

### Paso 6: Frontend - Types

**Archivo:** `/frontend/types/task.ts`

```typescript
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Task {
  id: string
  tenant_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string
  created_by: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskWithAssignee extends Task {
  assignee_name: string
  assignee_email: string
}

export interface TaskCreate {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to: string
  due_date?: string | null
}

export interface TaskUpdate {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string | null
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  overdue_only?: boolean
}

export interface TaskListResponse {
  items: TaskWithAssignee[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface TaskStats {
  total_tasks: number
  todo_count: number
  in_progress_count: number
  completed_count: number
  cancelled_count: number
  overdue_count: number
  by_priority: Array<{
    priority: TaskPriority
    count: number
  }>
}
```

### Paso 7: Frontend - Constants

**Archivo:** `/frontend/constants/tasks.ts`

```typescript
import { TaskStatus, TaskPriority } from '@/types/task'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'Por Hacer',
  [TaskStatus.IN_PROGRESS]: 'En Progreso',
  [TaskStatus.COMPLETED]: 'Completada',
  [TaskStatus.CANCELLED]: 'Cancelada',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'border-gray-500 text-gray-700 bg-gray-50',
  [TaskStatus.IN_PROGRESS]: 'border-blue-500 text-blue-700 bg-blue-50',
  [TaskStatus.COMPLETED]: 'border-green-500 text-green-700 bg-green-50',
  [TaskStatus.CANCELLED]: 'border-red-500 text-red-700 bg-red-50',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Baja',
  [TaskPriority.MEDIUM]: 'Media',
  [TaskPriority.HIGH]: 'Alta',
  [TaskPriority.URGENT]: 'Urgente',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'text-gray-600',
  [TaskPriority.MEDIUM]: 'text-blue-600',
  [TaskPriority.HIGH]: 'text-orange-600',
  [TaskPriority.URGENT]: 'text-red-600',
}
```

### Paso 8: Frontend - Validations

**Archivo:** `/frontend/lib/validations/task.ts`

```typescript
import { z } from 'zod'
import { TaskStatus, TaskPriority } from '@/types/task'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(255, 'Título muy largo'),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assigned_to: z.string().uuid('Usuario asignado inválido'),
  due_date: z.string().optional().nullable().refine(
    (date) => {
      if (!date) return true
      return new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0))
    },
    'La fecha límite no puede ser en el pasado'
  ),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional().nullable(),
})

export type CreateTaskFormData = z.infer<typeof createTaskSchema>
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>
```

### Paso 9: Frontend - API Client

**Archivo:** `/frontend/lib/api/tasks.ts`

```typescript
import { apiClient } from './client'
import type {
  Task,
  TaskCreate,
  TaskUpdate,
  TaskFilters,
  TaskListResponse,
  TaskStats,
} from '@/types/task'

export const tasksApi = {
  getTasks: async (filters?: TaskFilters, page = 1, pageSize = 20): Promise<TaskListResponse> => {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('page_size', pageSize.toString())

    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters.overdue_only) params.append('overdue_only', 'true')
    }

    const response = await apiClient.get<TaskListResponse>(`/api/v1/tasks?${params}`)
    return response.data
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/api/v1/tasks/${id}`)
    return response.data
  },

  createTask: async (data: TaskCreate): Promise<Task> => {
    const response = await apiClient.post<Task>('/api/v1/tasks', data)
    return response.data
  },

  updateTask: async (id: string, data: TaskUpdate): Promise<Task> => {
    const response = await apiClient.put<Task>(`/api/v1/tasks/${id}`, data)
    return response.data
  },

  deleteTask: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/tasks/${id}`)
  },

  updateStatus: async (id: string, status: TaskStatus): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/api/v1/tasks/${id}/status`, { status })
    return response.data
  },

  getStats: async (): Promise<TaskStats> => {
    const response = await apiClient.get<TaskStats>('/api/v1/tasks/stats/overview')
    return response.data
  },
}
```

### Paso 10: Frontend - Hook

**Archivo:** `/frontend/hooks/useTasks.ts`

```typescript
import { useState, useEffect } from 'react'
import { tasksApi } from '@/lib/api/tasks'
import type { TaskWithAssignee, TaskFilters, TaskListResponse } from '@/types/task'

export function useTasks(initialFilters?: TaskFilters) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0,
  })
  const [filters, setFilters] = useState<TaskFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await tasksApi.getTasks(filters, pagination.page, pagination.page_size)
      setTasks(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar tareas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filters, pagination.page, pagination.page_size])

  const updateFilters = (newFilters: Partial<TaskFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset a página 1
  }

  const clearFilters = () => {
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const refresh = () => {
    fetchTasks()
  }

  return {
    tasks,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  }
}
```

### Paso 11: Testing

#### Backend Test

**Archivo:** `/backend/tests/test_tasks.py`

```python
import pytest
from fastapi.testclient import TestClient
from datetime import date, timedelta

def test_create_task(client: TestClient, auth_headers):
    """Test crear tarea"""
    data = {
        "title": "Test Task",
        "assigned_to": "uuid-del-usuario",
        "priority": "high",
        "due_date": str(date.today() + timedelta(days=7))
    }
    response = client.post("/api/v1/tasks", json=data, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["title"] == "Test Task"

def test_list_tasks(client: TestClient, auth_headers):
    """Test listar tareas"""
    response = client.get("/api/v1/tasks", headers=auth_headers)
    assert response.status_code == 200
    assert "items" in response.json()
    assert "total" in response.json()

def test_update_status(client: TestClient, auth_headers, task_id):
    """Test cambiar estado"""
    data = {"status": "completed"}
    response = client.patch(f"/api/v1/tasks/{task_id}/status", json=data, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["completed_at"] is not None
```

---

## Guía: Implementar un Endpoint REST

### Checklist de Implementación

1. **Definir el Schema de Request**
   ```python
   class ItemCreate(BaseModel):
       name: str = Field(..., min_length=1)
       value: int = Field(..., ge=0)
   ```

2. **Crear método en Repository**
   ```python
   async def create(self, tenant_id: str, data: ItemCreate) -> Item:
       # Lógica de creación
       pass
   ```

3. **Crear endpoint en Router**
   ```python
   @router.post("/items", response_model=ItemResponse)
   async def create_item(
       data: ItemCreate,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user),
       tenant_id: str = Depends(get_tenant_id)
   ):
       repo = ItemRepository(db)
       item = await repo.create(tenant_id, data)
       return item
   ```

4. **Documentar con docstring**
   ```python
   """
   Crear nuevo item

   - **name**: Nombre del item (requerido)
   - **value**: Valor numérico (>=0)

   Retorna el item creado con su ID.
   """
   ```

5. **Manejar errores**
   ```python
   try:
       item = await repo.create(...)
   except IntegrityError:
       raise HTTPException(
           status_code=status.HTTP_409_CONFLICT,
           detail="Ya existe un item con ese nombre"
       )
   ```

6. **Escribir test**
   ```python
   def test_create_item(client, auth_headers):
       response = client.post("/api/v1/items", json={...}, headers=auth_headers)
       assert response.status_code == 201
   ```

---

## Guía: Crear un Componente de Formulario

### Ejemplo: Modal de Creación

**Archivo:** `/frontend/components/tasks/CreateTaskModal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { tasksApi } from '@/lib/api/tasks'
import { createTaskSchema, type CreateTaskFormData } from '@/lib/validations/task'
import { TaskPriority } from '@/types/task'
import { toast } from 'sonner'

interface CreateTaskModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateTaskModal({ open, onClose, onSuccess }: CreateTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: TaskPriority.MEDIUM,
    },
  })

  const onSubmit = async (data: CreateTaskFormData) => {
    try {
      setIsSubmitting(true)
      await tasksApi.createTask(data)
      toast.success('Tarea creada exitosamente')
      reset()
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al crear tarea')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Tarea">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <Input
            {...register('title')}
            placeholder="Ej: Revisar reporte de ventas"
            error={errors.title?.message}
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <Textarea
            {...register('description')}
            placeholder="Detalles adicionales..."
            rows={3}
          />
        </div>

        {/* Asignado a */}
        <div>
          <label className="block text-sm font-medium mb-1">Asignado a *</label>
          <Select
            {...register('assigned_to')}
            options={[
              // Cargar usuarios dinámicamente
            ]}
            error={errors.assigned_to?.message}
          />
        </div>

        {/* Prioridad */}
        <div>
          <label className="block text-sm font-medium mb-1">Prioridad</label>
          <Select
            {...register('priority')}
            options={[
              { value: TaskPriority.LOW, label: 'Baja' },
              { value: TaskPriority.MEDIUM, label: 'Media' },
              { value: TaskPriority.HIGH, label: 'Alta' },
              { value: TaskPriority.URGENT, label: 'Urgente' },
            ]}
          />
        </div>

        {/* Fecha límite */}
        <div>
          <label className="block text-sm font-medium mb-1">Fecha límite</label>
          <DatePicker
            value={watch('due_date')}
            onChange={(date) => setValue('due_date', date)}
            minDate={new Date()}
          />
          {errors.due_date && (
            <p className="text-sm text-red-600 mt-1">{errors.due_date.message}</p>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Crear Tarea
          </Button>
        </div>
      </form>
    </Modal>
  )
}
```

**Puntos clave:**
- Usar `react-hook-form` para manejo de formulario
- Validación con `zodResolver` y Zod schema
- Mostrar errores inline
- Loading state durante submit
- Toast notifications para feedback
- Reset form al cerrar/enviar

---

## Guía: Implementar Filtros y Paginación

### Backend

```python
@router.get("/items", response_model=ItemListResponse)
async def list_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    # ... más filtros
):
    filters = {
        "search": search,
        "category": category,
        "date_from": date_from,
        "date_to": date_to,
    }

    items, total = await repo.get_all(filters, page, page_size)
    pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages
    }
```

### Repository

```python
async def get_all(self, filters: dict, page: int, page_size: int):
    query = self.db.query(Item).filter(Item.is_deleted == False)

    # Aplicar filtros
    if filters.get("search"):
        query = query.filter(Item.name.ilike(f"%{filters['search']}%"))

    if filters.get("category"):
        query = query.filter(Item.category == filters["category"])

    if filters.get("date_from"):
        query = query.filter(Item.created_at >= filters["date_from"])

    if filters.get("date_to"):
        query = query.filter(Item.created_at <= filters["date_to"])

    # Total
    total = query.count()

    # Paginación
    items = query.order_by(Item.created_at.desc()) \
                 .offset((page - 1) * page_size) \
                 .limit(page_size) \
                 .all()

    return items, total
```

### Frontend

```typescript
// Hook con filtros
export function useItems() {
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['items', filters, page],
    queryFn: () => itemsApi.getItems(filters, page),
  })

  return {
    items: data?.items || [],
    total: data?.total || 0,
    page,
    pages: data?.pages || 0,
    filters,
    setFilters,
    setPage,
    isLoading,
  }
}

// Componente de paginación
<Pagination
  currentPage={page}
  totalPages={pages}
  onPageChange={setPage}
/>
```

---

## Guía: Crear Dashboard con Estadísticas

### Backend - Endpoint de Stats

```python
@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    tenant_id: str = Depends(get_tenant_id),
    current_user: User = Depends(get_current_user)
):
    repo = DashboardRepository(db)
    stats = await repo.get_stats(tenant_id, date_from, date_to, current_user)
    return stats
```

### Repository - Queries de Agregación

```python
async def get_stats(self, tenant_id: str, date_from: date, date_to: date):
    # KPIs básicos
    total_count = self.db.query(func.count(Item.id)).filter(...).scalar()
    total_amount = self.db.query(func.sum(Item.amount)).filter(...).scalar()

    # Agregación por categoría
    by_category = self.db.query(
        Item.category,
        func.count(Item.id).label("count"),
        func.sum(Item.amount).label("total")
    ).filter(...).group_by(Item.category).all()

    # Series temporales
    by_day = self.db.query(
        func.date_trunc('day', Item.created_at).label("date"),
        func.count(Item.id).label("count")
    ).filter(...).group_by("date").order_by("date").all()

    return {
        "total_count": total_count,
        "total_amount": total_amount,
        "by_category": by_category,
        "by_day": by_day
    }
```

### Frontend - Componente de Dashboard

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, BarChart, PieChart } from 'recharts'

export function Dashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const data = await dashboardApi.getStats()
    setStats(data)
    setIsLoading(false)
  }

  if (isLoading) return <Loader />

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_count}</div>
          </CardContent>
        </Card>
        {/* Más cards... */}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={stats.by_category} ... />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={stats.by_day} ... />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## Guía: Implementar RBAC en Endpoints

### Ejemplo: Endpoint con Verificación de Roles

```python
from core.dependencies import require_roles

@router.post("/admin/reset-password")
async def admin_reset_password(
    user_id: UUID,
    new_password: str,
    current_user: User = Depends(require_roles(["admin"]))
):
    """Solo administradores pueden resetear contraseñas"""
    # Lógica...
    pass

@router.get("/reports/sales")
async def get_sales_report(
    current_user: User = Depends(require_roles(["admin", "supervisor"]))
):
    """Solo admin y supervisores pueden ver reportes"""
    # Lógica...
    pass
```

### Dependencia de RBAC

**Archivo:** `/backend/core/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from typing import List

def require_roles(allowed_roles: List[str]):
    """
    Dependencia para verificar roles

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: User = Depends(require_roles(["admin"]))):
            ...
    """
    async def check_role(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requiere uno de los siguientes roles: {', '.join(allowed_roles)}"
            )
        return current_user

    return check_role
```

### RBAC a Nivel de Repository

```python
async def get_all(self, tenant_id: str, filters: dict, user: User):
    query = self.db.query(Item)

    # Aplicar filtros según rol
    if user.role == "sales_rep":
        # Sales reps solo ven sus propios items
        query = query.filter(Item.created_by == user.id)
    elif user.role == "supervisor":
        # Supervisores ven items de su equipo
        team_users = get_team_members(user.id)
        query = query.filter(Item.created_by.in_(team_users))
    # Admin ve todo

    return query.all()
```

---

## Guía: Agregar una Migración de Base de Datos

### Paso 1: Crear Migración

```bash
cd backend
alembic revision -m "add_column_to_users"
```

### Paso 2: Editar Archivo de Migración

**Archivo:** `/backend/alembic/versions/XXX_add_column_to_users.py`

```python
def upgrade():
    # Agregar columna
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))

    # Crear índice
    op.create_index('idx_users_phone', 'users', ['phone'])

    # Agregar constraint
    op.create_check_constraint(
        'phone_format',
        'users',
        "phone ~ '^[0-9]{10,15}$'"
    )

def downgrade():
    # Revertir en orden inverso
    op.drop_constraint('phone_format', 'users')
    op.drop_index('idx_users_phone')
    op.drop_column('users', 'phone')
```

### Paso 3: Ejecutar Migración

```bash
# Ver migración pendiente
alembic current
alembic history

# Ejecutar
alembic upgrade head

# Verificar
alembic current
```

### Paso 4: Rollback (si es necesario)

```bash
# Revertir última migración
alembic downgrade -1

# Revertir a migración específica
alembic downgrade abc123
```

---

## Guía: Testing Backend

### Setup de Tests

**Archivo:** `/backend/tests/conftest.py`

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from core.database import get_db, Base
from models.user import User

# Base de datos de test
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    """Crear base de datos de test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    """Cliente de test con DB override"""
    def override_get_db():
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(client):
    """Headers de autenticación"""
    # Crear usuario de test
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "test123",
        "first_name": "Test",
        "last_name": "User"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### Test de Endpoint

```python
def test_create_item(client, auth_headers):
    """Test crear item"""
    data = {
        "name": "Test Item",
        "value": 100
    }
    response = client.post("/api/v1/items", json=data, headers=auth_headers)

    assert response.status_code == 201
    assert response.json()["name"] == "Test Item"
    assert "id" in response.json()

def test_list_items_with_filters(client, auth_headers):
    """Test listar con filtros"""
    # Crear algunos items
    for i in range(5):
        client.post("/api/v1/items", json={"name": f"Item {i}", "value": i * 10}, headers=auth_headers)

    # Listar con filtro
    response = client.get("/api/v1/items?search=Item 2", headers=auth_headers)

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["name"] == "Item 2"

def test_update_item_unauthorized(client):
    """Test actualizar sin autenticación"""
    response = client.put("/api/v1/items/some-id", json={"name": "Updated"})
    assert response.status_code == 401
```

### Ejecutar Tests

```bash
# Todos los tests
pytest

# Con coverage
pytest --cov=modules --cov-report=html

# Tests específicos
pytest tests/test_items.py -v

# Solo un test
pytest tests/test_items.py::test_create_item -v
```

---

## Guía: Testing Frontend

### Setup de Tests

**Archivo:** `/frontend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
```

**Archivo:** `/frontend/jest.setup.js`

```javascript
import '@testing-library/jest-dom'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Test de Componente

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal'

describe('CreateTaskModal', () => {
  it('renders form fields', () => {
    render(<CreateTaskModal open={true} onClose={() => {}} onSuccess={() => {}} />)

    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/asignado a/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<CreateTaskModal open={true} onClose={() => {}} onSuccess={() => {}} />)

    const submitButton = screen.getByRole('button', { name: /crear/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/título es requerido/i)).toBeInTheDocument()
    })
  })

  it('submits form successfully', async () => {
    const onSuccess = jest.fn()
    render(<CreateTaskModal open={true} onClose={() => {}} onSuccess={onSuccess} />)

    // Llenar formulario
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'New Task' } })
    // ... más campos

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /crear/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
```

---

## Guía: Desplegar a Producción

### Checklist Pre-Deploy

**Backend:**
- [ ] Todas las migraciones aplicadas
- [ ] Variables de entorno configuradas (`.env.production`)
- [ ] Tests pasando (`pytest --cov`)
- [ ] Linting pasando (`ruff check`)
- [ ] Type checking pasando (`mypy`)
- [ ] Logs configurados
- [ ] Backup de base de datos

**Frontend:**
- [ ] Build exitoso (`npm run build`)
- [ ] Variables de entorno configuradas
- [ ] Tests pasando (`npm test`)
- [ ] Linting pasando (`npm run lint`)
- [ ] Imágenes optimizadas

### Deploy con Docker

#### 1. Build de Imágenes

```bash
# Backend
cd backend
docker build -t onquota-backend:latest .

# Frontend
cd frontend
docker build -t onquota-frontend:latest .
```

#### 2. Docker Compose Production

**Archivo:** `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: onquota
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  backend:
    image: onquota-backend:latest
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/onquota
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
      - redis
    restart: always

  frontend:
    image: onquota-frontend:latest
    environment:
      NEXT_PUBLIC_API_URL: https://api.onquota.com
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
```

#### 3. Deploy

```bash
# Pull latest code
git pull origin main

# Build y deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Ejecutar migraciones
docker-compose exec backend alembic upgrade head

# Ver logs
docker-compose logs -f
```

### Monitoreo Post-Deploy

```bash
# Health check
curl https://api.onquota.com/health

# Ver logs
docker-compose logs -f backend

# Ver métricas
docker stats

# Backup de BD
docker-compose exec db pg_dump -U postgres onquota > backup_$(date +%Y%m%d).sql
```

---

## Conclusión

Estas guías cubren los patrones más comunes en OnQuota. Para casos específicos, referirse a los módulos ya implementados (Expenses, Clients) como ejemplos de referencia.

**Recursos Adicionales:**
- Documentación FastAPI: https://fastapi.tiangolo.com
- Documentación Next.js: https://nextjs.org/docs
- Documentación SQLAlchemy: https://docs.sqlalchemy.org

**Versión:** 1.0
**Mantenedor:** OnQuota Tech Team
