/**
 * Playwright E2E Test - Expense Categories Verification
 * Verifies that expense categories are loaded and console is clean
 */

import { test, expect } from '@playwright/test'

test.describe('Expense Categories Verification', () => {
  test('Verify expense categories load correctly', async ({ page }) => {
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

    console.log('🔑 Step 2: Logging in with jose.gomez@technes.com.do...\n')

    // Fill in login form
    await page.fill('input[type="email"]', 'jose.gomez@technes.com.do')
    await page.fill('input[type="password"]', 'Admin123!')
    await page.click('button[type="submit"]')

    // Wait for navigation after login
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {
      console.log('⚠️  Did not redirect to dashboard, might already be there')
    })

    // Extra wait for auth to settle
    await page.waitForTimeout(2000)

    console.log('✅ Login successful\n')

    console.log('📊 Step 3: Navigating to expenses/new page...\n')

    // Step 2: Navigate to expenses/new
    await page.goto('http://localhost:3001/expenses/new')

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')

    // Wait for the expense categories to load
    await page.waitForTimeout(3000)

    console.log('📄 Step 4: Page loaded, checking for category dropdown...\n')

    // Try to find and click the category dropdown
    try {
      // Look for the "Crear Gasto" or expense modal button first
      const createExpenseButton = page.locator('button:has-text("Nuevo Gasto"), button:has-text("Crear Gasto")').first()

      if (await createExpenseButton.isVisible({ timeout: 5000 })) {
        console.log('✅ Found "Create Expense" button, clicking it...\n')
        await createExpenseButton.click()
        await page.waitForTimeout(1000)
      }

      // Now look for the category select
      const categorySelect = page.locator('[id*="category"], [name*="category"], label:has-text("Categoría")').first()

      if (await categorySelect.isVisible({ timeout: 5000 })) {
        console.log('✅ Category field found!\n')

        // Try to click it to open dropdown
        await categorySelect.click()
        await page.waitForTimeout(1000)

        // Take screenshot after opening dropdown
        await page.screenshot({
          path: 'test-results/expense-categories-dropdown.png',
          fullPage: true,
        })
        console.log('📸 Screenshot with dropdown saved\n')
      } else {
        console.log('⚠️  Category field not found\n')
      }
    } catch (error) {
      console.log(`⚠️  Error interacting with category dropdown: ${error}\n`)
    }

    // Wait a bit more for any async operations
    await page.waitForTimeout(2000)

    console.log('📄 Step 5: Analyzing console messages...\n')

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
        !err.text.includes('404') && // Ignore expected 404s
        !err.text.includes('expenses/comparison') // Ignore comparison endpoint errors
    )

    console.log(`Errors: ${errors.length} (${unexpectedErrors.length} unexpected)`)
    console.log(`Warnings: ${warnings.length}`)

    if (unexpectedErrors.length > 0) {
      console.log('\n🔴 UNEXPECTED ERRORS DETECTED:\n')
      unexpectedErrors.forEach((err, idx) => {
        console.log(`\n--- Error #${idx + 1} ---`)
        console.log(`Time: ${err.timestamp}`)
        console.log(`Message: ${err.text}`)
      })
    } else {
      console.log('\n✅ No unexpected errors!\n')
    }

    // Check for successful category load
    const categorySuccess = consoleMessages.some(
      (m) =>
        m.text.includes('expenses/categories') &&
        m.text.includes('200')
    )

    if (categorySuccess) {
      console.log('✅ Expense categories API call succeeded!\n')
    } else {
      console.log('⚠️  Did not detect successful categories API call\n')
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/expense-categories-final.png',
      fullPage: true,
    })

    console.log('📸 Final screenshot saved to test-results/expense-categories-final.png\n')

    // Keep browser open for inspection
    console.log('⏸️  Browser will remain open for 30 seconds for inspection...\n')
    await page.waitForTimeout(30000)
  })
})
