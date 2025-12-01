/**
 * VisitsMap Component
 * Interactive map component for visualizing visits with Google Maps
 * Uses @react-google-maps/api for map rendering with markers and info windows
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, Calendar, Clock, FileText, Navigation, CheckCircle2, XCircle, Circle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Visit, VisitStatus } from '@/types/visits'

interface VisitsMapProps {
  visits: Visit[]
  center?: { lat: number; lng: number }
  zoom?: number
  onVisitClick?: (visit: Visit) => void
}

/**
 * Map container styling
 */
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
}

/**
 * Default map options
 */
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  clickableIcons: false,
}

/**
 * Color scheme for visit status markers
 */
const STATUS_COLORS: Record<VisitStatus, string> = {
  SCHEDULED: '#3b82f6', // blue
  IN_PROGRESS: '#eab308', // yellow
  COMPLETED: '#22c55e', // green
  CANCELLED: '#ef4444', // red
}

/**
 * Status icons mapping
 */
const STATUS_ICONS = {
  SCHEDULED: Circle,
  IN_PROGRESS: Loader2,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
}

/**
 * Status labels
 */
const STATUS_LABELS: Record<VisitStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function VisitsMap({
  visits,
  center: providedCenter,
  zoom = 12,
  onVisitClick,
}: VisitsMapProps) {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  })

  /**
   * Calculate center point based on visits
   * If center not provided, calculate average position from visits with coordinates
   */
  const mapCenter = useMemo(() => {
    if (providedCenter) return providedCenter

    const visitsWithCoords = visits.filter(
      (v) => v.check_in_latitude !== null && v.check_in_longitude !== null
    )

    if (visitsWithCoords.length === 0) {
      // Default to a generic location if no visits have coordinates
      return { lat: 19.4326, lng: -99.1332 } // Mexico City default
    }

    const avgLat =
      visitsWithCoords.reduce((sum, v) => sum + (v.check_in_latitude || 0), 0) /
      visitsWithCoords.length
    const avgLng =
      visitsWithCoords.reduce((sum, v) => sum + (v.check_in_longitude || 0), 0) /
      visitsWithCoords.length

    return { lat: avgLat, lng: avgLng }
  }, [visits, providedCenter])

  /**
   * Filter visits that have valid coordinates
   */
  const visitMarkers = useMemo(() => {
    return visits.filter(
      (visit) =>
        visit.check_in_latitude !== null &&
        visit.check_in_longitude !== null &&
        !isNaN(visit.check_in_latitude) &&
        !isNaN(visit.check_in_longitude)
    )
  }, [visits])

  /**
   * Handle marker click
   */
  const handleMarkerClick = useCallback(
    (visit: Visit) => {
      setSelectedVisit(visit)
      onVisitClick?.(visit)
    },
    [onVisitClick]
  )

  /**
   * Handle info window close
   */
  const handleInfoWindowClose = useCallback(() => {
    setSelectedVisit(null)
  }, [])

  /**
   * Navigate to visit location in external map app
   */
  const handleNavigate = useCallback((visit: Visit) => {
    if (visit.check_in_latitude && visit.check_in_longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${visit.check_in_latitude},${visit.check_in_longitude}`
      window.open(url, '_blank')
    }
  }, [])

  /**
   * Format date for display
   */
  const formatVisitDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy • HH:mm')
    } catch {
      return dateString
    }
  }

  /**
   * Get marker icon configuration
   */
  const getMarkerIcon = (status: VisitStatus): google.maps.Icon => {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: STATUS_COLORS[status],
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 10,
    }
  }

  /**
   * Render loading state
   */
  if (loadError) {
    return (
      <Card className="flex h-[500px] items-center justify-center p-6">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Error loading map
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Failed to load Google Maps. Please check your API key.
          </p>
        </div>
      </Card>
    )
  }

  if (!isLoaded) {
    return (
      <Card className="flex h-[500px] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-sm text-gray-600">Loading map...</p>
        </div>
      </Card>
    )
  }

  /**
   * Render empty state
   */
  if (visitMarkers.length === 0) {
    return (
      <Card className="flex h-[500px] items-center justify-center p-6">
        <div className="text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No visits with locations
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Visits will appear here once they have check-in coordinates.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        options={mapOptions}
        onLoad={setMapInstance}
      >
        {/* Render markers for each visit */}
        {visitMarkers.map((visit) => (
          <Marker
            key={visit.id}
            position={{
              lat: visit.check_in_latitude!,
              lng: visit.check_in_longitude!,
            }}
            icon={getMarkerIcon(visit.status)}
            onClick={() => handleMarkerClick(visit)}
            title={visit.title}
          />
        ))}

        {/* Render info window for selected visit */}
        {selectedVisit && selectedVisit.check_in_latitude && selectedVisit.check_in_longitude && (
          <InfoWindow
            position={{
              lat: selectedVisit.check_in_latitude,
              lng: selectedVisit.check_in_longitude,
            }}
            onCloseClick={handleInfoWindowClose}
          >
            <div className="max-w-xs p-2">
              {/* Title and Status */}
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedVisit.title}
                </h3>
                <Badge
                  variant="outline"
                  className="ml-2"
                  style={{
                    borderColor: STATUS_COLORS[selectedVisit.status],
                    color: STATUS_COLORS[selectedVisit.status],
                  }}
                >
                  {STATUS_LABELS[selectedVisit.status]}
                </Badge>
              </div>

              {/* Client */}
              <div className="mb-2 flex items-center text-sm text-gray-700">
                <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                <span className="font-medium">{selectedVisit.client_name}</span>
              </div>

              {/* Scheduled Date */}
              <div className="mb-2 flex items-center text-sm text-gray-600">
                <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                <span>{formatVisitDate(selectedVisit.scheduled_date)}</span>
              </div>

              {/* Duration */}
              {selectedVisit.duration_minutes && (
                <div className="mb-2 flex items-center text-sm text-gray-600">
                  <Clock className="mr-2 h-4 w-4 text-gray-500" />
                  <span>{selectedVisit.duration_minutes} minutes</span>
                </div>
              )}

              {/* Notes */}
              {selectedVisit.notes && (
                <div className="mb-3 flex items-start text-sm text-gray-600">
                  <FileText className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                  <p className="line-clamp-3">{selectedVisit.notes}</p>
                </div>
              )}

              {/* Address */}
              {selectedVisit.check_in_address && (
                <div className="mb-3 rounded-md bg-gray-50 p-2">
                  <p className="text-xs text-gray-600">{selectedVisit.check_in_address}</p>
                </div>
              )}

              {/* Navigate Button */}
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleNavigate(selectedVisit)}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Navigate
              </Button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg border bg-white p-3 shadow-md">
        <h4 className="mb-2 text-xs font-semibold text-gray-700">Visit Status</h4>
        <div className="space-y-1.5">
          {Object.entries(STATUS_LABELS).map(([status, label]) => {
            const Icon = STATUS_ICONS[status as VisitStatus]
            return (
              <div key={status} className="flex items-center gap-2 text-xs">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status as VisitStatus] }}
                />
                <span className="text-gray-700">{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
