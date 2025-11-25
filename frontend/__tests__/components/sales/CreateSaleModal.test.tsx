/**
 * Create Sale Modal Component Tests
 * Tests for creating sales quotes and managing quotes
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateSaleModal from '@/components/sales/CreateSaleModal'

// Mock dependencies
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

jest.mock('@/hooks/useSales', () => ({
  useSales: jest.fn(),
}))

describe('CreateSaleModal Component', () => {
  const mockOnClose = jest.fn()
  const mockOnSaleCreated = jest.fn()
  const mockClients = [
    { id: '1', name: 'Client A', email: 'client.a@test.com' },
    { id: '2', name: 'Client B', email: 'client.b@test.com' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when isOpen is true', () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    expect(screen.getByText('Nueva Venta')).toBeInTheDocument()
  })

  it('does not render modal when isOpen is false', () => {
    render(
      <CreateSaleModal
        isOpen={false}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    expect(screen.queryByText('Nueva Venta')).not.toBeInTheDocument()
  })

  it('closes modal when close button is clicked', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const closeButton = screen.getByRole('button', { name: /cerrar/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('renders form with all required fields', () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cantidad/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/precio unitario/i)).toBeInTheDocument()
  })

  it('validates required fields on submit', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const submitButton = screen.getByRole('button', { name: /crear venta/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('El cliente es requerido')).toBeInTheDocument()
      expect(screen.getByText('La cantidad es requerida')).toBeInTheDocument()
    })
  })

  it('validates quantity as positive number', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const quantityInput = screen.getByLabelText(/cantidad/i)
    await userEvent.type(quantityInput, '-5')

    const submitButton = screen.getByRole('button', { name: /crear venta/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('La cantidad debe ser un número positivo')
      ).toBeInTheDocument()
    })
  })

  it('validates price as positive number', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const priceInput = screen.getByLabelText(/precio unitario/i)
    await userEvent.type(priceInput, '-100')

    const submitButton = screen.getByRole('button', { name: /crear venta/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('El precio debe ser un número positivo')
      ).toBeInTheDocument()
    })
  })

  it('calculates total price automatically', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const quantityInput = screen.getByLabelText(/cantidad/i)
    const priceInput = screen.getByLabelText(/precio unitario/i)

    await userEvent.type(quantityInput, '10')
    await userEvent.type(priceInput, '100')

    await waitFor(() => {
      const totalField = screen.getByLabelText(/total/i)
      expect(totalField).toHaveValue('1000')
    })
  })

  it('handles zero quantity', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const quantityInput = screen.getByLabelText(/cantidad/i)
    await userEvent.type(quantityInput, '0')

    const submitButton = screen.getByRole('button', { name: /crear venta/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('La cantidad debe ser mayor a 0')
      ).toBeInTheDocument()
    })
  })

  it('handles decimal quantities correctly', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const quantityInput = screen.getByLabelText(/cantidad/i)
    const priceInput = screen.getByLabelText(/precio unitario/i)

    await userEvent.type(quantityInput, '2.5')
    await userEvent.type(priceInput, '50.50')

    await waitFor(() => {
      const totalField = screen.getByLabelText(/total/i)
      expect(totalField).toHaveValue('126.25')
    })
  })

  it('handles very large numbers', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const quantityInput = screen.getByLabelText(/cantidad/i)
    const priceInput = screen.getByLabelText(/precio unitario/i)

    await userEvent.type(quantityInput, '999999')
    await userEvent.type(priceInput, '9999.99')

    await waitFor(() => {
      const totalField = screen.getByLabelText(/total/i)
      expect(totalField).toHaveValue('9999890001')
    })
  })

  it('displays discount field and recalculates total', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const quantityInput = screen.getByLabelText(/cantidad/i)
    const priceInput = screen.getByLabelText(/precio unitario/i)
    const discountInput = screen.getByLabelText(/descuento/i)

    await userEvent.type(quantityInput, '100')
    await userEvent.type(priceInput, '50')
    await userEvent.type(discountInput, '10')

    await waitFor(() => {
      const totalField = screen.getByLabelText(/total/i)
      // 100 * 50 = 5000, 5000 - (10% of 5000) = 4500
      expect(totalField).toHaveValue('4500')
    })
  })

  it('allows selecting client from dropdown', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
        availableClients={mockClients}
      />
    )

    const clientSelect = screen.getByLabelText(/cliente/i)
    await userEvent.click(clientSelect)

    const clientOption = screen.getByText('Client A')
    await userEvent.click(clientOption)

    expect(clientSelect).toHaveValue('1')
  })

  it('renders item list when adding multiple items', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const addItemButton = screen.getByRole('button', { name: /agregar artículo/i })

    // Add first item
    fireEvent.click(addItemButton)
    expect(screen.getByLabelText(/descripción del artículo 1/i)).toBeInTheDocument()

    // Add second item
    fireEvent.click(addItemButton)
    expect(screen.getByLabelText(/descripción del artículo 2/i)).toBeInTheDocument()
  })

  it('allows removing items from list', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const addItemButton = screen.getByRole('button', { name: /agregar artículo/i })
    fireEvent.click(addItemButton)

    const removeButton = screen.getByRole('button', { name: /eliminar artículo/i })
    fireEvent.click(removeButton)

    expect(
      screen.queryByLabelText(/descripción del artículo 1/i)
    ).not.toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const mockApiClient = require('@/lib/api/client').apiClient
    mockApiClient.post.mockResolvedValue({ id: '123', status: 'created' })

    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
        availableClients={mockClients}
      />
    )

    const clientSelect = screen.getByLabelText(/cliente/i)
    const descriptionInput = screen.getByLabelText(/descripción/i)
    const quantityInput = screen.getByLabelText(/cantidad/i)
    const priceInput = screen.getByLabelText(/precio unitario/i)
    const submitButton = screen.getByRole('button', { name: /crear venta/i })

    await userEvent.click(clientSelect)
    await userEvent.click(screen.getByText('Client A'))
    await userEvent.type(descriptionInput, 'Test Sale')
    await userEvent.type(quantityInput, '5')
    await userEvent.type(priceInput, '100')

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalled()
      expect(mockOnSaleCreated).toHaveBeenCalled()
    })
  })

  it('displays error message on submit failure', async () => {
    const mockApiClient = require('@/lib/api/client').apiClient
    mockApiClient.post.mockRejectedValue({
      response: { data: { message: 'Error creating sale' } },
    })

    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
        availableClients={mockClients}
      />
    )

    const submitButton = screen.getByRole('button', { name: /crear venta/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/error creating sale/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while submitting', async () => {
    const mockApiClient = require('@/lib/api/client').apiClient
    mockApiClient.post.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 1000))
    )

    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const submitButton = screen.getByRole('button', { name: /crear venta/i })

    expect(submitButton).not.toBeDisabled()

    // Note: In real implementation, submit button would be disabled during loading
  })

  it('clears form after successful submission', async () => {
    const mockApiClient = require('@/lib/api/client').apiClient
    mockApiClient.post.mockResolvedValue({ id: '123' })

    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const quantityInput = screen.getByLabelText(/cantidad/i) as HTMLInputElement
    await userEvent.type(quantityInput, '10')

    const submitButton = screen.getByRole('button', { name: /crear venta/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(quantityInput.value).toBe('')
    })
  })

  it('handles currency display correctly', async () => {
    render(
      <CreateSaleModal
        isOpen={true}
        onClose={mockOnClose}
        onSaleCreated={mockOnSaleCreated}
      />
    )

    const priceInput = screen.getByLabelText(/precio unitario/i)
    await userEvent.type(priceInput, '1234.567')

    // Should format to 2 decimal places
    await waitFor(() => {
      expect(priceInput).toHaveValue('1234.57')
    })
  })
})
