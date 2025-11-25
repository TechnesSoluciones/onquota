import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters'
import type { ExpenseFilters as Filters } from '@/types/expense'

describe('ExpenseFilters', () => {
  const mockOnFilterChange = jest.fn()
  const mockOnClear = jest.fn()

  const defaultFilters: Filters = {}

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render filter form', () => {
    render(
      <ExpenseFilters
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
        onClear={mockOnClear}
      />
    )

    expect(screen.getByText('Filtros')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Descripción, proveedor/i)).toBeInTheDocument()
  })

  it('should call onClear when clear button is clicked', () => {
    render(
      <ExpenseFilters
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
        onClear={mockOnClear}
      />
    )

    const clearButton = screen.getByRole('button', { name: /Limpiar/i })
    fireEvent.click(clearButton)

    expect(mockOnClear).toHaveBeenCalled()
  })

  it('should update search filter on input change', () => {
    render(
      <ExpenseFilters
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
        onClear={mockOnClear}
      />
    )

    const searchInput = screen.getByPlaceholderText(/Descripción, proveedor/i)
    fireEvent.change(searchInput, { target: { value: 'test search' } })

    expect(searchInput).toHaveValue('test search')
  })

  it('should submit search form', () => {
    render(
      <ExpenseFilters
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
        onClear={mockOnClear}
      />
    )

    const searchInput = screen.getByPlaceholderText(/Descripción, proveedor/i)
    const searchButton = screen.getByRole('button', { name: /Buscar/i })

    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.click(searchButton)

    expect(mockOnFilterChange).toHaveBeenCalled()
  })

  it('should render status select', () => {
    render(
      <ExpenseFilters
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
        onClear={mockOnClear}
      />
    )

    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  it('should render category select', () => {
    render(
      <ExpenseFilters
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
        onClear={mockOnClear}
      />
    )

    expect(screen.getByText('Categoría')).toBeInTheDocument()
  })

  it('should render date from input', () => {
    render(
      <ExpenseFilters
        filters={defaultFilters}
        onFilterChange={mockOnFilterChange}
        onClear={mockOnClear}
      />
    )

    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
  })
})
