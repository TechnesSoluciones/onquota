import { useState, useEffect } from 'react'
import { transportApi } from '@/lib/api'
import type { VehicleSummary, ShipmentSummary } from '@/types/transport'

/**
 * Hook to fetch transport statistics
 * Returns vehicle and shipment summaries with loading states
 */
export function useTransportStats() {
  const [vehicleStats, setVehicleStats] = useState<VehicleSummary | null>(null)
  const [shipmentStats, setShipmentStats] = useState<ShipmentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [vehicleData, shipmentData] = await Promise.all([
        transportApi.getVehiclesSummary(),
        transportApi.getShipmentsSummary(),
      ])

      setVehicleStats(vehicleData)
      setShipmentStats(shipmentData)
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error al cargar estadísticas'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const refresh = () => {
    fetchStats()
  }

  return {
    vehicleStats,
    shipmentStats,
    isLoading,
    error,
    refresh,
  }
}
