import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/OnQuota/);
});

test('can navigate to login', async ({ page }) => {
  await page.goto('/');

  // Click the login link.
  await page.getByRole('link', { name: 'login' }).click();

  // Expects page to have a heading with the name of Login.
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
