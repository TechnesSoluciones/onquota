'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { UserRole } from '@/types/auth'
import type { AdminUserResponse, UserFormData } from '@/types/admin'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  Power,
  PowerOff,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// User roles labels
const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SALES_REP]: 'Vendedor',
  [UserRole.SUPERVISOR]: 'Supervisor',
  [UserRole.ANALYST]: 'Analista',
}

// User roles colors
const USER_ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
  [UserRole.ADMIN]: 'bg-blue-100 text-blue-800 border-blue-200',
  [UserRole.SALES_REP]: 'bg-green-100 text-green-800 border-green-200',
  [UserRole.SUPERVISOR]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [UserRole.ANALYST]: 'bg-gray-100 text-gray-800 border-gray-200',
}

// Validation schema for user form
const userFormSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
  full_name: z.string().min(2, 'Nombre muy corto'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  is_active: z.boolean(),
})

type UserFormValues = z.infer<typeof userFormSchema>

export function UsersList() {
  const { toast } = useToast()
  const {
    users,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
    createUser,
    updateUser,
    deleteUser,
  } = useAdminUsers()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUserResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Search input state
  const [searchInput, setSearchInput] = useState(filters.search || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchInput || null })
  }

  const handleOpenCreateModal = () => {
    setSelectedUser(null)
    setCreateModalOpen(true)
  }

  const handleOpenEditModal = (user: AdminUserResponse) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const handleOpenDeleteDialog = (user: AdminUserResponse) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleToggleActive = async (user: AdminUserResponse) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      toast({
        title: 'Éxito',
        description: `Usuario ${user.is_active ? 'desactivado' : 'activado'} correctamente`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.detail || 'No se pudo actualizar el usuario',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      await deleteUser(selectedUser.id)
      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
      })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.detail || 'No se pudo eliminar el usuario',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Usuario
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select
            value={filters.role || 'all'}
            onValueChange={(value) =>
              updateFilters({ role: value === 'all' ? null : (value as UserRole) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              filters.is_active === null || filters.is_active === undefined
                ? 'all'
                : filters.is_active
                ? 'active'
                : 'inactive'
            }
            onValueChange={(value) =>
              updateFilters({
                is_active: value === 'all' ? null : value === 'active',
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </form>

        {Object.keys(filters).some((key) => filters[key as keyof typeof filters]) && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pagination.total} usuarios encontrados
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error al cargar usuarios</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron usuarios</p>
            {Object.keys(filters).length > 0 && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Último Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-slate-900">
                              {user.full_name}
                            </div>
                            {user.phone && (
                              <div className="text-xs text-muted-foreground">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={USER_ROLE_COLORS[user.role]}
                        >
                          {USER_ROLE_LABELS[user.role]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            user.is_active
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          title={user.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {user.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando{' '}
                  {users.length === 0
                    ? 0
                    : (pagination.page - 1) * pagination.page_size + 1}{' '}
                  a {Math.min(pagination.page * pagination.page_size, pagination.total)}{' '}
                  de {pagination.total} usuarios
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm whitespace-nowrap">
                    Página {pagination.page} de {pagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.total_pages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit User Modal */}
      <UserFormModal
        open={createModalOpen || editModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          if (!open) setSelectedUser(null)
        }}
        user={selectedUser}
        onSuccess={() => {
          refresh()
          setCreateModalOpen(false)
          setEditModalOpen(false)
          setSelectedUser(null)
        }}
        createUser={createUser}
        updateUser={updateUser}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <strong>{selectedUser?.full_name}</strong>? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// User Form Modal Component
interface UserFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserResponse | null
  onSuccess: () => void
  createUser: (data: any) => Promise<AdminUserResponse>
  updateUser: (id: string, data: any) => Promise<AdminUserResponse>
}

function UserFormModal({
  open,
  onOpenChange,
  user,
  onSuccess,
  createUser,
  updateUser,
}: UserFormModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!user

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: user
      ? {
          email: user.email,
          full_name: user.full_name,
          phone: user.phone || '',
          role: user.role,
          is_active: user.is_active,
        }
      : {
          email: '',
          password: '',
          full_name: '',
          phone: '',
          role: UserRole.SALES_REP,
          is_active: true,
        },
  })

  const onSubmit = async (data: UserFormValues) => {
    try {
      setIsSubmitting(true)

      if (isEdit && user) {
        await updateUser(user.id, {
          full_name: data.full_name,
          phone: data.phone || null,
          role: data.role,
          is_active: data.is_active,
        })
        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente',
        })
      } else {
        await createUser({
          email: data.email,
          password: data.password!,
          full_name: data.full_name,
          phone: data.phone || null,
          role: data.role,
          is_active: data.is_active,
        })
        toast({
          title: 'Éxito',
          description: 'Usuario creado correctamente',
        })
      }

      reset()
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.detail || `No se pudo ${isEdit ? 'actualizar' : 'crear'} el usuario`,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información del usuario'
              : 'Completa la información del nuevo usuario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled={isEdit}
              placeholder="usuario@empresa.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="Mínimo 8 caracteres"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="Juan Pérez"
            />
            {errors.full_name && (
              <p className="text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+57 300 123 4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="is_active"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
              )}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Usuario activo
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
