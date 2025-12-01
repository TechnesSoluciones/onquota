'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/visits"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a visitas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Visita</h1>
        <p className="text-gray-600 mt-1">
          Registra una visita realizada a un cliente
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando formulario...</p>
          </div>
        ) : (
          <VisitForm clients={clients} />
        )}
      </div>
    </div>
  );
}
