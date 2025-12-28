/**
 * Commitments Page V2
 * Manage and track commitments and tasks
 * Updated with Design System V2
 */

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui-v2';
import { PageLayout } from '@/components/layouts';
import { Icon } from '@/components/icons';
import { LoadingState, EmptyState } from '@/components/patterns';
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
    <PageLayout
      title="Bit\u00e1cora de Compromisos"
      description="Gestiona y da seguimiento a tus compromisos y tareas"
      actions={
        <Button leftIcon={<Icon name="add" />}>
          Nuevo Compromiso
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">
              {allCommitments.data?.total || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-700">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-900">
              {pendingCommitments.data?.total || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">Vencidos</p>
            <p className="text-2xl font-bold text-red-900">
              {overdueCommitments.data?.total || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as 'all' | 'pending' | 'overdue'); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes
            {pendingCommitments.data && pendingCommitments.data.total > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
                {pendingCommitments.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Vencidos
            {overdueCommitments.data && overdueCommitments.data.total > 0 && (
              <Badge variant="destructive" className="ml-2">
                {overdueCommitments.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos
          </TabsTrigger>
        </TabsList>

        {/* Content for all tabs */}
        <TabsContent value={activeTab} className="mt-6">
          {currentData.isLoading ? (
            <LoadingState message="Cargando compromisos..." />
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
            <EmptyState
              title="No hay compromisos"
              description="No hay compromisos en esta categoría"
            />
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
