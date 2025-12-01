/**
 * Componente para upload de archivos SPA
 */

'use client';

import { useState, useCallback } from 'react';
import { useSPAUpload } from '@/hooks/spa/useSPAUpload';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Progress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';
import { FileUploadIcon, CheckCircleIcon, XCircleIcon } from '@/components/icons';

export function SPAUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [autoCreateClients, setAutoCreateClients] = useState(false);
  const { uploadFile, uploading, progress, result, error, reset } = useSPAUpload();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      reset();
    }
  }, [reset]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      await uploadFile(selectedFile, autoCreateClients);
    } catch (err) {
      // Error ya manejado por el hook
    }
  }, [selectedFile, autoCreateClients, uploadFile]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setAutoCreateClients(false);
    reset();
  }, [reset]);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Upload SPA File</h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload an Excel or TSV file containing Special Pricing Agreements
          </p>
        </div>

        {/* File Input */}
        {!result && (
          <div>
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUploadIcon className="w-12 h-12 mb-4 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Excel (.xls, .xlsx) or TSV files (MAX. 10MB)
                </p>
                {selectedFile && (
                  <p className="mt-2 text-sm font-medium text-blue-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".xls,.xlsx,.tsv"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {/* Options */}
        {selectedFile && !result && (
          <div className="space-y-4">
            <div className="flex items-start">
              <Checkbox
                id="auto-create"
                checked={autoCreateClients}
                onChange={(e) => setAutoCreateClients(e.target.checked)}
                disabled={uploading}
              />
              <label
                htmlFor="auto-create"
                className="ml-3 text-sm text-gray-700 cursor-pointer"
              >
                <div className="font-medium">Auto-create clients</div>
                <div className="text-gray-500">
                  Automatically create new clients for unknown BPIDs
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Uploading...</span>
              <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="error">
            <XCircleIcon className="w-5 h-5" />
            <div>
              <h3 className="font-medium">Upload Failed</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </Alert>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <Alert
              variant={result.error_count === 0 ? 'success' : 'warning'}
            >
              <CheckCircleIcon className="w-5 h-5" />
              <div>
                <h3 className="font-medium">Upload Complete</h3>
                <div className="text-sm mt-2 space-y-1">
                  <p>Total rows: {result.total_rows}</p>
                  <p className="text-green-700">
                    Successfully uploaded: {result.success_count}
                  </p>
                  {result.error_count > 0 && (
                    <p className="text-orange-700">
                      Errors: {result.error_count}
                    </p>
                  )}
                  <p className="text-gray-600">
                    Duration: {result.duration_seconds.toFixed(2)}s
                  </p>
                </div>
              </div>
            </Alert>

            {/* Errors Detail */}
            {result.errors.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Errors ({result.errors.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="text-sm bg-white p-3 rounded border border-gray-200"
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          Row {err.row}
                        </span>
                        <span className="text-gray-500">
                          {err.bpid} / {err.article}
                        </span>
                      </div>
                      <p className="text-red-600">{err.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          {result && (
            <Button
              variant="outline"
              onClick={handleReset}
            >
              Upload Another File
            </Button>
          )}

          {selectedFile && !result && (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                loading={uploading}
              >
                Upload
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        {!selectedFile && !result && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">File Format Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>File must contain these columns: BPID, Ship To Name, Article Number, List Price, App Net Price, Start Date, End Date</li>
              <li>Optional columns: Article Description, UOM</li>
              <li>Dates should be in YYYY-MM-DD format</li>
              <li>Prices should be numeric values</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
