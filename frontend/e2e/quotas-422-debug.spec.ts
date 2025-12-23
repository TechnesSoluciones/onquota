/**
 * Playwright E2E Test - Sales Quotas 422 Error Debug
 * Specifically captures 422 errors in the quotas dashboard
 */

import { test, expect } from '@playwright/test'

test.describe('Sales Quotas - 422 Error Debug', () => {
  let error422Details: Array<{
    url: string
    method: string
    requestBody?: any
    responseBody?: any
    timestamp: string
  }> = []

  test('Capture 422 errors on quotas dashboard', async ({ page, context }) => {
    console.log('\n🔍 Starting 422 Error Investigation for Sales Quotas\n')

    // Enable request interception
    await context.route('**/*', (route) => route.continue())

    // Listen for all responses
    page.on('response', async (response) => {
      const url = response.url()
      const status = response.status()

      if (status === 422) {
        console.log('\n🔴 422 ERROR DETECTED!')
        console.log(`URL: ${url}`)
        console.log(`Method: ${response.request().method()}`)

        let requestBody = null
        let responseBody = null

        try {
          const request = response.request()
          if (request.postData()) {
            requestBody = JSON.parse(request.postData() || '{}')
          }
          responseBody = await response.json()
        } catch (e) {
          console.log('Could not parse request/response body')
        }

        const error = {
          url,
          method: response.request().method(),
          requestBody,
          responseBody,
          timestamp: new Date().toISOString(),
        }

        error422Details.push(error)

        console.log('Request Body:', JSON.stringify(requestBody, null, 2))
        console.log('Response Body:', JSON.stringify(responseBody, null, 2))
        console.log('---\n')
      }

      // Log all API requests
      if (url.includes('/api/v1/')) {
        const statusIcon = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅'
        console.log(`${statusIcon} ${status} ${response.request().method()} ${url}`)
      }
    })

    // Log browser console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[BROWSER ERROR]: ${msg.text()}`)
      }
    })

    // Step 1: Login
    console.log('Step 1: Navigating to login page...')
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    console.log('Step 2: Attempting login with test@onquota.com...')
    await page.fill('input[type="email"]', 'test@onquota.com')
    await page.fill('input[type="password"]', 'Test123!')
    await page.click('button[type="submit"]')

    // Wait for redirect after login
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    const afterLoginUrl = page.url()
    console.log(`After login URL: ${afterLoginUrl}`)

    // Take screenshot after login
    await page.screenshot({
      path: 'test-results/01-after-login.png',
      fullPage: true,
    })

    // Step 3: Navigate directly to quotas
    console.log('\nStep 3: Navigating to /sales/quotas...')
    await page.goto('http://localhost:3000/sales/quotas')
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Wait for any async requests to complete
    await page.waitForTimeout(3000)

    console.log('\nStep 4: Checking page state...')

    // Take screenshot of quotas page
    await page.screenshot({
      path: 'test-results/02-quotas-page.png',
      fullPage: true,
    })

    // Check for visible error messages
    const errorMessages = await page
      .locator('[role="alert"], .text-red-600, .text-destructive')
      .allTextContents()

    if (errorMessages.length > 0) {
      console.log('\n⚠️  Visible error messages on page:')
      errorMessages.forEach((msg) => console.log(`  - ${msg}`))
    }

    // Try to interact with the page
    console.log('\nStep 5: Attempting to interact with filters/dropdowns...')

    const salesRepSelect = page.locator('select').first()
    if (await salesRepSelect.isVisible().catch(() => false)) {
      console.log('  → Found select element, clicking...')
      await salesRepSelect.click()
      await page.waitForTimeout(1000)
    }

    // Check for date inputs
    const dateInputs = await page.locator('input[type="date"]').all()
    console.log(`  → Found ${dateInputs.length} date inputs`)

    // Look for any buttons that might trigger data fetch
    const buttons = await page.locator('button').allTextContents()
    console.log(`  → Found ${buttons.length} buttons:`, buttons.slice(0, 5))

    // Final wait for any last requests
    await page.waitForTimeout(2000)

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('INVESTIGATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total 422 Errors Captured: ${error422Details.length}`)

    if (error422Details.length > 0) {
      console.log('\n🔴 422 ERROR DETAILS:')
      error422Details.forEach((err, idx) => {
        console.log(`\nError #${idx + 1}:`)
        console.log(`  Time: ${err.timestamp}`)
        console.log(`  URL: ${err.url}`)
        console.log(`  Method: ${err.method}`)
        if (err.requestBody) {
          console.log(`  Request:`, JSON.stringify(err.requestBody, null, 2))
        }
        if (err.responseBody) {
          console.log(`  Response:`, JSON.stringify(err.responseBody, null, 2))
        }
      })
    } else {
      console.log('\n✅ No 422 errors detected during this test run')
    }

    console.log('\n📸 Screenshots saved:')
    console.log('  - test-results/01-after-login.png')
    console.log('  - test-results/02-quotas-page.png')

    // Optionally fail the test if 422 errors were found
    if (error422Details.length > 0) {
      console.log('\n⚠️  Test completed - 422 errors were detected (see details above)')
    }
  })
})
