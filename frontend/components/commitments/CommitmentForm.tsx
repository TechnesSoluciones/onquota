'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCommitment } from '@/hooks/useCommitments';
import {
  CommitmentType,
  CommitmentPriority,
  COMMITMENT_TYPE_LABELS,
  COMMITMENT_PRIORITY_LABELS,
  type CommitmentCreate,
} from '@/types/visit';
import { Loader2 } from 'lucide-react';

interface CommitmentFormProps {
  clients: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; full_name: string }>;
  visitId?: string;
  clientId?: string;
  onSuccess?: () => void;
}

export default function CommitmentForm({
  clients,
  users,
  visitId,
  clientId,
  onSuccess,
}: CommitmentFormProps) {
  const router = useRouter();
  const createCommitment = useCreateCommitment();

  const [formData, setFormData] = useState({
    client_id: clientId || '',
    assigned_to_user_id: '',
    type: CommitmentType.FOLLOW_UP,
    title: '',
    description: '',
    due_date: '',
    priority: CommitmentPriority.MEDIUM,
    reminder_date: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const commitmentData: CommitmentCreate = {
      client_id: formData.client_id,
      assigned_to_user_id: formData.assigned_to_user_id,
      type: formData.type as CommitmentType,
      title: formData.title,
      description: formData.description || undefined,
      due_date: formData.due_date,
      priority: formData.priority as CommitmentPriority,
      visit_id: visitId,
      reminder_date: formData.reminder_date || undefined,
    };

    try {
      await createCommitment.mutateAsync(commitmentData);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/commitments');
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente <span className="text-red-500">*</span>
        </label>
        <select
          name="client_id"
          value={formData.client_id}
          onChange={handleChange}
          required
          disabled={!!clientId}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Seleccionar cliente...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo <span className="text-red-500">*</span>
        </label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(COMMITMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Ej: Enviar cotización de equipos"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Detalles del compromiso..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha límite <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prioridad <span className="text-red-500">*</span>
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(COMMITMENT_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {users && users.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asignado a <span className="text-red-500">*</span>
          </label>
          <select
            name="assigned_to_user_id"
            value={formData.assigned_to_user_id}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar usuario...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={createCommitment.isPending}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center"
        >
          {createCommitment.isPending ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Guardando...
            </>
          ) : (
            'Crear Compromiso'
          )}
        </button>
        <button
          type="button"
          onClick={() => onSuccess ? onSuccess() : router.back()}
          disabled={createCommitment.isPending}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
