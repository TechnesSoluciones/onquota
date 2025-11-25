/**
 * ReceiptUpload Component
 * Drag & drop file upload for receipt images
 */

'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileImage, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useOCR } from '@/hooks/useOCR'

interface ReceiptUploadProps {
  onUploadSuccess?: (jobId: string) => void
}

export function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const { uploadReceipt, isLoading } = useOCR()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)

      // Generate preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return

    try {
      const jobId = await uploadReceipt(file)

      // Reset state
      setFile(null)
      setPreview(null)

      // Notify parent
      onUploadSuccess?.(jobId)
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
  }

  return (
    <Card className="p-6">
      {!preview ? (
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
              {isDragActive ? 'Drop the receipt here' : 'Upload a receipt'}
            </p>
            <p className="text-sm text-gray-500">
              Drag & drop or click to select (JPG, PNG, PDF - max 10MB)
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
          <div className="relative">
            {file?.type === 'application/pdf' ? (
              <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <FileImage className="mx-auto h-16 w-16 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">PDF Preview</p>
                  <p className="text-xs text-gray-500 mt-1">{file.name}</p>
                </div>
              </div>
            ) : (
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full max-h-96 object-contain rounded-lg"
              />
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleClear}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileImage className="h-4 w-4" />
              <span className="truncate max-w-xs">{file?.name}</span>
              <span className="text-gray-400">
                ({((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>

            <Button onClick={handleUpload} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Receipt'
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
