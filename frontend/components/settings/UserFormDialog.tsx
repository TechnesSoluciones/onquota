'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'

// User roles labels
const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SALES_REP]: 'Vendedor',
  [UserRole.SUPERVISOR]: 'Supervisor',
  [UserRole.ANALYST]: 'Analista',
}

// User form validation schema
const userFormSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
  full_name: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  is_active: z.boolean().default(true),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  mode: 'create' | 'edit'
  user?: AdminUserResponse | null
  createUser?: (data: any) => Promise<AdminUserResponse>
  updateUser?: (id: string, data: any) => Promise<AdminUserResponse>
}

/**
 * UserFormDialog Component
 * Modal dialog for creating or editing users in admin panel
 *
 * Features:
 * - Create/Edit modes with dynamic validation
 * - Password strength indicator (create mode only)
 * - Real-time form validation
 * - Loading states
 * - Toast notifications
 */
export function UserFormDialog({
  open,
  onOpenChange,
  onSuccess,
  mode,
  user,
  createUser,
  updateUser,
}: UserFormDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isEdit = mode === 'edit'

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<UserFormValues>({
    resolver: zodResolver(
      isEdit
        ? userFormSchema.omit({ password: true })
        : userFormSchema.required({ password: true })
    ),
    defaultValues: isEdit && user
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

  const password = watch('password')

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (open) {
      if (isEdit && user) {
        reset({
          email: user.email,
          full_name: user.full_name,
          phone: user.phone || '',
          role: user.role,
          is_active: user.is_active,
        })
      } else {
        reset({
          email: '',
          password: '',
          full_name: '',
          phone: '',
          role: UserRole.SALES_REP,
          is_active: true,
        })
      }
    }
  }, [open, isEdit, user, reset])

  const onSubmit = async (data: UserFormValues) => {
    try {
      setIsSubmitting(true)

      if (isEdit && user && updateUser) {
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
      } else if (!isEdit && createUser) {
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

  // Password strength indicator
  const getPasswordStrength = (pwd: string = ''): number => {
    if (!pwd) return 0
    let strength = 0
    if (pwd.length >= 8) strength += 25
    if (pwd.length >= 12) strength += 25
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25
    if (/\d/.test(pwd)) strength += 15
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 10
    return Math.min(100, strength)
  }

  const passwordStrength = getPasswordStrength(password)

  const getPasswordStrengthLabel = (strength: number): string => {
    if (strength === 0) return ''
    if (strength < 40) return 'Débil'
    if (strength < 70) return 'Media'
    return 'Fuerte'
  }

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength === 0) return 'bg-gray-200'
    if (strength < 40) return 'bg-red-500'
    if (strength < 70) return 'bg-yellow-500'
    return 'bg-green-500'
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
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled={isEdit}
              placeholder="usuario@empresa.com"
              className={isEdit ? 'bg-slate-50 cursor-not-allowed' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password (only for create) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
              {/* Password strength indicator */}
              {password && password.length > 0 && (
                <div className="space-y-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getPasswordStrengthColor(
                        passwordStrength
                      )}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <p
                    className={`text-xs ${
                      passwordStrength < 40
                        ? 'text-red-600'
                        : passwordStrength < 70
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}
                  >
                    Seguridad: {getPasswordStrengthLabel(passwordStrength)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="Juan Pérez"
            />
            {errors.full_name && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {errors.full_name.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+57 300 123 4567"
            />
          </div>

          {/* Role */}
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
            {errors.role && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Is Active */}
          <div className="flex items-center space-x-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label
              htmlFor="is_active"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Usuario activo
            </Label>
          </div>

          <DialogFooter className="gap-2">
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
