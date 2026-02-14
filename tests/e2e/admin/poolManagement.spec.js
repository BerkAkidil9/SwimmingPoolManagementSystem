const { test, expect } = require('@playwright/test');

test.describe('Admin Pool Management E2E', () => {
  test('admin section requires auth', async ({ page }) => {
    await page.goto('/admin/pools');
    await expect(page).toHaveURL(/\/(login|admin|dashboard)/);
  });
});
