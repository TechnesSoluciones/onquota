/**
 * useTransport Hook Tests
 * Tests for vehicle and shipment management
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useTransport } from '@/hooks/useTransport'
import { apiClient } from '@/lib/api/client'

jest.mock('@/lib/api/client')

describe('useTransport Hook', () => {
  const mockVehicles = [
    {
      id: '1',
      plate_number: 'ABC-001',
      brand: 'Toyota',
      model: 'Hilux',
      status: 'active',
      mileage_km: '45000',
    },
    {
      id: '2',
      plate_number: 'XYZ-002',
      brand: 'Mercedes',
      model: 'Actros',
      status: 'maintenance',
      mileage_km: '120000',
    },
  ]

  const mockShipments = [
    {
      id: '1',
      shipment_number: 'SHIP-001',
      origin_city: 'Madrid',
      destination_city: 'Barcelona',
      status: 'pending',
      freight_cost: '500.00',
    },
    {
      id: '2',
      shipment_number: 'SHIP-002',
      origin_city: 'Barcelona',
      destination_city: 'Valencia',
      status: 'in_transit',
      freight_cost: '750.00',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(apiClient.get as jest.Mock).mockResolvedValue({
      data: mockVehicles,
    })
  })

  describe('Vehicle Operations', () => {
    it('fetches vehicles on mount', async () => {
      const { result } = renderHook(() => useTransport())

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/vehicles')
      })

      await waitFor(() => {
        expect(result.current.vehicles).toEqual(mockVehicles)
      })
    })

    it('creates a new vehicle', async () => {
      const newVehicle = {
        plate_number: 'NEW-001',
        brand: 'Ford',
        model: 'Transit',
        vehicle_type: 'van',
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { id: '3', ...newVehicle },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.createVehicle(newVehicle)
      })

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/vehicles', newVehicle)
      })
    })

    it('updates vehicle information', async () => {
      const updates = { mileage_km: '50000', status: 'maintenance' }

      ;(apiClient.put as jest.Mock).mockResolvedValue({
        data: { id: '1', ...mockVehicles[0], ...updates },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.updateVehicle('1', updates)
      })

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/vehicles/1', updates)
      })
    })

    it('deletes a vehicle', async () => {
      ;(apiClient.delete as jest.Mock).mockResolvedValue({
        success: true,
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.deleteVehicle('1')
      })

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/vehicles/1')
      })
    })

    it('filters vehicles by status', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: [mockVehicles[1]],
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.filterVehicles({ status: 'maintenance' })
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/vehicles', {
          params: { status: 'maintenance' },
        })
      })
    })

    it('searches vehicles by plate number', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: [mockVehicles[0]],
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.searchVehicles('ABC')
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/vehicles/search', {
          params: { q: 'ABC' },
        })
      })
    })

    it('calculates vehicle fleet statistics', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          total_vehicles: 2,
          active_vehicles: 1,
          in_maintenance: 1,
          total_capacity: '23000',
          avg_mileage: '82500',
        },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.getFleetStats()
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/vehicles/stats')
      })
    })
  })

  describe('Shipment Operations', () => {
    beforeEach(() => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: mockShipments,
      })
    })

    it('fetches shipments', async () => {
      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.fetchShipments()
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/shipments')
      })
    })

    it('creates a new shipment', async () => {
      const newShipment = {
        shipment_number: 'SHIP-003',
        origin_city: 'Valencia',
        destination_city: 'Malaga',
        freight_cost: '600.00',
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { id: '3', ...newShipment },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.createShipment(newShipment)
      })

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/shipments', newShipment)
      })
    })

    it('updates shipment status', async () => {
      ;(apiClient.put as jest.Mock).mockResolvedValue({
        data: { id: '1', status: 'in_transit' },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.updateShipmentStatus('1', 'in_transit')
      })

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/shipments/1/status', {
          status: 'in_transit',
        })
      })
    })

    it('tracks shipment location', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          id: '1',
          current_location: 'Madrid',
          latitude: '40.4168',
          longitude: '-3.7038',
          last_update: '2024-01-01T12:00:00Z',
        },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.getShipmentLocation('1')
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/shipments/1/location')
      })
    })

    it('filters shipments by status', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: [mockShipments[1]],
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.filterShipments({ status: 'in_transit' })
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/shipments', {
          params: { status: 'in_transit' },
        })
      })
    })

    it('filters shipments by date range', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: mockShipments,
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.filterShipments({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/shipments', {
          params: {
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31',
          },
        })
      })
    })
  })

  describe('Expense Tracking', () => {
    it('adds expense to shipment', async () => {
      const expense = {
        type: 'fuel',
        amount: '150.00',
        date: '2024-01-01',
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { id: '1', shipment_id: '1', ...expense },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.addExpense('1', expense)
      })

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/shipments/1/expenses',
          expense
        )
      })
    })

    it('calculates total expenses for shipment', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          expenses: [
            { type: 'fuel', amount: 100 },
            { type: 'toll', amount: 50 },
          ],
          total: 150,
        },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.getShipmentExpenses('1')
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/shipments/1/expenses')
      })
    })

    it('calculates profit after expenses', () => {
      const { result } = renderHook(() => useTransport())

      const profit = result.current.calculateProfit(
        '1000.00', // freight cost
        '250.00' // expenses
      )

      expect(profit).toBe(750)
    })
  })

  describe('Route Management', () => {
    it('calculates route distance', () => {
      const { result } = renderHook(() => useTransport())

      const distance = result.current.calculateDistance(
        { lat: 40.4168, lng: -3.7038 }, // Madrid
        { lat: 41.3851, lng: 2.1734 } // Barcelona
      )

      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(1000) // Less than 1000 km
    })

    it('estimates travel time', () => {
      const { result } = renderHook(() => useTransport())

      const travelTime = result.current.estimateTravelTime(600, 80) // 600 km at 80 km/h

      expect(travelTime).toBeCloseTo(7.5, 1) // hours
    })

    it('optimizes multiple shipment routes', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: {
          optimized_route: [
            { id: '1', order: 1 },
            { id: '2', order: 2 },
            { id: '3', order: 3 },
          ],
          total_distance: '850.00',
          estimated_time: '10.5',
        },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.optimizeRoute(['1', '2', '3'])
      })

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/shipments/optimize-route', {
          shipment_ids: ['1', '2', '3'],
        })
      })
    })
  })

  describe('Maintenance Tracking', () => {
    it('tracks maintenance schedule', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: [
          {
            vehicle_id: '1',
            type: 'oil_change',
            due_date: '2024-02-01',
            status: 'pending',
          },
        ],
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.getMaintenanceSchedule('1')
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/vehicles/1/maintenance')
      })
    })

    it('logs maintenance completion', async () => {
      const maintenance = {
        type: 'oil_change',
        date: '2024-01-15',
        cost: '75.00',
        notes: 'Oil and filter changed',
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { id: '1', ...maintenance },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.logMaintenance('1', maintenance)
      })

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/vehicles/1/maintenance',
          maintenance
        )
      })
    })

    it('identifies overdue maintenance', () => {
      const { result } = renderHook(() => useTransport())

      const overdue = result.current.isMaintenanceOverdue(
        new Date('2023-12-01'), // Due date
        new Date() // Today
      )

      expect(overdue).toBe(true)
    })
  })

  describe('Reporting', () => {
    it('generates vehicle utilization report', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          vehicles: [
            { id: '1', utilization: '85%' },
            { id: '2', utilization: '70%' },
          ],
          average_utilization: '77.5%',
        },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.generateUtilizationReport()
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/reports/utilization')
      })
    })

    it('generates profitability report', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          total_revenue: '50000.00',
          total_expenses: '15000.00',
          profit: '35000.00',
          margin: '70%',
        },
      })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.generateProfitabilityReport()
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/reports/profitability')
      })
    })

    it('exports report to PDF', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: 'PDF content',
        headers: { 'content-type': 'application/pdf' },
      })

      const { result } = renderHook(() => useTransport())

      const pdf = await result.current.exportReport('utilization', 'pdf')

      expect(pdf).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('handles vehicle fetch errors', async () => {
      const mockError = new Error('Failed to fetch vehicles')
      ;(apiClient.get as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useTransport())

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.vehicles).toEqual([])
      })
    })

    it('handles shipment creation errors', async () => {
      const mockError = new Error('Invalid shipment data')
      ;(apiClient.post as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.createShipment({} as any)
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('retries failed requests', async () => {
      ;(apiClient.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockVehicles })

      const { result } = renderHook(() => useTransport())

      act(() => {
        result.current.retryLastOperation()
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2)
      })
    })
  })
})
