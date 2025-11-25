/**
 * Login Page Tests
 * Test suite for the login page functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/(auth)/login/page'
import { useAuth } from '@/hooks/useAuth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()
  const mockLogin = jest.fn()

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Setup default mock implementations
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })

    ;(useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
    })
  })

  it('renders login form correctly', () => {
    render(<LoginPage />)

    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('tu@email.com')
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /iniciar sesión/i })
    ).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('El email es requerido')).toBeInTheDocument()
      expect(
        screen.getByText('La contraseña es requerida')
      ).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    await userEvent.type(emailInput, 'invalid-email')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'short')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('La contraseña debe tener al menos 8 caracteres')
      ).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    mockLogin.mockResolvedValue({ success: true })

    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'Password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      })
    })
  })

  it('redirects to dashboard on successful login', async () => {
    mockLogin.mockResolvedValue({ success: true })

    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'Password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('displays error message on login failure', async () => {
    const errorMessage = 'Credenciales inválidas'
    mockLogin.mockResolvedValue({ success: false, error: errorMessage })

    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('tu@email.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'WrongPassword123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows loading state during login', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: true,
    })

    render(<LoginPage />)

    expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /iniciando sesión/i })
    ).toBeDisabled()
  })

  it('contains link to registration page', () => {
    render(<LoginPage />)

    const registerLink = screen.getByText('Regístrate aquí')
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })

  it('contains forgot password link', () => {
    render(<LoginPage />)

    const forgotPasswordLink = screen.getByText('¿Olvidaste tu contraseña?')
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink.closest('a')).toHaveAttribute(
      'href',
      '/forgot-password'
    )
  })
})
