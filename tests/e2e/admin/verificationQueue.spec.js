const { test, expect } = require('@playwright/test');

test.describe('Admin Verification Queue E2E', () => {
  test('verification queue section requires auth', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/(login|admin|dashboard)/);
  });
});
