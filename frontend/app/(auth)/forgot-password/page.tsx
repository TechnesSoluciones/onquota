'use client'

/**
 * Forgot Password Page V2
 * Password reset flow
 * Design System V2
 */

import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // TODO: Implement forgot password API call
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar email')
      }

      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar email')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (emailSent) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <Icon name="check_circle" size="lg" className="text-success" />
          </div>
          <CardTitle className="text-center">Email Enviado</CardTitle>
          <CardDescription className="text-center">
            Hemos enviado las instrucciones para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900 p-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Se ha enviado un email a <strong>{getValues('email')}</strong> con
              un enlace para restablecer tu contraseña.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <Icon
                name="info"
                size="sm"
                className="inline mr-1 text-info"
              />
              Revisa tu bandeja de entrada y carpeta de spam.
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <Icon
                name="schedule"
                size="sm"
                className="inline mr-1 text-warning"
              />
              El enlace expirará en 1 hora.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setEmailSent(false)}
          >
            Enviar nuevamente
          </Button>
          <Link
            href="/login"
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary text-center"
          >
            <Icon name="arrow_back" size="sm" className="inline mr-1" />
            Volver al inicio de sesión
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Form state
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos instrucciones para restablecer tu
          contraseña
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-error/10 border border-error/20">
              <Icon
                name="error"
                size="sm"
                className="text-error mt-0.5 flex-shrink-0"
              />
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
            helperText="Ingresa el email asociado a tu cuenta"
            {...register('email')}
          />
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Enviar Instrucciones
          </Button>

          <Link
            href="/login"
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary text-center inline-flex items-center justify-center gap-1"
          >
            <Icon name="arrow_back" size="sm" />
            Volver al inicio de sesión
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
