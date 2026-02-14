const { test, expect } = require('@playwright/test');

test.describe('Forgot Password E2E', () => {
  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.getByText(/Reset Your Password/i)).toBeVisible({ timeout: 5000 });
  });
});
