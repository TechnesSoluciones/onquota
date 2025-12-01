'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateVisit } from '@/hooks/useVisitsEnhanced';
import { useClientContacts } from '@/hooks/useClientContacts';
import VisitTopicSelector from './VisitTopicSelector';
import { VisitType, type VisitCreate, type VisitTopicDetailCreate } from '@/types/visit';
import { Loader2, User } from 'lucide-react';

interface VisitFormProps {
  clients: Array<{ id: string; name: string }>;
}

export default function VisitForm({ clients }: VisitFormProps) {
  const router = useRouter();
  const createVisit = useCreateVisit();

  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    visit_type: VisitType.PRESENCIAL,
    contact_person_name: '',
    contact_person_role: '',
    visit_date: '',
    duration_minutes: '',
    general_notes: '',
    outcome: '',
    follow_up_required: false,
    follow_up_date: '',
  });

  const [selectedTopics, setSelectedTopics] = useState<VisitTopicDetailCreate[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');

  // Fetch contacts when client is selected
  const { contacts, isLoading: loadingContacts } = useClientContacts(
    formData.client_id || null
  );

  // Update contact fields when a contact is selected from dropdown
  useEffect(() => {
    if (selectedContactId && contacts) {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact) {
        setFormData((prev) => ({
          ...prev,
          contact_person_name: contact.name,
          contact_person_role: contact.position || '',
        }));
      }
    }
  }, [selectedContactId, contacts]);

  // Reset contact selection when client changes
  useEffect(() => {
    setSelectedContactId('');
    if (!formData.client_id) {
      setFormData((prev) => ({
        ...prev,
        contact_person_name: '',
        contact_person_role: '',
      }));
    }
  }, [formData.client_id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const visitData: VisitCreate = {
      client_id: formData.client_id,
      title: formData.title,
      description: formData.description || undefined,
      visit_type: formData.visit_type,
      contact_person_name: formData.contact_person_name || undefined,
      contact_person_role: formData.contact_person_role || undefined,
      visit_date: formData.visit_date,
      duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : undefined,
      general_notes: formData.general_notes || undefined,
      outcome: formData.outcome || undefined,
      follow_up_required: formData.follow_up_required,
      follow_up_date: formData.follow_up_date || undefined,
      topics: selectedTopics,
    };

    try {
      await createVisit.mutateAsync(visitData);
      router.push('/visits');
    } catch (error) {
      // Error already handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente <span className="text-red-500">*</span>
        </label>
        <select
          name="client_id"
          value={formData.client_id}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar cliente...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título de la visita <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Ej: Reunión de presentación de productos"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Visit Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de visita <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="visit_type"
              value={VisitType.PRESENCIAL}
              checked={formData.visit_type === VisitType.PRESENCIAL}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm">🏢 Presencial</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="visit_type"
              value={VisitType.VIRTUAL}
              checked={formData.visit_type === VisitType.VIRTUAL}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm">💻 Virtual</span>
          </label>
        </div>
      </div>

      {/* Visit Date & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha y hora <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            name="visit_date"
            value={formData.visit_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duración (minutos)
          </label>
          <input
            type="number"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            min="0"
            placeholder="60"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Contact Person - Enhanced with client contacts dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Persona que atendió
        </label>

        {/* Contact Selector from Client Contacts */}
        {formData.client_id && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-500" />
              <label className="text-sm text-gray-600">
                Seleccionar del personal del cliente
              </label>
            </div>
            {loadingContacts ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando contactos...
              </div>
            ) : contacts && contacts.length > 0 ? (
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
              >
                <option value="">Seleccionar contacto del cliente...</option>
                {contacts
                  .filter((c) => c.is_active)
                  .map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.position ? ` - ${contact.position}` : ''}
                      {contact.is_primary ? ' ⭐ (Principal)' : ''}
                    </option>
                  ))}
              </select>
            ) : (
              <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded border border-gray-200">
                Este cliente no tiene contactos registrados. Puedes ingresar los datos manualmente abajo.
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              name="contact_person_name"
              value={formData.contact_person_name}
              onChange={handleChange}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Cargo
            </label>
            <input
              type="text"
              name="contact_person_role"
              value={formData.contact_person_role}
              onChange={handleChange}
              placeholder="Ej: Gerente de Compras"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Topics */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Temas discutidos
        </label>
        <VisitTopicSelector
          selectedTopics={selectedTopics}
          onChange={setSelectedTopics}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Descripción general de la visita..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* General Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas generales
        </label>
        <textarea
          name="general_notes"
          value={formData.general_notes}
          onChange={handleChange}
          rows={4}
          placeholder="Observaciones, acuerdos, próximos pasos..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Outcome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resultado
        </label>
        <input
          type="text"
          name="outcome"
          value={formData.outcome}
          onChange={handleChange}
          placeholder="Ej: Interesados en cotización"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Follow-up */}
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="follow_up_required"
            checked={formData.follow_up_required}
            onChange={handleChange}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">
            Requiere seguimiento
          </span>
        </label>
        {formData.follow_up_required && (
          <input
            type="datetime-local"
            name="follow_up_date"
            value={formData.follow_up_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={createVisit.isPending}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
        >
          {createVisit.isPending ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Guardando...
            </>
          ) : (
            'Guardar Visita'
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={createVisit.isPending}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
