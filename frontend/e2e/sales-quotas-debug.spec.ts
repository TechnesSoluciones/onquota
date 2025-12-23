/**
 * Playwright E2E Test - Sales Quotas Dashboard Debug
 * Investigates 422 errors in the sales quotas module
 */

import { test, expect } from '@playwright/test'

test.describe('Sales Quotas Dashboard - 422 Error Investigation', () => {
  let requestsLog: Array<{
    url: string
    method: string
    status: number
    statusText: string
    postData?: any
    response?: any
  }> = []

  test.beforeEach(async ({ page }) => {
    requestsLog = []

    // Intercept all API requests
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log(`→ REQUEST: ${request.method()} ${request.url()}`)
        if (request.postData()) {
          console.log(`  POST DATA:`, request.postData())
        }
      }
    })

    // Intercept all API responses
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const url = response.url()
        const status = response.status()
        const method = response.request().method()

        let postData = undefined
        let responseData = undefined

        try {
          postData = response.request().postData()
          responseData = await response.json()
        } catch (e) {
          // Ignore JSON parse errors
        }

        const logEntry = {
          url,
          method,
          status,
          statusText: response.statusText(),
          postData,
          response: responseData,
        }

        requestsLog.push(logEntry)

        console.log(`← RESPONSE: ${status} ${method} ${url}`)

        if (status === 422) {
          console.log('🔴 422 ERROR DETECTED!')
          console.log('  URL:', url)
          console.log('  Method:', method)
          console.log('  Request Data:', postData)
          console.log('  Response:', JSON.stringify(responseData, null, 2))
        }

        if (status >= 400) {
          console.log(`  ERROR: ${status} - ${response.statusText()}`)
          if (responseData) {
            console.log(`  Response:`, JSON.stringify(responseData, null, 2))
          }
        }
      }
    })

    // Log console messages from the browser
    page.on('console', (msg) => {
      const type = msg.type()
      if (type === 'error' || type === 'warning') {
        console.log(`[BROWSER ${type.toUpperCase()}]:`, msg.text())
      }
    })
  })

  test('should navigate to sales quotas and capture all requests', async ({ page }) => {
    // Go to login page
    await page.goto('http://localhost:3000/login')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Try to login (adjust credentials as needed)
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Login form detected, attempting login...')
      await emailInput.fill('admin@onquota.com')
      await passwordInput.fill('admin123')

      const loginButton = page.locator('button[type="submit"]')
      await loginButton.click()

      // Wait for navigation after login
      await page.waitForURL(/dashboard|sales/, { timeout: 10000 })
      console.log('✅ Login successful')
    } else {
      console.log('Already logged in or no login required')
    }

    // Navigate to sales quotas
    console.log('\n📊 Navigating to Sales Quotas Dashboard...\n')
    await page.goto('http://localhost:3000/sales/quotas')

    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Wait a bit more to ensure all requests complete
    await page.waitForTimeout(3000)

    console.log('\n📋 REQUEST SUMMARY:\n')
    console.log(`Total API requests: ${requestsLog.length}`)

    const errorRequests = requestsLog.filter(r => r.status >= 400)
    console.log(`Error requests: ${errorRequests.length}`)

    const error422s = requestsLog.filter(r => r.status === 422)
    console.log(`422 Errors: ${error422s.length}\n`)

    if (error422s.length > 0) {
      console.log('🔴 422 ERRORS DETECTED:\n')
      error422s.forEach((req, idx) => {
        console.log(`\n--- 422 Error #${idx + 1} ---`)
        console.log(`URL: ${req.url}`)
        console.log(`Method: ${req.method}`)
        if (req.postData) {
          console.log(`Request Body:`, req.postData)
        }
        console.log(`Response:`, JSON.stringify(req.response, null, 2))
      })
    }

    if (errorRequests.length > 0) {
      console.log('\n🔴 ALL ERROR REQUESTS:\n')
      errorRequests.forEach((req, idx) => {
        console.log(`\n--- Error #${idx + 1} ---`)
        console.log(`${req.status} ${req.method} ${req.url}`)
        if (req.response) {
          console.log(`Response:`, JSON.stringify(req.response, null, 2))
        }
      })
    }

    // Take a screenshot of the current state
    await page.screenshot({
      path: 'test-results/sales-quotas-debug.png',
      fullPage: true
    })
    console.log('\n📸 Screenshot saved to test-results/sales-quotas-debug.png')

    // Check if there are error messages visible on the page
    const errorElements = await page.locator('[role="alert"], .error, .text-red-600').all()
    if (errorElements.length > 0) {
      console.log('\n⚠️  Error messages visible on page:')
      for (const el of errorElements) {
        const text = await el.textContent()
        console.log(`  - ${text}`)
      }
    }
  })

  test('should capture network requests when interacting with quota filters', async ({ page }) => {
    // Go directly to sales quotas (assuming already logged in from session)
    await page.goto('http://localhost:3000/sales/quotas')
    await page.waitForLoadState('networkidle')

    console.log('\n🔍 Testing quota filters and interactions...\n')

    // Try clicking on filters or buttons that might trigger 422
    const filterButtons = await page.locator('button, select, input[type="date"]').all()
    console.log(`Found ${filterButtons.length} interactive elements`)

    // Check for any select/dropdown elements
    const selects = await page.locator('select').all()
    if (selects.length > 0) {
      console.log('\n🎛️  Testing select elements...')
      for (let i = 0; i < Math.min(selects.length, 3); i++) {
        const select = selects[i]
        const isVisible = await select.isVisible()
        if (isVisible) {
          console.log(`  Interacting with select #${i + 1}`)
          await select.click().catch(() => console.log('    Could not click'))
          await page.waitForTimeout(1000)
        }
      }
    }

    await page.waitForTimeout(2000)

    const new422s = requestsLog.filter(r => r.status === 422)
    if (new422s.length > 0) {
      console.log(`\n🔴 New 422 errors found during interaction: ${new422s.length}`)
    }
  })
})
