/**
 * Playwright E2E Test - Console Errors Debug
 * Specifically captures console errors in the quotas dashboard
 */

import { test } from '@playwright/test'

test.describe('Console Errors Debug', () => {
  test('Capture console errors on quotas page', async ({ page }) => {
    const consoleMessages: Array<{
      type: string
      text: string
      timestamp: string
    }> = []

    // Capture ALL console messages
    page.on('console', (msg) => {
      const entry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
      }
      consoleMessages.push(entry)

      // Print to console immediately for visibility
      const icon =
        msg.type() === 'error'
          ? '🔴'
          : msg.type() === 'warning'
          ? '⚠️'
          : msg.type() === 'log'
          ? '📝'
          : 'ℹ️'
      console.log(`${icon} [${msg.type().toUpperCase()}]: ${msg.text()}`)
    })

    // Capture page errors
    page.on('pageerror', (error) => {
      console.log(`🔴 [PAGE ERROR]: ${error.message}`)
      console.log(`Stack: ${error.stack}`)
    })

    console.log('\n🚀 Step 1: Navigating to login page...\n')

    // Step 1: Login first
    await page.goto('http://localhost:3001/login')
    await page.waitForLoadState('networkidle')

    console.log('🔑 Step 2: Logging in with test@onquota.com...\n')

    // Fill in login form
    await page.fill('input[type="email"]', 'test@onquota.com')
    await page.fill('input[type="password"]', 'Test123!')
    await page.click('button[type="submit"]')

    // Wait for navigation after login
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    console.log('✅ Login successful\n')

    console.log('📊 Step 3: Navigating to quotas page...\n')

    // Step 2: Navigate to quotas
    await page.goto('http://localhost:3001/sales/quotas')

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')

    // Wait a bit more for React to render and any errors to appear
    await page.waitForTimeout(5000)

    console.log('📄 Step 4: Page loaded, analyzing console errors...\n')

    console.log('\n' + '='.repeat(60))
    console.log('CONSOLE MESSAGES SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total messages: ${consoleMessages.length}`)

    const errors = consoleMessages.filter((m) => m.type === 'error')
    const warnings = consoleMessages.filter((m) => m.type === 'warning')

    console.log(`Errors: ${errors.length}`)
    console.log(`Warnings: ${warnings.length}`)

    if (errors.length > 0) {
      console.log('\n🔴 ERRORS DETECTED:\n')
      errors.forEach((err, idx) => {
        console.log(`\n--- Error #${idx + 1} ---`)
        console.log(`Time: ${err.timestamp}`)
        console.log(`Message: ${err.text}`)
      })
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS DETECTED:\n')
      warnings.forEach((warn, idx) => {
        console.log(`\n--- Warning #${idx + 1} ---`)
        console.log(`Time: ${warn.timestamp}`)
        console.log(`Message: ${warn.text}`)
      })
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/console-errors-debug.png',
      fullPage: true,
    })

    console.log('\n📸 Screenshot saved to test-results/console-errors-debug.png')
  })
})
