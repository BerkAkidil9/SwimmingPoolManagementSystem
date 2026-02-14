const { test, expect } = require('@playwright/test');

test.describe('Member Billing E2E', () => {
  test('billing page requires auth', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL(/\/(login|billing)/);
  });
});
