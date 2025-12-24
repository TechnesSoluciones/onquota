/**
 * Authentication validation schemas using Zod
 * Used for form validation with react-hook-form
 */

import { z } from 'zod'

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Registration form validation schema
 */
export const registerSchema = z
  .object({
    company_name: z
      .string()
      .min(1, 'El nombre de la empresa es requerido')
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    domain: z.string().optional().refine(
      (val) => {
        if (!val) {
          return true
        }
        return /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(val)
      },
      { message: 'Dominio inválido (ej: empresa.com)' }
    ),
    email: z
      .string()
      .min(1, 'El email es requerido')
      .email('Email inválido')
      .toLowerCase(),
    password: z
      .string()
      .min(1, 'La contraseña es requerida')
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Debe contener al menos una mayúscula, una minúscula y un número'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    full_name: z
      .string()
      .min(1, 'El nombre completo es requerido')
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    phone: z.string().optional().refine(
      (val) => {
        if (!val) {
          return true
        }
        return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/im.test(val)
      },
      { message: 'Teléfono inválido' }
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .toLowerCase(),
})

export type PasswordResetRequestFormData = z.infer<
  typeof passwordResetRequestSchema
>

/**
 * Password reset schema (with token)
 */
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, 'Token inválido'),
    new_password: z
      .string()
      .min(1, 'La nueva contraseña es requerida')
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Debe contener al menos una mayúscula, una minúscula y un número'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>

/**
 * Password change schema (authenticated user)
 */
export const passwordChangeSchema = z
  .object({
    current_password: z
      .string()
      .min(1, 'La contraseña actual es requerida')
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    new_password: z
      .string()
      .min(1, 'La nueva contraseña es requerida')
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Debe contener al menos una mayúscula, una minúscula y un número'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['new_password'],
  })

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>
