/**
 * Login Loop Bug Test
 * Tests that login doesn't create an infinite redirect loop
 */

import { test, expect } from '@playwright/test'

test.describe('Login Loop Bug Fix', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000'

  test('should not create redirect loop on login page', async ({ page }) => {
    console.log('[Test] Navigating to login page...')

    // Navigate to login
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })

    console.log('[Test] Waiting for page to load...')

    // Wait a bit to see if there are redirect loops
    await page.waitForTimeout(2000)

    // Check that we're still on the login page (not redirected)
    const currentURL = page.url()
    console.log('[Test] Current URL:', currentURL)

    expect(currentURL).toContain('/login')

    // Check that login form is visible
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })

    console.log('[Test] Login form is visible - no redirect loop detected')

    // Check that password field is visible
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Check that submit button is visible
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()

    console.log('[Test] All form elements are present')
  })

  test('should show console logs on page load', async ({ page }) => {
    // Capture console logs
    const logs: string[] = []
    page.on('console', msg => {
      logs.push(`[Browser Console] ${msg.type()}: ${msg.text()}`)
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
    })

    // Capture network errors
    page.on('pageerror', error => {
      console.log(`[Browser Error] ${error.message}`)
    })

    console.log('[Test] Navigating to login page with console monitoring...')

    // Navigate to login
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })

    // Wait for potential logs
    await page.waitForTimeout(3000)

    console.log('[Test] Captured logs:', logs)

    // Check that we're on login page
    expect(page.url()).toContain('/login')

    // Check for Middleware logs
    const middlewareLogs = logs.filter(log => log.includes('Middleware'))
    console.log('[Test] Middleware logs:', middlewareLogs)

    // Check for Auth logs
    const authLogs = logs.filter(log => log.includes('useAuth') || log.includes('ProtectedRoute'))
    console.log('[Test] Auth logs:', authLogs)
  })

  test('should attempt registration with test data', async ({ page }) => {
    const testEmail = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    const testCompany = `Test Company ${Date.now()}`
    const testFullName = 'Test User'

    // Capture console logs
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
    })

    // Capture network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`[Network] ${request.method()} ${request.url()}`)
      }
    })

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        console.log(`[Network] Response ${response.status()} ${response.url()}`)
        if (response.status() >= 400) {
          try {
            const body = await response.text()
            console.log(`[Network] Error body:`, body)
          } catch (e) {
            // Ignore
          }
        }
      }
    })

    console.log('[Test] Navigating to login page...')
    await page.goto(`${baseURL}/login`)

    console.log('[Test] Looking for registration link...')
    const registerLink = page.locator('text=Regístrate aquí')
    await expect(registerLink).toBeVisible({ timeout: 5000 })

    console.log('[Test] Clicking registration link...')
    await registerLink.click()

    // Should be on registration page
    await expect(page).toHaveURL(/\/register/, { timeout: 5000 })
    console.log('[Test] On registration page')

    // Fill registration form
    console.log('[Test] Filling registration form...')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="company_name"]', testCompany)
    await page.fill('input[name="full_name"]', testFullName)
    await page.fill('input[name="password"]', testPassword)

    // Find and click submit button
    console.log('[Test] Submitting registration form...')
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Wait for response
    console.log('[Test] Waiting for registration response...')
    await page.waitForTimeout(5000)

    const currentURL = page.url()
    console.log('[Test] After registration, current URL:', currentURL)

    // Check if we were redirected to dashboard or stayed on registration
    if (currentURL.includes('/dashboard')) {
      console.log('[Test] ✅ Successfully registered and redirected to dashboard!')

      // Verify we're actually on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })

      // Check for dashboard elements
      const dashboardElement = page.locator('text=/dashboard|Dashboard/i')
      await expect(dashboardElement).toBeVisible({ timeout: 5000 })

      console.log('[Test] ✅ Dashboard loaded successfully - NO LOOP!')
    } else {
      console.log('[Test] ⚠️  Still on registration page, checking for errors...')

      // Look for error messages
      const errorMessage = page.locator('[class*="error"], [class*="alert"]')
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent()
        console.log('[Test] Error message:', errorText)
      }
    }
  })
})
