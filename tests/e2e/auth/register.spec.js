const { test, expect } = require('@playwright/test');

test.describe('Register E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('register page loads', async ({ page }) => {
    await expect(page).toHaveURL(/register/);
  });
});
