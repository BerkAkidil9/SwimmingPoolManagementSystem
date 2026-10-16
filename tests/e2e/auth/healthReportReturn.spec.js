const { test, expect } = require('@playwright/test');

const target = '/upload-health-report/42';
const member = {
  id: 42, name: 'Synthetic', surname: 'Member', role: 'user', email: 'member@example.com',
  health_status: 'needs_report', health_status_reason: 'Please provide the requested report.',
};

// These browser checks stub authentication and member data; they do not call Google.
async function mockAuthentication(page, baseURL) {
  let signedIn = false;
  const origin = new URL(baseURL).origin;
  const headers = {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
  await page.route('**/auth/check-auth', route => route.fulfill({
    headers, json: signedIn ? { isAuthenticated: true, user: member } : { isAuthenticated: false },
  }));
  await page.route('**/api/member/user/me', route => route.fulfill({ headers, json: member }));
  await page.route('**/auth/login', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    signedIn = true;
    return route.fulfill({ headers, json: { isAuthenticated: true, user: member } });
  });
  await page.route(/\/auth\/google\?/, route => {
    const requestUrl = new URL(route.request().url());
    expect(requestUrl.searchParams.get('returnTo')).toBe(target);
    signedIn = true;
    return route.fulfill({ status: 302, headers: { location: origin + target }, body: '' });
  });
}

test('returns to the email report link after password login', async ({ page, baseURL }) => {
  await mockAuthentication(page, baseURL);
  await page.goto(target);
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.getByPlaceholder('Email').fill(member.email);
  await page.getByPlaceholder('Password').fill('SyntheticPassword123!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  await expect(page).toHaveURL(new URL(target, baseURL).href);
  await expect(page.getByRole('button', { name: 'Submit Health Report' })).toBeVisible();
  await expect(page.getByText(member.health_status_reason)).toBeVisible();
});

test('keeps the email report destination when continuing with Google', async ({ page, baseURL }) => {
  await mockAuthentication(page, baseURL);
  await page.goto(target);
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(page).toHaveURL(new URL(target, baseURL).href);
  await expect(page.getByRole('button', { name: 'Submit Health Report' })).toBeVisible();
  await expect(page.getByText(member.email)).toBeVisible();
});
