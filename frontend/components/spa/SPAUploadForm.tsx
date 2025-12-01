'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useSPAUpload } from '@/hooks/useSPAs'
import type { SPAUploadResult } from '@/types/spa'

interface SPAUploadFormProps {
  onUploadComplete?: (result: SPAUploadResult) => void
  onCancel?: () => void
}

export function SPAUploadForm({ onUploadComplete, onCancel }: SPAUploadFormProps) {
  const { uploading, result, error, upload, reset } = useSPAUpload()
  const [file, setFile] = useState<File | null>(null)
  const [autoCreateClients, setAutoCreateClients] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  /**
   * Handle file selection
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/tab-separated-values',
      ]
      if (!validTypes.includes(selectedFile.type) &&
          !selectedFile.name.endsWith('.xls') &&
          !selectedFile.name.endsWith('.xlsx') &&
          !selectedFile.name.endsWith('.tsv')) {
        alert('Por favor seleccione un archivo Excel (.xls, .xlsx) o TSV (.tsv)')
        return
      }
      setFile(selectedFile)
      reset()
    }
  }, [reset])

  /**
   * Handle drag and drop
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      reset()
    }
  }, [reset])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    const uploadResult = await upload(file, autoCreateClients)
    if (uploadResult && onUploadComplete) {
      onUploadComplete(uploadResult)
    }
  }, [file, autoCreateClients, upload, onUploadComplete])

  /**
   * Handle reset
   */
  const handleReset = useCallback(() => {
    setFile(null)
    reset()
  }, [reset])

  /**
   * Render upload result
   */
  if (result) {
    const hasErrors = result.error_count > 0

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasErrors ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Resultado de la carga
          </CardTitle>
          <CardDescription>
            {hasErrors
              ? 'La carga se completó con algunos errores'
              : 'La carga se completó exitosamente'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de filas</p>
              <p className="text-2xl font-bold">{result.total_rows}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Importados</p>
              <p className="text-2xl font-bold text-green-600">{result.success_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Errores</p>
              <p className="text-2xl font-bold text-red-600">{result.error_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Clientes creados</p>
              <p className="text-2xl font-bold text-blue-600">{result.clients_created}</p>
            </div>
          </div>

          {/* Errors */}
          {hasErrors && result.errors && result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Errores encontrados:</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {result.errors.slice(0, 10).map((err, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {err.row && <span className="font-semibold">Fila {err.row}: </span>}
                      {err.field && <span className="text-muted-foreground">[{err.field}] </span>}
                      {err.message}
                    </AlertDescription>
                  </Alert>
                ))}
                {result.errors.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    y {result.errors.length - 10} errores más...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline">
              Cargar otro archivo
            </Button>
            {onCancel && (
              <Button onClick={onCancel}>
                Cerrar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  /**
   * Render upload form
   */
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargar archivo SPA</CardTitle>
        <CardDescription>
          Sube un archivo Excel (.xls, .xlsx) o TSV con los datos de Special Price Agreements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File drop zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
              ${file ? 'bg-green-50 border-green-300' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept=".xls,.xlsx,.tsv"
              disabled={uploading}
            />

            <div className="space-y-4">
              {file ? (
                <>
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600" />
                  <div className="space-y-1">
                    <p className="font-semibold text-green-700">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFile(null)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      Arrastra un archivo aquí o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formatos soportados: .xls, .xlsx, .tsv
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-create-clients"
                checked={autoCreateClients}
                onCheckedChange={(checked) => setAutoCreateClients(checked as boolean)}
                disabled={uploading}
              />
              <Label
                htmlFor="auto-create-clients"
                className="text-sm font-normal cursor-pointer"
              >
                Crear clientes automáticamente si el BPID no existe
              </Label>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Procesando archivo...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? 'Cargando...' : 'Cargar archivo'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={uploading}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
