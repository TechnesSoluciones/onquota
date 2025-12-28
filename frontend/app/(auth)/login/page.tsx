'use client'

/**
 * Login Page V2
 * User authentication with email and password
 * Updated with Design System V2
 */

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui-v2'
import { Icon } from '@/components/icons'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, isAuthenticated } = useAuth()

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[LoginPage] User already authenticated, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    // Call login from useAuth hook
    // Handles redirect and error state automatically
    await login(data)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingresa tu email y contraseña para acceder a tu cuenta
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* General error message */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-error/10 border border-error/20">
              <Icon name="error" size="sm" className="text-error mt-0.5 flex-shrink-0" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Email field */}
          <Input
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            disabled={isLoading}
            leftIcon={<Icon name="mail" size="sm" />}
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Password field */}
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              disabled={isLoading}
              leftIcon={<Icon name="lock" size="sm" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary-700 hover:underline inline-block"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Iniciar Sesión
          </Button>

          <div className="text-sm text-center text-neutral-600 dark:text-neutral-400">
            ¿No tienes una cuenta?{' '}
            <Link
              href="/register"
              className="text-primary hover:text-primary-700 font-semibold hover:underline"
            >
              Regístrate aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
