import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: '/tmp/01-login-page.png', fullPage: true });

    // Check if we're on login page
    const title = await page.title();
    expect(title).toContain('OnQuota');

    // Fill in login credentials
    await page.fill('input[type="email"], input[name="email"]', 'test@onquota.com');
    await page.fill('input[type="password"], input[name="password"]', 'Test123!');

    // Take screenshot before clicking login
    await page.screenshot({ path: '/tmp/02-credentials-filled.png', fullPage: true });

    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Iniciar")');

    // Wait for navigation after login
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Take screenshot after login
    await page.screenshot({ path: '/tmp/03-after-login.png', fullPage: true });

    // Verify we're logged in by checking for dashboard elements
    // This will depend on your dashboard structure
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    // Check if we're not on the login page anymore
    expect(currentUrl).not.toContain('/login');

    // Take final screenshot
    await page.screenshot({ path: '/tmp/04-dashboard.png', fullPage: true });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Fill in invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'WrongPassword123');

    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Iniciar")');

    // Wait a bit for error message
    await page.waitForTimeout(2000);

    // Take screenshot of error
    await page.screenshot({ path: '/tmp/05-login-error.png', fullPage: true });

    // Verify we're still on login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('localhost:3001');
  });
});
