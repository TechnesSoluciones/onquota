/**
 * Tests for Register Page Component
 * Tests registration form validation, submission, and error handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import RegisterPage from '@/app/(auth)/register/page'
import { useAuth } from '@/hooks/useAuth'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('RegisterPage', () => {
  const mockPush = jest.fn()
  const mockRegister = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      isLoading: false,
    })
  })

  // ========================================================================
  // RENDERING TESTS
  // ========================================================================

  describe('Rendering', () => {
    it('renders the registration form', () => {
      render(<RegisterPage />)

      expect(screen.getByText('Crear Cuenta')).toBeInTheDocument()
      expect(
        screen.getByText('Completa el formulario para crear tu cuenta y comenzar')
      ).toBeInTheDocument()
    })

    it('renders all required form fields', () => {
      render(<RegisterPage />)

      expect(screen.getByLabelText(/Nombre de la Empresa/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Contraseña/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Confirmar Contraseña/i)).toBeInTheDocument()
    })

    it('renders optional fields', () => {
      render(<RegisterPage />)

      expect(screen.getByLabelText(/Dominio/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()
    })

    it('renders link to login page', () => {
      render(<RegisterPage />)

      const loginLink = screen.getByText(/Inicia sesión aquí/i)
      expect(loginLink).toBeInTheDocument()
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
    })

    it('renders terms and privacy policy links', () => {
      render(<RegisterPage />)

      const termsLink = screen.getByText(/Términos de Servicio/i)
      const privacyLink = screen.getByText(/Política de Privacidad/i)

      expect(termsLink).toBeInTheDocument()
      expect(privacyLink).toBeInTheDocument()
      expect(termsLink.closest('a')).toHaveAttribute('href', '/terms')
      expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy')
    })
  })

  // ========================================================================
  // VALIDATION TESTS
  // ========================================================================

  describe('Form Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const errors = screen.getAllByText(/requerido|obligatorio/i)
        expect(errors.length).toBeGreaterThan(0)
      })
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/email válido|formato de email/i)
        ).toBeInTheDocument()
      })
    })

    it('validates password minimum length', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^Contraseña/i)
      await user.type(passwordInput, 'short')

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/mínimo 8 caracteres|8 caracteres/i)
        ).toBeInTheDocument()
      })
    })

    it('validates password matches confirmation', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^Contraseña/i)
      const confirmInput = screen.getByLabelText(/Confirmar Contraseña/i)

      await user.type(passwordInput, 'ValidPass123!')
      await user.type(confirmInput, 'DifferentPass123!')

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/contraseñas no coinciden|deben coincidir/i)
        ).toBeInTheDocument()
      })
    })

    it('validates company name is required', async () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Company name should show required error
        const companyInput = screen.getByLabelText(/Nombre de la Empresa/i)
        expect(companyInput.parentElement).toContainHTML('requerido')
      })
    })

    it('validates full name is required', async () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/Nombre Completo/i)
        expect(nameInput.parentElement).toContainHTML('requerido')
      })
    })

    it('allows valid form submission', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValue({ success: true })

      render(<RegisterPage />)

      // Fill in all required fields
      await user.type(
        screen.getByLabelText(/Nombre de la Empresa/i),
        'Test Company'
      )
      await user.type(screen.getByLabelText(/Nombre Completo/i), 'John Doe')
      await user.type(screen.getByLabelText(/Email/i), 'john@test.com')
      await user.type(screen.getByLabelText(/^Contraseña/i), 'ValidPass123!')
      await user.type(
        screen.getByLabelText(/Confirmar Contraseña/i),
        'ValidPass123!'
      )

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })
    })
  })

  // ========================================================================
  // FORM SUBMISSION TESTS
  // ========================================================================

  describe('Form Submission', () => {
    const validFormData = {
      company_name: 'Test Company',
      domain: 'test.com',
      full_name: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      password: 'ValidPass123!',
      confirmPassword: 'ValidPass123!',
    }

    it('calls register function with correct data', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValue({ success: true })

      render(<RegisterPage />)

      // Fill form
      await user.type(
        screen.getByLabelText(/Nombre de la Empresa/i),
        validFormData.company_name
      )
      await user.type(screen.getByLabelText(/Dominio/i), validFormData.domain)
      await user.type(
        screen.getByLabelText(/Nombre Completo/i),
        validFormData.full_name
      )
      await user.type(screen.getByLabelText(/Email/i), validFormData.email)
      await user.type(screen.getByLabelText(/Teléfono/i), validFormData.phone)
      await user.type(
        screen.getByLabelText(/^Contraseña/i),
        validFormData.password
      )
      await user.type(
        screen.getByLabelText(/Confirmar Contraseña/i),
        validFormData.confirmPassword
      )

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            company_name: validFormData.company_name,
            domain: validFormData.domain,
            full_name: validFormData.full_name,
            email: validFormData.email,
            phone: validFormData.phone,
            password: validFormData.password,
          })
        )
        // confirmPassword should NOT be sent to API
        expect(mockRegister).toHaveBeenCalledWith(
          expect.not.objectContaining({
            confirmPassword: expect.anything(),
          })
        )
      })
    })

    it('redirects to dashboard on successful registration', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValue({ success: true })

      render(<RegisterPage />)

      // Fill required fields
      await user.type(
        screen.getByLabelText(/Nombre de la Empresa/i),
        validFormData.company_name
      )
      await user.type(
        screen.getByLabelText(/Nombre Completo/i),
        validFormData.full_name
      )
      await user.type(screen.getByLabelText(/Email/i), validFormData.email)
      await user.type(
        screen.getByLabelText(/^Contraseña/i),
        validFormData.password
      )
      await user.type(
        screen.getByLabelText(/Confirmar Contraseña/i),
        validFormData.confirmPassword
      )

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('displays error message on registration failure', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Email already registered'
      mockRegister.mockResolvedValue({ success: false, error: errorMessage })

      render(<RegisterPage />)

      // Fill required fields
      await user.type(
        screen.getByLabelText(/Nombre de la Empresa/i),
        validFormData.company_name
      )
      await user.type(
        screen.getByLabelText(/Nombre Completo/i),
        validFormData.full_name
      )
      await user.type(screen.getByLabelText(/Email/i), validFormData.email)
      await user.type(
        screen.getByLabelText(/^Contraseña/i),
        validFormData.password
      )
      await user.type(
        screen.getByLabelText(/Confirmar Contraseña/i),
        validFormData.confirmPassword
      )

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('displays generic error message when no specific error provided', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValue({ success: false })

      render(<RegisterPage />)

      // Fill required fields
      await user.type(
        screen.getByLabelText(/Nombre de la Empresa/i),
        validFormData.company_name
      )
      await user.type(
        screen.getByLabelText(/Nombre Completo/i),
        validFormData.full_name
      )
      await user.type(screen.getByLabelText(/Email/i), validFormData.email)
      await user.type(
        screen.getByLabelText(/^Contraseña/i),
        validFormData.password
      )
      await user.type(
        screen.getByLabelText(/Confirmar Contraseña/i),
        validFormData.confirmPassword
      )

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Error al registrarse/i)).toBeInTheDocument()
      })
    })
  })

  // ========================================================================
  // LOADING STATE TESTS
  // ========================================================================

  describe('Loading States', () => {
    it('disables form inputs during registration', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        register: mockRegister,
        isLoading: true,
      })

      render(<RegisterPage />)

      const companyInput = screen.getByLabelText(
        /Nombre de la Empresa/i
      ) as HTMLInputElement
      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        /^Contraseña/i
      ) as HTMLInputElement

      expect(companyInput.disabled).toBe(true)
      expect(emailInput.disabled).toBe(true)
      expect(passwordInput.disabled).toBe(true)
    })

    it('disables submit button during registration', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        register: mockRegister,
        isLoading: true,
      })

      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', {
        name: /Creando cuenta/i,
      })
      expect(submitButton).toBeDisabled()
    })

    it('shows loading indicator during registration', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        register: mockRegister,
        isLoading: true,
      })

      render(<RegisterPage />)

      expect(screen.getByText(/Creando cuenta.../i)).toBeInTheDocument()
    })

    it('shows normal button text when not loading', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/^Crear Cuenta$/i)).toBeInTheDocument()
      expect(screen.queryByText(/Creando cuenta/i)).not.toBeInTheDocument()
    })
  })

  // ========================================================================
  // ACCESSIBILITY TESTS
  // ========================================================================

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<RegisterPage />)

      const companyInput = screen.getByLabelText(/Nombre de la Empresa/i)
      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/^Contraseña/i)

      expect(companyInput).toHaveAttribute('id')
      expect(emailInput).toHaveAttribute('id')
      expect(passwordInput).toHaveAttribute('id')
    })

    it('has proper autocomplete attributes', () => {
      render(<RegisterPage />)

      const companyInput = screen.getByLabelText(/Nombre de la Empresa/i)
      const emailInput = screen.getByLabelText(/Email/i)
      const nameInput = screen.getByLabelText(/Nombre Completo/i)
      const phoneInput = screen.getByLabelText(/Teléfono/i)

      expect(companyInput).toHaveAttribute('autocomplete', 'organization')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(nameInput).toHaveAttribute('autocomplete', 'name')
      expect(phoneInput).toHaveAttribute('autocomplete', 'tel')
    })

    it('has proper input types', () => {
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/^Contraseña/i)
      const phoneInput = screen.getByLabelText(/Teléfono/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(phoneInput).toHaveAttribute('type', 'tel')
    })

    it('marks required fields with asterisk', () => {
      render(<RegisterPage />)

      // Check that required fields have asterisk in label
      const companyLabel = screen.getByLabelText(/Nombre de la Empresa/i)
        .previousSibling
      const emailLabel = screen.getByLabelText(/Email/i).previousSibling

      expect(companyLabel).toContainHTML('<span class="text-red-500">*</span>')
      expect(emailLabel).toContainHTML('<span class="text-red-500">*</span>')
    })
  })

  // ========================================================================
  // ERROR HANDLING TESTS
  // ========================================================================

  describe('Error Handling', () => {
    it('clears previous error messages on new submission', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValueOnce({
        success: false,
        error: 'First error',
      })

      render(<RegisterPage />)

      // Fill and submit form (will fail)
      await user.type(
        screen.getByLabelText(/Nombre de la Empresa/i),
        'Company'
      )
      await user.type(screen.getByLabelText(/Nombre Completo/i), 'John Doe')
      await user.type(screen.getByLabelText(/Email/i), 'john@test.com')
      await user.type(screen.getByLabelText(/^Contraseña/i), 'ValidPass123!')
      await user.type(
        screen.getByLabelText(/Confirmar Contraseña/i),
        'ValidPass123!'
      )

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Submit again with success
      mockRegister.mockResolvedValueOnce({ success: true })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('displays validation errors with red styling', async () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const companyInput = screen.getByLabelText(/Nombre de la Empresa/i)
        expect(companyInput).toHaveClass('border-red-500')
      })
    })
  })
})
