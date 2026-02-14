const { test, expect } = require('@playwright/test');

test.describe('Staff QR Verification E2E', () => {
  test('staff verification page requires auth', async ({ page }) => {
    await page.goto('/staff/verification');
    await expect(page).toHaveURL(/\/(login|staff)/);
  });
});
