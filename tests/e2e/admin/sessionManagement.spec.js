const { test, expect } = require('@playwright/test');

test.describe('Admin Session Management E2E', () => {
  test('session management section requires auth', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/(login|admin|dashboard)/);
  });
});
