'use client'

import { useRouter } from 'next/navigation'
import { SPAUploadForm } from '@/components/spa/SPAUploadForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { SPAUploadResult } from '@/types/spa'

export default function SPAUploadPage() {
  const router = useRouter()

  const handleUploadComplete = (result: SPAUploadResult) => {
    // Optionally redirect to the main SPA list after a successful upload
    if (result.error_count === 0) {
      setTimeout(() => {
        router.push('/spa')
      }, 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/spa">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cargar archivo SPA</h1>
          <p className="text-muted-foreground">
            Importa Special Price Agreements desde un archivo Excel o TSV
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="max-w-3xl">
        <SPAUploadForm
          onUploadComplete={handleUploadComplete}
          onCancel={() => router.push('/spa')}
        />
      </div>

      {/* Instructions */}
      <div className="max-w-3xl bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Formato del archivo</h3>
        <p className="text-sm text-blue-800 mb-4">
          El archivo debe contener las siguientes columnas:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li><strong>BPID</strong>: Business Partner ID del cliente</li>
          <li><strong>Ship To Name</strong>: Nombre del cliente</li>
          <li><strong>Article Number</strong>: Número del artículo/producto</li>
          <li><strong>Article Description</strong>: Descripción (opcional)</li>
          <li><strong>List Price</strong>: Precio de lista</li>
          <li><strong>App Net Price</strong>: Precio neto aplicado</li>
          <li><strong>UOM</strong>: Unidad de medida (opcional, default: EA)</li>
          <li><strong>Start Date</strong>: Fecha de inicio de vigencia</li>
          <li><strong>End Date</strong>: Fecha de fin de vigencia</li>
        </ul>
      </div>
    </div>
  )
}
