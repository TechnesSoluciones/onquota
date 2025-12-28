'use client'

/**
 * Register Page V2
 * New user and tenant registration
 * Updated with Design System V2
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import {
  Button,
  Input,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui-v2'
import { Icon } from '@/components/icons'

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser, isLoading } = useAuth()
  const [error, setError] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      company_name: '',
      domain: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: '',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setError('')

    // Remove confirmPassword before sending to API
    const { confirmPassword: _confirmPassword, ...registerData } = data

    const result = await registerUser(registerData)

    if (result.success) {
      // Redirect to dashboard on successful registration
      router.push('/dashboard')
    } else {
      setError(result.error || 'Error al registrarse')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crear Cuenta</CardTitle>
        <CardDescription>
          Completa el formulario para crear tu cuenta y comenzar
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* General error message */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-error/10 border border-error/20">
              <Icon name="error" size="sm" className="text-error mt-0.5 flex-shrink-0" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Información de la Empresa
            </h3>

            {/* Company Name */}
            <Input
              type="text"
              placeholder="Mi Empresa S.A."
              autoComplete="organization"
              disabled={isLoading}
              leftIcon={<Icon name="business" size="sm" />}
              error={errors.company_name?.message}
              helperText="Nombre legal de tu empresa"
              {...register('company_name')}
            />

            {/* Domain (optional) */}
            <Input
              type="text"
              placeholder="empresa.com (Opcional)"
              autoComplete="off"
              disabled={isLoading}
              leftIcon={<Icon name="language" size="sm" />}
              error={errors.domain?.message}
              {...register('domain')}
            />
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Información Personal
            </h3>

            {/* Full Name */}
            <Input
              type="text"
              placeholder="Juan Pérez"
              autoComplete="name"
              disabled={isLoading}
              leftIcon={<Icon name="person" size="sm" />}
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            {/* Email */}
            <Input
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={isLoading}
              leftIcon={<Icon name="mail" size="sm" />}
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Phone (optional) */}
            <Input
              type="tel"
              placeholder="+56 9 1234 5678 (Opcional)"
              autoComplete="tel"
              disabled={isLoading}
              leftIcon={<Icon name="phone" size="sm" />}
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          {/* Security */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Seguridad</h3>

            {/* Password */}
            <Input
              type="password"
              placeholder="Contraseña"
              autoComplete="new-password"
              disabled={isLoading}
              leftIcon={<Icon name="lock" size="sm" />}
              error={errors.password?.message}
              helperText="Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números"
              {...register('password')}
            />

            {/* Confirm Password */}
            <Input
              type="password"
              placeholder="Confirmar Contraseña"
              autoComplete="new-password"
              disabled={isLoading}
              leftIcon={<Icon name="lock" size="sm" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          {/* Terms */}
          <div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Al registrarte, aceptas nuestros{' '}
              <Link
                href="/terms"
                className="text-primary hover:text-primary-700 underline"
              >
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link
                href="/privacy"
                className="text-primary hover:text-primary-700 underline"
              >
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Crear Cuenta
          </Button>

          <div className="text-sm text-center text-neutral-600 dark:text-neutral-400">
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/login"
              className="text-primary hover:text-primary-700 font-semibold hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
