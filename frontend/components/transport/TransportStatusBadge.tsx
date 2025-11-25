/**
 * TransportStatusBadge Component
 * Displays status badges for vehicles and shipments
 */

import { Badge } from '@/components/ui/badge'
import {
  VehicleStatus,
  ShipmentStatus,
  VEHICLE_STATUS_COLORS,
  VEHICLE_STATUS_LABELS,
  SHIPMENT_STATUS_COLORS,
  SHIPMENT_STATUS_LABELS,
} from '@/types/transport'

interface VehicleStatusBadgeProps {
  status: VehicleStatus
  type: 'vehicle'
}

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus
  type: 'shipment'
}

type TransportStatusBadgeProps = VehicleStatusBadgeProps | ShipmentStatusBadgeProps

export function TransportStatusBadge(props: TransportStatusBadgeProps) {
  if (props.type === 'vehicle') {
    const { status } = props
    const color = VEHICLE_STATUS_COLORS[status]
    const label = VEHICLE_STATUS_LABELS[status]

    return (
      <Badge
        variant={
          color === 'green'
            ? 'default'
            : color === 'yellow'
            ? 'secondary'
            : 'outline'
        }
        className={
          color === 'green'
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : color === 'yellow'
            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        }
      >
        {label}
      </Badge>
    )
  }

  // Shipment status
  const { status } = props
  const color = SHIPMENT_STATUS_COLORS[status]
  const label = SHIPMENT_STATUS_LABELS[status]

  return (
    <Badge
      variant={
        color === 'green'
          ? 'default'
          : color === 'blue'
          ? 'secondary'
          : color === 'red'
          ? 'destructive'
          : 'outline'
      }
      className={
        color === 'green'
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : color === 'blue'
          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          : color === 'red'
          ? 'bg-red-100 text-red-800 hover:bg-red-200'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      }
    >
      {label}
    </Badge>
  )
}
