'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useCommitments, usePendingCommitments, useOverdueCommitments, useCompleteCommitment } from '@/hooks/useCommitments';
import { CommitmentCard } from '@/components/commitments';
import { CommitmentStatus } from '@/types/visit';

export default function CommitmentsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue'>('pending');
  const [page, setPage] = useState(1);

  const allCommitments = useCommitments({ page, page_size: 20 });
  const pendingCommitments = usePendingCommitments(undefined, page, 20);
  const overdueCommitments = useOverdueCommitments(undefined, page, 20);
  const completeCommitment = useCompleteCommitment();

  const currentData =
    activeTab === 'pending'
      ? pendingCommitments
      : activeTab === 'overdue'
      ? overdueCommitments
      : allCommitments;

  const handleComplete = async (id: string) => {
    if (confirm('¿Marcar este compromiso como completado?')) {
      await completeCommitment.mutateAsync({
        commitmentId: id,
        data: {},
      });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bit\u00e1cora de Compromisos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona y da seguimiento a tus compromisos y tareas
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Compromiso
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">
            {allCommitments.data?.total || 0}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow-sm border border-yellow-200">
          <p className="text-sm text-yellow-700">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-900">
            {pendingCommitments.data?.total || 0}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 shadow-sm border border-red-200">
          <p className="text-sm text-red-700">Vencidos</p>
          <p className="text-2xl font-bold text-red-900">
            {overdueCommitments.data?.total || 0}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => {
                setActiveTab('pending');
                setPage(1);
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pendientes
              {pendingCommitments.data && pendingCommitments.data.total > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs">
                  {pendingCommitments.data.total}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('overdue');
                setPage(1);
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'overdue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vencidos
              {overdueCommitments.data && overdueCommitments.data.total > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs">
                  {overdueCommitments.data.total}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('all');
                setPage(1);
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Todos
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentData.isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
              <p className="text-gray-500 mt-4">Cargando compromisos...</p>
            </div>
          ) : currentData.data && currentData.data.items.length > 0 ? (
            <>
              <div className="grid gap-4">
                {currentData.data.items.map((commitment) => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    onComplete={handleComplete}
                  />
                ))}
              </div>

              {/* Pagination */}
              {currentData.data.total_pages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {currentData.data.items.length} de{' '}
                    {currentData.data.total} compromisos
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1">
                      Página {page} de {currentData.data.total_pages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(currentData.data!.total_pages, p + 1))
                      }
                      disabled={page === currentData.data.total_pages}
                      className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay compromisos en esta categoría</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
