/**
 * Playwright E2E Test - Full Application Analysis
 * Navigates through all main pages and captures console errors
 */

import { test } from '@playwright/test'

test.describe('Full Application Analysis', () => {
  test('Analyze entire application', async ({ page }) => {
    const consoleMessages: Array<{
      type: string
      text: string
      timestamp: string
      page: string
    }> = []

    let currentPage = 'unknown'

    // Capture ALL console messages with page context
    page.on('console', (msg) => {
      const entry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        page: currentPage,
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
      console.log(`${icon} [${currentPage}] [${msg.type().toUpperCase()}]: ${msg.text()}`)
    })

    // Capture page errors
    page.on('pageerror', (error) => {
      console.log(`🔴 [${currentPage}] [PAGE ERROR]: ${error.message}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('🔍 FULL APPLICATION ANALYSIS STARTING')
    console.log('='.repeat(80) + '\n')

    // ========================================================================
    // 1. LOGIN
    // ========================================================================
    console.log('📄 [1/12] Analyzing: LOGIN PAGE\n')
    currentPage = 'login'
    await page.goto('http://localhost:3001/login')
    await page.waitForLoadState('networkidle')

    // Perform login
    await page.fill('input[type="email"]', 'jose.gomez@technes.com.do')
    await page.fill('input[type="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await page.waitForTimeout(2000)

    console.log('✅ Login completed\n')

    // ========================================================================
    // 2. DASHBOARD
    // ========================================================================
    console.log('📄 [2/12] Analyzing: DASHBOARD\n')
    currentPage = 'dashboard'
    await page.goto('http://localhost:3001/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-01-dashboard.png', fullPage: true })
    console.log('✅ Dashboard analyzed\n')

    // ========================================================================
    // 3. CLIENTS
    // ========================================================================
    console.log('📄 [3/12] Analyzing: CLIENTS\n')
    currentPage = 'clients'
    await page.goto('http://localhost:3001/clients')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-02-clients.png', fullPage: true })
    console.log('✅ Clients analyzed\n')

    // ========================================================================
    // 4. SALES - QUOTAS
    // ========================================================================
    console.log('📄 [4/12] Analyzing: SALES - QUOTAS\n')
    currentPage = 'sales-quotas'
    await page.goto('http://localhost:3001/sales/quotas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-03-sales-quotas.png', fullPage: true })
    console.log('✅ Sales Quotas analyzed\n')

    // ========================================================================
    // 5. SALES - QUOTATIONS
    // ========================================================================
    console.log('📄 [5/12] Analyzing: SALES - QUOTATIONS\n')
    currentPage = 'sales-quotations'
    await page.goto('http://localhost:3001/sales/quotations')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-04-sales-quotations.png', fullPage: true })
    console.log('✅ Sales Quotations analyzed\n')

    // ========================================================================
    // 6. SALES - CONTROLS
    // ========================================================================
    console.log('📄 [6/12] Analyzing: SALES - CONTROLS\n')
    currentPage = 'sales-controls'
    await page.goto('http://localhost:3001/sales/controls')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-05-sales-controls.png', fullPage: true })
    console.log('✅ Sales Controls analyzed\n')

    // ========================================================================
    // 7. EXPENSES
    // ========================================================================
    console.log('📄 [7/12] Analyzing: EXPENSES\n')
    currentPage = 'expenses'
    await page.goto('http://localhost:3001/expenses')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-06-expenses.png', fullPage: true })
    console.log('✅ Expenses analyzed\n')

    // ========================================================================
    // 8. EXPENSES - NEW (Categories test!)
    // ========================================================================
    console.log('📄 [8/12] Analyzing: EXPENSES - NEW (Categories!)\n')
    currentPage = 'expenses-new'
    await page.goto('http://localhost:3001/expenses/new')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-07-expenses-new.png', fullPage: true })
    console.log('✅ Expenses New analyzed\n')

    // ========================================================================
    // 9. REPORTS
    // ========================================================================
    console.log('📄 [9/12] Analyzing: REPORTS\n')
    currentPage = 'reports'
    await page.goto('http://localhost:3001/reports')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-08-reports.png', fullPage: true })
    console.log('✅ Reports analyzed\n')

    // ========================================================================
    // 10. ALERTS
    // ========================================================================
    console.log('📄 [10/12] Analyzing: ALERTS\n')
    currentPage = 'alerts'
    await page.goto('http://localhost:3001/alerts')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-09-alerts.png', fullPage: true })
    console.log('✅ Alerts analyzed\n')

    // ========================================================================
    // 11. SETTINGS
    // ========================================================================
    console.log('📄 [11/12] Analyzing: SETTINGS\n')
    currentPage = 'settings'
    await page.goto('http://localhost:3001/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/analysis-10-settings.png', fullPage: true })
    console.log('✅ Settings analyzed\n')

    // ========================================================================
    // 12. ADMIN (if available)
    // ========================================================================
    console.log('📄 [12/12] Analyzing: ADMIN\n')
    currentPage = 'admin'
    try {
      await page.goto('http://localhost:3001/admin', { timeout: 5000 })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'test-results/analysis-11-admin.png', fullPage: true })
      console.log('✅ Admin analyzed\n')
    } catch (e) {
      console.log('⚠️  Admin page not accessible (expected if not super admin)\n')
    }

    // ========================================================================
    // FINAL ANALYSIS
    // ========================================================================
    console.log('\n' + '='.repeat(80))
    console.log('📊 ANALYSIS COMPLETE - GENERATING REPORT')
    console.log('='.repeat(80) + '\n')

    const errors = consoleMessages.filter((m) => m.type === 'error')
    const warnings = consoleMessages.filter((m) => m.type === 'warning')

    // Filter out expected/known errors
    const unexpectedErrors = errors.filter(
      (err) =>
        !err.text.includes('Download the React DevTools') &&
        !err.text.includes('Failed to load resource') &&
        !err.text.includes('expenses/comparison') &&
        !err.text.toLowerCase().includes('favicon')
    )

    console.log(`📈 Total Console Messages: ${consoleMessages.length}`)
    console.log(`🔴 Total Errors: ${errors.length} (${unexpectedErrors.length} unexpected)`)
    console.log(`⚠️  Total Warnings: ${warnings.length}\n`)

    // Group errors by page
    const errorsByPage: Record<string, typeof unexpectedErrors> = {}
    unexpectedErrors.forEach((err) => {
      if (!errorsByPage[err.page]) {
        errorsByPage[err.page] = []
      }
      errorsByPage[err.page].push(err)
    })

    // Report errors by page
    if (Object.keys(errorsByPage).length > 0) {
      console.log('🔴 ERRORS BY PAGE:\n')
      Object.entries(errorsByPage).forEach(([pageName, pageErrors]) => {
        console.log(`  📄 ${pageName.toUpperCase()} - ${pageErrors.length} error(s)`)
        pageErrors.forEach((err, idx) => {
          console.log(`    ${idx + 1}. ${err.text}`)
        })
        console.log('')
      })
    } else {
      console.log('✅ NO UNEXPECTED ERRORS DETECTED!\n')
    }

    // Check for successful category load
    const categorySuccess = consoleMessages.filter(
      (m) =>
        m.text.includes('expenses/categories') &&
        m.text.includes('200') &&
        m.page === 'expenses-new'
    )

    if (categorySuccess.length > 0) {
      console.log('✅ EXPENSE CATEGORIES: Loaded successfully!')
    } else {
      console.log('⚠️  EXPENSE CATEGORIES: Did not detect successful load')
    }

    // Check for 404 errors (endpoints that don't exist)
    const notFoundErrors = errors.filter((err) => err.text.includes('404'))
    if (notFoundErrors.length > 0) {
      console.log('\n🔍 MISSING ENDPOINTS (404s):\n')
      const uniqueEndpoints = [
        ...new Set(notFoundErrors.map((err) => err.text.match(/https?:\/\/[^\s]+/)?.[0] || '')),
      ].filter(Boolean)
      uniqueEndpoints.forEach((endpoint) => {
        const page = notFoundErrors.find((e) => e.text.includes(endpoint))?.page
        console.log(`  • ${endpoint} (from ${page})`)
      })
    }

    console.log('\n' + '='.repeat(80))
    console.log('📸 Screenshots saved in test-results/')
    console.log('='.repeat(80) + '\n')
  })
})
