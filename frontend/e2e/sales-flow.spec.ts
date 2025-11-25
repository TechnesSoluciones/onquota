/**
 * Sales Management E2E Tests
 * Tests complete sales workflows from quote creation to acceptance
 */

import { test, expect } from '@playwright/test'

test.describe('Sales Flow', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000'
  const testAccount = {
    email: 'sales@test.com',
    password: 'TestPassword123',
  }

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${baseURL}/login`)
    await page.fill('input[placeholder="tu@email.com"]', testAccount.email)
    await page.fill('input[placeholder="••••••••"]', testAccount.password)

    const loginButton = page.locator('button:has-text("Iniciar Sesión")')
    await loginButton.click()

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Navigate to sales page
    await page.goto(`${baseURL}/sales`)
  })

  test('create new sale quote', async ({ page }) => {
    // Click create sale button
    const createButton = page.locator('button:has-text("Nueva Venta")')
    await createButton.click()

    // Modal should appear
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Select client
    const clientSelect = page.locator('select[name="client_id"]')
    await clientSelect.selectOption({ index: 1 })

    // Enter description
    const descriptionInput = page.locator('input[name="description"]')
    await descriptionInput.fill('Test Services')

    // Enter quantity
    const quantityInput = page.locator('input[name="quantity"]')
    await quantityInput.fill('5')

    // Enter unit price
    const priceInput = page.locator('input[name="unit_price"]')
    await priceInput.fill('100')

    // Verify total is calculated
    const totalDisplay = page.locator('[data-testid="total-amount"]')
    await expect(totalDisplay).toContainText('500')

    // Submit
    const submitButton = page.locator('button:has-text("Crear Venta")')
    await submitButton.click()

    // Should show success message
    const successMessage = page.locator('text=/venta creada|quote created/i')
    await expect(successMessage).toBeVisible({ timeout: 5000 })
  })

  test('add multiple items to sale', async ({ page }) => {
    const createButton = page.locator('button:has-text("Nueva Venta")')
    await createButton.click()

    // Select client
    const clientSelect = page.locator('select[name="client_id"]')
    await clientSelect.selectOption({ index: 1 })

    // Add first item
    const addItemButton = page.locator('button:has-text("Agregar Artículo")')
    await addItemButton.click()

    // Fill first item
    const item1Description = page.locator(
      'input[name="items.0.description"]'
    )
    await item1Description.fill('Item 1')
    await page.locator('input[name="items.0.quantity"]').fill('2')
    await page.locator('input[name="items.0.unit_price"]').fill('50')

    // Add second item
    await addItemButton.click()

    const item2Description = page.locator(
      'input[name="items.1.description"]'
    )
    await item2Description.fill('Item 2')
    await page.locator('input[name="items.1.quantity"]').fill('3')
    await page.locator('input[name="items.1.unit_price"]').fill('75')

    // Verify total: (2*50) + (3*75) = 100 + 225 = 325
    const totalDisplay = page.locator('[data-testid="total-amount"]')
    await expect(totalDisplay).toContainText('325')

    // Submit
    const submitButton = page.locator('button:has-text("Crear Venta")')
    await submitButton.click()

    // Verify success
    const successMessage = page.locator('text=/venta creada|quote created/i')
    await expect(successMessage).toBeVisible({ timeout: 5000 })
  })

  test('apply discount to sale', async ({ page }) => {
    const createButton = page.locator('button:has-text("Nueva Venta")')
    await createButton.click()

    const clientSelect = page.locator('select[name="client_id"]')
    await clientSelect.selectOption({ index: 1 })

    const quantityInput = page.locator('input[name="quantity"]')
    await quantityInput.fill('10')

    const priceInput = page.locator('input[name="unit_price"]')
    await priceInput.fill('100')

    // Should show 1000 total
    let totalDisplay = page.locator('[data-testid="total-amount"]')
    await expect(totalDisplay).toContainText('1000')

    // Apply 10% discount
    const discountInput = page.locator('input[name="discount"]')
    await discountInput.fill('100')

    // Total should be 900
    totalDisplay = page.locator('[data-testid="total-amount"]')
    await expect(totalDisplay).toContainText('900')

    const submitButton = page.locator('button:has-text("Crear Venta")')
    await submitButton.click()

    const successMessage = page.locator('text=/venta creada|quote created/i')
    await expect(successMessage).toBeVisible({ timeout: 5000 })
  })

  test('view and edit existing sale', async ({ page }) => {
    // Click on first sale in list
    const saleRow = page.locator('tbody tr').first()
    await saleRow.click()

    // Should open sale detail view
    const saleDetail = page.locator('[data-testid="sale-detail"]')
    await expect(saleDetail).toBeVisible()

    // Click edit button
    const editButton = page.locator('button:has-text("Editar")')
    await editButton.click()

    // Should allow editing
    const descriptionInput = page.locator('input[name="description"]')
    await expect(descriptionInput).toBeEditable()

    // Make change
    await descriptionInput.clear()
    await descriptionInput.fill('Updated Description')

    // Save
    const saveButton = page.locator('button:has-text("Guardar")')
    await saveButton.click()

    // Should show success
    const successMessage = page.locator('text=/actualizada|updated/i')
    await expect(successMessage).toBeVisible({ timeout: 5000 })
  })

  test('send sale quote to client', async ({ page }) => {
    // Click on first sale
    const saleRow = page.locator('tbody tr').first()
    await saleRow.click()

    const saleDetail = page.locator('[data-testid="sale-detail"]')
    await expect(saleDetail).toBeVisible()

    // Click send button
    const sendButton = page.locator('button:has-text("Enviar")')
    await sendButton.click()

    // Should show send options
    const emailInput = page.locator('input[name="email"]')
    if (await emailInput.isVisible()) {
      // Modal with email options appeared
      const sendEmailButton = page.locator('button:has-text("Enviar por Email")')
      await sendEmailButton.click()

      // Should show success
      const successMessage = page.locator('text=/enviado|sent/i')
      await expect(successMessage).toBeVisible({ timeout: 5000 })
    }
  })

  test('change sale status to accepted', async ({ page }) => {
    const saleRow = page.locator('tbody tr').first()
    await saleRow.click()

    const saleDetail = page.locator('[data-testid="sale-detail"]')
    await expect(saleDetail).toBeVisible()

    // Find status dropdown
    const statusSelect = page.locator('select[name="status"]')
    await statusSelect.selectOption('accepted')

    // Save status change
    const saveButton = page.locator('button:has-text("Guardar")')
    await saveButton.click()

    // Verify status changed
    const updatedStatus = page.locator('[data-testid="status-badge"]')
    await expect(updatedStatus).toContainText('Aceptado|Accepted')
  })

  test('filter sales by status', async ({ page }) => {
    // Click filter button
    const filterButton = page.locator('button[data-testid="filter-button"]')
    await filterButton.click()

    // Filter by status
    const statusFilter = page.locator('select[name="status_filter"]')
    await statusFilter.selectOption('pending')

    // Apply filter
    const applyButton = page.locator('button:has-text("Aplicar")')
    await applyButton.click()

    // Wait for results to update
    await page.waitForLoadState('networkidle')

    // All visible sales should be pending
    const statusBadges = page.locator('[data-testid="status-badge"]')
    const count = await statusBadges.count()
    for (let i = 0; i < count; i++) {
      const badge = statusBadges.nth(i)
      await expect(badge).toContainText('Pendiente|Pending')
    }
  })

  test('search sales by quote number', async ({ page }) => {
    // Use search box
    const searchInput = page.locator('input[placeholder*="buscar"]')
    await searchInput.fill('QUOTE-001')

    // Submit search
    const searchButton = page.locator('button[type="submit"]').first()
    await searchButton.click()

    // Wait for results
    await page.waitForLoadState('networkidle')

    // Should show matching results
    const saleRows = page.locator('tbody tr')
    const count = await saleRows.count()
    expect(count).toBeGreaterThan(0)

    // All results should contain search term
    const firstRow = saleRows.first()
    await expect(firstRow).toContainText('QUOTE-001')
  })

  test('delete a sale', async ({ page }) => {
    // Click on a sale
    const saleRow = page.locator('tbody tr').first()
    await saleRow.click()

    const saleDetail = page.locator('[data-testid="sale-detail"]')
    await expect(saleDetail).toBeVisible()

    // Click delete button
    const deleteButton = page.locator('button:has-text("Eliminar")')
    await deleteButton.click()

    // Should show confirmation dialog
    const confirmButton = page.locator('button:has-text("Confirmar")')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Should show success and return to list
    const successMessage = page.locator('text=/eliminada|deleted/i')
    await expect(successMessage).toBeVisible({ timeout: 5000 })

    // Should be back on sales page
    await expect(page).toHaveURL(/\/sales/)
  })

  test('export sales to CSV', async ({ page }) => {
    // Click export button
    const exportButton = page.locator('button:has-text("Exportar")')
    await exportButton.click()

    // Select CSV format
    const csvOption = page.locator('button:has-text("CSV")')
    await csvOption.click()

    // File download should start
    const downloadPromise = page.waitForEvent('download')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('sales')
    expect(download.suggestedFilename()).toContain('csv')
  })

  test('generate quote PDF', async ({ page }) => {
    const saleRow = page.locator('tbody tr').first()
    await saleRow.click()

    const saleDetail = page.locator('[data-testid="sale-detail"]')
    await expect(saleDetail).toBeVisible()

    // Click PDF button
    const pdfButton = page.locator('button:has-text("PDF")')
    if (await pdfButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await pdfButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('quote')
      expect(download.suggestedFilename()).toContain('pdf')
    }
  })

  test('bulk status update', async ({ page }) => {
    // Select multiple sales
    const checkboxes = page.locator('input[type="checkbox"][name^="select-"]')
    const count = await checkboxes.count()

    if (count >= 2) {
      // Select first two
      await checkboxes.nth(0).click()
      await checkboxes.nth(1).click()

      // Click bulk action button
      const bulkButton = page.locator('button:has-text("Acciones Masivas")')
      await bulkButton.click()

      // Select status change
      const statusOption = page.locator('text=/cambiar estado/i')
      await statusOption.click()

      // Select new status
      const statusSelect = page.locator('select')
      await statusSelect.selectOption('accepted')

      // Apply
      const applyButton = page.locator('button:has-text("Aplicar")')
      await applyButton.click()

      // Should show success
      const successMessage = page.locator('text=/actualizado/i')
      await expect(successMessage).toBeVisible({ timeout: 5000 })
    }
  })
})
