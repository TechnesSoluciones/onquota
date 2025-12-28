/**
 * New Visit Page V2
 * Create a new visit record
 * Updated with Design System V2
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui-v2';
import { PageLayout } from '@/components/layouts';
import { LoadingState } from '@/components/patterns';
import { VisitForm } from '@/components/visits';
import { clientsApi } from '@/lib/api';

export default function NewVisitPage() {
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientsApi.getClients({ page: 1, page_size: 1000 });
        setClients(
          response.items.map((c) => ({
            id: c.id,
            name: c.name,
          }))
        );
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <PageLayout
      title="Nueva Visita"
      description="Registra una visita realizada a un cliente"
      backLink="/visits"
    >
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <LoadingState message="Cargando formulario..." />
            ) : (
              <VisitForm clients={clients} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
