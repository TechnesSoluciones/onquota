/**
 * FileUploadZone Component
 * Drag & drop file upload for sales data (Excel/CSV)
 */

'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAnalytics } from '@/hooks/useAnalytics'

interface FileUploadZoneProps {
  onUploadSuccess?: (jobId: string) => void
}

export function FileUploadZone({ onUploadSuccess }: FileUploadZoneProps) {
  const [file, setFile] = useState<File | null>(null)
  const { uploadFile, isLoading } = useAnalytics()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return

    try {
      const jobId = await uploadFile(file)

      // Reset state
      setFile(null)

      // Notify parent
      onUploadSuccess?.(jobId)
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleClear = () => {
    setFile(null)
  }

  return (
    <Card className="p-6">
      {!file ? (
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop the file here' : 'Upload sales data'}
            </p>
            <p className="text-sm text-gray-500">
              Drag & drop or click to select (Excel, CSV - max 50MB)
            </p>
          </div>

          {fileRejections.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {fileRejections[0].errors[0].message}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
            <FileSpreadsheet className="h-12 w-12 text-green-600" />
            <div className="flex-1">
              <p className="font-medium truncate max-w-md">{file.name}</p>
              <p className="text-sm text-gray-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Analyze File'
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
