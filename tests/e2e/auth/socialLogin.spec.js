const { test, expect } = require('@playwright/test');

test.describe('Social Login E2E', () => {
  test('social login page loads', async ({ page }) => {
    await page.goto('/social-login');
    await expect(page).toHaveURL(/social-login/);
  });
});
