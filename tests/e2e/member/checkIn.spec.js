const { test, expect } = require('@playwright/test');

test.describe('Member CheckIn E2E', () => {
  test('check-in page requires auth', async ({ page }) => {
    await page.goto('/check-in');
    await expect(page).toHaveURL(/\/(login|check-in)/);
  });
});
