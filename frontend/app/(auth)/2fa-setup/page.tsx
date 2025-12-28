'use client'

/**
 * 2FA Setup Page V2
 * Two-factor authentication setup with QR code
 * Design System V2
 */

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Badge,
} from '@/components/ui-v2'
import { Icon } from '@/components/icons'

// Validation schema
const verificationSchema = z.object({
  code: z.string().min(6, 'El código debe tener 6 dígitos').max(6),
})

type VerificationFormData = z.infer<typeof verificationSchema>

export default function TwoFactorSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string>('ABCD EFGH IJKL MNOP')
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: '',
    },
  })

  // Generate QR code on mount
  useState(() => {
    // TODO: Call API to generate QR code
    // For now, using placeholder
    setQrCodeUrl(
      'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/OnQuota:user@example.com?secret=ABCDEFGHIJKLMNOP&issuer=OnQuota'
    )
  })

  const onSubmit = async (data: VerificationFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // TODO: Implement 2FA verification API call
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.code }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Código inválido')
      }

      // Redirect to dashboard on success
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar código')
    } finally {
      setIsLoading(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret.replace(/\s/g, ''))
    // TODO: Show toast notification
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Autenticación de Dos Factores</CardTitle>
            <CardDescription>
              Protege tu cuenta con un código de verificación adicional
            </CardDescription>
          </div>
          <Badge variant="info">
            <Icon name="shield" size="sm" className="mr-1" />
            Seguridad
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
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

          {/* Step 1: Download App */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Descarga una aplicación de autenticación
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 ml-10">
              Recomendamos <strong>Google Authenticator</strong>,{' '}
              <strong>Microsoft Authenticator</strong>, o <strong>Authy</strong>
            </p>
          </div>

          {/* Step 2: Scan QR Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Escanea el código QR
              </h3>
            </div>
            <div className="ml-10 space-y-3">
              {qrCodeUrl && (
                <div className="flex justify-center p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code para 2FA"
                    className="w-48 h-48"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  ¿No puedes escanear? Ingresa este código manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-neutral-100 dark:bg-neutral-900 px-3 py-2 text-sm font-mono text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800">
                    {secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                    title="Copiar código"
                  >
                    <Icon name="content_copy" size="sm" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Enter Verification Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Ingresa el código de verificación
              </h3>
            </div>
            <div className="ml-10">
              <Input
                type="text"
                placeholder="000000"
                autoComplete="one-time-code"
                disabled={isLoading}
                maxLength={6}
                leftIcon={<Icon name="pin" size="sm" />}
                error={errors.code?.message}
                helperText="Ingresa el código de 6 dígitos de tu aplicación"
                {...register('code')}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/dashboard')}
            >
              Omitir
            </Button>
            <Button type="submit" className="flex-1" isLoading={isLoading}>
              Verificar y Activar
            </Button>
          </div>

          <p className="text-xs text-center text-neutral-600 dark:text-neutral-400">
            <Icon name="info" size="xs" className="inline mr-1 text-info" />
            Puedes desactivar 2FA en cualquier momento desde Configuración
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
