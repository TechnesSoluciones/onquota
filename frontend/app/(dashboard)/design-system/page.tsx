'use client'

import { useState } from 'react'
import { PageLayout } from '@/components/layouts'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Select,
  Checkbox,
  RadioGroup,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui-v2'
import { Icon } from '@/components/icons'
import { EmptyState, LoadingSpinner, Skeleton, CardSkeleton } from '@/components/patterns'
import { ThemeToggle } from '@/components/providers/theme-provider'

export default function DesignSystemPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <PageLayout
      title="Design System V2"
      description="Componentes UI del nuevo design system de Onquota"
      actions={<ThemeToggle />}
    >
      <div className="space-y-8">
        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Variantes y tamaños de botones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="link">Link</Button>
              <Button variant="success">Success</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <Icon name="add" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button leftIcon={<Icon name="add" />}>With Left Icon</Button>
              <Button rightIcon={<Icon name="arrow_forward" />}>With Right Icon</Button>
              <Button isLoading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Indicadores de estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success" dot>
                With Dot
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Form Inputs</CardTitle>
            <CardDescription>Campos de formulario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Input básico" />
            <Input
              leftIcon={<Icon name="search" size="sm" />}
              placeholder="Input con icono izquierdo"
            />
            <Input
              rightIcon={<Icon name="visibility" size="sm" />}
              placeholder="Input con icono derecho"
              type="password"
            />
            <Input error="Este campo es requerido" placeholder="Input con error" />
            <Input helperText="Texto de ayuda" placeholder="Input con helper text" />

            <Select
              options={[
                { value: '1', label: 'Opción 1' },
                { value: '2', label: 'Opción 2' },
                { value: '3', label: 'Opción 3' },
              ]}
              placeholder="Selecciona una opción"
            />

            <Checkbox label="Acepto términos y condiciones" />
            <Checkbox label="Campo requerido" error="Debe aceptar para continuar" />

            <RadioGroup
              name="plan"
              options={[
                { value: 'free', label: 'Plan Gratuito', description: 'Para comenzar' },
                { value: 'pro', label: 'Plan Pro', description: 'Para profesionales' },
                { value: 'enterprise', label: 'Enterprise', description: 'Para empresas' },
              ]}
            />

            <Textarea placeholder="Escribe tu mensaje..." />
            <Textarea showCount maxLength={500} placeholder="Textarea con contador" />
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tables</CardTitle>
            <CardDescription>Tablas de datos</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Juan Pérez</TableCell>
                  <TableCell>juan@example.com</TableCell>
                  <TableCell>
                    <Badge variant="success">Activo</Badge>
                  </TableCell>
                  <TableCell className="text-right">$1,250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">María García</TableCell>
                  <TableCell>maria@example.com</TableCell>
                  <TableCell>
                    <Badge variant="warning">Pendiente</Badge>
                  </TableCell>
                  <TableCell className="text-right">$850.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Carlos López</TableCell>
                  <TableCell>carlos@example.com</TableCell>
                  <TableCell>
                    <Badge variant="error">Inactivo</Badge>
                  </TableCell>
                  <TableCell className="text-right">$0.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>Navegación por pestañas</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">Contenido del Tab 1</TabsContent>
              <TabsContent value="tab2">Contenido del Tab 2</TabsContent>
              <TabsContent value="tab3">Contenido del Tab 3</TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialog & Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle>Overlays</CardTitle>
            <CardDescription>Modales y menús desplegables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Abrir Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Título del Dialog</DialogTitle>
                    <DialogDescription>
                      Esta es una descripción del contenido del dialog.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Contenido del modal aquí...
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="secondary">Cancelar</Button>
                    <Button>Guardar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Abrir Menu
                    <Icon name="expand_more" size="sm" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Icon name="person" size="sm" className="mr-2" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Icon name="settings" size="sm" className="mr-2" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-error">
                    <Icon name="logout" size="sm" className="mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>Estados de carga</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="grid gap-4 md:grid-cols-2">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardHeader>
            <CardTitle>Empty State</CardTitle>
            <CardDescription>Estado vacío</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon="folder"
              title="No hay datos"
              description="No se encontraron elementos para mostrar"
              action={{
                label: 'Crear Nuevo',
                onClick: () => alert('Crear nuevo elemento'),
              }}
            />
          </CardContent>
        </Card>

        {/* Icons */}
        <Card>
          <CardHeader>
            <CardTitle>Icons (Material Symbols)</CardTitle>
            <CardDescription>Iconos del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Icon name="dashboard" size="lg" />
              <Icon name="person" size="lg" />
              <Icon name="settings" size="lg" />
              <Icon name="notifications" size="lg" />
              <Icon name="search" size="lg" />
              <Icon name="add" size="lg" />
              <Icon name="edit" size="lg" />
              <Icon name="delete" size="lg" />
              <Icon name="check" size="lg" filled />
              <Icon name="error" size="lg" filled className="text-error" />
              <Icon name="warning" size="lg" filled className="text-warning" />
              <Icon name="info" size="lg" filled className="text-info" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
