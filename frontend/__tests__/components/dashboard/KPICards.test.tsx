/**
 * KPI Cards Component Tests
 * Tests for dashboard KPI display and calculations
 */

import { render, screen, waitFor } from '@testing-library/react'
import KPICards from '@/components/dashboard/KPICards'

// Mock dependencies
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

describe('KPICards Component', () => {
  const mockKPIData = {
    total_revenue: '125000.50',
    total_expenses: '45000.75',
    net_profit: '80000.25',
    active_shipments: 15,
    total_vehicles: 8,
    average_vehicle_utilization: '78.5',
    quote_conversion_rate: '62.3',
    average_quote_value: '5250.00',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders KPI cards container', () => {
    render(<KPICards data={mockKPIData} isLoading={false} />)

    expect(screen.getByTestId('kpi-cards-container')).toBeInTheDocument()
  })

  it('displays all KPI values correctly', () => {
    render(<KPICards data={mockKPIData} isLoading={false} />)

    expect(screen.getByText('$125,000.50')).toBeInTheDocument()
    expect(screen.getByText('$45,000.75')).toBeInTheDocument()
    expect(screen.getByText('$80,000.25')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    render(<KPICards data={mockKPIData} isLoading={false} />)

    const revenueFigure = screen.getByText('$125,000.50')
    expect(revenueFigure).toBeInTheDocument()
  })

  it('formats percentage values correctly', () => {
    render(<KPICards data={mockKPIData} isLoading={false} />)

    expect(screen.getByText('78.5%')).toBeInTheDocument()
    expect(screen.getByText('62.3%')).toBeInTheDocument()
  })

  it('shows loading skeleton when isLoading is true', () => {
    render(<KPICards data={mockKPIData} isLoading={true} />)

    const skeletons = screen.getAllByTestId('kpi-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('displays KPI labels correctly', () => {
    render(<KPICards data={mockKPIData} isLoading={false} />)

    expect(screen.getByText('Ingresos Totales')).toBeInTheDocument()
    expect(screen.getByText('Gastos Totales')).toBeInTheDocument()
    expect(screen.getByText('Ganancia Neta')).toBeInTheDocument()
    expect(screen.getByText('Envios Activos')).toBeInTheDocument()
  })

  it('handles zero values gracefully', () => {
    const zeroData = {
      ...mockKPIData,
      total_revenue: '0.00',
      active_shipments: 0,
    }

    render(<KPICards data={zeroData} isLoading={false} />)

    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('handles negative values for expenses and losses', () => {
    const negativeData = {
      ...mockKPIData,
      net_profit: '-5000.00',
    }

    render(<KPICards data={negativeData} isLoading={false} />)

    const negativeValue = screen.getByText('-$5,000.00')
    expect(negativeValue).toBeInTheDocument()
    expect(negativeValue).toHaveClass('text-red-600')
  })

  it('applies color coding for positive/negative values', () => {
    render(<KPICards data={mockKPIData} isLoading={false} />)

    const profitCard = screen.getByText('$80,000.25').closest('[data-testid="profit-card"]')
    expect(profitCard).toHaveClass('bg-green-50')
  })

  it('handles large numbers correctly', () => {
    const largeData = {
      ...mockKPIData,
      total_revenue: '9999999.99',
    }

    render(<KPICards data={largeData} isLoading={false} />)

    expect(screen.getByText('$9,999,999.99')).toBeInTheDocument()
  })

  it('renders trend indicators when provided', () => {
    const dataWithTrends = {
      ...mockKPIData,
      revenue_trend: 12.5,
      expense_trend: -8.3,
    }

    render(<KPICards data={dataWithTrends} isLoading={false} />)

    expect(screen.getByText('+12.5%')).toBeInTheDocument()
    expect(screen.getByText('-8.3%')).toBeInTheDocument()
  })

  it('applies correct styling for positive trends', () => {
    const dataWithTrends = {
      ...mockKPIData,
      revenue_trend: 12.5,
    }

    render(<KPICards data={dataWithTrends} isLoading={false} />)

    const trendIcon = screen.getByTestId('trend-up-icon')
    expect(trendIcon).toHaveClass('text-green-600')
  })

  it('applies correct styling for negative trends', () => {
    const dataWithTrends = {
      ...mockKPIData,
      revenue_trend: -8.3,
    }

    render(<KPICards data={dataWithTrends} isLoading={false} />)

    const trendIcon = screen.getByTestId('trend-down-icon')
    expect(trendIcon).toHaveClass('text-red-600')
  })

  it('renders comparison period label', () => {
    render(
      <KPICards
        data={mockKPIData}
        isLoading={false}
        period="last_30_days"
      />
    )

    expect(screen.getByText('Últimos 30 días')).toBeInTheDocument()
  })

  it('handles missing data gracefully', () => {
    const incompleteData = {
      total_revenue: '125000.50',
      // Missing other fields
    } as any

    render(<KPICards data={incompleteData} isLoading={false} />)

    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('is responsive on mobile devices', () => {
    // Mock mobile viewport
    global.innerWidth = 375

    render(<KPICards data={mockKPIData} isLoading={false} />)

    const container = screen.getByTestId('kpi-cards-container')
    expect(container).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  it('displays decimal places correctly', () => {
    render(<KPICards data={mockKPIData} isLoading={false} />)

    const values = screen.getAllByText(/\.\d{2}/)
    expect(values.length).toBeGreaterThan(0)
  })

  it('handles very small percentage values', () => {
    const smallPercentData = {
      ...mockKPIData,
      average_vehicle_utilization: '0.5',
    }

    render(<KPICards data={smallPercentData} isLoading={false} />)

    expect(screen.getByText('0.5%')).toBeInTheDocument()
  })

  it('handles percentage values over 100', () => {
    const overData = {
      ...mockKPIData,
      average_vehicle_utilization: '125.5',
    }

    render(<KPICards data={overData} isLoading={false} />)

    expect(screen.getByText('125.5%')).toBeInTheDocument()
  })
})
