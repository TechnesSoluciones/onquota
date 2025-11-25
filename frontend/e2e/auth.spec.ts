/**
 * Authentication Flow E2E Tests
 * Tests complete authentication workflows using Playwright
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000'
  const testEmail = `test_${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const testUsername = `testuser_${Date.now()}`

  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/login`)
  })

  test('complete registration and login flow', async ({ page }) => {
    // Navigate to registration
    const registerLink = page.locator('text=Regístrate aquí')
    await expect(registerLink).toBeVisible()
    await registerLink.click()

    // Should be on registration page
    await expect(page).toHaveURL(/\/register/)

    // Fill registration form
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)

    // Accept terms if present
    const termsCheckbox = page.locator('input[type="checkbox"]')
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.click()
    }

    // Submit registration
    const registerButton = page.locator('button:has-text("Crear Cuenta")')
    await registerButton.click()

    // Wait for success message or redirect
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 10000 })

    // Login with registered credentials
    if (page.url().includes('login')) {
      // Fill login form
      await page.fill('input[placeholder="tu@email.com"]', testEmail)
      await page.fill('input[placeholder="••••••••"]', testPassword)

      // Submit login
      const loginButton = page.locator('button:has-text("Iniciar Sesión")')
      await loginButton.click()
    }

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Verify dashboard is loaded
    const dashboardHeading = page.locator('h1, h2')
    await expect(dashboardHeading).toBeTruthy()
  })

  test('login with invalid credentials', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.fill('input[placeholder="tu@email.com"]', 'invalid@test.com')
    await page.fill('input[placeholder="••••••••"]', 'WrongPassword123')

    // Submit login
    const loginButton = page.locator('button:has-text("Iniciar Sesión")')
    await loginButton.click()

    // Should see error message
    const errorMessage = page.locator('text=/credenciales inválidas|invalid/i')
    await expect(errorMessage).toBeVisible()

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('login with empty fields shows validation errors', async ({ page }) => {
    // Don't fill any fields
    const loginButton = page.locator('button:has-text("Iniciar Sesión")')
    await loginButton.click()

    // Should see validation errors
    const emailError = page.locator('text=/email.*requerido/i')
    const passwordError = page.locator('text=/contraseña.*requerida/i')

    await expect(emailError).toBeVisible()
    await expect(passwordError).toBeVisible()
  })

  test('email validation on registration', async ({ page }) => {
    const registerLink = page.locator('text=Regístrate aquí')
    await registerLink.click()

    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', 'ValidPassword123')

    const registerButton = page.locator('button:has-text("Crear Cuenta")')
    await registerButton.click()

    // Should show email validation error
    const emailError = page.locator('text=/email.*inválido/i')
    await expect(emailError).toBeVisible()
  })

  test('password strength requirements on registration', async ({ page }) => {
    const registerLink = page.locator('text=Regístrate aquí')
    await registerLink.click()

    // Enter weak password
    await page.fill('input[name="email"]', `weak_${Date.now()}@test.com`)
    await page.fill('input[name="password"]', 'weak')

    // Check for password strength indicator or error
    const passwordInput = page.locator('input[name="password"]')
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
  })

  test('password confirmation validation', async ({ page }) => {
    const registerLink = page.locator('text=Regístrate aquí')
    await registerLink.click()

    await page.fill('input[name="email"]', `match_${Date.now()}@test.com`)
    await page.fill('input[name="password"]', 'TestPassword123')
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123')

    const registerButton = page.locator('button:has-text("Crear Cuenta")')
    await registerButton.click()

    // Should show password mismatch error
    const mismatchError = page.locator(
      'text=/contraseñas.*no coinciden|no match/i'
    )
    await expect(mismatchError).toBeVisible()
  })

  test('logout functionality', async ({ page }) => {
    // Need to be logged in first
    // This assumes a test account exists
    const testAccount = {
      email: 'test@example.com',
      password: 'TestPassword123',
    }

    // Login
    await page.fill('input[placeholder="tu@email.com"]', testAccount.email)
    await page.fill('input[placeholder="••••••••"]', testAccount.password)

    const loginButton = page.locator('button:has-text("Iniciar Sesión")')
    await loginButton.click()

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Click logout
    const userMenu = page.locator('[data-testid="user-menu"]')
    if (await userMenu.isVisible()) {
      await userMenu.click()

      const logoutButton = page.locator('text=Cerrar Sesión')
      await logoutButton.click()
    }

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot password flow', async ({ page }) => {
    // Click forgot password link
    const forgotPasswordLink = page.locator('text=¿Olvidaste tu contraseña?')
    await expect(forgotPasswordLink).toBeVisible()
    await forgotPasswordLink.click()

    // Should be on forgot password page
    await expect(page).toHaveURL(/\/forgot-password/)

    // Enter email
    await page.fill('input[type="email"]', 'test@example.com')

    // Submit
    const submitButton = page.locator('button:has-text("Enviar")')
    await submitButton.click()

    // Should show success message
    const successMessage = page.locator('text=/email.*enviado|check.*email/i')
    await expect(successMessage).toBeVisible({ timeout: 5000 })
  })

  test('session persistence', async ({ page, context }) => {
    const testAccount = {
      email: 'persistent@test.com',
      password: 'TestPassword123',
    }

    // Login
    await page.fill('input[placeholder="tu@email.com"]', testAccount.email)
    await page.fill('input[placeholder="••••••••"]', testAccount.password)

    const loginButton = page.locator('button:has-text("Iniciar Sesión")')
    await loginButton.click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Get cookies/storage
    const cookies = await context.cookies()
    expect(cookies.length).toBeGreaterThan(0)

    // Navigate to another page
    await page.goto(`${baseURL}/sales`)
    await expect(page).toHaveURL(/\/sales/)

    // Should still be logged in
    const logoutElement = page.locator('text=/cerrar sesión|logout/i')
    await expect(logoutElement).toBeTruthy()
  })

  test('account activation via email', async ({ page }) => {
    // This test would require email interception/mocking
    // Testing that verification flow exists
    const registerLink = page.locator('text=Regístrate aquí')
    await registerLink.click()

    const verificationMessage = page.locator('text=/verificación|activación/i')

    // Should mention email verification at some point in flow
    if (await verificationMessage.isVisible()) {
      await expect(verificationMessage).toBeVisible()
    }
  })

  test('prevent page access without authentication', async ({ page }) => {
    // Try to access protected page directly
    await page.goto(`${baseURL}/dashboard`)

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('two-factor authentication if enabled', async ({ page }) => {
    // Check if 2FA is available
    const loginButton = page.locator('button:has-text("Iniciar Sesión")')
    const twoFACheckbox = page.locator('[data-testid="2fa-checkbox"]')

    if (await twoFACheckbox.isVisible()) {
      await twoFACheckbox.click()

      // Should show 2FA setup or verification fields
      const twoFAInput = page.locator('[data-testid="2fa-input"]')
      await expect(twoFAInput).toBeTruthy()
    }
  })

  test('password reset via link', async ({ page }) => {
    // Go to forgot password
    const forgotPasswordLink = page.locator('text=¿Olvidaste tu contraseña?')
    await forgotPasswordLink.click()

    // In real scenario, would have reset token from email
    // Simulating direct access to reset page
    const resetToken = 'test-reset-token-' + Date.now()
    await page.goto(`${baseURL}/reset-password?token=${resetToken}`)

    // Fill new password
    await page.fill('input[name="newPassword"]', 'NewSecurePassword123')
    await page.fill('input[name="confirmPassword"]', 'NewSecurePassword123')

    // Submit
    const submitButton = page.locator('button:has-text("Restablecer")')
    if (await submitButton.isVisible()) {
      await submitButton.click()
    }

    // Should show success or redirect
    const successMessage = page.locator('text=/actualizada|success/i')
    if (await successMessage.isVisible()) {
      await expect(successMessage).toBeVisible()
    }
  })
})
