'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle2, AlertCircle, User } from 'lucide-react';
import {
  CommitmentStatus,
  CommitmentPriority,
  COMMITMENT_TYPE_LABELS,
  COMMITMENT_PRIORITY_LABELS,
  COMMITMENT_STATUS_LABELS,
  type Commitment,
} from '@/types/visit';

interface CommitmentCardProps {
  commitment: Commitment;
  onComplete?: (id: string) => void;
  onClick?: () => void;
}

export default function CommitmentCard({
  commitment,
  onComplete,
  onClick,
}: CommitmentCardProps) {
  const getPriorityColor = (priority: CommitmentPriority) => {
    const colors = {
      [CommitmentPriority.LOW]: 'bg-gray-100 text-gray-700',
      [CommitmentPriority.MEDIUM]: 'bg-blue-100 text-blue-700',
      [CommitmentPriority.HIGH]: 'bg-orange-100 text-orange-700',
      [CommitmentPriority.URGENT]: 'bg-red-100 text-red-700',
    };
    return colors[priority];
  };

  const getStatusColor = (status: CommitmentStatus) => {
    const colors = {
      [CommitmentStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
      [CommitmentStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
      [CommitmentStatus.COMPLETED]: 'bg-green-100 text-green-700',
      [CommitmentStatus.CANCELLED]: 'bg-gray-100 text-gray-700',
      [CommitmentStatus.OVERDUE]: 'bg-red-100 text-red-700',
    };
    return colors[status];
  };

  const isOverdue = () => {
    if (commitment.status === CommitmentStatus.COMPLETED) return false;
    return new Date(commitment.due_date) < new Date();
  };

  const formatDueDate = () => {
    const dueDate = new Date(commitment.due_date);
    const now = new Date();
    const diffDays = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return `Vencido hace ${Math.abs(diffDays)} día(s)`;
    } else if (diffDays === 0) {
      return 'Vence hoy';
    } else if (diffDays === 1) {
      return 'Vence mañana';
    } else if (diffDays <= 7) {
      return `Vence en ${diffDays} días`;
    } else {
      return format(dueDate, "d 'de' MMMM", { locale: es });
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      } ${isOverdue() ? 'border-red-300' : 'border-gray-200'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{commitment.title}</h3>
          <p className="text-sm text-gray-600">
            {COMMITMENT_TYPE_LABELS[commitment.type]}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
              commitment.priority
            )}`}
          >
            {COMMITMENT_PRIORITY_LABELS[commitment.priority]}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              commitment.status
            )}`}
          >
            {COMMITMENT_STATUS_LABELS[commitment.status]}
          </span>
        </div>
      </div>

      {/* Description */}
      {commitment.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {commitment.description}
        </p>
      )}

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>{commitment.client_name || 'Cliente'}</span>
        </div>
        <div
          className={`flex items-center gap-1 ${
            isOverdue() ? 'text-red-600 font-medium' : ''
          }`}
        >
          {isOverdue() ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span>{formatDueDate()}</span>
        </div>
      </div>

      {/* Assigned To */}
      {commitment.assigned_to_name && (
        <div className="text-xs text-gray-500 mb-3">
          Asignado a: <span className="font-medium">{commitment.assigned_to_name}</span>
        </div>
      )}

      {/* Actions */}
      {commitment.status !== CommitmentStatus.COMPLETED && onComplete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(commitment.id);
          }}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
        >
          <CheckCircle2 className="h-4 w-4" />
          Marcar como completado
        </button>
      )}

      {/* Completion Info */}
      {commitment.status === CommitmentStatus.COMPLETED &&
        commitment.completed_at && (
          <div className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            ✓ Completado el{' '}
            {format(new Date(commitment.completed_at), "d 'de' MMMM 'a las' HH:mm", {
              locale: es,
            })}
          </div>
        )}
    </div>
  );
}
