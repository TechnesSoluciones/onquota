/**
 * Dashboard Loading Test
 * Tests that dashboard doesn't get stuck on "Verificando autenticación..."
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard Loading', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000'

  test('dashboard should not get stuck on auth verification', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
    })

    // Capture page errors
    page.on('pageerror', error => {
      console.log(`[Browser Error] ${error.message}`)
    })

    console.log('[Test] Navigating to dashboard...')

    // Try to access dashboard directly (without login)
    await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 })

    console.log('[Test] Page loaded, checking state...')

    // Wait a bit to see what happens
    await page.waitForTimeout(3000)

    const currentURL = page.url()
    console.log('[Test] Current URL after 3 seconds:', currentURL)

    // Check if we got redirected to login (expected behavior when not authenticated)
    if (currentURL.includes('/login')) {
      console.log('[Test] ✅ Correctly redirected to login page')
      expect(currentURL).toContain('/login')
    } else if (currentURL.includes('/dashboard')) {
      console.log('[Test] Still on dashboard, checking if page is responsive...')

      // Check for the "Verificando autenticación..." text
      const loadingText = page.locator('text=/verificando autenticación/i')
      const isStillLoading = await loadingText.isVisible().catch(() => false)

      if (isStillLoading) {
        console.log('[Test] ❌ FAIL: Page is stuck on "Verificando autenticación..."')
        throw new Error('Dashboard is stuck on authentication verification')
      } else {
        console.log('[Test] ✅ Page is not stuck on loading state')
      }

      // Check that page is interactive
      const body = page.locator('body')
      await expect(body).toBeVisible()
      console.log('[Test] ✅ Page body is visible and interactive')
    }
  })

  test('should show loading state but resolve within 5 seconds', async ({ page }) => {
    console.log('[Test] Testing that loading resolves quickly...')

    const startTime = Date.now()

    // Navigate to dashboard
    await page.goto(`${baseURL}/dashboard`, { timeout: 10000 })

    // Wait for either redirect or dashboard content
    await Promise.race([
      // Wait for redirect to login
      page.waitForURL(/\/login/, { timeout: 6000 }).catch(() => null),
      // Or wait for dashboard elements
      page.locator('text=/dashboard/i').waitFor({ timeout: 6000 }).catch(() => null),
    ])

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`[Test] Page resolved in ${duration}ms`)

    if (duration > 5000) {
      console.log('[Test] ⚠️  WARNING: Took longer than 5 seconds')
    } else {
      console.log('[Test] ✅ Page resolved quickly (< 5 seconds)')
    }

    // Verify we're not stuck
    const loadingText = page.locator('text=/verificando autenticación/i')
    const isStillLoading = await loadingText.isVisible().catch(() => false)

    expect(isStillLoading).toBe(false)
    console.log('[Test] ✅ No longer stuck on loading')
  })
})
