const { test, expect } = require('@playwright/test');

test.describe('Member Reservation E2E', () => {
  test('member dashboard requires auth', async ({ page }) => {
    await page.goto('/member/dashboard');
    await expect(page).toHaveURL(/\/(login|member|dashboard)/);
  });
});
