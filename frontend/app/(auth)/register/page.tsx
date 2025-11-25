'use client'

/**
 * Register Page
 * New user and tenant registration
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
        <CardDescription>
          Completa el formulario para crear tu cuenta y comenzar
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* General error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Company Information */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Información de la Empresa
            </h3>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Nombre de la Empresa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company_name"
                type="text"
                placeholder="Mi Empresa S.A."
                autoComplete="organization"
                disabled={isLoading}
                {...register('company_name')}
                className={errors.company_name ? 'border-red-500' : ''}
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">
                  {errors.company_name.message}
                </p>
              )}
            </div>

            {/* Domain (optional) */}
            <div className="space-y-2">
              <Label htmlFor="domain">
                Dominio <span className="text-gray-400">(Opcional)</span>
              </Label>
              <Input
                id="domain"
                type="text"
                placeholder="empresa.com"
                autoComplete="off"
                disabled={isLoading}
                {...register('domain')}
                className={errors.domain ? 'border-red-500' : ''}
              />
              {errors.domain && (
                <p className="text-sm text-red-500">{errors.domain.message}</p>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Información Personal
            </h3>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Nombre Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Juan Pérez"
                autoComplete="name"
                disabled={isLoading}
                {...register('full_name')}
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={isLoading}
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Teléfono <span className="text-gray-400">(Opcional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+56 9 1234 5678"
                autoComplete="tel"
                disabled={isLoading}
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Security */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-gray-700">Seguridad</h3>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y
                números
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isLoading}
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Terms */}
          <div className="pt-2">
            <p className="text-xs text-gray-600">
              Al registrarte, aceptas nuestros{' '}
              <Link
                href="/terms"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creando cuenta...</span>
              </div>
            ) : (
              'Crear Cuenta'
            )}
          </Button>

          <div className="text-sm text-center text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
