// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Login E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login page loads', async ({ page }) => {
    await expect(page).toHaveURL(/login/);
  });

  test('shows login form elements', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
    const passwordInput = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 });
    await expect(passwordInput.first()).toBeVisible({ timeout: 5000 });
  });
});
