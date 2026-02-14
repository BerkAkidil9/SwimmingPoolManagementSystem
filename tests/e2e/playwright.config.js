/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...require('@playwright/test').devices['Desktop Chrome'] } },
  ],
};
