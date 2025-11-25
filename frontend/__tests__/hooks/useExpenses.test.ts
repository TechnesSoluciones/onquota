import { renderHook, waitFor } from '@testing-library/react'
import { useExpenses } from '@/hooks/useExpenses'
import { expensesApi } from '@/lib/api/expenses'

// Mock the API
jest.mock('@/lib/api/expenses')

describe('useExpenses', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    ;(expensesApi.getExpenses as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 0,
    })

    const { result } = renderHook(() => useExpenses())

    expect(result.current.expenses).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch expenses on mount', async () => {
    const mockExpenses = [
      {
        id: '1',
        description: 'Test Expense',
        amount: 100,
        currency: 'COP',
        date: '2024-01-01',
        status: 'pending',
        category: null,
      },
    ]

    ;(expensesApi.getExpenses as jest.Mock).mockResolvedValue({
      items: mockExpenses,
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    })

    const { result } = renderHook(() => useExpenses())

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(1)
    })

    expect(result.current.expenses[0].description).toBe('Test Expense')
  })

  it('should handle errors', async () => {
    const error = new Error('API Error')
    ;(expensesApi.getExpenses as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useExpenses())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })

  it('should update filters and reset to page 1', async () => {
    ;(expensesApi.getExpenses as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 0,
    })

    const { result } = renderHook(() => useExpenses())

    result.current.updateFilters({ status: 'approved' })

    await waitFor(() => {
      expect(result.current.filters.status).toBe('approved')
      expect(result.current.pagination.page).toBe(1)
    })
  })

  it('should navigate between pages', async () => {
    ;(expensesApi.getExpenses as jest.Mock).mockResolvedValue({
      items: [],
      total: 100,
      page: 1,
      page_size: 20,
      pages: 5,
    })

    const { result } = renderHook(() => useExpenses())

    result.current.goToPage(2)

    await waitFor(() => {
      expect(result.current.pagination.page).toBe(2)
    })
  })
})
