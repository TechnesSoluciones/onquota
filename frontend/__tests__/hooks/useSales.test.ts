/**
 * useSales Hook Tests
 * Tests for sales data management and operations
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useSales } from '@/hooks/useSales'
import { apiClient } from '@/lib/api/client'

// Mock API client
jest.mock('@/lib/api/client')

describe('useSales Hook', () => {
  const mockSalesData = [
    {
      id: '1',
      client_id: 'client1',
      quote_number: 'QUOTE-001',
      status: 'pending',
      total_amount: '5000.00',
      created_at: '2024-01-01',
    },
    {
      id: '2',
      client_id: 'client2',
      quote_number: 'QUOTE-002',
      status: 'accepted',
      total_amount: '7500.00',
      created_at: '2024-01-02',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(apiClient.get as jest.Mock).mockResolvedValue({
      data: mockSalesData,
    })
  })

  describe('Fetching Sales', () => {
    it('fetches sales data on mount', async () => {
      const { result } = renderHook(() => useSales())

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/sales')
      })

      await waitFor(() => {
        expect(result.current.sales).toEqual(mockSalesData)
      })
    })

    it('returns loading state while fetching', async () => {
      const { result } = renderHook(() => useSales())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('handles fetch errors correctly', async () => {
      const mockError = new Error('Failed to fetch sales')
      ;(apiClient.get as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useSales())

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.sales).toEqual([])
      })
    })

    it('fetches sales with pagination', async () => {
      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.fetchSales({ page: 2, pageSize: 10 })
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/sales', {
          params: { page: 2, pageSize: 10 },
        })
      })
    })

    it('fetches sales with filters', async () => {
      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.fetchSales({
          status: 'pending',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/sales', {
          params: {
            status: 'pending',
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31',
          },
        })
      })
    })

    it('searches sales by quote number', async () => {
      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.searchSales('QUOTE-001')
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/sales/search', {
          params: { q: 'QUOTE-001' },
        })
      })
    })
  })

  describe('Creating Sales', () => {
    it('creates a new sale', async () => {
      const newSale = {
        client_id: 'client3',
        items: [
          { description: 'Service', quantity: 1, unit_price: '1000.00' },
        ],
        discount: '100.00',
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { id: '3', ...newSale, status: 'pending' },
      })

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.createSale(newSale)
      })

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/sales', newSale)
      })
    })

    it('handles sale creation errors', async () => {
      const mockError = new Error('Invalid data')
      ;(apiClient.post as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.createSale({} as any)
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('validates required fields before creating', async () => {
      const { result } = renderHook(() => useSales())

      const incompleteData = { items: [] }

      act(() => {
        result.current.createSale(incompleteData as any)
      })

      await waitFor(() => {
        expect(result.current.error).toContain('client_id is required')
      })
    })
  })

  describe('Updating Sales', () => {
    it('updates a sale', async () => {
      const updatedData = { status: 'accepted' }

      ;(apiClient.put as jest.Mock).mockResolvedValue({
        data: { id: '1', ...mockSalesData[0], ...updatedData },
      })

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.updateSale('1', updatedData)
      })

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/sales/1', updatedData)
      })
    })

    it('handles update errors', async () => {
      const mockError = new Error('Sale not found')
      ;(apiClient.put as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.updateSale('999', { status: 'accepted' })
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })
  })

  describe('Deleting Sales', () => {
    it('deletes a sale', async () => {
      ;(apiClient.delete as jest.Mock).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.deleteSale('1')
      })

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/sales/1')
      })
    })

    it('handles delete errors', async () => {
      const mockError = new Error('Cannot delete')
      ;(apiClient.delete as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.deleteSale('1')
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })
  })

  describe('Sale Calculations', () => {
    it('calculates total amount correctly', () => {
      const { result } = renderHook(() => useSales())

      const items = [
        { quantity: 2, unit_price: 100 },
        { quantity: 3, unit_price: 50 },
      ]

      const total = result.current.calculateTotal(items, 0)
      expect(total).toBe(350)
    })

    it('applies discount to total', () => {
      const { result } = renderHook(() => useSales())

      const items = [{ quantity: 10, unit_price: 100 }]
      const total = result.current.calculateTotal(items, 100) // $100 discount

      expect(total).toBe(900) // 1000 - 100
    })

    it('applies percentage discount', () => {
      const { result } = renderHook(() => useSales())

      const items = [{ quantity: 10, unit_price: 100 }]
      const subtotal = 1000
      const percentDiscount = (subtotal * 10) / 100 // 10% = $100

      const total = result.current.calculateTotal(items, percentDiscount)
      expect(total).toBe(900)
    })

    it('handles decimal amounts', () => {
      const { result } = renderHook(() => useSales())

      const items = [
        { quantity: 2.5, unit_price: 50.75 },
        { quantity: 1.5, unit_price: 100.50 },
      ]

      const total = result.current.calculateTotal(items, 0)
      expect(total).toBeCloseTo(277.625, 2)
    })
  })

  describe('Sale Status Management', () => {
    it('transitions sale status', async () => {
      ;(apiClient.put as jest.Mock).mockResolvedValue({
        data: { id: '1', status: 'accepted' },
      })

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.updateSaleStatus('1', 'accepted')
      })

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith('/sales/1/status', {
          status: 'accepted',
        })
      })
    })

    it('provides valid status transitions', () => {
      const { result } = renderHook(() => useSales())

      const validTransitions = result.current.getValidStatusTransitions(
        'pending'
      )

      expect(validTransitions).toContain('accepted')
      expect(validTransitions).toContain('rejected')
      expect(validTransitions).not.toContain('pending')
    })

    it('prevents invalid status transitions', () => {
      const { result } = renderHook(() => useSales())

      const validTransitions = result.current.getValidStatusTransitions(
        'delivered'
      )

      // Delivered is final state
      expect(validTransitions).toEqual([])
    })
  })

  describe('Bulk Operations', () => {
    it('bulk updates sales status', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { updated: 2 },
      })

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.bulkUpdateStatus(['1', '2'], 'accepted')
      })

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/sales/bulk-update',
          { ids: ['1', '2'], status: 'accepted' }
        )
      })
    })

    it('handles bulk operation errors', async () => {
      const mockError = new Error('Bulk update failed')
      ;(apiClient.post as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.bulkUpdateStatus(['1', '2'], 'accepted')
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })
  })

  describe('Export Functionality', () => {
    it('exports sales to CSV', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: 'CSV content here',
        headers: { 'content-type': 'text/csv' },
      })

      const { result } = renderHook(() => useSales())

      const csvData = await result.current.exportToCSV({
        status: 'pending',
      })

      expect(csvData).toBeTruthy()
      expect(apiClient.get).toHaveBeenCalledWith('/sales/export/csv', {
        params: { status: 'pending' },
      })
    })

    it('exports sales to PDF', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: 'PDF content',
        headers: { 'content-type': 'application/pdf' },
      })

      const { result } = renderHook(() => useSales())

      const pdfData = await result.current.exportToPDF(['1', '2'])

      expect(pdfData).toBeTruthy()
      expect(apiClient.get).toHaveBeenCalled()
    })
  })

  describe('Local State Management', () => {
    it('caches sales data', async () => {
      const { result, rerender } = renderHook(() => useSales())

      await waitFor(() => {
        expect(result.current.sales).toEqual(mockSalesData)
      })

      // Rerender - should not refetch
      rerender()

      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })

    it('clears cache on manual refresh', async () => {
      const { result } = renderHook(() => useSales())

      await waitFor(() => {
        expect(result.current.sales).toEqual(mockSalesData)
      })

      act(() => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2)
      })
    })

    it('provides selected sale data', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: mockSalesData[0],
      })

      const { result } = renderHook(() => useSales())

      act(() => {
        result.current.selectSale('1')
      })

      await waitFor(() => {
        expect(result.current.selectedSale).toEqual(mockSalesData[0])
      })
    })
  })

  describe('Validation', () => {
    it('validates sale items', () => {
      const { result } = renderHook(() => useSales())

      const validItems = [
        { description: 'Item 1', quantity: 1, unit_price: 100 },
      ]
      const invalidItems = [
        { description: '', quantity: 1, unit_price: 100 }, // missing description
      ]

      expect(result.current.validateItems(validItems)).toBe(true)
      expect(result.current.validateItems(invalidItems)).toBe(false)
    })

    it('validates sale totals', () => {
      const { result } = renderHook(() => useSales())

      const validSale = {
        items: [{ quantity: 1, unit_price: 100 }],
        totalAmount: 100,
      }

      const invalidSale = {
        items: [{ quantity: 1, unit_price: 100 }],
        totalAmount: 50, // Mismatch
      }

      expect(result.current.validateTotals(validSale)).toBe(true)
      expect(result.current.validateTotals(invalidSale)).toBe(false)
    })
  })
})
