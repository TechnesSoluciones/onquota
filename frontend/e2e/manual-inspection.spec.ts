/**
 * Playwright E2E Test - Manual Inspection
 * Opens browser and waits for manual testing
 */

import { test } from '@playwright/test'

test.describe('Manual Inspection', () => {
  test('Open browser for manual inspection', async ({ page }) => {
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

    console.log('\n🌐 Opening browser at http://localhost:3001...\n')
    console.log('👤 Please login manually and navigate to any page\n')
    console.log('⏸️  Browser will remain open for 5 minutes for inspection...\n')

    // Navigate to login page
    await page.goto('http://localhost:3001/login')
    await page.waitForLoadState('networkidle')

    // Wait for 5 minutes (300 seconds)
    await page.waitForTimeout(300000)

    console.log('\n' + '='.repeat(60))
    console.log('CONSOLE MESSAGES SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total messages: ${consoleMessages.length}`)

    const errors = consoleMessages.filter((m) => m.type === 'error')
    const warnings = consoleMessages.filter((m) => m.type === 'warning')

    // Filter out expected errors
    const unexpectedErrors = errors.filter(
      (err) =>
        !err.text.includes('Download the React DevTools') &&
        !err.text.includes('404 (Not Found)') &&
        !err.text.includes('expenses/comparison') &&
        !err.text.includes('Failed to load resource')
    )

    console.log(`\nErrors: ${errors.length} (${unexpectedErrors.length} unexpected)`)
    console.log(`Warnings: ${warnings.length}`)

    if (unexpectedErrors.length > 0) {
      console.log('\n🔴 UNEXPECTED ERRORS DETECTED:\n')
      unexpectedErrors.forEach((err, idx) => {
        console.log(`\n--- Error #${idx + 1} ---`)
        console.log(`Time: ${err.timestamp}`)
        console.log(`Message: ${err.text}`)
      })
    } else {
      console.log('\n✅ No unexpected errors detected!\n')
    }

    // Check for successful category load
    const categorySuccess = consoleMessages.filter(
      (m) =>
        m.text.includes('expenses/categories') &&
        m.text.includes('200')
    )

    if (categorySuccess.length > 0) {
      console.log(`✅ Expense categories API called successfully ${categorySuccess.length} time(s)!\n`)
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/manual-inspection-final.png',
      fullPage: true,
    })

    console.log('📸 Final screenshot saved\n')
  })
})
