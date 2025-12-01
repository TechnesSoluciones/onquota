'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useActiveVisitTopics } from '@/hooks/useVisitTopics';
import type { VisitTopicDetailCreate } from '@/types/visit';

interface VisitTopicSelectorProps {
  selectedTopics: VisitTopicDetailCreate[];
  onChange: (topics: VisitTopicDetailCreate[]) => void;
}

export default function VisitTopicSelector({
  selectedTopics,
  onChange,
}: VisitTopicSelectorProps) {
  const { data: topics, isLoading } = useActiveVisitTopics();
  const [selectedTopicId, setSelectedTopicId] = useState('');

  const handleAddTopic = () => {
    if (!selectedTopicId) return;

    const alreadySelected = selectedTopics.some(
      (t) => t.topic_id === selectedTopicId
    );

    if (alreadySelected) {
      alert('Este tema ya fue agregado');
      return;
    }

    onChange([
      ...selectedTopics,
      {
        topic_id: selectedTopicId,
        details: '',
      },
    ]);

    setSelectedTopicId('');
  };

  const handleRemoveTopic = (topicId: string) => {
    onChange(selectedTopics.filter((t) => t.topic_id !== topicId));
  };

  const handleUpdateDetails = (topicId: string, details: string) => {
    onChange(
      selectedTopics.map((t) =>
        t.topic_id === topicId ? { ...t, details } : t
      )
    );
  };

  const getTopicById = (topicId: string) => {
    return topics?.find((t) => t.id === topicId);
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Cargando temas...</div>;
  }

  const availableTopics = topics?.filter(
    (t) => !selectedTopics.some((st) => st.topic_id === t.id)
  );

  return (
    <div className="space-y-4">
      {/* Add Topic */}
      <div className="flex gap-2">
        <select
          value={selectedTopicId}
          onChange={(e) => setSelectedTopicId(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar tema...</option>
          {availableTopics?.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.icon} {topic.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAddTopic}
          disabled={!selectedTopicId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Agregar
        </button>
      </div>

      {/* Selected Topics */}
      {selectedTopics.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Temas discutidos ({selectedTopics.length})
          </h4>
          {selectedTopics.map((selectedTopic) => {
            const topic = getTopicById(selectedTopic.topic_id);
            if (!topic) return null;

            return (
              <div
                key={selectedTopic.topic_id}
                className="border border-gray-200 rounded-lg p-4 space-y-2"
              >
                {/* Topic Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${topic.color}20`,
                        color: topic.color,
                      }}
                    >
                      <span className="mr-1">{topic.icon}</span>
                      {topic.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(selectedTopic.topic_id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar tema"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Details Textarea */}
                <textarea
                  value={selectedTopic.details || ''}
                  onChange={(e) =>
                    handleUpdateDetails(selectedTopic.topic_id, e.target.value)
                  }
                  placeholder="¿Qué se discutió sobre este tema? (opcional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            );
          })}
        </div>
      )}

      {selectedTopics.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">
            No hay temas seleccionados. Agrega temas usando el selector de
            arriba.
          </p>
        </div>
      )}
    </div>
  );
}
