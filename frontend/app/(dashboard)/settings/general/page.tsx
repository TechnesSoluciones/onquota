/**
 * General Settings Page
 * Configure tenant settings and preferences with system information sidebar
 */

'use client'

import { SettingsForm } from '@/components/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminSettings, useSystemStats } from '@/hooks/useAdminSettings'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Building2, Calendar, CreditCard, Users } from 'lucide-react'

export default function GeneralSettingsPage() {
  const { settings, isLoading } = useAdminSettings()
  const { stats } = useSystemStats()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">General Settings</h2>
        <p className="text-muted-foreground">
          Configure tenant settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settings Form - Main Column */}
        <div className="lg:col-span-2">
          <SettingsForm />
        </div>

        {/* System Information - Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Read-only tenant details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              ) : settings ? (
                <>
                  {/* Tenant ID */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Tenant ID
                    </div>
                    <p className="font-mono text-sm">{settings.id}</p>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Company Name
                    </div>
                    <p className="text-sm font-medium">{settings.company_name}</p>
                  </div>

                  {/* Subscription Plan */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      Subscription Plan
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {settings.subscription_plan}
                    </Badge>
                  </div>

                  {/* Created At */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created At
                    </div>
                    <p className="text-sm">
                      {format(new Date(settings.created_at), 'PPP', {
                        locale: es,
                      })}
                    </p>
                  </div>

                  {/* Total Users */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Total Users
                    </div>
                    <p className="text-sm font-medium">
                      {stats?.user_stats.total_users || 0} user{stats?.user_stats.total_users !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Domain (if exists) */}
                  {settings.domain && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        Domain
                      </div>
                      <p className="text-sm">{settings.domain}</p>
                    </div>
                  )}

                  {/* Status */}
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Status
                    </div>
                    <Badge variant={settings.is_active ? 'default' : 'destructive'}>
                      {settings.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No se pudo cargar la información del sistema
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Info Card (Optional) */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                For questions about your subscription or billing, please contact support.
              </p>
              <p className="font-medium text-foreground">
                support@onquota.com
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
