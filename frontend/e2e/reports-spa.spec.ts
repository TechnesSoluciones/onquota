import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

test.describe('Reports and SPA Issues', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'test@onquota.com');
    await page.fill('input[type="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should load reports dashboard without 500 error', async ({ page }) => {
    console.log('Navigating to reports page...');

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for network errors
    const networkErrors: any[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Navigate to reports
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/reports-dashboard.png', fullPage: true });

    // Check for 500 errors on executive dashboard endpoint
    const has500Error = networkErrors.some(err =>
      err.url.includes('/reports/dashboard/executive') && err.status === 500
    );

    if (has500Error) {
      console.log('❌ Found 500 error on reports dashboard:');
      networkErrors
        .filter(err => err.url.includes('/reports/dashboard/executive'))
        .forEach(err => console.log(`  - ${err.url}: ${err.status} ${err.statusText}`));
    }

    // Log all network errors
    if (networkErrors.length > 0) {
      console.log('\n📊 Network Errors:');
      networkErrors.forEach(err => {
        console.log(`  ${err.status} - ${err.url}`);
      });
    }

    // Log console errors
    if (consoleErrors.length > 0) {
      console.log('\n🔴 Console Errors:');
      consoleErrors.forEach(err => console.log(`  ${err}`));
    }

    // Assertions
    expect(has500Error).toBe(false);
  });

  test('should upload SPA file without CORS/500 error', async ({ page }) => {
    console.log('Navigating to SPA upload page...');

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for network errors
    const networkErrors: any[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Navigate to SPA upload
    await page.goto(`${BASE_URL}/spa/upload`);
    await page.waitForTimeout(2000);

    // Create a dummy Excel file for testing
    const buffer = Buffer.from('dummy excel content');

    // Try to upload file if upload input exists
    const fileInput = await page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'test-spa.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: buffer
      });

      // Wait for any network activity
      await page.waitForTimeout(2000);

      // Check for CORS or 500 errors on SPA upload endpoint
      const hasSPAError = networkErrors.some(err =>
        err.url.includes('/spa/upload') && (err.status === 500 || err.status === 0)
      );

      if (hasSPAError) {
        console.log('❌ Found error on SPA upload:');
        networkErrors
          .filter(err => err.url.includes('/spa/upload'))
          .forEach(err => console.log(`  - ${err.url}: ${err.status} ${err.statusText}`));
      }

      // Check for CORS errors in console
      const hasCORSError = consoleErrors.some(err =>
        err.toLowerCase().includes('cors') || err.toLowerCase().includes('access-control')
      );

      if (hasCORSError) {
        console.log('❌ Found CORS error in console');
      }

      expect(hasSPAError).toBe(false);
      expect(hasCORSError).toBe(false);
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/spa-upload.png', fullPage: true });

    // Log all errors
    if (networkErrors.length > 0) {
      console.log('\n📊 Network Errors:');
      networkErrors.forEach(err => {
        console.log(`  ${err.status} - ${err.url}`);
      });
    }

    if (consoleErrors.length > 0) {
      console.log('\n🔴 Console Errors:');
      consoleErrors.forEach(err => console.log(`  ${err}`));
    }
  });
});
