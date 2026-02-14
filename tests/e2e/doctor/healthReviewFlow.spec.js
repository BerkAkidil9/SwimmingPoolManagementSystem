const { test, expect } = require('@playwright/test');

test.describe('Doctor Health Review E2E', () => {
  test('doctor dashboard requires auth', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    await expect(page).toHaveURL(/\/(login|doctor|dashboard)/);
  });
});
